# AB 轮产品 brief：blocked summary readiness preflight

## 背景

AA 轮已经提供 `scripts/check-map-list-blocked-summary-preflight.mjs`，可以一键扫描 ignored local blocked summary/result 对并逐对复跑 guard。用户评测认为它有效，但风险仍在：评审或交接前需要人主动记得运行这条命令。

AB 轮要把这条 preflight 接到更默认的检查入口里，例如 `harness/init.sh` 或 `scripts/check-devtools-readiness.mjs`，让常规启动或 readiness 检查自然覆盖 blocked summary 守门。

## 目标

- 降低评审前漏跑 blocked summary preflight 的概率。
- 让默认入口在存在 ignored local blocked summary/result 时自动检查它们是否仍为可信 blocked 证据。
- 让无 local summary 的干净工作树清晰通过，不给开发者制造额外噪音。
- 保持报告口径谨慎：preflight 通过只说明 blocked summary/result 的结构与同源关系可信。

## 用户价值

- 对评审者：打开默认检查结果即可知道本地 blocked summary 是否被后编辑、缺 result、或错误标成 passed。
- 对迭代 agent：不用额外记忆一条单独命令，也能在常规检查中发现 blocked evidence 链路破损。
- 对项目维护者：继续保持 ignored local evidence 不入库，同时让它们在本地被引用前更容易被守住。

## 验收标准

- 默认入口会运行 blocked summary preflight，并在输出中能看出该检查已执行。
- 当没有 `harness/manual-test-summary.local*.md` 时，默认入口应清晰通过，并提示没有 local blocked summary 需要检查。
- 当存在 matching `harness/manual-test-summary.local*.md` 与 `harness/manual-test-results.local*.json` 时，默认入口应逐对复用现有 preflight/guard 逻辑。
- 当 summary 缺少对应 results JSON、summary 被改成 `passed`、或 summary 与 JSON 的 branch/commit/blocker/followUp 不一致时，默认入口应失败。
- 默认入口输出必须保留边界说明：该 preflight 不是 UI passed evidence，不能替代真实 WeChat DevTools 或真机视觉 smoke。
- `bash harness/init.sh`、JSON 检查、harness 检查仍应通过；如接入 `scripts/check-devtools-readiness.mjs`，该 readiness 检查也应通过。

## 非目标

- 不恢复 WeChat DevTools 9420 服务端口，也不声明 DevTools CLI 可用。
- 不把 ignored local blocked summary/result 提交入库。
- 不证明地图列表 UI 已通过、DevTools 已通过或真机已通过。
- 不修改地图页、详情页、发布页等用户界面行为。
- 不取代真实的 map-list visual smoke；它仍然需要 WeChat DevTools 或真机观察后单独记录。
