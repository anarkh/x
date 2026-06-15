# DevTools Smoke 命令验收清单

日期：2026-06-14

范围：用于 AF 轮验证 DevTools smoke 的 npm 手动命令是否清楚表达当前 9420 service port blocker。此清单不是 UI smoke 通过记录；在端口恢复前，严格 smoke 失败只能记为 blocker。

## 0. 进入前确认

- [ ] 工作目录为 `/tmp/street-tasks-iter-worktrees/devtools-smoke-command`；macOS 显示 `/private/tmp/...` 时按同一 worktree 记录。
- [ ] 已运行 `bash harness/init.sh`，且 JSON、harness、blocked-summary preflight 基线通过。
- [ ] 只验证命令和 blocked 口径；不退出 DevTools、不清缓存、不改真实 AppID、不提交 local 证据。

## 1. AF 命令验收

- [ ] `package.json` 保留默认入口：
  - `npm run check`
  - `npm run check:json`
  - `npm run check:harness`
  - `npm run check:readiness`
- [ ] `package.json` 新增手动 DevTools 命令：
  - `npm run inspect:devtools-port`：调用 `node scripts/inspect-devtools-port-state.mjs`。
  - `npm run check:devtools-smoke`：调用 `node scripts/check-devtools-smoke-access.mjs --strict`，或等价 strict smoke。
- [ ] 默认 `npm run check` 不调用 `check:devtools-smoke`，不调用 `check-devtools-smoke-access.mjs --strict`，不执行 DevTools CLI `open` / `preview`，不要求 9420 service port 可用才能通过。
- [ ] `npm run inspect:devtools-port` 是只读诊断：可输出当前端口状态、诊断标签、DevTools-like 进程和 listener 摘要；不打开、关闭、重启或写入项目文件。
- [ ] 当前 blocked 环境下，`npm run check:devtools-smoke` 应非零退出，并在输出中显示：
  - `status: blocked`
  - `service port 9420` 或实际检查端口
  - 端口未监听 / connection refused / requested DevTools service port is not listening
  - 如存在，记录 `--ide-http-port 9420` 进程声明
- [ ] strict smoke 的失败记录为 `DevTools service port blocker`；不得写成地图、列表、发布、详情或真机 UI 通过。

## 2. 当前 Blocked 记录

当前本机预期仍是 9420 blocker：

```bash
npm run inspect:devtools-port
npm run check:devtools-smoke
```

- [ ] `inspect:devtools-port` 若输出 `status: blocked`，摘录 `diagnosis`，优先记录 `declared_without_listener`、`connect_refused`、`no listener rows` 等摘要。
- [ ] `check:devtools-smoke` 若因 strict 非零退出，保留失败状态；不要追加 `|| true` 后写成通过。
- [ ] 如果命令缺失，记录为 `package script missing`，不是 DevTools blocker。
- [ ] 如果脚本输出与预期不一致，记录实际 `status`、端口、退出码和第一条 blocker；不要自行推断 UI 结果。

## 3. 恢复后复测

当执行者在 WeChat DevTools 中打开当前项目，并在“设置 -> 安全设置”启用 Service Port 后，再执行以下复测：

```bash
npm run inspect:devtools-port
npm run check:devtools-smoke
```

- [ ] `inspect:devtools-port` 应从 `blocked` 转为 `ready`，或至少显示 9420 有 listener 且可连接。
- [ ] `check:devtools-smoke` strict 模式应退出码为 0，并显示 `status: ready`。
- [ ] 只在 strict smoke ready 后进入小程序 UI smoke：编译项目，进入地图页，确认地图、marker、底部 tabBar 和列表入口可见。
- [ ] 点击地图页列表入口，验证地图 / 列表切换：列表可打开、可滚动、可关闭或返回地图视图；切换过程中无白屏和阻断性红色错误。
- [ ] UI 观察必须按真实结果记录为 `passed`、`failed` 或 `blocked`。命令 ready 只表示入口可用，不等于地图 / 列表 UI 通过。

## 4. 证据记录格式

建议写入 `harness/claude-progress.md` 的摘要格式：

```text
### Session 0XXAF

- 日期：2026-06-14
- 分支：<branch>
- 本轮目标：验证 AF DevTools smoke npm 手动命令和 blocked 口径
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`npm run inspect:devtools-port`；`npm run check:devtools-smoke`
- 已记录证据：package scripts 包含 `inspect:devtools-port` 和 `check:devtools-smoke`；`npm run check` 未调用 strict DevTools smoke；`inspect:devtools-port` 输出 status=<ready|blocked>、diagnosis=<...>、port=<9420>；`check:devtools-smoke` 退出码=<0|非零>、status=<ready|blocked>、blocker=<service port blocker 摘要>
- UI smoke 结果：<not_covered|passed|failed|blocked>；若端口 blocked，写 `not_covered` 或 `blocked`，不得写 passed
- 已知风险或未解决问题：<例如 DevTools service port 9420 仍无 listener，地图 / 列表真实 UI smoke 未执行>
- 下一步最佳动作：<开启 Service Port 后复跑 strict smoke；ready 后验证地图 / 列表切换>
```

最小 blocked 摘要字段：

```text
status: BLOCKED
worktree: /tmp/street-tasks-iter-worktrees/devtools-smoke-command
command: npm run check:devtools-smoke
exitCode: <nonzero>
ideHttpPort: 9420
portStatus: no listener / connection refused
blocker: DevTools service port blocker
manualJourneyImpact: DevTools UI smoke 未执行；地图 / 列表切换不可记为 passed
nextAction: 用户打开 WeChat DevTools 并启用 Service Port 后复跑 strict smoke
```
