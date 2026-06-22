# AA 组 DevTools Service Port 深层取证产品 Brief

日期：2026-06-17

分支：`codex/iter-devtools-port-deep-forensics`

工作目录：`/tmp/street-tasks-iter-worktrees/devtools-port-deep-forensics`

角色：AA 组产品 agent

## AA 目标

AA 轮的目标不是继续尝试恢复命令，而是把问题从“恢复命令失败”推进到“知道为什么 WeChat DevTools 声明了 `--ide-http-port 9420`，但本机没有可连接 listener”。

Z 组已经新增显式 opt-in `--app-quit-reopen`，实际运行后 app quit completed，但 CLI open 仍然 timed out，输出停在 `IDE may already started at port 9420, trying to connect`。恢复后状态仍是 9420 `ECONNREFUSED` / smoke `blocked`，所以当前不能写真实 DevTools、系统分享、朋友圈、单页模式、CloudBase attribution 或真机 journey passed。

AA 轮要定义后续只读深层取证应补齐哪些证据层，让下一轮能够判断 blocker 更像是用户设置未启用、陈旧 daemon/helper、DevTools 工具版本 bug、账号/UI 设置阻塞、端口/权限问题，还是其他环境状态。

## 当前已知事实

- DevTools CLI 可执行文件存在，前序诊断可调用到 CLI。
- DevTools-like 进程曾声明 `--ide-http-port 9420`。
- `127.0.0.1:9420` 和 `::1:9420` 仍拒绝连接，没有可用 smoke access。
- `--app-quit-reopen` 完成 app-level quit 后，CLI open 仍 timeout，说明单纯重启 app 没有让 service port 进入 ready。
- 当前 evidence 缺口仍是环境入口 blocker，而不是产品 journey 已经失败或通过。

## 需要补齐的只读证据层

### 1. Service port 开关和用户配置

目标：判断 DevTools UI 中的服务端口能力是否被禁用、未持久化、被策略覆盖，或当前用户配置不可读。

建议收集摘要：

- 是否能在只读文件层看到 service port 相关配置项、端口号、启用状态或最近变更时间。
- 是否存在多个配置来源互相覆盖，例如全局设置、项目设置、用户目录设置、workspace 设置。
- 配置中声明的端口是否与进程参数 `--ide-http-port 9420` 一致。
- 如果无法读取或定位配置，只记录 `service_port_config_unknown`，不要猜测 UI 已开启。

输出应脱敏，只写键名、布尔状态、端口号和文件类别；不要提交完整用户配置文件。

### 2. DevTools 用户数据目录

目标：判断 CLI open 是否连到了陈旧 user-data、错误 profile、损坏 profile，或与当前 App bundle 不匹配的数据目录。

建议收集摘要：

- DevTools user-data 根目录候选路径是否存在。
- 当前 CLI/App 进程使用的 user-data 目录路径摘要和修改时间。
- 是否存在多个版本或多个 profile 目录，且最近活跃目录与当前进程不一致。
- user-data 中是否有可脱敏的 service port、workspace、last session、crash recovery 线索。

禁止提交完整路径树、账号信息、缓存内容、storage、cookies、CloudBase 标识或项目历史。

### 3. 日志摘要

目标：确认 DevTools 或 CLI 是否明确记录了 service port 启动失败、端口绑定失败、权限失败、helper crash、profile lock、账号/安全设置阻塞等原因。

建议收集摘要：

- 只读取最近一次 app quit/reopen 前后的日志窗口。
- 抽取时间戳、组件名、错误类别、端口号、退出码或异常类型。
- 重点检索 `ide-http-port`、`service port`、`listen`、`EADDRINUSE`、`EACCES`、`ECONNREFUSED`、`timeout`、`profile`、`lock`、`daemon`、`helper`、`crash`。
- 输出最多保留短错误片段和计数，不提交原始日志文件。

日志若包含用户账号、项目路径、token、request id、完整 file id 或真实设备信息，必须只写脱敏摘要。

### 4. 进程树、daemon 和 helper

目标：判断主 app quit 后是否仍有 daemon/helper/nwjs/node 子进程存活，导致 CLI 误以为 IDE 已启动，但服务端口实际没有起来。

建议收集摘要：

- DevTools 主进程、CLI 进程、helper、daemon、renderer、node/nwjs 进程的父子关系。
- 哪些进程声明 `--ide-http-port 9420`，哪些没有。
- app quit completed 后是否仍存在孤儿 helper 或 daemon。
- 进程启动时间是否早于本轮恢复命令，判断是否可能是 stale process。

只读取进程信息，不 kill、不 attach debugger、不采样内存、不转储命令行中的敏感参数。

### 5. 锁文件和 session 标记

目标：判断 CLI open timeout 是否由 profile lock、single-instance lock、workspace lock 或 crash recovery 状态导致。

建议收集摘要：

- user-data 或 profile 目录下是否存在 lock、singleton、socket、pid、session restore、crash marker 类文件。
- lock 文件修改时间是否早于 app quit/reopen，是否指向已不存在或仍存在的 PID。
- 是否有多个 worktree/session 同时竞争同一 DevTools profile。

只记录文件类别、时间关系和 PID 是否存活，不删除 lock 文件、不 touch 文件、不修改 session 状态。

### 6. 实际 HTTP endpoint 探测

目标：区分“端口完全没 listener”和“端口有 listener 但 endpoint 不匹配、返回非预期、需要认证或卡住”。

建议收集摘要：

- `127.0.0.1` 与 `::1` 的 TCP 连接状态。
- 如果有 listener，记录最小 HTTP 结果：状态码、响应头关键字段、是否超时、是否非 DevTools 服务。
- 探测常见只读 endpoint 时要有短超时，不能触发 open、compile、preview 或 project mutation。
- 区分 `connection_refused`、`connect_timeout`、`http_timeout`、`unexpected_http_response`、`ready_like_response`。

当前已知状态是 `connection_refused`，下一轮只有在 listener 出现后才应进入 endpoint 细分。

### 7. 端口占用、防火墙和权限

目标：判断 9420 是否被其他进程占用、被系统策略拦截，或 DevTools 没有权限绑定本机端口。

建议收集摘要：

- 9420 是否存在 LISTEN 进程；若存在，进程是否为 WeChat DevTools。
- 是否存在短暂 bind 后退出的日志迹象。
- 是否存在防火墙、网络过滤、企业安全软件或 macOS 权限提示相关线索。
- 是否有 `EADDRINUSE`、`EACCES`、sandbox、quarantine、codesign、notarization 或 helper permission 错误摘要。

不要修改防火墙、隐私权限、系统设置或安全软件配置；只给出下一步人工排查建议。

## 本轮不做什么

- 不 kill DevTools、helper、daemon、node、nwjs 或其他用户进程。
- 不改 WeChat DevTools 设置，不自动启用或关闭 service port。
- 不删除、不移动、不清空 user-data、profile、缓存、lock、session、storage 或登录态。
- 不运行 open/preview/compile/smoke/recovery 这类会改变 DevTools 状态的动作。
- 不提交真实日志、完整进程列表、完整用户路径、截图、录屏、账号信息、CloudBase 标识或本地 result JSON。
- 不把深层取证写成 DevTools ready、UI smoke passed、真机 passed 或产品 journey passed。

## 开发最小建议

后续如果要增强 inspect 脚本，建议只增加更具体的诊断分类和脱敏摘要，不把恢复动作塞进默认检查。

优先输出这些稳定分类：

- `stale_daemon_declared_without_listener`：仍有 DevTools daemon/helper 或旧主进程声明 `--ide-http-port`，但端口没有 listener。
- `service_port_disabled_or_unavailable`：配置或日志显示 service port 未启用、不可用，或 UI/账号策略阻止启用。
- `open_timeout_after_app_quit`：app-level quit 已完成，但 CLI open 仍 timeout，说明恢复动作未建立可连接 IDE 服务。
- `port_claimed_by_non_devtools_process`：9420 被非 DevTools 进程监听或占用。
- `devtools_listener_unexpected_response`：端口有 listener，但 HTTP 响应不像 DevTools IDE 服务。
- `profile_lock_or_singleton_blocked`：user-data/profile lock 指向仍存活或陈旧的 session，可能阻止新服务启动。
- `version_or_bundle_mismatch`：CLI、App bundle、user-data 或 helper 版本摘要不一致。

每个分类至少应带四类字段：`observed`、`evidenceSummary`、`confidence`、`nextSafeAction`。`nextSafeAction` 只能建议人工 UI 检查、换端口、换 profile/机器或再次只读诊断；不能默认执行恢复。

## 如何评测

AA 轮本身不要求恢复 ready。评测重点是：即使 9420 仍 blocked，下一轮也能知道 blocker 更接近哪一类原因，而不是只看到“open timeout”。

可接受的评测结论应至少落到以下分叉之一：

- 用户设置：service port UI/config 未启用、未持久化、被账号/安全设置限制，下一步是人工打开 DevTools 设置并复核。
- 陈旧进程：主 app 已退出，但 daemon/helper/旧进程仍声明端口或持有 session，下一步是人工确认是否安全清理现场。
- 工具版本 bug：App/CLI/helper 版本或日志显示已知异常，下一步是换 DevTools 版本、换机器或收集最小 bug report。
- 账号/UI 设置阻塞：必须登录、必须通过 UI 安全提示、或企业策略阻止 service port，下一步由用户在 UI 中处理。
- 端口/权限问题：9420 被占用、绑定失败、防火墙/权限拦截，下一步是换端口或人工检查系统权限。
- 未知但可复核：各层均无定论，但有明确缺失层和下一条只读命令建议。

不能接受的评测写法：

- “app quit completed，所以 DevTools 已恢复。”
- “进程声明了 `--ide-http-port 9420`，所以 service port 已开启。”
- “静态 readiness 通过，所以真实 UI smoke passed。”
- “没有 listener，但继续假设系统分享/朋友圈/CloudBase journey passed。”

## Key hypothesis

当前最强假设是：CLI/app 层能发现一个声明 `--ide-http-port 9420` 的 DevTools session 标记或旧进程状态，因此 open 流程误判 IDE 已启动并尝试连接；但实际负责绑定 IDE HTTP service 的 listener 没有启动、已崩溃、被配置禁用，或被 profile/session/权限状态阻塞。

AA 轮要帮助下一轮把这个假设拆开验证：先证明 listener 为什么没起来，再谈恢复 service port；service port ready 之后，才进入真实 DevTools/真机 evidence 采集。
