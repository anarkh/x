# 地图列表 blocked summary preflight QA 清单

范围：用于 AA 组验证一键 preflight 能扫描 `harness/` 下 ignored local blocked summary/result 对，并逐对复跑 `scripts/check-map-list-blocked-summary.mjs`。本清单只验证 blocked evidence/summary 的评审前一致性检查；它不代表 WeChat DevTools 或真机地图列表视觉 smoke 已经执行或通过。

工作目录：`/tmp/street-tasks-iter-worktrees/map-list-summary-preflight`

重要边界：

- [ ] 只使用 ignored local 产物：`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md`。
- [ ] 不修改 `harness/manual-test-results.example.json`，不提交 local JSON/local MD，不提交截图、录屏、日志或云端证据。
- [ ] preflight 只应扫描 local blocked summary/result 对并复跑已有 guard；不应生成真实 UI 通过证据。
- [ ] preflight 通过不是 UI passed 证据，不得写成 DevTools passed、真机 passed、地图列表视觉 smoke passed 或发布准入。

## 1. 基线与命令

- [ ] 确认 AGENTS 基线已通过。

  ```bash
  pwd
  git log --oneline -5
  bash harness/init.sh
  ```

- [ ] 确认一键 preflight 脚本语法通过。

  ```bash
  node --check scripts/check-map-list-blocked-summary-preflight.mjs
  ```

- [ ] 后续所有场景都以该命令为评审前入口。

  ```bash
  node scripts/check-map-list-blocked-summary-preflight.mjs
  ```

## 2. 无 local summary 时通过

- [ ] 清理本轮可能遗留的 local blocked summary/result。

  ```bash
  rm -f harness/manual-test-results.local-aa-preflight*.json
  rm -f harness/manual-test-summary.local-aa-preflight*.md
  ```

- [ ] 在没有匹配 local summary 的情况下运行 preflight。

  ```bash
  node scripts/check-map-list-blocked-summary-preflight.mjs
  ```

  期望：

  - 命令通过。
  - 输出明确说明没有发现需要检查的 ignored local blocked summary/result 对，或 `checked=0`。
  - 不创建新的 local JSON、local MD、截图、录屏或日志。
  - 不暗示地图列表视觉 smoke 已通过。

## 3. 正向：扫描一对 blocked JSON/MD 通过

- [ ] 使用 wrapper 生成一对 ignored blocked result 和 ignored local summary。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-aa-preflight.json \
    --summary-out harness/manual-test-summary.local-aa-preflight.md \
    --force
  ```

- [ ] 运行一键 preflight。

  ```bash
  node scripts/check-map-list-blocked-summary-preflight.mjs
  ```

  期望：

  - 命令通过。
  - 输出点名被扫描的 `harness/manual-test-summary.local-aa-preflight.md`。
  - 输出能看出对应 result 为 `harness/manual-test-results.local-aa-preflight.json`。
  - 对该 pair 复跑 `scripts/check-map-list-blocked-summary.mjs` 并通过。
  - 输出保留 `blocked` 语义，例如 `overallStatus=blocked`、`map-list-visual-smoke=blocked` 或等价摘要。
  - 不把 `blocked` 结果写成 `passed`。

## 4. 负向：summary 缺结果 JSON 必须失败

- [ ] 保留 local summary，但删除它对应的 local result JSON。

  ```bash
  rm -f harness/manual-test-results.local-aa-preflight.json
  ```

- [ ] 运行一键 preflight。

  ```bash
  node scripts/check-map-list-blocked-summary-preflight.mjs
  ```

  期望：

  - 命令失败。
  - 错误点名缺失的 results JSON 路径，或明确说明 summary 找不到匹配的 blocked results JSON。
  - 不跳过该 summary 后继续报告整体成功。
  - 不生成替代 JSON，也不自动改写 summary。

## 5. 负向：summary 被改 passed 必须失败

- [ ] 重新生成一对正向 local JSON/MD。

  ```bash
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-aa-preflight.json \
    --summary-out harness/manual-test-summary.local-aa-preflight.md \
    --force
  ```

- [ ] 模拟生成后人工把 `map-list-visual-smoke` 行改成 `passed`。

  ```bash
  perl -0pi -e 's/(\| map-list-visual-smoke \|[^\n]*?\| )blocked( \|)/${1}passed${2}/' \
    harness/manual-test-summary.local-aa-preflight.md
  ```

- [ ] 运行一键 preflight。

  ```bash
  node scripts/check-map-list-blocked-summary-preflight.mjs
  ```

  期望：

  - 命令失败。
  - 错误来自或等价于 `scripts/check-map-list-blocked-summary.mjs` 的状态守门。
  - 错误说明 `map-list-visual-smoke` summary row 不能是 `passed`，或必须与 blocked JSON 保持一致。
  - 不允许把其他 local pair 的通过结果掩盖该失败。

## 6. 清理 local 产物

- [ ] 清理本清单生成的 ignored local 产物。

  ```bash
  rm -f harness/manual-test-results.local-aa-preflight*.json
  rm -f harness/manual-test-summary.local-aa-preflight*.md
  ```

- [ ] 确认 local evidence 没有进入提交范围。

  ```bash
  git status --short --ignored
  ```

  期望：可提交改动不包含 `harness/manual-test-results.local*.json` 或 `harness/manual-test-summary.local*.md`。

## 7. 报告口径不能写 UI passed

- [ ] 汇报 preflight 结果时只写“blocked summary/result pair guard passed”或“评审前一致性检查通过”。
- [ ] 不得写“地图列表视觉 smoke passed”“DevTools UI passed”“真机 passed”“用户路径 passed”或“可以发布”。
- [ ] 若 preflight 失败，报告需包含失败 pair、失败原因和是否已清理 local 产物。
- [ ] 若没有 local summary，报告需写“无 local blocked summary 需要检查”，而不是“地图列表无问题”。

## 8. 未验证项

以下内容不由本清单证明，除非后续有真实 DevTools 或真机证据：

- [ ] 地图列表抽屉在真实小程序环境中的 safe area、底部 tabBar 遮挡和滚动体验。
- [ ] 长标题、长正文、图片/无图任务卡在真实 cover-view/map 层上的截断和布局表现。
- [ ] marker 点击、列表点击、详情跳转和返回后的选中态保持。
- [ ] 定位授权允许/拒绝后的地图中心、任务距离和查找附近任务行为。
- [ ] 真实截图、录屏、日志、云端记录或任务 id 的脱敏审查。

## 9. 主 agent 收尾建议

- [ ] 运行语法和核心正负向验证。

  ```bash
  node --check scripts/check-map-list-blocked-summary-preflight.mjs
  node scripts/check-map-list-blocked-summary-preflight.mjs
  node scripts/prepare-map-list-blocked-summary.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --results-out harness/manual-test-results.local-aa-preflight.json \
    --summary-out harness/manual-test-summary.local-aa-preflight.md \
    --force
  node scripts/check-map-list-blocked-summary-preflight.mjs
  rm -f harness/manual-test-results.local-aa-preflight.json
  node scripts/check-map-list-blocked-summary-preflight.mjs
  ```

- [ ] 恢复正向 pair 后改坏 summary，再确认 preflight 失败。
- [ ] 清理 local 产物后运行 `git diff --check` 和 `bash harness/init.sh`。
