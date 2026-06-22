# DevTools Recovery Report Preflight 设计说明

日期：2026-06-15

## 设计目标

本 preflight 面向 AH 已有的单份 ignored local DevTools recovery dry-run report guard。它扫描所有 `harness/devtools-recovery-report.local*.md`，并对每一份报告逐个运行 guard，帮助交接前确认本地草稿仍然是 dry-run、ignored、无恢复成功声明的安全口径。

preflight 的结论只能说明“本地 recovery dry-run 报告草稿是否仍符合 guard 约束”。它不能说明 DevTools 已恢复，也不能说明真实 UI smoke 已执行或通过。

## 输出层级

输出建议固定为四层，让 reviewer 先理解检查边界，再看逐项结果。

### 1. Scan scope

说明本次扫描了什么，不把“无文件”误写成“恢复完成”。

建议字段：

- `pattern`: `harness/devtools-recovery-report.local*.md`
- `scope`: `ignored local recovery dry-run reports only`
- `count`: 匹配到的报告数量
- `action`: `run existing report guard for each matched report`

### 2. Per-report result

逐份报告输出 guard 结果，失败时给出文件路径和 guard 原始失败原因，避免 reviewer 只看到聚合失败却不知道哪份报告需要修。

建议字段：

- `report`: 报告路径
- `guard`: `passed` 或 `failed`
- `reason`: 失败时引用 guard 的短错误原因
- `meaning`: `report hygiene only; not UI smoke evidence`

### 3. Aggregate status

聚合状态只描述 preflight 本身，不扩大成产品验收结论。

建议状态：

- `none`: 未发现 local reports，因此没有报告需要 guard。
- `passed`: 找到的所有 local reports 都通过 guard。
- `failed`: 至少一份 local report 未通过 guard。

聚合行建议同时给出数量：`checked`、`passed`、`failed`。

### 4. Not UI Evidence Warning

无论 `none`、`passed` 还是 `failed`，最后都必须输出非 UI 证据警告。失败表示报告口径或草稿一致性有问题，不表示小程序 UI 失败；通过表示报告草稿安全，不表示 UI 通过。

## 推荐输出文案

### 无 local reports

```text
No local DevTools recovery reports found; nothing checked.
Scan scope: harness/devtools-recovery-report.local*.md
Preflight status: none. This does not mean DevTools was recovered or UI smoke was run.
Preflight is not UI evidence; run real DevTools UI smoke separately.
```

中文口径：

```text
未发现本地 DevTools recovery report；本次没有报告需要检查。
扫描范围：harness/devtools-recovery-report.local*.md
preflight 状态：none。该状态不代表 DevTools 已恢复，也不代表 UI smoke 已执行。
preflight 不是 UI 证据；真实 DevTools UI smoke 需要单独执行。
```

### 检查 N 份

```text
Found 3 local DevTools recovery report(s).
Checking harness/devtools-recovery-report.local-a.md ... passed.
Checking harness/devtools-recovery-report.local-b.md ... passed.
Checking harness/devtools-recovery-report.local-c.md ... passed.
Preflight status: passed. Checked 3 report(s), 3 passed, 0 failed.
Preflight passed, but this is not UI evidence and does not prove DevTools recovery.
```

中文口径：

```text
发现 3 份本地 DevTools recovery report。
检查 harness/devtools-recovery-report.local-a.md ... passed。
检查 harness/devtools-recovery-report.local-b.md ... passed。
检查 harness/devtools-recovery-report.local-c.md ... passed。
preflight 状态：passed。共检查 3 份，3 份通过，0 份失败。
preflight passed 只代表报告 guard 通过，不是 UI 证据，也不证明 DevTools 已恢复。
```

### 某份失败

```text
Found 3 local DevTools recovery report(s).
Checking harness/devtools-recovery-report.local-a.md ... passed.
Checking harness/devtools-recovery-report.local-b.md ... failed: Report must not claim unverified success.
Checking harness/devtools-recovery-report.local-c.md ... passed.
Preflight status: failed. Checked 3 report(s), 2 passed, 1 failed.
Fix or remove the failed local report before citing recovery handoff notes.
Failure is report-guard evidence only; it is not a DevTools UI smoke result.
```

中文口径：

```text
发现 3 份本地 DevTools recovery report。
检查 harness/devtools-recovery-report.local-a.md ... passed。
检查 harness/devtools-recovery-report.local-b.md ... failed：报告包含未验证通过声明。
检查 harness/devtools-recovery-report.local-c.md ... passed。
preflight 状态：failed。共检查 3 份，2 份通过，1 份失败。
引用 recovery 交接说明前，请先修复或移除失败的本地报告。
失败只说明报告 guard 未通过，不是 DevTools UI smoke 结果。
```

### Preflight passed 但不是 UI evidence

```text
DevTools recovery report preflight passed. Checked 3 report(s).
This only means every matched local dry-run report passed its guard.
It is not UI evidence, not real-device evidence, and not proof that DevTools recovered.
Run real DevTools UI smoke separately before recording user-visible passing evidence.
```

中文口径：

```text
DevTools recovery report preflight passed，共检查 3 份报告。
这只代表所有匹配到的本地 dry-run report 都通过了 guard。
它不是 UI 证据，不是真机证据，也不证明 DevTools 已恢复。
记录用户可见 passing evidence 前，仍需单独执行真实 DevTools UI smoke。
```

## 避免写法

以下写法会让 reviewer 把 preflight 误读成真实恢复或 UI 通过，应在输出和报告摘要中避免：

| 避免写法 | 问题 | 推荐改写 |
| --- | --- | --- |
| `DevTools recovered` | preflight 没有执行恢复动作 | `DevTools recovery not verified; local reports only passed guard` |
| `UI smoke passed` | preflight 没有打开页面做 UI smoke | `UI smoke not run; preflight checked local reports only` |
| `all recovery complete` | 会被读成恢复流程已完成 | `all matched local reports passed guard` |
| `恢复成功` | 会被读成服务端口或页面已恢复 | `恢复未验证；本次仅检查本地 dry-run report` |
| `页面通过` | 没有真实页面观察证据 | `页面未手测；需要另行执行 DevTools UI smoke` |
| `可作为验收证据` | 本地 ignored 草稿不能替代验收 | `可作为交接前复核，不是验收证据` |

## 交接使用边界

preflight 可以用于交接前复核：

- 检查是否存在多份 ignored local recovery report。
- 逐份确认 report guard 仍能拦截恢复成功或 UI passed 误写。
- 在交接摘要中说明哪些本地报告可以被安全引用为 dry-run handoff notes。
- 在失败时定位需要修复或删除的本地草稿。

preflight 不能替代真实 DevTools UI smoke：

- 不会启动、恢复、退出或重新打开 WeChat DevTools。
- 不会确认 DevTools service port 是否已经恢复可用。
- 不会编译小程序、打开地图页、发布页或详情页。
- 不会验证地图列表、定位授权、发布闭环、详情信任说明、图片上传或真机 safe area。

最终报告口径应保持为：preflight 是交接前的本地报告守门检查；只有真实 DevTools UI smoke 或真机操作记录，才能作为用户可见体验通过证据。
