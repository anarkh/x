# 地图列表 blocked summary wrapper guarded QA 清单

范围：用于 Y 组验证 `scripts/prepare-map-list-blocked-summary.mjs` 在生成 ignored blocked JSON 和 ignored local summary 后，会默认串联运行 X guard `scripts/check-map-list-blocked-summary.mjs`。本清单只验证 wrapper 生成链路、local 路径边界和 JSON/summary 同源完整性；它不代表 WeChat DevTools 或真机地图列表视觉 smoke 已经执行。

工作目录：`/tmp/street-tasks-iter-worktrees/map-list-summary-wrapper-guarded`

重要边界：

- [ ] 只使用 ignored local 产物：`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md`。
- [ ] 不修改 `harness/manual-test-results.example.json`，不提交 local JSON/local MD，不提交截图、录屏、日志或云端证据。
- [ ] wrapper 成功只说明 blocked evidence helper、summary generator 和 X guard 都跑通；不能写成地图列表 UI passed。
- [ ] 本清单不要求 wrapper 支持复杂增量修复。已有损坏 summary 的场景，以重新生成或无 `--force` 拒绝覆盖的既有策略处理。

## 1. 正向：wrapper 生成后自动跑 guard

- [ ] 运行 guarded wrapper，生成同一轮 ignored blocked JSON 和 ignored local summary。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-y-wrapper-guarded.json \
    --summary-out harness/manual-test-summary.local-y-wrapper-guarded.md \
    --force
  ```

  期望：

  - 输出包含 blocked evidence helper 的成功信息：`Map-list blocked evidence draft created.`。
  - 输出包含 summary generator 的成功信息：`Manual summary draft created.`。
  - 输出包含 X guard 的成功信息：`Map-list blocked summary checks passed.`。
  - wrapper 最终退出码为 `0`，且没有把 guard 通过描述成 UI passed。
  - 输出仍保留 `Summary is not UI passed evidence` 或等价提醒。

- [ ] 正向产物保持 ignored local 路径。

  ```bash
  git status --short --ignored
  ```

  期望：`harness/manual-test-results.local-y-wrapper-guarded.json` 和 `harness/manual-test-summary.local-y-wrapper-guarded.md` 不出现在 staged 或普通 unstaged 待提交列表；如仍存在，只能显示为 ignored。

- [ ] 对 wrapper 本次生成的同一对产物手动再跑 X guard，确认同源校验仍通过。

  ```bash
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-y-wrapper-guarded.json \
    --summary harness/manual-test-summary.local-y-wrapper-guarded.md
  ```

  期望：输出 `Map-list blocked summary checks passed.`；说明 JSON 与 summary 的 `overallStatus`、`map-list-visual-smoke` 状态、`passed=0`、`evidenceCount=0`、branch、commit、actual、followUp 和 blocker/risk 摘要保持同源。

## 2. 负向：非 local summary 路径前置失败

- [ ] summary 输出路径不是 ignored local 文件时，wrapper 应在前置路径检查阶段失败。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "negative summary path check" \
    --results-out harness/manual-test-results.local-y-wrapper-bad-summary-path.json \
    --summary-out harness/manual-test-summary.md \
    --force
  ```

  期望：

  - 命令失败，错误说明 summary output 必须匹配 `harness/manual-test-summary.local*.md`。
  - 不应出现 `Map-list blocked evidence draft created.`、`Manual summary draft created.` 或 `Map-list blocked summary checks passed.`。
  - 不应生成 `harness/manual-test-results.local-y-wrapper-bad-summary-path.json`；如果有异常残留，应清理并记录为失败。

## 3. 负向：已有损坏 summary 不做增量修复

- [ ] 先生成一组正向 local 产物，再手动损坏 summary。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-y-wrapper-existing.json \
    --summary-out harness/manual-test-summary.local-y-wrapper-existing.md \
    --force

  cp harness/manual-test-summary.local-y-wrapper-existing.md \
    harness/manual-test-summary.local-y-wrapper-existing-damaged.md
  perl -0pi -e 's/(\\| map-list-visual-smoke \\|[^\\n]*?\\| )blocked( \\|)/${1}passed${2}/' \
    harness/manual-test-summary.local-y-wrapper-existing-damaged.md
  ```

- [ ] 直接运行 X guard 对损坏 summary 应失败。

  ```bash
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-y-wrapper-existing.json \
    --summary harness/manual-test-summary.local-y-wrapper-existing-damaged.md
  ```

  期望：命令失败，错误说明 `map-list-visual-smoke` summary row 不能是 `passed` 或必须保持 `blocked`。这证明 wrapper 串联没有削弱 X guard 的独立判定。

- [ ] 不带 `--force` 再跑同名 wrapper 时，不要求修复已损坏的 summary。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-y-wrapper-existing.json \
    --summary-out harness/manual-test-summary.local-y-wrapper-existing-damaged.md
  ```

  期望：

  - 命令失败在现有输出覆盖策略上，例如 blocked evidence helper 拒绝覆盖已有 results JSON。
  - 不要求 wrapper 检测并增量修复已有 damaged summary。
  - 需要修复时，执行者应使用 `--force` 重新生成同一轮 JSON 和 summary，再由自动串联的 X guard 校验新产物。

## 4. 回归：X guard 仍能拦截被改坏的 summary

- [ ] 复制正向 summary 并改坏同源字段，直接运行 X guard。

  ```bash
  cp harness/manual-test-summary.local-y-wrapper-guarded.md \
    harness/manual-test-summary.local-y-wrapper-guarded-bad-commit.md
  perl -0pi -e 's/(\\| commit \\| )([^|]+)( \\|)/${1}badc0de${3}/' \
    harness/manual-test-summary.local-y-wrapper-guarded-bad-commit.md

  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-y-wrapper-guarded.json \
    --summary harness/manual-test-summary.local-y-wrapper-guarded-bad-commit.md
  ```

  期望：命令失败，错误说明 summary `commit` 与 JSON `commit` 不一致。该回归证明 wrapper 自动调用 guard 后，手动使用 X guard 的失败能力仍保留。

## 5. 清理与 Git 卫生

- [ ] 清理本清单生成的 local JSON、local MD 和可能的 `/tmp` 临时输出。

  ```bash
  rm -f harness/manual-test-results.local-y-wrapper-*.json
  rm -f harness/manual-test-summary.local-y-wrapper-*.md
  rm -f harness/manual-test-summary.md
  rm -rf /tmp/street-tasks-map-list-summary-wrapper-guarded-*
  ```

- [ ] 确认 local evidence 不进入提交范围。

  ```bash
  git status --short --ignored
  ```

  期望：可提交改动只包含 Y 组预期文件；`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md` 和 `/tmp` 输出不进入 staged 或普通 unstaged 待提交列表。

- [ ] wrapper 代码落地后，至少运行以下基础检查。

  ```bash
  node --check scripts/prepare-map-list-blocked-summary.mjs
  node --check scripts/check-map-list-blocked-summary.mjs
  git diff --check
  ```

## 6. 最终报告口径

- [ ] 报告应区分三件事：blocked JSON helper 已生成、summary generator 已生成、X guard 已校验同源完整性。
- [ ] 报告应列出正向 wrapper 输出、非 local summary 路径失败、damaged summary 失败、清理结果和 git 状态。
- [ ] 报告必须明确：`Map-list blocked summary checks passed.` 只代表 wrapper 产物的 blocked 状态和同源完整性通过 guard。
- [ ] 不得把 wrapper+guard 成功写成 DevTools UI passed、真机 passed、地图列表视觉 smoke passed 或发布准入。
- [ ] 如果真实 UI 没有执行，继续说明长标题、长正文、图片/无图、安全区、原生 map 层、滚动、marker/list/detail 链路仍未被真实观察。
