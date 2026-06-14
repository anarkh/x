# 地图列表 Blocked Summary Guard 产品 Brief

- 日期：2026-06-14
- 分支：`codex/iter-map-list-summary-guard`
- 角色：W 组产品 agent
- 对应 feature：`map-feed-001`

## 用户问题

V 组已经新增 `scripts/prepare-map-list-blocked-summary.mjs`，能把 U 组 ignored blocked local JSON 和 L 组 ignored sanitized summary 串起来，生成更适合评审阅读的 blocked 摘要。

评测指出 V 组提升了可读性，但仍存在一个后续风险：ignored local summary 是 Markdown，可能被人工编辑成 `passed`、删除 `blocked` 语义，或让 `evidenceCount` 看起来像真实 UI 证据。这样会把“环境阻塞被合规记录”误导成“地图列表视觉 smoke 已通过”，也会让 blocked JSON 与 summary 的状态不一致。

## 产品假设

如果为 blocked summary 增加自动守门，检查它与 blocked JSON 的关键状态不变量一致，评审就能信任摘要仍只是 blocked 结论的脱敏转述，而不是被手工改写过的通过证据。

W 组的价值不在于扩大手测覆盖，而在于守住证据链路语义：`map-list-visual-smoke=blocked`、`passed=0`、`evidenceCount=0` 必须从 ignored local JSON 一直保留到 ignored local summary。

## 范围

- 定义 blocked JSON 与 sanitized summary 之间的状态一致性 guard 口径。
- 要求 guard 能发现 summary 表格中 `map-list-visual-smoke` 被人工改成 `passed` 或 evidenceCount 被改大。
- 要求 guard 能发现 summary 丢失 `map-list-visual-smoke`、`blocked`、阻塞原因、风险或 follow-up。
- 要求 guard 能确认 blocked summary 仍表达 `passed=0` 和 `evidenceCount=0`，没有制造真实 UI evidence。
- 要求 guard 只针对 ignored local 文件：`harness/manual-test-results.local*.json` 与 `harness/manual-test-summary.local*.md`。

## 非目标

- W 组不执行 WeChat DevTools、DevTools CLI open/preview、真机调试或任何真实 UI smoke。
- W 组不修改业务 UI、WXML、WXSS、JS、地图列表交互、数据模型或云端能力。
- W 组不声明地图列表视觉 smoke、DevTools smoke、真机 smoke 或完整用户旅程通过。
- W 组不把 readiness、static guard、helper 成功、JSON 校验或 summary guard 通过写成视觉 `passed`。
- W 组不提交 ignored local JSON 或 ignored local summary；guard 只服务本地证据一致性复核。

## 与 S/T/U/V/L 的关系

| 组别 | 已提供能力 | W 组补齐的守门口径 |
| --- | --- | --- |
| S | 新增 `map-list-visual-smoke` 真实视觉 smoke 证据槽位 | W 组确保 summary 仍承认该视觉 smoke 未执行，不能把槽位摘要成 passed |
| T | 要求手测 JSON 中恰好保留一条 `map-list-visual-smoke` journey | W 组要求 summary 也必须保留这条 journey 的 blocked 结论，不能在摘要层丢失 |
| U | 生成 ignored blocked local JSON，并保持 `map-list-visual-smoke=blocked`、`passed=0`、`evidence=[]` | W 组把这些 JSON 不变量延伸到 summary 守门，防止摘要人工漂移 |
| V | 串联 blocked JSON helper 与 sanitized summary 生成，提升 blocked 结果可读性 | W 组在 V 组可读性之上增加自动 guard，检查 summary 未被改写成通过证据 |
| L | 从 ignored local JSON 生成 ignored local Markdown 摘要，并避免泄露 raw evidence | W 组沿用 L 的脱敏边界，但额外要求状态语义与 blocked JSON 一致 |

## Summary Guard 通过边界

summary guard 可以通过的条件：

- 输入 JSON 与 summary 都是 ignored local 路径，分别匹配 `harness/manual-test-results.local*.json` 和 `harness/manual-test-summary.local*.md`。
- JSON 中 `map-list-visual-smoke.status` 为 `blocked`，且 summary 中同一 journey 的状态仍为 `blocked`。
- JSON 的 passed journey 数量为 `0`，summary 不能出现任何 map list 视觉 smoke `passed` 结论。
- JSON 中 `map-list-visual-smoke.evidence` 为空数组时，summary 中该 journey 的 `evidenceCount` 必须为 `0`。
- summary 保留目标 journey 的 blocked 状态和 `evidenceCount=0`，能让评审知道它没有被摘要成真实 UI 通过证据。

## Summary Guard 失败边界

summary guard 应失败的条件：

- summary 把 `map-list-visual-smoke` 表格状态写成 `passed`。
- summary 丢失 `map-list-visual-smoke` 行，或不再能对应 JSON 中的 blocked journey。
- summary 中 `evidenceCount` 大于 `0`，但 JSON 中 blocked journey 没有真实 evidence。
- summary 的目标 journey 行不再是 blocked，或 evidenceCount 被改成非零。
- JSON 与 summary 的分支、commit 或 journey 状态明显不一致，导致摘要不再是该 blocked JSON 的可信转述。

核心边界：summary guard 通过只表示“ignored local summary 与 blocked JSON 状态一致”；它不代表地图列表视觉 smoke passed，也不代表业务 UI failed。

## 成功标准

- 自动守门能阻止 blocked summary 被手动改成视觉通过语义。
- 自动守门能守住 `map-list-visual-smoke=blocked`、`passed=0`、`evidenceCount=0`。
- 评审看到 guard 通过时，只能得出“blocked 摘要仍可信且未制造 evidence”的结论。
- 真实发布判断仍要求 WeChat DevTools UI 或真机执行 S 组定义的地图列表视觉 smoke，并补齐真实观察证据。
- guard 失败信息应指向具体不变量，例如状态不一致、passed 语义出现、evidenceCount 非零或 blocked 信息缺失。

## 下一步

- 开发实现一个 summary guard 脚本，读取 ignored blocked JSON 和 ignored summary，检查上述状态不变量。
- QA 为 guard 准备坏样例：summary 改成 passed、删除 `map-list-visual-smoke`、把 `evidenceCount` 改成非零、或把 JSON 目标 journey 改成 passed。
- 将 guard 接入 V 组 blocked summary 生成后的本地复核路径，但不要把它接成视觉 smoke 通过条件。
- DevTools 或真机入口恢复后，仍按 S 组地图列表视觉 smoke 执行真实观察；只有真实 evidence 补齐后，才允许把 journey 改为 `passed` 或 `failed`。
