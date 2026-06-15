# AI DevTools recovery report preflight 验收清单

日期：2026-06-15

## 验收边界

- 本清单只验收 ignored local DevTools recovery report 的批量 preflight，不验证真实 WeChat DevTools UI smoke，也不证明 DevTools service port 已恢复。
- preflight 的职责是扫描 `harness/devtools-recovery-report.local*.md`，并对每份 local report 复跑 `scripts/check-devtools-recovery-report.mjs` guard。
- preflight passed 只表示现有 local recovery report 草稿没有越界声称成功；它不是 UI passed evidence，也不是 DevTools recovered evidence。
- 默认 `npm run check` 不应调用该 preflight，避免把本机 ignored local report 状态带入默认 CI/check。

## 静态验收项

- 新脚本存在：
  - `scripts/check-devtools-recovery-report-preflight.mjs`
- `package.json` scripts 存在：
  - `check:devtools-recovery-report-preflight`
- `check:devtools-recovery-report-preflight` 调用 `scripts/check-devtools-recovery-report-preflight.mjs`。
- `package.json` 的默认 `check` 脚本不包含以下命令或等价调用：
  - `check:devtools-recovery-report-preflight`
  - `check-devtools-recovery-report-preflight.mjs`
- preflight 只扫描 ignored local report 模式：
  - `harness/devtools-recovery-report.local*.md`
- preflight 对扫描到的每份报告都必须调用既有单份 guard：
  - `scripts/check-devtools-recovery-report.mjs`

## 正向验证

1. 运行基线：

   ```bash
   bash harness/init.sh
   ```

   预期：退出 0；JSON、harness 和既有 blocked-summary preflight 通过。

2. 确认默认检查不触发 recovery report preflight：

   ```bash
   npm run check
   ```

   预期：退出 0；输出中不出现 `check-devtools-recovery-report-preflight`、`check:devtools-recovery-report-preflight` 或 `DevTools recovery report preflight`。

3. 无 local recovery report 时运行 preflight：

   ```bash
   rm -f harness/devtools-recovery-report.local*.md
   npm run check:devtools-recovery-report-preflight
   ```

   预期：退出 0；输出包含 `nothing checked` 或等价文案，并明确这不是 UI passed evidence，也不是 DevTools recovered evidence。

4. 生成一份有效 local report 后运行 preflight：

   ```bash
   npm run prepare:devtools-recovery-report -- --out harness/devtools-recovery-report.local-ai-one.md --force
   npm run check:devtools-recovery-report-preflight
   ```

   预期：退出 0；输出显示已检查 1 份报告，例如 `Checked 1 report(s).`；单份 guard 输出通过；仍提示不是 UI passed evidence。

5. 生成多份有效 local report 后运行 preflight：

   ```bash
   npm run prepare:devtools-recovery-report -- --out harness/devtools-recovery-report.local-ai-two.md --force
   npm run check:devtools-recovery-report-preflight
   ```

   预期：退出 0；输出逐份列出或能定位被检查的 local report，并显示 checked count 为 2，例如 `Checked 2 report(s).`。

## 负向验证

1. 把任意 local report 追加 `DevTools recovered` 后，preflight 应失败：

   ```bash
   cp harness/devtools-recovery-report.local-ai-one.md harness/devtools-recovery-report.local-ai-recovered.md
   printf '\nDevTools recovered\n' >> harness/devtools-recovery-report.local-ai-recovered.md
   npm run check:devtools-recovery-report-preflight
   ```

   预期：非 0 退出；输出能定位坏报告，并包含单份 guard 的失败原因，例如 `DevTools recovered` 不能出现在 dry-run local report 中。

2. 清理上一步坏报告后，把任意 local report 追加 `UI smoke passed`，preflight 应失败：

   ```bash
   rm -f harness/devtools-recovery-report.local-ai-recovered.md
   cp harness/devtools-recovery-report.local-ai-one.md harness/devtools-recovery-report.local-ai-ui-passed.md
   printf '\nUI smoke passed\n' >> harness/devtools-recovery-report.local-ai-ui-passed.md
   npm run check:devtools-recovery-report-preflight
   ```

   预期：非 0 退出；输出能定位坏报告，并包含单份 guard 的失败原因，例如 `UI smoke passed` 不能出现在 recovery dry-run local report 中。

## 清理步骤

运行完正向和负向验证后，必须清理 ignored local reports：

```bash
rm -f harness/devtools-recovery-report.local*.md
```

清理后确认：

```bash
git status --short
```

预期：除本清单和开发 agent 负责的脚本/package 改动外，没有 `harness/devtools-recovery-report.local*.md` 留在工作树。

## 证据记录格式

可按以下格式写入 `harness/claude-progress.md`：

```markdown
### Session 046AI

- 日期：2026-06-15
- 分支：`<branch>`
- 本轮目标：AI 组 ignored DevTools recovery report 批量 preflight 验收
- 已完成：确认 `scripts/check-devtools-recovery-report-preflight.mjs` 和 `check:devtools-recovery-report-preflight` 存在；确认默认 `npm run check` 不调用 preflight；确认无 local report 时 preflight 通过并提示 nothing checked；确认一个或多个有效 local reports 时 preflight 通过并显示 checked count；确认追加 `DevTools recovered` 或 `UI smoke passed` 的坏报告会导致 preflight 失败；清理所有 `harness/devtools-recovery-report.local*.md`。
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`npm run check`；无 local report 的 `npm run check:devtools-recovery-report-preflight`；生成一份有效 report 后的 preflight；生成多份有效 reports 后的 preflight；`DevTools recovered` 篡改负向；`UI smoke passed` 篡改负向；清理 local reports。
- 已记录证据：默认 `npm run check` 未调用 recovery report preflight；无 local report 输出 `nothing checked`；正向 preflight 输出 checked count；坏报告输出单份 guard 的失败原因；所有 local reports 已清理。
- 已知风险或未解决问题：AI preflight 通过只证明 ignored local recovery report 草稿仍被 guard 约束，不代表 UI passed、DevTools recovered、真机 passed、地图列表视觉通过或 9420 service port 已恢复。真实 UI smoke 仍需 WeChat DevTools 或真机手测证据。
- 下一步最佳动作：若用户恢复 WeChat DevTools service port，重新生成 recovery report 并复跑 preflight；随后单独执行真实 UI smoke，并把 UI 证据记录到对应 manual evidence，而不是把 preflight passed 当作 UI 证据。
```
