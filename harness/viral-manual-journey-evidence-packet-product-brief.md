# AD 组 Viral Journey Evidence Packet 产品 Brief

日期：2026-06-17

角色：AD 组产品 agent

## 目标

新增一个“viral journey evidence packet”手测执行包，用于在 AC 输出 `ready_for_manual_journey` 之后，把七条传播 journey 的真实手测字段、payload 检查、隐私边界和回填命令整理成一个可执行 checklist。

这个包的目标是降低用户或评测者执行真实 evidence 时的漏项风险。它只做手测组织、字段约束、证据边界和回填提示，不提升现有自动分数，不伪造通过，不替代 WeChat DevTools 或真机观察。

## 非目标

- 不 claim DevTools passed、real-device passed、viral journey passed 或 CloudBase evidence passed。
- 不自动执行 WeChat DevTools，不打开、不退出、不 preview、不 upload、不 kill、不清缓存、不修改 settings、不切项目、不改端口、不写本地存储。
- 不把端口 ready、smoke ready、prepare 命令通过、模板完整或 checklist 生成写成 journey passed。
- 不新增或修改小程序业务代码、分享策略、归因逻辑、评论/确认流程、风控策略或 UI 文案。
- 不输出本机路径、token、cookie、账号、登录态、raw stdout、raw stderr、完整日志、完整配置或系统隐私信息。
- 不写 ignored local evidence 文件，除非未来有明确 separate write helper，并且该 helper 具备独立的 ignored 校验、脱敏校验和 no-passed-draft guard。

## 用户与评测价值

用户价值：真实手测通常跨越 DevTools、系统分享面板、朋友圈、分享 payload、接收者动作、CloudBase 或本地数据状态。evidence packet 把这些步骤变成稳定 checklist，让执行者知道每条 journey 需要看什么、不能写什么、缺了什么就保持 blocked。

评测价值：把“环境入口 ready”和“传播链通过”拆开。评测者可以用 packet 检查证据字段是否齐备、隐私边界是否守住、七条 journey 是否逐条覆盖，而不会把 AC 的 `ready_for_manual_journey` 误判为真实产品通过。

## 输入与输出状态

输入状态只接受 AC 或后续只读复核的脱敏结果：

- `blocked_config_disabled`：用户尚未在 UI 中确认或开启 Service Port。
- `blocked_no_listener`：用户可能已确认 UI，但目标端口仍无 listener 或连接失败。
- `ready_for_manual_journey`：Service Port、只读 smoke access 和手测准备入口已经满足继续人工手测的最低条件。
- `unknown`：缺少足够脱敏状态，不能生成可执行手测 packet。

输出状态必须保持保守：

- `status: not_ready_for_manual_journey` + `packetStatus: not_ready`：AC 尚未输出 `ready_for_manual_journey`，只展示阻塞原因和下一步，不展开可回填 passed 字段。
- `status: ready_to_execute_manual_journey` + `packetStatus: ready_to_execute`：AC 已输出 `ready_for_manual_journey`，可以展示七条 journey checklist、payload 检查项、证据字段和回填命令。
- `blocked`：仍缺 DevTools、真机、系统分享、朋友圈、payload、CloudBase 或数据 fixture 之一，不能继续或不能写 passed。
- `manual_results_pending`：packet 已准备好，但尚未执行真实手测。

任何输出状态都不能表示 `journey_passed`。`journey_passed` 只能来自后续真实手测 evidence 文件或人工复核结论。

## Ready 前行为

在 AC 状态达到 `ready_for_manual_journey` 前，evidence packet 必须保持 blocked / not-ready：

1. 读取或接收 AC 的脱敏状态摘要。
2. 如果状态不是 `ready_for_manual_journey`，只输出阻塞说明、下一步和不可 claim 清单。
3. 不展示可填写为 `passed` 的 journey 结果字段。
4. 不创建 ignored local evidence。
5. 不运行 DevTools 控制动作或系统分享动作。
6. 不输出 raw stdout/stderr，不转述本机完整路径或日志。

ready 前不得展示七条 journey 的逐项执行 packet，也不得列出可回填为 passed 的字段；只能说明 required journey 会在 AC ready 后展开，并明确当前不具备真实 evidence 采集条件。

## Ready 后行为

在 AC 输出 `ready_for_manual_journey` 后，packet 才能进入执行 checklist 模式：

1. 展示七条 required journey 的固定 ID、入口、操作步骤、预期观察、payload 检查、隐私检查、证据字段和 blocked/failed/passed 判定条件。
2. 标出每条 journey 是否需要 DevTools、真机、系统分享面板、朋友圈、CloudBase、登录态、特定数据 fixture 或二跳接收者环境。
3. 提供回填命令建议，但命令只能指向未来的校验或回填流程，不自动写 evidence。
4. 对无法 inspect payload、无法打开系统菜单、无法触达朋友圈或 CloudBase 未部署的情况，要求写 `blocked` 和具体 `blocker/followUp`。
5. 对真实观察到的产品不符合预期，要求写 `failed`、实际现象、脱敏 evidence 和下一步修复建议。
6. 只有真实 UI 或真机观察完整、payload 或限制说明完整、证据脱敏完整时，后续 evidence 才能把对应 journey 写为 `passed`。

## 七条 Journey 覆盖

packet 必须固定覆盖以下七条 journey，不能删除、合并或重命名。

### `first-hop-share-entry`

- 目标：首跳接收者从分享进入低风险 active 任务。
- 入口：分享详情页，带 `from=share`。
- 关键检查：receiver guide 可见；receiver action strip 可见；普通分享面板不与接收者行动入口竞争；主行动是 confirm/comment，而不是直接鼓励扩散。
- 必填证据字段：post id 脱敏标识、入口来源、设备或模拟器类型、实际可见 UI、是否有截图/录屏或文字观察、隐私处理说明。

### `receiver-confirm-conversion`

- 目标：接收者确认后出现二跳接力提示。
- 入口：首跳分享详情页，点击确认有效。
- 关键检查：确认成功；receiver conversion prompt 可见；其他 relay prompt 不抢主 CTA；分享 payload 包含接收者确认来源。
- 必填证据字段：动作前后 UI、确认结果、payload 检查结果、无法 inspect payload 时的具体限制、CloudBase 或本地状态说明。

### `receiver-comment-conversion`

- 目标：接收者评论后出现二跳接力提示。
- 入口：首跳分享详情页，提交有效评论。
- 关键检查：评论成功；receiver conversion prompt 可见；评论 relay 不抢主 CTA；分享 payload 包含接收者评论来源。
- 必填证据字段：评论提交路径、评论成功 UI、评论存储路径说明、payload 检查结果、无法 inspect payload 时的具体限制。

### `second-hop-receiver-source`

- 目标：二跳接收者看到接力语境。
- 入口：优先来自真实系统分享卡片；无法操作时可用直接 route 辅助，但必须标注差异。
- 关键检查：二跳文案表达“有人接力”；摘要和 rows 引导下一位先看确认与评论；普通分享面板不在同一状态竞争展示。
- 必填证据字段：二跳入口来源、route/query 或 payload 摘要、实际文案、面板状态、是否真实系统分享进入。

### `ordinary-and-risk-entries`

- 目标：普通入口和风险态不鼓励接收侧扩散。
- 入口：普通详情入口、弱 stale/report signal、`stale`、`resolved`、`expired`、`hidden` 等 fixture。
- 关键检查：普通入口不展示 receiver guide/action strip；风险或闭合状态不暴露接收侧 public relay CTA；文案提醒谨慎看评论、确认或最新状态。
- 必填证据字段：fixture 状态、stale/report 计数或闭合原因、实际 UI、是否存在扩散 CTA、风险文案观察。

### `timeline-share-channel`

- 目标：低风险 active 详情页具备朋友圈系统渠道。
- 入口：低风险 active 详情页。
- 关键检查：真实系统菜单可见“发送给朋友”和“分享到朋友圈”；可 inspect 的 timeline query/title/image 保留任务 id、分享来源和 timeline 渠道；朋友圈或等价单页模式首屏可读。
- 必填证据字段：系统菜单观察、timeline payload 摘要、单页模式首屏观察、无法 inspect payload 时的具体系统限制。

### `timeline-risk-gating`

- 目标：风险和闭合任务不开放鼓励性朋友圈。
- 入口：弱 stale/report signal、`stale`、`resolved`、`expired`、`hidden`、unknown fixture。
- 关键检查：系统菜单或可 inspect 分享信息不出现鼓励性朋友圈扩散；标题和页面文案保持谨慎；无法打开菜单时只能 blocked。
- 必填证据字段：fixture 状态、菜单观察、payload 或限制说明、谨慎文案观察、blocked/followUp。

## 允许与禁止证据

允许证据：

- 脱敏 UI 截图、录屏或文字观察摘要。
- 脱敏 route/query/payload 摘要，只保留评测所需键值，不保留 token、账号、完整路径或 raw logs。
- 用户手动说明的系统菜单状态、真机型号类别、DevTools/真机环境类别。
- CloudBase 或本地存储路径的结论性说明，例如“评论写入云端成功”或“当前 CloudBase 未部署，评论 evidence blocked”。
- 每条 journey 的 `actual`、`evidence`、`payloadCheck`、`privacyCheck`、`blocker`、`followUp` 等结构化字段。

禁止证据：

- 本机绝对路径、完整文件名清单、raw stdout、raw stderr、完整日志、完整配置、raw storage dump。
- token、cookie、session、账号、手机号、open id、union id、AppID 私密值、CloudBase 密钥或任何可识别个人/环境的信息。
- DevTools 自动 quit/open/preview/upload/kill/cache/settings 的输出。
- 只有 prepare/checklist 结果、环境 ready、端口 ready、smoke ready、用户口头确认但无真实 UI 观察的 `passed`。
- 未脱敏截图、包含个人信息的分享面板、包含完整 payload 或完整日志的附件。

## 与用户侧自发裂变目标的关系

用户侧自发裂变目标是：发布者或接收者认为任务值得转发，首跳接收者完成确认/评论后自然触发二跳接力，低风险任务可以进入朋友或朋友圈渠道，风险和闭合任务被谨慎限制。

evidence packet 不创造裂变，也不优化转化。它只帮助评测者回答三个问题：

- 用户是否真实看到了可自发接力的上下文和主行动。
- 接收者完成确认/评论后，二跳 payload 和 UI 是否仍指向接力来源。
- 风险态、闭合态和隐私边界是否阻止了不该发生的扩散。

因此 packet 不能被用来宣称“裂变目标已经达成”。它只能降低真实 evidence 收集时的漏项，并为后续产品判断提供干净材料。

## 评测口径

评测必须分层：

- `environment_ready`：AC 输出 `ready_for_manual_journey`，只代表可以开始真实手测。
- `ready_to_execute_manual_journey`：七条 journey checklist、字段和回填命令已准备，只代表执行材料完整。
- `journey_blocked`：真实手测受 DevTools、真机、系统菜单、朋友圈、payload、CloudBase、登录态或 fixture 阻塞。
- `journey_failed`：真实手测已执行，并观察到产品行为不符合预期。
- `journey_passed`：真实手测已执行，actual 非空，证据脱敏且非空，payload 检查或限制说明完整，隐私检查通过。

不得接受以下评测表述：

- “AC ready，所以七条 journey 通过。”
- “packet 生成，所以 DevTools/真机通过。”
- “没有 listener blocker 了，所以朋友圈通过。”
- “payload 无法 inspect，但仍然 passed。”
- “blocked draft 或 checklist 可作为 passed evidence。”

## 下一步分叉

- AC 尚未 ready：保持 `status: not_ready_for_manual_journey` / `packetStatus: not_ready`，提示用户先完成 UI Service Port 人工确认和只读复核。
- AC ready 但没有真实 DevTools/真机：输出 `status: ready_to_execute_manual_journey` / `packetStatus: ready_to_execute` 与 `manual_results_pending`，引导用户安排真实手测。
- 系统分享或朋友圈不可用：对应 journey 写 `blocked`，补充系统限制和下一步设备/环境要求。
- payload 无法 inspect：对应 journey 不能直接 passed；若 UI 行为可观察，也只能写 payload blocked 或 passed-with-payload-limitation 待评审确认，默认建议 blocked。
- CloudBase 未部署或数据不可共享：涉及评论、确认、归因或跨用户观察的 journey 写 `blocked`，说明需部署或换 fixture。
- 真实 UI 不符合预期：写 `failed`，记录 actual、脱敏 evidence 和修复建议。
- 七条 journey 均有完整真实证据：进入人工复核，复核通过后再由独立 evidence checker 聚合 overall status。

## 建议脚本与 Guard 需求

建议新增或扩展一个只读准备脚本，例如 `prepare:viral-journey-evidence-packet`。该脚本的职责是读取 AC 的脱敏状态、输出 checklist 和回填指引；默认不写 evidence 文件。

脚本/guard 需求：

- AC 状态 guard：只有输入状态为 `ready_for_manual_journey` 时才展示完整可执行 checklist；其他状态只能输出 `not_ready_for_manual_journey` / `not_ready` / blocked。
- No passed claim guard：禁止输出 DevTools passed、real-device passed、viral journey passed、CloudBase passed 等结论性通过文案。
- No side-effect guard：禁止 quit/open/preview/upload/kill/cache/settings/storage/project-switch 等副作用命令出现在默认脚本路径。
- Sensitive-output guard：禁止输出本机路径、token、cookie、账号、登录态、raw stdout、raw stderr、完整日志、完整配置和 raw payload。
- Evidence-write guard：默认不创建 ignored local evidence；若未来新增 separate write helper，必须强制 ignored 路径校验、字段 schema 校验、脱敏校验、blocked draft 不可 passed、existing file 不覆盖。
- Seven-journey guard：固定校验七条 journey ID 唯一存在，且每条包含 actual、evidence、payloadCheck、privacyCheck、status、blocker/followUp 适用字段。
- Payload guard：confirm/comment/timeline journey 必须有 payload 摘要或无法 inspect 的具体原因；缺失时不能 passed。
- Privacy guard：每条 evidence 必须有隐私处理说明；发现敏感字段时拒绝输出或要求重填。
- Rubric guard：overall status 只能由真实 journey 状态聚合，不能由 checklist readiness、AC ready 或脚本 exit code 推导。

## 回填命令建议

ready 后 packet 可以展示命令建议，但命令语义必须保守：

```text
npm run prepare:devtools-ui-confirmation
npm run prepare:viral-journey-evidence-packet
node --no-warnings scripts/check-viral-journey-manual-evidence.mjs <ignored-local-result.json>
```

这些命令只代表复核、准备或校验入口。它们不得自动执行真实 DevTools 手测，不得写 passed evidence，不得把 ignored local draft 写入版本库，也不得输出 raw stdout/stderr 或本机隐私信息。

## 验收标准

- brief 明确写出目标、非目标、用户/评测价值、输入/输出状态、ready 前/ready 后行为、七条 journey 覆盖、允许/禁止证据、与用户侧自发裂变目标的关系、评测口径、下一步分叉和建议脚本/guard。
- brief 明确声明不 claim DevTools/real-device/viral journey passed。
- brief 明确声明不自动 quit/open/preview/upload/kill/cache/settings。
- brief 明确声明不输出本机路径、token、raw stdout/stderr。
- brief 明确声明不写 ignored local evidence，除非未来有明确 separate write helper。
- brief 只定义手测执行包产品边界，不把当前 blocked 状态升级为通过。
