# 地图列表 Blocked Summary 同源完整性产品 Brief

- 日期：2026-06-14
- 分支：`codex/iter-map-list-summary-integrity`
- 角色：X 组产品 agent
- 对应 feature：`map-feed-001`

## 用户问题

W 组新增 `scripts/check-map-list-blocked-summary.mjs` 后，已经守住 ignored blocked JSON 与 ignored summary 的关键状态不变量：`summary.overallStatus=blocked`、`map-list-visual-smoke=blocked`、`passed=0`，以及目标 journey 的 `evidenceCount=0`。

评测指出剩余缺口是“可信转述”的完整性还不够严格：summary 可能保留 blocked 状态和空 evidence 数量，却把 `branch`、`commit`、blocked reason 或 `followUp` 改成另一份结果的内容。这样会让评审看到一份看似合规的 Markdown，但无法确认它确实来自同一份 blocked JSON。

## 产品假设

如果 guard 进一步比对 summary 与 JSON 的 metadata、blocked reason 和 `followUp`，并要求这些字段同源完整，评审就可以把 ignored summary 当作同一份 blocked JSON 的可信转述。

X 组的价值只在于补齐证据链路的同源判断：确认 summary 没有跨 run、跨 commit、跨 blocker 或跨 follow-up 拼接。X 不执行 WeChat DevTools/真机，不修改业务 UI，不声明地图列表视觉 smoke 通过；只进一步确认 ignored summary 是同一份 blocked JSON 的可信转述。

## 范围

- 定义 blocked JSON 与 ignored summary 之间的 metadata 同源口径，至少覆盖 `branch`、`commit`，并保留 `testedAt`、`tester` 的可追踪关系。
- 定义 blocked reason 同源口径，要求 summary 的 `blocker` 信息来自 JSON 中 `map-list-visual-smoke` 的 blocker 或 risks，不允许改写成泛化通过话术。
- 定义 `followUp` 同源口径，要求 summary 的 `followUp` 与 JSON 目标 journey 的下一步一致，不允许替换成无关发布建议。
- 要求同源完整性建立在 W 组已守住的 blocked 状态、`passed=0` 和 `evidenceCount=0` 之上。
- 只面向 ignored local 文件：`harness/manual-test-results.local*.json` 与 `harness/manual-test-summary.local*.md`。

## 非目标

- X 组不执行 WeChat DevTools、DevTools CLI open/preview、真机调试或任何真实 UI smoke。
- X 组不修改业务 UI、WXML、WXSS、JS、地图列表交互、数据模型或云端能力。
- X 组不声明地图列表视觉 smoke、DevTools smoke、真机 smoke 或完整用户旅程通过。
- X 组不把 readiness、static guard、helper 成功、JSON 校验、summary 生成或同源 guard 通过写成视觉 `passed`。
- X 组不提交 ignored local JSON 或 ignored local summary；本 brief 只定义产品口径和验收边界。

## 与 U/V/W/L 的关系

| 组别 | 已提供能力 | X 组补齐的产品口径 |
| --- | --- | --- |
| U | 生成 ignored blocked local JSON，写入当前 `branch`、`commit`，并让 `map-list-visual-smoke` 保持 blocked、空 evidence 和明确 follow-up | X 组要求 summary 的 run metadata 与这份 JSON 同源，不能换成别的分支、commit 或人工摘要 |
| V | 串联 blocked JSON helper 与 sanitized summary 生成，让评审更容易阅读 blocked 结论 | X 组要求这份可读摘要不仅状态正确，还必须完整转述同一份 JSON 的 blocker 与下一步 |
| W | 新增 blocked summary guard，守住 `overallStatus=blocked`、`map-list-visual-smoke=blocked`、`passed=0`、`evidenceCount=0` | X 组把 guard 的目标从状态一致性推进到同源完整性，补上 metadata、reason、`followUp` 比对 |
| L | 从 ignored local JSON 生成 ignored local Markdown 摘要，并只展示 evidence 数量，不暴露 raw evidence | X 组沿用 L 的脱敏边界，但要求脱敏后的字段仍能追溯回同一份 JSON |

## Metadata/Reason/FollowUp 通过边界

同源完整性可以通过的条件：

- JSON 与 summary 都是 ignored local 路径，并且已满足 W 组 blocked 状态不变量。
- summary `## Run` 中的 `branch` 与 JSON 顶层 `branch` 一致，`commit` 与 JSON 顶层 `commit` 一致。
- 如果 summary 展示 `testedAt` 或 `tester`，它们必须来自 JSON 顶层同名字段；缺失时应按既有生成器的空值规则处理，而不是填入人工猜测值。
- summary `map-list-visual-smoke` 行的 `blocker` 必须来自 JSON 目标 journey 的 blocker 或 risks；文本可接受 Markdown 转义差异，但不能改变阻塞原因的实质含义。
- summary `map-list-visual-smoke` 行的 `followUp` 必须来自 JSON 目标 journey 的 `followUp`，并继续指向恢复 DevTools/真机后重跑真实视觉 smoke。
- summary 仍然只证明 blocked JSON 被可信转述，不增加任何真实 UI evidence。

## Metadata/Reason/FollowUp 失败边界

同源完整性应失败的条件：

- summary 的 `branch` 或 `commit` 与 JSON 顶层字段不一致，或 summary 缺少这些可追踪 metadata。
- summary 的 `blocker` 丢失、被清空，或被改成“已验证”“可发布”“无阻塞”等削弱 blocked 事实的文字。
- summary 的 `blocker` 来自另一份 run、另一条 journey，或无法对应 JSON 中 `map-list-visual-smoke` 的 blocker/risks。
- summary 的 `followUp` 丢失、被清空，或不再要求恢复 DevTools/真机后重跑 `map-list-visual-smoke`。
- summary 通过人工拼接保留了 `blocked` 和 `evidenceCount=0`，但 metadata、reason、`followUp` 任一项无法证明来自同一份 blocked JSON。

核心边界：同源 guard 通过只表示“ignored summary 是同一份 blocked JSON 的可信脱敏转述”；它不是地图列表视觉 smoke passed，也不是业务 UI failed。

## 成功标准

- guard 能在状态一致之外，发现 summary 与 JSON 的 `branch`、`commit` 不一致。
- guard 能发现 summary 丢失或改写 `map-list-visual-smoke` 的 blocked reason。
- guard 能发现 summary 丢失或替换 `map-list-visual-smoke` 的 `followUp`。
- 评审看到 guard 通过时，只能得出“blocked 摘要同源可信且未制造 evidence”的结论。
- 真实发布判断仍要求 WeChat DevTools UI 或真机执行地图列表视觉 smoke，并补齐真实观察证据。

## 下一步

- 开发在 `scripts/check-map-list-blocked-summary.mjs` 中补齐 summary 与 JSON 的 run metadata 比对。
- 开发补齐 `map-list-visual-smoke` 行 `blocker` 与 JSON blocker/risks 的同源比对，允许 Markdown 转义差异但不允许语义替换。
- 开发补齐 `map-list-visual-smoke` 行 `followUp` 与 JSON `followUp` 的同源比对。
- QA 准备坏样例：换 branch、换 commit、改 blocker、删 blocker、改 `followUp`、删 `followUp`，确认 guard 必须失败。
- DevTools 或真机入口恢复后，仍按 S 组地图列表视觉 smoke 执行真实观察；只有真实 evidence 补齐后，才允许把 journey 改为 `passed` 或 `failed`。
