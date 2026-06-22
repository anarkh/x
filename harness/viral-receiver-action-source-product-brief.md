# 接收者二跳 Action 来源语义产品 Brief

日期：2026-06-16

## 背景

R 组已把 `from=share` 接收者完成 `confirm` 或 `comment` 后的 `receiverConversionPrompt` 升级为三行目标化接力提示：`推荐转给`、`为什么可信`、`下一位先看`。当前二跳分享 path 为 `/pages/detail/detail?id=<id>&from=share&source=receiver`，能表达“这来自上一位接收者的接力”，但还不能表达上一位刚完成的是确认还是补线索。

本 brief 探索是否在二跳 path 上增加动作来源语义，例如 `receiverAction=confirm` 或 `receiverAction=comment`，让下一位打开时看到更具体的接力语境。

## 用户问题与产品假设

`source=receiver` 的语义偏泛，只能告诉下一位“这是一条接收者接力来的任务”。下一位仍然不知道上一位到底贡献了什么：是刚确认过任务仍有参考价值，还是刚补了一条新的位置、时间、认领、绕行或求助线索。

产品假设是：如果二跳 path 额外携带上一位接收者刚完成的动作，下一位会更容易理解这次接力为什么现在发生，也更容易判断下一步先做什么。`confirm` 可以强化“刚有人给了一个仍有参考价值的信号”，`comment` 可以强化“刚有人补了新线索，先看最新评论”。这应提升信任理解和下一步行动理解，但不能把用户动作包装成事实保证。

## 适用场景

- 只适用于 `from=share` 进入详情的接收者。
- 只在接收者完成有效 `confirm` 或有效 `comment` 后，由 `receiverConversionPrompt` 生成二跳分享 path。
- 只针对 `active` 且低风险任务：无 stale 状态、无过时信号、无举报信号、未进入 `resolved` / `expired` / `hidden` 等 closed 状态。
- 只承担二跳接力语境说明，不承担普通详情页的分享、发布者扩散或风险态传播。

## 非适用场景

- 普通详情入口、地图/列表/个人页进入详情，或没有 `from=share` 的入口。
- `from=publish` 发布者成功页扩散路径。
- 接收者只是浏览，没有完成 `confirm` 或 `comment`。
- 接收者刚做的是 `stale` 或 `report`；这类动作应抑制公开扩散，而不是成为传播语境。
- 任务已 `stale`、有任意过时/举报风险，或已 `resolved`、`expired`、`hidden`。
- 任何需要读取通讯录、联系人、群关系、用户身份或昵称来解释来源的场景。

## 参数语义建议

推荐 query 名：`receiverAction`

允许值：

- `confirm`：上一位接收者完成了确认动作。
- `comment`：上一位接收者提交了有效评论或线索。

与现有参数的关系：

- `from=share` 仍表示当前打开详情页是分享入口。
- `source=receiver` 仍表示这条分享来自上一位接收者完成行动后的二跳接力。
- `receiverAction` 是 `source=receiver` 的可选细分语义，只描述触发这次二跳的动作类型。
- 建议二跳 path 形态为 `/pages/detail/detail?id=<id>&from=share&source=receiver&receiverAction=<confirm|comment>`。
- 当 `source !== receiver` 时，应忽略 `receiverAction`。
- 当 `receiverAction` 缺失或不是允许值时，应回落到现有 `source=receiver` 泛化接力文案。
- 不建议使用 `action`、`sourceAction` 等更宽泛名称，避免和详情页已有 trust action、comment action 或事件处理混淆。

隐私边界：

- query 不携带用户 id、openId、昵称、头像、手机号、群 id 或联系人信息。
- 文案只说“上一位接收者”或“有人刚刚”，不展示具体身份。
- 不读取通讯录，不推断关系链，不暗示系统知道应该转给哪一个具体联系人。

## 下一位接收者文案建议

### `receiverAction=confirm`

语气重点：上一位给了一个“仍有参考价值”的信号，但不是事实保证。

建议文案：

- 标题：`上一位刚确认过这条任务`
- 说明：`这不是平台保证，但说明有人刚看完后认为仍值得参考。`
- 下一步：`先核对地点、时间、确认数和过时信号，再决定是否能帮上忙。`
- 行动提示：`如果你也在附近，可以再确认一次；如果发现不准，标记过时。`

避免文案：

- `已确认属实`
- `信息可靠`
- `已经被验证`

### `receiverAction=comment`

语气重点：上一位刚补了线索，下一位应优先看最新评论。

建议文案：

- 标题：`上一位刚补了一条线索`
- 说明：`打开后先看最新评论，里面可能有位置、时间、认领、绕行或求助补充。`
- 下一步：`再结合任务状态和过时/举报信号判断是否继续行动。`
- 行动提示：`如果你知道更多，可以继续补线索；如果信息已变化，标记过时。`

避免文案：

- `线索已经确认`
- `评论证明这条是真的`
- `可以放心转发`

### 缺失或未知 `receiverAction`

保持现有泛化接力语境：

- 标题：`有人把这条任务接力给你`
- 说明：`先看任务状态、确认数和评论，再决定是否能帮忙或是否需要谨慎。`

## 风险边界

- 不能把“用户确认”写成事实保证，只能写成“有人刚给出确认信号”。
- 不能因为 `receiverAction=confirm` 就隐藏 stale/report/closed 风险；风险信号仍应优先展示。
- 不能让 `stale`、`report`、`resolved`、`expired`、`hidden` 继续扩散；这些状态下应不生成带接力鼓励的二跳 path，也不展示鼓励性 CTA。
- 不能把 `comment` 包装成事实验证；评论只是补充线索，下一位仍需核对。
- 不能泄露上一位接收者身份，也不能让用户误以为系统读取了通讯录或群关系。
- 不能让普通入口、`from=publish` 或风险态承担接收者二跳转化目标。

## 验收标准

- 产品语义明确：`receiverAction` 只作为 `source=receiver` 的动作细分，不替代 `from=share` 或 `source=receiver`。
- 允许值只有 `confirm` 和 `comment`；未知值必须安全回落到泛化 `source=receiver` 文案。
- 当前实现中，低风险 active 的分享接收者完成 `confirm` 后，二跳 path 可携带 `receiverAction=confirm`。
- 当前实现中，低风险 active 的分享接收者完成有效 `comment` 后，二跳 path 可携带 `receiverAction=comment`。
- 普通详情、`from=publish`、无 `from=share`、无有效行动、stale/report/closed 状态不携带鼓励性 action 来源语义。
- 下一位接收者文案能区分 confirm 与 comment：confirm 讲“刚有确认信号”，comment 讲“刚补线索，先看最新评论”。
- 文案不出现事实保证、官方认证、放心转发、具体用户身份或通讯录关系。
- 参数不引入新持久化数据，不需要读取通讯录，不需要复杂归因模型。

## 未验证风险

- 尚未验证真实 WeChat 系统分享面板是否完整保留 `receiverAction` query。
- 尚未验证下一位通过真实二跳 path 打开详情时，`receiverAction` 与 `source=receiver` 的解析和文案优先级是否符合预期。
- 尚未验证 confirm/comment 后若远端状态瞬间变为 stale、reported、resolved、expired 或 hidden，分享 path 是否会及时抑制 action 来源语义。
- 尚未验证窄屏下 confirm/comment 差异文案是否换行自然、不挤压任务主体和风险提示。
- 尚未验证携带 action 语义是否真的提升信任理解、行动理解或二跳转化率；当前只是产品假设。
