# 地图列表 blocked summary guard QA 清单

范围：用于 W 组即将新增的 summary guard，检查 ignored local summary 与 ignored local JSON 之间的关键状态不变量。guard 只防止摘要被人工改成 `passed`、丢掉 `map-list-visual-smoke` blocked 结论或改写 evidence 数量；它不代表 WeChat DevTools 或真机地图列表视觉 smoke 已经通过。

工作目录：`/tmp/street-tasks-iter-worktrees/map-list-summary-guard`

重要边界：

- [ ] 只读取 ignored 的本地结果和本地摘要：`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md`。
- [ ] 不修改 `harness/manual-test-results.example.json`，不提交 local JSON/local MD，不提交截图、录屏、日志或云端证据。
- [ ] guard 通过只说明“blocked JSON 与脱敏 summary 的摘要状态一致”；不能写成 DevTools UI passed、真机 passed 或地图列表视觉 passed。
- [ ] 如果真实 UI 仍未执行，最终报告必须保留 `blocked` 或未验证口径。

## 1. 正向生成 blocked JSON 和 summary

- [ ] 使用 V wrapper 生成同一轮 ignored blocked JSON 与 ignored sanitized summary。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-w-guard.json \
    --summary-out harness/manual-test-summary.local-w-guard.md \
    --force
  ```

  期望：

  - 输出包含 `Created blocked result and sanitized summary.`。
  - 输出提示 summary 不是 UI passed evidence。
  - `harness/manual-test-results.local-w-guard.json` 和 `harness/manual-test-summary.local-w-guard.md` 都保持 ignored local 文件。

- [ ] 可选复核 JSON 和 summary 基线。

  ```bash
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-w-guard.json
  node scripts/check-evidence-hygiene.mjs
  rg -n "overallStatus|map-list-visual-smoke|evidenceCount" harness/manual-test-summary.local-w-guard.md
  ```

  期望：manual evidence 与 evidence hygiene 通过；summary 能看到总体状态、目标 journey 和 evidenceCount 字段。

## 2. 运行 summary guard

- [ ] 新增 guard 后，推荐命令使用 `--results <local-json> --summary <local-md>` 显式绑定同一轮 local 产物。

  ```bash
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-w-guard.json \
    --summary harness/manual-test-summary.local-w-guard.md
  ```

  期望：命令成功，并输出 `Map-list blocked summary checks passed.`。

## 3. 正向不变量

guard 必须同时校验 JSON 和 summary，任一不满足都失败。

- [ ] JSON 顶层 `summary.overallStatus` 必须等于 `blocked`。
- [ ] JSON 中 `journeys[].id === "map-list-visual-smoke"` 必须存在且只存在一条。
- [ ] JSON 中目标 journey 的 `status` 必须等于 `blocked`。
- [ ] JSON 中全部 journey 的 `status === "passed"` 数量必须为 `0`。
- [ ] JSON 中目标 journey 的 evidence 数量必须为 `0`，空数组、空字符串或缺省值按实现约定都不得被误算为正证据。
- [ ] summary 必须包含 `| overallStatus | blocked |`，允许 Markdown 空格差异，但语义必须是 `overallStatus` 对应 `blocked`。
- [ ] summary 的 `map-list-visual-smoke` journey 行必须存在，且该行 `status` 必须为 `blocked`。
- [ ] summary 的 `map-list-visual-smoke` journey 行 `evidenceCount` 必须为 `0`。
- [ ] summary 中不得出现目标 journey 被摘要为 `passed` 的行或等价内容。

建议 guard 的错误信息指向具体不变量，例如 `expected JSON overallStatus=blocked`、`missing map-list-visual-smoke summary row`、`expected summary evidenceCount=0`，便于 QA 快速定位是 JSON 还是 summary 被篡改。

## 4. 负向样例

以下样例只在临时 ignored local 文件上执行。每个样例执行前先从正向产物复制一份，执行后清理，不提交。

- [ ] summary 目标行被改成 `passed` 应失败。

  ```bash
  cp harness/manual-test-summary.local-w-guard.md harness/manual-test-summary.local-w-guard-bad-passed.md
  perl -0pi -e 's/(\\| map-list-visual-smoke \\|[^\\n]*?\\| )blocked( \\|)/${1}passed${2}/' \
    harness/manual-test-summary.local-w-guard-bad-passed.md
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-w-guard.json \
    --summary harness/manual-test-summary.local-w-guard-bad-passed.md
  ```

  期望：失败；错误说明目标 journey 的 summary status 不能是 `passed`。

- [ ] summary 丢掉 `map-list-visual-smoke` 应失败。

  ```bash
  cp harness/manual-test-summary.local-w-guard.md harness/manual-test-summary.local-w-guard-missing.md
  perl -ni -e 'print unless /map-list-visual-smoke/' harness/manual-test-summary.local-w-guard-missing.md
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-w-guard.json \
    --summary harness/manual-test-summary.local-w-guard-missing.md
  ```

  期望：失败；错误说明 summary 缺少目标 journey 行。

- [ ] summary 的目标 journey `evidenceCount` 改成 `1` 应失败。

  ```bash
  cp harness/manual-test-summary.local-w-guard.md harness/manual-test-summary.local-w-guard-bad-evidence.md
  perl -0pi -e 's/(\\| map-list-visual-smoke \\|[^\\n]*?\\| blocked \\|[^\\n]*?\\| )0( \\|)/${1}1${2}/' \
    harness/manual-test-summary.local-w-guard-bad-evidence.md
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-w-guard.json \
    --summary harness/manual-test-summary.local-w-guard-bad-evidence.md
  ```

  期望：失败；错误说明目标 journey 的 summary evidenceCount 必须为 `0`。

- [ ] JSON 目标 journey 改成 `passed` 应失败。

  ```bash
  cp harness/manual-test-results.local-w-guard.json harness/manual-test-results.local-w-guard-bad-passed.json
  node --input-type=module <<'NODE'
  import { readFileSync, writeFileSync } from 'node:fs';

  const file = 'harness/manual-test-results.local-w-guard-bad-passed.json';
  const results = JSON.parse(readFileSync(file, 'utf8'));
  const target = results.journeys.find((journey) => journey.id === 'map-list-visual-smoke');

  if (!target) throw new Error('missing map-list-visual-smoke');
  target.status = 'passed';

  writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
  NODE
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-w-guard-bad-passed.json \
    --summary harness/manual-test-summary.local-w-guard.md
  ```

  期望：失败；错误说明 JSON 目标 journey 必须保持 `blocked`，且全部 passed 数量必须为 `0`。

- [ ] 非 local JSON 路径应失败。

  ```bash
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.example.json \
    --summary harness/manual-test-summary.local-w-guard.md
  ```

  期望：失败；错误说明 results 必须匹配 `harness/manual-test-results.local*.json`。

- [ ] 非 local summary 路径应失败。

  ```bash
  cp harness/manual-test-summary.local-w-guard.md harness/manual-test-summary.md
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-w-guard.json \
    --summary harness/manual-test-summary.md
  ```

  期望：失败；错误说明 summary 必须匹配 `harness/manual-test-summary.local*.md`。执行后删除这个非 local 临时文件，避免误入提交。

## 5. 清理与 Git 卫生

- [ ] 清理正向和负向 local JSON/local MD。

  ```bash
  rm -f harness/manual-test-results.local-w-guard*.json
  rm -f harness/manual-test-summary.local-w-guard*.md
  rm -f harness/manual-test-summary.md
  ```

- [ ] 确认 local evidence 不进入提交。

  ```bash
  git status --short --ignored
  ```

  期望：可提交改动只包含 W 组预期文件；`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md` 不出现在 staged 或 unstaged 待提交项。如果仍存在，只能显示为 ignored，且提交前应清理。

- [ ] guard 自身落地后，至少运行以下基础检查。

  ```bash
  node --check scripts/check-map-list-blocked-summary.mjs
  git diff --check
  ```

## 6. 最终报告口径

- [ ] 报告应明确写出：guard 只验证 blocked JSON 与脱敏 summary 的摘要一致性。
- [ ] 报告不得把 guard 通过写成 DevTools、真机、地图列表 UI 或视觉 smoke `passed`。
- [ ] 如果真实 UI 没有执行，继续说明长标题、长正文、图片/无图、安全区、原生 map 层、滚动、marker/list/detail 链路仍未被真实观察。
- [ ] 若 guard 发现 summary 被改成 `passed`、丢掉 `map-list-visual-smoke` 或 evidenceCount 被改大，应报告为摘要一致性失败，不要改写 JSON 或 summary 来凑通过。
