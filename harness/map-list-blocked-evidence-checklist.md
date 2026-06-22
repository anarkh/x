# 地图列表 blocked evidence 演练清单

- 日期：2026-06-14
- 分支：`codex/iter-map-list-blocked-evidence`
- 角色：U 组 QA agent

范围：本清单只定义 `map-list-visual-smoke` 在 DevTools service port `9420` blocked、真机不可用或 UI 未执行时，如何把 ignored local JSON 写成 `blocked` 或 `not_covered` 并通过 schema/hygiene。它不是产品功能验收，也不代表 WeChat DevTools、真机或地图列表 UI 已通过。

关键边界：

- [ ] `blocked` 不是产品失败；它表示环境、工具、权限、设备或测试数据阻止了真实观察。
- [ ] `passed` 只能来自真实 WeChat DevTools UI 或真机观察；static guard、readiness preflight、helper prepared、CLI blocked 日志都不能替代视觉观察。
- [ ] 真实或演练结果只写入 ignored 的 `harness/manual-test-results.local*.json`；local JSON 默认不提交。
- [ ] U 组只提交 blocked evidence helper、产品 brief、QA 清单和 harness 记录；不修改业务 UI 或 example JSON。
- [ ] 如果只是 U 组 blocked evidence 演练，不要写“DevTools 已通过”“真机已通过”“视觉 smoke 已通过”。

## 1. 准备

- [ ] 确认工作目录、分支和当前提交。

  ```bash
  pwd
  git branch --show-current
  git rev-parse --short HEAD
  git status --short
  ```

  期望：工作目录对应 `/tmp/street-tasks-iter-worktrees/map-list-blocked-evidence`，分支为 `codex/iter-map-list-blocked-evidence`；除本清单外没有 U 组需要处理的改动。

- [ ] 跑基础 harness。

  ```bash
  bash harness/init.sh
  ```

  期望：输出包含 `Checked 11 JSON files.`、`Harness OK: 6 features checked.` 和 `Harness init complete.`。

- [ ] 只读确认必备 journey 存在。

  ```bash
  node scripts/check-manual-evidence.mjs
  ```

  期望：输出 `Manual evidence checks passed.`；这只证明 example schema 合法，不证明 UI 已执行。

- [ ] 确认证据卫生基线。

  ```bash
  node scripts/check-evidence-hygiene.mjs
  ```

  期望：输出 `Evidence hygiene checks passed.`。

## 2. 生成 local JSON

- [ ] 生成 ignored 的 blocked 本地手测结果文件。

  ```bash
  node scripts/prepare-map-list-blocked-evidence.mjs --out harness/manual-test-results.local-u-blocked.json --reason "DevTools service port 9420 blocked" --force
  ```

  期望输出包含：

  - `Manual evidence checks passed.`
  - `Evidence hygiene checks passed.`
  - `Map-list blocked evidence draft created.`
  - `Blocked evidence is not UI passed or failed evidence; it only records the blocker.`

- [ ] 确认 helper 默认没有伪造通过。

  ```bash
  node --input-type=module <<'NODE'
  import { readFileSync } from 'node:fs';

  const file = 'harness/manual-test-results.local-u-blocked.json';
  const results = JSON.parse(readFileSync(file, 'utf8'));
  const target = results.journeys.find((journey) => journey.id === 'map-list-visual-smoke');
  const passedCount = results.journeys.filter((journey) => journey.status === 'passed').length;

  if (!target) throw new Error('missing map-list-visual-smoke');
  if (target.status !== 'blocked') throw new Error(`expected blocked, got ${target.status}`);
  if (target.evidence.length !== 0) throw new Error('default evidence must be empty');
  if (passedCount !== 0) throw new Error(`expected passed=0, got ${passedCount}`);

  console.log(`helper default OK: overall=${results.summary.overallStatus}, passed=${passedCount}, mapList=${target.status}`);
  NODE
  ```

  期望：`map-list-visual-smoke` 默认为 `blocked`、`evidence` 为空、全部 journey 的 `passed` 数量为 0。

## 3. 改成 blocked 的字段要求

适用场景：DevTools service port `9420` 超时、项目无法在 DevTools 打开、真机不可用、测试账号/数据阻塞，或 UI 因环境原因没有执行。

- [ ] 修改 local JSON，只改 `harness/manual-test-results.local-u-blocked.json`。

  ```bash
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';

  const file = 'harness/manual-test-results.local-u-blocked.json';
  const results = JSON.parse(readFileSync(file, 'utf8'));
  const journey = results.journeys.find((item) => item.id === 'map-list-visual-smoke');

  if (!journey) throw new Error('missing map-list-visual-smoke');

  results.summary.overallStatus = 'blocked';
  results.summary.recommendation = 'DevTools or device access is blocked; do not treat map-list-visual-smoke as UI evidence.';
  results.summary.notes = [
    'U group rehearsed blocked evidence only.',
    'No real DevTools UI or real-device visual observation was completed for map-list-visual-smoke.'
  ];

  journey.status = 'blocked';
  journey.actual = 'Blocked: WeChat DevTools service port 9420 was unavailable or UI visual smoke was not executed, so no map-list visual behavior was observed.';
  journey.evidence = [
    'Sanitized local note: readiness/helper output may be retained locally; no screenshot, recording, or real UI artifact exists for this rehearsal.'
  ];
  journey.risks = [
    'Static WXML/WXSS guards cannot prove native map layering, safe-area behavior, image loading, list scrolling, or detail navigation.',
    'Because UI was not executed, long-title, long-body, image/no-image, marker/list/detail, and safe-area observations remain unverified.'
  ];
  journey.followUp = 'Restore DevTools service port access or use a real device, then rerun map-list-visual-smoke and replace this blocked result with real observations.';

  writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
  console.log('map-list-visual-smoke set to blocked in ignored local JSON');
  NODE
  ```

- [ ] 字段复核。

  - `status`：必须是 `blocked`。
  - `actual`：必须明确说明 UI 没有执行或 DevTools/真机被阻塞。
  - `evidence`：可以为空；如果填写，只能写脱敏本地摘要，不能写不存在的截图、录屏或真机观察。
  - `risks`：至少写出“静态检查不能证明真实视觉”的风险，或保留其他具体风险。
  - `followUp`：至少写下一步恢复端口、换真机、补数据或重新执行真实 smoke。
  - `summary.overallStatus`：建议写 `blocked`，避免评审误读成已覆盖。

- [ ] 运行正向校验。

  ```bash
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-u-blocked.json
  node scripts/check-evidence-hygiene.mjs
  ```

  期望：两条都通过；通过含义是 blocked local JSON 结构和可提交文件卫生合格，不是 UI 通过。

## 4. 保持 not_covered 的字段要求

适用场景：U 组只演练流程、没有尝试打开 DevTools/真机，或还没安排真实视觉 smoke。

- [ ] 如果没有具体环境 blocker，`map-list-visual-smoke` 可以保持 `not_covered`。

  ```bash
  node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-u-not-covered.json --force
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-u-not-covered.json
  ```

- [ ] 字段复核。

  - `status`：保持 `not_covered`。
  - `actual`：保持或改成“U 组未执行真实视觉 smoke”；不要写观察结论。
  - `evidence`：保持空数组，除非存在真实、脱敏、可复查的本地记录。
  - `risks` / `followUp`：可以保留 example 中的真实视觉风险和后续执行建议。
  - `summary.overallStatus`：保持 `not_covered`。

- [ ] 口径复核：`not_covered` 表示没测，不表示失败；同样不能写 `passed`。

## 5. 正向校验

- [ ] blocked local JSON schema 通过。

  ```bash
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-u-blocked.json
  ```

  期望：输出 `Manual evidence checks passed.`。

- [ ] not_covered local JSON schema 通过。

  ```bash
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-u-not-covered.json
  ```

  期望：输出 `Manual evidence checks passed.`。

- [ ] evidence hygiene 通过。

  ```bash
  node scripts/check-evidence-hygiene.mjs
  ```

  期望：输出 `Evidence hygiene checks passed.`；example JSON 中不能有任何 `passed` journey。

- [ ] 手动复核 summary 口径。

  ```bash
  node --input-type=module <<'NODE'
  import { readFileSync } from 'node:fs';

  for (const file of [
    'harness/manual-test-results.local-u-blocked.json',
    'harness/manual-test-results.local-u-not-covered.json'
  ]) {
    const results = JSON.parse(readFileSync(file, 'utf8'));
    const target = results.journeys.find((journey) => journey.id === 'map-list-visual-smoke');
    const passedCount = results.journeys.filter((journey) => journey.status === 'passed').length;
    console.log(`${file}: overall=${results.summary.overallStatus}, mapList=${target.status}, passed=${passedCount}, evidence=${target.evidence.length}`);
  }
  NODE
  ```

  期望：blocked 文件显示 `mapList=blocked`；not_covered 文件显示 `mapList=not_covered`；两者都不应出现 `passed`。

## 6. 坏样例：blocked 但 risks/followUp 为空

目标：确认 schema 能阻止“只有 blocked 状态、没有风险和后续动作”的空洞记录。

- [ ] 生成坏样例。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local-u-bad-blocked.json
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';

  const file = 'harness/manual-test-results.local-u-bad-blocked.json';
  const results = JSON.parse(readFileSync(file, 'utf8'));
  const journey = results.journeys.find((item) => item.id === 'map-list-visual-smoke');

  journey.status = 'blocked';
  journey.actual = 'Blocked rehearsal without enough follow-up detail.';
  journey.risks = [];
  journey.followUp = '';

  writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
  NODE
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-u-bad-blocked.json
  ```

- [ ] 预期：命令失败，错误包含等价语义。

  ```text
  journey map-list-visual-smoke is blocked but both risks and followUp are empty.
  ```

## 7. 坏样例：误写 passed 且无 evidence

目标：确认未执行 UI 时不能靠改状态伪造通过。

- [ ] 生成坏样例。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local-u-bad-passed.json
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';

  const file = 'harness/manual-test-results.local-u-bad-passed.json';
  const results = JSON.parse(readFileSync(file, 'utf8'));
  const journey = results.journeys.find((item) => item.id === 'map-list-visual-smoke');

  journey.status = 'passed';
  journey.actual = 'Incorrect: UI was not executed, but the journey was marked passed.';
  journey.evidence = [];

  writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
  NODE
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-u-bad-passed.json
  ```

- [ ] 预期：命令失败，至少包含以下错误之一。

  ```text
  journey map-list-visual-smoke is passed but evidence is empty.
  journey map-list-visual-smoke is passed but environment lacks concrete DevTools or device information.
  ```

- [ ] 手动复核：即使某个 local JSON 为了演练写了 evidence 文本，只要 evidence 不是来自真实 DevTools/真机观察，就不能把 `map-list-visual-smoke` 写成 `passed`。

## 8. 证据卫生

- [ ] 本地真实或演练结果必须匹配 ignored 路径。

  ```bash
  rg -n "harness/manual-test-results\\.local\\*\\.json|harness/manual-test-summary\\.local\\*\\.md|harness/manual-evidence-artifacts/" .gitignore
  ```

  期望：三类 ignored 规则都存在。

- [ ] 原始附件只放 ignored 位置。

  - `harness/manual-evidence-artifacts/`
  - 外部安全位置

- [ ] 可提交文档只允许写脱敏摘要或附件编号；不要提交截图、录屏、二维码、完整 Console/Network、云函数日志、数据库截图、`cloud://` 完整 fileID、CloudBase env id、openId、手机号、cookie、token、本机绝对路径或精确经纬度。

- [ ] 运行证据卫生 gate。

  ```bash
  node scripts/check-evidence-hygiene.mjs
  ```

  期望：输出 `Evidence hygiene checks passed.`。

## 9. local 文件 ignored

- [ ] 检查 local JSON 没进入待提交范围。

  ```bash
  git status --short --ignored
  ```

  期望：

  - `harness/manual-test-results.local-u-*.json` 只出现在 ignored 区域，或已经被清理。
  - `harness/manual-evidence-artifacts/` 只出现在 ignored 区域，或为空/不存在。
  - 可提交改动只包含 U 组 helper、产品/QA 文档和 harness 记录。

- [ ] 不使用 `git add -f` 添加 local JSON、local summary 或附件目录。

## 10. 错误日期扫描

目标：防止 U 组清单或 local 摘要误写后一日日期。

- [ ] 扫描 U 组清单和 local JSON。

  ```bash
  node --input-type=module <<'NODE'
  import { existsSync, readFileSync } from 'node:fs';

  const badDate = ['2026', '06', String(14 + 1).padStart(2, '0')].join('-');
  const files = [
    'harness/map-list-blocked-evidence-checklist.md',
    'harness/manual-test-results.local-u-blocked.json',
    'harness/manual-test-results.local-u-not-covered.json',
    'harness/manual-test-results.local-u-bad-blocked.json',
    'harness/manual-test-results.local-u-bad-passed.json'
  ];

  let failed = false;
  for (const file of files) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, 'utf8');
    if (text.includes(badDate)) {
      console.error(`${file}: contains wrong run date`);
      failed = true;
    }
  }

  if (failed) process.exit(1);
  console.log('Wrong date scan passed.');
  NODE
  ```

  期望：输出 `Wrong date scan passed.`。

## 11. 清理

- [ ] 清理 U 组演练 local JSON。

  ```bash
  rm -f harness/manual-test-results.local-u-*.json
  ```

- [ ] 如果生成过 local summary，也一并清理。

  ```bash
  rm -f harness/manual-test-summary.local-u-*.md
  ```

- [ ] 最终运行基础 harness。

  ```bash
  bash harness/init.sh
  ```

- [ ] 最终检查 diff 空白。

  ```bash
  git diff --check
  ```

- [ ] 最终检查工作树。

  ```bash
  git status --short --ignored
  ```

  期望：待提交范围限于 U 组 helper、产品/QA 文档和 harness 记录；所有 local JSON、local summary 和附件目录均已清理或仍 ignored。

## 12. 最终报告口径

- [ ] 报告修改文件：`scripts/prepare-map-list-blocked-evidence.mjs`、`harness/map-list-blocked-evidence-product-brief.md`、`harness/map-list-blocked-evidence-checklist.md` 和 harness 记录。
- [ ] 报告验证：`bash harness/init.sh` 和 `git diff --check` 的结果。
- [ ] 明确说明：U 组只完成 blocked evidence helper 和演练文档；没有执行真实 WeChat DevTools/真机视觉 smoke。
- [ ] 明确说明：`blocked` 是环境或执行阻塞，不是产品失败；`not_covered` 是未覆盖，不是通过；`passed` 必须来自真实 UI 观察。
- [ ] 明确说明：local JSON 默认 ignored 且不提交。
