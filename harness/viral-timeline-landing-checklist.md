# 朋友圈落地页语境 QA Checklist

日期：2026-06-17

## 范围与验收目标

- [ ] 本清单只覆盖 `source=timeline` 打开详情后的接收引导文案与 QA，不要求新增按钮、弹层、分享诱导 UI 或新的 evidence journey。
- [ ] 低风险 active 任务从朋友圈进入时，接收引导应解释：这是在朋友圈看到的附近任务，先看状态和评论，再决定确认或补线索。
- [ ] 风险态、关闭态、未知任务和数据异常仍优先走谨慎 / 历史 / 不可查看语义，不因为 `source=timeline` 增加鼓励传播。
- [ ] X 的自动检查只能做回归保护；W 的七条真实 manual evidence 仍是朋友圈能力验收来源。

## 低风险 Active 落地页文案

- [ ] `entryFrom === 'share' && source === 'timeline'` 且任务为 active、低风险、非 weak stale/report 时，`shareReceiverGuide.kicker` 能看出来源是朋友圈，而不是泛化“来自转发”。
- [ ] `title` 应短句表达“朋友圈看到的附近任务”或等价语义；不要写成求转发、帮扩散、立即行动。
- [ ] `summary` 应说明用户先读任务状态、确认信号和评论，再决定是否确认或补线索。
- [ ] 三行 `rows` 仍复用现有接收侧结构，不新增第四行；推荐语义为：为什么到你这、先做什么、不在现场。
- [ ] `rows[0]` 说明朋友圈来源和附近任务语境，不暗示平台已验证或朋友关系已被识别。
- [ ] `rows[1]` 明确第一步是看状态 / 评论 / 现场变化，然后确认或补线索。
- [ ] `rows[2]` 允许“不在现场”时先看评论、补充已知信息或谨慎交给更可能路过的人；不要引导公开扩散。
- [ ] `note` 应收束为谨慎提醒：确认不是证明，评论和状态要先看；不使用“继续转发”“帮忙扩散”等鼓励性文案。

## 行动入口与后续链路

- [ ] `source=timeline` 的低风险 active 落地页仍复用既有 `shareReceiverActionStrip` 两个第一步动作。
- [ ] 两个按钮文案仍是确认和补线索方向，不出现“分享到朋友圈”“转发朋友圈”等 share 按钮语义。
- [ ] 两个按钮不得使用 `open-type="share"`；确认仍走既有 `react`，补线索仍走既有评论入口。
- [ ] 用户完成 confirm 后，仍优先进入 `receiverConversionPrompt`，且不被 `actionRelayPrompt` 抢占。
- [ ] 用户完成 comment 后，仍优先进入 `receiverConversionPrompt`，且不被 `commentRelayPrompt` 抢占。
- [ ] 后续链路继续保留 R/S/T/U 的要求：目标化 rows、`receiverAction=confirm/comment`、shareReason、relayChannels 都不因 timeline 入口退化。
- [ ] 二跳分享路径仍使用 `from=share&source=receiver&receiverAction=confirm/comment`；不要把二跳 source 误写成 `timeline`。

## 风险 / Closed / Unknown 互斥

- [ ] weak stale（如 `staleCount > 0` 但未达 stale）不显示鼓励性 timeline 文案，不显示鼓励接力的 target rows、shareReason 或 relayChannels。
- [ ] weak report（如 `reportCount > 0` 但未隐藏）不显示鼓励性 timeline 文案；提示先核对评论和现场变化。
- [ ] `stale` 或 `staleCount >= 3` 只强调过时风险和最新情况核对，不写“朋友圈看到，帮忙看看”这类动员语气。
- [ ] `resolved` 只作为已处理 / 历史结果查看，不鼓励确认、补线索或再转。
- [ ] `expired` 只作为过期 / 历史线索查看，不使用紧急或附近求助语气。
- [ ] `hidden` 只显示不可查看 / 已下线 / 管理处理语义，不显示 timeline 来源营销或行动入口。
- [ ] unknown task、加载失败、缺少 `id` 或数据权限失败时，不显示鼓励性 timeline 文案；页面应走可读降级或错误态。
- [ ] 不能削弱 W 的 `timeline-risk-gating` / no-shareTimeline evidence：风险和 closed guard 仍必须用真实菜单、payload 或落地页证据观察，而不是只凭新增文案判断。

## 布局与可读性

- [ ] 新增 timeline 文案应沿用现有 receiver guide 字段，不新增额外面板、按钮或视觉层级。
- [ ] `kicker`、`title`、`summary`、三行 `rows`、`note` 的总长度不要比现有 receiver guide 明显更长；优先替换语义，不堆叠解释。
- [ ] 标题保持一行短句优先，窄屏可自然换行；不得挤压状态标签、地点、正文或评论入口。
- [ ] 三行 `rows` 的 label 保持短标签，value 控制在现有接收侧说明的密度内，避免每行变成段落。
- [ ] `note` 不应把首屏推得过长；正文、评论、`shareReceiverActionStrip` 和信任动作按钮仍可滚动可达。
- [ ] iPhone SE / 低宽度模拟器下检查：receiver guide、正文、评论区、action strip、底部按钮没有遮挡或重叠。
- [ ] 微信单页模式固定顶部 / 底部区域不遮挡 timeline guide 首屏关键信息和行动按钮。

## Evidence QA

- [ ] X 的脚本或静态检查不能替代 W 的七条真实 manual evidence；没有 DevTools / 真机证据时仍只能写 `blocked` / `unverified`。
- [ ] 新增 `source=timeline` 手测观察点应并入 `timeline-share-channel` 的单页打开观察，或作为第二跳接收说明的附加 actual；不要默认新增第八条 required journey。
- [ ] `timeline-share-channel` actual 应记录：从朋友圈 / 单页模式打开后，kicker/title/summary/rows/note 是否解释朋友圈来源、附近任务、先看状态评论、可确认或补线索。
- [ ] `timeline-risk-gating` actual 应继续覆盖 weak stale/report、stale、resolved、expired、hidden、unknown，不得只记录 active 低风险成功。
- [ ] 截图或录屏证据要覆盖完整 receiver guide 和 action strip，避免只截标题导致无法判断按钮不是 share 按钮。
- [ ] 如果自动检查通过但缺少真实菜单、payload、单页打开或风险态证据，总结必须明确“不代表 W 七条 manual evidence passed”。
- [ ] 证据里不要记录联系人、群、openid / unionid、手机号、详细住址、评论全文或精确坐标。

## 回归保护

- [ ] 普通 `from=share` 且没有 `source=timeline` 时，仍保持既有接收侧文案，不被朋友圈语境覆盖。
- [ ] `source=receiver&receiverAction=confirm` 仍表达“上一位刚确认过”，不要回退成 timeline 或普通分享文案。
- [ ] `source=receiver&receiverAction=comment` 仍表达“上一位刚补了线索”，不要回退成 timeline 或普通分享文案。
- [ ] `source=comment` 仍表达评论接力 / 先看最新评论，不被 timeline 文案覆盖。
- [ ] `source=confirm` 仍表达确认接力 / 先看确认和评论，不被 timeline 文案覆盖。
- [ ] 普通详情页分享路径 `/pages/detail/detail?id=<id>&from=share`、地图分享 `/pages/map/map?from=share` 和 `onShareTimeline` query 互不回退。
- [ ] 接收侧普通分享面板仍在 `shareReceiverGuide`、`receiverConversionPrompt`、`actionRelayPrompt`、`commentRelayPrompt` 存在时隐藏，不出现同屏 CTA 竞争。

## 自动检查建议

- [ ] `node --check utils/share-receiver.js`
- [ ] `node --check utils/share-receiver-actions.js`
- [ ] `node --check utils/receiver-conversion.js`
- [ ] `node --check pages/detail/detail.js`
- [ ] `node --no-warnings scripts/check-share-receiver.mjs`
- [ ] `node --no-warnings scripts/check-share-receiver-action.mjs`
- [ ] `node --no-warnings scripts/check-receiver-conversion.mjs`
- [ ] `node --no-warnings scripts/check-viral-journey-evidence.mjs`
- [ ] `node --no-warnings scripts/check-viral-journey-manual-evidence.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check -- harness/viral-timeline-landing-checklist.md`
