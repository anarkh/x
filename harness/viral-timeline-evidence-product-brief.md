# 朋友圈真实渠道证据 Product Brief

日期：2026-06-17

## 目标

W 轮不再改分享文案，不新增产品 UI；目标是把 V 轮已经新增的朋友圈系统渠道纳入 ignored local manual evidence schema 和 DevTools run package。评测者必须能按固定流程记录：低风险 active 任务是否真的出现朋友圈菜单、`onShareTimeline` payload 是否正确、朋友圈单页模式是否可读、风险/闭合态是否不开放 timeline，以及 U 轮 `from=share` 接收者链路是否没有回退。

## 产品假设

V 轮的高杠杆点已经完成：详情页有 `onShareTimeline`，低风险 active 才开启 `shareTimeline` 菜单，timeline query 使用 `id=<postId>&from=share&source=timeline&shareChannel=timeline`，风险态 payload 保守。此时继续调标题或描述，边际收益低于补证据 schema。

原因：

- 当前 99/100 的主要扣分不是“文案不够好”，而是没有 DevTools/真机菜单截图、朋友圈卡片、单页模式、真实 query/payload、转化数据。
- 没有 schema 时，后续 agent 容易把自动检查、blocked draft、DevTools readiness 或口头描述误写成 UI passed。
- 朋友圈是系统渠道，必须用真实环境证据证明；产品价值来自“可验证的渠道存在”，不是又一轮更顺耳的分享话术。
- W 轮应把 V 的扣分点转成必填字段和必跑 journey，让评测从“相信实现”变成“检查证据”。

## 建议新增 Required Journeys

在现有五条 `from=share` / receiver journey 之外，新增两条 timeline required journey。它们不是替代原五条，而是扩展同一个传播证据包：原五条继续证明 U 轮接收者首跳、确认/评论转化、二跳语境、普通/风险入口；新增两条证明 V 轮朋友圈系统渠道和风控边界。

### `timeline-share-channel`

名称：低风险 active 任务的朋友圈真实渠道。

入口：低风险 active 任务详情页，任务满足 `status === 'active'`、`staleCount === 0`、`reportCount === 0`。

关键观察：

- 系统菜单同时出现“发送给朋友”和“分享到朋友圈”。
- `onShareTimeline` 返回 title/query/image，query 至少包含 `id=<postId>&from=share&source=timeline&shareChannel=timeline`。
- 从朋友圈卡片或等价 DevTools/真机入口打开后进入详情页单页模式，`tabBar` 不渲染也能读懂标题、状态、地点、确认/过时/举报信号和评论线索。
- 原 U 轮链路不回退：`from=share` receiver confirm/comment 后仍展示接力语境，二跳 payload 仍保留 `source=receiver&receiverAction=confirm/comment`。

### `timeline-risk-gating`

名称：风险或闭合任务不开放朋友圈。

入口：弱 stale、弱 report、`stale`、`resolved`、`expired`、`hidden`、状态缺失或远端刷新失败的详情页 fixture。

关键观察：

- 系统菜单不出现“分享到朋友圈”，或环境无法触发时必须记录明确原因。
- 如仍允许发送给朋友，payload 和文案必须是谨慎语义，不鼓励继续扩散。
- 不能只因为页面可打开、普通分享可用、或 checker 通过，就判定 timeline 风控 passed。
- 原 `ordinary-and-risk-entries` journey 继续检查 receiver guide/action strip 不鼓励扩散；本 journey 额外检查系统 timeline 菜单缺失。

## Timeline Evidence 必填项

每条 timeline journey 的结果必须写入 ignored local evidence 文件，例如 `harness/manual-test-results.local-viral-journey*.json`。example、readiness、dry-run、blocked draft 不可作为真实结果。

### 低风险 timeline 必填

- 菜单证据：截图、录屏或可复查描述，明确“发送给朋友”和“分享到朋友圈”是否同时存在；记录设备、基础库、DevTools/真机环境。
- Payload 证据：`onShareTimeline` 的 `title`、`query`、`imageUrl` 或无图说明；query 必须能看到 `id`、`from=share`、`source=timeline`、`shareChannel=timeline`，且不含联系人、群、用户身份、评论正文或精确隐私字段。
- 单页模式证据：从朋友圈卡片或等价入口打开后的页面状态，说明是否为单页模式、`tabBar` 是否缺失、核心任务信息是否仍可读。
- U 链路不回退证据：同一次手测包内记录 receiver confirm/comment journey 仍通过，或引用同一 commit 下已有有效 evidence；不能只检查 timeline 后跳过原五条。
- 环境限制说明：若 DevTools 无法暴露真实朋友圈卡片或 payload，必须写明限制、替代观察方式和仍未验证的部分。

### 风险/闭合 no timeline 必填

- Fixture 证据：post id、状态、`staleCount`、`reportCount`、闭合原因或远端刷新失败原因。
- 菜单缺失证据：截图、录屏或可复查描述，明确“分享到朋友圈”不存在；若系统环境无法打开菜单，写明无法触发原因，不能填 passed。
- Payload 证据：若 `onShareTimeline` 无法触发，应记录“未生成 timeline payload”；若异常生成了 payload，应记录为 failed 并附实际 title/query/image。
- 风险语义证据：普通分享或页面文案如存在，必须说明其没有鼓励继续扩散。
- U 风控不回退证据：原 `ordinary-and-risk-entries` 中 receiver guide/action strip 不应在风险态鼓励扩散；该结论必须与 timeline 缺失一起记录。

## 状态语义

### `passed`

表示真实 DevTools 或真机观察已经覆盖该 journey 的关键行为，且 evidence 非空、可复查、与当前 branch/commit/environment 对齐。Timeline passed 必须包含菜单、payload、单页模式或风险态菜单缺失证据；低风险 journey 还必须说明 U 链路不回退。

### `failed`

表示已经进入真实 journey，并观察到与预期相反的产品行为。例如低风险 active 看不到 timeline 菜单、timeline query 缺少 `shareChannel=timeline`、风险/闭合态仍出现 timeline、单页模式核心信息不可读、或 U 轮 confirm/comment 二跳链路回退。Failed 必须写实际观察、证据和下一步 follow-up。

### `blocked`

表示当前无法得出 UI 结论，不等于 UI passed。典型情况包括 DevTools service port 不可用、系统分享面板无法打开、真机权限/登录态/基础库限制、fixture 不可准备、朋友圈卡片或 payload 当前环境无法观察。Blocked 必须写 blocker 和 follow-up；不能因为 blocked draft 合法、schema 可解析或 run package exit 0，就把 UI 写成 passed。

## DevTools Run Package 要求

- Required journeys 输出应从五条扩为七条，并固定包含 `timeline-share-channel` 与 `timeline-risk-gating`。
- Evidence checker 必须校验 timeline journey 唯一性、状态字段、非空 evidence、菜单证据、payload 字段、单页模式字段、风险态菜单缺失字段、U 链路不回退说明和 `summary.overallStatus` 聚合。
- 无 ignored local result 文件时，运行包仍可 success，但只能说明“没有检查真实 UI 结果”，不得生成 timeline passed。
- 有 blocked timeline journey 时，`overallStatus` 应聚合为 blocked，除非另有 failed。
- Readiness、diagnostic、dry-run、draft-created、checker-passed 都必须显式声明：它们不等于朋友圈菜单或单页模式真实通过。

## 下一轮评测重点

下一轮评测不应再问“朋友圈文案是否更像传播文案”，而应检查 W 是否把 V 的 99 扣分点变成可执行、可校验的手测流程：

1. 是否必须记录低风险 active 的 timeline 菜单、payload 和单页模式。
2. 是否必须记录风险/闭合态没有 timeline。
3. 是否把 blocked 和 passed 严格区分，避免环境阻塞被误判为 UI 通过。
4. 是否把新增 timeline journey 纳入同一份 ignored local evidence，而不是游离在口头结论里。
5. 是否明确要求原五条 U 轮 receiver journeys 不回退。

核心判定：W 轮成功不是“证明朋友圈已经转化”，而是让评测者无法跳过 V 轮真实渠道证据；只要缺菜单、缺 payload、缺单页模式、缺风险态反证或缺 U 链路回归检查，就不能再给完整通过结论。
