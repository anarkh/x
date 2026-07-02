# O 组 DevTools 端口 Forensics 产品简报

日期：2026-06-14

分支：`codex/iter-devtools-port-forensics`

工作目录：`/tmp/street-tasks-iter-worktrees/devtools-forensics`

对象：继续判断 WeChat DevTools smoke blocker 的产品、QA 和开发 agent。

## 问题

M 组已确认 DevTools smoke access 被 9420 服务端口阻塞：存在 DevTools-like 进程声明 `--ide-http-port 9420`，但 `127.0.0.1:9420` 和 `::1:9420` 都返回 `ECONNREFUSED`。N 组随后新增受控恢复脚本并执行过 `--quit-reopen`，但 CLI `quit` 和 `open` 均 timeout，恢复后仍 blocked。

O 组不再重复恢复动作，也不继续扩大 smoke 或业务验证范围。本轮问题是：当前 DevTools 环境里，端口声明、实际监听、CLI 可用性、应用版本和进程状态之间是什么关系；这些关系能支持哪些判断，不能支持哪些判断。

2026-06-14 的只读 forensics 摘要：

- `scripts/check-devtools-smoke-access.mjs --project /tmp/street-tasks-iter-worktrees/devtools-forensics --port 9420 --timeout-ms 5000` 返回 `status: blocked`。
- DevTools CLI 存在且可执行，来源为标准 macOS 应用包：`/Applications/wechatwebdevtools.app/Contents/MacOS/cli`。
- WeChat DevTools 应用版本为 `2.01.2510290`，bundle version 为 `4240.111`。
- 进程列表中有 1 个 DevTools-like 主进程声明 `--ide-http-port 9420`。
- `lsof -nP -iTCP:9420 -sTCP:LISTEN` 没有监听结果。
- `nc -vz -G 3 127.0.0.1 9420` 和 `nc -vz -G 3 ::1 9420` 都是 connection refused。

当前最稳妥的解释是：DevTools 进程仍在，但声明的 IDE HTTP 服务没有在 9420 建立可连接监听。CLI 可执行并不等于服务端口 ready；进程声明端口也不等于端口正在监听。

## 用户价值

真实 DevTools 或真机 smoke 仍是判断地图首屏、发布状态、定位授权、详情信任区、评论和图片链路的必要证据。O 组的价值不是让这些用户旅程通过，而是降低误判成本：

- 让后续执行者知道当前 blocker 是 DevTools 环境入口问题，不是已复现的产品缺陷。
- 把“CLI 可执行”“进程存在”“端口声明”“端口监听”拆开，避免任一单点被误写成 smoke ready。
- 给人工 UI 恢复、换端口或换机器提供可复核判断依据。
- 避免继续运行会改变环境的动作，保护已有 DevTools 现场、登录态和其他 worktree。

## 范围内

- 新增本产品简报，定义 O 组只读 forensics 口径。
- 读取 harness、已有 M/N 组产品简报和相关脚本，理解前序证据。
- 运行无副作用命令确认当前状态：`bash harness/init.sh`、默认模式的 `check-devtools-smoke-access`、`ps`、`lsof`、`nc`、Info.plist 版本读取。
- 解释 DevTools 端口声明、监听、CLI、应用版本和 blocked 判断之间的关系。
- 明确后续人工 UI 恢复、换端口、换机器或重新跑只读诊断的判断分叉。

## 非目标

- O 组不是产品功能迭代，不新增或改变任何用户可见能力。
- O 组不是真实 DevTools smoke，不证明地图、发布、详情、评论、图片、云端或跨用户路径通过。
- O 组不是恢复端口，不重复 N 组的 `--quit-reopen`，不执行 CLI open/preview/quit。
- 不修改业务代码、页面、云函数、脚本、配置或用户本地 DevTools 设置。
- 不清理缓存、不杀进程、不改服务端口、不改 AppID、不改 `project.private.config.json`。
- 不提交业务代码或本地配置变更；本轮 harness 文档和只读诊断脚本可以作为可审计工件提交。

## 只读安全边界

允许动作：

- 读取项目文档、harness 文件、M/N 组简报和脚本源码。
- 运行 baseline：`bash harness/init.sh`。
- 运行默认无 launch side effects 的端口诊断脚本；必须避免 `--attempt-open`。
- 运行 `ps`、`lsof`、`nc`、Info.plist 读取等只读探测。
- 只记录脱敏摘要，不提交完整进程输出、用户目录、日志、截图、二维码或账号信息。

禁止动作：

- 不运行 `scripts/recover-devtools-service-port.mjs --quit-reopen`。
- 不运行 DevTools CLI `quit`、`open`、`preview` 或任何会启动、关闭、重载 IDE 的命令。
- 不杀 DevTools、Chrome、node、nwjs 或其他用户进程。
- 不清 DevTools 编译缓存、全局缓存、登录态、storage、CloudBase 数据或本地配置。
- 不编辑业务代码或脚本。

若需要越过这些边界，必须把本轮结论停在 `blocked`，交给有 UI 权限且已确认风险的执行者处理。

## 成功标准

本 brief 完成后，后续 agent 应能复述并验证以下结论：

- 当前 blocked 不是因为缺少 CLI：CLI 可执行存在。
- 当前 blocked 不是因为没有 DevTools 进程：存在 DevTools-like 进程声明 `--ide-http-port 9420`。
- 当前 blocked 的关键矛盾是：声明了 9420，但 9420 没有监听，IPv4/IPv6 都拒绝连接。
- 当前只读 forensics 不等于 smoke ready，也不等于任何产品旅程 passed。
- 下一步应由人工 UI 恢复、换端口、换机器或重新打开 DevTools 后，再用同一诊断口径复核。

真正的成功不是写完文档，而是让下一位执行者不会把 DevTools 环境 blocker 误当成产品通过或产品失败。

## 失败/Blocked 口径

以下情况均应记录为 `blocked`：

- `9420` 没有监听，或 `127.0.0.1` / `::1` 仍为 `ECONNREFUSED`。
- DevTools-like 进程存在但只声明端口，无法证明 HTTP 服务实际 ready。
- CLI 可执行存在，但无法通过只读诊断确认端口 ready。
- 需要执行 quit/open、杀进程、清缓存、改配置或 UI 操作才能继续判断。
- DevTools UI、服务端口开关、当前打开项目、基础库版本或模拟器状态无法被只读方式确认。

建议记录格式：

```text
status: blocked
type: DevTools port forensics blocked
date: 2026-06-14
branch: codex/iter-devtools-port-forensics
worktree: /tmp/street-tasks-iter-worktrees/devtools-forensics
devtoolsVersion: 2.01.2510290 / 4240.111
cliEvidence: CLI executable exists in standard macOS app bundle
processEvidence: one DevTools-like process declares --ide-http-port 9420
listenEvidence: no listener on 9420; 127.0.0.1 and ::1 connection refused
scopeBoundary: read-only forensics only; no quit/open/kill/cache/config action
impact: real DevTools smoke and product journey judgment remain unavailable
nextAction: manual UI recovery, alternate port, alternate machine, then rerun read-only diagnostics
```

不要写成 `failed`，除非已经能进入真实产品旅程并复现用户可见缺陷。不要写成 `passed`，因为没有 DevTools smoke 或真机旅程证据。

## 如何避免误判为产品通过

- 把状态分层：`cli_available`、`process_declares_port`、`port_listening`、`devtools_smoke_ready`、`product_journey_passed` 不能互相替代。
- `process_declares_port=true` 只说明启动参数存在，不说明服务端口可连接。
- `cli_available=true` 只说明工具入口存在，不说明 CLI 可以连接 IDE。
- `harness/init.sh` 通过只说明 JSON 和 harness 自检通过，不说明 DevTools、模拟器或真机通过。
- O 组 brief 只能升级“环境 blocker 可解释性”，不能升级任何 feature status。
- 没有具体 DevTools/真机步骤、版本、环境、实际观察和脱敏证据时，所有用户旅程继续保持未验证或 blocked。

## 建议下一步

首选由有本机 UI 权限的人在 WeChat DevTools 中手动确认“设置 -> 安全设置 -> 服务端口”状态，并明确当前打开项目是否是 `/tmp/street-tasks-iter-worktrees/devtools-forensics` 或目标 smoke worktree。若 UI 中服务端口显示异常，人工恢复后再运行默认模式的 `scripts/check-devtools-smoke-access.mjs` 复核。

若 UI 显示端口已开启但 9420 仍拒绝连接，建议换一个明确记录的新端口或换机器验证，避免继续在同一个疑似卡死的 IDE 会话中重复 quit/open。换端口或换机器后，仍必须分别记录 CLI 可用性、进程声明、监听状态和真实 smoke 结果。

端口 ready 后才进入真实 smoke。最小 smoke 至少应覆盖打开项目、编译、地图首屏、发布页只读检查和任一详情页只读检查；定位授权、图片上传、发布闭环、评论、云端和跨用户路径仍需单独手测证据。
