# AC DevTools Service Port UI 确认 QA Checklist

日期：2026-06-17

范围：用于 AC 组设计 / QA agent 验收用户手动打开 WeChat DevTools `Settings -> Security Settings -> Service Port` 后的最小复测证据包。本文档只定义人工 UI 确认、只读复测、传播链手测准备和证据边界；不自动修改 DevTools，不执行真实传播 journey，也不声称 journey passed。

## 0. 验收原则

- [ ] AC 的目标是把 `service_port_config_disabled` 的 blocker 转成可复核的人工 UI 确认步骤，再用只读命令复核端口入口是否可继续。
- [ ] 当前背景应记录为：配置摘要 `configState=disabled`，`portState=matches_9420`，`conflictCount=0`，目标端口 `9420` 无 listener 或 smoke blocked。
- [ ] 用户手动开启 Service Port 只表示“人工设置动作完成”，不等于 listener ready、smoke ready、DevTools UI passed、真机 passed 或 viral journey passed。
- [ ] 任何自动工具输出都只能给出 `blocked`、`ready_for_manual_journey` 或等待人工 evidence 的语义；工具本身不得声明传播 journey 已通过。
- [ ] 所有证据必须脱敏、摘要化、可复核；不得提交 raw config、截图原图、完整路径、文件名、账号、登录态、token、cookie、openid、项目历史或 DevTools 自动设置修改记录。

## 1. 手动 UI 确认步骤

以下步骤必须由用户在 WeChat DevTools UI 中手动执行，agent 只记录用户返回的脱敏摘要。

- [ ] 用户打开当前项目对应的 WeChat DevTools。
- [ ] 用户进入 `Settings`。
- [ ] 用户进入 `Security Settings`。
- [ ] 用户找到 `Service Port`。
- [ ] 用户记录开关当前状态：`enabled`、`disabled`、`not_found`、`unavailable` 或 `not_confirmed`。
- [ ] 如果用户愿意继续，由用户手动开启 `Service Port`；agent 不得通过 CLI、脚本、自动化 UI 或系统命令修改该设置。
- [ ] 用户记录 UI 显示端口：`9420`、`other_port:<number>` 或 `unconfirmed`。
- [ ] 用户记录是否出现安全提示或重启提示：只写 `prompt_seen=yes/no/unconfirmed`，不得提交截图原图或提示全文。
- [ ] 用户返回本对话后，agent 才能运行只读端口 / smoke / 手测准备复核命令。

## 2. 记录字段

最小记录字段：

```text
status: <见第 6 节>
testedAt: <日期、时区即可>
actor: user_manual_ui_confirmation
targetPort: 9420
uiServicePortState: enabled | disabled | not_found | unavailable | not_confirmed
uiPortState: matches_9420 | mismatch | unconfirmed
configState: disabled | enabled | conflict | unconfirmed
portState: matches_9420 | mismatch | conflict | unconfirmed
conflictCount: <number>
listenerState: listening | no_listener | refused | timeout | unknown | not_run
smokeState: ready | blocked | unknown | not_run
viralJourneyPreparation: ready | blocked | unknown | not_run
manualJourneyStatus: unverified | blocked | externally_recorded_not_claimed_by_this_tool
commandsRun: <只列命令名、退出码、归一化 status，不粘贴 raw output>
nextStep: <人工下一步>
notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed
```

字段约束：

- [ ] `actor` 必须能区分用户手动 UI 操作和 agent 只读复核。
- [ ] `configState`、`portState`、`conflictCount` 必须来自只读配置摘要或后续只读 inspect 摘要，不得靠猜测填写。
- [ ] `listenerState` 必须来自端口监听或连接摘要，不得用“用户说已开启”替代。
- [ ] `smokeState` 必须来自只读 smoke access 摘要，不得用 listener ready 替代。
- [ ] `viralJourneyPreparation` 只能说明手测包是否可准备，不得说明 journey 是否通过。
- [ ] `manualJourneyStatus` 默认为 `unverified`；只有外部真实手测结果已由人工填报并通过独立复核时，才可写 `externally_recorded_not_claimed_by_this_tool`。

## 3. 允许的证据

- [ ] 脱敏文字摘要：用户确认的 UI 开关状态、端口是否为目标端口、是否出现安全提示。
- [ ] 端口状态：`port=9420`，`listener=yes/no/unknown`，`connect=connected/refused/timeout/unknown`。
- [ ] 配置摘要：`configState`、`portState`、`conflictCount`、诊断码、confidence 和 `nextHumanConfirmation`。
- [ ] listener / smoke 状态：只记录 `status`、退出码、第一层 blocker 或 ready 摘要。
- [ ] 运行命令和结果：只记录命令入口、退出码、归一化 `status`、关键 blocker / ready 语义；不要粘贴完整 stdout / stderr。
- [ ] 传播链准备摘要：required journeys 是否列出、准备命令是否保持 no-side-effect、是否仍 blocked。
- [ ] next step：例如继续人工开启、改用 UI 显示端口复测、检查 DevTools 实例、进入真实手测或保持 blocked。

推荐证据摘要：

```text
status: blocked_no_listener
userManualConfirmation: Service Port enabled in UI; displayed port matches target
configState: disabled
portState: matches_9420
conflictCount: 0
listenerState: no_listener
smokeState: blocked
viralJourneyPreparation: blocked
commandsRun: inspect devtools port exit=0 status=blocked; devtools smoke exit=nonzero status=blocked
nextStep: 用户复核 DevTools 实例、端口和 IDE 状态后再次只读复测
notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed
```

## 4. 禁止的证据

- [ ] raw config、完整 JSON、完整 plist、完整 sqlite dump、完整日志、完整 stdout / stderr。
- [ ] 截图原图、录屏原件、二维码、系统分享面板原图；若必须说明 UI，只写脱敏文字摘要。
- [ ] 完整路径、用户目录、DevTools user-data 子路径、日志路径、配置路径、证据附件路径。
- [ ] 文件名：尤其是配置、日志、缓存、local evidence、截图、录屏或用户数据文件名。命令入口可用 npm script 名称代替。
- [ ] 账号、登录态、token、cookie、openid、unionid、微信号、昵称、头像、手机号、邮箱、设备唯一标识。
- [ ] 项目历史、最近打开项目、真实项目名、真实 AppID、CloudBase 环境标识、post 原文、评论正文、反馈正文、图片 URL。
- [ ] DevTools 自动设置修改记录，包括脚本改开关、改端口、改配置、清缓存、重启或恢复命令的输出。
- [ ] 任何把准备、blocked draft、readiness、端口 ready 或 smoke ready 写成 journey passed 的证据。

## 5. 命令边界

默认只读允许：

```bash
npm run inspect:devtools-port -- --port 9420
npm run check:devtools-smoke -- --port 9420
npm run prepare:viral-journey-run -- --port 9420
node --no-warnings scripts/check-devtools-readiness.mjs
```

记录要求：

- [ ] 如果命令输出完整路径、文件名或本地草稿名，汇报时必须改写成 `<repo-worktree>`、`<local-evidence>` 或直接省略。
- [ ] 如果 strict smoke 非零退出，记录为 `blocked`，不得用 `|| true` 后写成通过。
- [ ] `prepare:viral-journey-run` 只说明手测准备状态；即使命令成功，也不能写成七条 journey passed。

始终禁止：

- [ ] quit、open、preview、upload、login、logout。
- [ ] kill、pkill、killall、launchctl、重启 IDE、清缓存、清 storage。
- [ ] 修改 settings、Service Port 开关、端口号、配置文件、user data、local evidence。
- [ ] 自动化点击 DevTools 设置 UI。
- [ ] 生成、提交或移动截图、录屏、payload、raw log、raw config 或 local evidence 文件。

## 6. Status Mapping

- [ ] `pre_manual_confirmation`
  - 语义：尚未获得用户对 DevTools UI Service Port 的人工确认。
  - 可接受 evidence：AB/AC 只读摘要、当前端口 blocked 摘要、请求用户手动确认的 next step。
  - 不可写：listener ready、smoke ready、journey passed。

- [ ] `blocked_config_disabled`
  - 语义：只读配置摘要或用户 UI 确认显示 Service Port 仍关闭。
  - 必填：`configState=disabled` 或 `uiServicePortState=disabled`，`nextStep=用户决定是否手动开启`。
  - 不可写：agent 已开启设置、端口 ready。

- [ ] `blocked_port_mismatch`
  - 语义：用户 UI 显示端口不是目标端口，或配置 `portState=mismatch/conflict`。
  - 必填：目标端口、脱敏 UI 端口摘要、是否需要用 UI 端口复测。
  - 不可写：继续用 `9420` 断言 ready，或自动改端口。

- [ ] `blocked_no_listener`
  - 语义：用户确认已开启或配置看似 enabled，但目标端口仍无 listener、连接 refused / timeout，或 smoke blocked。
  - 必填：`listenerState`、`smokeState`、运行命令、退出码和下一步人工复核项。
  - 不可写：设置已开所以 smoke passed。

- [ ] `blocked_smoke_access`
  - 语义：端口有 listener 或连接信号，但 smoke access 仍无法确认可用 DevTools 入口。
  - 必填：listener 摘要、smoke blocker、下一步人工确认。
  - 不可写：listener ready 等于页面或传播链通过。

- [ ] `ready_for_manual_journey`
  - 语义：用户已人工确认 UI 设置，端口 / listener / smoke 只读复核均 ready，传播链手测准备可继续。
  - 必填：`uiServicePortState=enabled`、`uiPortState=matches_9420`、`listenerState=listening` 或等价连接成功、`smokeState=ready`、`viralJourneyPreparation=ready`、`strictSubcommandNonzero=no`。
  - 必须写：`notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed`，下一步是真实 DevTools 或真机手测。

- [ ] `manual_journey_passed_not_claimed_by_this_tool`
  - 语义：外部人工结果文件或评审记录声称某些真实 journey 已通过；AC 工具只承认“存在外部人工证据待复核”，不生成通过结论。
  - 必填：外部证据状态摘要、独立 checker 是否通过、人工 reviewer 是否复核。
  - 必须写：`claimedBy=external_manual_evidence`，`notClaimedBy=AC_UI_confirmation_tool`。
  - 不可写：AC 工具自动判定 viral journey passed。

## 7. Static Guard 期望

后续如新增 AC 复核脚本或 readiness guard，应覆盖以下静态规则：

- [ ] 副作用拒绝：源码不得包含写文件、删文件、移动文件、chmod/chown、settings 修改、Service Port 修改、quit/open/preview/upload、kill、清缓存或自动化 UI 点击。
- [ ] 隐私拒绝：输出层必须有路径脱敏、文件名抑制、token / cookie / openid / session / account-like 字段过滤。
- [ ] raw content suppression：不得打印 raw config、raw log、完整 stdout / stderr、完整 HTTP body、完整进程命令行。
- [ ] 状态词汇 guard：只允许第 6 节定义的 AC 状态，或明确扩展并同步文档；不得新增 `ui_passed`、`journey_passed_by_tool`、`devtools_recovered` 这类误导状态。
- [ ] ready 不等于 passed：脚本必须包含并输出 `port ready is not viral journey passed` 或等价语义。
- [ ] blocked 必须有 next step：任何 `blocked_*` 输出必须带 `nextStep` 或 `nextHumanConfirmation`。
- [ ] manual journey 外部化：若未来读取到人工结果中有 `passed`，外部评审记录可使用 `manual_journey_passed_not_claimed_by_this_tool`；当前 AC prepare 工具只输出 `manualJourneyStatus: unverified` 或复核待定，不得改写成工具自己的 passed。

## 8. 负向用例

- [ ] 用户未确认 UI，却输出 `ready_for_manual_journey`：应失败。
- [ ] `configState=disabled` 却输出端口 ready 或 smoke ready：应失败，除非后续只读复测明确覆盖并记录了人工 UI 操作。
- [ ] listener 仍为 `no_listener/refused/timeout`，却输出 `ready_for_manual_journey`：应失败。
- [ ] strict smoke 非零退出，却把状态写成 ready：应失败。
- [ ] `prepare:viral-journey-run` 成功后写成七条 journey passed：应失败。
- [ ] local manual evidence、blocked draft、readiness 或 schema checker 通过后写成真实 UI passed：应失败。
- [ ] 证据中出现 raw config、完整路径、文件名、账号、登录态、token、cookie、openid 或项目历史：应失败。
- [ ] 证据中出现截图原图、录屏原件、二维码或系统分享面板原图：应失败。
- [ ] 命令或脚本执行了 quit/open/preview/upload/kill/cache/settings 修改：应失败并停止复测。
- [ ] AC 工具声称 `manual_journey_passed` 而没有 `not_claimed_by_this_tool` 限定：应失败。

## 9. 收尾验证命令

本 checklist 修改后运行：

```bash
bash harness/init.sh
node scripts/check-json.mjs
node harness/check-harness.mjs
npm run check:devtools-port-forensics
node --no-warnings scripts/check-devtools-readiness.mjs
git diff --check
git status --short
```

期望：

- [ ] 基础 harness、JSON、DevTools UI confirmation static guard、readiness 和 diff whitespace 检查通过。
- [ ] `git status --short` 中可提交改动只包含 AC 文档、只读 prepare/static guard 脚本、readiness/package/harness 记录。
- [ ] 没有运行任何 quit/open/preview/upload/kill/cache/settings 修改命令。
- [ ] 没有生成或提交 local evidence、截图、录屏、raw config、raw log 或 DevTools 用户数据。
