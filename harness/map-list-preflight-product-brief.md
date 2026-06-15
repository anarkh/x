# 地图列表 Preflight 集成产品 Brief

- 日期：2026-06-14
- 分支：`codex/iter-map-list-preflight`
- 角色：Q 组产品 agent
- 对应 feature：`map-feed-001`

## 问题

P 组已经新增 `scripts/check-map-list-resilience.mjs`，可以静态检查地图列表抽屉和任务卡片的关键 WXML/WXSS 结构。这个检查单独存在时，后续候选版仍可能只运行旧的 readiness 命令，漏掉地图列表长标题、标签、缩略图、footer 和详情入口的防回归门禁。

当前 WeChat DevTools service port 9420 仍处于 blocked 状态，真实视觉 smoke 还不能稳定执行。因此 Q 组的重点是把这道静态检查纳入更高层的 `scripts/check-devtools-readiness.mjs`，作为候选进入人工 DevTools 或真机验证前的自动门禁，而不是把它包装成已经完成的 UI 验收。

## 用户价值

地图列表是用户进入附近任务的主入口之一。把列表卡片的静态韧性检查接入 readiness 链路，可以在每次准备大版本手测前自动发现明显结构回退，减少“手测前才发现列表卡片被挤坏”或“手测报告遗漏地图列表风险”的概率。

## 范围内

- `scripts/check-devtools-readiness.mjs` 默认运行 `scripts/check-map-list-resilience.mjs`。
- readiness 所需文件清单包含地图列表韧性脚本和 P 组产品/QA 文档。
- readiness 成功输出继续说明静态门禁通过不等于 DevTools 或真机视觉通过。
- 失败时把地图列表静态检查视为 preflight blocker，不能继续把候选描述为 ready for visual acceptance。
- Q 组文档补充执行者该如何解释这道门禁，以及在 9420 blocked 时如何记录降级证据。

## 非目标

- 不修改地图页业务逻辑、WXML 或 WXSS。
- 不新增用户可见功能，也不改变地图列表视觉方案。
- 不恢复 DevTools 9420 服务端口，不重启、退出或操作本机 DevTools。
- 不宣称地图列表、发布、详情或完整用户旅程已经通过真实 UI smoke。
- 不替代 P 组 checklist 中要求的 DevTools、真机、窄屏、安全区和真实交互检查。

## 成功标准

- 运行 `node --no-warnings scripts/check-devtools-readiness.mjs` 时，输出包含 `Map list resilience checks passed.`。
- 如果 `scripts/check-map-list-resilience.mjs` 缺失或失败，readiness 命令失败，并把它作为进入人工手测前必须处理的 blocker。
- readiness 的最终通过文案同时保留两层结论：自动静态门禁通过；DevTools 和真机视觉验收仍需人工执行。
- `bash harness/init.sh`、JSON 检查和 harness 检查仍可从干净仓库状态重新跑通。
- 证据记录使用“降低结构/样式回归风险”“preflight blocker”这类措辞，不写成“视觉已通过”。

## 与 9420 Blocker 的关系

Q 组不解决 9420 blocked。它只让端口仍 blocked 时的候选准备更诚实：能运行的静态门禁必须先通过，不能运行的真实 DevTools/真机验收继续标记为 blocked 或 unverified。

如果后续端口恢复，执行者仍应按 P 组地图列表清单和已有手测 runbook 执行真实视觉 smoke，并记录 DevTools 版本、机型、屏宽、步骤、实际结果和脱敏证据。

## 评测关注点

- 相比 P 组，Q 组是否降低了“新增检查但无人记得运行”的风险。
- 是否避免把静态检查当作视觉验收通过。
- readiness 输出是否足够清楚，能让执行者知道下一步是人工 DevTools 或真机验证。
- 是否保持改动范围小，没有为了门禁集成触碰页面实现。
