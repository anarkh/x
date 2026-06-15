# DevTools 服务端口受控恢复 QA 清单

日期：2026-06-14

范围：用于 `codex/iter-devtools-service-recovery` 分支在 `/tmp/street-tasks-iter-worktrees/devtools-recovery` 上执行 WeChat DevTools 服务端口受控恢复。本清单定义执行前确认、退出/重启风险、恢复命令、恢复后判断、blocked 记录、ready 后最小 smoke 和证据脱敏；它不是已完成的手测记录。

已知背景：M 组诊断到 DevTools-like 进程声明 `--ide-http-port 9420`，但 `9420` 没有监听，`curl` connection refused，CLI `open` 超时。N 组恢复的目标是先保留 blocked 证据，再以最小影响退出或重启 DevTools，重新打开当前项目，并用 `check-devtools-smoke-access` 判断入口是否 ready。

## 0. 恢复前检查

- [ ] 确认当前工作树、分支和提交。

  ```bash
  pwd
  git branch --show-current
  git rev-parse --short HEAD
  git status --short
  ```

  期望：工作目录为 `/tmp/street-tasks-iter-worktrees/devtools-recovery`，分支为 `codex/iter-devtools-service-recovery`；工作区只包含本轮预期文件，不包含脚本或业务代码改动。

- [ ] 跑基础 harness，确认不是仓库基础状态异常。

  ```bash
  bash harness/init.sh
  ```

  期望：JSON 检查和 harness 自检通过。若失败，先记录 baseline 异常，不继续把 DevTools 入口状态写成 ready。

- [ ] 记录恢复前 blocked 现状。

  ```bash
  node scripts/check-devtools-smoke-access.mjs \
    --project /tmp/street-tasks-iter-worktrees/devtools-recovery \
    --port 9420
  ```

  期望：如果仍是 M 组现象，报告应为 `status: blocked`，且摘要包含服务端口未监听或 `ide-http-port` 进程声明。只保存脱敏摘要，不提交完整原始日志。

- [ ] 确认 DevTools 进程、端口和项目归属。

  ```bash
  ps aux | rg -i "wechat|微信|devtools|ide-http-port"
  lsof -nP -iTCP:9420 -sTCP:LISTEN
  nc -vz 127.0.0.1 9420
  curl -sS --max-time 3 http://127.0.0.1:9420/ || true
  ```

  期望：能判断是否存在多个 DevTools 实例、多个 `--ide-http-port` 或不同 worktree 项目。不要把其他 worktree 的可用端口误记为当前分支 ready。

- [ ] 确认退出 DevTools 的影响已被接受。
  - 询问或确认当前没有其他 agent 正在依赖同一个 DevTools 实例调试。
  - 保存当前 DevTools 控制台关键 blocked 摘要或截图编号。
  - 记录 DevTools UI 中“设置 -> 安全设置 -> 服务端口”的状态：开启 / 未开启 / 无法确认。
  - 若 DevTools 里有未保存配置、正在上传、预览二维码、真机调试或云开发面板操作，先停止恢复并记录风险。

## 1. 退出 / 重启风险说明

- 正常退出或 CLI `quit` 会关闭 DevTools IDE，可能中断模拟器、真机调试、预览二维码、当前控制台日志和其他已打开项目。
- 退出后重新 `open` 可能刷新 DevTools 内部缓存、重新加载基础库或重新触发登录 / AppID / 服务端口设置；这类变化要记录为环境变化，而不是产品行为变化。
- 不默认执行强制杀进程、清缓存、删除配置或改端口。只有正常退出和 CLI `quit` 都失败，并且执行者明确接受影响时，才升级到人工处理。
- 如果恢复动作让状态更差，例如 DevTools 无法启动、服务端口设置消失、项目路径打开错误，立即停止后续 smoke，把本轮写成 `blocked`，并记录最后一个成功观察点和失败命令。

## 2. 恢复命令

先准备变量，避免误敲到其他项目：

```bash
PROJECT=/tmp/street-tasks-iter-worktrees/devtools-recovery
PORT=9420
DEVTOOLS_CLI=${WECHAT_DEVTOOLS_CLI:-/Applications/wechatwebdevtools.app/Contents/MacOS/cli}
```

- [ ] 确认 CLI 可用。

  ```bash
  "$DEVTOOLS_CLI" --help
  "$DEVTOOLS_CLI" quit --help
  "$DEVTOOLS_CLI" open --help
  ```

  期望：能看到 `quit` 和 `open` 命令帮助。若 CLI 路径不同，只在本机 shell 变量中调整，不写入仓库。

- [ ] 首选从 DevTools UI 正常退出。
  - 菜单退出整个微信开发者工具，而不是只关闭模拟器窗口。
  - 等待 10 到 30 秒后检查旧进程是否退出。

  ```bash
  ps aux | rg -i "wechat|微信|devtools|ide-http-port"
  ```

- [ ] 如果 UI 无法正常退出，执行 CLI `quit`。

  ```bash
  "$DEVTOOLS_CLI" quit --port "$PORT"
  ```

  期望：IDE 退出或 CLI 返回可判断结果。若返回 timeout、connection refused 或无响应，记录命令、端口、耗时和摘要，不要继续叠加强制动作。

- [ ] 重新打开当前项目。

  ```bash
  "$DEVTOOLS_CLI" open --project "$PROJECT" --port "$PORT"
  ```

  期望：DevTools 打开当前 project，并启动或连接 `PORT=9420` 的服务端口。若 `open` 超时，继续用下一步诊断脚本记录，不把项目 UI 短暂闪现写成 ready。

- [ ] 如果需要由脚本托管 `open` 超时和脱敏输出，执行：

  ```bash
  node scripts/check-devtools-smoke-access.mjs \
    --project "$PROJECT" \
    --port "$PORT" \
    --attempt-open \
    --timeout-ms 20000
  ```

  期望：脚本输出 `status: ready` 或明确 blocked 原因。该脚本不会退出 DevTools、清缓存、写项目文件或启动 preview。

## 3. 恢复后判断

- [ ] 执行无副作用 ready 检查。

  ```bash
  node scripts/check-devtools-smoke-access.mjs \
    --project /tmp/street-tasks-iter-worktrees/devtools-recovery \
    --port 9420
  ```

- [ ] 判定为 `ready` 的最低条件：
  - `check-devtools-smoke-access` 输出 `status: ready`。
  - `9420` 不再是 connection refused；`lsof` 或脚本能确认端口监听。
  - DevTools 打开的是 `/tmp/street-tasks-iter-worktrees/devtools-recovery`，不是其他 worktree。
  - `git branch --show-current` 仍是 `codex/iter-devtools-service-recovery`。

- [ ] 判定为 `blocked` 的条件：
  - `9420` 仍无监听或仍 connection refused。
  - CLI `open` / `attempt-open` 继续 timeout。
  - DevTools UI 无法确认服务端口开启。
  - DevTools 打开了错误项目、错误端口或多个实例状态无法区分。
  - 项目能手动打开但无法编译进入模拟器，且原因属于工具入口或环境权限。

- [ ] ready 只表示 DevTools smoke access 恢复，不代表任何产品旅程已通过。只有执行第 5 节真实操作并记录证据后，才能给用户旅程写 `passed`、`failed` 或 `blocked`。

## 4. 如果仍 blocked：记录字段

blocked 记录至少包含：

- `blockedAt`：日期和时间，带时区。
- `branch`：`codex/iter-devtools-service-recovery`。
- `commit`：`git rev-parse --short HEAD`。
- `worktree`：`/tmp/street-tasks-iter-worktrees/devtools-recovery`。
- `devtoolsVersion`：DevTools 版本；无法打开时写“无法确认”。
- `baseLibVersion`：调试基础库版本；无法确认时写“无法确认”。
- `ideHttpPort`：`9420` 或实际检查端口。
- `servicePortSetting`：开启 / 未开启 / 无法确认。
- `processEvidence`：DevTools-like 进程是否存在、是否声明 `--ide-http-port`，只写摘要。
- `listenEvidence`：`lsof` / `nc` / `curl` / 诊断脚本的脱敏结论。
- `recoveryAttempted`：UI 正常退出、CLI `quit`、CLI `open`、`attempt-open` 中实际执行了哪些。
- `actualResult`：connection refused、wait IDE port timeout、打开错误项目、无法确认服务端口等摘要。
- `rollbackOrStopPoint`：在哪一步停止，是否保留旧 blocked 状态，是否需要人工 UI 权限。
- `manualJourneyImpact`：哪些最小 smoke 旅程因此未执行。
- `nextAction`：人工开启服务端口、换端口、换机器、升级 / 重装 DevTools、补真实 AppID / 登录态或改用 UI 手测。
- `evidenceLocation`：本地附件编号或安全外部位置，不写原始绝对路径。

示例摘要：

```text
blockedAt: 2026-06-14 11:20 CST
branch: codex/iter-devtools-service-recovery
commit: <short-sha>
worktree: /tmp/street-tasks-iter-worktrees/devtools-recovery
ideHttpPort: 9420
servicePortSetting: UI 显示已开启
processEvidence: DevTools-like 进程存在，命令声明 --ide-http-port 9420
listenEvidence: 9420 无监听，nc/curl 为 connection refused
recoveryAttempted: UI 正常退出未成功；CLI quit 返回 timeout；attempt-open 20s timeout
actualResult: DevTools 服务端口仍不可连接，未能确认当前项目 ready
rollbackOrStopPoint: 未强制杀进程，保持 blocked，等待有 UI 权限执行者处理
manualJourneyImpact: DevTools 编译、地图首屏、发布准备度、详情信任区和真机预览均未执行
nextAction: 人工重新开启服务端口或换机验证，再重跑 check-devtools-smoke-access
evidenceLocation: 本地附件 S-recovery-01，原始日志不提交
```

## 5. 如果 ready：最小 smoke 旅程

端口和项目 ready 后，先跑最小闭环；不要直接扩大到完整回归。

- [ ] DevTools 编译和地图首屏。
  - 打开当前项目并普通编译。
  - 通过标准：进入 `pages/map/map`，地图、marker、底部 tabBar 和列表入口可见；Console 没有阻断运行的首条红色错误。
  - 失败记录：首条错误摘要、页面路径、是否白屏、是否仍有 `WAServiceMainContext timeout`。

- [ ] 地图列表或 marker 到详情。
  - 从列表或 marker 进入一条任务详情。
  - 通过标准：详情页展示同一任务标题、正文、状态、发布者信息、TrustInsight、信任动作和评论入口；不出现“任务不存在”。
  - 失败记录：入口方式、任务别名、post id 摘要和详情页实际状态。

- [ ] 发布准备度和定位恢复路径。
  - 进入发布页，至少覆盖游客态或登录态一种；点击当前位置确认，覆盖允许、拒绝或失败重试中的一种真实分支。
  - 通过标准：准备度文案、底部主按钮、定位中 / 失败 / 重试状态随真实权限变化；失败不清空已填内容。
  - 失败记录：权限初始状态、点击步骤、toast / 文案、是否卡住 loading。

- [ ] 详情信任动作和评论入口。
  - 对 active 任务执行一次确认或过时，并打开评论入口。
  - 通过标准：TrustInsight / 数字刷新，重复动作被阻止；评论入口在游客或登录态下给出正确引导。
  - 失败记录：动作前后数量、toast、评论弹窗或登录引导状态。

- [ ] 发布成功到详情。
  - 已登录且环境允许时，填写最小有效表单并提交。
  - 通过标准：只创建一条任务，成功后跳转新任务详情；返回地图后新任务可见。
  - 若缺真实登录、AppID、CloudBase 或 Storage，写 `blocked`，不要写 `passed`。

- [ ] 图片或上传失败最小覆盖。
  - 选择 1 张图片；无法发布时至少验证缩略图、删除和上传失败提示。
  - 通过标准：图片状态不破坏表单；上传失败有提示；成功发布后详情可见图片或云端引用。
  - 失败记录：图片数量、大小档位、上传错误摘要和表单是否保留。

- [ ] 真机预览或真机调试。
  - CLI `preview` 成功或 UI 可生成二维码后，用真机打开。
  - 通过标准：地图、发布定位、键盘安全区、详情信任区在真机上不遮挡、不白屏。
  - 若 preview 无法生成，记录 preview blocker；DevTools 模拟器不能替代真机结论。

## 6. 证据脱敏

- [ ] 原始截图、录屏、二维码、完整 Console、Network、云函数日志、数据库截图和 `check-devtools-smoke-access --attempt-open` 原始输出只放 ignored 本地附件目录或外部安全位置。
- [ ] 可提交文档只写脱敏摘要：角色用“用户 A / 游客态 / 管理员账号”，地点用“测试 POI / 默认中心附近”，云端资源用“fileID 已生成，原值本地留存”。
- [ ] 不提交真实 AppID、openId、unionId、头像 URL、昵称、手机号、精确经纬度、CloudBase 环境 ID、requestId、完整 `cloud://`、token、cookie、二维码或个人设备标识。
- [ ] CLI 和端口日志只摘录最小必要错误类型，例如 connection refused、wait IDE port timeout、端口未监听、打开错误项目；不要粘贴完整堆栈、header、环境变量或本机用户路径。
- [ ] 本清单允许写当前测试 worktree 路径；其他本机路径一律泛化为 `<local-path>`、`<devtools-cli>` 或本地附件编号。
- [ ] 写入任何可提交报告前运行并人工复核：

  ```bash
  git status --short --ignored
  git diff -- harness '*.md' '*.json'
  rg --no-ignore -n -i "(api[_-]?key|secret|token|password|passwd|pwd|private[_-]?key|session|cookie|authorization|bearer|access[_-]?token|refresh[_-]?token|client[_-]?secret|appsecret|wx[0-9a-f]{16,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})" .
  ```

  期望：真实附件和 local 结果仍是 ignored；secret scan 没有新增真实敏感值。若命中的是清单里的规则说明，也要人工确认不是实际凭据。
