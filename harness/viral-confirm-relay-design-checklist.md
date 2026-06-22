# 确认后接力设计 / QA Checklist

## 信息层级

- [ ] 页面加载和评论加载时不显示确认接力提示
- [ ] `confirm` 成功后才显示确认接力提示
- [ ] `stale` / `report` 成功后只提示已记录和先核对，不提供公开分享 CTA
- [ ] 普通分享面板在 `actionRelayPrompt` 存在时隐藏
- [ ] 评论接力、确认接力、分享接收和发布后扩散不会同屏竞争主 CTA

## 文案规则

- [ ] 低风险 confirm 只说“确认信号”，不说“已证实”
- [ ] 高举报、过时、已隐藏、已关闭、已过期任务不鼓励公开扩散
- [ ] `source=confirm` 接收页强调先看确认和评论
- [ ] 窄屏下标题、摘要、三行说明和按钮能正常换行

## 验证

- [ ] `node --check utils/action-relay.js`
- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check scripts/check-action-relay.mjs`
- [ ] `node --no-warnings scripts/check-action-relay.mjs`
- [ ] `node --no-warnings scripts/check-comment-relay.mjs`
- [ ] `node --no-warnings scripts/check-share-receiver.mjs`
- [ ] `node --no-warnings scripts/check-viral-candidate.mjs`
- [ ] `npm run check`
- [ ] `bash harness/init.sh`
- [ ] WeChat DevTools 中确认 confirm/stale/report 三种动作后的真实提示和分享面板行为
