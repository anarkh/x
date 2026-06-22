# 传播链 blocked evidence capture QA Checklist

- 日期：2026-06-16
- 分支：`codex/iter-viral-blocked-evidence-capture`
- 角色：Q 组设计/QA agent

范围：本清单验收“把当前 DevTools port/smoke blocker 写入 ignored local viral journey result JSON，并立即运行 `scripts/check-viral-journey-manual-evidence.mjs <file>`”的 blocked evidence capture 命令。它只记录环境阻塞和证据结构，不执行真实 WeChat DevTools UI 或真机传播链手测，也不能声明 UI passed。

## 0. 验收边界

- [ ] `blocked` 只表示 DevTools service port、smoke、设备、权限、数据或环境阻塞了真实手测；它不是产品功能 failed，也不是 UI passed。
- [ ] capture 命令只能写 ignored/local viral journey result JSON，不能写 example 文件、可提交 fixture、截图、录屏或原始日志。
- [ ] capture 命令必须在写入后自动运行：

  ```bash
  node --no-warnings scripts/check-viral-journey-manual-evidence.mjs <file>
  ```

- [ ] checker 通过只证明 local JSON schema、分支、commit、环境字段、journey 唯一性、blocked 字段和聚合状态合法；不证明任何页面渲染、点击、分享 payload 或真机链路通过。
- [ ] 若当前 blocker 来自 DevTools port/smoke，七条传播 journeys 全部 `blocked` 是合理结果，因为真实首跳、确认、评论、二跳、风险态、朋友圈菜单、timeline payload 和单页模式观察均无法执行。

## 1. 运行前检查

- [ ] 确认目录、分支、提交和工作树状态。

  ```bash
  pwd
  git branch --show-current
  git rev-parse --short HEAD
  git status --short --ignored
  ```

  期望：目录对应 `/tmp/street-tasks-iter-worktrees/viral-blocked-evidence-capture`，分支是 `codex/iter-viral-blocked-evidence-capture`。macOS 可能显示 `/private/tmp/...`，记录时仍使用本轮约定 worktree。

- [ ] 跑基础 harness，确认不是仓库基线异常。

  ```bash
  bash harness/init.sh
  ```

- [ ] 确认 viral manual evidence checker 当前可运行，且无 local 文件时不会误报 passed。

  ```bash
  node --no-warnings scripts/check-viral-journey-manual-evidence.mjs
  ```

  允许输出 `No viral journey manual evidence files found; nothing checked.`，但必须同时说明这不是 UI passed evidence。

- [ ] 确认 `.gitignore` 或本地 exclude 忽略目标输出路径。

  ```bash
  git check-ignore -v harness/manual-test-results.local-viral-journey-blocked.json
  ```

## 2. 推荐命令

以 Q 组新增命令的实际文件名为准，建议命令形态如下：

```bash
node scripts/capture-viral-journey-blocked-evidence.mjs \
  --out harness/manual-test-results.local-viral-journey-blocked.json \
  --blocker "DevTools service port 9420 unavailable; smoke check blocked" \
  --follow-up "Enable WeChat DevTools service port, reopen the project, then rerun viral journey manual smoke." \
  --force
```

验收期望：

- [ ] 输出文件路径必须匹配 ignored/local viral journey result 模式，例如 `harness/manual-test-results.local-viral-journey*.json`。
- [ ] 若目标文件已存在且未传 `--force`，命令必须拒绝覆盖。
- [ ] 命令不得修改真实 UI 代码、example JSON、CloudBase 数据、WeChat DevTools 配置或非 local evidence 文件。
- [ ] 命令输出必须清楚写明：blocked capture is not UI passed evidence。
- [ ] 命令完成后必须自动运行 checker，并在输出中显示被检查的 local JSON 路径。

## 3. 输出文件必须是 ignored/local

- [ ] 正向路径示例：

  ```bash
  harness/manual-test-results.local-viral-journey-blocked.json
  harness/manual-test-results.local-viral-journey-q-blocked.json
  ```

- [ ] 这些路径必须被 git ignore。

  ```bash
  git check-ignore -v harness/manual-test-results.local-viral-journey-blocked.json
  git status --short --ignored
  ```

- [ ] `git status --short` 的可提交区不得出现 local result JSON、截图、录屏、payload 或原始日志。
- [ ] 不允许输出到：
  - `harness/viral-journey-manual-results.example.json`
  - `harness/manual-test-results.viral-journey-blocked.json`
  - `harness/viral-blocked-evidence.json`
  - 仓库根目录、`scripts/`、`pages/` 或任何未 ignored 路径。

## 4. 结果 JSON 关键字段

顶层字段：

- [ ] `schemaVersion` 必须是 checker 接受的真实结果 schema，例如 `viral-journey-manual-results.v1`，不能沿用 example schema。
- [ ] `branch` 必须等于当前分支 `codex/iter-viral-blocked-evidence-capture`。
- [ ] `commit` 必须等于当前 HEAD full SHA 或 short SHA。
- [ ] `testedAt` 必须是可解析时间戳。
- [ ] `tester` 必须是具体执行者或明确的 local capture 标识。
- [ ] `environment` 必须记录 DevTools/base library、设备或模拟器、是否真机、网络、CloudBase 状态和数据准备状态。blocked 场景可以写“not reached because DevTools smoke was blocked”，但不能留占位符。
- [ ] `summary.overallStatus` 必须是 `blocked`。
- [ ] `summary.recommendation` 或 `summary.notes` 必须声明：没有真实 UI evidence，不能写 UI passed。
- [ ] `journeys` 必须包含且只包含每个 required journey 一次：
  - `first-hop-share-entry`
  - `receiver-confirm-conversion`
  - `receiver-comment-conversion`
  - `second-hop-receiver-source`
  - `ordinary-and-risk-entries`
  - `timeline-share-channel`
  - `timeline-risk-gating`

每条 journey：

- [ ] `status` 必须是 `blocked`。
- [ ] `blocker` 必须非空，并指向当前 DevTools port/smoke blocker。
- [ ] `followUp` 必须非空，并说明恢复端口、重开 DevTools、换端口、换设备、准备账号/数据 fixture 或重新执行真实手测。
- [ ] `actual` 必须说明未执行真实 journey 或未观察到 UI，不能写“正常”“通过”“passed”等结论。
- [ ] `evidence` 可以为空；若填写，只能是 blocker 诊断摘要、local log 摘要或命令输出摘要，不能伪造截图、录屏、payload 或页面观察。
- [ ] `risks` 应保留或补充真实 UI 未验证风险，例如分享 payload、系统分享面板、二跳 query、评论链路、风险态隐藏 CTA、窄屏换行仍未观察。

## 5. 七条 journeys 均 blocked 的合理性

- [ ] `first-hop-share-entry` blocked：DevTools port/smoke 未通过时，无法打开首跳分享入口并观察 receiver guide/action strip。
- [ ] `receiver-confirm-conversion` blocked：无法点击接收者确认，也无法产生真实二跳分享 payload。
- [ ] `receiver-comment-conversion` blocked：无法提交真实评论，也无法确认评论后的 conversion prompt 或 payload。
- [ ] `second-hop-receiver-source` blocked：无法从真实系统分享卡片或可信 route 观察二跳接力语境。
- [ ] `ordinary-and-risk-entries` blocked：无法逐个验证普通入口、stale/report signal、stale/resolved/expired/hidden fixture 是否隐藏接收侧扩散 CTA。
- [ ] `timeline-share-channel` blocked：无法打开真实系统菜单、检查朋友圈入口、inspect `onShareTimeline` payload 或验证单页模式首屏。
- [ ] `timeline-risk-gating` blocked：无法逐个验证风险/闭合 fixture 的真实系统菜单是否缺少 `shareTimeline`，也无法记录谨慎标题或 payload 反证。
- [ ] 全 blocked 时 `summary.overallStatus=blocked` 是唯一合理聚合；`overallStatus=passed` 或任意 journey `passed` 都必须被视为误报。

## 6. Capture 后复跑 guard

每次生成或手工编辑 local JSON 后复跑：

```bash
node --no-warnings scripts/check-viral-journey-manual-evidence.mjs \
  harness/manual-test-results.local-viral-journey-blocked.json
```

随后复跑 readiness 和基础 guard：

```bash
node --no-warnings scripts/check-devtools-readiness.mjs
node scripts/check-json.mjs
node harness/check-harness.mjs
git diff --check
```

收尾前确认 local evidence 仍未进入可提交改动：

```bash
git status --short --ignored
git check-ignore -v harness/manual-test-results.local-viral-journey-blocked.json
```

## 7. 负向测试

每个负向测试都应非 0 退出，并给出能定位问题的错误信息。测试后清理对应 local 临时文件。

- [ ] 未 ignored 输出路径必须失败。

  ```bash
  node scripts/capture-viral-journey-blocked-evidence.mjs \
    --out harness/viral-blocked-evidence.json \
    --blocker "DevTools service port 9420 unavailable" \
    --follow-up "Enable service port and rerun."
  ```

- [ ] 已有文件未传 `--force` 必须失败。

  ```bash
  node scripts/capture-viral-journey-blocked-evidence.mjs \
    --out harness/manual-test-results.local-viral-journey-blocked.json \
    --blocker "DevTools service port 9420 unavailable" \
    --follow-up "Enable service port and rerun." \
    --force

  node scripts/capture-viral-journey-blocked-evidence.mjs \
    --out harness/manual-test-results.local-viral-journey-blocked.json \
    --blocker "DevTools service port 9420 unavailable" \
    --follow-up "Enable service port and rerun."
  ```

- [ ] 篡改 `summary.overallStatus=passed` 必须被 checker 拒绝。

  ```bash
  cp harness/manual-test-results.local-viral-journey-blocked.json \
    harness/manual-test-results.local-viral-journey-bad-overall.json
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';
  const file = 'harness/manual-test-results.local-viral-journey-bad-overall.json';
  const results = JSON.parse(readFileSync(file, 'utf8'));
  results.summary.overallStatus = 'passed';
  writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
  NODE
  node --no-warnings scripts/check-viral-journey-manual-evidence.mjs \
    harness/manual-test-results.local-viral-journey-bad-overall.json
  ```

- [ ] 删除任一 required journey 必须被 checker 拒绝。

  ```bash
  cp harness/manual-test-results.local-viral-journey-blocked.json \
    harness/manual-test-results.local-viral-journey-bad-missing.json
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';
  const file = 'harness/manual-test-results.local-viral-journey-bad-missing.json';
  const results = JSON.parse(readFileSync(file, 'utf8'));
  results.journeys = results.journeys.filter((journey) => journey.id !== 'second-hop-receiver-source');
  writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
  NODE
  node --no-warnings scripts/check-viral-journey-manual-evidence.mjs \
    harness/manual-test-results.local-viral-journey-bad-missing.json
  ```

- [ ] 把任一 journey 从 `blocked` 改成 `passed` 且无真实 evidence 必须被 checker 拒绝。

  ```bash
  cp harness/manual-test-results.local-viral-journey-blocked.json \
    harness/manual-test-results.local-viral-journey-bad-passed.json
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';
  const file = 'harness/manual-test-results.local-viral-journey-bad-passed.json';
  const results = JSON.parse(readFileSync(file, 'utf8'));
  const journey = results.journeys.find((item) => item.id === 'first-hop-share-entry');
  journey.status = 'passed';
  journey.actual = 'Passed';
  journey.evidence = [];
  results.summary.overallStatus = 'passed';
  writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
  NODE
  node --no-warnings scripts/check-viral-journey-manual-evidence.mjs \
    harness/manual-test-results.local-viral-journey-bad-passed.json
  ```

- [ ] 清空 blocked journey 的 `blocker` 或 `followUp` 必须被 checker 拒绝。
- [ ] 写入占位文本，例如 `TODO`、`placeholder`、`待填写`、`Not run`，必须被 checker 拒绝。
- [ ] 把 example JSON 当成真实结果传给 checker 必须失败。

  ```bash
  node --no-warnings scripts/check-viral-journey-manual-evidence.mjs \
    harness/viral-journey-manual-results.example.json
  ```

## 8. 汇报口径

可以写：

- [ ] `已生成 ignored local blocked viral journey result JSON，并自动通过 manual evidence checker；该结果只记录 DevTools port/smoke blocker。`
- [ ] `七条 viral journeys 均为 blocked，因为当前环境没有执行真实 WeChat DevTools UI 或真机传播链观察。`
- [ ] `blocked evidence capture 不包含截图、录屏、真实分享 payload 或 UI passed 结论；下一步是恢复 DevTools service port/smoke 后重跑真实手测。`
- [ ] `复跑了 check-viral-journey-manual-evidence、check-devtools-readiness、check-json、check-harness 和 git diff --check。`

不得写：

- [ ] `UI passed`
- [ ] `DevTools smoke passed`
- [ ] `七条传播链通过`
- [ ] `checker 通过，所以真实分享 payload 通过`
- [ ] `blocked draft 通过，所以可以发布`
- [ ] `没有截图但视为通过`
- [ ] `端口诊断/ready/preflight 通过，所以用户可见链路通过`

建议最终交付摘要：

```markdown
已验收 blocked evidence capture：输出为 ignored local JSON，branch/commit/environment/summary/journeys 字段完整，七条 journeys 均为 blocked，blocker/followUp 非空，evidence 未伪造；capture 后自动运行 viral manual evidence checker。该结果不能声明 UI passed，真实传播链仍需恢复 DevTools service port/smoke 后手测。
```
