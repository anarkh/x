# AA DevTools Service Port Deep Forensics Checklist

日期：2026-06-17

范围：用于 AA 组 QA / 设计 agent 在 DevTools service port `9420` 仍未 ready 时补深层取证口径。本文档只定义检查层、证据边界、blocked 状态和人工确认项；不执行 GUI 恢复，不修改 DevTools 设置，不修改用户数据，不创建真实 evidence 文件。

已知背景：Z 组已把 app-level quit / reopen 做成显式 opt-in，并证明一次运行中 `DevTools app quit: completed`，但 `DevTools open` 仍超时，service port 仍是 `connect_refused` / smoke `blocked`。因此 AA 取证必须区分“app 退出动作完成”和“service port listener 恢复”，不能把前者写成后者。

## 0. 全局边界

- [ ] 本清单只允许只读观察：端口探测、CLI help / version、app bundle 元数据、user data dir 摘要、最近日志摘要、进程树摘要、`lsof` / `netstat` 摘要、人工 UI 设置确认项、真机替代方案。
- [ ] 不执行 `quit`、`open --project`、`preview`、`upload`、清缓存、杀进程、重装 DevTools、修改服务端口、修改用户配置、修改本地 storage 或 CloudBase 数据。
- [ ] 不提交原始日志、完整命令输出、截图原图、真实 local evidence、用户目录、真实用户数据或完整本机路径。
- [ ] 自动 readiness、静态 guard、dry-run、blocked draft、app quit 动作完成都不是 UI passed，也不是 service port recovered。
- [ ] 任何 blocked 记录都必须写清 `blockedCode`、只读 evidence 摘要、影响范围和下一步人工确认项。

## 1. Evidence 共同规则

所有检查层只允许写“可判定但不可反推出用户隐私”的摘要。

Allowed evidence：

- [ ] 状态：`ready`、`blocked`、`unknown`、`not_run`。
- [ ] 计数：DevTools-like 进程数量、listener 数量、匹配日志行数、最近错误类型数量。
- [ ] 脱敏字段：`<repo-worktree>`、`<system-devtools-app>`、`<devtools-user-data-dir>`、`<local-log-file>`、`<pid-redacted>`、`<port>`。
- [ ] 最小错误分类：`LISTEN present`、`no LISTEN`、`ECONNREFUSED`、`timeout`、`permission denied`、`ambiguous owner`。
- [ ] 版本摘要：DevTools short version / build version / CLI help available 状态；无法确认时写原因。
- [ ] 人工 UI 确认结论：开关已开 / 未开 / 未确认，端口号是否为 `9420` 或指定端口。

Forbidden evidence：

- [ ] 完整本机路径，包括真实用户目录、真实项目绝对路径、DevTools user data 子路径、日志文件绝对路径。
- [ ] cookie、token、Authorization、session、refresh token、access token、client secret、AppSecret、私有 AppID。
- [ ] 完整进程命令行、完整环境变量、完整 CLI stderr、完整 HTTP header / body、完整 Console / Network / cloud logs。
- [ ] 真实用户数据：openid、unionid、手机号、微信号、昵称、头像 URL、联系人、群名、评论正文、图片原始 URL、精确经纬度。
- [ ] 可识别设备信息：设备序列号、真实 macOS 用户名、完整机器名、个人证书路径。

## 2. Blocked 状态码

只使用以下 blocked code，避免同一类阻塞被写成多个口径。

- `declared_without_listener`：只读进程摘要显示 DevTools 或 CLI 声明了目标 service port，但 `lsof` / `netstat` 没有对应 listener。
- `connect_refused`：目标端口无可连接服务，`nc` / `curl` / smoke access 得到 connection refused。
- `open_timeout`：显式 opt-in 的 CLI open / app reopen 尝试已经发生但等待端口超时；只能证明 open 未能使 listener ready。
- `service_port_toggle_unconfirmed`：无法从人工 UI 或可信设置摘要确认 DevTools 的 Service Port 开关是否已开启。
- `manual_ui_needed`：只读证据不足以继续，必须由用户在 DevTools UI 中确认设置、项目、版本、账号或设备状态。

Blocked 记录最小模板：

```json
{
  "layer": "read-only-port",
  "status": "blocked",
  "blockedCode": "connect_refused",
  "evidenceSummary": "Target port has no listener; IPv4 probe returned connection refused.",
  "impact": "DevTools smoke, share payload inspection, timeline menu, and manual UI journeys were not executed.",
  "nextHumanConfirmation": [
    "Confirm DevTools Settings > Security Settings > Service Port is enabled.",
    "Confirm the displayed service port is 9420 or provide the actual port."
  ],
  "notClaimed": [
    "readiness/static guard equals UI passed",
    "app quit completed equals service port recovered",
    "DevTools smoke passed",
    "real-device journey passed"
  ]
}
```

## 3. QA 检查层

### 3.1 只读端口层

目的：确认目标 service port 是否存在 listener，并区分 refused、timeout、占用和归属不明。

Suggested read-only checks：

```bash
npm run inspect:devtools-port -- --port 9420
node scripts/inspect-devtools-port-state.mjs --port 9420
nc -vz 127.0.0.1 9420
curl -sS --max-time 3 http://127.0.0.1:9420/ > <local-temp-output>
```

Allowed evidence：

- [ ] `port=9420`，`listener=yes/no/unknown`。
- [ ] IPv4 / IPv6 连接状态摘要：`connected`、`connect_refused`、`timeout`、`permission_denied`。
- [ ] HTTP 探针最小分类：`non-business response`、`404`、`auth-like response`、`empty`、`refused`、`timeout`。
- [ ] 归属摘要：`DevTools-like owner`、`non-DevTools owner`、`ambiguous owner`、`no owner`。

Forbidden evidence：

- [ ] 完整 HTTP response、headers、cookies、body、stack trace。
- [ ] 完整 `curl -v` 输出或完整本机临时文件路径。
- [ ] 其他本机服务的进程名、完整路径或私有参数。

Blocked mapping：

- [ ] 有声明无 listener：`declared_without_listener`。
- [ ] 探针明确 refused：`connect_refused`。
- [ ] 探针超时且无法确认 listener：`manual_ui_needed` 或 `service_port_toggle_unconfirmed`。

### 3.2 CLI help / version 层

目的：确认 DevTools CLI 存在、可读取帮助或版本信息，但不调用有 GUI 副作用的子命令。

Suggested read-only checks：

```bash
<devtools-cli> --help
<devtools-cli> --version
```

Allowed evidence：

- [ ] `cliHelp=available/unavailable`。
- [ ] `cliVersion=<version-or-unconfirmed>`。
- [ ] CLI 路径摘要：`<system-devtools-cli>`、`<local-devtools-cli>`、`not_found`。
- [ ] help 中是否列出 service-port 相关参数的摘要。

Forbidden evidence：

- [ ] 完整 CLI 路径、完整 help 输出、完整 stderr。
- [ ] 用户目录、安装目录下的个人路径片段。
- [ ] 任何 `open`、`quit`、`preview`、`upload` 结果被混入本层证据。

Blocked mapping：

- [ ] CLI 不存在或 help 不可读：`manual_ui_needed`。
- [ ] CLI open 曾超时只能写到恢复尝试层：`open_timeout`，不能写成本层 passed 或 recovered。

### 3.3 App bundle 层

目的：确认 WeChat DevTools app bundle、bundle id 和版本摘要，支持判断是否在检查同一个工具实例。

Suggested read-only checks：

```bash
defaults read <devtools-app>/Contents/Info CFBundleIdentifier
defaults read <devtools-app>/Contents/Info CFBundleShortVersionString
defaults read <devtools-app>/Contents/Info CFBundleVersion
mdls -name kMDItemVersion <devtools-app>
```

Allowed evidence：

- [ ] `bundleId=<bundle-id-or-unconfirmed>`。
- [ ] `shortVersion=<version-or-unconfirmed>`，`bundleVersion=<version-or-unconfirmed>`。
- [ ] app 位置分类：`system Applications`、`user Applications`、`custom location`、`not found`。
- [ ] 多 app bundle 计数和是否可能版本冲突。

Forbidden evidence：

- [ ] 完整 app 路径，尤其是用户目录下的安装路径。
- [ ] 完整 `mdls` 输出、签名详情、个人证书信息。
- [ ] 把 bundle id 读取成功写成 service port ready。

Blocked mapping：

- [ ] app bundle 找不到或多个 app bundle 归属不明：`manual_ui_needed`。
- [ ] bundle 存在但端口仍无 listener：保持端口层 `connect_refused` 或 `declared_without_listener`。

### 3.4 User data dir 层

目的：确认 DevTools 是否可能使用某个 user data dir / profile，并只记录其状态摘要，不读取真实用户数据。

Suggested read-only checks：

```bash
find <candidate-devtools-user-data-root> -maxdepth 2 -type d
find <candidate-devtools-user-data-root> -maxdepth 2 -type f -mtime -2
```

Allowed evidence：

- [ ] `userDataDirStatus=present/missing/unconfirmed`。
- [ ] 最近变更文件计数、目录层级计数、profile 数量摘要。
- [ ] 是否存在 service-port-like setting 的脱敏状态：`enabled`、`disabled`、`not_found`、`unreadable`、`unconfirmed`。
- [ ] 权限摘要：`readable`、`permission_denied`、`not_checked`。

Forbidden evidence：

- [ ] 完整 user data dir 路径。
- [ ] 配置文件原文、数据库内容、local storage、cookie、session、账号、项目历史、最近打开项目列表。
- [ ] 修改、删除、复制或压缩 user data dir。

Blocked mapping：

- [ ] 无法确认 service port 开关：`service_port_toggle_unconfirmed`。
- [ ] 需要 UI 中手动确认开关：`manual_ui_needed`。

### 3.5 最近日志层

目的：只读查看最近 DevTools / CLI 相关日志，提取错误类型和计数，定位 service port 为什么未 ready。

Suggested read-only checks：

```bash
find <candidate-log-root> -type f -mtime -2
rg -i "service port|ide-http-port|listen|EADDRINUSE|ECONNREFUSED|timeout|open" <candidate-log-files>
```

Allowed evidence：

- [ ] 最近日志文件数量、时间范围、匹配行数。
- [ ] 错误类型计数：`EADDRINUSE`、`ECONNREFUSED`、`timeout`、`permission denied`、`service port disabled`。
- [ ] 只摘录极短、已脱敏的错误关键词，不粘贴上下文。
- [ ] 日志来源分类：`DevTools app log`、`CLI log`、`system log`、`unconfirmed`。

Forbidden evidence：

- [ ] 完整日志路径、完整日志片段、完整 stack trace、完整 request / response。
- [ ] 账号、项目历史、插件、cookie、token、用户输入、真实 post 内容。
- [ ] 把日志中出现 `open` 或 `quit` 当成恢复成功，除非端口层也有 listener evidence。

Blocked mapping：

- [ ] 日志提示服务端口关闭但 UI 未确认：`service_port_toggle_unconfirmed`。
- [ ] 日志只有 open timeout：`open_timeout`。
- [ ] 日志不足以判断：`manual_ui_needed`。

### 3.6 进程树层

目的：确认是否有 DevTools-like 进程、是否多实例、是否有端口声明和父子进程异常。

Suggested read-only checks：

```bash
ps -axo pid,ppid,comm
pgrep -fl "wechat|devtools|webplus|ide-http-port"
```

Allowed evidence：

- [ ] DevTools-like 进程计数。
- [ ] 父子层级摘要：`single tree`、`multiple trees`、`orphan-like child`、`unknown`。
- [ ] 是否出现 `ide-http-port` 声明及端口号列表。
- [ ] 多实例摘要：app bundle 数量、声明端口数量、疑似项目数量。

Forbidden evidence：

- [ ] 完整进程命令行、完整参数、环境变量、真实项目路径、真实用户目录。
- [ ] 其他用户或其他项目的进程细节。
- [ ] 用进程存在替代 listener evidence。

Blocked mapping：

- [ ] 进程声明 `9420` 但无 listener：`declared_without_listener`。
- [ ] 多实例归属不明：`manual_ui_needed`。
- [ ] 无 DevTools-like 进程且无法确认 UI 状态：`manual_ui_needed`。

### 3.7 `lsof` / `netstat` 层

目的：从系统 socket 视角确认端口监听、连接状态和占用归属。

Suggested read-only checks：

```bash
lsof -nP -iTCP:9420
lsof -nP -iTCP:9420 -sTCP:LISTEN
netstat -anv | rg "9420|LISTEN"
```

Allowed evidence：

- [ ] listener 行数：`0`、`1`、`>1`。
- [ ] socket 状态摘要：`LISTEN`、`ESTABLISHED`、`TIME_WAIT`、`none`。
- [ ] 进程归属摘要：`DevTools-like`、`non-DevTools`、`unknown`。
- [ ] 如果端口被其他进程占用，只写类别和影响，不写完整进程名或路径。

Forbidden evidence：

- [ ] 完整 `lsof` 行、完整 PID / user / command / path。
- [ ] 其他端口的大量 netstat 输出。
- [ ] 把 `TIME_WAIT` 或历史连接写成 service port ready。

Blocked mapping：

- [ ] `LISTEN=0` 且连接 refused：`connect_refused`。
- [ ] 有端口声明但 `LISTEN=0`：`declared_without_listener`。
- [ ] listener 归属不是 DevTools 或归属不明：`manual_ui_needed`。

### 3.8 DevTools settings UI 人工确认层

目的：只列出需要用户在 WeChat DevTools UI 中确认的设置；AA 不代替用户点击、不改设置。

需要请用户确认：

- [ ] Settings / Security Settings 中 Service Port 是否开启。
- [ ] UI 显示的 service port 是否为 `9420`；如果不是，请用户提供实际端口号。
- [ ] 当前打开项目是否是目标 worktree；如果 UI 显示多个项目，请用户确认当前项目归属。
- [ ] DevTools 版本、基础库版本、是否登录、是否存在升级提示或权限弹窗。
- [ ] 是否同时开了多个 DevTools app / 项目窗口 / 账号环境。
- [ ] 如果用户愿意人工介入，是否允许仅在 UI 中切换 Service Port 开关并重启 DevTools；默认答案必须当作未授权。

Allowed evidence：

- [ ] 用户确认的开关状态：`enabled`、`disabled`、`unconfirmed`。
- [ ] 用户确认的端口号：`9420`、`other:<port>`、`unconfirmed`。
- [ ] 用户确认的项目归属：`target project`、`different project`、`multiple projects`、`unconfirmed`。
- [ ] 手工截图的脱敏摘要或附件编号，不提交原图。

Forbidden evidence：

- [ ] 用户设置页完整截图、真实账号、头像、AppID、项目历史、完整项目路径。
- [ ] 未经用户确认就写“Service Port 已开启”。
- [ ] 把 UI 开关已开启写成 service port ready；还必须有 listener / smoke evidence。

Blocked mapping：

- [ ] UI 开关无法确认：`service_port_toggle_unconfirmed`。
- [ ] 用户需要打开设置页确认：`manual_ui_needed`。
- [ ] UI 显示开启但端口 refused：保留端口层 `connect_refused`，并记录需要人工重启或换端口。

### 3.9 真机替代方案层

目的：当 DevTools service port 持续 blocked 时，允许改走真机 / UI 手动证据路线，但要明确它不恢复 CLI service port。

Allowed evidence：

- [ ] 真机设备类型摘要：`iOS`、`Android`、`WeChat version known/unknown`、`screen width bucket`。
- [ ] 手动打开小程序、分享菜单、朋友圈入口、落地页首屏、confirm/comment 转化的脱敏截图 / 录屏摘要。
- [ ] payload 可检查性：`inspectable`、`not inspectable on device`、`checked by DevTools hook later`。
- [ ] 若真机通过，写成 real-device journey evidence，不写成 service port recovered。

Forbidden evidence：

- [ ] 真机联系人、聊天对象、群名、头像、昵称、手机号、微信号。
- [ ] 二维码原图、完整分享卡片上下文、完整视频原片、完整系统日志。
- [ ] 用真机 passed 覆盖 DevTools service port blocked 结论。

Blocked mapping：

- [ ] 无真机、无法登录、无法扫码、无法触发分享菜单：`manual_ui_needed`。
- [ ] 真机可以测 UI 但 payload 不可 inspect：对应 journey 可 `blocked` 或带未验证字段，不得写 payload passed。

## 4. 评审红线

- [ ] Readiness passed / static guard passed 只能说明静态结构和 no-side-effect 约束通过；不能写成 UI passed、DevTools smoke passed、share payload passed 或 real-device passed。
- [ ] `DevTools app quit: completed` 只能说明 app-level quit 动作完成；不能写成 service port recovered。
- [ ] CLI open timeout 后，即使 app 进程出现，也只能写 `open_timeout` 或后续端口状态；没有 listener 不能写 ready。
- [ ] 端口 `LISTEN` 只能说明 service port 入口存在；不能替代项目打开、模拟器首屏、系统分享菜单、朋友圈菜单、payload、CloudBase attribution 或真机布局。
- [ ] Blocked draft / dry-run / local schema checker passed 不能替代真实 UI evidence。
- [ ] 任何证据若包含完整本机路径、cookie / token、完整进程命令行或真实用户数据，该层证据应退回重采。
- [ ] 不允许为了拿分把 `not_run` 写成 `blocked`，也不允许把产品缺陷写成环境 blocked。

## 5. 人工介入请求模板

如果下一步需要用户介入，请只请求确认 UI 设置，不要求用户执行破坏性恢复动作。

```text
请在 WeChat DevTools UI 中帮忙确认以下设置，不需要清缓存、重装、改 AppID 或提交任何配置：
1. Settings > Security Settings > Service Port 是否开启？
2. 如果已开启，UI 显示的端口号是否为 9420？如果不是，请告知端口号。
3. 当前打开的项目是否是本轮目标 worktree？
4. 是否同时打开了多个 DevTools 窗口或多个项目？
5. DevTools 是否有升级、登录、权限或安全弹窗阻止 service port？
6. 是否愿意在你确认后，由你手动重启 DevTools 或切换 Service Port 开关？未确认前我们不会执行任何恢复动作。
```

## 6. 汇报口径

Status 应使用以下表达之一：

- `Deep forensics checklist added; no GUI side effects run.`
- `Blocked at <blockedCode>; manual UI confirmation needed.`
- `Port listener ready, but DevTools UI / real-device evidence still not passed.`
- `Real-device alternative evidence collected, but service port remains blocked.`

Files changed 只能列：

- `harness/devtools-port-deep-forensics-checklist.md`

Verification 至少包含：

- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check`

Top risks 至少提醒：

- [ ] 9420 listener 仍可能缺失，导致 DevTools smoke 和 share payload inspect 继续 blocked。
- [ ] 人工 UI 开关状态未确认前，不应继续假设 Service Port 已开启。
- [ ] 真机可以补用户旅程证据，但不能证明 DevTools service port recovered。
