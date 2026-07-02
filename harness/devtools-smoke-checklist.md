# WeChat DevTools Smoke Access 排查与执行清单

日期：2026-06-14

范围：用于 `codex/iter-devtools-smoke-unblock` 分支恢复真实 WeChat DevTools / 真机 smoke access。此清单只定义排查、blocked 记录和端口恢复后的最小 smoke 旅程；它不是已完成的手测记录。

## 0. 进入前检查

- [ ] 确认当前工作树和分支。

  ```bash
  pwd
  git branch --show-current
  git rev-parse --short HEAD
  git status --short
  ```

  期望：工作目录为 `/tmp/street-tasks-iter-worktrees/devtools-smoke`，分支为 `codex/iter-devtools-smoke-unblock`；工作区只包含本轮预期文件。

- [ ] 跑基础 harness。

  ```bash
  bash harness/init.sh
  ```

  期望：JSON 检查和 harness 自检通过。若失败，先记录基础状态异常，不继续把 DevTools smoke 写成 blocked 或 passed。

- [ ] 确认本轮不修改真实配置。
  - `project.config.json` 继续使用公开占位 `touristappid`。
  - `project.private.config.json`、真实 AppID、账号信息、二维码、截图和日志不提交。
  - 如需真实 AppID 或登录态，只在本机 DevTools / ignored 文件中处理。

- [ ] 确认已有手测工具链位置。
  - 结果模板：`harness/manual-test-results.example.json`
  - 本地结果文件：`harness/manual-test-results.local*.json`
  - 本地附件目录：`harness/manual-evidence-artifacts/`
  - 摘要草稿：`harness/manual-test-summary.local*.md`

## 1. 端口与进程检查

当前阻塞迹象：DevTools 进程命令包含 `--ide-http-port 9420`，但 9420 没有监听；`curl` connection refused；CLI `open` 20s timeout。

- [ ] 查 DevTools 进程和启动参数。

  ```bash
  ps aux | rg -i "wechat|微信|devtools|ide-http-port"
  ```

  期望：能看到 WeChat DevTools 主进程；若命令行有 `--ide-http-port 9420`，记录该端口。

- [ ] 检查端口是否实际监听。

  ```bash
  lsof -nP -iTCP:9420 -sTCP:LISTEN
  nc -vz 127.0.0.1 9420
  curl -sS --max-time 3 http://127.0.0.1:9420/ || true
  ```

  期望：至少 `lsof` 能看到监听进程，`nc` 不应 connection refused。`curl` 返回 404、鉴权错误或非业务响应都比 connection refused 更接近可用；完整返回不要提交，只记录脱敏摘要。

- [ ] 若 9420 不监听，先在 DevTools UI 检查安全设置。
  - 打开微信开发者工具。
  - 进入“设置 -> 安全设置”。
  - 确认“服务端口”已开启。
  - 关闭设置窗口后重新执行端口监听检查。

- [ ] 若 UI 显示已开启但端口仍不监听，退出并重启 DevTools。
  - 先正常退出 DevTools，避免只关模拟器窗口。
  - 确认旧进程退出后再重新打开 DevTools。
  - 重新打开本 worktree 项目：`/tmp/street-tasks-iter-worktrees/devtools-smoke`。
  - 再次检查 `ps`、`lsof`、`nc` 和 `curl`。

- [ ] 若 DevTools 开了多个项目或多个版本，确认 CLI 连接的是同一个实例。
  - 记录进程命令中的项目路径、端口和 DevTools 应用路径。
  - 若存在多个 `--ide-http-port`，逐个检查监听状态。
  - 不要把另一个 worktree 的 CLI 成功误记成本分支通过。

## 2. CLI open / preview 检查

- [ ] 端口监听后再执行 CLI `open`。

  ```bash
  /Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project /tmp/street-tasks-iter-worktrees/devtools-smoke
  ```

  期望：CLI 能连接已开启服务端口，并在 DevTools 中打开当前项目。若本机 CLI 路径不同，记录实际 CLI 路径，但不要提交含用户名的绝对路径。

- [ ] 若 `open` 仍 20s timeout，记录为 access blocker。
  - 记录命令类型：`open`
  - 记录端口：例如 `9420`
  - 记录现象：`wait IDE port timeout` 或 connection refused
  - 记录 DevTools UI 服务端口状态：开启 / 未开启 / 无法确认
  - 记录项目路径：只写 `/tmp/street-tasks-iter-worktrees/devtools-smoke`

- [ ] `open` 成功后再执行 CLI `preview`。

  ```bash
  /Applications/wechatwebdevtools.app/Contents/MacOS/cli preview --project /tmp/street-tasks-iter-worktrees/devtools-smoke
  ```

  期望：能生成预览结果或二维码。二维码、真实 AppID、上传结果和完整 CLI 日志只本地保存；可提交记录只写“preview 生成成功 / 失败摘要”。

- [ ] 若 CLI 仍不可用但 DevTools UI 可操作，允许转为 UI 手动 smoke。
  - 必须记录“CLI blocked，但 UI smoke 可执行”。
  - UI smoke 的每个 journey 仍要按真实执行结果填 `passed`、`failed`、`blocked` 或 `not_covered`。
  - 不因 UI 可打开就把 CLI access 问题标为 resolved。

## 3. Blocked 记录字段

当满足以下任一条件时，本轮可标记 DevTools smoke access blocked：端口服务无法开启、CLI 连接持续 timeout、项目无法在 DevTools 中打开、预览无法生成且没有 UI 替代路径、登录/真实 AppID/设备权限缺失导致目标 journey 无法执行。

blocked 记录至少包含：

- `blockedAt`：日期和时间。
- `branch`：`codex/iter-devtools-smoke-unblock`。
- `commit`：`git rev-parse --short HEAD`。
- `worktree`：`/tmp/street-tasks-iter-worktrees/devtools-smoke`。
- `devtoolsVersion`：DevTools 版本；无法打开时写“无法确认”。
- `baseLibVersion`：调试基础库版本；无法确认时写“无法确认”。
- `ideHttpPort`：例如 `9420`。
- `servicePortSetting`：开启 / 未开启 / 无法确认。
- `processEvidence`：进程是否存在、命令是否包含 `--ide-http-port`，只写摘要。
- `listenEvidence`：`lsof` / `nc` / `curl` 的脱敏结论。
- `cliCommand`：`open` 或 `preview`。
- `actualResult`：实际错误摘要，例如 connection refused、wait IDE port timeout。
- `attemptedFixes`：已尝试开启服务端口、退出重启 IDE、重新打开项目、逐端口检查等。
- `nextAction`：需要人工打开安全设置、重装/升级 DevTools、切换端口、换机器、补真实 AppID 或补设备。
- `manualJourneyImpact`：哪些 smoke journey 因此未执行。
- `evidenceLocation`：本地附件编号或外部安全位置，不写原始绝对路径。

示例摘要：

```text
blockedAt: 2026-06-14 10:30 CST
branch: codex/iter-devtools-smoke-unblock
commit: <short-sha>
worktree: /tmp/street-tasks-iter-worktrees/devtools-smoke
ideHttpPort: 9420
servicePortSetting: UI 显示已开启
processEvidence: DevTools 进程存在，命令包含 --ide-http-port 9420
listenEvidence: 9420 无监听，nc connection refused，curl connection refused
cliCommand: open
actualResult: CLI 20s timeout，未打开项目
attemptedFixes: 重新检查安全设置、退出重启 DevTools、重新打开当前 worktree
manualJourneyImpact: DevTools / 真机 smoke 未执行
nextAction: 由有本机 UI 权限的执行者重启 IDE 或换机验证服务端口
evidenceLocation: 本地附件 S-port-01，原始日志不提交
```

## 4. 端口恢复后的最小 Smoke 旅程

端口恢复或 UI 可操作后，优先跑最小闭环，不先扩展到完整回归。

- [ ] DevTools 编译和首屏。
  - 打开当前 worktree 项目并普通编译。
  - 通过标准：进入地图页，地图、marker、底部 tabBar 和列表入口可见；Console 没有阻断运行的首条红色错误。
  - 失败记录：首条错误、页面路径、是否白屏、是否仍有 `WAServiceMainContext timeout`。

- [ ] 地图到详情。
  - 打开地图列表或点击 marker，进入一条任务详情。
  - 通过标准：详情页展示同一任务标题、正文、状态、发布者信息、TrustInsight、信任动作和评论入口；不出现“任务不存在”。
  - 失败记录：列表任务标题、详情实际标题、post id 摘要和跳转方式。

- [ ] 发布状态和定位失败重试。
  - 进入发布页，游客态和登录态至少覆盖一种；点击使用当前位置并覆盖允许或拒绝中的一种。
  - 通过标准：定位块文案、底部主按钮、定位中 / 失败 / 重试状态随真实权限变化；失败不清空已填内容。
  - 失败记录：权限初始状态、点击步骤、toast / 文案和是否卡住 loading。

- [ ] 发布成功到详情。
  - 已登录且环境允许时，填写最小有效表单并提交。
  - 通过标准：只创建一条任务，成功后跳转新任务详情；返回地图后新任务可见。
  - 若没有真实登录、CloudBase 或 AppID，写 `blocked`，不要写 `passed`。

- [ ] 图片 smoke。
  - 选择 1 张图片，验证缩略图、删除和发布链路；无法发布时至少验证选择和过大图片失败提示。
  - 通过标准：图片状态不破坏表单；上传失败有提示；成功发布后详情可见图片或云端引用。
  - 失败记录：图片数量、大小档位、上传错误摘要和表单是否保留。

- [ ] 详情信任动作和评论入口。
  - 对 active 任务执行一次确认或过时；打开评论入口。
  - 通过标准：TrustInsight / 数字刷新，重复动作被阻止；评论入口在游客或登录态下给出正确引导。
  - 失败记录：动作前后数量、toast、评论弹窗或登录引导状态。

- [ ] 真机预览或真机调试。
  - CLI `preview` 成功或 UI 可生成二维码后，用真机打开。
  - 通过标准：地图、发布定位、键盘安全区、详情信任区在真机上不遮挡、不白屏。
  - 若 preview 无法生成，记录 preview blocker；DevTools 模拟器结果不能替代真机结论。

## 5. 证据脱敏注意事项

- [ ] 原始截图、录屏、二维码、控制台完整日志、Network 详情、云函数日志和数据库截图只放 ignored 本地附件目录或外部安全位置。
- [ ] 可提交文档只写脱敏摘要：角色用“用户 A / 游客态 / 管理员账号”，地点用“测试 POI / 默认中心附近”，云端资源用“fileID 已生成，原值本地留存”。
- [ ] 不提交真实 AppID、openId、unionId、头像 URL、昵称、手机号、精确经纬度、CloudBase 环境 ID、requestId、完整 `cloud://`、token、cookie 或本机绝对路径。
- [ ] CLI 和端口日志只摘录最小必要错误类型，例如 connection refused、wait IDE port timeout、端口未监听。
- [ ] 每次写入可提交报告前运行：

  ```bash
  git status --short --ignored
  rg --no-ignore -n -i "(api[_-]?key|secret|token|password|passwd|pwd|private[_-]?key|session|cookie|authorization|bearer|access[_-]?token|refresh[_-]?token|client[_-]?secret|appsecret|wx[0-9a-f]{16,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})" .
  ```

  期望：真实附件和 local 结果仍是 ignored；secret scan 没有新增真实敏感值。若命中的是清单里的规则说明，也要人工确认不是实际凭据。
