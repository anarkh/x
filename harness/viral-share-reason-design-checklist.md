# 接收者二跳转发理由设计 / QA Checklist

## 验收目标

- [ ] 在 `receiverConversionPrompt` 面板内增加一条可转述短理由，让完成 confirm/comment 的接收者能说清“为什么把这条转给下一位”
- [ ] 短理由只服务二跳接力理解，不新增大面积 UI、不新增常驻分享入口、不替代现有三行 `targetRows`
- [ ] 现有 `receiverConversionPrompt.targetRows` 仍保持三行：`推荐转给`、`为什么可信`、`下一位先看`
- [ ] 文案保持低压、事实边界清楚，不写“请扩散”“已证实”“大家都在转”等误导性增长表达
- [ ] 本清单是设计与验收要求，不代表 WeChat DevTools 或真机视觉验证已经通过

## 信息层级

- [ ] 短理由应放在 `targetRows` 与主按钮之间，作为一个低密度的过渡说明
- [ ] 放在 `targetRows` 之后，是因为用户已经先看到“推荐转给谁 / 为什么可信 / 下一位先看什么”，再看到一句可直接复述的理由，理解链路更完整
- [ ] 放在按钮之前，是因为它贴近“继续接力”动作，能帮助用户在点击前确认自己要转述的理由
- [ ] 短理由不应放进 `targetRows` 作为第四行，避免破坏 R 组已有三行结构和扫描节奏
- [ ] 短理由不应放在标题或 body 前面，避免抢走“你刚确认/刚补线索”的状态承接
- [ ] 呈现形式建议为一行轻量说明或 `label + value` 微行，例如 `转给下一位时可以说：<短理由>`
- [ ] 如使用 label，label 要短于现有 target label，value 才是重点；不把它做成醒目的 badge、卡片、步骤条或第二个 CTA

## 文案差异

- [ ] confirm 态短理由应强调“刚有人确认/现场信号更新”，但不能表达成官方验证或事实定论
- [ ] confirm 态示例方向：`刚有人确认过这条，转给可能路过的人，能更快核对现场。`
- [ ] comment 态短理由应强调“刚补了线索/评论可先看”，但不能暗示评论一定正确
- [ ] comment 态示例方向：`刚有人补了线索，转给熟悉这里的人，可以先看最新评论再判断。`
- [ ] confirm/comment 两种状态的理由必须一眼可区分，不能都退化成泛化的“帮忙转给下一位”
- [ ] 短理由应尽量控制在 24 个中文字符左右，最长不超过两行；长标题、长地点、长 category 文案不应被拼进这条理由
- [ ] 短理由只描述接力原因，不承诺结果，不制造紧迫感，不使用“必须”“马上”“扩散起来”等压力型词

## 视觉约束

- [ ] 320px 窄屏下，短理由允许自然换行，但不应超过两行优先；换行后仍与 `targetRows` 和按钮有清楚间距
- [ ] 短理由的字号、颜色和重量应低于标题/body，接近 note 或 target value 的密度，不能成为面板主视觉
- [ ] 若采用 `label + value`，label 宽度不能挤压 value；value 需要 `min-width: 0`、自然换行和长词断行能力
- [ ] 短理由与 `receiverConversion-actions` 之间要保留足够间距，避免按钮被说明文字贴住或视觉上归属不清
- [ ] 主按钮宽度、高度和可点击区域不因短理由增加而被压缩；按钮文字不截断、不溢出、不与 note 重叠
- [ ] 面板整体仍沿用现有 `receiver-conversion` 的 panel、间距、色系和低密度表达，不新增大块背景、插图、营销横幅或装饰元素
- [ ] 短理由不应把评论入口、任务正文或信任信息推到明显更深的位置；若首屏空间紧张，优先收紧短理由而不是压缩按钮

## 风险 / 关闭态互斥

- [ ] 风险态、关闭态或不应公开扩散的状态下，短理由完全不出现
- [ ] `stale`、高 `staleCount`、高 `reportCount`、`resolved`、`expired`、`hidden` 都不能显示可转述短理由
- [ ] `receiverConversionPrompt.shouldRelay` 为 false 时，面板只能保留谨慎核对、历史线索或先看评论确认的语义
- [ ] 风险态即使有 confirm/comment 历史，也不能显示“转给下一位时可以说”这类鼓励性说明
- [ ] 普通详情入口、`from=publish`、非 `from=share` 入口不显示该短理由
- [ ] `receiverConversionPrompt` 出现时仍应压住 `actionRelayPrompt` 和 `commentRelayPrompt`，避免同屏出现多个传播理由或多个主 CTA

## 自动检查关注点

- [ ] 检查低风险 active + `from=share` + confirm 时，`receiverConversionPrompt` 包含 confirm 版本短理由
- [ ] 检查低风险 active + `from=share` + comment 时，`receiverConversionPrompt` 包含 comment 版本短理由
- [ ] 检查 confirm/comment 短理由不同，并分别包含“确认”或“线索/评论”等动作语义
- [ ] 检查 `targetRows` 仍为三行，且 label 顺序仍为 `推荐转给`、`为什么可信`、`下一位先看`
- [ ] 检查 `shouldRelay === false`、risk/closed 状态、普通入口和 `from=publish` 不返回或不渲染短理由
- [ ] 检查普通分享面板互斥条件没有回退：`receiverConversionPrompt` 可见时不同时显示普通 share、action relay 或 comment relay 主面板
- [ ] 建议命令：`node --check utils/receiver-conversion.js`
- [ ] 建议命令：`node --check pages/detail/detail.js`
- [ ] 建议命令：`node --no-warnings scripts/check-receiver-conversion.mjs`
- [ ] 建议命令：`node --no-warnings scripts/check-viral-candidate.mjs`
- [ ] 基线建议：`node scripts/check-json.mjs`、`node harness/check-harness.mjs`、`git diff --check`

## 手测关注点

- [ ] WeChat DevTools 从 `from=share` 打开 active 低风险任务，点击确认后观察短理由位置是否在三行 `targetRows` 与按钮之间
- [ ] WeChat DevTools 从 `from=share` 打开 active 低风险任务，提交评论后观察短理由是否切换为 comment 版本
- [ ] WeChat DevTools 验证 `stale`、高举报、高过时、`resolved`、`expired`、`hidden` 不出现短理由和公开 relay CTA
- [ ] WeChat DevTools 验证普通详情入口、`from=publish` 入口不出现接收者二跳短理由
- [ ] 真机或窄屏模拟验证 320px / iPhone SE 宽度下，短理由、三行 `targetRows`、按钮和 note 不重叠、不截断、不挤压
- [ ] 真机触发系统分享面板后，确认用户看到的按钮和短理由关系清楚；若无法检查实际分享 payload，必须记录为未验证或 blocked
- [ ] 真实视觉验证结果必须记录具体设备、入口、动作和观察结论；未执行项不能写成 passed
