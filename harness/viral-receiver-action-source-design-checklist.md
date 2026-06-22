# 接收者二跳 action 来源语义设计 / QA Checklist

## 验收目标

- [ ] 接收者完成 confirm/comment 后的二跳分享路径仍保留 `from=share&source=receiver`，并额外携带 `receiverAction=confirm` 或 `receiverAction=comment`
- [ ] 下一位接收者打开时能区分“上一位刚确认过”和“上一位刚补了线索”
- [ ] 新语义只补充接力上下文，不把用户动作夸大成官方验证、平台背书或事实定论
- [ ] 新参数不增加新的常驻分享入口，不改变 R 组 `receiverConversionPrompt.targetRows` 的三行目标化结构

## 触发条件

- [ ] 只有 `from=share` 进入的详情页，在 active、低风险任务上完成 confirm 后，二跳分享 payload 才带 `receiverAction=confirm`
- [ ] 只有 `from=share` 进入的详情页，在 active、低风险任务上完成 comment 后，二跳分享 payload 才带 `receiverAction=comment`
- [ ] 普通详情入口完成 confirm/comment 后不使用 `source=receiver&receiverAction=*`；它应继续走既有普通详情或对应 relay 规则
- [ ] `from=publish` 发布后扩散不使用 `receiverAction`，也不展示接收者二跳 action 来源语义
- [ ] `stale`、高 `staleCount`、高 `reportCount`、`resolved`、`expired`、`hidden` 或其他 closed/risk 状态不出现鼓励性二跳 share CTA
- [ ] risk/closed 状态即使有历史 confirm/comment，也只能提示先核对、看评论或当历史线索，不提示“继续接力”

## 二跳分享 Payload

- [ ] confirm 成功后的 receiver conversion share path 形如 `/pages/detail/detail?id=<id>&from=share&source=receiver&receiverAction=confirm`
- [ ] comment 成功后的 receiver conversion share path 形如 `/pages/detail/detail?id=<id>&from=share&source=receiver&receiverAction=comment`
- [ ] `id` 仍按现有规则编码；新增 query 不破坏已有 `from=share&source=receiver` 检查
- [ ] `receiverAction` 只记录上一位接收者在本次 `from=share` 入口完成的动作，不记录普通详情页动作、发布者动作或系统自动状态
- [ ] 分享标题可以承接动作差异，但必须短句低压，例如“有人刚确认：<任务>”或“有人刚补线索：<任务>”

## 接收侧展示

- [ ] `source=receiver&receiverAction=confirm` 时，接收侧标题明确为接力语境下的确认信号，例如“上一位刚确认过”
- [ ] `source=receiver&receiverAction=comment` 时，接收侧标题明确为接力语境下的线索补充，例如“上一位刚补了线索”
- [ ] confirm 摘要强调“有人提供了现场确认信号，仍需看任务内容和评论”，不能写成“已证实”“官方确认”“已经可靠”
- [ ] comment 摘要强调“评论区刚有新补充，先看最新评论再判断”，不能暗示线索必然正确
- [ ] 三行接收侧 rows 可分别体现“为什么到你这”“先做什么”“不在现场”，其中 confirm 版本优先提确认信号，comment 版本优先提最新评论
- [ ] note 保持谨慎边界：建议先看确认、评论和现场状态，再决定确认、补充或继续接力
- [ ] 风险态标题/摘要优先显示风险、关闭或过时状态；`receiverAction` 不得覆盖风险提示

## 互斥关系

- [ ] `source=receiver&receiverAction=confirm` 不等同于 `source=confirm`；前者表示接收者链路二跳，后者表示确认动作自己的直接 relay 来源
- [ ] `source=receiver&receiverAction=comment` 不等同于 `source=comment`；前者表示接收者链路二跳，后者表示评论成功自己的直接 relay 来源
- [ ] 普通 `from=share` 且无 `source=receiver` 时，不读取 `receiverAction` 作为接收者二跳语义
- [ ] 普通 share 面板、发布后扩散计划、comment relay、action relay 和 receiver conversion 不同屏竞争主 CTA
- [ ] `receiverConversionPrompt` 出现时仍优先于 `actionRelayPrompt` 和 `commentRelayPrompt`
- [ ] 分享接收侧 action strip 只服务第一步确认/补线索；完成动作后由 receiver conversion 接管二跳，不同时显示两个主按钮组
- [ ] 发布者从 `from=publish` 分享出的路径不能混入 `source=receiver` 或 `receiverAction`

## 参数与回退

- [ ] 仅接受小写 `receiverAction=confirm` 和 `receiverAction=comment`
- [ ] `source=receiver` 但缺失 `receiverAction` 时，回退到现有泛化 `source=receiver` 文案：“有人接力转给你”
- [ ] `source=receiver` 但 `receiverAction` 未知、为空、大小写异常或重复冲突时，回退到现有泛化 `source=receiver` 文案
- [ ] `source` 不是 `receiver` 时忽略 `receiverAction`，避免污染 `source=confirm`、`source=comment`、普通分享和发布后扩散
- [ ] query 解析异常、缺失 id、额外未知参数或参数顺序变化都不能导致页面崩溃
- [ ] 自动检查需要覆盖 malformed query，并确认 helper 返回谨慎默认值或 `null`，不抛未捕获异常

## 窄屏与文案密度

- [ ] 新增 action 来源文案不新增第四行 R 组 `targetRows`；仍保持“推荐转给 / 为什么可信 / 下一位先看”三行
- [ ] 320px 宽度下，接收侧标题、摘要、三行 rows、note 和按钮都可自然换行
- [ ] confirm/comment 差异文案应短于两行优先，不挤压任务正文、信任摘要和评论入口
- [ ] `receiverConversionPrompt.targetRows` 与接收侧 guide rows 不应在同一屏形成重复长说明；同一状态只保留当前上下文最重要的一组 rows
- [ ] 评论入口仍可被快速找到，不能被新增来源说明推到过深位置或被按钮遮挡
- [ ] 长标题、长地点、长评论摘要、长 category 文案不撑破 panel，不与主按钮或 note 重叠

## 自动检查项

- [ ] 更新或新增 receiver conversion 检查，断言 confirm/comment 二跳 path 分别包含 `from=share&source=receiver&receiverAction=confirm/comment`
- [ ] 更新或新增 share receiver 检查，断言 `source=receiver + receiverAction=confirm/comment` 的标题、摘要和 rows 文案不同
- [ ] 检查缺失/未知 `receiverAction` 回退到泛化 `source=receiver` 文案
- [ ] 检查 `source=confirm`、`source=comment`、普通 `from=share`、`from=publish` 不被 `receiverAction` 污染
- [ ] 检查 risk/closed 状态不出现鼓励性接力 CTA，且 `receiverAction` 不覆盖风险文案
- [ ] 检查普通分享面板互斥条件仍包含 publish spread、share receiver、receiver conversion、action relay 和 comment relay
- [ ] 建议命令：`node --check utils/receiver-conversion.js`
- [ ] 建议命令：`node --check utils/share-receiver.js`
- [ ] 建议命令：`node --check pages/detail/detail.js`
- [ ] 建议命令：`node --check scripts/check-receiver-conversion.mjs`
- [ ] 建议命令：`node --check scripts/check-share-receiver.mjs`
- [ ] 建议命令：`node --no-warnings scripts/check-receiver-conversion.mjs`
- [ ] 建议命令：`node --no-warnings scripts/check-share-receiver.mjs`
- [ ] 建议命令：`node --no-warnings scripts/check-viral-candidate.mjs`
- [ ] 建议命令：`node --no-warnings scripts/check-devtools-readiness.mjs`
- [ ] 基线命令：`node scripts/check-json.mjs`
- [ ] 基线命令：`node harness/check-harness.mjs`
- [ ] 基线命令：`git diff --check`
- [ ] 基线命令：`npm run check`
- [ ] 基线命令：`bash harness/init.sh`

## DevTools / 真机待验证

- [ ] DevTools 从真实或辅助 route 打开 `/pages/detail/detail?id=<activeLowRiskPostId>&from=share`，点击确认后出现 receiver conversion，并记录分享 payload 含 `receiverAction=confirm`
- [ ] DevTools 从同类入口提交评论后出现 receiver conversion，并记录分享 payload 含 `receiverAction=comment`
- [ ] DevTools 用二跳路径打开 `source=receiver&receiverAction=confirm`，确认接收侧标题/摘要强调“刚确认”，且不说官方验证
- [ ] DevTools 用二跳路径打开 `source=receiver&receiverAction=comment`，确认接收侧标题/摘要强调“刚补线索/最新评论”
- [ ] DevTools 验证 `source=receiver` 无 `receiverAction`、未知 `receiverAction`、乱序 query 都回退稳定且不崩溃
- [ ] DevTools 验证普通详情、`from=publish`、`source=confirm`、`source=comment`、risk/closed 入口不混入接收者二跳 action 语义
- [ ] 真机触发系统分享面板，确认实际分享卡片路径携带 `receiverAction`，而不是只在 helper 字符串里存在
- [ ] 真机二跳打开后确认标题、摘要、rows、任务正文和评论入口在窄屏下不重叠、不溢出
- [ ] 云端评论路径下验证 comment 成功后才生成 `receiverAction=comment`，评论失败或取消不生成
- [ ] 未执行的 DevTools/真机项必须记录为待验证或 blocked，不得写成已通过
