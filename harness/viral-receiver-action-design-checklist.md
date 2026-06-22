# 分享接收者第一步行动设计 / QA Checklist

日期：2026-06-16

## 触发条件

- [ ] 普通详情入口不显示 action strip
- [ ] `from=share` 且 active、无举报、无过时反馈任务显示 action strip
- [ ] hidden / resolved / expired / stale / 有举报或有过时反馈任务不显示鼓励性 action strip

## 行动设计

- [ ] 确认按钮文案是“我在附近，确认一下”
- [ ] 线索按钮文案是“补一条线索”
- [ ] 确认按钮绑定现有 `react`，并带 `data-action="confirm"`
- [ ] 线索按钮绑定现有 `openCommentDialog`
- [ ] 两个按钮都不使用 `open-type="share"`

## 互斥与后续链路

- [ ] 普通分享面板不与 receiver guide / action strip / actionRelay / commentRelay / receiverConversion 同屏竞争
- [ ] from=share 完成 confirm 后优先显示 receiverConversionPrompt，而不是 actionRelayPrompt
- [ ] from=share 完成 comment 后优先显示 receiverConversionPrompt，而不是 commentRelayPrompt
- [ ] 风险态只显示谨慎文案，不出现鼓励扩散或鼓励行动的按钮

## 视觉 QA

- [ ] action strip 放在接收侧提示内部或紧邻其后，层级低于主任务内容但高于通用信任动作
- [ ] 窄屏下两个按钮可换行，不挤压文案
- [ ] disabled 或风险态不占用过多垂直空间
- [ ] 视觉风格沿用详情页现有 panel、按钮和谨慎色系

## 验证

- [ ] `node --check utils/share-receiver-actions.js`
- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check scripts/check-share-receiver-action.mjs`
- [ ] `node --check scripts/check-share-receiver.mjs`
- [ ] `node --check scripts/check-receiver-conversion.mjs`
- [ ] `node --check scripts/check-action-relay.mjs`
- [ ] `node --check scripts/check-comment-relay.mjs`
- [ ] `node --check scripts/check-viral-candidate.mjs`
- [ ] `node --check scripts/check-devtools-readiness.mjs`
- [ ] `node --no-warnings scripts/check-share-receiver-action.mjs`
- [ ] `node --no-warnings scripts/check-share-receiver.mjs`
- [ ] `node --no-warnings scripts/check-receiver-conversion.mjs`
- [ ] `node --no-warnings scripts/check-action-relay.mjs`
- [ ] `node --no-warnings scripts/check-comment-relay.mjs`
- [ ] `node --no-warnings scripts/check-viral-candidate.mjs`
- [ ] `node --no-warnings scripts/check-devtools-readiness.mjs`
- [ ] `node scripts/check-json.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check`
- [ ] `npm run check`
- [ ] `bash harness/init.sh`
- [ ] WeChat DevTools / 真机确认按钮位置、弹窗、confirm 后二跳和窄屏换行
