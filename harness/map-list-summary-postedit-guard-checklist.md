# 地图列表 blocked summary post-edit guard QA 清单

范围：用于 Z 组验证 blocked JSON 和 ignored local summary 生成后，如果执行者又手工编辑了 summary，必须重新运行 `scripts/check-map-list-blocked-summary.mjs`。本清单只验证生成后编辑风险、guard 复跑要求和报告口径；它不代表 WeChat DevTools 或真机地图列表视觉 smoke 已经执行或通过。

工作目录：`/tmp/street-tasks-iter-worktrees/map-list-summary-postedit-guard`

重要边界：

- [ ] 只使用 ignored local 产物：`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md`。
- [ ] 不修改 `harness/manual-test-results.example.json`，不提交 local JSON/local MD，不提交截图、录屏、日志或云端证据。
- [ ] wrapper 生成时自动跑 guard，只能证明当时生成出的 JSON 与 summary 一致；若 summary 后续被手工改动，之前的 guard 结果立即失效。
- [ ] guard 通过不是 UI passed 证据，不得写成 DevTools passed、真机 passed、地图列表视觉 smoke passed 或发布准入。

## 1. 正向：生成后立即通过 guard

- [ ] 运行 guarded wrapper，生成同一轮 ignored blocked JSON 和 ignored local summary。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-z-postedit.json \
    --summary-out harness/manual-test-summary.local-z-postedit.md \
    --force
  ```

  期望：

  - 输出包含 `Map-list blocked evidence draft created.`。
  - 输出包含 `Manual summary draft created.`。
  - 输出包含 `Map-list blocked summary checks passed.`。
  - 输出包含 `Blocked summary guard passed.`。
  - 输出包含 `Post-edit rerun guard`，并打印针对当前 JSON/MD 路径的 `node scripts/check-map-list-blocked-summary.mjs --results ... --summary ...` 命令。
  - 输出继续提醒 summary 不是 UI passed evidence。

- [ ] 对刚生成的同一对 local 产物手动再跑 guard。

  ```bash
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-z-postedit.json \
    --summary harness/manual-test-summary.local-z-postedit.md
  ```

  期望：输出 `Map-list blocked summary checks passed.`；这只说明当前这一刻的 blocked JSON 与 summary 仍保持状态和同源一致。

## 2. 负向：生成后篡改 summary 必须失败

- [ ] 复制正向 summary，模拟执行者在 wrapper 成功后把 `map-list-visual-smoke` 行改成 `passed`。

  ```bash
  cp harness/manual-test-summary.local-z-postedit.md \
    harness/manual-test-summary.local-z-postedit-bad-status.md
  perl -0pi -e 's/(\\| map-list-visual-smoke \\|[^\\n]*?\\| )blocked( \\|)/${1}passed${2}/' \
    harness/manual-test-summary.local-z-postedit-bad-status.md
  ```

- [ ] 对篡改后的 summary 重新运行 guard。

  ```bash
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-z-postedit.json \
    --summary harness/manual-test-summary.local-z-postedit-bad-status.md
  ```

  期望：命令失败，错误说明 `map-list-visual-smoke` summary row 不能是 `passed` 或必须保持 `blocked`。

- [ ] 复制正向 summary，模拟执行者在 wrapper 成功后只改 `commit`。

  ```bash
  cp harness/manual-test-summary.local-z-postedit.md \
    harness/manual-test-summary.local-z-postedit-bad-commit.md
  perl -0pi -e 's/(\\| commit \\| )([^|]+)( \\|)/${1}badc0de${3}/' \
    harness/manual-test-summary.local-z-postedit-bad-commit.md
  ```

- [ ] 对 commit 被改坏的 summary 重新运行 guard。

  ```bash
  node scripts/check-map-list-blocked-summary.mjs \
    --results harness/manual-test-results.local-z-postedit.json \
    --summary harness/manual-test-summary.local-z-postedit-bad-commit.md
  ```

  期望：命令失败，错误说明 summary `commit` 必须匹配 blocked results JSON 的 `commit`。

## 3. 正向：后编辑后的修复路径

- [ ] 如果 summary 已经被手工改动，不沿用 wrapper 成功时的旧输出作为证据；必须选择以下任一修复方式。
- [ ] 方式一：放弃手工改动，用 `--force` 重新生成同一对 local JSON/MD，再确认 wrapper 输出里 guard 通过。
- [ ] 方式二：保留手工改动，但在报告前重新运行 `scripts/check-map-list-blocked-summary.mjs --results <local-json> --summary <local-md>`，并只在 guard 重新通过后引用该 summary。
- [ ] 若后编辑是为了更正 blocker/followUp/actual，可优先修改源 local JSON 后重新生成 summary，避免 summary 与 JSON 失去同源关系。

## 4. 不能证明 UI 通过

- [ ] 报告必须明确：`Blocked summary guard passed.` 只代表 ignored blocked JSON 与 ignored local summary 的状态和同源完整性通过 guard。
- [ ] 不得把 `overallStatus=blocked`、`map-list-visual-smoke=blocked` 或 `passed=0` 包装成“地图列表视觉 smoke 已通过”。
- [ ] 不得把自动脚本通过写成 WeChat DevTools UI 通过、真机通过、用户任务链路通过或可发布准入。
- [ ] 如果真实 UI 没有执行，报告仍应保留阻塞原因，例如 DevTools service port blocked 或无真机访问。

## 5. 未验证项

以下内容不由本清单证明，除非后续有真实 DevTools 或真机证据：

- [ ] 地图列表抽屉在真实小程序环境中的 safe area、底部 tabBar 遮挡和滚动体验。
- [ ] 长标题、长正文、图片/无图任务卡在真实 cover-view/map 层上的截断和布局表现。
- [ ] marker 点击、列表点击、详情跳转和返回后的选中态保持。
- [ ] 定位授权允许/拒绝后的地图中心、任务距离和查找附近任务行为。
- [ ] 真实截图、录屏、日志、云端记录或任务 id 的脱敏审查。

## 6. 清理与报告

- [ ] 清理本清单生成的 ignored local 产物。

  ```bash
  rm -f harness/manual-test-results.local-z-postedit*.json
  rm -f harness/manual-test-summary.local-z-postedit*.md
  ```

- [ ] 确认 local evidence 不进入提交范围。

  ```bash
  git status --short --ignored
  ```

  期望：可提交改动不包含 `harness/manual-test-results.local*.json` 或 `harness/manual-test-summary.local*.md`。

- [ ] 汇报时列出正向 wrapper 输出、手工篡改后 guard 失败输出、清理结果和仍未执行的 UI/真机验证项。
- [ ] 若 Z 组还修改 wrapper 输出，主 agent 应额外确认输出中明确提示“如果 local JSON 或 local MD 生成后被编辑，必须重新运行 guard”。
