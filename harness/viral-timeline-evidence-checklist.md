# 朋友圈 Timeline 证据与 QA Checklist

日期：2026-06-17

## 范围与成功标准

- [ ] 本清单只补充朋友圈 timeline 的真实证据结构、手测步骤和 checker / 模板更新要求，不新增产品 UI。
- [ ] 开发 agent 更新 checker 时，应把 timeline journeys 纳入真实手测 schema，但不得删减或弱化现有五条 `from=share` receiver journeys。
- [ ] 没有 WeChat DevTools、真机或等价可复现证据时，timeline 能力只能记为 `blocked` / `unverified`，不能写成 `passed`。
- [ ] 真实结果文件仍应保持 ignored/local；示例文件、草稿或静态推断不能作为发布证据。

## 新增 Timeline Journeys

下列四个 QA 检查点应归入两条 required journey：`timeline-share-channel` 覆盖 active 菜单、payload 和单页打开；`timeline-risk-gating` 覆盖风险 / closed guard。

- [ ] `timeline-active-entry-menu`：低风险 active 详情页打开右上角系统菜单。
  - 步骤：准备 active、非 stale、非 reported、非 closed 的任务；进入详情页；打开右上角菜单；记录菜单项。
  - 期望：同时可见“发送给朋友”和“分享到朋友圈”；页面没有自制诱导分享按钮、弹层或奖励式扩散文案。
  - 证据：菜单截图或录屏，必须能看出任务状态、入口页面和菜单项。
- [ ] `timeline-active-payload`：触发 active 低风险任务的朋友圈分享 payload。
  - 步骤：从同一详情页触发“分享到朋友圈”；记录 `onShareTimeline` 实际返回或 DevTools 可 inspect 的分享信息。
  - 期望：payload 包含标题、必要 `query`、分享图信息；`query` 至少带任务 `id`、`from=share`、`source=timeline`、`shareChannel=timeline`；不得声称返回了自定义 `path`。
  - 证据：payload 日志、DevTools 面板截图、录屏中的分享预览，或无法 inspect 时的明确说明。
- [ ] `timeline-single-page-open`：从朋友圈或等价单页模式打开任务详情。
  - 步骤：使用真实朋友圈入口、DevTools 单页模式、场景值 1154 或项目约定的等价方式进入详情页；等待首屏稳定。
  - 期望：首屏可读到标题、地点 / 距离摘要、正文、图片或占位、状态、谨慎提示；无登录 / 无定位时不是空白页。
  - 证据：首屏截图或录屏，必须覆盖微信固定顶部 / 底部区域和核心内容。
- [ ] `timeline-risk-and-closed-guard`：风险、关闭和弱风险信号不开放或不鼓励 timeline。
  - 步骤：分别准备 `resolved`、`expired`、`hidden`、`stale` / `staleCount >= 3`、`reportCount > 0`、未达阈值的弱 stale / report 任务；打开详情页和菜单，必要时检查分享标题 / query。
  - 期望：closed / hidden 不鼓励公开扩散；stale、高 stale、高 report 明确降级为谨慎查看；弱 stale / report 也不得出现“请大家转发”“帮忙扩散”等动作召唤。
  - 证据：每个 fixture 的 post id、状态字段、菜单 / 标题 / 落地页截图或录屏；缺少某类 fixture 时写 `blocked` 和补数方案。

## Evidence 字段质量

- [ ] 每条 timeline journey 必须有 `id`、`title`、`status`、`route`（或真实结果中的等价入口字段）、`steps`、`expected`、`actual`、`evidence`、`risks`、`followUp`。
- [ ] `status` 允许值建议与现有 checker 对齐：真实结果中只允许 `passed`、`failed`、`blocked`；示例草稿可保留 `not_run`，但不能被当作真实结果。
- [ ] `passed.actual` 必须写真实观察，不得是 `Not run`、`TODO`、`待填写`、`placeholder` 或“应该可以”。
- [ ] `passed.evidence` 至少包含一种可核验材料：`screenshot`、`recording`、`payload`、`log`。
- [ ] 截图证据必须写清楚：本地 ignored 路径、拍摄时间、设备 / DevTools 环境、覆盖了哪个 UI 状态。
- [ ] 录屏证据必须写清楚：本地 ignored 路径、开始和结束动作、可见的关键判断点。
- [ ] 日志证据必须写清楚：日志来源、截取时间、关键字段和值；不要粘贴联系人、群、openid、unionid、手机号或精确住址。
- [ ] payload 证据必须写清楚：`title`、`query`、`imageUrl` / 默认图来源、是否缺失 `path`、来源参数、任务 id；不得只写“payload 正常”。
- [ ] `actual` 必须包含真实差异：看到什么、没看到什么、是否和 expected 一致；风险 journey 要逐项列出 fixture 的状态和观察结果。
- [ ] `passed` 的最低标准：真实运行过、证据可定位、actual 非占位、关键期望全部满足、没有无法解释的检查缺口。
- [ ] `blocked` 只用于环境或数据阻断：无法打开 DevTools service port、无可用真机、账号无朋友圈能力、缺少 fixture、CloudBase / 网络导致页面无法加载等。
- [ ] `blocked` 必须写 `blocker` 和 `followUp`：谁需要做什么、需要哪个设备 / 账号 / 数据、下一次如何复跑。
- [ ] 如果 DevTools 无法 inspect `onShareTimeline` payload，可记录为 passed 的前提是：有真实分享预览 / 单页入口证据，并在 `sharePayloadInspection` 写明工具限制、替代证据、仍未验证的字段；否则应记 `blocked`。
- [ ] 不允许用代码阅读、模拟函数返回、静态截图或旧版本证据替代本轮真实 DevTools / 真机 evidence。

## 单页模式 QA

- [ ] 单页模式进入时确认 tabBar 不渲染，页面仍能表达当前位置、任务状态和下一步可做什么。
- [ ] 未登录、游客态或本地 storage 隔离时，详情首屏仍展示任务核心内容，不要求先登录才可读。
- [ ] 拒绝定位、定位 API 不可用或场景限制下，页面不自动弹出阻断式授权链路；距离可降级为地点摘要或未知距离。
- [ ] `navigateTo`、`switchTab`、`reLaunch` 等在单页模式失败时，不影响继续阅读详情。
- [ ] 不在首屏自动调用联系人、群、电话、剪贴板、媒体选择、支付等受限或敏感 API。
- [ ] 微信固定顶部导航栏不遮挡标题、状态提示或返回 / 更多入口；底部固定栏不遮挡评论输入、主要操作或正文末尾。
- [ ] 图片、地图、评论区和底部操作栏在窄屏设备上不互相覆盖；滚动到首屏和底部各录一段证据。
- [ ] 云接口失败、任务找不到、隐藏或无权限时显示可读降级态，不出现空白页、无限 loading 或诱导分享兜底。

## 安全与合规

- [ ] 不新增或记录任何诱导分享 UI：不得有奖励、排行榜、强制转发、倒计时、群发暗示或“必须分享”语义。
- [ ] QA 不能伪造 UI passed：没有截图 / 录屏 / payload / 日志的 journey 不得写 passed。
- [ ] 风险态、争议态、closed 态不鼓励扩散；分享标题和落地页文案都应收敛为查看线索、状态已变化或不可查看。
- [ ] payload 不携带联系人、群、私聊上下文、openid / unionid、手机号、详细住址、评论全文、精确坐标或其他隐私字段。
- [ ] 丢失招领、高价值物品或疑似敏感内容只保留必要线索，不把联系方式、交付方式或私人信息放入 timeline 标题 / query。
- [ ] 证据文件如果含账号、昵称、头像、地理位置或云环境 id，提交前必须脱敏；真实文件仍保持 ignored/local。

## Checker 与模板更新指引

- [ ] 在 manual evidence schema 中新增 `timelineJourneys`，或将 timeline ids 加入 `journeys` 的 required 集合；字段名需保持稳定，方便 checker 输出具体缺口。
- [ ] Checker 应要求新增两条 timeline required journey，并在其中覆盖四类观察：active 菜单、active payload、单页打开、风险 / closed guard。
- [ ] Checker 应验证 timeline `passed` 的 evidence 类型和 `actual` 质量，不接受占位文本和空 evidence。
- [ ] Checker 应对 `sharePayloadInspection` 做显式判断：有 payload 证据则检查关键字段；无法 inspect 则要求原因、替代证据和未验证字段。
- [ ] Checker 应在无真实结果文件时继续不阻塞，但输出必须说明这不代表朋友圈 DevTools / 真机 UI passed。
- [ ] 模板应给出可复制的 fixture 字段：`activeLowRiskPostId`、`timelinePostId`、`weakStalePostId`、`weakReportPostId`、`closedPostIds`、`hiddenPostId`。
- [ ] 模板应保留 `environment` 的 DevTools 版本、base library、微信版本、设备型号、真机 / 模拟器、网络、CloudBase、数据来源。
- [ ] 模板中的示例状态只能是 `not_run` 或 `blocked`，并显著声明不是证据。
- [ ] Readiness 输出不得把 blocked draft、示例文件或自动 checker 通过描述为 timeline 已实测通过。

## 回归保护

- [ ] 现有五条 `from=share` receiver journeys 必须继续作为 required journeys：首跳接收、confirm 转化、comment 转化、二跳接收语境、普通 / 风险入口。
- [ ] 新增 timeline journeys 时，不得删除或放宽现有 receiver journeys 的 share payload、receiver guide、action strip、conversion prompt 检查。
- [ ] U 轮 `relayChannels` 仍需手测：confirm / comment 后 2-3 个接力场景建议可见，且不是联系人 / 群选择器。
- [ ] U 轮 `shareReason` 仍需手测：分享理由位于 target rows 与分享按钮之间，并随 confirm / comment 场景变化。
- [ ] U 轮 `receiverAction` 仍需手测：二跳 path 或 query 保留 `receiverAction=confirm` / `receiverAction=comment`，接收页文案能区分来源动作。
- [ ] Timeline 新证据不能替代 receiver evidence；两组 journey 可以共用同一测试环境，但每条都要有独立 actual 和 evidence 引用。

## 交付检查

- [ ] 开发 agent 更新 checker 后，至少运行对应 manual evidence checker、`node harness/check-harness.mjs`、`git diff --check`。
- [ ] QA agent 真实手测后，结果文件应记录分支、commit、testedAt、tester、环境、fixture、summary 聚合状态。
- [ ] 任何 skipped DevTools / 真机检查都要写成未验证风险，不得在总结里暗示已通过。
- [ ] 若本轮只能完成结构补充，最重要风险是：评测仍可能因为缺少真实 DevTools / 真机 timeline evidence 而停留在 99/100。
