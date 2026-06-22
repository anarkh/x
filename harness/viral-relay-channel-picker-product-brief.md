# 接收者二跳转发场景选择产品 Brief

日期：2026-06-17

分支：`codex/iter-viral-relay-channel-picker`

基线：`194e3cc feat: add receiver share reason`

## 背景

T 轮已经在 `from=share` 接收者完成 `confirm` 或 `comment` 后，为 `receiverConversionPrompt` 增加了 `shareReason`，让用户知道“转给下一位时可以怎么说”。当前 prompt 还保留三行 `targetRows`：`推荐转给`、`为什么可信`、`下一位先看`，并且二跳路径继续带 `from=share&source=receiver&receiverAction=confirm/comment`。

本轮产品目标不是继续润色那句理由，而是在用户已经完成一次有效行动后，给 2 到 3 个“更适合转到哪类场景”的短选项。例如楼栋群、门卫/前台、路过朋友、同路线邻居等。它必须是场景建议，不是联系人选择器：微信小程序不能读取联系人或微信群，本项目也不能知道真实关系链，因此文案不能暗示系统知道用户认识谁、在哪个群里或应该点名转给谁。

## 产品假设

“选转发场景”比继续润色分享理由更可能突破 99，因为 T 已经解决了“怎么说”的表达阻力，下一层瓶颈更可能是“发给谁/哪里”的判断阻力。

继续打磨 `shareReason` 的边际收益会递减：一句更顺的转述理由能降低表达成本，但用户仍然要离开小程序，在微信分享面板里自己选择聊天对象或群。如果他不知道这条任务更适合楼栋群、门卫/前台、路过朋友还是同路线邻居，再好的理由也可能停在页面内。

场景选择更贴近真实转发决策：它不要求系统读取通讯录，也不要求预填聊天文本，只是在分享前帮用户把任务类型、刚完成的动作和低风险状态翻译成“应该发到哪类场景”。这比继续增加一句同义分享理由更可能让用户形成明确下一步，从而提升自发二跳。

## 触发条件

Channel picker 只在以下条件全部满足时出现：

- 当前详情入口来自分享：`from=share`。
- 当前用户刚完成有效 `confirm` 或有效 `comment`。
- 当前任务为低风险 `active`：`status === 'active'`，`staleCount === 0`，`reportCount === 0`。
- 当前 `receiverConversionPrompt.shouldRelay === true`。
- 二跳路径仍沿用已有语义：`from=share&source=receiver&receiverAction=confirm/comment`。

不触发场景：

- 普通地图、列表、个人页、活动页、`from=publish` 等非分享入口。
- 用户只是浏览、打开评论框、取消评论、重复确认失败，或动作没有成功落库。
- 用户刚执行的是 `stale` 或 `report`。
- 任务状态在动作后变为风险态、关闭态或无法确认。

## 场景建议规则

Channel picker 建议展示 2 到 3 个短选项，每个选项是一类可理解的转发场景，而不是具体联系人、群名或关系推断。

建议字段：

- `label`：4 到 8 个字的场景名，例如 `楼栋群`、`门卫/前台`、`同路线邻居`。
- `hint`：一句很短的适用理由，例如 `可能有人刚经过`、`方便现场核对`。
- `priorityReason`：内部生成理由，用于自动检查或后续埋点说明，不直接展示为“系统知道”。

通用文案原则：

- 用“建议发给”“适合转到”“可以问问”这类弱表达，不用“发给你的”“你认识的”“你所在的群”。
- 不出现具体联系人、微信群名、昵称、头像、手机号、楼号房号或系统推断关系。
- 不让用户误以为小程序读到了通讯录、微信群、位置同行关系或真实社交关系。
- 选项保持短，不把长标题、长地点、评论正文拼进选项。
- 如果无法判断分类，回落到 `能核对地点的人`、`附近可能路过的人` 这类保守场景。

### 分类与动作建议

| 条件 | 建议选项 | 规则说明 |
| --- | --- | --- |
| `lost_found` + `intent=lost` | `路过朋友`、`门卫/前台`、`楼栋群` | 丢失物品更适合发给可能经过丢失地点、能现场留意或代问的人。 |
| `lost_found` + `intent=found` | `楼栋群`、`门卫/前台`、`附近邻居` | 拾到物品更适合触达可能失主或现场代管点，避免公开扩散隐私细节。 |
| `help_needed` | `能搭把手的人`、`附近邻居`、`店员/前台` | 求助类优先找有能力行动或熟悉现场的人，不鼓励泛化围观。 |
| `street_update` | `同路线邻居`、`路过朋友`、`楼栋群` | 地点动态强调时效，适合发给即将经过或同路线的人。 |
| `check_in` | `附近朋友`、`同社区邻居`、`会到这里的人` | 打卡类更偏地点参考，适合发给可能到场判断的人。 |
| 未知分类 | `能核对地点的人`、`可能路过的人` | 保守兜底，只提示场景，不制造关系假设。 |

`receiverAction` 可影响排序和提示语：

- `receiverAction=confirm`：优先推荐能现场核对的场景，例如 `同路线邻居`、`路过朋友`、`门卫/前台`；hint 可强调 `刚有确认信号，适合再核对`。
- `receiverAction=comment`：优先推荐熟悉地点或能理解线索的场景，例如 `楼栋群`、`附近邻居`、`店员/前台`；hint 可强调 `刚补了线索，先看最新评论`。

界面上不需要让用户“选择联系人”。更准确的定位是：在继续接力按钮上方，给一行 `适合转到`，下面展示 2 到 3 个轻量 chips。用户点选 chip 只改变页面内推荐文案或分享按钮旁的提示，不代表系统知道或锁定真实接收方。

## 与 T 的 shareReason 关系

Channel picker 和 `shareReason` 分工不同，不能互相替代：

- Channel picker 补“发给谁/哪里”：帮助用户判断更适合转到楼栋群、门卫/前台、路过朋友、同路线邻居等场景。
- `shareReason` 补“怎么说”：给用户一条可转述的短理由，例如 `我刚确认过，帮忙再核对一下` 或 `我刚补了线索，你先看最新评论`。
- `targetRows` 继续承担结构化解释：`推荐转给`、`为什么可信`、`下一位先看` 三行不被 channel picker 拆掉。
- `receiverAction=confirm/comment` 继续承担路径语义：下一位打开时知道上一位刚确认还是刚补线索。

推荐信息顺序：

1. 现有 `targetRows`：先解释为什么这次可以考虑接力。
2. Channel picker：再给 2 到 3 个“适合转到”的场景。
3. `shareReason`：最后给“转给下一位时可以说”的一句话。
4. `open-type="share"` 主按钮：保持一个主 CTA，避免多个传播入口互相抢。

## 风险边界

风险或关闭信号优先于增长。以下场景不出现 channel picker，也不出现“适合转到”“继续接力到这些场景”等鼓励公开扩散的选项：

- 弱 stale：`staleCount > 0`，即使还没有达到 `stale` 阈值。
- 弱 report：`reportCount > 0`，即使还没有达到 `hidden` 阈值。
- `status === 'stale'`。
- `status === 'resolved'`。
- `status === 'expired'`。
- `status === 'hidden'`。
- 用户刚执行 `stale` 或 `report`。
- 状态缺失、远端刷新失败、动作后无法确认最新状态。

这些场景可以保留谨慎说明，例如“先看确认和评论”“不建议继续公开扩散”，但不能给楼栋群、同路线邻居、路过朋友等公开转发场景建议，也不能生成鼓励性 channel 文案。

## 验收标准

- 低风险 `from=share` 接收者完成 `confirm` 后，出现 2 到 3 个 channel 选项，选项偏向现场核对或可能路过场景。
- 低风险 `from=share` 接收者完成 `comment` 后，出现 2 到 3 个 channel 选项，选项偏向熟悉地点、能理解线索或能补充信息的场景。
- 选项按 `category`、`intent`、`receiverAction` 有可观察差异；`lost_found` 的 lost/found 至少有不同优先级。
- 所有选项都是泛化场景建议，不出现具体联系人、微信群名、真实关系或“系统知道你应该转给谁”的暗示。
- Channel picker 与现有 `targetRows`、`shareReason` 同屏协作：`targetRows` 仍是三行，`shareReason` 仍解释怎么说，picker 只解释发给哪类场景。
- 二跳分享路径不新增联系人或群信息，继续只使用 `from=share&source=receiver&receiverAction=confirm/comment`。
- 普通入口、未完成行动、`stale/report` 动作、弱 stale/report、`stale/resolved/expired/hidden` 都不出现 channel picker。
- 窄屏下 2 到 3 个短选项可换行，不挤压任务主体、风险提示、`shareReason` 和主分享按钮。

## 建议自动检查

- 新增或扩展 receiver conversion 检查：低风险 `confirm/comment` prompt 返回 `relayChannels` 或等价字段，数量为 2 到 3。
- 检查 `lost_found` 的 `lost` 与 `found` channel 排序或内容不同；`help_needed`、`street_update`、`check_in` 至少各有一组分类化选项。
- 检查 `confirm` 与 `comment` 的 channel 排序或 hint 有差异：confirm 偏核对现场，comment 偏看最新评论或补线索。
- 检查 channel 文案不包含联系人/群关系暗示词，例如 `你的朋友`、`你所在的群`、`通讯录`、`微信群成员`、`系统识别`、`认识的人`。
- 检查风险和关闭状态下 `relayChannels` 为空或不存在：弱 stale/report、`stale`、`resolved`、`expired`、`hidden`、`stale/report` 动作都覆盖。
- 检查 `targetRows` 仍为三行，`shareReason` 仍存在且不被 channel picker 合并或替代。
- 检查分享路径没有新增联系人、群、用户身份相关 query，只保留既有 `from=share&source=receiver&receiverAction=confirm/comment`。
- 建议命令形态：`node --no-warnings scripts/check-receiver-conversion.mjs` 覆盖 helper 输出；`node --no-warnings scripts/check-viral-journey-evidence.mjs` 覆盖首跳完成行动到二跳路径的互斥链路；`git diff --check -- harness/viral-relay-channel-picker-product-brief.md` 覆盖本 brief 格式。

自动检查只能证明生成规则、互斥条件、禁用词和路径语义没有回退；真实 WeChat 分享面板、真机展示、用户是否真的按场景转发，以及是否提升二跳转化，仍需要 DevTools、真机或数据验证。
