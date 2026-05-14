# 干净状态检查清单

- [ ] `bash harness/init.sh` 仍然可运行，或失败原因已记录
- [ ] `npm run check:json` 已运行，结果已记录
- [ ] `node harness/check-harness.mjs` 已运行，结果已记录
- [ ] 当前进度已经记录到 `harness/claude-progress.md`
- [ ] 功能状态真实反映 passing 和未验证边界，没有假 passing
- [ ] 所有本轮新增或修改的 harness 文件都位于 `harness/`，根目录只保留 `AGENTS.md` 入口
- [ ] 没有半成品步骤处于未记录状态
- [ ] 下一轮会话无需聊天记录即可从仓库继续
