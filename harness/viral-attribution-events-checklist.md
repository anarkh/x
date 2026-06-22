# 传播归因事件设计 / QA Checklist

日期：2026-06-17

## 范围

- [ ] 本清单只覆盖传播归因事件的设计、QA 和证据边界，不代表 UI passed evidence。
- [ ] 本轮不要求新增用户操作入口、弹层、阻断确认或额外分享按钮。
- [ ] 归因事件用于理解传播链路，不用于识别联系人、微信群或私人关系。
- [ ] CloudBase 不可用、事件写入失败或网络异常时，不阻断用户打开详情、分享、评论、确认或返回页面。

## 允许记录的进入事件

- [ ] 低风险 active 任务从 `source=timeline` 进入详情时，可以记录 timeline 进入事件。
- [ ] 普通分享进入详情时，可以记录 share 进入事件。
- [ ] 二跳接收者进入详情时，可以记录 receiver 进入事件。
- [ ] 从评论接力入口进入详情时，可以记录 comment 进入事件。
- [ ] 从确认接力入口进入详情时，可以记录 confirm 进入事件。
- [ ] 进入事件只记录必要归因字段，如 post id、入口 source、receiverAction、时间、粗粒度状态和是否低风险。
- [ ] 进入事件不改变现有落地页文案、按钮顺序或首屏阅读节奏。

## 转化事件

- [ ] 从分享接收侧完成 confirm 后，可以记录 confirm 转化事件。
- [ ] 从分享接收侧完成 comment 后，可以记录 comment 转化事件。
- [ ] 转化事件应能区分来源：timeline、普通 share、receiver、comment、confirm。
- [ ] confirm/comment 成功后的原有提示优先级不变，不因为打点多弹确认或增加下一步阻力。
- [ ] 转化事件写入失败时，用户看到的成功反馈、评论刷新、确认数量更新仍按原流程继续。

## 风险和关闭态边界

- [ ] weak stale、weak report、stale、hidden、resolved、expired、unknown task 都不得因为归因事件而出现鼓励扩散语气。
- [ ] 风险态或关闭态可以记录谨慎进入或关闭态进入，但不得记录成有效扩散成功。
- [ ] 关闭态 confirm/comment 不应产生转化事件；如果页面已有只读保护，归因逻辑不得绕开它。
- [ ] hidden 或权限失败场景不得暴露可推断任务内容、位置或传播对象的信息。
- [ ] 后续报告中要把低风险 active 与风险 / 关闭态分开统计，避免把“不鼓励扩散”的访问解释为传播增长。

## 隐私字段红线

- [ ] 事件字段不得包含评论正文。
- [ ] 事件字段不得包含手机号、微信号、门牌号、详细住址或其他联系方式。
- [ ] 事件字段不得包含联系人姓名、好友关系、openid / unionid 明文、群名或微信群标识。
- [ ] 事件字段不得包含精确经纬度；如确需位置语义，只能用粗粒度距离段、城市级或已脱敏区域。
- [ ] 事件字段不得包含图片 URL、原始分享文案全文、用户输入全文或可反推出个人身份的组合字段。
- [ ] payload、日志、截图和录屏在提交前也要按同一隐私红线检查。

## 用户可见体验

- [ ] 记录事件不增加用户点击、授权、确认、等待或重试成本。
- [ ] 分享、接收、评论、确认的按钮文案和路径保持现有体验，不为了归因暴露技术字段。
- [ ] CloudBase 慢、不可用或写入报错时，不显示与归因相关的错误 toast。
- [ ] 低端网络下事件写入不应拖慢详情首屏、评论提交完成态或确认按钮反馈。
- [ ] 窄屏下不得新增遮挡首屏 guide、正文、评论入口、action strip 或底部按钮的可见元素。

## QA 观察点

- [ ] 低风险 active timeline 进入：观察落地页仍是“先看状态和评论，再决定确认或补线索”，没有新增阻力。
- [ ] 普通 share 进入：观察 query / payload 中 source 语义正确，落地页不被 timeline 文案覆盖。
- [ ] receiver 进入：观察二跳 `source=receiver` 和 `receiverAction` 可区分 confirm/comment。
- [ ] comment 进入：观察评论接力来源可记录，但不携带评论正文。
- [ ] confirm 进入：观察确认接力来源可记录，但不把确认信号写成事实证明。
- [ ] confirm 后转化：观察确认成功、数量更新、后续提示和事件 payload 的顺序与字段。
- [ ] comment 后转化：观察评论成功、列表刷新、后续提示和事件 payload 的顺序与字段。
- [ ] 风险 / 关闭态：观察不显示鼓励扩散文案，不产生有效转化事件。
- [ ] CloudBase 不可用：断网或模拟云失败时，用户动作不被阻断，控制台可见降级或静默失败证据。

## 手测证据要求

- [ ] 这份 checklist 不是 UI passed evidence；通过静态检查或文档 review 也不能写成 DevTools / 真机通过。
- [ ] DevTools 或真机仍需要截图 / 录屏记录首屏、后续提示、风险态、窄屏和失败降级表现。
- [ ] 需要记录关键 query：入口路径、`from=share`、`source`、`receiverAction` 等，但不要记录私人联系人或群信息。
- [ ] 需要记录关键 payload：事件名、归因字段、状态字段、失败降级字段；payload 必须先脱敏。
- [ ] 需要记录窄屏观察：guide、action strip、评论入口、底部按钮没有重叠或被新增内容挤压。
- [ ] 如果无法检查真实 payload，要写明原因、替代观察方式和剩余风险，不能用“看起来正常”替代。
- [ ] 如果 CloudBase 不可用路径未跑，要标记 `unverified` 或 `blocked`，不能默认通过。

## 自动检查建议

- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check utils/store.js`
- [ ] `node --check utils/share-receiver.js`
- [ ] `node --check utils/receiver-conversion.js`
- [ ] `node scripts/check-json.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check -- harness/viral-attribution-events-checklist.md`
