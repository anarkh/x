# AC 组 DevTools Service Port UI 确认产品 Brief

日期：2026-06-17

角色：AC 组产品 agent

## 产品目标

AC 组承接前序只读配置取证结论：当前状态仍为 `blocked`，诊断包含 `service_port_config_disabled`；配置层显示 `disabled`，目标端口状态为 `matches_9420`，冲突数量为 `0`，启用状态摘要为 `false`，端口值摘要为 `9420`。

本轮产品目标是把下一步从“继续由 agent 猜测或恢复环境”收束为“用户在 WeChat DevTools UI 中人工确认并决定是否开启 Service Port”，再由 agent 只读复核端口状态、smoke 入口和传播链手测准备状态。

AC 的交付不是让传播链通过，而是让评测者清楚区分三件事：

- 当前仍是 DevTools 环境入口 `blocked`。
- 用户人工开启或确认 UI 设置后，只能进入端口复核和手测准备。
- 只有真实 DevTools 或真机旅程产生脱敏证据后，传播链 journey 才能被判断为 `passed`。

## 非目标

- 不自动修改 WeChat DevTools 设置，不替用户启用或关闭 Service Port。
- 不执行 quit、open、preview、upload、kill、清缓存、重启 IDE、切换项目、修改本地配置或清理用户数据。
- 不新增或修改小程序业务能力、传播链 UI、分享策略、归因逻辑或证据模板。
- 不把配置 disabled、用户手动开启、端口 ready、smoke access ready、准备命令完成或草稿生成写成 viral journey passed。
- 不采集或输出本机 raw config、完整路径、文件名、账号、登录态、token、cookie、完整日志或项目历史。

## 用户与评测价值

用户价值是把阻塞动作交还给真正有 UI 控制权的人，避免 agent 在本机环境中做越权恢复。评测价值是降低误判：`service_port_config_disabled` 指向明确的人工作业，但它本身不是产品失败，也不是传播链通过。

对评测者来说，AC brief 应提供一套低歧义口径：

- 只读诊断可以说明“为什么不能继续”。
- 用户 UI 确认可以说明“设置是否已由人处理”。
- 端口监听和 smoke access 可以说明“是否能开始手测”。
- 真实 journey evidence 才能说明“用户侧传播链是否通过”。

## 只读边界

agent 允许做的事情：

- 读取项目内文档和已脱敏的诊断摘要。
- 运行不会改变 IDE、模拟器、配置、缓存、进程或用户数据的只读检查。
- 在用户完成 UI 操作后，复跑只读端口 inspect、只读 smoke access 检查和传播链手测准备检查。
- 输出脱敏状态摘要，例如 `blocked_config_disabled`、`blocked_no_listener`、`ready_for_manual_journey`、`unknown`、诊断码、端口是否监听、连接是否成功、是否仍需人工确认。

agent 禁止做的事情：

- 通过脚本、CLI、系统命令或自动化 UI 去开启、关闭或修改 Service Port。
- 退出、打开、预览、上传、终止、重启、清缓存或刷新 WeChat DevTools。
- 读取、复制、提交或展示本机 raw config、完整日志、完整路径、文件名、账号、登录态、token、cookie 或项目历史。
- 将任何环境检查通过写成 DevTools UI passed、真机 passed、朋友圈 passed、系统分享 passed、归因 passed 或 viral journey passed。

一旦继续判断必须依赖 UI 开关变化，agent 应停在 `blocked`，请求用户手动确认。

## 人工确认步骤

以下步骤只应由用户在 WeChat DevTools UI 中手动执行：

1. 打开 WeChat DevTools 的 Settings。
2. 进入 Security Settings。
3. 找到 Service Port。
4. 人工确认开关当前是否开启。
5. 如果用户愿意继续，手动开启 Service Port。
6. 人工确认 UI 显示的端口是否为 `9420`；如果不是，只记录“端口与目标不一致”或提供脱敏端口值。
7. 返回本对话，告知 UI 状态：已开启、仍关闭、端口不一致、找不到设置项，或无法操作。

用户完成上述步骤后，agent 只复跑只读检查。复跑结果只能说明“端口入口是否可继续”，不能自动宣称传播链通过。

## 允许与禁止的证据

允许的证据：

- 脱敏诊断摘要：状态、诊断码、目标端口匹配情况、冲突数量、启用状态摘要、端口值摘要。
- 只读 listener / connection 摘要：有无监听、连接成功或拒绝、IPv4/IPv6 的归一化结果。
- 用户人工确认结果：例如“用户确认 UI 中 Service Port 已开启，端口为目标端口”。
- 经裁剪且不含账号、路径、项目名、登录态或个人信息的 UI 截图；截图只用于证明用户看到的开关状态。
- 手测准备结果：模板完整性、必跑 journey 是否列出、本地证据是否存在、是否仍为 blocked 或 not covered。

禁止的证据：

- raw config、完整日志、完整路径、文件名、账号、登录态、token、cookie、项目历史或本地配置内容。
- 自动执行设置修改、quit、open、preview、upload、kill、清缓存或重启的输出。
- 只有配置 disabled、用户手动开启、端口 ready、smoke ready、准备命令通过或 blocked draft 的“通过”结论。
- 缺少真实 UI 观察、payload 说明或脱敏证据的 viral journey passed。

## 成功与 Blocked 输出语义

AC 文档完成的成功语义：

```text
status: product_brief_ready
meaning: AC 已定义 UI 人工确认边界、证据口径和下一步分叉；没有执行 DevTools 恢复或传播链手测。
```

当前环境仍阻塞时的输出语义：

```text
status: blocked
diagnosis: service_port_config_disabled
meaning: 只读配置摘要显示 Service Port 未开启；需要用户在 UI 中人工确认并决定是否开启。
journeyStatus: unverified
```

用户已人工开启但端口仍不可连接时：

```text
status: blocked
diagnosis: service_port_not_listening_after_manual_confirmation
meaning: 用户已处理 UI 设置，但只读复核仍未看到可用端口；继续保持环境 blocked。
journeyStatus: unverified
```

端口可连接后的输出语义：

```text
status: ready_for_manual_journey
meaning: Service Port 入口可用于继续 DevTools smoke 或传播链手测准备；这不是 viral journey passed。
journeyStatus: pending_real_evidence
```

传播链通过只能在以下条件同时满足时出现：真实 DevTools 或真机 journey 已执行、每条目标 journey 有具体实际观察、必要 payload 或限制说明齐备、脱敏 evidence 非空、评测口径没有把环境 ready 替代为产品 passed。

## 与用户侧裂变目标的关系

用户侧裂变目标包括分享入口、接收者确认或评论后的二跳引导、系统分享面板、朋友圈渠道、风险态 gating 和 attribution 记录。AC 不新增这些能力，也不证明这些能力通过。

AC 与裂变目标的关系是“解除真实手测前的环境阻塞歧义”：

- 如果 Service Port 仍关闭或不可连接，裂变 journey 只能保持 `blocked` 或 `unverified`。
- 如果 Service Port ready，只能说明可以继续准备和执行真实手测。
- 如果真实系统分享、朋友圈或 attribution 没有被观察并记录，不能把任何传播链状态写成 `passed`。

## 评测口径

评测时必须分层判断：

- `config_disabled`：配置层说明下一步需要人工 UI 确认；不是产品失败。
- `manual_enabled`：用户完成 UI 操作；不是端口 ready，也不是 smoke passed。
- `port_ready`：端口检查可连接；只能进入真实 smoke 或准备手测。
- `smoke_ready`：DevTools 入口可用于检查页面；不是传播链 journey passed。
- `journey_passed`：只来自真实 UI 或真机观察，并包含对应 journey 的脱敏证据。

评测不得接受以下表述：

- “配置已改成开启，所以传播链通过。”
- “端口是 `9420`，所以朋友圈 passed。”
- “准备命令通过，所以七条 journey passed。”
- “用户说已经打开开关，所以 payload 已验证。”
- “端口 ready 后无需继续手测。”

## 下一步分叉

- 用户未确认 UI：保持 `blocked`，请用户按 UI 步骤确认 Service Port。
- 用户确认仍关闭：保持 `blocked`，等待用户决定是否手动开启。
- 用户确认已开启且端口为 `9420`：复跑只读端口 inspect 和只读 smoke access；结果仍不得写成 viral journey passed。
- 用户确认已开启但端口不是 `9420`：记录端口不一致，使用用户确认的脱敏端口值复核只读状态，或继续保持 `blocked`。
- 复核后仍无 listener 或连接失败：保持 `blocked`，说明端口入口仍不可用，建议用户人工检查 IDE 状态、端口设置或换环境。
- 复核后端口、listener、smoke 和手测准备都 ready：输出 `ready_for_manual_journey`，继续执行真实 DevTools 或真机手测，再进入传播链 evidence 采集。
- 真实 journey 执行后失败：记录为产品或体验 `failed`，必须带具体实际观察和下一步修复建议。
- 真实 journey 执行后通过：仅对应已观察、有脱敏证据的 journey 写 `passed`；未覆盖项保持 `blocked`、`not_covered` 或 `pending`。

## 建议的脚本/Guard 需求

- 增加一个只读 UI-confirmation 后复核入口：读取用户声明的 UI 状态参数，只运行端口 inspect、listener/connection 检查和手测准备检查，不执行任何设置修改或 IDE 控制动作。
- 增加输出语义 guard：禁止把 `manual_enabled`、`port_ready`、`smoke_ready`、准备完成、草稿生成或 blocked summary 写成 viral journey passed。
- 增加敏感信息 guard：扫描输出和提交内容，拒绝 raw config、完整路径、文件名、账号、登录态、token、cookie、完整日志和项目历史。
- 增加副作用 guard：默认路径和 AC 复核入口中禁止出现设置修改、quit、open、preview、upload、kill、清缓存、重启或自动 UI 操作。
- 增加下一步分叉 guard：当状态仍为 `blocked_*` 时必须带人工 follow-up；当状态为 `ready_for_manual_journey` 时必须明确“端口 / smoke ready 不是 journey passed，下一步仍需真实手测”。
