# 朋友圈落地语境产品 Brief

日期：2026-06-17

## 背景

W 轮评测已经到 99/100，当前短板不在证据基础设施：W 已经把 V 轮新增的朋友圈系统渠道纳入手测 schema、七条 required journey 和 blocked/passed 判定。V 轮也已经补上真实朋友圈入口，timeline query 使用 `from=share&source=timeline&shareChannel=timeline`。

现在的问题是落地语境还没有吃到这个新增来源。当前 `utils/share-receiver.js` 对 `source=timeline` 没有专门分支，用户从朋友圈点进来时看到的仍是普通“来自转发”接收引导。对朋友圈这种弱关系、低上下文入口来说，这不够明确：用户容易把它当成广告、泛泛帖子或普通转发，而不是一条需要本地核对、补线索的附近任务。

## 产品假设

朋友圈入口和好友/接收者二跳不同。朋友圈通常是弱关系、异步曝光、上下文缺失：打开的人可能不知道发布者是谁，也不知道为什么自己会看到这条。落地页需要第一时间把语境补齐成“我是在朋友圈看到一条附近任务”，并把下一步收敛到本地核对和线索补充。

更好的 `source=timeline` receiver guide 应该让用户理解：

- 这是一条附近任务，不是广告或泛泛动态。
- 先看任务状态、确认信号和评论，别只看分享标题。
- 如果自己在附近，可以确认是否仍有效。
- 如果知道位置、时间、认领、绕行或求助补充，可以评论补线索。
- 如果不在现场，不要盲目背书；只在合适时转给更可能路过的人。

核心不是鼓励扩散，而是把朋友圈曝光转成一次谨慎的本地核对。

## 范围

本轮只调整 `source=timeline` 的 receiver guide 文案、语义优先级和自动检查。

范围内：

- 在 `from=share` 且 `source=timeline` 时，低风险 active 任务展示专门的朋友圈落地语境。
- 保持现有 `kicker`、`title`、`summary`、三行 `rows`、`note` 信息结构，不新增复杂 UI。
- 增加自动检查，证明 timeline 入口不会继续落到普通“来自转发”语境。
- 自动检查风险、closed、unknown 状态仍优先使用谨慎语义。
- 自动检查 U/R/S/T 的 receiver conversion、`source=receiver`、`receiverAction=confirm/comment` 语义不回退。

范围外：

- 不新增系统渠道；朋友圈渠道仍由 V 轮的 `onShareTimeline` 和 `shareChannel=timeline` 承担。
- 不新增按钮、弹窗、奖励、诱导分享、联系人读取、群选择器或复杂 UI。
- 不改变 `shareTimeline` 风险门控，不放宽 stale/report/closed/unknown 的 gating。
- 不改变普通 `from=share`、`source=receiver`、`source=confirm`、`source=comment` 的既有意图。
- 不新增归因模型、埋点、持久化字段或分享奖励。

## 低风险 Active Key Copy 要求

适用条件：`from=share`、`source=timeline`，且任务为低风险 active：`status === 'active'`，无强 stale，无遮挡举报风险，未 resolved/expired/hidden。

推荐语义：

- `kicker`：应明确是朋友圈入口，例如 `朋友圈看到`。
- `title`：应同时点出附近任务和核对动作，例如 `附近任务，先核对一下`。
- `summary`：应说明“这是朋友圈里看到的附近任务，先看状态和评论；在附近就确认，知道线索就评论”。不能写成平台背书或广告式召唤。
- 第一行 `rows`：说明为什么到你这里。语义应是“朋友圈里的人可能不都在现场，你可能刚好更接近地点或知道线索”。
- 第二行 `rows`：说明先做什么。语义应是“先看状态、确认信号和最新评论，再决定确认或补评论”。
- 第三行 `rows`：说明不在现场怎么办。语义应是“不在现场不要盲目确认；适合时转给更可能路过的人”。
- `note`：应收束风险，提醒“朋友圈只提供入口，转发前先核对状态和评论；能补线索优先补线索”。

建议文案骨架：

| 字段 | 建议 copy |
| --- | --- |
| `kicker` | `朋友圈看到` |
| `title` | `附近任务，先核对一下` |
| `summary` | `这条任务是从朋友圈点进来的，先看状态和评论。你在附近就帮忙确认，知道线索就补一条。` |
| `rows[0].label` | `为什么到你这` |
| `rows[0].value` | `朋友圈里看到的人不一定在现场，你可能更接近地点，或知道新的位置、时间和处理情况。` |
| `rows[1].label` | `先做什么` |
| `rows[1].value` | `先看任务状态、确认信号和最新评论；能现场核对就确认，知道更多就评论补线索。` |
| `rows[2].label` | `不在现场` |
| `rows[2].value` | `不要盲目确认；如果这条更适合别人核对，可以转给更可能路过的人。` |
| `note` | `朋友圈只是入口，转发前先核对状态和评论；有线索时，先补评论会更有用。` |

可接受变体：

- 可以按分类轻微调整标题，例如失物类强调“附近线索”，求助类强调“附近求助”，地点动态强调“附近动态”。
- 仍必须包含“朋友圈看到/附近任务/先核对状态评论/能确认或补线索/不在现场可转给更可能路过的人”这些语义。
- 不能出现“已验证、属实、放心转发、帮忙扩散、必须转发、转发有奖”等诱导、背书或奖励词。

## 风险、Closed 和 Unknown 状态

`source=timeline` 不能覆盖风险优先级。只要任务处于风险、closed 或未知状态，receiver guide 应继续沿用更谨慎的风险语义。

要求：

- `hidden`：强调已隐藏，只适合历史处理或给发布者/管理员看，不鼓励公开扩散。
- `resolved`：强调已关闭，只当历史结果参考，不鼓励继续转。
- `expired`：强调已过期，先看最新情况，不鼓励按旧信息传播。
- `reportCount >= 2`：强调已有较多举报，先核对评论和现场变化。
- `staleCount >= 3`：强调已有过时反馈，别把旧信息继续传开。
- 弱 stale、弱 report 或远端刷新失败：即使没有达到强风险阈值，也不应因为 `source=timeline` 生成鼓励性朋友圈文案。
- unknown 或 post 缺失：不生成 timeline 专属鼓励语境；宁可回落为空或谨慎文案。

判定原则：风险态的标题、摘要、rows、note 都应先解释风险，不因为“朋友圈看到”而鼓励扩散。

## 与 V/W/U/R/S/T 的关系

V 提供渠道：本 brief 不重新定义朋友圈分享能力，只消费 V 已有的 `source=timeline` 和 `shareChannel=timeline` 语义，让从朋友圈打开后的详情页更像“附近任务落地页”。

W 提供证据 schema：本 brief 不替代 W 的七条 journey 和真实手测证据要求。下一轮实现应把新增 timeline landing 语义纳入自动检查和真实手测记录，不能只靠口头说明。

U/R/S/T 的 receiver conversion 不回退：

- `source=receiver&receiverAction=confirm` 仍表达上一位刚确认。
- `source=receiver&receiverAction=comment` 仍表达上一位刚补线索。
- `source=confirm`、`source=comment` 仍保留原有首跳或接力语义。
- `from=share` 接收者完成 `confirm/comment` 后，`targetRows`、`relayChannels`、`shareReason`、二跳 path 和 action strip 不应被 timeline 文案覆盖。
- 普通转发入口没有 `source=timeline` 时，不应被误判为朋友圈入口。

本轮是 X 组产品补语境，不是重做 V 的渠道、W 的证据或 U/R/S/T 的接收者转化。

## 自动检查要求

下一轮实现应增加或更新自动检查，至少覆盖：

1. `source=timeline` 低风险 active 会生成 timeline 专属 guide，不再只是 `kicker: 来自转发`。
2. 低风险 active 的 `kicker/title/summary/rows/note` 包含朋友圈、本地核对、状态评论、确认、补线索和更可能路过的人这些关键语义。
3. timeline 专属文案不包含事实背书、诱导分享、奖励分享、强制扩散或联系人/群关系暗示。
4. `hidden/resolved/expired/stale/report/unknown` 等状态下，风险语义优先，不能因为 `source=timeline` 出现鼓励性扩散文案。
5. `source=receiver` 和 `receiverAction=confirm/comment` 的既有 guide 仍保持差异化，不被 timeline 分支覆盖。
6. 普通 `from=share`、`source=confirm`、`source=comment` 和无来源入口不回退。
7. 若检查 timeline query，仍应只要求 V/W 已定义的 `from=share&source=timeline&shareChannel=timeline`，不新增身份、联系人、群、评论正文或精确隐私字段。

## 下一轮评测标准

下一轮评测不应只问“朋友圈菜单是否存在”，而应补看朋友圈落地语境是否让用户知道自己该做什么。

通过标准：

- 从 `from=share&source=timeline&shareChannel=timeline` 打开低风险 active 详情页，首屏 receiver guide 明确是“朋友圈看到的附近任务”。
- 用户能从 guide 中读出顺序：先看状态和评论，再确认或补线索，最后才在合适时转给更可能路过的人。
- 风险、closed、unknown 任务不因为 timeline 来源而变得更鼓励扩散。
- V 的 timeline 渠道证据、W 的 evidence schema、U/R/S/T 的 receiver conversion 全部不回退。
- 自动检查能稳定防止 timeline 入口回落成普通“来自转发”。

扣分标准：

- 低风险 active 仍显示普通 `来自转发`，没有朋友圈语境。
- 文案只说“分享/转发”，没有附近任务、本地核对、状态评论或补线索。
- 文案把朋友圈写成扩散任务，出现强诱导或事实背书。
- 风险或 closed 状态因为 `source=timeline` 出现“继续转给更多人”之类鼓励。
- 为了优化落地页新增按钮、奖励、联系人读取、系统渠道或改变 risk gating。
- 实现只改文案，没有自动检查保护。

## 真实手测要求

真实手测应继续按 W 的 evidence schema 记录，不能用自动 checker 通过替代 UI 通过。

建议手测：

1. 低风险 active：用真实或等价入口打开 `/pages/detail/detail?id=<postId>&from=share&source=timeline&shareChannel=timeline`，截图记录 receiver guide 的 `kicker/title/summary/rows/note`。
2. 核对落地理解：确认首屏能读出“朋友圈看到”“附近任务”“先看状态和评论”“在附近可确认”“知道线索可评论”“不在现场可转给更可能路过的人”。
3. 风险反例：用 weak stale、weak report、`stale`、`resolved`、`expired`、`hidden`、unknown post 或远端刷新失败 fixture 打开同类 timeline 入口，记录没有鼓励扩散。
4. 回归 U/R/S/T：同一 commit 下跑 receiver confirm/comment journey，确认 `source=receiver`、`receiverAction`、`targetRows`、`relayChannels`、`shareReason` 和二跳分享语义仍在。
5. 渠道证据：继续保留 V/W 要求的朋友圈菜单、payload、单页模式和风险 no-timeline 证据；本 brief 只新增落地页文案截图和语义观察。

如果 DevTools 或真机环境无法真实打开朋友圈卡片，应把 timeline landing 记录为受限或 blocked，并明确哪些只是 query 模拟，不能写成完整 UI passed。
