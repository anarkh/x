# 地图列表 blocked summary readiness preflight QA 清单

范围：用于 AB 组验证 AA 轮新增的 `scripts/check-map-list-blocked-summary-preflight.mjs` 是否已经接入更默认的检查入口，降低评审或收尾前忘记复跑 local blocked summary guard 的风险。默认入口可以是 `bash harness/init.sh`、`node --no-warnings scripts/check-devtools-readiness.mjs`，或开发本轮明确接入的同等级入口。

本清单只验证 ignored local blocked evidence/summary 的一致性守门是否会被默认入口带起；它不代表 WeChat DevTools 或真机地图列表视觉 smoke 已执行或通过。

工作目录：`/tmp/street-tasks-iter-worktrees/map-list-summary-readiness-preflight`

重要边界：

- [ ] 只使用 ignored local 产物：`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md`。
- [ ] 不修改 `harness/manual-test-results.example.json`，不提交 local JSON/local MD，不提交截图、录屏、日志或云端证据。
- [ ] 默认入口应复用 AA 轮 preflight 或等价逻辑，不应绕过 `scripts/check-map-list-blocked-summary.mjs` 的 blocked summary 同源检查。
- [ ] 默认入口通过不是 UI passed 证据，不得写成 DevTools passed、真机 passed、地图列表视觉 smoke passed 或发布准入。

## 1. 基线与默认入口确认

- [ ] 确认 AGENTS 基线已通过。

  ```bash
  pwd
  git log --oneline -5
  bash harness/init.sh
  ```

- [ ] 确认本轮开发实际接入的默认入口。

  ```bash
  git diff -- harness/init.sh scripts/check-devtools-readiness.mjs scripts/check-map-list-blocked-summary-preflight.mjs
  ```

  期望：

  - 能看出默认入口会运行 `scripts/check-map-list-blocked-summary-preflight.mjs`，或等价地扫描 `harness/manual-test-summary.local*.md` 并逐对运行 blocked summary guard。
  - 入口输出保留“preflight 不是 UI passed evidence”的口径，或在失败时不会让人误以为真实 UI 已通过。

- [ ] 后续场景优先使用本轮接入的默认入口验证。

  ```bash
  bash harness/init.sh
  node --no-warnings scripts/check-devtools-readiness.mjs
  ```

  如果本轮只接入其中一个入口，记录实际接入项，并只把该入口作为必须通过/失败的判定对象。

## 2. 无 local summary 时默认入口通过

- [ ] 清理本轮可能遗留的 local blocked summary/result。

  ```bash
  rm -f harness/manual-test-results.local-ab-readiness*.json
  rm -f harness/manual-test-summary.local-ab-readiness*.md
  ```

- [ ] 运行本轮接入的默认入口。

  ```bash
  bash harness/init.sh
  node --no-warnings scripts/check-devtools-readiness.mjs
  ```

  期望：

  - 已接入 preflight 的默认入口通过。
  - 输出说明没有发现需要检查的 ignored local blocked summary/result 对，或等价地显示 `checked=0` / `nothing checked`。
  - 不创建新的 local JSON、local MD、截图、录屏或日志。
  - 不暗示地图列表视觉 smoke 已通过。

## 3. 正向 pair 存在时默认入口通过

- [ ] 使用 wrapper 生成一对 ignored blocked result 和 ignored local summary。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-ab-readiness.json \
    --summary-out harness/manual-test-summary.local-ab-readiness.md \
    --force
  ```

- [ ] 运行本轮接入的默认入口。

  ```bash
  bash harness/init.sh
  node --no-warnings scripts/check-devtools-readiness.mjs
  ```

  期望：

  - 已接入 preflight 的默认入口通过。
  - 输出点名或可追踪到 `harness/manual-test-summary.local-ab-readiness.md` 和 `harness/manual-test-results.local-ab-readiness.json`。
  - 能看出 pair 已复跑 blocked summary guard，且 `map-list-visual-smoke` 保持 `blocked`、`passed=0`、`evidenceCount=0`。
  - 不把 blocked result、blocked summary 或 readiness preflight 写成 UI passed。

## 4. 缺 results 时默认入口失败

- [ ] 保留 local summary，但删除对应的 local result JSON。

  ```bash
  rm -f harness/manual-test-results.local-ab-readiness.json
  ```

- [ ] 运行本轮接入的默认入口。

  ```bash
  bash harness/init.sh
  node --no-warnings scripts/check-devtools-readiness.mjs
  ```

  期望：

  - 已接入 preflight 的默认入口失败。
  - 错误点名缺失的 results JSON 路径，或明确说明 summary 找不到匹配的 blocked results JSON。
  - 不跳过该 summary 后继续报告整体成功。
  - 不生成替代 JSON，也不自动改写 summary。

## 5. summary 改 passed 时默认入口失败

- [ ] 重新生成一对正向 local JSON/MD。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-ab-readiness.json \
    --summary-out harness/manual-test-summary.local-ab-readiness.md \
    --force
  ```

- [ ] 模拟生成后人工把 `map-list-visual-smoke` 行改成 `passed`。

  ```bash
  perl -0pi -e 's/(\| map-list-visual-smoke \|[^\n]*?\| )blocked( \|)/${1}passed${2}/' \
    harness/manual-test-summary.local-ab-readiness.md
  ```

- [ ] 运行本轮接入的默认入口。

  ```bash
  bash harness/init.sh
  node --no-warnings scripts/check-devtools-readiness.mjs
  ```

  期望：

  - 已接入 preflight 的默认入口失败。
  - 错误来自或等价于 `scripts/check-map-list-blocked-summary.mjs` 的状态守门。
  - 错误说明 `map-list-visual-smoke` summary row 不能是 `passed`，或必须与 blocked JSON 保持一致。
  - 不允许其他 local pair 的通过结果掩盖该失败。

## 6. 清理 local 产物

- [ ] 清理本清单生成的 ignored local 产物。

  ```bash
  rm -f harness/manual-test-results.local-ab-readiness*.json
  rm -f harness/manual-test-summary.local-ab-readiness*.md
  ```

- [ ] 确认可提交改动不包含 local evidence。

  ```bash
  git status --short --ignored
  ```

  期望：

  - 可提交改动不包含 `harness/manual-test-results.local*.json` 或 `harness/manual-test-summary.local*.md`。
  - ignored 列表里若短暂出现本轮 local 产物，收尾前必须清理。

## 7. 报告口径不能写 UI passed

- [ ] 汇报默认入口结果时只写“readiness/default entry 已复跑 blocked summary preflight”或“blocked summary/result pair guard 通过”。
- [ ] 不得写“地图列表视觉 smoke passed”“DevTools UI passed”“真机 passed”“用户路径 passed”“可发布”或“发布准入通过”。
- [ ] 如果默认入口失败，报告需包含失败 pair、失败原因、失败入口和是否已清理 local 产物。
- [ ] 如果没有 local summary，报告需写“无 local blocked summary 需要检查”，而不是“地图列表无问题”。

## 8. 未验证项

以下内容不由本清单证明，除非后续有真实 DevTools 或真机证据：

- [ ] 地图列表抽屉在真实小程序环境中的 safe area、底部 tabBar 遮挡和滚动体验。
- [ ] 长标题、长正文、图片/无图任务卡在真实 cover-view/map 层上的截断和布局表现。
- [ ] marker 点击、列表点击、详情跳转和返回后的选中态保持。
- [ ] 定位授权允许/拒绝后的地图中心、任务距离和查找附近任务行为。
- [ ] 真实截图、录屏、日志、云端记录或任务 id 的脱敏审查。

## 9. 主 agent 收尾建议

- [ ] 运行语法、默认入口和核心正负向验证。

  ```bash
  node --check scripts/check-map-list-blocked-summary-preflight.mjs
  node --check scripts/check-devtools-readiness.mjs
  bash harness/init.sh
  node --no-warnings scripts/check-devtools-readiness.mjs
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-ab-readiness.json \
    --summary-out harness/manual-test-summary.local-ab-readiness.md \
    --force
  bash harness/init.sh
  node --no-warnings scripts/check-devtools-readiness.mjs
  rm -f harness/manual-test-results.local-ab-readiness.json
  bash harness/init.sh
  node --no-warnings scripts/check-devtools-readiness.mjs
  ```

- [ ] 恢复正向 pair 后改坏 summary，再确认已接入 preflight 的默认入口失败。
- [ ] 清理 local 产物后运行 `git diff --check` 和 `bash harness/init.sh`。
