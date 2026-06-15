# 地图列表 Preflight 集成 QA 清单

- 日期：2026-06-14
- 分支：`codex/iter-map-list-preflight`
- 工作目录：`/tmp/street-tasks-iter-worktrees/map-list-preflight`
- 角色：Q 组 QA / 设计评测 agent

范围：本清单验证地图列表静态韧性检查已经进入 readiness/preflight 链路。它只覆盖自动门禁和证据口径，不代表地图列表已经在 WeChat DevTools 或真机上通过视觉验收。

## 1. 自动检查

- [ ] 运行地图列表静态检查。

  ```bash
  node --no-warnings scripts/check-map-list-resilience.mjs
  ```

  期望：输出 `Map list resilience checks passed.`。若失败，失败信息应指出缺失的 WXML 结构或 WXSS 规则，例如标题行、标签组、正文 clamp、缩略图尺寸、footer 右侧省略或详情按钮固定宽度。

- [ ] 运行 readiness 聚合检查。

  ```bash
  node --no-warnings scripts/check-devtools-readiness.mjs
  ```

  期望：输出发布、信任洞察、候选流程和 `Map list resilience checks passed.`；最终输出 `DevTools readiness checks passed.`，同时文档或评测报告仍说明 DevTools 与真机视觉验收需要人工执行。

- [ ] 运行基础 harness。

  ```bash
  bash harness/init.sh
  ```

  期望：JSON 与 harness 自检通过，仓库仍能从标准入口重启。

## 2. 失败时的阻断口径

- [ ] 如果 `scripts/check-map-list-resilience.mjs` 缺失，readiness 必须失败，不能把候选写成 ready for visual acceptance。
- [ ] 如果地图列表静态检查失败，记录为 preflight blocker，并把具体缺失项写入 handoff 或评测报告。
  - 期望首行：`Map list resilience checks failed:`
  - 期望缺口明细：`- WXML missing ...`、`- WXSS missing ...` 或 `- WXSS ... should ...`
  - 期望边界提示：`This is a static guard only; DevTools or real-device visual acceptance is still required.`
- [ ] 如果 readiness 聚合检查因为地图列表失败而退出，终端应保留地图列表的具体失败项，不能只显示笼统的 readiness 失败。
- [ ] 如果 readiness 其他门禁失败，保持原有失败优先级，不用地图列表检查覆盖发布、信任洞察或候选流程风险。
- [ ] 失败报告中不要写“DevTools 已通过”“真机已通过”或“地图 UI 已验证”，除非后续有真实环境证据。

## 3. 地图列表风险覆盖

- [ ] 长标题：标题应允许换行或断词，不能把分类/状态标签和详情入口挤出卡片。
- [ ] 标签：分类、lost/found、状态标签应允许换行，不能依赖单行硬撑。
- [ ] 缩略图：带图卡片应保留固定图片列、正文列和固定详情入口列。
- [ ] 正文：摘要应有行数和溢出保护，长正文不能让单卡无限拉高。
- [ ] Footer：确认/过时统计可换行，右侧时间距离可省略，二者不能互相覆盖。
- [ ] 详情入口：轻量按钮宽高应稳定，不能因 hover、loading 或文本变化撑大布局。

## 4. 仍需人工验证

- [ ] 自动检查只能证明关键 WXML/WXSS 结构和样式约束存在，不能证明真实渲染、触摸命中、图片加载、字体度量或地图原生层表现正确。
- [ ] DevTools service port 9420 恢复后，用微信 DevTools 打开本分支项目并完成一次普通编译。
- [ ] 在常见模拟器宽度和窄屏下打开地图列表抽屉，验证长标题、长正文、带图、无图、多状态和底部统计组合。
- [ ] 在真机或真机预览中验证安全区、tabBar 上方空间、最后一张卡片滚动到底部、图片加载前后布局和详情跳转。
- [ ] 记录 DevTools 版本、基础库、设备或模拟器宽度、分支、提交 SHA、步骤、实际结果和脱敏截图或录屏编号。

## 5. 9420 Blocked 时的降级证据

- [ ] 若端口仍 blocked，记录 `scripts/inspect-devtools-port-state.mjs` 或 `scripts/check-devtools-smoke-access.mjs` 的摘要，而不是反复尝试 quit/open。
- [ ] 降级报告应同时写清：静态 readiness 结果、DevTools/真机视觉验收状态、下一步人工恢复动作。
- [ ] 降级字段至少包括：`branch`、`commit`、`worktree`、`baseline`、`devtoolsPort=9420`、`portStatus`、`actualResult`、`manualJourneyImpact`、`nextAction`。
- [ ] 可接受摘要包括：`9420 connection refused`、`declared ide-http-port but no listener`、`DevTools UI journey not executed`。
- [ ] 可提交文档中不要包含本机用户目录、原始截图路径、cookie、token、云端私密 ID 或完整控制台日志。
- [ ] 结论使用 `blocked`、`unverified`、`static gate passed` 等状态词，避免把静态门禁包装成真实用户体验通过。
