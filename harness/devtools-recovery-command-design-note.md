# DevTools Recovery Dry-Run 命令设计说明

日期：2026-06-14

## 背景与目标

AF 已新增 DevTools 服务端口诊断和 strict smoke 手动命令。AG 计划基于 `scripts/recover-devtools-service-port.mjs` 增加 recovery dry-run 手动入口，用来判断当前环境是否适合执行恢复动作，并演练恢复报告结构。

该入口的核心定位是“恢复准入/演练”，不是默认检查，也不是自动恢复。现有 recovery 脚本默认是 diagnostic-only；只有用户显式传入 `--quit-reopen`，且没有传入 `--dry-run` 时，才允许执行 quit/open WeChat DevTools 的 side-effect 动作。

本说明用于约束命令命名、报告层次和状态文案，避免三类误解：

- 把 dry-run blocked 误读成产品功能 bug 或恢复失败。
- 把 dry-run 报告误读成 DevTools 已恢复。
- 把会 quit/open DevTools 的 side-effect 命令误接入默认 `check`、CI 或普通 readiness。

## 命令命名原则

- `inspect:*`：只读诊断。可以读取端口、进程、CLI、项目路径等状态；不得 quit/open DevTools、清缓存、写文件或启动 preview。
- `check:*`：strict/门禁。适合在手动门禁或 CI 中表达“通过/阻塞”，blocked 时应返回失败；不得偷偷执行恢复 side effect。
- recovery dry-run：描述为“恢复准入/演练”。它可以复用 recovery 报告结构，但必须明确 actions 是 skipped，不应纳入默认 `npm run check`、`check:readiness`、`harness/init.sh` 或 CI。
- side-effect recovery：必须显式带有 `--quit-reopen`，并在命令名、说明或运行输出中标注“会退出并重新打开 WeChat DevTools”。不能作为默认检查入口。

推荐表达：

- `inspect:devtools-port`：只读端口与进程取证。
- `check:devtools-smoke`：strict smoke access 门禁，blocked 可失败。
- AG recovery dry-run 手动入口：`恢复准入/演练：运行 recovery dry-run，确认当前是否仍被服务端口阻塞，以及若要恢复会跳过或尝试哪些动作。`
- side-effect 手动入口：`显式恢复动作：仅在用户接受 quit/open DevTools 后运行，不进入默认 check。`

## Recovery 报告层次

Recovery 报告建议固定为四段，并保持段落顺序稳定。

### 1. Before status

说明执行任何 recovery actions 前的环境访问状态。这里回答“当前 DevTools service port 是否已经可用”，不是回答“产品 smoke 是否通过”。

需要包含：

- `status`: `ready`、`blocked` 或 `unknown`。
- 关键摘要：端口是否监听、CLI 是否可用、项目路径是否有效、smoke access 是否超时。
- 若是 blocked，说明 blocker 是环境访问层，例如服务端口不可达、CLI 不可用或项目路径无效。

### 2. Actions attempted/skipped

逐项列出 action，而不是只给一个总状态。dry-run 下应清楚显示 quit、wait、open 都被 skipped。

需要包含：

- action 名称，例如 `DevTools quit`、`reopen wait`、`DevTools open`。
- `attempted` 或 `skipped`。
- skip reason，例如 `skipped because --dry-run was requested` 或 `skipped because --quit-reopen was not provided`。
- 只有 side-effect 模式才能显示 quit/open attempted；此时要同时展示 exitCode、timeout、stdout/stderr 摘要等结果。

### 3. After status

说明 actions 之后再次检查到的环境访问状态。dry-run 的 after status 只是“再次诊断”，不是恢复结果。

文案原则：

- dry-run + blocked：写成“恢复未执行，环境仍阻塞”。
- side-effect + blocked：写成“已尝试显式恢复动作，但环境仍阻塞”。
- ready：写成“服务端口访问已可用，可继续手动 smoke”，但不能写成“用户旅程已通过”。

### 4. Next steps

给出下一步人工动作，不要把自动脚本当成验收证据。

建议包含：

- 如果 dry-run 仍 blocked：提示用户先在 WeChat DevTools UI 中开启 Settings -> Security Settings -> Service Port，再重新打开项目或复跑 dry-run。
- 如果用户接受副作用：提示显式运行带 `--quit-reopen` 的 recovery 命令。
- 如果 after ready：提示继续执行真实 DevTools/manual smoke，并把观察结果记录到 manual evidence。
- 如果需要 strict 门禁：提示使用 strict smoke/check 命令，而不是把 recovery dry-run 接入默认 check。

## 状态文案原则

- dry-run blocked 是“恢复未执行/环境仍阻塞”，不是“恢复失败的产品 bug”。
- blocked 应优先归类到环境访问层，除非后续真实小程序页面操作已经证明某个产品旅程失败。
- ready 只表示 DevTools service port 或 smoke access 可用，不代表地图、发布、详情、图片或定位流程已通过。
- side-effect 动作必须显式标注，包括 quit/open DevTools、等待重启、打开项目、可能打断当前 DevTools 会话。
- 报告应避免把 `before`、`after` 和 `actions` 合并成单一“成功/失败”，否则用户无法判断到底是诊断失败、恢复未执行，还是显式恢复后仍阻塞。

## 推荐短文案

1. `恢复准入 dry-run：本次没有退出或重新打开 DevTools，只检查 before/after 状态和将会跳过的动作。`
2. `status: blocked。恢复未执行，当前 DevTools service port 仍不可达；这不是产品 smoke 失败证据。`
3. `Actions skipped: DevTools quit/open skipped because --dry-run was requested.`
4. `status: ready。服务端口访问可用；请继续运行真实 DevTools smoke，并单独记录手测观察。`
5. `Side-effect mode: 将退出并重新打开 WeChat DevTools；仅在用户明确接受该动作后运行，不纳入默认 check。`

## 避免写法

1. 避免：`恢复失败，产品仍不可用。`
   原因：dry-run blocked 只说明环境访问仍阻塞，不能上升为产品 bug。

2. 避免：`dry-run 后 DevTools 已恢复。`
   原因：dry-run 没有执行 quit/open；只能说环境状态是否 ready。

3. 避免：`npm run check 会自动修复 DevTools 端口。`
   原因：默认 check/readiness 不应包含恢复 side effect。

4. 避免：`smoke passed。`
   原因：仅当真实 DevTools/manual smoke 已运行并记录观察时，才能说对应 journey passed。

5. 避免：`尝试重启 DevTools。`
   原因：side-effect 动作必须写明是 quit/open DevTools，并说明它是显式 opt-in。
