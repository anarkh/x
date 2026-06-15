# 地图列表视觉 Smoke 证据结构产品 Brief

- 日期：2026-06-14
- 分支：`codex/iter-map-list-visual-evidence`
- 角色：S 组产品 agent
- 对应 feature：`map-feed-001`

## 用户问题

P/Q/R 已经补齐地图列表静态结构 guard、readiness 集成和手测准备入口，但这些都只能说明“准备工作和结构约束通过”。评测仍缺真实视觉证据：长标题、长正文、带图/无图、安全区、原生地图遮挡、列表滚动，以及 marker/list/detail 点击链路，都需要有固定记录位置，避免执行者用自动脚本或模板生成结果代替真实观察。

## 产品假设

如果手测结果文件中为地图列表视觉 smoke 预留明确证据槽位，执行者会更容易逐项观察、记录 blocked 原因和补充脱敏截图/录屏引用；评审也能快速判断地图列表是否真的在 DevTools UI 或真机中被看过。

## 范围

- 定义地图列表视觉 smoke 的证据结构和记录口径。
- 覆盖 `long_title`、`long_body`、`with_image`、`without_image`、`safe_area`、`native_map_overlay`、`drawer_scroll`、`marker_tap`、`list_card_tap`、`detail_entry_tap`。
- 每个观察项都必须记录环境、步骤、实际结果、状态、证据引用和风险备注。
- 状态只允许写 `passed`、`failed`、`blocked`、`not_covered`。
- 继续使用 ignored 的本地结果文件和本地附件目录；可提交文档只放脱敏摘要和结构定义。

## 非目标

- 不修改业务代码、WXML、WXSS、脚本或 JSON 模板。
- 不恢复 WeChat DevTools 9420 服务端口，不执行 quit/open/kill/cache/config 操作。
- 不新增真实截图、录屏、local JSON 或任何原始 evidence 附件。
- 不声明地图列表、发布、详情或完整用户旅程已经通过。
- 不把 P/Q/R 的自动门禁结果升级成视觉验收结论。

## 成功/Blocked 判定

- `passed`：只能来自 DevTools UI 或真机观察；必须包含设备/模拟器、屏宽或机型、DevTools/基础库版本、操作步骤、实际结果和可复核证据引用。
- `failed`：DevTools UI 或真机可运行，但观察到重叠、遮挡、无法滚动、点击无效、详情跳转错误等用户可见问题。
- `blocked`：无法完成真实观察，例如 9420 服务端口仍 blocked、DevTools 无法打开项目、真机不可用、测试数据无法准备、地图原生层阻断操作。
- `not_covered`：本轮未执行该观察项；不能写成通过，也不能用自动脚本结果补位。

自动脚本、readiness、static guard、example JSON、local JSON 生成和 summary 模板通过，都不等于视觉通过。只有 DevTools UI 或真机中的真实观察可以写 `passed`。

## 证据要求

每次地图列表视觉 smoke 至少记录：

- `environment`：分支、commit、DevTools 版本、基础库版本、设备/模拟器、屏宽、是否真机、网络和定位授权状态。
- `data_setup`：用于观察的任务数据说明，至少覆盖长标题、长正文、带图、无图、不同状态和 lost/found 方向；不能包含真实用户隐私或完整云端路径。
- `observations.long_title`：标题和分类/状态标签是否换行正常，详情入口是否仍可见。
- `observations.long_body`：正文摘要是否限制行数，卡片高度是否影响列表扫读。
- `observations.with_image` 与 `observations.without_image`：图片加载前后骨架是否稳定，无图卡片是否仍对齐。
- `observations.safe_area`：抽屉底部、最后一张卡片和 tabBar/安全区是否互不遮挡。
- `observations.native_map_overlay`：原生 map 层是否压住抽屉、按钮、列表滚动或点击热区。
- `observations.drawer_scroll`：列表可滚动，顶部筛选和底部卡片在滚动中不错位。
- `observations.marker_tap`、`observations.list_card_tap`、`observations.detail_entry_tap`：marker 聚焦、列表卡片交互和详情入口跳转是否能到正确任务详情。
- `artifacts`：脱敏截图/录屏/日志摘要引用；原始附件必须留在 ignored 本地目录或受控系统。

## 与 P/Q/R 的关系

- P 组定义并实现地图列表 WXML/WXSS static guard，降低结构和样式回归风险。
- Q 组把 P 的 guard 接入 readiness preflight，降低候选验证漏跑风险。
- R 组让手测准备 helper 显式展示 readiness 和地图列表 guard，降低执行入口误解风险。
- S 组补齐真实视觉 smoke 的证据结构，明确哪些观察项必须有固定记录位置，以及什么条件下才能写 `passed`。

P/Q/R/S 共同目标是让地图列表更接近真实验收，但前三者和本 brief 都不代表已经完成真实视觉 smoke。当前已知 9420 服务端口仍可能 blocked；若真实 UI 无法打开，应记录 `blocked`，不要改写成通过。

## 下一步建议

- QA/开发 agent 可在后续任务中扩展 local manual results 结构或 checklist，把本 brief 的观察项落成可校验字段。
- 端口恢复后，优先用 DevTools UI 执行一次地图列表视觉 smoke，并为每个观察项填写状态和脱敏证据引用。
- 若发现视觉失败，先记录 failed 证据和最小复现步骤，再由开发 agent 做小范围修复。
- 若端口仍 blocked，继续记录 blocker 细节和恢复尝试来源，不要新增“视觉 passed”结论。
