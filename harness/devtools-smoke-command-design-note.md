# DevTools Smoke 命令设计说明

日期：2026-06-14

## 目标

AF 轮只为 DevTools smoke 增加清晰的手动命令入口和报告口径。当前 9420 service port blocker 仍阻止真实 WeChat DevTools UI smoke 执行；报告应说明“环境阻塞”，不能暗示 Street Tasks 用户界面失败，也不能把未执行项写成通过。

## 状态边界

- `blocked`：有具体环境阻塞证据，导致目标 smoke 无法执行。例如 9420 service port 无 listener、connection refused、DevTools CLI timeout。结论是“入口被环境挡住”，不是“地图/列表/发布/详情失败”。
- `unverified`：本轮没有执行，也没有足够 blocker 证据。适用于未打开 DevTools、未跑对应 journey、未观察真机或 UI 页面。不能因为静态检查、readiness 或 helper 通过而升级。
- `passing`：真实检查已经执行并通过，且有命令输出、退出码、页面观察或截图/记录等证据。strict smoke passing 只说明 DevTools smoke 入口可用；UI journey passing 还必须来自真实 DevTools UI 或真机观察。

## 命名体验原则

- `inspect:*` 表示只读诊断。`inspect:devtools-port` 只能读取端口、进程和连接状态，用来回答“现在为什么不能 smoke”，不应作为验收门禁。
- `check:*` 表示可作为验收门禁。`check:devtools-smoke` 是 strict smoke 入口，失败时应让执行者看到明确环境恢复动作，而不是把失败埋进普通 preflight。
- 默认 `npm run check` 不应包含真实 DevTools strict smoke。它可以保证 JSON、harness、readiness 和 blocked-summary preflight，但不能证明 WeChat DevTools UI 已通过。

## 推荐报告短文案

| 场景 | 推荐短状态 | 避免写法 |
| --- | --- | --- |
| 9420 无监听或 connection refused | `DevTools 端口阻塞，UI smoke 未执行` | `UI smoke failed` |
| strict smoke 因 service port blocker 非零退出 | `blocked: DevTools service port 9420 不可达` | `地图页失败` |
| 只跑了 readiness / static guard | `preflight passing，真实 UI smoke unverified` | `DevTools passed` |
| 没有执行目标 journey | `unverified: 本轮未执行该 journey` | `默认视为通过` |
| 端口 ready 但未看 UI | `strict smoke passing，UI journey unverified` | `地图列表通过` |
| DevTools/真机真实观察通过 | `passing: 已在 DevTools/真机完成 <journey> 观察` | `脚本通过所以 UI 通过` |

## 报告字段建议

最小摘要应分开写三层：

```text
portStatus: blocked | ready | unknown
strictSmoke: blocked | unverified | passing
uiSmoke: blocked | unverified | passing | failed
```

当前 AF blocked 推荐摘要：

```text
Status: blocked
Summary: DevTools 端口阻塞，UI smoke 未执行
Evidence: inspect:devtools-port 显示 9420 无 listener / connection refused；check:devtools-smoke strict 非零退出
Impact: 未进入 WeChat DevTools UI journey；不能声明地图、列表、发布或详情失败
Next action: 在 WeChat DevTools 启用 Service Port 并确认 9420 可监听后，复跑 check:devtools-smoke；strict passing 后再执行真实 UI smoke
```

## 严格 smoke 失败的呈现

`check:devtools-smoke` 的 strict 失败应突出“环境恢复动作”：

- 标题或首行使用 `blocked`，不要只写 `failed`。
- 摘要包含端口号、连接结果和进程声明，例如 `9420 declared_without_listener / connect_refused`。
- 下一步指向用户可执行恢复：打开 WeChat DevTools，启用 Service Port，重开当前 worktree，再复跑 strict smoke。
- 恢复前，所有 UI journey 保持 `blocked` 或 `unverified`；恢复后也只有真实观察过的 journey 才能写 `passing`。
