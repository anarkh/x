# 地图列表视觉 Smoke Blocked Evidence 演练产品 Brief

- 日期：2026-06-14
- 分支：`codex/iter-map-list-blocked-evidence`
- 角色：U 组产品 agent
- 对应 feature：`map-feed-001`

## 用户问题

S 组已经新增 `map-list-visual-smoke` 证据槽位，T 组已经要求手测 JSON 中必须保留且只保留一条该 journey。但当前仍缺一次明确演练：当 WeChat DevTools 9420 服务端口 blocked、DevTools UI 或真机无法执行地图列表视觉 smoke 时，执行者应该如何把这个状态写成合规的 ignored local JSON 草稿。

如果没有这层演练，后续 agent 可能出现两类误判：一是因为无法执行 UI 就不填 `map-list-visual-smoke`；二是把静态检查、helper 成功或 example 模板通过误写成视觉 `passed`。两者都会让评审无法判断真实视觉 smoke 到底是未执行、环境阻塞，还是已经观察通过。

## 产品假设

把 `map-list-visual-smoke` 的 blocked 写法提前产品化，可以让无法执行真实 UI 的情况也留下可校验、可评审、不会误报 passed 的证据草稿。blocked evidence 合规通过只说明“环境阻塞被正确记录”，不代表产品失败，也不代表地图列表 UI passed。

## 范围

- 定义 `map-list-visual-smoke` 在当前 9420 blocked 或 DevTools 未执行时的 local JSON 填写口径。
- 明确 `blocked`、`passed`、`failed`、`not_covered` 的边界，重点区分 `blocked` 与 `passed`。
- 说明 blocked 草稿至少要写清环境、阻塞阶段、实际结果、影响范围、证据引用、风险和下一步。
- 约束证据来源只能是实际观察到的端口、CLI、DevTools UI 或真机状态摘要；不能用自动静态 guard 代替视觉证据。
- 配套 helper 和 QA 清单只服务于生成、复核 ignored local blocked 草稿；不修改业务 UI 或把 blocked 升级成 passed。

## 非目标

- 不执行 WeChat DevTools UI、CLI open/preview、真机调试或任何端口恢复动作。
- 不声明 WeChat DevTools、真机、地图列表视觉 smoke 或完整用户旅程已经通过。
- 不提交 `harness/manual-test-results.local*.json`；helper 生成的 blocked 草稿只允许留在 ignored local 文件中。
- 不改 `harness/manual-test-results.example.json`、`scripts/check-manual-evidence.mjs`、readiness preflight、WXML、WXSS 或业务 JS。
- 不把 9420 blocked 写成产品缺陷；只有进入真实用户旅程并观察到用户可见问题时，才应写 `failed`。

## Blocked/Passed 边界

- `blocked`：环境或工具阻止执行真实地图列表视觉 smoke，例如 9420 未监听、CLI timeout、DevTools 无法打开项目、真机不可用、测试数据无法准备、原生 map 层阻断操作。此时可以写 blocked evidence，说明入口不可用和发布判断仍不可得。
- `passed`：只能来自 DevTools UI 或真机中的真实观察，且必须包含具体环境、步骤、实际结果和可复核证据。静态脚本、模板校验、helper 生成 local JSON、readiness 通过都不能产生 `passed`。
- `failed`：DevTools UI 或真机可运行，且已经观察到重叠、遮挡、无法滚动、点击无效、详情跳转错误等用户可见问题。
- `not_covered`：本轮没有执行也没有具体 blocker；如果已经有 9420/DevTools 阻塞证据，应优先写 `blocked`，不要把环境阻塞淡化成未覆盖。

核心口径：blocked evidence 通过只说明记录方式合规；它既不是产品失败证据，也不是 UI 通过证据。

## 与 S/T/K/L/M/N/O/P/Q/R 的关系

| 组别 | 已提供能力 | U 组如何承接 |
| --- | --- | --- |
| S | 新增 `map-list-visual-smoke` 真实视觉 smoke 证据槽位 | 规定无法执行该 smoke 时如何写 blocked，而不是留空或写 passed |
| T | 将 `map-list-visual-smoke` 升级为必备 journey gate | 确保必备 journey 在 blocked 场景下也有合规内容，不绕过 gate |
| K | 提供手测准备 helper 和 ignored local JSON 入口 | U 组新增 blocked helper，直接生成合规的 blocked local 草稿 |
| L | 定义 local 结果的脱敏摘要草稿 | U 组 blocked 草稿后续可被摘要化，但摘要不能升级为视觉通过 |
| M | 记录 DevTools smoke access blocked 的端口/CLI 口径 | U 组可引用 M 类诊断作为 blocked evidence 来源 |
| N | 定义受控恢复和恢复失败的记录边界 | 若恢复失败，U 组要求把恢复后仍 blocked 的事实写入 `actual`、`risks` 和 `followUp` |
| O | 拆分 CLI 可用、进程声明、端口监听和 smoke ready | U 组沿用 O 的分层，避免把 CLI 存在或进程声明误写成 smoke ready |
| P | 地图列表 WXML/WXSS static guard | U 组强调 static guard 只能降低结构风险，不能替代 blocked 或 passed UI evidence |
| Q | 将地图列表 static guard 接入 readiness preflight | U 组要求 readiness 通过时仍保留 `map-list-visual-smoke=blocked` 的真实环境结论 |
| R | 让手测 helper 显式展示 readiness 和 static guard | U 组补齐 helper 之后、真实 UI 之前的 blocked local JSON 写法 |

## 证据字段要求

在 ignored 的 `harness/manual-test-results.local*.json` 中，blocked 草稿应至少满足以下要求：

- 顶层字段：保留 `branch`、`commit`、`testedAt`、`tester`、`environment`、`summary`、`journeys`。
- `environment`：记录 DevTools 版本或状态、基础库版本或未知原因、设备/模拟器状态、网络、定位权限、CloudBase/后端状态；若某项因 blocked 无法确认，写明 `unknown because ...`，不要留占位符。
- `summary.overallStatus`：如果地图列表视觉 smoke 是本轮发布判断 blocker，应写 `blocked`；推荐语说明真实 UI 未执行。
- `journeys[].id`：必须保留且只保留一条 `map-list-visual-smoke`。
- `map-list-visual-smoke.status`：当前 9420/DevTools 未执行场景应写 `blocked`，不能写 `passed`。
- `steps` 和 `expected`：保留真实视觉 smoke 原始步骤和期望，便于端口恢复后继续执行。
- `actual`：写具体阻塞事实、阶段和影响，例如服务端口未监听、CLI timeout、DevTools UI 未能打开目标 worktree，因此长标题、长正文、图片、安全区、原生 map 层、滚动和详情链路均未观察。
- `evidence`：只放实际存在且已脱敏的命令摘要、截图/录屏引用或人工 UI 观察摘要；没有可提交 artifact 时可以为空，但不能填 example 文案或虚构截图。
- `risks`：列出未能判断的用户风险，例如 safe area、原生 map 层、图片加载、抽屉滚动、marker/list/detail 数据一致性。
- `followUp`：写清下一步恢复条件，例如人工开启 DevTools 服务端口、换端口/换机、重新运行 readiness/helper，再执行真实地图列表视觉 smoke。

建议 blocked `actual` 使用这种结构：

```text
DevTools service port 9420 was not reachable, so the tester could not open or automate the target worktree for map-list-visual-smoke. No DevTools UI or real-device visual observation was executed. Static readiness and map-list guard results remain preflight only; long-title, long-body, image/no-image, safe-area, native-map-layer, scroll, marker/list, and detail-link checks are still unverified.
```

## 下一步

- QA/执行者在准备真实手测时，可以用 `scripts/prepare-map-list-blocked-evidence.mjs` 生成 ignored blocked local JSON；若真实执行完成，再把 `map-list-visual-smoke` 改成 `passed/failed` 并补齐真实观察证据。
- 若仍是 9420 blocked，引用 M/N/O 类端口诊断摘要，跑 `node scripts/check-manual-evidence.mjs <local-json>` 确认结构合规，再用 L 组方式生成脱敏摘要草稿。
- 若端口或真机入口恢复，重新执行 S 组定义的地图列表视觉 smoke；只有真实观察完成并补齐 evidence 后，才允许写 `passed`。
- 评审 blocked 草稿时，应只接受“阻塞记录合规”这个结论，不应据此判断地图列表产品体验通过或失败。
