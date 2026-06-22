# 自传播组合候选设计 / QA Checklist

日期：2026-06-16
适用范围：发布成功扩散计划 + 普通详情分享提示

## 设计取舍

- 发布成功上下文更强，因此优先显示 C 组扩散计划。
- 普通详情页保持轻量，只显示 A 组分享提示，不叠加发布者专属扩散计划。
- 分享 payload 标题统一走 A 组谨慎 helper，减少不同入口口径漂移。
- 分享接收页必须是普通详情页，不显示发布者专属卡。

## 自动检查

- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check utils/share-message.js`
- [ ] `node --check utils/publish-spread.js`
- [ ] `node --check scripts/check-share-message.mjs`
- [ ] `node --check scripts/check-publish-spread.mjs`
- [ ] `node --check scripts/check-viral-candidate.mjs`
- [ ] `node --no-warnings scripts/check-share-message.mjs`
- [ ] `node --no-warnings scripts/check-publish-spread.mjs`
- [ ] `node scripts/check-viral-candidate.mjs`
- [ ] `node scripts/check-json.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check`
- [ ] `bash harness/init.sh`
- [ ] `npm run check`

## 手测清单

- [ ] 从发布成功进入详情页，只看到扩散计划。
- [ ] 从地图/列表/分享进入普通详情页，只看到普通分享提示。
- [ ] 点击发布成功页“转发扩散”，接收路径不携带 `from=publish`。
- [ ] 点击普通详情页“转发”，接收路径携带 `from=share`。
- [ ] active、stale、resolved、expired、高举报任务的文案不夸大真实性。
- [ ] 窄屏下扩散计划、分享提示、TrustInsight、评论区不互相挤压。

## 未验证不得声称通过

自动检查只证明组合逻辑、静态结构和 helper 输出。真实系统分享面板、接收侧页面、DevTools 编译、真机表现和转发率都需要单独验证。
