# 地图列表视觉 Smoke 必备 Journey 门禁产品 Brief

- 日期：2026-06-14
- 分支：`codex/iter-map-list-evidence-gate`
- 角色：T 组产品 agent
- 对应 feature：`map-feed-001`

## 用户问题

S 组已经在 `harness/manual-test-results.example.json` 里新增 `map-list-visual-smoke` journey，用来承接地图列表真实视觉 smoke 的证据。T 组要处理的风险是：如果未来有人删除、改名或重复复制这个 journey，通用字段校验可能看起来仍然完整，导致地图列表视觉 smoke 从手测入口里静默消失或变得含混。

这会让执行者误以为手测模板完整，评审也难以及时发现地图列表长标题、长正文、图片、安全区、原生地图层、滚动和详情链路没有固定记录入口。

## 产品假设

把 `map-list-visual-smoke` 从“文档约定”升级为“必备 journey 门禁”，可以降低后续候选遗漏地图列表视觉证据槽位的风险。门禁通过只证明模板仍包含这条必测 journey，不证明 DevTools 或真机视觉已经通过。

## 范围

- 定义 `map-list-visual-smoke` 是手测结果模板里的必备 journey。
- 要求门禁至少校验 `journeys[].id` 中存在且只存在一条 `map-list-visual-smoke`。
- 要求该 journey 保留地图列表视觉 smoke 的核心记录口径：长标题、长正文、带图/无图、安全区、原生地图层、抽屉滚动、marker/list/detail 链路。
- 要求门禁失败时给出明确提示，说明缺少地图列表视觉 smoke 记录入口。
- 要求输出文案继续区分“模板完整性通过”和“真实视觉验收通过”。

## 非目标

- 不声明 WeChat DevTools 或真机已经通过。
- 不把 `not_covered`、`blocked`、自动脚本通过或 example JSON 通过写成视觉 `passed`。
- 不替代 S 组 checklist 中要求的真实观察、截图、录屏、日志或任务 id。
- 不新增或修改地图页 UI、WXML、WXSS、业务逻辑、数据模型或云端能力。
- 不恢复 DevTools 9420 服务端口，也不执行任何本机 DevTools 操作。

## 成功/失败/Blocked 判定

- 成功：手测证据门禁能发现 `map-list-visual-smoke` 是否存在；删除、改名或重复该 journey 时应失败。正常模板通过时，只能说明“必备 journey 存在且字段结构可被校验”。
- 失败：模板缺少 `map-list-visual-smoke`，或该 journey 被改成无法承接地图列表视觉 smoke 的泛化条目；如果门禁仍通过，应视为产品门禁失败。
- Blocked：若校验器无法稳定读取手测结果、模板路径不稳定，或并行分支改变了手测结果结构，应记录 blocked 并回到产品/QA 对齐。

任何情况下，门禁通过都不等于 DevTools/真机视觉 passed。它只证明模板包含必备 journey，真实视觉结论仍必须来自 DevTools UI 或真机观察，并按 evidence 规范记录。

## 与 S/R/P/Q 的关系

- P 组：定义地图列表 WXML/WXSS static guard，降低结构和样式回归风险。
- Q 组：把 P 的 static guard 接入 readiness preflight，降低候选漏跑自动检查的风险。
- R 组：让手测准备 helper 显式提示 readiness 和地图列表 static guard，降低执行入口误解风险。
- S 组：在手测模板中新增 `map-list-visual-smoke`，为真实视觉 smoke 留出证据槽位。
- T 组：定义必备 journey 门禁价值，防止 S 组新增的证据槽位未来被删除、改名或绕过。

P/Q/R/T 都不能替代 S 组要求的真实视觉观察；S 组模板存在也不能替代真实执行。

## 证据

- 当前 `harness/manual-test-results.example.json` 已包含 `map-list-visual-smoke`，状态为 `not_covered`，没有伪造 passed evidence。
- T 组计划把 `scripts/check-manual-evidence.mjs` 从通用字段校验扩展为必备 journey gate：缺少或重复 `map-list-visual-smoke` 都应失败。
- T 组不改 example JSON 的真实结论，不声称真实手测完成，也不把模板完整性通过升级成视觉验收通过。

## 下一步

- 开发实现应让 `scripts/check-manual-evidence.mjs` 把 `map-list-visual-smoke` 加入 required journey 校验，并覆盖缺失与重复两类坏样例。
- QA 验证应保留坏样例：删除或重复 `map-list-visual-smoke` 后门禁必须失败。
- 后续真实手测仍需在 DevTools UI 或真机中执行，并把结果写入 ignored local JSON 或脱敏摘要。
- 若真实环境仍 blocked，应把 `map-list-visual-smoke` 写为 `blocked` 或 `not_covered`，不要用门禁通过替代视觉 passed。
