# N 组 DevTools 服务端口受控恢复产品简报

分支：`codex/iter-devtools-service-recovery`

工作目录：`/tmp/street-tasks-iter-worktrees/devtools-recovery`

对象：继续推进真实 WeChat DevTools smoke 的产品、QA 和开发 agent。

## 问题

M 组已经把当前阻塞从“还没手测”收敛为更具体的 DevTools 服务端口故障：本机存在声明 `--ide-http-port 9420` 的 DevTools-like 进程，但 9420 对 `127.0.0.1` 和 `::1` 都返回 `ECONNREFUSED`，CLI `open` 只能 timeout。也就是说，当前不是产品旅程已经失败，而是尚未稳定进入真实 DevTools smoke。

如果继续只新增文档、清单或外围校验，会延长“自动脚本都绿但真实 smoke 仍没入口”的状态。N 组需要定义一个受控恢复口径：在明确记录风险和前置证据后，允许有 UI 权限的执行者退出或重启 WeChat DevTools，重新打开当前 worktree，并按结果进入最小 smoke 或记录新的 blocked 证据。

## 价值

- 把端口恢复从临时人工动作变成可审计、可复现的产品验证前置步骤。
- 降低误判风险：服务端口恢复只说明 smoke 入口恢复，不说明地图、发布、详情或云端路径通过。
- 给后续 agent 一个明确分叉：恢复成功就进入最小 smoke；恢复失败就留下新的 blocked 证据，而不是继续猜测 9420 状态。
- 避免无限追加 harness 能力，却没有推进真实用户旅程验证。

## 范围内

- 记录恢复前状态：当前分支、commit、worktree 路径、DevTools 进程声明、9420 监听结果、CLI open timeout 或 connection refused 摘要。
- 允许在明确记录风险后，通过 WeChat DevTools UI 正常退出，或在确认没有未保存 DevTools 操作后重启 DevTools。
- 重新打开当前 worktree：`/tmp/street-tasks-iter-worktrees/devtools-recovery`。
- 复查服务端口：确认 9420 是否监听，`scripts/check-devtools-smoke-access.mjs` 是否从 `blocked` 转为可开始 smoke 的状态。
- 端口恢复后执行最小 smoke：打开项目、完成一次编译、确认地图首屏可见，再进入发布页和任一详情页做只读检查。
- 端口仍失败时，记录新的 blocked 证据，包括恢复动作、端口结果、CLI 结果、DevTools UI 观察和下一步建议。

## 非目标

- 不声明真实 WeChat DevTools 或真机 smoke 已经通过。
- 不新增产品功能，不修改地图、发布、详情、云函数或存储逻辑。
- 不用脚本检查替代用户旅程手测。
- 不处理所有 DevTools 内部异常，只聚焦当前服务端口声明与实际监听不一致的问题。
- 不提交本地截图、录屏、完整路径、账号信息、CloudBase fileID 或其他敏感原始证据。

## 恢复动作边界

允许动作：

- 在记录恢复前证据后，通过 DevTools UI 正常退出当前 DevTools 进程。
- 如果 UI 退出不可用，允许重启明确识别为 WeChat DevTools 的进程；执行前必须记录进程匹配依据和风险。
- 重启后只打开当前 worktree，不切换到其他实验目录。
- 重新检查 9420 监听、CLI open、DevTools 编译结果和控制台首条错误。
- 如端口恢复但 CLI 仍异常，可改用 DevTools UI 手动打开项目，并把 CLI 失败记为环境限制。

禁止动作：

- 不使用宽泛进程清理命令误杀无关应用。
- 不清除用户全局配置、登录态、CloudBase 数据库、Storage 文件或小程序项目配置。
- 不把 `project.private.config.json`、本地 DevTools 缓存、真实截图或录屏加入版本控制。
- 不在未记录风险和恢复前状态的情况下直接重启 DevTools。
- 不把“端口恢复”“项目打开”“自动脚本通过”写成“产品通过”。

恢复前需要确认的风险：

- 退出或重启 DevTools 可能中断其他 worktree 的手测现场。
- DevTools 本地缓存、模拟器状态和控制台上下文可能丢失。
- 如果当前有未记录的手测观察，应先写入 ignored local 结果文件或脱敏摘要草稿，再执行恢复。

## 成功标准

服务端口恢复成功需要同时满足：

- 9420 对本机地址不再是 `ECONNREFUSED`，诊断脚本不再报告 `service port 9420` blocked。
- DevTools 能打开 `/tmp/street-tasks-iter-worktrees/devtools-recovery`，项目路径和分支记录一致。
- 普通编译可以完成，若有错误或警告，已记录首条错误和影响范围。
- 最小 smoke 至少完成到“地图首屏可见、发布页可打开、任一详情页可打开”的层级，并留下脱敏证据。

注意：即使以上全部满足，也只能说明“最小 smoke 入口和只读主路径初步可用”。发布定位授权、图片上传、发布后跳转、信任动作刷新、评论、跨用户和云端路径仍需要后续完整手测。

## 失败标准

以下任一情况应记录为新的 `blocked`，而不是继续标记产品通过：

- 重启后 9420 仍未监听，或 `127.0.0.1` / `::1` 仍为 `ECONNREFUSED`。
- CLI `open` 继续 timeout，且 DevTools UI 也无法稳定打开当前 worktree。
- DevTools 能打开但编译失败，或首屏停留在白屏/运行时错误，无法进入最小 smoke。
- 执行者无法确认是否可以安全退出或重启 DevTools。
- 观察到的错误需要产品代码、项目配置或云端资源介入，已经超出服务端口恢复范围。

失败记录至少包括：

- 恢复前诊断摘要。
- 执行过的恢复动作和时间。
- 恢复后端口、CLI、DevTools UI、编译或首屏结果。
- 当前判断：`blocked`、阻塞阶段、影响范围、下一步负责人或建议。

## 如何避免误判为产品通过

- 把状态拆开记录：`service_recovered`、`minimal_smoke_started`、`minimal_smoke_passed`、`full_product_passed` 不能互相替代。
- 端口恢复只升级“可开始真实 smoke”，不能升级地图、发布、详情、云端或跨用户功能状态。
- 自动脚本输出通过只说明结构、逻辑或端口检查通过；用户可见功能仍以 DevTools 或真机观察为准。
- 最小 smoke 只覆盖打开、编译和只读浏览，不覆盖完整发布闭环。
- 没有具体 DevTools 版本、基础库版本、设备/模拟器信息、实际步骤、实际结果和脱敏证据的条目，不能写 `passed`。
- 如果结果来自 example JSON、mock 数据、自动脚本或占位描述，必须标记为 `not_covered` 或 `blocked`。

## 下一步口径

N 组建议下一位有 UI 权限的执行者先运行 M 组诊断脚本确认仍 blocked，再按本文档执行受控退出/重启 DevTools。恢复成功后，立即执行最小 smoke 并把结果写入 ignored local 手测结果；恢复失败后，不再新增外围文档，直接把新的 blocked 证据写入 harness 记录或交给能操作 DevTools 环境的人继续处理。
