# 接收者二跳可转述理由产品 Brief

日期：2026-06-16

## 背景

当前 Street Tasks 是原生微信小程序，详情页分享接收链路已经具备三层语义：

- `from=share` 表示用户从分享打开任务详情。
- 分享接收者完成 `confirm` 或 `comment` 后，会看到 `receiverConversionPrompt`，其中已有 `targetRows` 用来说明推荐转给谁、为什么可信、下一位先看什么。
- 二跳路径已保留 `from=share&source=receiver&receiverAction=confirm/comment`，让下一位接收者能区分上一位刚确认还是刚补线索。

下一轮不要继续优先增加参数。真实 WeChat 分享面板不保证能预填聊天文本；即使路径和标题携带了更多语义，用户在转给下一位或发到群里时，仍然要自己组织一句“为什么转给你”。本轮目标是给完成行动的接收者一条可以直接转述的短理由，降低二次分享的表达成本。

## 产品假设

“可转述理由”比继续增加参数更可能提升二跳，因为它解决的是发送者当下的表达问题，而不是下一位页面解析问题。

继续加参数的价值主要发生在下一位打开页面之后：它能让系统知道来源、动作和语境，但发送者在点击微信分享、选择聊天对象、补一句说明时看不到这些参数。参数越多，也越容易把传播链路做成技术归因，而不是用户自然愿意说出口的理由。

短理由的价值发生在转发前和转发时：用户可以直接照着说、稍微改写后发到聊天里，或者只把它当作判断“该转给谁”的提示。它不依赖系统分享面板预填聊天文本，也不要求读取联系人、群关系或新增复杂归因。对低风险任务来说，一句克制、可读、能解释刚刚动作的理由，比更精细的 query 更接近真实分享场景。

## 触发条件

只在以下条件全部满足时出现鼓励性可转述理由：

- 当前详情入口来自分享，即 `from=share`。
- 用户刚完成一次有效 `confirm` 或提交一次有效 `comment`。
- 当前任务仍是 `active`。
- 当前任务没有任何 stale/report 信号：`staleCount` 为 0，`reportCount` 为 0，且状态不是 `stale`。
- 当前 `receiverConversionPrompt.shouldRelay` 为真，并继续使用已有二跳路径语义：`from=share&source=receiver&receiverAction=confirm/comment`。

不触发场景：

- 普通地图、列表、个人页、活动页等非分享入口。
- 用户只是浏览、只打开评论区、或未成功完成 `confirm/comment`。
- 用户刚完成的是 `stale` 或 `report`。
- 任务在动作后变为风险态、关闭态或无法确认当前状态。
- 为了生成理由而新增联系人读取、群关系推断、用户身份展示或更多分享 query 参数。

## 文案规则

可转述理由必须是一句短文本，目标是“用户能直接说给下一位听”，不是系统证明。

规则：

- 短：建议 12 到 28 个汉字，最多一行主信息；长标题、长地点和评论正文不应拼进理由。
- 可读：使用口语化表达，像用户会发在聊天里的句子，不写成后台标签或埋点说明。
- 可转述：从发送者视角或自然第三人称出发，例如“我刚确认过，帮忙再核对一下”。
- 不夸大：不能把确认写成事实保证，不能把评论写成验证结果，不能出现“属实”“已验证”“可靠”“放心转发”“官方确认”等表达。
- 区分动作：`confirm` 讲“刚确认/刚有确认信号，适合再核对”；`comment` 讲“刚补线索/有新评论，下一位先看最新评论”。
- 不泄露隐私：不展示上一位接收者身份，不摘录可能含隐私的评论正文，不暗示系统知道具体联系人。
- 不替代 `targetRows`：短理由用于转述；`targetRows` 继续承担推荐对象、理由和下一位查看线索的结构化说明。

建议示例：

- `confirm`：`我刚确认过，帮忙再核对一下`
- `confirm`：`这条刚有确认，看看你能不能帮`
- `comment`：`我刚补了线索，你先看最新评论`
- `comment`：`这条有新线索，帮忙看一下`

避免示例：

- `已确认属实，可以放心转发`
- `平台已验证，快帮忙扩散`
- `上一位证明这是真的`
- `评论已经确认信息可靠`

## 风险边界

任何风险或关闭信号都优先于二跳增长目标。以下状态不能出现鼓励性可转述理由，也不能出现“继续接力”“帮忙转发”一类公开扩散 CTA：

- `stale` 状态。
- `staleCount > 0` 的弱 stale 信号，即使还没达到 stale 阈值。
- `reportCount > 0` 的弱 report 信号，即使还没达到 hidden 阈值。
- `resolved`。
- `expired`。
- `hidden`。
- 用户刚执行 `stale` 或 `report`。
- 状态缺失、远端状态刷新失败、或动作后状态无法确认。

这些场景可以显示谨慎说明，例如“先核对最新情况，不建议继续公开转发”，但它不能作为可复制的鼓励性分享理由，也不能被写入 share title、share reason 或 receiver conversion 主 CTA。

## 验收标准

- 低风险 `from=share` 接收者完成 `confirm` 后，`receiverConversionPrompt` 出现一条短理由，语义强调“刚确认/可再核对”，且不宣称事实可靠。
- 低风险 `from=share` 接收者完成 `comment` 后，`receiverConversionPrompt` 出现一条短理由，语义强调“刚补线索/先看最新评论”，且不把评论包装成证明。
- `confirm` 和 `comment` 的理由文本不同，用户能看出动作差异。
- 理由不依赖 WeChat 分享面板预填聊天文本；即使系统面板只展示原生分享卡片，页面内也能让用户看到这句可转述理由。
- 二跳路径继续沿用已有语义，不因本轮新增更多参数：`from=share&source=receiver&receiverAction=confirm/comment`。
- `receiverConversionPrompt.targetRows` 继续保留，短理由不替代推荐对象、结构化理由和下一位查看线索。
- 普通入口、非 `from=share`、未完成行动、`stale/report` 动作、弱 stale/report、`stale/resolved/expired/hidden` 都不出现鼓励性理由。
- 文案不出现事实保证、官方认证、放心转发、具体用户身份、联系人关系或聊天群推断。
- 窄屏下理由可以完整换行，不挤压任务主体、风险提示和分享按钮。

## 需要更新的自动检查

- 更新 `scripts/check-receiver-conversion.mjs`：断言低风险 `confirm/comment` conversion prompt 都包含短理由；两类理由不同；长度受控；不包含“属实、已验证、可靠、放心转发、官方确认”等禁用词；风险态和弱 stale/report 下理由为空或仅为非鼓励性谨慎文案。
- 更新 `scripts/check-viral-journey-evidence.mjs`：在首跳 `from=share` 完成 `confirm/comment` 的链路模型中检查短理由存在，并继续检查 `targetRows`、互斥 CTA 和 `receiverAction` 路径语义不回退。
- 更新 `scripts/check-share-receiver.mjs` 或接收侧相关检查：确认下一位 `source=receiver&receiverAction=confirm/comment` 文案仍区分动作，但不把上一位的短理由误读成事实证明。
- 更新 `scripts/check-viral-journey-manual-evidence.mjs` 的证据 schema：允许手测记录页面内看到的 share reason 文案，同时继续标注真实 WeChat 分享面板是否无法预填聊天文本；不得把“面板未预填”判为功能失败。
- 如 readiness 脚本扫描传播链路文档或必备检查项，需要把本 brief 和新增短理由检查纳入对应文件存在性与语义扫描。

自动检查只能证明 helper 输出、互斥条件、禁用词和路径语义没有回归；真实微信分享面板、真机展示、用户是否会手动转述以及二跳转化提升仍需要 DevTools、真机或数据验证。
