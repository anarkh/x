# 地图列表 blocked summary preflight 产品 brief

## 目标

AA 轮提供一个评审前一键 preflight：自动扫描 ignored local 的 blocked result / summary 配对，并对每一对复跑 `scripts/check-map-list-blocked-summary.mjs`。

它要降低 reviewer 只看到本地 blocked summary、却漏跑单文件 guard 命令的风险。preflight 的职责是把 Z 轮“生成后编辑必须复跑 guard”的流程提醒，提升为评审前可统一执行的主动检查入口。

## 用户价值

- 对执行者：不用逐个回忆每份 local JSON/Markdown 对应的 guard 命令，评审前跑一个入口即可发现明显不一致。
- 对 reviewer：看到 blocked summary 前，可以要求先跑 preflight，减少 summary 被后编辑、跨 run 拼接或误改成 passed 后仍被引用的风险。
- 对项目维护者：blocked 证据链继续保持“本地可生成、可脱敏、可校验、不可冒充 UI passed”的边界，便于长期迭代。

## 验收标准

- preflight 能在 `harness/` 下识别 ignored local blocked result 与 local summary 配对，例如 `manual-test-results.local*.json` 和 `manual-test-summary.local*.md`。
- preflight 对每个配对复用现有 blocked summary guard，检查 blocked 状态、`map-list-visual-smoke` 状态、evidence count、Run branch/commit、actual/followUp/blocker 同源内容。
- 如果 summary 被改成 passed、commit 与 JSON 不一致、目标 journey 丢失或 evidenceCount 非 0，preflight 必须失败，并指出失败的配对。
- 如果没有可检查的 local 配对，preflight 应给出清晰口径：没有发现可校验的 ignored local blocked summary/result 对，而不是默默通过成 UI 证据。
- 输出必须明确：preflight 通过只说明 blocked local summary/result 对通过一致性检查，不等于地图列表 UI passed evidence。
- 验证仍需覆盖 `bash harness/init.sh`、新增脚本语法检查、正向 local 配对、后编辑负向样例、`git diff --check`。

## 非目标

- 不恢复 WeChat DevTools service port 9420，不处理 CLI open/preview timeout。
- 不替代 DevTools 或真机地图列表视觉 smoke，不证明长标题、长正文、图片加载、safe area、地图原生层或详情点击已通过。
- 不提交 ignored local JSON/Markdown 作为正式证据。
- 不改动地图页 UI、数据模型、发布流程或详情页信任逻辑。
