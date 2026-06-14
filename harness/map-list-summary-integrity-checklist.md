# 地图列表 blocked summary integrity guard QA 清单

范围：用于 X 组增强 `scripts/check-map-list-blocked-summary.mjs` 后的 QA 复核。guard 应继续守住 W 组 blocked 状态不变量，并新增 JSON 与 summary 之间的 branch、commit、目标 journey actual/followUp/blocker 摘要一致性检查。guard 通过只代表 ignored local JSON 与 ignored local summary 的 blocked 摘要一致，不代表 WeChat DevTools 或真机地图列表视觉 smoke 已经通过。

工作目录：`/tmp/street-tasks-iter-worktrees/map-list-summary-integrity`

重要边界：

- [ ] 只读取 ignored 的本地结果和本地摘要：`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md`。
- [ ] 不修改 `harness/manual-test-results.example.json`，不提交 local JSON/local MD，不提交截图、录屏、日志或云端证据。
- [ ] 正向和负向样例都只使用 local 临时文件，执行后清理。
- [ ] guard 仍是证据一致性检查，不是 UI passed 证据；真实 safe area、原生 map 层、长标题、长正文、图片/无图、滚动和详情跳转仍需 DevTools 或真机观察。

## 1. 正向生成与 guard 命令

- [ ] 使用 V wrapper 生成同一轮 ignored blocked JSON 和 ignored sanitized summary。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-x-integrity.json \
    --summary-out harness/manual-test-summary.local-x-integrity.md \
    --force
  ```

  期望：

  - 输出包含 `Created blocked result and sanitized summary.`。
  - 输出提示 summary 不是 UI passed evidence。
  - `harness/manual-test-results.local-x-integrity.json` 和 `harness/manual-test-summary.local-x-integrity.md` 都保持 ignored local 文件。

- [ ] 对同一对 local 产物运行增强后的 summary integrity guard。

  ```bash
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-x-integrity.json \
    --summary harness/manual-test-summary.local-x-integrity.md
  ```

  期望：命令成功，并输出 `Map-list blocked summary checks passed.`。

## 2. 保留 W 组不变量

guard 必须继续校验以下 W 组不变量，避免增强时放松原有 blocked 门禁。

- [ ] JSON 顶层 `summary.overallStatus` 必须等于 `blocked`。
- [ ] JSON 中 `journeys[].id === "map-list-visual-smoke"` 必须存在且只存在一条。
- [ ] JSON 中目标 journey 的 `status` 必须等于 `blocked`。
- [ ] JSON 中全部 journey 的 `status === "passed"` 数量必须为 `0`。
- [ ] JSON 中目标 journey 的 evidence 数量必须为 `0`。
- [ ] summary 的 `Summary` 表必须有 `overallStatus=blocked`。
- [ ] summary 的 `Journeys` 表中 `map-list-visual-smoke` 行必须存在且 `status=blocked`。
- [ ] summary 的 `map-list-visual-smoke` 行 `evidenceCount` 必须为 `0`。

## 3. 新增一致性不变量

增强 guard 必须确认 summary 仍来自同一份 blocked JSON，而不是被人工拼接或替换。

- [ ] summary `Run` 表里的 `branch` 必须等于 JSON 顶层 `branch`。
- [ ] summary `Run` 表里的 `commit` 必须等于 JSON 顶层 `commit`。
- [ ] summary `Journeys` 表中目标 journey 行的 `actual` 必须包含 JSON 目标 `actual` 中的关键 blocked reason；至少要能发现该 cell 被替换为 `unrelated text`。
- [ ] summary 目标 journey 行的 `followUp` 必须包含 JSON 目标 `followUp` 的关键短语，例如真实 JSON 中关于打开 DevTools 或真机、重新运行 `map-list-visual-smoke` 的短语。
- [ ] summary 目标 journey 行的 `blocker` cell 必须非空；当 JSON 用 `risks` 承载 blocker/risk 摘要时，summary 的 `blocker` cell 也必须保留可读风险摘要。
- [ ] 错误信息应说明失败字段和来源，例如 `branch mismatch`、`commit mismatch`、`actual missing blocked reason`、`followUp missing key phrase`、`blocker cell must not be empty`。

建议 QA 先人工查看结构：

```bash
rg -n "## Run|## Journeys|branch|commit|map-list-visual-smoke" \
  harness/manual-test-summary.local-x-integrity.md
```

## 4. 负向样例

以下样例都应失败。每个样例执行前从正向产物复制临时 local 文件，执行后清理，不提交。

- [ ] summary branch 改错应失败。

  ```bash
  cp harness/manual-test-summary.local-x-integrity.md \
    harness/manual-test-summary.local-x-integrity-bad-branch.md
  perl -0pi -e 's/(\\| branch \\| )([^|]+)( \\|)/${1}unrelated-branch${3}/' \
    harness/manual-test-summary.local-x-integrity-bad-branch.md
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-x-integrity.json \
    --summary harness/manual-test-summary.local-x-integrity-bad-branch.md
  ```

  期望：失败；错误说明 summary `branch` 与 JSON `branch` 不一致。

- [ ] summary commit 改错应失败。

  ```bash
  cp harness/manual-test-summary.local-x-integrity.md \
    harness/manual-test-summary.local-x-integrity-bad-commit.md
  perl -0pi -e 's/(\\| commit \\| )([^|]+)( \\|)/${1}badc0de${3}/' \
    harness/manual-test-summary.local-x-integrity-bad-commit.md
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-x-integrity.json \
    --summary harness/manual-test-summary.local-x-integrity-bad-commit.md
  ```

  期望：失败；错误说明 summary `commit` 与 JSON `commit` 不一致。

- [ ] summary actual 替换为 unrelated text 应失败。

  ```bash
  cp harness/manual-test-summary.local-x-integrity.md \
    harness/manual-test-summary.local-x-integrity-bad-actual.md
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';

  const file = 'harness/manual-test-summary.local-x-integrity-bad-actual.md';
  const markdown = readFileSync(file, 'utf8');
  const lines = markdown.split('\n').map((line) => {
    if (!line.startsWith('| map-list-visual-smoke |')) return line;
    const cells = line.split('|');
    cells[4] = ' unrelated text ';
    return cells.join('|');
  });

  writeFileSync(file, lines.join('\n'));
  NODE
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-x-integrity.json \
    --summary harness/manual-test-summary.local-x-integrity-bad-actual.md
  ```

  期望：失败；错误说明目标 journey actual 缺少 JSON blocked reason 的关键内容。

- [ ] summary followUp 清空应失败。

  ```bash
  cp harness/manual-test-summary.local-x-integrity.md \
    harness/manual-test-summary.local-x-integrity-empty-followup.md
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';

  const file = 'harness/manual-test-summary.local-x-integrity-empty-followup.md';
  const markdown = readFileSync(file, 'utf8');
  const lines = markdown.split('\n').map((line) => {
    if (!line.startsWith('| map-list-visual-smoke |')) return line;
    const cells = line.split('|');
    cells[7] = ' - ';
    return cells.join('|');
  });

  writeFileSync(file, lines.join('\n'));
  NODE
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-x-integrity.json \
    --summary harness/manual-test-summary.local-x-integrity-empty-followup.md
  ```

  期望：失败；错误说明目标 journey followUp 缺少 JSON followUp 的关键短语。

- [ ] summary followUp 替换为 unrelated text 应失败。

  ```bash
  cp harness/manual-test-summary.local-x-integrity.md \
    harness/manual-test-summary.local-x-integrity-bad-followup.md
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';

  const file = 'harness/manual-test-summary.local-x-integrity-bad-followup.md';
  const markdown = readFileSync(file, 'utf8');
  const lines = markdown.split('\n').map((line) => {
    if (!line.startsWith('| map-list-visual-smoke |')) return line;
    const cells = line.split('|');
    cells[7] = ' unrelated text ';
    return cells.join('|');
  });

  writeFileSync(file, lines.join('\n'));
  NODE
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-x-integrity.json \
    --summary harness/manual-test-summary.local-x-integrity-bad-followup.md
  ```

  期望：失败；错误说明目标 journey followUp 缺少 JSON followUp 的关键短语。

- [ ] summary blocker 清空应失败。

  ```bash
  cp harness/manual-test-summary.local-x-integrity.md \
    harness/manual-test-summary.local-x-integrity-empty-blocker.md
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';

  const file = 'harness/manual-test-summary.local-x-integrity-empty-blocker.md';
  const markdown = readFileSync(file, 'utf8');
  const lines = markdown.split('\n').map((line) => {
    if (!line.startsWith('| map-list-visual-smoke |')) return line;
    const cells = line.split('|');
    cells[6] = ' - ';
    return cells.join('|');
  });

  writeFileSync(file, lines.join('\n'));
  NODE
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-x-integrity.json \
    --summary harness/manual-test-summary.local-x-integrity-empty-blocker.md
  ```

  期望：失败；错误说明目标 journey blocker/risk cell 不应为空。

- [ ] 非 local JSON 路径应失败。

  ```bash
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.example.json \
    --summary harness/manual-test-summary.local-x-integrity.md
  ```

  期望：失败；错误说明 results 必须匹配 `harness/manual-test-results.local*.json`。

- [ ] 非 local summary 路径应失败。

  ```bash
  cp harness/manual-test-summary.local-x-integrity.md harness/manual-test-summary.md
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-x-integrity.json \
    --summary harness/manual-test-summary.md
  ```

  期望：失败；错误说明 summary 必须匹配 `harness/manual-test-summary.local*.md`。执行后删除这个非 local 临时文件，避免误入提交。

## 5. 清理与 Git 卫生

- [ ] 清理正向和负向 local JSON/local MD。

  ```bash
  rm -f harness/manual-test-results.local-x-integrity*.json
  rm -f harness/manual-test-summary.local-x-integrity*.md
  rm -f harness/manual-test-summary.md
  ```

- [ ] 确认 local evidence 不进入提交。

  ```bash
  git status --short --ignored
  ```

  期望：可提交改动只包含 X 组预期文件；`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md` 不出现在 staged 或 unstaged 待提交项。如果仍存在，只能显示为 ignored，且提交前应清理。

- [ ] guard 自身落地后，至少运行以下基础检查。

  ```bash
  node --check scripts/check-map-list-blocked-summary.mjs
  git diff --check
  ```

## 6. 最终报告口径

- [ ] 报告应明确写出：增强 guard 验证的是 blocked local JSON 与 sanitized local summary 的状态和内容摘要一致性。
- [ ] 报告应列出正向命令、负向样例覆盖项、清理结果和仍未执行的 UI 验收。
- [ ] 报告不得把 guard 通过写成 DevTools UI passed、真机 passed、地图列表视觉 smoke passed 或发布准入。
- [ ] 如果真实 UI 没有执行，继续说明长标题、长正文、图片/无图、安全区、原生 map 层、滚动、marker/list/detail 链路仍未被真实观察。
