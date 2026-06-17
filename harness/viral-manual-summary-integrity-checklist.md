# Viral manual journey summary integrity guard QA 清单

日期：2026-06-17

范围：用于后续开发新增静态 guard，检查 viral manual journey ignored local JSON 与 Markdown summary 是否同源、完整、脱敏。guard 通过只代表本地结果 JSON 和本地 summary 在字段与敏感内容边界上保持一致，不代表 WeChat DevTools UI journey、真机 journey 或 viral journey 已经 passed。

工作目录：`/tmp/street-tasks-iter-worktrees/viral-manual-summary-integrity`

重要边界：

- [ ] 只读取 ignored local pair：`harness/manual-test-results.local-viral-journey*.json` 与对应的 `harness/manual-test-summary.local*.md`。
- [ ] pair 的 JSON 和 Markdown 都必须通过 `git check-ignore`；未 ignored 的 local result 或 summary 不得被 readiness 扫描成证据。
- [ ] 不修改或引用 `harness/viral-journey-manual-results.example.json` 作为真实 evidence。
- [ ] 不生成、不提交、不移动截图、录屏、payload、raw log、CloudBase 记录或 ignored local evidence。
- [ ] summary integrity guard 只防止摘要被手工改坏、拼接或泄露敏感内容；真实 UI 仍需 DevTools 或真机人工验证。

## 1. JSON 是唯一结论源

- [ ] guard 必须先对 result JSON 运行 viral 专用检查：

  ```bash
  node --no-warnings scripts/check-viral-journey-manual-evidence.mjs <ignored-local-result.json>
  ```

- [ ] 如果该命令失败，summary guard 必须失败；不能从 Markdown summary 反推或补造 `passed` 结论。
- [ ] `status=passed` 的 journey 必须已经由 `scripts/check-viral-journey-manual-evidence.mjs` 校验过 required evidence、actual、payload 或无法检查说明。
- [ ] summary guard 不能把 `check-devtools-readiness.mjs`、blocked draft、summary 生成成功、branch/commit 匹配或 evidenceCount 非零写成 UI passed。
- [ ] 如果 JSON 中没有 passed journey，summary 中不得出现任何 passed 语义；如果 JSON 中有 passed journey，summary 只能复述 JSON 已验证过的状态，不能新增 passed 范围。

## 2. 必须校验的同源字段

guard 必须从同一份 ignored local result JSON 和同一份 Markdown summary 中提取并比对以下字段。字段缺失、重复、值不同或无法解析都应失败。

顶层字段：

- [ ] `branch`：summary `Run` 表的 `branch` 必须等于 JSON 顶层 `branch`。
- [ ] `commit`：summary `Run` 表的 `commit` 必须等于 JSON 顶层 `commit`。
- [ ] `overallStatus`：summary `Summary` 表的 `overallStatus` 必须等于 JSON `summary.overallStatus`。

七条 journey 必须且只能各出现一次：

| id | title |
| --- | --- |
| `first-hop-share-entry` | `首跳从分享进入低风险 active 任务` |
| `receiver-confirm-conversion` | `接收者确认后的二跳提示` |
| `receiver-comment-conversion` | `接收者评论后的二跳提示` |
| `second-hop-receiver-source` | `二跳接收者看到接力语境` |
| `ordinary-and-risk-entries` | `普通入口和风险态不鼓励接收侧扩散` |
| `timeline-share-channel` | `低风险 active 详情页朋友圈系统渠道` |
| `timeline-risk-gating` | `风险和闭合任务不开放鼓励性朋友圈` |

每条 journey 行必须校验：

- [ ] `id`：summary 行必须存在，且和 JSON `journey.id` 一致。
- [ ] `title`：summary 行标题必须和 JSON `journey.title` 一致，不能用旧标题、缩写或其他 journey 的标题。
- [ ] `status`：summary 行状态必须和 JSON `journey.status` 一致。
- [ ] `actual`：summary 行 `actual` 必须来自 JSON `journey.actual`；至少要能拦截被替换为 `unrelated text`、空值或其他 journey actual。
- [ ] `evidenceCount`：summary 只能显示 evidence 数量，且必须等于 JSON `journey.evidence` 计算出的数量。
- [ ] `blocker`：summary 行 blocker 必须来自 JSON `journey.blocker`；若 JSON 没有 `blocker`，则必须来自 `journey.risks` 的脱敏摘要。
- [ ] `followUp`：summary 行 `followUp` 必须来自 JSON `journey.followUp`，不能清空或替换成与 JSON 无关的建议。

## 3. Evidence 最小化和敏感内容边界

summary 只能承载 evidence 数量，例如 `evidenceCount=0`、`evidenceCount=2`。不得透传 raw evidence 内容。

必须禁止出现在 summary 中：

- [ ] `evidence[].path`、`evidence[].url`、`evidence[].value`、`evidence[].details` 的原始内容。
- [ ] raw screenshot / recording / payload / log 路径、文件名、URL、完整 stdout/stderr、完整 JSON dump。
- [ ] `cloud://`、CloudBase fileID、真实云环境 id、私有 AppID。
- [ ] `/Users/`、`/private/tmp/` 下的真实用户路径、DevTools user-data 路径、机器名。
- [ ] token、cookie、session、authorization、bearer、password、private key、access_token、refresh_token、二维码或预览链接凭证。
- [ ] 手机号、微信号、邮箱、openid、unionid、真实昵称、头像 URL、精确地址、精确经纬度、评论正文全文。

敏感扫描建议：

- [ ] 对整个 Markdown summary 做写入前和 guard 复核扫描；命中敏感模式时失败，并报告行号和类别。
- [ ] 对 Markdown 表格中的 `actual`、`blocker`、`followUp` 同样执行敏感扫描；这些字段虽来自 JSON，也不能绕过脱敏边界。
- [ ] 错误信息只描述敏感类别和行号，不回显敏感原文。

## 4. 正向 guard 期望

- [ ] 生成 blocked draft 时，`scripts/prepare-viral-journey-manual-evidence.mjs` 只创建 ignored local JSON，且所有 journey 初始为 `blocked`、evidence 为空。
- [ ] 从 viral JSON 生成 summary 时，`scripts/create-manual-summary.mjs` 或后续 wrapper 必须保留 `branch`、`commit`、`overallStatus` 和七条 journey 的同源字段。
- [ ] 对同一 pair 运行 future summary integrity guard，例如：

  ```bash
  node scripts/check-viral-manual-summary-integrity.mjs \
    --results harness/manual-test-results.local-viral-journey.json \
    --summary harness/manual-test-summary.local-viral-journey.md
  ```

- [ ] 命令成功时只能输出类似 `Viral manual summary integrity checks passed.`。
- [ ] 成功输出必须继续声明：该检查只验证 ignored local JSON/summary 同源完整性，不是 DevTools UI passed evidence，也不是真机 passed evidence。

## 5. 负向样例

以下样例都必须失败；每个样例只在 ignored local 临时文件上执行，结束后清理。

- [ ] summary 缺少任一 required journey，例如删掉 `timeline-risk-gating` 行：应失败，错误点名 missing journey id。
- [ ] summary 多出重复 journey，例如复制一行 `receiver-confirm-conversion`：应失败，错误点名 duplicate journey id。
- [ ] summary journey `status` 与 JSON 不同，例如 JSON 为 `blocked`、summary 改成 `passed`：应失败。
- [ ] summary `evidenceCount` 与 JSON evidence 数量不同，例如 JSON evidence 数组长度为 `0`、summary 改成 `1`：应失败。
- [ ] summary `branch` 与 JSON 顶层 `branch` 不同：应失败。
- [ ] summary `commit` 与 JSON 顶层 `commit` 不同：应失败。
- [ ] summary `overallStatus` 与 JSON `summary.overallStatus` 不同：应失败。
- [ ] summary `actual`、`blocker` 或 `followUp` 被清空、替换为 `unrelated text` 或串到另一条 journey：应失败。
- [ ] summary 包含 raw evidence 路径、URL、value 或 details，例如 `/Users/.../screenshot.png`、`cloud://...`、payload 完整 path：应失败。
- [ ] summary 包含 token、cookie、Authorization、手机号或真实账号标识：应失败。
- [ ] summary 出现 `passed by AE`、`AE passed`、`summary passed`、`readiness passed so UI passed`、`manual journey passed by checklist` 等误导措辞：应失败。
- [ ] JSON 没有先通过 `scripts/check-viral-journey-manual-evidence.mjs`，但 summary 写成 `passed`：应失败。

## 6. Readiness 接入要求

`scripts/check-devtools-readiness.mjs` 只应调用 summary integrity preflight 或等价只读入口，不应生成 JSON、生成 summary、运行 DevTools、打开 UI、修改 Service Port 或写 evidence。

readiness 扫描规则：

- [ ] 只扫描 `harness/` 下 ignored local viral summary/result pair；没有 matching pair 时不扫描单独 JSON 或单独 summary。
- [ ] 如果发现 local summary 但没有 matching ignored local result，应失败并点名缺失 pair，而不是跳过后报告成功。
- [ ] 如果发现 local result 但没有 matching summary，可以输出没有 summary pair 可检查；不得把 result 单独当作 summary integrity passed。
- [ ] 如果没有任何 matching ignored local summary/result pair，输出必须包含 `nothing checked` 或等价文案。
- [ ] 无 pair 输出还必须包含 `not UI passed evidence` 或等价文案，明确这不是 DevTools UI passed、真机 passed 或 viral journey passed。
- [ ] 有 pair 时逐对运行 summary integrity guard；任一 pair 失败则 readiness 失败，不能被其他 pair 的通过掩盖。
- [ ] readiness 最终成功文案只能说静态 gate / local pair integrity 通过，不能写 `viral manual journey passed`。

## 7. 收尾验证

本 QA checklist 落地后至少运行：

```bash
bash harness/init.sh
node scripts/check-json.mjs
node harness/check-harness.mjs
git diff --check
```

如果后续实现了 summary integrity guard 或 preflight，还应追加：

```bash
node --check scripts/check-viral-manual-summary-integrity.mjs
node --no-warnings scripts/check-viral-journey-manual-evidence.mjs
node --no-warnings scripts/check-devtools-readiness.mjs
```

期望：

- [ ] 可提交改动不包含 `harness/manual-test-results.local*.json` 或 `harness/manual-test-summary.local*.md`。
- [ ] 没有新增截图、录屏、payload、raw log 或 CloudBase evidence。
- [ ] 最终报告只说明 checklist 或 guard 准备情况；不声明任何 viral journey、DevTools UI 或真机路径 passed。
