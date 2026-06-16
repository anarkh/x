# 传播链路证据产品 Brief

日期：2026-06-16

## 目标

为“分享接收者 -> 完成确认或评论 -> 二跳接力 -> 下一位接收者”的真实链路补一层可复跑证据框架。它把关键 helper 和详情页互斥条件组合成自动场景模型，帮助复核当前传播候选是否仍满足低风险、单主 CTA 和接力语境。

## 产品假设

当前 J/L/M 候选已经把分享接收、行动入口、评论接力、确认接力和接收者转化拆成多个 helper。最大短板不是单个 helper 缺少断言，而是缺少一条从首跳进入到二跳接收的连贯证据。把这条链路固化成脚本，可以降低后续改动破坏真实传播链路的风险。

## 自动证据范围

- `/pages/detail/detail?id=<id>&from=share` 进入 active、无 stale/report 的任务时，接收侧说明与第一步 action strip 都存在
- `shareReceiverGuide`、`shareReceiverActionStrip` 和普通 `shareMessage` 面板互斥
- 接收者完成 confirm/comment 后，`receiverConversionPrompt` 优先于 `actionRelayPrompt` / `commentRelayPrompt`
- 二跳分享路径保留 `from=share&source=receiver`
- 下一位通过 `source=receiver` 进入时，接收侧文案是接力语境
- 普通入口、任意 stale/report 信号、`stale` / `resolved` / `expired` / `hidden` 不出现接收侧鼓励 action strip 或接收者公开接力 CTA

## 非目标

- 不替代 WeChat DevTools 或真机手测
- 不验证系统分享面板、真实页面点击、窄屏换行、云端评论保存或分享卡片实际落地
- 不改变地图、发布、详情、评论或管理主流程
- 不新增埋点、归因、奖励或传播策略

## 证据边界

`scripts/check-viral-journey-evidence.mjs` 是自动场景证据，只证明 helper 输出和详情页静态互斥条件保持一致。真实链路仍需要在 WeChat DevTools 或真机中手动打开目标路径，点击确认/评论，触发系统分享，并记录实际 UI 与分享路径。

