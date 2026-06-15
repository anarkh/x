# 手测 Preflight 对齐 QA 清单

- 日期：2026-06-14
- 分支：`codex/iter-manual-preflight-alignment`
- 角色：R 组 QA / 设计评测 agent

范围：本清单验证 `scripts/prepare-manual-test-run.mjs` 已显式对齐 Q 组 readiness/preflight。它只证明手测准备入口会运行静态门禁和证据门禁，不代表 WeChat DevTools 或真机视觉验收已经通过。

## 1. 自动准备命令

- [ ] 运行手测准备 helper。

  ```bash
  node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-r-smoke.json --force
  ```

  期望输出包含：

  - `Running readiness preflight before manual UI testing.`
  - `This includes scripts/check-devtools-readiness.mjs and the map list static guard.`
  - `Passing preflight does not prove DevTools or real-device visual acceptance.`
  - `Publish flow checks passed.`
  - `Trust insight checks passed.`
  - `Candidate flow checks passed.`
  - `Map list resilience checks passed.`
  - `DevTools readiness checks passed. Static gates passed; DevTools and real-device visual acceptance are still required.`
  - `Manual evidence checks passed.`
  - `Evidence hygiene checks passed.`
  - `Manual test run prepared.`

- [ ] 检查 Next steps。

  期望：第 1 步要求先阅读上方 readiness preflight 输出并包含 map list static guard 结果；随后才要求打开当前 worktree 的 WeChat DevTools UI。

- [ ] 确认 local JSON 仍为 ignored。

  ```bash
  git status --short --ignored
  ```

  期望：`harness/manual-test-results.local-r-smoke.json` 只出现在 ignored 区域或不进入待提交文件；不得 staging 或 commit。

## 2. 后续门禁

- [ ] 校验本地结果文件。

  ```bash
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-r-smoke.json
  ```

  期望：通过；由于 helper 只准备文件，journey 仍应保持未覆盖或占位状态，不自动产生真实 passed。

- [ ] 校验证据卫生。

  ```bash
  node scripts/check-evidence-hygiene.mjs
  ```

  期望：通过；可提交文档不包含原始截图、录屏、本机路径、云端私密 ID、token 或 cookie。

- [ ] 如需摘要，先完成真实手测并填写 local JSON，再运行：

  ```bash
  node scripts/create-manual-summary.mjs --input harness/manual-test-results.local-r-smoke.json --out harness/manual-test-summary.local-r-smoke.md
  ```

  期望：摘要也是 ignored local 草稿，仍需人工脱敏复核后才能转入可提交报告。

## 3. 9420 Blocked 记录

- [ ] 如果 DevTools service port 9420 仍 blocked，真实 UI journey 写 `blocked` 或 `not_covered`。
- [ ] 降级记录应写清：静态 preflight 已通过、DevTools/真机视觉未执行、端口状态摘要、下一步人工恢复动作。
- [ ] 不要重复运行会改变本机 DevTools 状态的 quit/open/kill/cache/config 操作；优先引用 M/N/O 组已有诊断，或由有 UI 权限的执行者人工恢复。

## 4. 不能替代的真实验证

- [ ] 地图列表长标题、长正文、带图/无图、底部统计、safe area、地图原生层遮挡、列表滚动和详情入口点击仍需 DevTools 或真机验证。
- [ ] 发布准备度、定位拒绝/重试、图片上传失败回滚、发布后详情跳转、详情 TrustInsight 和评论入口仍需真实操作。
- [ ] helper 成功只能写作 `manual run prepared` 或 `static gates passed`；不能写作 `UI passed`、`视觉已通过` 或 `真机通过`。

## 5. 清理

- [ ] 验证完成后清理 smoke local 文件。

  ```bash
  rm -f harness/manual-test-results.local-r-smoke.json harness/manual-test-summary.local-r-smoke.md
  ```

- [ ] 提交前确认工作区只包含 R 组文档、脚本和 harness 记录。

  ```bash
  git status --short
  git diff --check
  ```
