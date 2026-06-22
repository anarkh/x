# 地图列表视觉证据 Journey Gate QA 清单

- 日期：2026-06-14
- 分支：`codex/iter-map-list-evidence-gate`
- 角色：T 组 QA agent

范围：本清单只定义 `map-list-visual-smoke` 必备 journey 的证据模板完整性 gate。它用于确认校验脚本能发现 journey 被误删、关键字段失效、状态误写或默认结果被误标为通过；它不代表 WeChat DevTools、真机、地图列表 UI 或视觉 smoke 已通过。

重要边界：

- [ ] gate 通过只能写作“证据模板完整性通过”或“manual evidence schema gate 通过”，不得写作 `UI passed`、`视觉已通过`、`DevTools 已通过` 或 `真机通过`。
- [ ] `harness/manual-test-results.example.json` 中的 `map-list-visual-smoke` 默认必须是 `not_covered`，`evidence` 必须为空数组，`actual` 必须仍表达未执行。
- [ ] `scripts/prepare-manual-test-run.mjs` 生成的 local JSON 中，`summary.overallStatus` 仍应为 `not_covered`，全部 journeys 的 `passed` 数量仍应为 `0`。
- [ ] 只有真实打开 WeChat DevTools UI 或真机并完成观察后，才允许在 ignored local JSON 中把具体 journey 改成 `passed`；本 gate 不能替代该观察。
- [ ] 下面坏样例命令只写 ignored 的 `harness/manual-test-results.local*.json` 临时文件；执行后要清理，不要修改脚本、JSON 模板、产品文档或业务代码。

## 1. 准备

- [ ] 确认工作目录、分支和干净状态。

  ```bash
  pwd
  git branch --show-current
  git status --short
  ```

  期望：工作目录对应 `/tmp/street-tasks-iter-worktrees/map-list-evidence-gate`，分支为 `codex/iter-map-list-evidence-gate`；除本清单外没有需要 T 组处理的改动。

- [ ] 跑基础 harness。

  ```bash
  bash harness/init.sh
  ```

  期望：输出包含 `Checked 11 JSON files.`、`Harness OK: 6 features checked.` 和 `Harness init complete.`。

- [ ] 确认必备 journey 当前存在且默认未覆盖。

  ```bash
  node --input-type=module -e "import fs from 'node:fs'; const r=JSON.parse(fs.readFileSync('harness/manual-test-results.example.json','utf8')); const matches=r.journeys.filter((j)=>j.id==='map-list-visual-smoke'); if (matches.length!==1) throw new Error('expected exactly one map-list-visual-smoke journey'); const j=matches[0]; if (j.status!=='not_covered') throw new Error('map-list-visual-smoke must default to not_covered'); if (!Array.isArray(j.evidence) || j.evidence.length!==0) throw new Error('map-list-visual-smoke default evidence must be empty'); console.log('map-list-visual-smoke default template OK');"
  ```

  期望：命令通过并输出 `map-list-visual-smoke default template OK`。

## 2. 正向命令

- [ ] example 证据模板结构校验通过。

  ```bash
  node scripts/check-manual-evidence.mjs
  ```

  期望：输出 `Manual evidence checks passed.`。

- [ ] 证据卫生校验通过。

  ```bash
  node scripts/check-evidence-hygiene.mjs
  ```

  期望：输出 `Evidence hygiene checks passed.`；同时 example 中没有任何 journey 被标为 `passed`。

- [ ] 手测准备 helper 能生成 ignored local JSON。

  ```bash
  node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-gate-smoke.json --force
  ```

  期望输出至少包含：

  - `Running readiness preflight before manual UI testing.`
  - `This includes scripts/check-devtools-readiness.mjs and the map list static guard.`
  - `Passing preflight does not prove DevTools or real-device visual acceptance.`
  - `Manual evidence checks passed.`
  - `Evidence hygiene checks passed.`
  - `Manual test run prepared.`

- [ ] local JSON 默认仍没有任何 passed journey。

  ```bash
  node --input-type=module -e "import fs from 'node:fs'; const p='harness/manual-test-results.local-gate-smoke.json'; const r=JSON.parse(fs.readFileSync(p,'utf8')); const j=r.journeys.find((item)=>item.id==='map-list-visual-smoke'); const passed=r.journeys.filter((item)=>item.status==='passed').length; if (!j) throw new Error('local JSON missing map-list-visual-smoke'); if (j.status!=='not_covered') throw new Error('local map-list-visual-smoke must default to not_covered'); if (passed!==0) throw new Error(`local JSON must have passed=0, got ${passed}`); if (r.summary?.overallStatus!=='not_covered') throw new Error('local summary.overallStatus must remain not_covered'); console.log(`overall=${r.summary.overallStatus} passed=${passed} mapList=${j.status}`);"
  ```

  期望：输出 `overall=not_covered passed=0 mapList=not_covered`。

- [ ] local JSON 保持 ignored，不进入提交范围。

  ```bash
  git status --short --ignored
  ```

  期望：`harness/manual-test-results.local-gate-smoke.json` 只出现在 ignored 区域，不能出现在 staged 或普通未跟踪待提交列表。

## 3. 坏样例：缺 Journey

目标：确认 gate 能发现 `map-list-visual-smoke` 被误删。若当前脚本未报错，应把该项记录为 gate 缺口，不得视为通过。

- [ ] 生成缺 journey 的坏样例 local JSON。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local-gate-missing-journey.json
  node --input-type=module -e "import fs from 'node:fs'; const p='harness/manual-test-results.local-gate-missing-journey.json'; const r=JSON.parse(fs.readFileSync(p,'utf8')); r.journeys=r.journeys.filter((j)=>j.id!=='map-list-visual-smoke'); fs.writeFileSync(p, `${JSON.stringify(r,null,2)}\n`);"
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-gate-missing-journey.json
  ```

- [ ] 预期错误提示。

  期望：命令失败，错误应包含等价语义：

  ```text
  Missing required journey id: map-list-visual-smoke
  ```

  若只输出 `Manual evidence checks passed.`，说明现有校验没有覆盖必备 journey 存在性，本轮 gate 不可签通过。

## 4. 坏样例：重复 Journey

目标：确认 gate 能发现 `map-list-visual-smoke` 被重复复制。重复条目会让评审难以判断哪条才是真实视觉 smoke 结果。

- [ ] 生成重复 journey 的坏样例 local JSON。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local-gate-duplicate-journey.json
  node --input-type=module -e "import fs from 'node:fs'; const p='harness/manual-test-results.local-gate-duplicate-journey.json'; const r=JSON.parse(fs.readFileSync(p,'utf8')); const j=r.journeys.find((item)=>item.id==='map-list-visual-smoke'); r.journeys.splice(2,0,{...j}); fs.writeFileSync(p, `${JSON.stringify(r,null,2)}\n`);"
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-gate-duplicate-journey.json
  ```

- [ ] 预期错误提示。

  期望：命令失败，错误应包含等价语义：

  ```text
  Expected exactly one required journey id: map-list-visual-smoke; found 2.
  ```

## 5. 坏样例：关键字段失效

目标：确认 `map-list-visual-smoke` 的必备字段损坏时会失败。

- [ ] 删除 `steps` 字段。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local-gate-missing-steps.json
  node --input-type=module -e "import fs from 'node:fs'; const p='harness/manual-test-results.local-gate-missing-steps.json'; const r=JSON.parse(fs.readFileSync(p,'utf8')); const j=r.journeys.find((item)=>item.id==='map-list-visual-smoke'); delete j.steps; fs.writeFileSync(p, `${JSON.stringify(r,null,2)}\n`);"
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-gate-missing-steps.json
  ```

  期望错误包含：

  ```text
  journey map-list-visual-smoke is missing required field: steps
  ```

- [ ] 删除 `expected` 字段。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local-gate-missing-expected.json
  node --input-type=module -e "import fs from 'node:fs'; const p='harness/manual-test-results.local-gate-missing-expected.json'; const r=JSON.parse(fs.readFileSync(p,'utf8')); const j=r.journeys.find((item)=>item.id==='map-list-visual-smoke'); delete j.expected; fs.writeFileSync(p, `${JSON.stringify(r,null,2)}\n`);"
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-gate-missing-expected.json
  ```

  期望错误包含：

  ```text
  journey map-list-visual-smoke is missing required field: expected
  ```

- [ ] 删除 `evidence` 字段。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local-gate-missing-evidence.json
  node --input-type=module -e "import fs from 'node:fs'; const p='harness/manual-test-results.local-gate-missing-evidence.json'; const r=JSON.parse(fs.readFileSync(p,'utf8')); const j=r.journeys.find((item)=>item.id==='map-list-visual-smoke'); delete j.evidence; fs.writeFileSync(p, `${JSON.stringify(r,null,2)}\n`);"
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-gate-missing-evidence.json
  ```

  期望错误包含：

  ```text
  journey map-list-visual-smoke is missing required field: evidence
  ```

## 6. 坏样例：错误状态

目标：确认 status 只能是 `passed`、`failed`、`blocked`、`not_covered`。

- [ ] 把 `map-list-visual-smoke` 改成非法状态。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local-gate-bad-status.json
  node --input-type=module -e "import fs from 'node:fs'; const p='harness/manual-test-results.local-gate-bad-status.json'; const r=JSON.parse(fs.readFileSync(p,'utf8')); const j=r.journeys.find((item)=>item.id==='map-list-visual-smoke'); j.status='ui_passed'; fs.writeFileSync(p, `${JSON.stringify(r,null,2)}\n`);"
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-gate-bad-status.json
  ```

  期望错误包含：

  ```text
  journey map-list-visual-smoke has invalid status "ui_passed"
  ```

- [ ] 手动复核：不要新增 `visual_passed`、`devtools_passed`、`real_device_passed` 等自造状态；真实 UI 结果仍只能映射到允许状态之一。

## 7. Blocked / Passed 边界

目标：确认 blocked 能表达环境阻塞，passed 不能被空证据或未执行文案伪造。

- [ ] `blocked` 边界：blocked 但没有 `risks` 和 `followUp` 应失败。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local-gate-bad-blocked.json
  node --input-type=module -e "import fs from 'node:fs'; const p='harness/manual-test-results.local-gate-bad-blocked.json'; const r=JSON.parse(fs.readFileSync(p,'utf8')); const j=r.journeys.find((item)=>item.id==='map-list-visual-smoke'); j.status='blocked'; j.risks=[]; j.followUp=''; fs.writeFileSync(p, `${JSON.stringify(r,null,2)}\n`);"
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-gate-bad-blocked.json
  ```

  期望错误包含：

  ```text
  journey map-list-visual-smoke is blocked but both risks and followUp are empty.
  ```

- [ ] `blocked` 正向边界：如果 DevTools service port、项目导入、真机不可用或测试数据准备失败，应写 `blocked`，并保留 `risks` 或 `followUp`，不得改成 `passed`。

- [ ] `passed` 边界：passed 但 evidence 为空应失败。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local-gate-bad-passed.json
  node --input-type=module -e "import fs from 'node:fs'; const p='harness/manual-test-results.local-gate-bad-passed.json'; const r=JSON.parse(fs.readFileSync(p,'utf8')); const j=r.journeys.find((item)=>item.id==='map-list-visual-smoke'); j.status='passed'; j.evidence=[]; fs.writeFileSync(p, `${JSON.stringify(r,null,2)}\n`);"
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-gate-bad-passed.json
  ```

  期望错误至少包含：

  ```text
  journey map-list-visual-smoke is passed but evidence is empty.
  ```

- [ ] 手动复核：即使 `steps`、`expected`、`actual` 非空，只要 `actual` 仍写着未覆盖、未执行、blocked、静态检查通过或 helper prepared，就不能把 `map-list-visual-smoke` 写成 `passed`。

- [ ] 手动复核：example 模板中任何 journey 被改成 `passed` 都应被证据卫生 gate 拒绝；若只能在一次性分支或临时副本里验证，验证后立即丢弃该副本，不要在当前工作树改模板。

## 8. Local Helper 回归

目标：确认 helper 只准备手测文件，不伪造 UI 通过。

- [ ] 重新生成 local JSON。

  ```bash
  node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-gate-helper.json --force
  ```

- [ ] 检查 helper 输出边界。

  期望：输出包含 `Passing preflight does not prove DevTools or real-device visual acceptance.`；不得出现 `UI passed`、`DevTools visual passed`、`real-device passed` 等措辞。

- [ ] 检查 local JSON 默认值。

  ```bash
  node --input-type=module -e "import fs from 'node:fs'; const r=JSON.parse(fs.readFileSync('harness/manual-test-results.local-gate-helper.json','utf8')); const passed=r.journeys.filter((j)=>j.status==='passed'); const target=r.journeys.find((j)=>j.id==='map-list-visual-smoke'); if (passed.length!==0) throw new Error(`helper must keep passed=0, got ${passed.length}`); if (!target) throw new Error('helper output missing map-list-visual-smoke'); if (target.status!=='not_covered') throw new Error(`helper map-list-visual-smoke must be not_covered, got ${target.status}`); if (target.evidence.length!==0) throw new Error('helper map-list-visual-smoke evidence must be empty'); console.log('helper local JSON keeps passed=0 and map-list-visual-smoke not_covered');"
  ```

  期望：输出 `helper local JSON keeps passed=0 and map-list-visual-smoke not_covered`。

- [ ] 检查 local 文件 ignored。

  ```bash
  git status --short --ignored
  ```

  期望：`harness/manual-test-results.local-gate-helper.json` 不会进入可提交变更。

## 9. 证据卫生

- [ ] 运行证据卫生 gate。

  ```bash
  node scripts/check-evidence-hygiene.mjs
  ```

  期望：输出 `Evidence hygiene checks passed.`。

- [ ] 确认 `.gitignore` 仍包含本地手测产物。

  ```bash
  rg -n "harness/manual-test-results\\.local\\*\\.json|harness/manual-test-summary\\.local\\*\\.md|harness/manual-evidence-artifacts/" .gitignore
  ```

  期望：三类 ignored 规则都存在。

- [ ] 检查待提交内容没有本地证据、截图、录屏、完整日志或敏感路径。

  ```bash
  git status --short --ignored
  git diff -- harness
  ```

  期望：可提交范围只有本轮 QA 清单；local JSON、local summary 和 `harness/manual-evidence-artifacts/` 保持 ignored。

- [ ] 如果未来填写真实 evidence，只能写脱敏摘要或附件编号；不要提交真实截图、录屏、二维码、完整 Console/Network、`cloud://` 完整 fileID、CloudBase env id、openId、手机号、cookie、token、本机绝对路径或精确经纬度。

## 10. 错误日期扫描

目标：防止本轮文档误写成后一日日期。

- [ ] 扫描本轮相关文件，不应出现后一日误写。

  ```bash
  node --input-type=module <<'NODE'
  import { existsSync, readFileSync } from 'node:fs';

  const badDate = ['2026', '06', String(14 + 1).padStart(2, '0')].join('-');
  const files = [
    'harness/map-list-evidence-gate-checklist.md',
    'harness/manual-test-results.example.json',
    'harness/feature_list.json',
    'harness/claude-progress.md'
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

## 11. 收尾验证

- [ ] 清理坏样例和 helper local 文件。

  ```bash
  rm -f harness/manual-test-results.local-gate*.json
  ```

- [ ] 跑基础 harness。

  ```bash
  bash harness/init.sh
  ```

  期望：完整通过；这仍只证明 baseline 与 harness gate 通过，不证明 UI 通过。

- [ ] 检查 diff 空白。

  ```bash
  git diff --check
  ```

  期望：无输出，退出码为 0。

- [ ] 检查最终工作树。

  ```bash
  git status --short --ignored
  ```

  期望：可提交改动只包含 T 组产品 brief、QA 清单、manual evidence gate 脚本和 harness 记录；本地 smoke JSON 或附件目录仍为 ignored 或已清理。

- [ ] 最终报告只说明：

  - 修改文件：T 组产品 brief、QA 清单、manual evidence gate 脚本和 harness 记录
  - 已运行：manual evidence 正向/坏样例、helper local JSON、证据卫生、readiness、harness init 和 diff 检查
  - 结论：T 组完成的是证据模板完整性 gate；没有声明 WeChat DevTools、真机或地图列表 UI 已通过。
