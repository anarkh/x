# 朋友圈分享产品 Brief

日期：2026-06-17

## 背景

U 轮已经把 `from=share` 接收者完成 `confirm` 或 `comment` 后的二跳提示做到接近可用上限：页面会展示 `targetRows`、`relayChannels`、`shareReason`，并通过 `from=share&source=receiver&receiverAction=confirm/comment` 保留二跳路径。用户评测 99/100 的主要缺口不是“还不知道转给谁/哪里”，而是仍然没有新增真实传播渠道，也没有系统分享面板和真实分享 payload 的证据。

V 轮探索在合规边界内补上微信原生“分享到朋友圈”。这不是替代 U 轮接收者接力，而是在详情页为低风险 active 任务增加一个更外层、弱关系、异步曝光的入口。

## 官方约束

- 朋友圈分享从基础库 `2.11.3` 开始支持；低版本必须退化为仅发送给朋友。
- 页面必须同时允许“发送给朋友”即 `Page.onShareAppMessage`，和“分享到朋友圈”即 `Page.onShareTimeline`，才可分享到朋友圈。
- `wx.showShareMenu` 的 `menus` 若展示 `shareTimeline`，也必须展示 `shareAppMessage`；禁止只打开朋友圈菜单。
- `onShareTimeline` 只能返回 `title`、`query`、`imageUrl`、`promise`，不支持自定义 `path`。朋友圈打开是小程序单页模式，`tabBar` 不渲染，很多能力受限，不适合承载强交互流程。
- 不做诱导分享、强制分享、奖励分享；不做联系人或群选择器；不自动触发分享面板。

## 产品假设

朋友圈可能带来自发裂变，是因为它降低了“选择具体接收人”的成本。附近任务有一类天然适合弱关系曝光：失物、地点动态、临时求助、路况或门店状态。发布者或接收者不一定知道该发给谁，但朋友圈里的邻居、同路线朋友、刚经过的人，可能自然补一条确认、评论或再转给更合适的人。

它和 U 轮 receiver relay 的差异很明确：

- U 轮是高意图、窄范围、动作后的二跳：接收者已经完成 `confirm/comment`，页面再建议转给哪类人、怎么说。
- V 轮是低意图、宽曝光、系统渠道补齐：用户可以直接通过微信原生菜单发到朋友圈，获得真实渠道和 payload 证据。
- U 轮解决“转给谁/怎么说”的决策成本；V 轮解决“是否存在一个真实可用的外部传播面”的渠道成本。
- V 轮不应把朋友圈当成更强的二跳转化页。朋友圈入口更适合让下一位先读懂任务、看状态和评论，再决定是否行动。

## 推荐实现范围

### 入口范围

- 只在任务详情页开放朋友圈分享，不扩到地图、发布页、个人页或活动页。
- 仅低风险 `active` 任务展示 `shareTimeline` 菜单：`status === 'active'`，`staleCount === 0`，`reportCount === 0`。
- `stale`、弱 stale、弱 report、`resolved`、`expired`、`hidden`、状态缺失或远端刷新失败时，不展示朋友圈入口；可以保留发送给朋友，但文案必须谨慎。
- 若基础库低于 `2.11.3` 或环境不支持 `onShareTimeline`，退化为现有 `onShareAppMessage`。

### 菜单与生命周期

- 详情页继续实现 `onShareAppMessage`，并新增 `onShareTimeline`。
- 只有决定开放朋友圈时，调用 `wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })`。
- 不开放朋友圈时，不要在 `menus` 中放 `shareTimeline`；如需要保留现有分享，只展示 `shareAppMessage`。
- 菜单显隐应基于当前加载后的最新任务状态，而不是只看入口 query。

### Timeline query

`onShareTimeline` 不支持自定义 `path`，因此详情页分享必须依赖当前详情页路径和返回的 `query`。推荐最小 query：

```text
id=<postId>&from=share&shareChannel=timeline
```

如果当前页面本身来自 U 轮接收者二跳，且用户已经完成 `confirm/comment`，可以在 query 中保留既有语义：

```text
id=<postId>&from=share&source=receiver&receiverAction=<confirm|comment>&shareChannel=timeline
```

规则：

- `from=share` 继续作为“分享入口”的通用门，复用现有接收侧引导。
- `shareChannel=timeline` 只用于区分朋友圈来源，不改变 `source=receiver` 和 `receiverAction` 的含义。
- query 不携带联系人、群、用户昵称、头像、手机号、精确坐标或评论正文。
- 下一位从朋友圈打开后，仍先走现有 `from=share` 接收者逻辑；只有完成 `confirm/comment` 后，才出现 U 轮的 `targetRows`、`relayChannels`、`shareReason`。

### 标题与图片策略

标题只表达“需要核对/有线索/看最新评论”，不表达事实保证。

建议标题：

- 普通低风险 active：`附近有一条信息需要核对`
- `lost_found`：`附近有失物线索，帮忙核对`
- `help_needed`：`附近有人求助，看看能否帮上`
- `street_update`：`附近有地点动态，帮忙看是否仍有效`
- `check_in`：`附近有地点反馈，帮忙补充一下`
- 接收者刚确认后：`刚有人确认，帮忙再核对`
- 接收者刚评论后：`有新线索，先看最新评论`

避免标题：

- `已确认属实，快转朋友圈`
- `平台已验证，放心扩散`
- `帮我转发领福利`
- `必须转发给附近的人`

`imageUrl` 优先使用安全的分类默认图或应用默认分享图。含隐私风险的失物照片、个人头像、聊天截图、可识别住址门牌等，不应作为朋友圈卡片图。没有安全图片时可以不返回 `imageUrl`。

### 单页模式处理

朋友圈打开后是小程序单页模式，不能假设 `tabBar` 存在，也不能把它当完整 app 首页。详情页在这个模式下至少要做到：

- 标题、地点名、状态、确认/过时/举报信号、评论摘要可读。
- 风险或关闭状态优先可见，不被分享引导覆盖。
- 不依赖 `switchTab`、复杂跨页跳转、发布流程或登录后强交互才能理解任务。
- 若某些互动能力在单页模式受限，文案应引导“先核对状态和评论”，而不是承诺一定能直接完成强交互。

## 成功标准

- 自动检查：详情页同时存在 `onShareAppMessage` 和 `onShareTimeline`；任何包含 `shareTimeline` 的 `wx.showShareMenu` 配置也包含 `shareAppMessage`。
- 自动检查：`onShareTimeline` 返回值只使用 `title/query/imageUrl/promise`，不返回 `path`。
- 自动检查：timeline query 至少包含 `id`、`from=share`、`shareChannel=timeline`；接收者二跳场景可保留 `source=receiver&receiverAction=confirm/comment`，但不得新增联系人、群或用户身份字段。
- 自动检查：弱 stale、弱 report、`stale/resolved/expired/hidden`、状态缺失或刷新失败时不暴露 `shareTimeline` 菜单，也不生成鼓励性朋友圈标题。
- 自动检查：标题不包含诱导、奖励、事实保证或强制扩散词，例如“属实、已验证、可靠、放心转发、领福利、必须转发、扩散有奖”。
- 手动评测：基础库 `2.11.3+` 的 DevTools 或真机里，低风险 active 详情页系统菜单同时出现“发送给朋友”和“分享到朋友圈”。
- 手动评测：从朋友圈卡片打开后进入当前详情页单页模式，`tabBar` 不渲染也能读懂任务、状态和评论线索，页面不把用户卡在需要多页导航的流程里。
- 手动评测：U 轮链路不回退；`from=share` 接收者完成 `confirm/comment` 后仍展示 `targetRows`、`relayChannels`、`shareReason`，二跳发送给朋友路径仍保留 `source=receiver&receiverAction`。
- 手动评测：真实分享证据能记录菜单截图、分享卡片标题、打开后的 query 或调试日志；若环境不能真实发朋友圈，必须标注为 DevTools 辅助验证，不得算作真机通过。

## 边界和反模式

- 不诱导分享：不写“帮我扩散一下”“转发后更多人帮你”“分享到朋友圈让任务更快解决”等压力文案。
- 不奖励分享：不做积分、徽章、优先展示、解锁功能、抽奖或任何转发收益。
- 不强制分享：发布、确认、评论、查看评论、关闭弹窗都不能以分享到朋友圈为前置条件。
- 不自动触发：不在 `confirm/comment` 后自动拉起分享面板，不做倒计时、弹窗轰炸或默认勾选。
- 不做联系人或群选择器：不读取、不推断、不展示具体联系人、微信群、群名、头像或“你的某某群”。
- 不泄露隐私：朋友圈标题、query、卡片图不带发布者身份、接收者身份、评论正文、联系方式、精确门牌或敏感图片。
- 不把 timeline 当完整交互页：朋友圈入口首先是可读详情，不承诺完整地图、tabBar、发布、管理或复杂登录链路可用。
- 不让风险任务继续扩散：弱 stale/report 也要停止朋友圈鼓励；closed 状态只允许结果说明，不出现“继续转发/帮忙扩散”。
- 不用朋友圈替代定向接力：U 轮的 `relayChannels` 仍是“转给哪类人”的建议，朋友圈只是新增系统渠道。

## 用户评测重点：如何比较 U 与 V

评测 U 时，重点看接收者完成行动后是否知道“转给谁、为什么、怎么说”。评测 V 时，重点要换成“是否真的多了一个合规的系统传播渠道，并且没有破坏 U 的接力链路”。

建议评测顺序：

1. 先跑 U 轮基线：从 `/pages/detail/detail?id=<activeLowRiskPostId>&from=share` 进入，分别完成 `confirm` 和 `comment`，确认 `targetRows`、`relayChannels`、`shareReason` 和二跳 `receiverAction` 没有回退。
2. 再看 V 轮新增：同一低风险详情页打开系统菜单，必须看到“发送给朋友”和“分享到朋友圈”同时存在，并记录证据。
3. 检查朋友圈 payload：标题克制，query 有 `id/from=share/shareChannel=timeline`，无自定义 `path` 假设，无联系人/群/用户身份字段。
4. 从朋友圈入口打开详情页或用等价调试入口模拟，确认单页模式下内容可读、风险优先、无 tabBar 也不破版。
5. 用 stale、弱 report、resolved、expired、hidden 任务做反向评测，确认朋友圈入口消失或转为非鼓励语义。

核心判定：U 是“更会建议接力”，V 必须证明“真的多了朋友圈这个渠道”。如果 V 只是把页面文案写成“可以发朋友圈”，但没有 `onShareTimeline`、没有菜单证据、没有真实 query 证据，应判为没有补上本轮缺口。
