# 评论成功后接力提示设计 / QA Checklist

## 触发与层级

- [ ] 只在用户成功提交评论后显示接力提示。
- [ ] 页面初次进入、从分享进入、从发布成功进入、重新加载和单纯读取评论列表时默认不显示。
- [ ] 提示模块是评论后的轻量 panel，不使用弹窗，不压住详情主内容、信任判断或评论列表。
- [ ] 用户可以继续阅读评论；风险状态下没有公开转发 CTA。

## 文案与风险

- [ ] active 且低风险任务说明“最新线索”与“适合转给谁”。
- [ ] 新评论正文会被摘要，长评论在窄屏中不撑破布局。
- [ ] `commentCount` 会进入提示，帮助用户理解评论区线索数量。
- [ ] `stale` 或 `staleCount >= 3` 时提醒先核对，不鼓励盲转。
- [ ] `reportCount >= 2` 时提醒有举报风险，不鼓励公开扩散。
- [ ] `resolved`、`expired`、`hidden` 只作为历史或管理线索，不鼓励继续公开传播。

## 视觉与窄屏

- [ ] panel 标题、摘要、三行说明和 note 都允许自然换行。
- [ ] 按钮与说明在窄屏下不互相覆盖，长地名或长评论摘要可折行。
- [ ] 低风险态和 warn/danger/done 态能被区分，但不使用过重警告样式抢主流程。
- [ ] 接力按钮使用 `open-type="share"`；风险态使用非分享按钮或只读提示。

## 验证

- [ ] `node --check utils/comment-relay.js`
- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check scripts/check-comment-relay.mjs`
- [ ] `node --check scripts/check-devtools-readiness.mjs`
- [ ] `node --check scripts/check-viral-candidate.mjs`
- [ ] `node --no-warnings scripts/check-comment-relay.mjs`
- [ ] 既有 share / publish / receiver / candidate 检查通过
- [ ] `node scripts/check-json.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check`
- [ ] `npm run check`
- [ ] `bash harness/init.sh`
- [ ] WeChat DevTools 或真机确认评论成功后的 panel、分享按钮、风险态和窄屏换行；未执行时不得声称通过。
