# 详情页分享接收侧设计 / QA Checklist

## 信息层级

- [ ] 只有 `from=share` 的详情页显示接收侧提示
- [ ] `from=publish` 仍然只显示发布成功扩散计划
- [ ] 提示模块足够轻，不会压住评论、信任判断和主内容
- [ ] 窄屏下标题、摘要、三行说明都能正常换行

## 文案规则

- [ ] active 任务能说清楚为什么转给我、现在先做什么
- [ ] `comments`、`confirmations`、`staleCount`、`reportCount` 都会影响文案
- [ ] `stale` / 高举报场景会提醒先核对，不会鼓励盲转
- [ ] `resolved` / `expired` / `hidden` 只当历史线索，不继续放大传播
- [ ] 不在现场时，文案会明确给出补评论或转给更可能路过的人这两条路

## 技术与路径

- [ ] 接收侧提示由 `utils/share-receiver.js` 统一生成
- [ ] 详情页只在 `entryQuery.from === 'share'` 时读取该 helper
- [ ] 现有分享标题与发布成功扩散逻辑不受影响
- [ ] 代码不引入新依赖

## 验证

- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check utils/share-receiver.js`
- [ ] `node --check scripts/check-share-receiver.mjs`
- [ ] `node scripts/check-share-receiver.mjs`
- [ ] `node --check utils/share-message.js`
- [ ] `node --check utils/publish-spread.js`
- [ ] `node scripts/check-share-message.mjs`
- [ ] `node scripts/check-publish-spread.mjs`
- [ ] `node scripts/check-viral-candidate.mjs`
- [ ] `node scripts/check-json.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check`
- [ ] `bash harness/init.sh`
- [ ] `npm run check`
- [ ] WeChat DevTools 中确认 from=share 的提示模块、换行和按钮层级
