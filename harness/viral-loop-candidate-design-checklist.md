# 详情页传播闭环候选设计 / QA Checklist

## 信息层级

- [ ] 发布成功页只显示发布后扩散计划，不显示普通分享面板
- [ ] 分享接收页只显示接收侧引导，不显示普通分享面板
- [ ] 评论成功后只显示评论接力提示，不再同时显示普通分享面板
- [ ] 普通详情入口仍保留通用分享面板
- [ ] 信任判断、评论列表、关闭任务按钮不被传播模块遮挡

## 风险状态

- [ ] 高举报、过时、已隐藏、已关闭、已过期任务不鼓励公开扩散
- [ ] 风险态评论接力按钮不可触发公开分享
- [ ] 接收侧提示仍提醒先看评论和现场状态

## 验证

- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check scripts/check-viral-candidate.mjs`
- [ ] `node --check scripts/check-comment-relay.mjs`
- [ ] `node --no-warnings scripts/check-viral-candidate.mjs`
- [ ] `node --no-warnings scripts/check-comment-relay.mjs`
- [ ] `node --no-warnings scripts/check-share-receiver.mjs`
- [ ] `node --no-warnings scripts/check-share-message.mjs`
- [ ] `node --no-warnings scripts/check-publish-spread.mjs`
- [ ] `npm run check`
- [ ] `bash harness/init.sh`
- [ ] WeChat DevTools 中手动确认发布、分享接收、评论成功、普通详情四种入口互斥展示
