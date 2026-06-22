# 传播链 DevTools Blocked Evidence 自动落盘 Product Brief

- 日期：2026-06-16
- 分支：`codex/iter-viral-blocked-evidence-capture`
- 角色：Q 组产品 agent
- 关联能力：P 组 DevTools 手测准备包，O 组传播链 ignored local 手测证据 gate

## 目标

新增一个由用户明确触发的 capture 命令：当传播链真实 DevTools/真机手测被当前环境阻塞时，把“真实 blocker 诊断”自动写入 ignored local viral journey result JSON，并立刻运行 `scripts/check-viral-journey-manual-evidence.mjs` 校验结构。

这个命令要解决的问题不是让 UI 测试自动通过，而是让无法进入真实手测的状态也有可复核、可交接、不会误报 `passed` 的本地证据。capture 后，七条传播 journey 必须全部是 `blocked`，`summary.overallStatus` 必须是 `blocked`，并且输出必须反复说明：这仍不代表 WeChat DevTools 或真机 UI passed。

## 非目标

- 不修改传播链业务 UI、分享路径、评论、确认、接力提示或风险态逻辑。
- 不替代 P 组的无副作用准备命令；P 的默认命令仍然不写文件。
- 不替代 O 组的真实 manual evidence checker；capture 写完后必须继续使用 O 的 checker 验证。
- 不自动 quit/open WeChat DevTools，不杀进程，不清缓存，不修改 service port、AppID、项目配置、本地 storage 或 CloudBase 数据。
- 不把 blocked evidence 转成 `passed`、`failed` 或发布通过结论。
- 不提交 ignored local JSON、截图、录屏、payload 或原始日志。

## 目标用户

- 准备执行传播链真实手测，但被 DevTools service port、smoke access、设备、项目入口或数据 fixture 阻塞的开发、QA、产品 agent。
- 需要把“为什么没法测”交接给下一位 agent 的执行者。
- 评审 blocked 证据的人：他们需要快速判断当前是环境 blocker，而不是产品 journey 已失败或已通过。

## 什么时候应该 Capture

只有在用户明确运行 capture 命令时才应该写文件。推荐场景：

- P 组准备命令已经显示当前真实环境 blocked，例如 `9420 no listener`、service port 未声明、端口连接失败或 smoke access blocked。
- 执行者准备开始七条传播 journey，但 DevTools UI、真机、系统分享入口、目标 worktree 或必要 fixture 无法进入。
- 当前 blocker 已经足够具体，可以写清“阻塞阶段、诊断事实、影响范围、下一步恢复动作”。
- 需要留下一份 ignored local JSON，让 O 组 checker 证明 blocked evidence 的结构合规。

## 什么时候不应该 Capture

- 只是想预览准备包、列出七条 journey 或检查端口状态；这应继续使用 P 组无副作用命令。
- 已经进入真实 UI 并观察到产品行为与期望相反；这应写 `failed`，不能用环境 blocked 掩盖真实缺陷。
- 已经完成真实 DevTools 或真机观察并有证据；这应填写真实 `passed` 或 `failed` evidence，而不是生成全 blocked 文件。
- blocker 只有猜测，没有可复核诊断事实，例如“感觉 DevTools 有问题”。
- 输出路径不是 ignored local result，或会覆盖他人的本地结果且未显式 `--force`。
- 期望把 capture 结果作为 CI 通过、发布通过、UI passed 或真实手测完成的证明。

## Blocked Evidence 字段要求

capture 生成的 JSON 应复用 O 组 schema：`schemaVersion`、`branch`、`commit`、`testedAt`、`tester`、`environment`、`summary`、`journeys`。它必须写入 ignored local 路径，例如 `harness/manual-test-results.local-viral-journey.json` 或同模式文件。

顶层和 `summary` 应包含：

- 当前分支和 commit，必须匹配运行 capture 时的 HEAD。
- `testedAt` 使用 capture 发生的 ISO 时间。
- `tester` 表达本次是 local blocked capture，而不是真实 UI tester 结果。
- `summary.overallStatus: "blocked"`。
- `summary.recommendation` 明确说明需要先恢复 DevTools/真机/fixture，再执行真实七条 journey。
- `summary.notes` 明确说明：所有 journey 都未通过真实 UI 验收，capture 只是 blocked 证据落盘。

`environment` 应尽量记录真实诊断，而不是占位符：

- DevTools service port：端口号、目标 host、是否有 `ide-http-port` 声明、声明值、是否有 listener、IPv4/IPv6 连接结果。
- port forensics：P 组 `inspect-devtools-port-state` 的 `status`、关键 diagnosis、可见进程摘要、项目路径、命令状态。
- smoke access：P 组 smoke probe 的 `status`、timeout、HTTP/连接错误、stdout/stderr 摘要。
- DevTools/project：目标 worktree、是否确认打开过项目、无法确认的原因。
- device/runtime：模拟器或真机是否可用；无法读取 DevTools 版本、基础库版本、设备型号时，写成“unknown because blocked by ...”，不要留模板占位。
- CloudBase/data setup：是否已确认 CloudBase、目标 active post、风险态 fixture；若未能进入 UI 或准备 fixture，写明未确认原因。

每条 journey 都必须：

- 保留七个固定 ID：`first-hop-share-entry`、`receiver-confirm-conversion`、`receiver-comment-conversion`、`second-hop-receiver-source`、`ordinary-and-risk-entries`、`timeline-share-channel`、`timeline-risk-gating`。前五个是 O/P 组 receiver 传播基线，后两个是 W 组追加的 timeline 渠道和风险态 no-timeline 证据。
- `status: "blocked"`。
- 保留原始 `steps` 和 `expected`，便于恢复后继续真实手测。
- `actual` 写清未发生真实 UI 观察，例如 DevTools service port/smoke blocked，所以未打开目标页面、未点击 confirm/comment、未检查系统分享 payload、未验证风险态。
- `evidence` 可放脱敏命令摘要、diagnosis 文本、port/smoke 输出摘要或本地日志路径；不能放 example 文案或虚构截图。
- `blocker` 写具体阻塞事实，例如 `port 9420 had no listener`、`project did not declare ide-http-port`、`smoke access timed out`。
- `risks` 写本 journey 因 blocked 仍未判断的用户风险。
- `followUp` 写下一步恢复条件和恢复后要重跑的命令或真实 journey。

## 与 P/O 的关系

P/W 组已有 `scripts/prepare-viral-journey-devtools-run.mjs`：它默认无副作用，只输出 port forensics、smoke blocked、dry-run、七条 journey 和下一步。Q 的 capture 命令应消费或复用该诊断口径，但不能改变默认不写文件的安全边界。

O/W 组已有 `scripts/prepare-viral-journey-manual-evidence.mjs` 和 `scripts/check-viral-journey-manual-evidence.mjs`：它们负责 ignored local result 的 schema、七条 journey、状态聚合、branch/commit 和 evidence 规则。Q 的 capture 命令应写出 checker 可接受的 blocked JSON，并在写完后自动运行 checker。checker passed 只说明 blocked JSON 合规，不说明 UI passed。

Q 的定位是二者之间的显式桥接：把 P 发现的真实环境 blocker，落成 O 能校验的 ignored local blocked result。

## 成功、Blocked、Failed 语义

`success` 指 capture 命令本身成功完成：读取当前诊断、写入 ignored local JSON、七条 journey 均为 `blocked`、自动运行 manual evidence checker 且通过。success 不代表真实 UI passed，也不代表传播链产品通过。

`blocked` 指当前无法执行或完成真实传播链 DevTools/真机 journey。blocked 是结果文件里的产品验收状态，说明发布判断仍不可得，需要先恢复环境或数据条件。blocked 不是产品失败。

`failed` 只应出现在已经进入真实 UI 并观察到与 expected 相反的产品行为时。capture 命令不应生成 `failed` journey；如果执行者已经有真实失败观察，应手工填写 failed evidence 并跑 O checker，而不是运行 blocked capture。

## 验收标准

- 新增一个明确命名的 capture 入口；默认 P 组准备命令仍不写文件。
- capture 只在用户明确运行时写 ignored local viral journey result，输出路径必须被 git ignore，且默认不覆盖既有结果。
- capture 能记录当前真实 blocker 诊断，至少覆盖 port forensics、`ide-http-port` 声明/缺失、listener/连接结果、smoke access 结果、项目路径、未能确认的 DevTools/runtime/data 原因。
- 生成结果中七条 required journey 全部为 `blocked`，`summary.overallStatus` 为 `blocked`，没有任何 `passed` journey。
- 生成结果保留七条 journey 的步骤和期望，并为每条 journey 写明 `actual`、`blocker`、`risks`、`followUp`。
- 写入后自动运行 `node --no-warnings scripts/check-viral-journey-manual-evidence.mjs <local-json>`，并在 checker 失败时返回 failed 命令状态。
- 命令输出明确区分“capture 成功/blocked evidence 合规”和“真实 UI passed”；不得出现容易让人以为 UI 已通过的文案。
- 不执行 quit/open/kill/cache/config/storage/CloudBase 修改等副作用动作。

## 误读风险

- 把 capture success 误读为传播链 passed：必须在命令输出和 JSON summary 中明确否认。
- 把 blocked 误读为产品 failed：blocked 只说明环境或 fixture 阻止测试，不能据此判定用户体验失败。
- 把 P 的 dry-run、port forensics 或 smoke blocked 误读为真实 UI evidence：它们只能作为 blocked diagnosis。
- 把 O checker passed 误读为 evidence passed：checker 只校验结构和聚合状态，blocked 文件通过仍是 `overallStatus=blocked`。
- 用全 blocked JSON 长期替代真实手测：followUp 必须要求恢复 DevTools/真机后重跑七条 journey，并补真实 evidence。
- 写入未 ignored 文件或提交本地结果：capture 必须拦截未 ignored 路径，并提醒不要提交 local JSON。
