# 详情页任务转发设计/QA Checklist

## 视觉与信息层级

- [ ] 详情页里的分享模块是轻量信息块，不是营销落地页
- [ ] 模块清楚显示“转给谁 / 为什么转 / 能帮什么”
- [ ] 文案在窄屏下能完整换行，不挤压分享按钮
- [ ] 分享按钮仍然是原生 `open-type="share"` 按钮

## 文案规则

- [ ] active 任务的文案以“附近会帮忙的人”为核心
- [ ] lost_found 任务会结合 `intent` 说明更适合转给谁
- [ ] `comments`、`confirmations`、`staleCount`、`reportCount` 都会影响文案
- [ ] `resolved`、`expired`、`hidden`、高举报、过时等边界状态会收敛口径
- [ ] 分享标题不会夸大“真实有效”这类结论

## 技术与路径

- [ ] `onShareAppMessage` 通过共享 helper 生成 title/path
- [ ] 详情页路径保留任务 `id`
- [ ] 分享路径带最小来源参数 `from=share`
- [ ] helper 对无 post 情况有保底路径

## 验证

- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check utils/share-message.js`
- [ ] `node scripts/check-share-message.mjs`
- [ ] `node scripts/check-json.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check`
- [ ] WeChat DevTools 中确认详情页分享模块和分享按钮的实际显示

