# 接力转化设计 / QA Checklist

日期：2026-06-16

## 触发条件

- [ ] 只有 `from=share` 的详情页会在 confirm/comment 成功后生成提示
- [ ] 页面首次加载和重新进入时默认不显示提示
- [ ] 普通详情入口不会主动显示接力提示

## 状态边界

- [ ] active 且低风险时才出现可分享的接力 CTA
- [ ] `stale` / `report` / `resolved` / `expired` / `hidden` 都只给谨慎提示
- [ ] 高风险状态不出现鼓励扩散的按钮文案

## 接收侧

- [ ] 接力后的分享路径使用 `from=share&source=receiver`
- [ ] 接收侧文案能看出这条是“接力确认/补充后转给你”的
- [ ] 风险态接收侧仍然强调先看确认和评论

## 互斥关系

- [ ] 接力提示出现时，普通分享面板不会同时显示
- [ ] 接力提示和已有的分享接收侧说明不会互相遮挡

## 验证

- [ ] `node --check utils/receiver-conversion.js`
- [ ] `node --check utils/share-receiver.js`
- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check scripts/check-receiver-conversion.mjs`
- [ ] `node --no-warnings scripts/check-receiver-conversion.mjs`
- [ ] `node scripts/check-share-receiver.mjs`
- [ ] `node scripts/check-viral-candidate.mjs`
- [ ] `node scripts/check-json.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check`
- [ ] `bash harness/init.sh`
- [ ] `npm run check`
