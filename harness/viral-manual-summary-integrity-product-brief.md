# Viral Manual Journey Summary Integrity 产品 Brief

- 日期：2026-06-17
- 分支：`codex/iter-viral-manual-summary-integrity`
- 角色：AE 组产品 agent
- 对应 feature：`map-feed-001`

## 背景

AD 组已经把七条 viral manual journey 整理成手测执行包；O/W 相关能力也已经要求真实手测结果写入 ignored local JSON，并由 `scripts/check-viral-journey-manual-evidence.mjs` 校验状态、环境、七条 journey、payload 约束和 `summary.overallStatus` 聚合。另一个通用能力 `scripts/create-manual-summary.mjs` 可以把本地 JSON 转成脱敏 Markdown summary，供评审阅读。

剩余风险在 JSON 与 Markdown summary 之间：手工跑完 journey 后，执行者可能先生成 summary，再继续修改 ignored JSON；也可能手工改 summary、复制旧 summary、引用别的分支 summary，或只看 Markdown 而不重新核对源 JSON。这样会让评审报告引用过期摘要，甚至把当前 JSON 中的 `blocked` / `failed` 误读成 Markdown 里的 `passed`。

本 brief 定义一个窄切口：只验证 ignored local viral journey JSON 与 ignored local Markdown summary 是否同源一致。JSON 是事实源，Markdown 只是脱敏摘要视图。

## 用户与评审场景

1. 手测执行者在 WeChat DevTools 或真机上完成七条 viral manual journey，把真实观察写入 `harness/manual-test-results.local-viral-journey*.json`。
2. 执行者运行 viral manual evidence checker，确认 JSON 本身的 schema、branch/commit、journey 状态和 payload/evidence 字段合规。
3. 执行者生成 `harness/manual-test-summary.local-viral-journey*.md`，给评审或报告引用。
4. 在评审前，必须重新确认当前 summary 仍来自当前 JSON：`overallStatus`、每条 journey 的 `status`、每条 journey 的 `evidenceCount`、`branch`、`commit` 都一致。
5. 如果 JSON 或 Markdown 任一方被后编辑，重新运行完整性检查后才能继续引用该 summary。

评审价值：评审可以引用 Markdown 的可读摘要，但不需要猜测它是否已经落后于 JSON；完整性通过只表示“这份 summary 正确转述了这份 local JSON”，不表示真实 journey 通过。

## 要防的误判

- JSON 仍是 `blocked`，summary 却保留旧的 `passed` 或“已通过”表述。
- 某条 journey 在 JSON 中从 `passed` 改成 `failed`，summary 表格仍显示 `passed`。
- JSON 新增或删除 evidence 后，summary 的 `evidenceCount` 没有更新，评审误以为证据数量完整。
- summary 的 `branch` / `commit` 来自旧分支或旧提交，评审把旧结果引用到当前轮。
- summary 缺失七条 required journey 中的一条，或 journey id 被改名、重复、合并，导致风险态检查被静默跳过。
- 执行者把 example JSON、未 ignored 文件、普通 manual summary 或 map-list blocked summary 当成 viral journey summary 引用。
- readiness、helper 成功、summary 生成成功被写成 DevTools UI passed、real-device passed 或 viral journey passed。

## 范围内

- 只读校验 ignored local viral journey result JSON 与 ignored local Markdown summary 的同源完整性。
- 结果 JSON 必须先符合 viral manual evidence checker 的产品语义；完整性检查不重新定义 passed/failed/blocked 规则。
- 校验 summary 的 Run 信息：`branch` 与 `commit` 必须等于源 JSON。
- 校验 summary 的 Summary 信息：`overallStatus` 必须等于源 JSON 的 `summary.overallStatus`。
- 校验 summary 的 Journeys 表：七条 required journey 必须逐条存在，`id`、`status`、`evidenceCount` 必须与源 JSON 同步。
- 对每条 journey，`evidenceCount` 只比较数量，不要求 Markdown 泄露 raw evidence 内容。
- 输出必须保持脱敏，不打印 raw evidence、raw payload、完整日志、本机绝对路径、token、cookie、账号或 CloudBase 私密信息。

## 非目标

- 不执行 WeChat DevTools UI、真机、系统分享面板、朋友圈、payload inspect 或 CloudBase readback。
- 不声明 DevTools UI passed、real-device passed、viral journey passed、timeline passed 或 CloudBase passed。
- 不把 JSON checker 通过、summary integrity 通过、readiness 通过或 preflight 通过升级为产品 journey 通过。
- 不生成、不修改、不格式化、不覆盖 Markdown summary。
- 不生成、不修改、不覆盖 ignored local JSON。
- 不新增业务 UI、分享策略、归因逻辑、评论/确认流程、风控策略或页面文案。
- 不替代人工复核；尤其是 `passed` journey 仍需要评审查看真实 UI evidence 是否可信、脱敏且完整。

## 同源判定口径

JSON 是唯一事实源。Markdown summary 合格的最低条件：

- 路径语义：JSON 和 Markdown 都位于 `harness/` 下，并且都是 git ignored local 文件；示例文件和可提交文件不能作为评审 summary pair。
- JSON 前置：源 JSON 已通过 `scripts/check-viral-journey-manual-evidence.mjs <result-json>`。
- Run 同步：summary 中 `branch`、`commit` 与 JSON 顶层字段完全一致。
- Overall 同步：summary 中 `overallStatus` 与 JSON `summary.overallStatus` 完全一致。
- Journey 同步：summary 中七条 required journey 均存在且不重复，不能删除、合并、重命名。
- 状态同步：每条 journey 的 summary `status` 与 JSON `journey.status` 完全一致。
- 证据数量同步：每条 journey 的 summary `evidenceCount` 等于从 JSON `journey.evidence` 计算出的数量。
- 保守输出：即使七条 journey 都是 `passed`，完整性检查也只能说 summary 与 JSON 同源；是否可被评审接受为真实 passed evidence，仍由 manual evidence 与人工复核决定。

## 建议 CLI 形态

主命令建议为只读、显式 pair 校验：

```text
node --no-warnings scripts/check-viral-journey-summary-integrity.mjs <result-json> <summary-md>
```

示例：

```text
node --no-warnings scripts/check-viral-journey-summary-integrity.mjs \
  harness/manual-test-results.local-viral-journey.json \
  harness/manual-test-summary.local-viral-journey.md
```

可选 preflight 建议：

```text
node --no-warnings scripts/check-viral-journey-summary-integrity-preflight.mjs
```

preflight 只扫描已存在的 ignored local viral journey summary，并按同一 suffix 查找对应 ignored local result JSON。没有 local summary 时应输出“nothing checked”，并明确这不是 UI passed evidence。发现 summary 存在但缺少匹配 JSON、pair 未 ignored、JSON checker 失败或字段不同步时，应失败。

## Readiness 边界

`scripts/check-devtools-readiness.mjs` 未来可以接入 summary integrity 的 static/local preflight，但职责必须非常窄：

- 只运行静态 guard 或 ignored local file preflight。
- 只读取已存在的 ignored local JSON/summary pair。
- 不运行 summary generator。
- 不创建、不修改、不覆盖 summary。
- 不创建、不修改、不覆盖 manual result JSON。
- 不自动打开、退出、preview、upload、kill、清缓存或修改 WeChat DevTools settings。
- readiness 输出必须继续写明：该检查只验证 local JSON/summary 同源，不证明 DevTools UI、真机或 viral journey passed。

如果当前没有 local summary，readiness 不应制造 summary 来“补齐检查”；应保持 skipped/no-files 语义。

## 状态词示例

底层 viral manual result 仍只使用现有 journey 状态语义：

- `passed`：真实手测已执行，actual/evidence/payload 或限制说明满足 checker 与人工复核要求。
- `failed`：真实手测已执行，产品行为不符合预期，并有 actual 与 followUp。
- `blocked`：真实手测受 DevTools、真机、系统分享、朋友圈、payload、CloudBase、登录态或 fixture 阻塞。

summary integrity 自己的输出状态应避免与 journey passed 混淆，建议使用：

- `integrity_passed`：JSON 与 Markdown summary 在 branch/commit、overallStatus、journey status 和 evidenceCount 上一致。
- `integrity_skipped_no_local_summary`：未发现 ignored local viral journey summary；没有检查任何 pair，也没有 UI passed 结论。
- `integrity_failed_status_mismatch`：JSON 与 summary 的 `overallStatus` 或某条 journey `status` 不一致。
- `integrity_failed_evidence_count_mismatch`：summary `evidenceCount` 与 JSON evidence 数量不一致。
- `integrity_failed_branch_commit_mismatch`：summary 的 `branch` 或 `commit` 与 JSON 不一致。
- `integrity_failed_missing_or_duplicate_journey`：summary 缺少 required journey 或 journey 重复。
- `integrity_failed_unignored_or_wrong_file`：输入不是 ignored local viral journey pair，或误用了 example/其他 summary。
- `integrity_blocked_json_invalid`：源 JSON 未通过 viral manual evidence checker，不能继续信任 summary。

成功示例文案：

```text
integrity_passed: checked ignored local viral journey summary pair.
jsonOverallStatus=blocked summaryOverallStatus=blocked checkedJourneys=7
notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed
```

失败示例文案：

```text
integrity_failed_status_mismatch: summary row receiver-comment-conversion status is passed, JSON status is blocked.
```

```text
integrity_failed_evidence_count_mismatch: summary row timeline-share-channel evidenceCount is 1, JSON evidence count is 0.
```

```text
integrity_failed_branch_commit_mismatch: summary commit does not match source JSON commit.
```

## 评审报告引用口径

允许写：

- “Viral manual summary integrity passed for the ignored local JSON/Markdown pair.”
- “The Markdown summary matches the source JSON on branch/commit, overall status, seven journey statuses, and evidence counts.”
- “This check is a source-integrity guard only; UI evidence still requires manual review.”

禁止写：

- “summary integrity passed, so viral journey passed。”
- “readiness passed, so DevTools UI passed。”
- “summary shows passed, so real-device passed。”
- “blocked/failed 可以因为 summary 生成成功而按 passed 计。”

## 验收标准

- brief 明确用户/评审场景、要防的误判和非目标。
- brief 明确不得声称 DevTools UI、real-device 或 viral journey passed。
- brief 明确本轮只验证 ignored local JSON 与 Markdown summary 同源，不验证真实 UI 通过。
- brief 明确未来 CLI 可采用 `scripts/check-viral-journey-summary-integrity.mjs [result-json] [summary-md]`，并可增加只读 preflight 扫描。
- brief 明确 readiness 只能跑静态或本地 ignored 文件检查，不能生成或修改 summary。
- brief 给出成功/失败状态词示例，且不写实现方案。
