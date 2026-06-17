# AB 组 DevTools Service Port 配置取证产品 Brief

日期：2026-06-17

分支：`codex/iter-devtools-service-port-config-forensics`

工作目录：`/tmp/street-tasks-iter-worktrees/devtools-service-port-config-forensics`

角色：AB 组产品 agent

## AB 目标

AB 轮接在 AA 轮 `service_port_flag_mixed_recent_evidence` 之后，目标是继续判断 WeChat DevTools Service Port 的配置层是否能从本机只读摘要里确认：

- 配置层是否指向 `enabled`、`disabled` 或 `unconfirmed`。
- 配置层声明的端口是否匹配当前目标端口 `9420`。
- 是否存在多个配置源互相冲突，例如用户级、profile 级、workspace 或历史迁移残留配置给出不同启用状态或端口。

AA 已经确认过 log、user-data、CLI gate 和历史启动线索：当前仍不能把 DevTools service port 写成 ready，也不能进入真实 DevTools、朋友圈、系统分享、归因或真机 journey passed。AB 只补齐“设置/配置层是否能给出更明确方向”这一块，不替代 listener、HTTP smoke 或人工 UI 确认。

## 只读边界

AB 配置取证必须保持无副作用：

- 不修改 WeChat DevTools 设置，不启用或关闭 Service Port。
- 不运行 DevTools `open`、`quit`、`preview`、`upload`、recovery、清缓存、kill 或任何会改变 IDE/模拟器状态的动作。
- 不删除、不移动、不 touch 配置、user-data、profile、lock、storage、cookie、session 或项目历史文件。
- 不读取或输出 raw local storage、cookie、账号信息、登录态、完整项目历史、完整日志、完整路径树或完整配置文件内容。
- 不把配置摘要写成 service port ready、DevTools UI passed、系统分享 passed、朋友圈 passed、归因 passed 或真机 passed。

如果判断必须依赖 UI 开关、账号安全弹窗、换 profile、换端口或重启 DevTools，本轮结论应保持 `blocked` 或 `unconfirmed`，并把下一步交给人工确认。

## 允许输出语义

配置取证的输出必须是脱敏摘要，只允许包含以下类型：

- 相关 key 名摘要，例如 `servicePort.enabled`、`servicePort.port`、`security.servicePort` 这类键名或归一化键名，不输出原始文件内容。
- 布尔或枚举状态：`enabled`、`disabled`、`unconfirmed`、`conflict`、`unknown`。
- 端口号：仅输出与 Service Port 判断相关的数字端口，例如 `9420` 或检测到的候选端口。
- 文件类别计数和 mtime bucket，例如 `global_settings: count=1, mtime=recent`、`profile_settings: count=2, mtime=stale`，不输出用户目录完整树。
- 置信度：`high`、`medium`、`low`，并说明置信度来自配置一致性、mtime 新鲜度或多源冲突。
- `nextHumanConfirmation`：下一步人工确认建议，例如检查 DevTools UI Service Port 开关、改用明确端口、换 profile，或在配置 enabled 后确认 listener。

输出可以说明“发现了哪些类别的配置源”和“这些源是否一致”，但不能泄露账号、本地项目列表、历史打开路径、CloudBase 标识、token、cookie、storage 值或设备个人信息。

## 诊断码建议

AB 轮建议使用以下配置层诊断码：

- `service_port_config_enabled_port_match`：只读配置摘要显示 Service Port 处于 enabled，且端口匹配 `9420`。
- `service_port_config_enabled_port_mismatch`：配置显示 enabled，但端口不是 `9420`，或多个 enabled 配置源指向不同端口。
- `service_port_config_disabled`：配置显示 Service Port 处于 disabled。
- `service_port_config_unconfirmed`：没有足够配置摘要确认 enabled/disabled，或无法安全读取相关键。
- `service_port_config_conflict`：多个配置源在启用状态、端口或最近活跃 profile 上互相冲突。

这些诊断码都不能等于 service port ready。即使得到 `service_port_config_enabled_port_match`，也只说明配置层看起来正确；仍必须另有 listener / HTTP smoke / DevTools UI 或真机证据，才能推进真实运行判断。

## 与产品裂变目标的关系

AB 不新增用户侧裂变功能，也不改变发布、分享、朋友圈、系统分享、评论接力、归因或落地页体验。

AB 的产品价值是降低真实 evidence unblock 的盲目性：如果配置层显示 disabled 或 unknown，下一步应先做人工 UI 设置确认；如果配置层 enabled 但没有 listener，下一步应更聚焦 DevTools UI、端口、profile、daemon/helper 或工具版本问题；如果配置源冲突，下一步应先厘清当前 DevTools 实际使用的 profile 和端口。这样后续真实 DevTools、朋友圈、系统分享和归因 evidence 才有更明确的恢复路径。

## 评测口径

配置取证结果只能影响“下一步怎么排查”，不能直接升级用户旅程状态：

- 如果只确认配置 `unknown`、`unconfirmed` 或 `disabled`，仍不能打 UI passed，也不能写 viral journey passed。
- 如果配置 `enabled` 且端口匹配 `9420`，但没有 listener，结论仍是 blocked；建议人工 UI 复核、换端口、换 profile，或继续只读检查 profile/daemon/helper。
- 如果配置 `enabled` 但端口不匹配 `9420`，应建议人工确认 DevTools UI 中实际 Service Port 端口，并用匹配端口重新做只读 listener/smoke 检查。
- 如果存在多配置源冲突，应优先建议人工确认当前活跃 profile 和 UI 设置，不要自动清理或覆盖配置。
- 如果配置显示 disabled，应建议人工在 DevTools UI 中确认是否允许开启 Service Port；AB 不自动开启。

可接受的 AB 结论示例：

```text
status: blocked
diagnosis: service_port_config_enabled_port_match
configState: enabled
portState: matches_9420
sourceSummary: user_settings=1 recent, profile_settings=1 stale, conflicts=0
confidence: medium
nextHumanConfirmation: DevTools UI must confirm Service Port is enabled, then verify a listener on 9420 before any smoke or share evidence can be marked passed.
```

不可接受的 AB 结论：

- “配置 enabled，所以 service port ready。”
- “配置端口是 9420，所以朋友圈/系统分享/归因 evidence 已通过。”
- “配置 unknown，但假设 UI 已打开。”
- “为了解决冲突，自动删除旧 profile 或改写设置。”

## 下一步分叉

- `service_port_config_enabled_port_match` + no listener：人工检查 UI 开关是否真的生效，考虑换端口或换 profile，再复跑只读 listener/smoke。
- `service_port_config_enabled_port_mismatch`：人工统一 DevTools UI 端口与诊断端口，避免继续用错误端口判断。
- `service_port_config_disabled`：人工决定是否开启 Service Port；开启后重新记录配置摘要和 listener 状态。
- `service_port_config_unconfirmed`：记录缺失配置层，继续用 UI 人工确认或只读日志/profile 摘要补证。
- `service_port_config_conflict`：先确认活跃 profile 和当前 UI 设置，再讨论是否需要人工清理或切换 profile。

只有在 Service Port 形成可连接 listener，并且真实 DevTools 或真机步骤留下脱敏 evidence 后，才可以继续判断地图、发布、详情、系统分享、朋友圈或 attribution journey 是否通过。
