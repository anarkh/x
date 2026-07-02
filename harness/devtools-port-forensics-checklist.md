# DevTools 端口只读 Forensics 清单

日期：2026-06-14

范围：用于 `codex/iter-devtools-port-forensics` 分支在 `/tmp/street-tasks-iter-worktrees/devtools-forensics` 上做 WeChat DevTools 服务端口只读排查。本清单只记录准备、进程、端口、版本、路径和 blocked 口径；不退出 DevTools、不打开或重启项目、不杀进程、不清缓存、不写用户配置、不提交原始敏感日志。

已知背景：M 组诊断到 `9420` service port blocked；N 组受控 `--quit-reopen` 后仍未恢复 `9420`。O 组目标是把后续只读 forensics 观察项和判定口径固定下来，避免继续把 DevTools 入口 blocked 和产品 smoke 通过混在一起。

## 0. 准备 / 基线

- [ ] 确认工作树、分支和提交。

  ```bash
  pwd
  git branch --show-current
  git rev-parse --short HEAD
  git status --short
  ```

  期望：工作目录为 `/tmp/street-tasks-iter-worktrees/devtools-forensics`，分支为 `codex/iter-devtools-port-forensics`。macOS 可能把 `/tmp` 显示为 `/private/tmp`，记录时仍写本轮约定 worktree 路径。

- [ ] 跑基础 harness，确认不是仓库基础状态异常。

  ```bash
  bash harness/init.sh
  ```

  期望：JSON 检查和 harness 自检通过。若失败，先记录 baseline 异常，不继续把 DevTools 端口状态写成 `ready`。

- [ ] 明确只读边界。
  - 不执行 `quit`、`open --project`、`preview`、`upload`、清缓存、删除配置、修改 `project.private.config.json` 或 DevTools 设置。
  - 不使用 `kill`、`pkill`、`killall`、`launchctl kickstart`、`rm -rf` 或任何会改变 DevTools / 用户配置的命令。
  - 不把完整 `ps`、Console、Network、云端日志或 CLI stderr 原文提交；只写脱敏摘要和本地附件编号。

- [ ] 记录本轮 forensics 不是产品验证。
  - 端口 `ready` 只表示“DevTools service port 看起来可连接”。
  - 端口 `blocked` 只表示“DevTools service port 入口不可用或无法确认”。
  - 端口 forensics 结果不能写成产品 smoke 通过；只有真实 DevTools UI 操作或真机旅程执行并记录证据，才可证明用户可见流程通过。

## 1. 只读进程与端口检查

- [ ] 观察 DevTools-like 进程，不粘贴完整命令行。

  ```bash
  ps aux | rg -i "wechat|微信|devtools|ide-http-port"
  ```

  摘要只记录：进程数量、是否像 WeChat DevTools、是否声明 `--ide-http-port`、声明的端口、是否出现多个不同 app 路径或多个项目路径。不要提交用户目录、完整启动参数、环境变量或账号信息。

- [ ] 检查目标端口是否监听。

  ```bash
  lsof -nP -iTCP:9420 -sTCP:LISTEN
  nc -vz 127.0.0.1 9420
  nc -vz ::1 9420
  curl -sS --max-time 3 http://127.0.0.1:9420/ || true
  ```

  摘要只记录：`LISTEN` 是否存在、IPv4 / IPv6 是否 connection refused、`curl` 是 refused、timeout、404、鉴权错误还是其他非业务响应。不要提交完整 HTTP body、header、cookie 或本机路径。

- [ ] 检查是否存在端口声明但无监听。
  - 若 `ps` 中出现 `--ide-http-port 9420`，但 `lsof -iTCP:9420 -sTCP:LISTEN` 无结果，并且 `nc` / `curl` 是 connection refused，则记录为“声明 `ide-http-port` 但无监听”。
  - 若有监听但监听进程不是 DevTools-like，记录为“端口被其他进程占用，归属未知”，不要直接写 `ready`。
  - 若监听端口不是 `9420`，但有其他 `--ide-http-port <port>` 声明，逐个做同样只读监听检查，并记录端口映射摘要。

- [ ] 检查是否多个 DevTools 实例。
  - 统计 DevTools-like 进程数量、app bundle 路径数量、声明端口数量和可能的项目路径数量。
  - 如果多个实例共享或声明不同端口，记录“多实例，端口归属需人工确认”。
  - 不把其他 worktree 或其他 DevTools 实例的可用端口误写成本分支 `ready`。

## 2. DevTools App / CLI 版本与路径摘要

- [ ] 记录 DevTools app 路径摘要。

  ```bash
  ls -ld /Applications/wechatwebdevtools.app
  mdls -name kMDItemVersion /Applications/wechatwebdevtools.app 2>/dev/null || true
  defaults read /Applications/wechatwebdevtools.app/Contents/Info CFBundleShortVersionString 2>/dev/null || true
  defaults read /Applications/wechatwebdevtools.app/Contents/Info CFBundleVersion 2>/dev/null || true
  ```

  可提交摘要：`appPath=<system-app-path>`、`shortVersion=<version-or-unconfirmed>`、`bundleVersion=<version-or-unconfirmed>`。若 DevTools 安装在用户目录，只写 `<local-devtools-app>`，不要写 `/Users/<name>/...`。

- [ ] 记录 CLI 路径和只读可用性。

  ```bash
  /Applications/wechatwebdevtools.app/Contents/MacOS/cli --help
  ```

  可提交摘要：`cliPath=<system-cli-path>`、`cliHelp=available/unavailable`、`cliVersion=<version-or-unconfirmed>`。不要执行 `open`、`quit`、`preview` 或任何会改变 IDE 状态的 CLI 子命令。

- [ ] 记录版本无法确认时的原因。
  - App 不存在：写“默认 app 路径不存在”。
  - CLI 无法运行：写“CLI help unavailable，退出码或错误类型已脱敏”。
  - 没有 UI 权限或 DevTools 未运行：写“UI 版本无法确认”，不要伪造版本。

## 3. Blocked 字段记录

blocked / unknown / ready 摘要至少包含：

- `forensicsAt`：日期时间和时区，使用 `2026-06-14` 当日记录。
- `branch`：`codex/iter-devtools-port-forensics`。
- `commit`：`git rev-parse --short HEAD`。
- `worktree`：`/tmp/street-tasks-iter-worktrees/devtools-forensics`。
- `baseline`：`bash harness/init.sh` 通过 / 失败摘要。
- `devtoolsAppPath`：`<system-app-path>`、`<local-devtools-app>` 或“无法确认”。
- `devtoolsVersion`：版本号或“无法确认”。
- `cliPath`：`<system-cli-path>`、`<local-cli-path>` 或“无法确认”。
- `cliHelp`：available / unavailable。
- `devtoolsProcessCount`：DevTools-like 进程数量。
- `multiInstanceSummary`：单实例 / 多实例 / 无法确认。
- `ideHttpPortDeclarations`：声明端口列表，例如 `[9420]`。
- `listenEvidence`：`lsof` / `nc` / `curl` 的脱敏结论。
- `declaredButNotListening`：yes / no / unknown。
- `status`：`ready` / `blocked` / `unknown`。
- `actualResult`：最小错误摘要，例如 `9420 connection refused`、`declared ide-http-port but no listener`、`multiple instances ambiguous`。
- `manualJourneyImpact`：哪些 DevTools UI / 真机 smoke journey 尚未执行。
- `nextAction`：后续人工 UI 恢复建议。
- `evidenceLocation`：本地附件编号或安全外部位置，不写原始绝对路径。
- `redactionStatus`：已脱敏 / 待复核。

示例摘要：

```text
forensicsAt: 2026-06-14 14:30 CST
branch: codex/iter-devtools-port-forensics
commit: <short-sha>
worktree: /tmp/street-tasks-iter-worktrees/devtools-forensics
baseline: harness init passed
devtoolsAppPath: <system-app-path>
devtoolsVersion: <version-or-unconfirmed>
cliPath: <system-cli-path>
cliHelp: available
devtoolsProcessCount: 1
multiInstanceSummary: single DevTools-like process observed
ideHttpPortDeclarations: [9420]
listenEvidence: 9420 no LISTEN; IPv4 and IPv6 connection refused
declaredButNotListening: yes
status: blocked
actualResult: DevTools process declares --ide-http-port 9420 but no service listener is reachable
manualJourneyImpact: DevTools compile, map smoke, publish smoke, detail trust smoke, and real-device preview not executed
nextAction: Human operator should inspect DevTools UI service-port setting and perform normal UI recovery before rerunning smoke
evidenceLocation: local attachment F-port-01; raw logs not committed
redactionStatus: sanitized summary only
```

## 4. 判定规则

- `ready`
  - 目标端口或明确声明的 DevTools service port 有 `LISTEN`。
  - `nc` / `curl` 不再是 connection refused；返回 404、鉴权错误或 DevTools 非业务响应均可说明端口入口存在。
  - 只有一个可归属当前 DevTools 实例的端口，或多实例归属已通过只读证据清楚区分。
  - `bash harness/init.sh` 通过。
  - 备注：`ready` 只代表端口入口可用，不代表 DevTools 已打开当前项目，也不代表任何产品旅程通过。

- `blocked`
  - `ps` 声明 `--ide-http-port 9420`，但 `lsof` 无监听，`nc` / `curl` connection refused。
  - DevTools-like 进程不存在，且 CLI / app 路径无法确认到可用入口。
  - 端口被其他进程占用，无法确认是 DevTools service port。
  - 多个 DevTools 实例或多个端口冲突，无法把可用端口归属到本 worktree。
  - baseline 失败且会影响 DevTools 入口判断。

- `unknown`
  - `ps`、`lsof`、`nc` 或 `curl` 权限不足或输出不完整。
  - 有监听但响应无法判断是否 DevTools service port。
  - DevTools 版本、CLI 路径或端口声明缺失，且只读检查不足以确认 blocked。
  - 多实例信息不足，但也没有明确 connection refused 或占用证据。

## 5. 脱敏规则

- 不提交真实 AppID、openId、unionId、头像 URL、昵称、手机号、精确经纬度、CloudBase 环境 ID、requestId、完整 `cloud://`、token、cookie、二维码、个人设备标识或本机用户路径。
- 不提交完整 `ps aux`、CLI stderr、Console、Network、云函数日志、数据库截图或 DevTools 导出文件。
- 本清单允许写当前测试 worktree 路径 `/tmp/street-tasks-iter-worktrees/devtools-forensics`；其他本机路径泛化为 `<local-path>`、`<system-app-path>`、`<system-cli-path>` 或 `<local-devtools-app>`。
- 进程和端口输出只写最小结论：进程数量、声明端口、是否监听、connection refused / timeout / non-business response。
- 真实截图、录屏、原始日志和命令完整输出只放 ignored 本地附件目录或外部安全位置；可提交内容只保留摘要和附件编号。
- 写入可提交报告前运行并人工复核：

  ```bash
  git status --short --ignored
  git diff -- harness '*.md' '*.json'
  rg --no-ignore -n -i "(api[_-]?key|secret|token|password|passwd|pwd|private[_-]?key|session|cookie|authorization|bearer|access[_-]?token|refresh[_-]?token|client[_-]?secret|appsecret|wx[0-9a-f]{16,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})" .
  ```

  期望：真实附件和 local 结果仍是 ignored；secret scan 没有新增真实敏感值。若命中的是规则说明，也要人工确认不是实际凭据。

## 6. 后续人工 UI 恢复建议

O 组不执行恢复动作，只把建议交给有本机 UI 权限的执行者：

- 打开微信开发者工具 UI，进入“设置 -> 安全设置”，确认“服务端口”开启；若 UI 显示关闭，手动开启后重新做只读端口检查。
- 确认当前只保留必要的 DevTools 实例；如果多个项目或多个版本同时运行，先人工识别当前项目和端口归属。
- 正常退出整个 DevTools app 后重开，不只关闭模拟器窗口；恢复前保存必要的脱敏 blocked 摘要。
- 重新打开目标 worktree 后，先跑端口 access 检查，再做 DevTools 编译、地图首屏、发布状态、详情信任动作和真机预览 smoke。
- 若 `9420` 长期 blocked，可人工切换服务端口、升级或重装 DevTools、换机器验证，或改用 UI 手测路径记录 CLI blocked。
- 恢复后仍需按真实 DevTools UI / 真机旅程记录 `passed`、`failed`、`blocked` 或 `not_covered`；端口恢复本身不能替代产品 smoke 证据。
