# AD 轮产品 Brief：CI readiness gate

## 目标

新增一个最小 CI workflow，在 PR 或 push 时自动运行 `npm run check`，把 AC 轮已有的 JSON、harness、readiness 和 blocked summary preflight 检查接入自动化门禁。

AD 轮只把现有检查放到 CI 默认路径里，不重新定义检查内容。CI 的职责是减少“本地忘记运行 `npm run check`”的风险，并让评审者能从 workflow 结果看到基础准入是否通过。

## 用户价值

- 开发者和 agent 推送后可以自动获得基础质量反馈，不必完全依赖手工记忆。
- 评审者可以优先查看 CI 是否运行过 `npm run check`，降低只跑局部检查就进入评审的风险。
- blocked summary preflight 会随 readiness 一起进入自动化路径，避免 ignored local summary 被改坏后仍被引用。
- 继续复用 AC 的 npm 入口，CI、人工本地验证和未来自动化保持同一条命令。

## 验收标准

- 新增最小 GitHub Actions workflow，触发范围覆盖 pull request 和 push。
- workflow 只需要安装 Node 依赖并运行 `npm run check`，不新增额外业务检查或 UI smoke 断言。
- CI 失败时应阻止把该次基础 readiness 视为通过；失败来源仍由 `npm run check` 下游脚本输出。
- 无 ignored local evidence 文件时，CI 应能通过现有仓库基线。
- 如存在被错误提交的 local summary 或 matching results 问题，`npm run check` 应通过现有 preflight 失败，而不是把它当作可提交证据。
- 主 agent 验证应至少覆盖 `npm run check` 本地通过、workflow YAML 结构可读、以及不提交 ignored local evidence。

## 非目标

- 不恢复 WeChat DevTools 9420 服务端口，不改变 DevTools 打开、预览或真机调试流程。
- CI 运行 `npm run check` 不等于真实 UI passed、DevTools passed 或真机 passed。
- 不提交 `harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md` 等 ignored local evidence。
- 不新增页面 UI、业务逻辑、云函数、数据模型或 npm 依赖。
- 不引入复杂矩阵、缓存策略、部署、制品上传或强制 hook；本轮只需要最小 CI 门禁。
