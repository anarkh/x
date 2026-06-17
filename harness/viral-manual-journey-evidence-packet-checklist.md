# AD 传播链手测 Evidence Packet QA Checklist

日期：2026-06-17

范围：本清单用于 AD 组在 AC 只读 UI confirmation recheck 之后，生成“viral journey evidence packet”的手测执行说明。它只定义评测者如何准备、执行和填写真实 evidence；不执行 WeChat DevTools、不写 evidence 文件、不生成截图/录屏/payload、不声明任何 journey passed。

## 0. 验收原则

- [ ] AD packet 的输入必须来自 AC 只读复核摘要，尤其是 `status`、`nextStep`、`notClaimed`、listener / smoke / viral preparation 状态。
- [ ] 当 AC 状态不是 `ready_for_manual_journey` 时，AD 只能输出 `status: not_ready_for_manual_journey`、`packetStatus: not_ready`、阻塞原因和 `nextStep`，不得输出可执行的七条 journey packet。
- [ ] 只有 AC 达到 `ready_for_manual_journey` 时，AD 才能输出七条 viral journey 的执行 packet；该 packet 的状态只能是 `status: ready_to_execute_manual_journey`、`packetStatus: ready_to_execute`，不是 `journey_passed`。
- [ ] Ready packet 只表示评测者可以开始真实 DevTools 或真机手测；它不表示 DevTools UI journey passed、real-device journey passed 或 viral journey passed。
- [ ] 所有输出都必须包含 exact 文案：`notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed`。
- [ ] AD 不得运行 DevTools 控制命令，不得打开/预览/上传小程序，不得自动点击系统分享菜单，不得写 ignored local evidence，不得把外部人工结果改写成自己的 passed 结论。

## 1. 记录字段

每次生成 packet 或 not-ready 摘要都必须记录以下字段：

```text
status: not_ready_for_manual_journey | ready_to_execute_manual_journey
packetStatus: not_ready | ready_to_execute
acStatus: <AC 输出状态>
acNextStep: <AC 原始 nextStep 的脱敏摘要>
generatedAt: <日期时间和时区>
branch: <当前分支>
commit: <当前 HEAD>
worktree: <当前 worktree>
actor: AD_design_QA_packet_only
targetPort: 9420
uiServicePortState: enabled | disabled | not_found | unavailable | not_confirmed | unknown
uiPortState: matches_9420 | mismatch | unconfirmed | unknown
listenerState: listening | no_listener | refused | timeout | unknown | not_run
smokeState: ready | blocked | unknown | not_run
viralJourneyPreparation: ready | blocked | unknown | not_run
manualJourneyStatus: unverified
evidenceWriteState: not_written_by_AD
commandsRunByAD: <只列只读验证命令；不得包含 DevTools 操作命令>
nextStep: <评测者下一步>
notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed
```

字段约束：

- [ ] `packetStatus=not_ready` 时必须有 `nextStep`，并解释 AC 当前为什么不能进入手测 packet。
- [ ] `packetStatus=ready_to_execute` 时必须同时满足 `status=ready_to_execute_manual_journey`、`acStatus=ready_for_manual_journey`、`smokeState=ready`、`viralJourneyPreparation=ready` 或 AC 等价脱敏摘要。
- [ ] `manualJourneyStatus` 在 AD packet 中固定为 `unverified`；AD 不读取或生成真实 passed evidence。
- [ ] `evidenceWriteState` 必须明确 AD 没有写 evidence；真实结果只能由评测者在 ignored/local 结果文件中填写。
- [ ] `commandsRunByAD` 只能记录文档/静态检查命令；不得记录任何 DevTools UI 或真机执行动作。

## 2. AC Blocked 时的 Not-Ready 输出

当 AC 仍处于 `pre_manual_confirmation`、`blocked_config_disabled`、`blocked_port_mismatch`、`blocked_no_listener`、`blocked_smoke_access`、`unknown` 或任何非 `ready_for_manual_journey` 状态时，AD 输出必须停在：

```text
status: not_ready_for_manual_journey
packetStatus: not_ready
reason: AC is not ready_for_manual_journey
nextStep: <引用 AC 的下一步，例如用户人工开启 Service Port、修正端口、复跑只读 smoke、换环境>
manualJourneyStatus: unverified
notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed
```

Not-ready checklist：

- [ ] 不列出七条 journey 的逐步执行 packet。
- [ ] 不生成 evidence JSON、blocked draft、截图、录屏、payload 或日志。
- [ ] 不把 AC blocked、AC readiness、端口诊断或 smoke blocker 写成产品 failed。
- [ ] 不把用户“已开启 Service Port”写成 listener ready、smoke ready 或 journey passed。
- [ ] `nextStep` 必须是可执行的人工作业或只读复核动作，不能写成“已通过”。

## 3. Ready Packet 的七条 Journey 必填字段

只有 `acStatus=ready_for_manual_journey` 时，AD 才能输出以下七条 journey packet。每条 journey 都必须包含同一组字段：

```text
journeyId: <必填，见下方七条 id>
packetState: ready_to_execute_manual_journey
entry: <真实 DevTools/真机入口或 route>
preconditions: <post fixture、账号/storage、网络、CloudBase、设备要求>
steps: <评测者要做的真实 UI 步骤>
expected: <应观察到的 UI / payload / gating 结果>
requiredEvidence: <截图/录屏/payload/log/readback 的脱敏引用要求>
payloadRequired: yes | no | if_inspectable
payloadFields: <必须检查的 path/query/title/imageUrl/attribution 字段>
ifCannotInspect: <必须填写具体限制、替代证据、未验证字段和 followUp>
actual: <由评测者真实填写；AD packet 中保持 empty>
statusToFill: passed | failed | blocked
followUpRequiredWhenBlockedOrFailed: yes
privacyNotes: <不得记录的隐私字段>
notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed
```

七条 required journey：

- [ ] `first-hop-share-entry`：首跳从分享进入低风险 active 任务。
  - `entry`：`/pages/detail/detail?id=<activeLowRiskPostId>&from=share` 或真实分享卡片入口。
  - `expected`：receiver guide 可见、receiver action strip 可见、按钮是 confirm/comment 行动、普通分享面板不竞争展示。
  - `requiredEvidence`：页面截图或录屏、post id、入口 query、设备/DevTools 信息、可见 UI 摘要。
  - `payloadRequired`：`if_inspectable`；若从系统分享卡片进入，应记录分享入口来源和 query 是否保留。

- [ ] `receiver-confirm-conversion`：接收者确认后的二跳提示。
  - `entry`：首跳分享详情页。
  - `expected`：确认动作真实成功、`receiverConversionPrompt` 出现、`actionRelayPrompt` 不抢主 CTA。
  - `requiredEvidence`：确认前后录屏或截图、确认计数/状态摘要、二跳提示截图、payload 摘要。
  - `payloadFields`：`path` 必须包含 `from=share`、`source=receiver`、`receiverAction=confirm`；可 inspect 时还要记录脱敏 `share_id`、`parent_share_id`、`share_depth`。
  - `ifCannotInspect`：说明哪个 DevTools/真机能力不暴露 path，用什么录屏或日志替代，哪些 payload 字段仍未验证。

- [ ] `receiver-comment-conversion`：接收者评论后的二跳提示。
  - `entry`：首跳分享详情页评论入口。
  - `expected`：评论真实提交成功、`receiverConversionPrompt` 出现、`commentRelayPrompt` 不抢主 CTA。
  - `requiredEvidence`：提交过程录屏或截图、评论成功摘要、本地/CloudBase 路径摘要、二跳提示截图、payload 摘要。
  - `payloadFields`：`path` 必须包含 `from=share`、`source=receiver`、`receiverAction=comment`；可 inspect 时还要记录脱敏 `share_id`、`parent_share_id`、`share_depth`。
  - `privacyNotes`：不得记录评论正文全文、真实昵称、头像、openid 或联系方式。

- [ ] `second-hop-receiver-source`：二跳接收者看到接力语境。
  - `entry`：真实二跳分享卡片；无法操作时可用 direct route 辅助，但必须标注不是系统卡片 evidence。
  - `expected`：`source=receiver` 语境可读，`receiverAction=confirm/comment` 文案区分上一位刚确认或刚补线索，普通分享面板不竞争展示。
  - `requiredEvidence`：入口来源、route/payload 摘要、首屏截图或录屏、confirm/comment 两种 action 的文案摘要。
  - `payloadFields`：`source=receiver`、`receiverAction=confirm|comment`。

- [ ] `ordinary-and-risk-entries`：普通入口和风险态不鼓励接收侧扩散。
  - `entry`：同一低风险 active 任务普通入口，以及 stale signal、report signal、`stale`、`resolved`、`expired`、`hidden` fixtures。
  - `expected`：普通入口不显示 receiver guide/action strip；任何 stale/report 或 closed 状态不显示鼓励性 public relay CTA。
  - `requiredEvidence`：每个 fixture 的 post id、状态、`staleCount`、`reportCount`、闭合原因、UI 截图或录屏摘要。
  - `payloadRequired`：`no`；如系统菜单仍可打开，要记录谨慎文案或无法检查说明。

- [ ] `timeline-share-channel`：低风险 active 详情页朋友圈系统渠道。
  - `entry`：低风险 active 详情页真实系统菜单。
  - `expected`：真实系统菜单可见“发送给朋友”和“分享到朋友圈”；`onShareTimeline` 或等价 payload 可记录时包含正确 query；朋友圈/单页模式首屏可读。
  - `requiredEvidence`：系统菜单截图或录屏、timeline payload 摘要、单页模式或等价入口首屏证据。
  - `payloadFields`：`query` 必须包含 `id`、`from=share`、`source=timeline`、`shareChannel=timeline`；记录 `title` 和 `imageUrl` 或具体无法 inspect 原因。
  - `ifCannotInspect`：不得写 passed；必须写 blocked 或保留未验证字段和 follow-up。

- [ ] `timeline-risk-gating`：风险和闭合任务不开放鼓励性朋友圈。
  - `entry`：weak stale/report、`stale`、`resolved`、`expired`、`hidden`、unknown 或刷新失败 fixtures。
  - `expected`：不出现鼓励性 `shareTimeline` / “分享到朋友圈”；如仍有 inspectable title/query/copy，必须是谨慎语义。
  - `requiredEvidence`：每个 fixture 的菜单缺失证据、状态字段、谨慎文案摘要或具体检查 blocker。
  - `payloadRequired`：`if_inspectable`；无法打开菜单或无法 inspect payload 时只能 blocked，不能 passed。

## 4. Allowed Evidence

- [ ] 脱敏截图/录屏引用：只写 ignored/local 附件编号、场景、时间、设备；不要把原图或完整路径提交到可提交文件。
- [ ] 结构化 payload 摘要：`journeyId`、`postId`、`entry`、`path` / `query`、`title` 摘要、`imageUrl` 是否存在、`source`、`receiverAction`、`shareChannel`、脱敏 attribution id。
- [ ] UI 观察摘要：哪些组件可见/不可见、按钮优先级、风险态 gating、单页首屏是否可读。
- [ ] 环境摘要：DevTools 版本、基础库、设备/真机、网络、CloudBase 是否启用、fixture 来源。
- [ ] 命令摘要：只记录命令名、退出码、归一化状态和关键 blocker / ready 语义。
- [ ] 无法检查说明：必须写明具体工具限制、替代 evidence、未验证字段和 follow-up。

## 5. Forbidden Evidence

- [ ] raw config、完整 JSON dump、完整日志、完整 stdout / stderr、完整网络包、完整 CloudBase 记录。
- [ ] 截图原图、录屏原件、二维码、系统分享面板原图或真实 payload 文件进入可提交路径。
- [ ] 完整本地路径、文件名、DevTools user-data 路径、日志路径、evidence 附件路径。
- [ ] 账号、登录态、token、cookie、openid、unionid、微信号、昵称、头像、手机号、邮箱、设备唯一标识。
- [ ] 精确经纬度、详细住址、真实评论正文全文、图片 URL、CloudBase fileID、真实云环境 id 或私有 AppID。
- [ ] 把 readiness、blocked draft、schema checker、AC ready 或 packet ready 当成 DevTools UI passed、real-device passed 或 viral journey passed 的文字。

## 6. 命令边界

AD 允许运行的只读命令：

```bash
pwd
git branch --show-current
git rev-parse --short HEAD
git status --short
node harness/check-harness.mjs
git diff --check
```

AD 可以在文档中建议评测者手动运行，但不得代替评测者写结果：

```bash
node --no-warnings scripts/check-viral-journey-manual-evidence.mjs <ignored-local-result.json>
node --no-warnings scripts/check-devtools-readiness.mjs
```

AD 始终禁止：

- [ ] `open`、`preview`、`upload`、`login`、`logout`、`quit` 或任何 WeChat DevTools 控制命令。
- [ ] `kill`、`pkill`、`killall`、`launchctl`、重启 IDE、清缓存、清 storage。
- [ ] 修改 Service Port、settings、端口号、配置文件、user data、local evidence 或 CloudBase 数据。
- [ ] 自动化点击 DevTools 设置 UI、系统分享菜单、朋友圈菜单或小程序页面。
- [ ] 创建、覆盖、移动、提交截图、录屏、payload、raw log、raw config 或 ignored/local evidence JSON。

## 7. Status Mapping

- [ ] AC `pre_manual_confirmation` -> AD `status: not_ready_for_manual_journey` / `packetStatus: not_ready`。
  - `nextStep`：用户先在 WeChat DevTools UI 中人工确认 Service Port。
  - 不输出七条 journey packet。

- [ ] AC `blocked_config_disabled` -> AD `status: not_ready_for_manual_journey` / `packetStatus: not_ready`。
  - `nextStep`：用户决定是否手动开启 Service Port，然后复跑 AC 只读复核。
  - 不把“配置 disabled”写成产品失败。

- [ ] AC `blocked_port_mismatch` -> AD `status: not_ready_for_manual_journey` / `packetStatus: not_ready`。
  - `nextStep`：确认 UI 显示端口，按 AC 指引使用目标端口或保持 blocked。
  - 不自动改端口。

- [ ] AC `blocked_no_listener` -> AD `status: not_ready_for_manual_journey` / `packetStatus: not_ready`。
  - `nextStep`：用户检查 DevTools 实例、Service Port 状态、IDE 项目和网络，再复跑只读 listener / smoke。
  - 不进入手测 packet。

- [ ] AC `blocked_smoke_access` -> AD `status: not_ready_for_manual_journey` / `packetStatus: not_ready`。
  - `nextStep`：先恢复 smoke access；listener ready 不能替代页面或 journey ready。
  - 不输出 `ready_to_execute_manual_journey`。

- [ ] AC `ready_for_manual_journey` -> AD `status: ready_to_execute_manual_journey` / `packetStatus: ready_to_execute`。
  - `nextStep`：评测者执行七条真实 DevTools 或真机 journey，并在 ignored/local result 中填写 evidence、actual、payload 或无法检查说明。
  - 必须写：`notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed`。
  - 不得写：`journey_passed`、`manual_journey_passed`、`DevTools UI passed` 或 `real-device passed`。

- [ ] 外部人工结果声称 passed -> AD `external_manual_evidence_needs_review`。
  - `nextStep`：由独立 checker 和人工 reviewer 复核；AD packet 只能引用“外部证据待复核”，不能自己 claim passed。
  - 必须保留 `notClaimed` exact 文案。

## 8. Static Guard 期望

后续若新增 AD packet 生成脚本或 checker，应覆盖以下规则：

- [ ] AC gate：源码必须拒绝非 `ready_for_manual_journey` 输入生成七条 journey packet，并输出 `not_ready_for_manual_journey`、`packetStatus: not_ready` 与非空 `nextStep`。
- [ ] Ready wording guard：`ready_for_manual_journey` 只能映射到 `ready_to_execute_manual_journey`，不得出现 `journey_passed`、`ui_passed`、`real_device_passed`、`viral_passed`。
- [ ] Exact notClaimed guard：所有输出必须包含 `notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed`。
- [ ] Seven journey guard：ready packet 必须且只能列出七条 required journey id，且每条包含 `entry`、`preconditions`、`steps`、`expected`、`requiredEvidence`、`payloadRequired`、`ifCannotInspect`、`statusToFill`。
- [ ] No evidence write guard：AD 脚本不得写 JSON、截图、录屏、payload、日志、CloudBase 数据或 DevTools 配置。
- [ ] Side-effect guard：源码不得包含 DevTools open/preview/upload/quit/login/logout、kill、settings 修改、cache/storage 清理、UI 自动点击。
- [ ] Privacy guard：输出必须抑制 raw path、文件名、账号、token、cookie、openid、真实云环境 id、精确位置和 raw stdout/stderr。
- [ ] Blocked nextStep guard：任何 `not_ready_for_manual_journey` / `not_ready` 或 blocked 映射必须带可执行 `nextStep`。

## 9. 负向用例

- [ ] AC 为 `blocked_no_listener` 时输出七条 journey packet：应失败。
- [ ] AC 为 `blocked_smoke_access` 时输出 `ready_to_execute_manual_journey`：应失败。
- [ ] Ready packet 中出现 `journey_passed`、`passed_by_AD`、`DevTools UI passed` 或 `real-device passed`：应失败。
- [ ] 缺少 exact `notClaimed` 文案：应失败。
- [ ] 七条 journey 少一条、多一条、id 拼错或缺必填字段：应失败。
- [ ] `timeline-share-channel` 没有要求 `source=timeline` 和 `shareChannel=timeline`：应失败。
- [ ] confirm/comment 二跳 payload 没有要求 `receiverAction=confirm/comment`：应失败。
- [ ] 无法 inspect payload 时允许写 passed 且没有限制说明：应失败。
- [ ] AD 命令写入 local evidence、生成截图、覆盖 JSON 或提交 raw payload：应失败。
- [ ] 输出中包含完整路径、文件名、raw config、token、cookie、openid、真实评论正文或精确经纬度：应失败。

## 10. 收尾验证命令

本 checklist 修改后，AD closeout 只运行不产生 evidence 的验证：

```bash
git diff --check
git status --short
```

如果本轮允许跑完整 harness，可再运行：

```bash
bash harness/init.sh
node scripts/check-json.mjs
node harness/check-harness.mjs
node --no-warnings scripts/check-devtools-readiness.mjs
```

期望：

- [ ] 可提交改动只包含 `harness/viral-manual-journey-evidence-packet-checklist.md`。
- [ ] 没有生成或修改 ignored/local evidence、截图、录屏、payload、raw log 或 DevTools 用户数据。
- [ ] 没有运行任何 DevTools open/preview/upload/quit、kill、cache/settings/storage 修改命令。
- [ ] 最终汇报只说 checklist 已准备好；不说任何 viral journey passed。
