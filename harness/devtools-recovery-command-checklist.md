# DevTools Recovery Dry-run 命令验收清单

日期：2026-06-14

范围：用于 AG 轮验收 DevTools recovery dry-run 手动入口。目标是确认新增 package script 只做诊断、默认无副作用，并且当前 9420 service port blocker 下不会把 UI smoke 误记为 passed。

## 0. 进入前确认

- [ ] 工作目录为 `/tmp/street-tasks-iter-worktrees/devtools-recovery-command`；macOS 显示 `/private/tmp/...` 时按同一 worktree 记录。
- [ ] 已运行 `bash harness/init.sh`，且 JSON、harness、blocked-summary preflight 基线通过。
- [ ] 本清单只验证命令和证据口径；不默认退出 DevTools、不重开 DevTools、不清缓存、不改真实 AppID。

## 1. Package Script 验收

- [ ] `package.json` 存在 AG 新增的 recovery dry-run 手动入口：`npm run inspect:devtools-recovery`。
- [ ] 该 script 必须等价调用：

  ```bash
  node scripts/recover-devtools-service-port.mjs --dry-run
  ```

- [ ] dry-run script 可附加 `--project`、`--port 9420`、`--timeout-ms` 等诊断参数，但不得默认附加会产生副作用的 `--quit-reopen`。
- [ ] 默认 `npm run check` 不调用 recovery dry-run，不调用 `recover-devtools-service-port.mjs`，不调用 `--quit-reopen`，不触发 DevTools `quit` / `open` / `preview`。
- [ ] AF 的手动诊断命令仍独立存在：
  - `npm run inspect:devtools-port`
  - `npm run check:devtools-smoke`

## 2. Dry-run 输出验收

执行 AG 新增的 recovery dry-run script：

```bash
npm run inspect:devtools-recovery
```

输出至少应包含：

- [ ] `WeChat DevTools service port recovery report`。
- [ ] `Before status:`，包含 dry-run 前的 smoke status、exitCode 和摘要。
- [ ] `Actions attempted/skipped:`，列出 DevTools quit、reopen wait、DevTools open。
- [ ] `After status:`，包含 dry-run 后的 smoke status、exitCode 和摘要。
- [ ] `Next steps:`，说明如果仍 blocked 应如何进入带副作用恢复或人工处理。

当前 blocked 环境下的期望：

- [ ] `Before status` 应为 `blocked`，对应 9420 service port 无监听、connection refused、wait IDE port timeout 或等价 blocker 摘要。
- [ ] `After status` 仍应为 `blocked`；dry-run 不能把 blocked 变成 ready。
- [ ] `Actions attempted/skipped` 中 DevTools quit、reopen wait、DevTools open 都应为 `skipped`。
- [ ] skipped 原因应能看出是 `--dry-run` 或未允许 `--quit-reopen`。
- [ ] dry-run 结果只能作为诊断证据；UI smoke 不可记为 `passed`。

## 3. 如用户决定执行带副作用恢复

只有用户明确接受 quit/open 影响后，才执行以下复测之一。

- [ ] 直接运行带 `--quit-reopen` 且不带 `--dry-run` 的 node 命令：

  ```bash
  node scripts/recover-devtools-service-port.mjs \
    --project /tmp/street-tasks-iter-worktrees/devtools-recovery-command \
    --port 9420 \
    --timeout-ms 30000 \
    --quit-reopen
  ```

- [ ] 或执行等价人工 UI 操作：手动退出 WeChat DevTools，重新打开当前项目，并确认服务端口设置。
- [ ] 记录 side effects：DevTools 是否被退出、是否重开、模拟器/控制台/预览二维码/真机调试是否被中断、是否打开了正确 worktree。
- [ ] 恢复动作结束后必须复跑 AF 命令：

  ```bash
  npm run inspect:devtools-port
  npm run check:devtools-smoke
  ```

- [ ] 只有 `check:devtools-smoke` 显示 `status: ready` 且退出码为 0 后，才能进入真实 DevTools UI smoke。
- [ ] 真实 UI smoke 需要单独操作和记录；即使 recovery 成功，也不自动等于地图、列表、发布、详情或真机验证 passed。

## 4. 证据记录格式

建议写入 `harness/claude-progress.md` 的摘要：

```text
### Session 0XXAG

- 日期：2026-06-14
- 分支：<branch>
- 本轮目标：验证 AG DevTools recovery dry-run 手动入口和默认无副作用口径
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`npm run inspect:devtools-recovery`
- 已记录证据：package script `inspect:devtools-recovery` 存在并调用 `recover-devtools-service-port.mjs --dry-run`；默认 `npm run check` 未调用 recovery dry-run、未调用 `--quit-reopen`、未触发 DevTools quit/open
- dry-run 结果：before=<blocked|ready>；after=<blocked|ready>；actions=<skipped|attempted 摘要>；nextSteps=<输出摘要>
- 当前 blocked 口径：before/after 仍 blocked 时，记录 service port 9420 blocker；actions skipped；UI smoke=<not_covered|blocked>，不得写 passed
- 如执行带副作用恢复：命令或人工 UI 操作=<...>；side effects=<退出/重开/中断摘要>；复跑 `inspect:devtools-port` 结果=<...>；复跑 `check:devtools-smoke` 结果=<...>
- 已知风险或未解决问题：<例如 9420 仍无 listener，真实 DevTools UI smoke 未执行>
- 下一步最佳动作：<若 ready，进入真实 UI smoke；若 blocked，人工确认服务端口或换机复测>
```
