# AI 组 DevTools Recovery Report Preflight 产品简报

日期：2026-06-15

## 产品目标

AH 已经新增 ignored local DevTools recovery dry-run report 生成能力，并提供单文件 guard，防止某一份 local report 被写成 `DevTools recovered`、`UI smoke passed` 或其他未经验证的恢复成功证据。

本轮 AI 的目标是在不加入默认 `npm run check` 的前提下，新增一个评审前手动 preflight：扫描当前 worktree 下所有 `harness/devtools-recovery-report.local*.md`，并对每一份 ignored local recovery report 逐个运行 AH 的单报告 guard。这样 reviewer 或交接人引用 recovery report 前，可以一次确认所有本地草稿仍然只是 dry-run blocked/next-step 记录，而不是被后编辑成恢复成功或 UI passed。

## 非目标

- 不恢复 9420 service port。
- 不 quit/open WeChat DevTools。
- 不执行真实 UI smoke、地图页 smoke、发布页 smoke、详情页 smoke 或真机验证。
- 不把 preflight 接入默认 `npm run check`、readiness 或 CI。
- 不提交 `harness/devtools-recovery-report.local*.md` 或其他 ignored local report。
- 不把 guard 通过解释成 DevTools recovered、UI passed、DevTools passed、真机 passed 或地图列表视觉通过。

## 使用场景

评审、交接或引用 recovery reports 前，执行者手动运行 recovery report preflight。它只检查当前 worktree 中已经存在的 ignored local recovery reports，不生成新报告，也不改变 DevTools 状态。

预期行为：

- 当前 worktree 没有 `harness/devtools-recovery-report.local*.md` 时，preflight 应通过，并清楚输出类似 `nothing checked` 的口径，表示没有本地 recovery report 需要检查。
- 当前 worktree 有一份或多份 local recovery report 时，preflight 应逐份调用单报告 guard，并报告实际 checked 数量。
- 只要任意一份 report 缺少 dry-run blocked 关键结构，或被后编辑成恢复成功、UI passed、DevTools passed 等未经验证结论，preflight 就应失败。
- preflight 失败时，执行者不能继续引用这些 local reports 作为交接证据；需要修正或删除坏报告后重新运行。

## 用户价值

AH 的单文件 guard 能保护“正在查看的那一份报告”。AI 的 preflight 进一步保护“评审前当前 worktree 里的所有报告”，降低两类风险：

- 多份 local recovery report 并存时，只检查其中一份，漏掉另一份已坏报告。
- 某份 report 在 guard 通过后被手工编辑成“恢复成功”或“UI passed”，但交接时仍被继续引用。

这个能力的价值是提高交接和评审引用证据的可信度：它不让 blocked 变成 passed，也不替代真实 UI smoke，只是在引用前确认所有本地 recovery dry-run 草稿仍保持正确边界。

## 验收口径

- preflight 扫描范围限定为当前 worktree 的 `harness/devtools-recovery-report.local*.md`。
- 没有匹配文件时应退出成功，并明确说明 nothing checked。
- 有匹配文件时应逐个运行 AH 单报告 guard；所有报告通过时，preflight 才通过。
- 任意报告包含恢复成功、UI passed、DevTools passed、真机 passed 等未经验证结论时，preflight 必须非零退出。
- 默认 `npm run check`、readiness 和 CI 不应调用该 preflight；它是评审前的显式手动检查。
