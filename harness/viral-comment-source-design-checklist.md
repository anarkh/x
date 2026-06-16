# 评论接力来源标识设计 / QA Checklist

## 接收文案

- [ ] `entryFrom === 'share' && source === 'comment'` 时，接收侧明确提示“有人刚补了线索”或“先看最新评论”。
- [ ] 文案里要能看出这不是普通分享，而是评论接力后的二跳入口。
- [ ] 普通 `from=share` 仍保持原有接收侧语义，不被 comment source 覆盖。

## 风险态

- [ ] `reportCount >= 2` 时仍然保持谨慎，不因为 `source=comment` 而鼓励公开扩散。
- [ ] `stale` 或 `staleCount >= 3` 时仍先核对最新情况，不盲转。
- [ ] `resolved`、`expired`、`hidden` 仍只作为历史或管理参考，不放大为接力入口。

## 互斥与布局

- [ ] 普通分享面板仍只在 `!showPublishSuccess && !shareReceiverGuide && !commentRelayPrompt && shareMessage` 时显示。
- [ ] 评论接力、分享接收和发布成功扩散不会在同一屏抢主 CTA。
- [ ] `source=comment` 文案在窄屏下可自然换行，不压住按钮和说明。

## 验证

- [ ] `node --check utils/comment-relay.js`
- [ ] `node --check utils/share-receiver.js`
- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check scripts/check-comment-relay.mjs`
- [ ] `node --check scripts/check-share-receiver.mjs`
- [ ] `node --check scripts/check-viral-candidate.mjs`
- [ ] `node --no-warnings scripts/check-comment-relay.mjs`
- [ ] `node --no-warnings scripts/check-share-receiver.mjs`
- [ ] `node --no-warnings scripts/check-viral-candidate.mjs`
- [ ] 既有 share / publish / receiver / candidate 检查通过
- [ ] `node scripts/check-json.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check`
- [ ] `npm run check`
- [ ] `bash harness/init.sh`
- [ ] WeChat DevTools 或真机确认 source=comment 的接收文案和窄屏换行；未执行时不得声称通过。
