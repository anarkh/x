# 分享接收者第一步行动产品 Brief

日期：2026-06-16

## 目标

当用户从 `from=share` 打开任务详情时，在接收侧说明旁给一个轻量行动入口，让他不用翻到信任动作或评论区也能完成第一次有用动作。

## 产品假设

分享接收者的第一步通常不是“继续转发”，而是先确认自己是否在附近、是否知道线索。把“确认一下”和“补一条线索”放在接收侧提示里，能降低他完成 confirm/comment 的摩擦，并自然接上已有的 receiverConversionPrompt 二跳接力。

## 范围

- 只在 `entryQuery.from === 'share'` 时评估
- 只在 active 且没有过时/举报信号的低风险任务上展示鼓励性 action strip
- action strip 只提供两个动作：确认有效、打开评论弹窗
- confirm 复用现有 `react` 流程，comment 复用现有 `openCommentDialog`
- 风险态、关闭态、过期态不展示鼓励按钮，只保留谨慎文案

## 非目标

- 不新增页面、奖励、埋点、复杂归因或额外本地状态
- 不改普通详情入口的分享提示
- 不改变 commentRelay、actionRelay 或 receiverConversion 的既有优先级
- 不把 stale、高举报、hidden、resolved、expired 包装成传播机会

## 风险

- 如果入口文案太强，会让高风险或过时任务看起来仍然值得扩散
- 如果按钮和 `open-type="share"` 混在一起，可能触发错误分享行为
- 如果 action strip 与普通分享面板同时出现，会让接收者不知道先确认还是先转发
