# AH DevTools Recovery 本地报告设计说明

日期：2026-06-15

## 设计目标

AH 报告的定位是把 AG 的 `inspect:devtools-recovery` dry-run 控制台输出整理成一份本地 ignored Markdown 草稿，便于交接、评审和后续人工恢复决策引用。它只说明“本次 dry-run 看到了什么”和“哪些恢复动作被跳过”，不恢复 DevTools，也不证明任何小程序页面体验已经通过。

报告必须始终让读者先看到三个边界：

- 这是 local ignored 草稿，不进入提交，不作为正式 evidence 本体。
- 这是 dry-run，无退出、无重开、无清缓存、无 preview 等副作用。
- 真实 DevTools UI smoke 和真机验证需要另行执行并单独记录。

## 信息层级

报告建议固定为四层，从可审计元信息到下一步动作逐层展开。

### 1. Run metadata

用于让 reviewer 知道这份草稿来自哪一次运行，而不是让它看起来像正式验收结果。

建议字段：

- `reportType`: `DevTools recovery dry-run local draft`
- `date`: `2026-06-15`
- `worktree`: 当前 worktree 路径
- `branch`: 当前分支
- `command`: 生成报告所运行的 prepare 或 inspect 命令
- `outputPath`: `harness/devtools-recovery-report.local*.md`
- `sideEffects`: `none`
- `evidenceScope`: `handoff draft only; not UI smoke evidence`

### 2. Guard status

用于把误读防护放在原始日志前面。读者不应先读到大段 dry-run 输出，再自行推断它是否安全。

建议字段：

- `guard`: `passed` 或 `blocked`
- `ignoredLocalReport`: `yes`
- `dryRun`: `yes`
- `actionsSkipped`: `yes`
- `beforeStatus`: `blocked`、`ready` 或 `unknown`
- `afterStatus`: `blocked`、`ready` 或 `unknown`
- `forbiddenClaimsFound`: `none`
- `summary`: 一句话说明“guard 只确认报告口径安全，不确认 UI smoke 通过”。

### 3. Raw dry-run report

用于保留 AG 命令的原始可追溯信息，但不要把 raw output 包装成通过结论。

建议顺序：

- `Before status`: service port、CLI、项目路径、strict smoke access 等运行前状态。
- `Actions attempted/skipped`: DevTools quit、reopen wait、DevTools open 等动作逐项列出，并明确 `skipped because --dry-run was requested`。
- `After status`: dry-run 后复查状态。当前 blocked 环境下应继续是 `blocked`。
- `Diagnostics note`: 若有端口不可达、timeout、ECONNREFUSED 等原因，归类为 DevTools 环境访问层阻塞。

### 4. Next action

用于把“交接能做什么”和“验收还缺什么”分开。

推荐内容：

- 若仍 `blocked`：请先在 WeChat DevTools UI 中确认 Settings -> Security Settings -> Service Port，再复跑 dry-run 或 strict smoke。
- 若要执行恢复：必须由用户明确接受 quit/open DevTools 的副作用后，才运行非 dry-run 恢复命令。
- 若 service port 变为 `ready`：继续执行真实 DevTools UI smoke，并将地图列表、发布、详情等观察写入 manual evidence。
- 无论状态如何，本地报告只能用于交接，不能替代真实 DevTools UI smoke。

## Guard 保护边界

guard 应保护的是“读者不会把本地 dry-run 草稿误读成恢复或通过证据”，而不是判断产品体验是否好坏。

必须保护：

- local report 是 ignored 草稿：路径应匹配 `harness/devtools-recovery-report.local*.md`，不应出现在可提交 evidence 中。
- dry-run 是无副作用：报告必须明确 `dryRun: yes` 或等价口径。
- actions must be skipped：DevTools quit、reopen wait、DevTools open 等恢复动作在 dry-run 报告中必须是 skipped。
- blocked 不等于产品失败：before/after blocked 只说明 DevTools service port 或环境访问仍阻塞。
- ready 不等于页面通过：service port ready 只表示可以继续手测，不代表地图、发布、详情、定位或图片流程已通过。

guard 必须拒绝这些通过或恢复声明：

- `UI smoke passed`
- `DevTools passed`
- `DevTools recovered`
- `real device passed`
- `真机 passed`
- `真机通过`
- `恢复成功`
- `已恢复`
- `小程序验收通过`

## 推荐短状态

可放在报告顶部或 reviewer 摘要中：

- `Local draft only: ignored recovery dry-run report; not submitted evidence.`
- `Dry-run only: no quit/open DevTools actions were executed.`
- `Guard status: safe to hand off; not UI smoke evidence.`
- `Before/after status: blocked; environment access still needs manual recovery.`
- `Actions skipped: DevTools quit/open skipped because --dry-run was requested.`
- `Next action: run real DevTools UI smoke after service port is ready.`

中文推荐：

- `本地草稿：仅用于交接，不是正式验收证据。`
- `dry-run：未退出或重新打开 DevTools。`
- `guard 通过：报告口径安全，但不代表 UI smoke 通过。`
- `before/after blocked：当前仍是环境访问阻塞，不是产品体验失败。`
- `下一步：服务端口 ready 后，单独执行真实 DevTools UI smoke。`

## 避免写法

以下写法容易把 dry-run 草稿误读成真实恢复或通过证据，应由 guard 拦截或在人工 review 中改写。

| 避免写法 | 问题 | 建议改写 |
| --- | --- | --- |
| `UI smoke passed` | 没有真实 UI smoke 证据 | `UI smoke not run; local dry-run draft only` |
| `DevTools recovered` | dry-run 没有执行恢复动作 | `Recovery not executed; actions skipped by dry-run` |
| `恢复成功` | 会被读成服务端口或页面已恢复 | `dry-run completed; before/after status recorded` |
| `真机通过` | 本报告不涉及真机 | `real-device validation not run` |
| `before/after blocked，所以产品不可用` | 把环境阻塞上升为产品失败 | `DevTools service port remains blocked; product journey unverified` |
| `service port ready，所以地图通过` | ready 只表示可开始手测 | `service port ready; run map/list/detail smoke next` |

## 交接口径

这份 local recovery report 可以用于交接以下事实：

- 本次 dry-run 的运行时间、分支、worktree 和命令。
- recovery guard 是否确认报告仍是 ignored local draft。
- before/after service port 状态。
- DevTools quit/open 等动作是否被 dry-run 跳过。
- 下一步应先做环境恢复、strict smoke，还是人工 UI smoke。

它不能替代以下验证：

- WeChat DevTools 中真实打开项目、编译并观察页面。
- 地图列表、marker/detail 链路、发布状态、详情 TrustInsight 等用户旅程 smoke。
- 真机定位授权、图片上传、safe area、键盘遮挡和云端路径验证。

最终结论应保持为：本报告可降低交接误读风险，但不能把 AH dry-run 草稿当作真实 DevTools UI smoke 通过证据。
