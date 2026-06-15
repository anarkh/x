# 手测 Preflight 对齐产品 Brief

- 日期：2026-06-14
- 分支：`codex/iter-manual-preflight-alignment`
- 角色：R 组产品 agent
- 对应 feature：`map-feed-001`

## 问题

Q 组已经把地图列表 static guard 接入 `scripts/check-devtools-readiness.mjs`。但是实际执行手测的人通常不会逐条回忆所有历史分支，而是从 `scripts/prepare-manual-test-run.mjs` 生成本地结果文件并开始 DevTools 或真机操作。如果这个入口没有显式说明它正在运行 Q 组 readiness，就容易出现两个误解：执行者不知道地图列表 guard 已经被跑过，或把 helper 成功误读成真实视觉验收通过。

## 用户价值

真实用户价值来自后续 DevTools 或真机手测，而不是 helper 本身。R 组的价值是让手测准备入口更可靠：执行者只要从 helper 开始，就能先看到 readiness、地图列表 static guard、manual evidence 和 evidence hygiene 的结果，再进入 UI 手测。这降低了漏跑 preflight、跳过证据门禁和误写 passed 的概率。

## 范围内

- `scripts/prepare-manual-test-run.mjs` 在运行 gate 前明确输出本轮 preflight 的边界。
- Next steps 先提醒确认上方 preflight 输出，尤其是 map list static guard，再打开 WeChat DevTools。
- 补充 R 组产品和 QA 文档，说明 helper 成功只代表准备完成，不代表 DevTools 或真机视觉通过。
- 继续使用 ignored 的 `harness/manual-test-results.local*.json` 和 `harness/manual-evidence-artifacts/`，不把原始证据提交进仓库。

## 非目标

- 不修改地图页业务逻辑、WXML 或 WXSS。
- 不新增用户可见功能，也不改变已有手测旅程定义。
- 不恢复 DevTools service port 9420，不执行 quit/open/kill/cache/config 操作。
- 不把 local JSON 生成、readiness 通过或 static guard 通过写成真实 UI passed。
- 不替代后续 manual evidence、evidence hygiene 和 sanitized summary 收尾。

## 与 P/Q/K/L 的关系

- P 组提供地图列表 WXML/WXSS static guard。
- Q 组把 P 的 guard 接入 readiness/preflight。
- K 组提供手测准备 helper，生成 ignored local 结果文件并串联门禁。
- L 组把真实 local 结果生成 ignored 的脱敏摘要草稿。
- R 组把 K 的入口与 Q 的 readiness 关系显式化，让执行者在同一个 helper 输出里看到地图列表 static guard 已经被纳入准备流程。

## 成功标准

- 运行 `node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-r-smoke.json --force` 时，输出先说明正在运行 manual run preflight gates。
- 同一输出包含 `Map list resilience checks passed.` 和 `DevTools readiness checks passed. Static gates passed; DevTools and real-device visual acceptance are still required.`。
- Next steps 第一步要求确认上方 preflight 输出通过，再进入 WeChat DevTools UI。
- 生成的 local JSON 保持 ignored，summary 状态仍为 `not_covered`，不能自动产生 passed journey。
- `node scripts/check-manual-evidence.mjs <local-json>`、`node scripts/check-evidence-hygiene.mjs`、`bash harness/init.sh` 和 `git diff --check` 均通过。

## 9420 Blocked 边界

R 组不解决 9420 blocked。如果 helper 成功但 DevTools UI 或真机链路仍无法执行，真实 journey 仍应写 `blocked` 或 `not_covered`，不能写 `passed`。端口状态仍应引用 M/N/O 组诊断或后续人工 UI 操作结果。

## 评测关注点

- 手测入口是否比 Q 更接近实际执行路径。
- 是否降低执行者漏看地图列表 static guard 的概率。
- 是否继续严格区分 static gates、manual preparation 和真实 UI acceptance。
- 是否保持改动范围小，没有触碰页面实现或本机 DevTools 状态。
