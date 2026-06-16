# 传播链真实手测 DevTools 启动诊断包 Product Brief

日期：2026-06-16

分支：`codex/iter-viral-devtools-journey-launch`

工作目录：`/tmp/street-tasks-iter-worktrees/viral-devtools-journey-launch`

## 目标

为传播链真实手测提供一个可运行的启动诊断包，把执行顺序、证据准备、证据校验和 blocker 语义收拢到同一个入口。P 轮目标不是证明任何 UI journey 已经 passed，而是让执行者在进入真实 WeChat DevTools 或真机手测前，先得到一份稳定的 readiness 报告：

1. 先运行只读 DevTools service port 诊断，确认当前能否进入真实手测。
2. 再准备或校验 ignored local viral journey evidence draft，保证手测结果只落在本地忽略文件中。
3. 最后输出五条必跑传播 journey、当前状态和下一步，不让 blocked、failed、passed 被混写。

推荐运行包应呈现为一个单一命令入口，例如 `npm run check:viral-devtools-journey` 或等价脚本包装。该入口可以调用既有脚本，但必须保持可审计、无默认破坏性副作用，并在输出中明确区分“环境 readiness”和“真实 UI passed evidence”。

## 非目标

- 不新增或修改传播链 UI、分享策略、评论、确认、风控或页面逻辑。
- 不把 WeChat DevTools、真机、GUI 依赖加入默认 CI。
- 不自动 quit/open WeChat DevTools，不杀进程，不清缓存，不修改 service port、AppID、项目配置或本地 storage。
- 不提交真实截图、录屏、payload、日志或 ignored local 手测结果文件。
- 不把 `scripts/inspect-devtools-port-state.mjs`、`scripts/check-devtools-smoke-access.mjs`、`scripts/recover-devtools-service-port.mjs --dry-run`、evidence draft 准备或 evidence checker 通过写成 DevTools/真机 UI passed。

## 目标用户

- 准备执行传播链真实手测的开发、QA、产品 agent。
- 需要判断当前 blocker 是 DevTools 环境问题、证据文件问题，还是已进入产品 journey 后发现真实缺陷的评测者。
- 后续接手 agent：他们应能只看运行包输出和 ignored local evidence 文件，就知道下一步是恢复 DevTools、补手测证据、修产品缺陷，还是进入验收复核。

## 必须守住的证据口径

- `readiness` 只表示运行包完成了诊断、草稿准备或 schema 校验；它不表示 UI passed。
- `diagnostic` 只表示端口、CLI、进程、监听、连接等环境事实；它不表示 DevTools 已能渲染项目，也不表示任何小程序页面通过。
- `dry-run` 只表示会做什么、跳过了什么、下一步是什么；它不表示恢复动作已执行，更不表示恢复成功。
- `harness/viral-journey-manual-results.example.json` 永远只是模板，不能作为真实手测结果。
- 真实结果只能写入 ignored local 文件，例如 `harness/manual-test-results.local-viral-journey.json`；未 ignored 的本地结果必须被拦截。
- `passed` 必须来自真实 DevTools 或真机观察，并带有具体 `actual`、非空 evidence，以及相关 journey 所需的 share payload 或无法检查 payload 的明确说明。
- 没有本地结果文件时，运行包可以 exit 0，但只能输出“没有检查任何真实 UI 结果”；不能生成 `passed` 结论。
- blocked draft 是合理的准备产物，但它只能表达“尚未完成真实手测”或“被具体环境阻塞”，不能表达 UI 通过。

## 运行顺序

运行包应按固定顺序输出分段结果：

1. `DevTools service port forensics`：调用 `scripts/inspect-devtools-port-state.mjs`，默认只读。输出 `status: ready | blocked | unknown`、关键 diagnosis、端口监听/连接/进程声明摘要和安全边界。
2. `Smoke access probe`：调用 `scripts/check-devtools-smoke-access.mjs` 的无副作用模式，确认 service port 是否可作为手测入口。若 blocked，应把原因写成 DevTools 环境 blocker。
3. `Recovery dry-run hint`：可调用或提示 `scripts/recover-devtools-service-port.mjs --dry-run`。输出必须强调 quit/open/cache/config 均未改变；若需要真实恢复，必须由人工另行确认。
4. `Viral journey evidence draft`：调用 `scripts/prepare-viral-journey-manual-evidence.mjs --dry-run` 或在用户显式请求时创建 ignored blocked draft。默认不覆盖已有本地文件。
5. `Viral journey evidence check`：调用 `scripts/check-viral-journey-manual-evidence.mjs`，无文件时通过但声明未检查 UI；有 ignored local 文件时校验 schema、分支、commit、环境、五条 journey、状态聚合和 evidence 字段。
6. `Required journeys and next step`：总是列出五条必跑 journey，并根据前面结果给出下一步：恢复 DevTools、创建/补全 evidence draft、执行真实手测、修复真实产品失败，或复核 passed evidence。

## 五条 journey 在 run package 中的呈现

运行包不需要展开模板里的每个步骤全文，但必须以固定顺序展示五条 journey 的 ID、中文名称、入口、关键观察点、证据要求和当前本地结果状态。

### `first-hop-share-entry`

- 名称：首跳从分享进入低风险 active 任务。
- 入口：`/pages/detail/detail?id=<activeLowRiskPostId>&from=share`。
- 关键观察：分享接收者 guide 可见，receiver action strip 可见，普通分享面板不在同一状态竞争展示，strip 上是 confirm/comment 行动而不是直接扩散按钮。
- 证据要求：真实页面截图/录屏或等价 UI 观察记录，包含 post id、设备/模拟器信息和实际可见区域。

### `receiver-confirm-conversion`

- 名称：接收者确认后的二跳提示。
- 入口：首跳分享详情页，点击 receiver confirm action。
- 关键观察：确认成功后显示 receiver conversion prompt，`actionRelayPrompt` 不抢占主 CTA；二跳分享路径包含 `from=share&source=receiver`。
- 证据要求：确认动作前后的 UI 证据，以及 share payload；若系统环境无法暴露 payload，必须写明无法检查的具体原因。

### `receiver-comment-conversion`

- 名称：接收者评论后的二跳提示。
- 入口：首跳分享详情页，提交有效评论。
- 关键观察：评论成功后显示 receiver conversion prompt，`commentRelayPrompt` 不抢占主 CTA；二跳分享路径包含 `from=share&source=receiver`。
- 证据要求：评论提交路径、评论成功后的 UI 证据、storage/cloud 路径说明和 share payload 或无法检查 payload 的明确说明。

### `second-hop-receiver-source`

- 名称：二跳接收者看到接力语境。
- 入口：`/pages/detail/detail?id=<activeLowRiskPostId>&from=share&source=receiver`，优先来自真实系统分享卡片，无法操作时可用直接 route 辅助，但必须标注差异。
- 关键观察：接收者 guide 文案表达“有人接力了任务”，摘要和 rows 引导下一位接收者先看确认与评论，普通分享面板不在同一状态展示。
- 证据要求：二跳入口来源、route/payload、实际文案和面板状态证据。

### `ordinary-and-risk-entries`

- 名称：普通入口和风险态不鼓励接收侧扩散。
- 入口：同一 active 低风险任务的普通详情入口，以及 stale/report signal、stale/resolved/expired/hidden 等风险或闭合状态 fixture。
- 关键观察：普通入口不展示 receiver guide/action strip；有 stale/report 信号时隐藏 receiver action strip；闭合状态不暴露接收侧 public relay CTA；风险态文案提醒先看评论、确认或最新状态。
- 证据要求：每个 fixture 的 post id、状态、`staleCount`/`reportCount` 或闭合原因，以及对应 UI 观察证据。

## 状态语义

### `success`

运行包本身的 success 表示启动诊断和 evidence gate 已按顺序完成。它可以出现在以下情况：

- DevTools 端口 ready，且 evidence checker 找到并校验通过 ignored local 结果文件。
- DevTools 端口 blocked，但运行包成功产出 blocker 解释、blocked draft 下一步和五条必跑 journey。
- 没有本地 evidence 文件，但 checker 明确输出“nothing checked”，并声明这不是 UI passed。

因此，run package success 不是产品 journey passed。只有 ignored local evidence 中五条 required journey 全部 `passed`、证据完整、`summary.overallStatus` 聚合为 `passed`，才可以进入“候选 UI passed evidence 待人工复核”。

### `blocked`

`blocked` 表示当前无法继续真实手测或无法得出 UI 结论，但尚未证明产品行为失败。典型 blocker：

- DevTools service port 被声明但无 listener，或 `127.0.0.1` / `::1` 连接失败。
- DevTools CLI 可执行但服务端口不可用。
- 需要人工启用 Service Port、换端口、换机器、重新打开项目或确认当前 UI 状态。
- ignored local evidence 文件不存在、只有 blocked draft，或被具体设备/登录态/数据 fixture/CloudBase 状态阻塞。
- 需要系统分享面板或真机能力才能检查 payload，但当前环境不可用。

blocked 必须带 `blocker` 和 `followUp`。不要把 DevTools 环境 blocker 写成产品 failed。

### `failed`

`failed` 只用于已经进入真实 DevTools 或真机 journey，并观察到与 expected 相反的产品行为。典型失败：

- 首跳分享入口未显示应有 receiver guide/action strip。
- confirm/comment 成功后没有 receiver conversion prompt，或错误 CTA 抢占主入口。
- 二跳 payload 缺少 `from=share&source=receiver`，且环境允许检查 payload。
- 风险态或闭合态仍暴露接收侧扩散 CTA。

failed 必须带具体 `actual`、可复查 evidence 和下一步 `followUp`。没有真实 UI 观察时不能写 failed。

## 验收标准

- brief 文件存在于 `harness/viral-devtools-journey-run-product-brief.md`，且不要求修改业务代码。
- 后续实现的运行包有单一入口，并按“只读端口诊断 -> smoke access probe -> recovery dry-run hint -> evidence draft 准备/预览 -> evidence checker -> 五条 journey 和下一步”的顺序输出。
- 输出中清楚区分 run package success、DevTools blocked、evidence blocked、journey failed 和 journey passed。
- 默认模式不执行 quit/open/kill/cache/config/storage 等副作用动作；任何带副作用恢复都必须由用户显式另行触发。
- 无 ignored local evidence 文件时，命令 exit 0 但明确说明没有检查真实 UI 结果，且不生成 passed 结论。
- 有 ignored local evidence 文件时，必须校验 schema、当前 branch/commit、环境字段、五条 required journey 唯一性、状态字段、evidence 要求、share payload 要求和 `summary.overallStatus` 聚合。
- 五条 journey 必须以固定 ID 呈现：`first-hop-share-entry`、`receiver-confirm-conversion`、`receiver-comment-conversion`、`second-hop-receiver-source`、`ordinary-and-risk-entries`。
- 所有 readiness、diagnostic、dry-run、draft-created、checker-passed 文案都必须显式声明：它们不等于 WeChat DevTools 或真机 UI passed。
- 如果端口诊断 blocked，运行包仍应输出可执行下一步：手动启用 DevTools Service Port、换端口或换机器后重跑只读诊断，再进入真实手测。
