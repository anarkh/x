# AC 轮 package readiness gate QA checklist

## 目标

把 AB 轮已接入默认路径的 blocked summary preflight 暴露到 npm 层，让本地人工验证和自动化都能用稳定命令调用同一组门禁。

## 预期 npm 入口

- `npm run check:json`：只运行 JSON 严格语法检查。
- `npm run check:harness`：只运行 harness 结构检查。
- `npm run check:blocked-summary`：运行 ignored local blocked summary preflight。
- `npm run check:readiness`：运行 DevTools readiness 脚本，并通过 AB 轮默认入口带起 blocked summary preflight，同时保留“不代表 DevTools 或真机 UI 通过”的口径。
- `npm run check`：组合运行 `check:json`、`check:harness` 和 `check:readiness`；其中 `check:readiness` 会覆盖 blocked summary preflight，避免重复跑同一检查。

## 自动验证清单

- 无 `harness/manual-test-summary.local*.md` 时，`npm run check` 应通过，并能看到 blocked summary preflight 的空跑提示。
- 无 local summary 时，分别运行 `npm run check:json`、`npm run check:harness`、`npm run check:blocked-summary`、`npm run check:readiness` 均应通过。
- 使用 blocked summary wrapper 生成一组匹配的 local results/summary 后，`npm run check:blocked-summary` 应通过。
- 存在一组匹配的 local results/summary 后，`npm run check` 应通过，且不把 blocked summary 写成 UI passed 证据。
- 删除 matching `harness/manual-test-results.local*.json` 后，`npm run check` 应失败，并提示缺失 results JSON。
- 将 matching `harness/manual-test-summary.local*.md` 中 `map-list-visual-smoke` 改成 `passed` 后，`npm run check` 应失败，并提示该 journey 不能是 passed。
- 负向验证后必须清理本轮产生的 `harness/manual-test-results.local*.json` 和 `harness/manual-test-summary.local*.md` local 产物。

## 报告口径

- AC 轮只能证明 npm 级门禁入口更容易被人工和自动化调用。
- blocked summary preflight 只检查 ignored local blocked summary 的结构和同源一致性。
- 任何 `npm run check*` 通过都不能写成地图列表 UI、DevTools 或真机视觉验收通过。

## 未验证项

- WeChat DevTools 真实打开项目、编译、地图列表抽屉视觉 smoke。
- 真机 safe area、原生地图层覆盖、滚动、长标题/长正文、带图/无图卡片。
- marker/list/detail 点击链路和定位授权允许、拒绝、超时路径。
- CI 或提交钩子是否强制运行 `npm run check`。
