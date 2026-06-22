# AH 组 DevTools Recovery 报告草稿产品简报

## 产品目标

AG 已新增 `inspect:devtools-recovery`，可以无副作用展示 WeChat DevTools service port recovery 的 dry-run 控制台报告。AH 的目标是把这份 dry-run 输出保存成 ignored local Markdown 报告草稿，方便交接、评审和后续恢复决策引用，但不提交本地证据。

这份草稿只记录“当前仍被阻塞”和“恢复动作被 dry-run 跳过”的事实。它的价值是让 reviewer 不必翻控制台，也能看到同一轮诊断的 before status、actions skipped、after status 和 next steps。

## 非目标

- 不恢复 9420 service port。
- 不 quit/open WeChat DevTools。
- 不运行带副作用的 `--quit-reopen` 恢复流程。
- 不把报告生成或 guard 加入默认 `npm run check`、readiness 或 CI。
- 不声称 UI smoke passed、DevTools passed、真机通过或恢复成功。
- 不提交 ignored local Markdown 草稿或其他本地 evidence。

## 报告价值

报告草稿应保留四类信息：

- `Before status`：运行 dry-run 前的 9420 状态和诊断原因。
- `Actions skipped`：DevTools quit、reopen wait、DevTools open 等动作均未执行，并记录 `skipped because --dry-run was requested`。
- `After status`：dry-run 后状态复查结果。当前预期仍为 `blocked`，因为 dry-run 不改变本机 DevTools。
- `Next steps`：下一步应由用户在 DevTools UI 中启用 Service Port，或在明确接受副作用后另行执行非 dry-run 恢复；真实 UI journey 仍需单独手测。

## Guard 要求

guard 的职责是确认报告仍是 dry-run blocked 草稿，而不是恢复证据：

- 报告路径必须是 ignored local Markdown 草稿；可提交改动中不能包含本地报告本体。
- 报告必须包含 dry-run 口径、before status、actions skipped、after status 和 next steps。
- 当前 blocked 场景下，before/after 都应记录为 `blocked`。
- DevTools quit/open 相关动作必须记录为 skipped，原因是 `--dry-run`。
- 拒绝把草稿写成 `UI smoke passed`、`DevTools passed`、`恢复成功`、`9420 restored` 或等价夸大结论。

## 当前 blocked 预期

在当前环境下，报告应清楚记录：

- `Before status: status: blocked`。
- `Actions skipped` 中 DevTools quit、reopen wait、DevTools open 均为 `skipped because --dry-run was requested`。
- `After status: status: blocked`。
- `Next steps` 指向手动启用 Service Port 或经用户确认后再执行带副作用恢复，并明确这不是 UI smoke passed。
