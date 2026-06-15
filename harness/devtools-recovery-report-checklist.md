# AH DevTools recovery dry-run report 验收清单

日期：2026-06-15

## 验收边界

- 本清单只评测本地 ignored recovery dry-run report 工具，不验证真实 WeChat DevTools UI smoke，也不证明 DevTools 已恢复。
- 所有报告文件必须是本地 ignored 工件，不应进入 git 提交。
- 当前环境若仍无法连接 WeChat DevTools service port，报告应记录 `before` 和 `after` 均为 `blocked`；这属于环境阻塞证据，不是 UI failed 或 UI passed。
- 默认 `npm run check` 只能继续跑 JSON、harness、readiness/default preflight 等默认门禁，不应执行本地 recovery report 的 prepare 或 check 命令。

## 静态验收项

- `.gitignore` 包含本地报告模式：
  - `harness/devtools-recovery-report.local*.md`
- `package.json` scripts 存在：
  - `prepare:devtools-recovery-report`
  - `check:devtools-recovery-report`
- `package.json` 的默认 `check` 脚本不包含以下命令或等价调用：
  - `prepare:devtools-recovery-report`
  - `check:devtools-recovery-report`
  - `prepare-devtools-recovery-report.mjs`
  - `check-devtools-recovery-report.mjs`
- `scripts/prepare-devtools-recovery-report.mjs` 只允许输出到 ignored local 路径，例如 `harness/devtools-recovery-report.local-ah.md`。
- `scripts/prepare-devtools-recovery-report.mjs` 生成报告后必须自动运行 `scripts/check-devtools-recovery-report.mjs` 作为 guard。
- `scripts/check-devtools-recovery-report.mjs` 必须确认报告满足：
  - 是 recovery dry-run report。
  - actions 均为 skipped，原因指向 dry-run 或无副作用模式。
  - 不包含 `UI smoke passed`。
  - 不包含 `DevTools recovered`。
  - 不包含 `恢复成功`。
  - 当前 blocked 环境下，before status 和 after status 都是 `blocked`。

## 正向验证

1. 运行基线：

   ```bash
   bash harness/init.sh
   ```

2. 运行默认检查，确认不触发 recovery report：

   ```bash
   npm run check
   ```

   预期：通过；输出中不出现 `prepare-devtools-recovery-report`、`check-devtools-recovery-report` 或新生成的 `harness/devtools-recovery-report.local*.md` 路径。

3. 生成 ignored local dry-run 报告：

   ```bash
   npm run prepare:devtools-recovery-report -- --out harness/devtools-recovery-report.local-ah.md
   ```

   预期：退出 0；报告文件存在；prepare 输出显示已自动运行 guard；报告仍明确 dry-run、actions skipped、before blocked、after blocked。

4. 单独复跑 guard：

   ```bash
   npm run check:devtools-recovery-report -- --report harness/devtools-recovery-report.local-ah.md
   ```

   预期：退出 0；输出确认报告是 dry-run blocked evidence，且不是 UI passed evidence。

## 负向验证

1. 非 ignored 输出路径应失败：

   ```bash
   npm run prepare:devtools-recovery-report -- --out harness/devtools-recovery-report-ah.md
   ```

   预期：非 0 退出；错误说明 output 必须匹配 ignored local report 模式。

2. 把报告改成 `UI smoke passed` 应失败：

   ```bash
   cp harness/devtools-recovery-report.local-ah.md harness/devtools-recovery-report.local-ah-ui-passed.md
   printf '\nUI smoke passed\n' >> harness/devtools-recovery-report.local-ah-ui-passed.md
   npm run check:devtools-recovery-report -- --report harness/devtools-recovery-report.local-ah-ui-passed.md
   ```

   预期：非 0 退出；错误指出报告不能声称 UI smoke passed。

3. 把报告改成 `DevTools recovered` 应失败：

   ```bash
   cp harness/devtools-recovery-report.local-ah.md harness/devtools-recovery-report.local-ah-recovered.md
   printf '\nDevTools recovered\n' >> harness/devtools-recovery-report.local-ah-recovered.md
   npm run check:devtools-recovery-report -- --report harness/devtools-recovery-report.local-ah-recovered.md
   ```

   预期：非 0 退出；错误指出 dry-run 报告不能声称 DevTools recovered。

4. 把报告改成 `恢复成功` 应失败：

   ```bash
   cp harness/devtools-recovery-report.local-ah.md harness/devtools-recovery-report.local-ah-success-cn.md
   printf '\n恢复成功\n' >> harness/devtools-recovery-report.local-ah-success-cn.md
   npm run check:devtools-recovery-report -- --report harness/devtools-recovery-report.local-ah-success-cn.md
   ```

   预期：非 0 退出；错误指出 dry-run 报告不能声称恢复成功。

## 清理步骤

运行完正向和负向验证后，清理本地报告和临时文件：

```bash
rm -f harness/devtools-recovery-report.local*.md
```

清理后确认：

```bash
git status --short
```

预期：除本清单和开发 agent 负责的代码改动外，没有 local report 文件出现在 git status 中。

## 证据记录格式

可按以下格式写入 `harness/claude-progress.md`：

```markdown
### Session 045AH

- 日期：2026-06-15
- 分支：`<branch>`
- 本轮目标：AH 组本地 ignored DevTools recovery dry-run report 工具验收
- 已完成：确认 `.gitignore` 忽略 `harness/devtools-recovery-report.local*.md`；确认 package scripts 存在；确认默认 `npm run check` 不运行 recovery report prepare/check；确认 prepare 只允许 ignored local 输出并在生成后自动运行 guard；确认 guard 阻止 UI passed、DevTools recovered、恢复成功等误导性报告口径。
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`npm run check`；`npm run prepare:devtools-recovery-report -- --out harness/devtools-recovery-report.local-ah.md`；`npm run check:devtools-recovery-report -- --report harness/devtools-recovery-report.local-ah.md`；非 ignored 输出负向；`UI smoke passed` 篡改负向；`DevTools recovered` 篡改负向；`恢复成功` 篡改负向；清理 local report 文件。
- 已记录证据：`npm run check` 未调用 recovery report prepare/check；prepare 输出 local report 路径并自动运行 guard；guard 输出 dry-run/actions skipped/before blocked/after blocked；非 ignored 输出路径失败；三类成功口径篡改均失败。
- 已知风险或未解决问题：AH 工具仍不恢复 DevTools service port，也不执行真实 UI smoke；before/after blocked 只能证明当前环境仍阻塞，不能写 UI passed、DevTools passed 或真机 passed。
- 下一步最佳动作：若需要真实恢复，先由用户确认可接受退出/重开 DevTools 的副作用，再运行显式 recovery 命令并单独执行 DevTools UI smoke。
```
