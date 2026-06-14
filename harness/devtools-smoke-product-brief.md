# M 组 DevTools Smoke 阻塞排查产品简报

日期：2026-06-14

分支：`codex/iter-devtools-smoke-unblock`

对象：继续推进真实 WeChat DevTools smoke access 的产品、QA 和开发 agent。

## 1. 问题

本轮不再继续扩展 harness 文档或证据模板，而是转向真实 WeChat DevTools smoke access 的阻塞排查。原因是 L 组已经补齐了手测 local JSON、脱敏 summary 草稿和 evidence hygiene，继续增加外围规范的边际价值下降；当前真正阻断发布判断的是：真实 DevTools/真机手测仍未执行，且本机进入 DevTools smoke 的端口和 CLI 链路不可用。

当前观察到的阻塞现象：

- WeChat DevTools 进程存在，启动命令包含 `--ide-http-port 9420`。
- `lsof -iTCP:9420 -sTCP:LISTEN` 未发现监听。
- `curl http://127.0.0.1:9420/` 返回 connection refused。
- `cli open --project ... --port 9420` 被 20s timeout 截断，输出包含 `IDE may already started at port 9420, trying to connect`。

这些现象说明：当前不能把自动脚本、local JSON 或文档校验当作真实 smoke 通过。M 组要把“为什么进不了真实 smoke”变成可复现诊断、明确恢复步骤和可继续执行的 blocked 记录。

## 2. 用户/发布价值

真实 DevTools/真机 smoke 是判断街区任务能否进入候选发布的关键门槛。发布准备度、定位授权、地图首屏、详情信任动作、评论入口、图片和云端路径，都有只能在 DevTools 或真机中观察的风险。

本轮聚焦 smoke access unblock 的价值是：

- 避免把 harness 完整误读成用户旅程通过。
- 让后续 agent 可以稳定复现 9420 端口与 CLI 连接问题，而不是重复猜测。
- 明确何时可以开始真实 smoke，何时必须继续标记为 blocked。
- 把发布准入讨论从“文档是否齐”推进到“真实运行入口是否可用”。

## 3. 范围内

- 记录 DevTools 进程、端口监听、CLI open/preview/curl/lsof 的诊断口径。
- 说明 9420 端口未监听、connection refused、CLI timeout 对真实 smoke 的影响。
- 定义恢复步骤：确认安全设置服务端口、重启 DevTools、重新打开项目、检查端口监听、再尝试 CLI 或手动 smoke。
- 定义 blocked 状态如何记录到后续手测证据或 summary 中。
- 明确真实 smoke 开始前必须满足的最小条件。

## 4. 非目标

- 不声明真实 WeChat DevTools 或真机手测已经通过。
- 不把本地 JSON、脱敏 summary、evidence hygiene 或自动脚本结果升级为用户旅程通过。
- 不修改小程序功能代码、页面样式、云函数、脚本或现有 harness 状态文件。
- 不解决所有 DevTools 内部问题，只把当前端口/CLI 阻塞变成可执行排查路径。
- 不要求本轮提交代码。

## 5. 成功标准

本 brief 完成后，后续 agent 应能回答：

- 为什么本轮从继续扩展 harness 转向 DevTools smoke access 阻塞排查。
- 当前端口与 CLI 阻塞的已知证据是什么。
- 阻塞时应该如何记录状态、影响和下一步，而不是写成 passed。
- 真实 smoke 何时可以开始，开始后需要至少覆盖哪些用户旅程。

真正的产品成功不是“写完本文档”，而是后续能恢复 DevTools 入口，并在真实 DevTools 或真机中留下可复核 smoke 证据。

## 6. Blocked 记录口径

当 9420 服务端口没有监听或 CLI 连接失败时，记录为：

- 状态：`blocked`
- 类型：`DevTools smoke access blocked`
- 阶段：`open project`、`connect service port` 或 `start smoke`
- 证据：记录命令、时间、超时秒数、关键输出和当前项目路径
- 当前观察：进程存在但端口未监听，curl connection refused，CLI 提示已有 IDE 后继续连接但超时
- 影响：无法通过 CLI 打开、预览或稳定触发真实 smoke；不能判断产品旅程通过或失败
- 已尝试动作：列出是否检查过进程、端口、curl、CLI open、DevTools 安全设置、重启和重新打开项目
- 下一步：恢复服务端口监听，或改用 DevTools UI 手动打开项目并记录环境与截图

不要把 blocked 写成：

- `passed`：因为没有进入真实用户旅程。
- `failed`：除非已经能稳定进入产品行为并复现产品缺陷。
- `not_covered`：因为当前不是主动未测，而是入口被工具/环境阻断。

## 7. 下一步真正手测条件

只有满足以下条件之一，才可以开始记录真实 DevTools smoke：

1. DevTools 服务端口恢复：`lsof -iTCP:9420 -sTCP:LISTEN` 能看到监听，`curl http://127.0.0.1:9420/` 不再是 connection refused，CLI open 或 preview 能返回可判断结果。
2. DevTools UI 可用：在 WeChat DevTools 中手动打开 `/tmp/street-tasks-iter-worktrees/devtools-smoke`，能编译并进入模拟器页面，且记录 DevTools 版本、基础库、项目路径、分支和当前提交。
3. 真机链路可用：能从 DevTools 预览或真机调试进入小程序，并记录设备、微信版本、网络、定位授权和登录状态。

开始真实 smoke 后，最低覆盖：

- 地图首屏：打开项目、编译、进入地图页，记录控制台是否有阻断错误。
- 地图到详情：从地图 marker 或列表进入详情，确认不是空白页或任务不存在。
- 发布准备度：打开发布页，观察定位确认、必填状态和主按钮文案。
- 定位分支：至少记录允许、拒绝或失败重试中的一个真实分支；未覆盖的分支必须写明。
- 详情信任入口：进入 active 详情，观察 TrustInsight、评论入口和信任动作区域是否可见。

若以上条件仍不满足，结论必须保持 `blocked`，并把新的命令输出、截图或日志追加到手测证据中。M 组不为真实 DevTools/真机 smoke 背书，直到真实运行入口恢复并完成上述旅程。
