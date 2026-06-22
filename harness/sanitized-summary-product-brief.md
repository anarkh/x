# L 组手测结果脱敏摘要产品简报

日期：2026-06-14

分支：`codex/iter-sanitized-summary`

对象：已经产生本地手测结果 JSON，并需要给评测或评审提供可读摘要的 agent。

## 1. 问题

K 组 helper 会生成被 `.gitignore` 忽略的 `harness/manual-test-results.local*.json`，I 组和 J 组分别要求手测证据完整、提交前证据卫生。但评测或评审仍需要一份可读的摘要，快速判断测了哪些旅程、结论是什么、还有哪些风险。

直接提交本地手测 JSON 或原始附件不安全：里面可能带有截图原始路径、CloudBase fileID、request id、token、手机号、真实本机路径、精确位置或设备痕迹。L 组要补的是从本地 JSON 生成“脱敏摘要草稿”的产品口径，让可提交内容保留结论，不带入敏感原始材料。

## 2. 用户/评审价值

- 评审者能不打开本地附件，也能看懂每条手测旅程的状态、结果和发布影响。
- 后续 agent 能基于摘要继续补测，而不是重新解读完整本地证据包。
- 提交内容更安全，只保留脱敏后的产品事实、覆盖范围和剩余风险。
- blocked、not_covered、failed 和 passed 的边界更清楚，减少“自动检查通过”被误读成“真实手测通过”。

## 3. 范围内

- 从 ignored 的 `harness/manual-test-results.local*.json` 读取手测结果，生成一份 ignored 的 `harness/manual-test-summary.local*.md` 脱敏摘要草稿，供评测/评审阅读。
- 生成命令示例：`node scripts/create-manual-summary.mjs --input harness/manual-test-results.local.json --out harness/manual-test-summary.local.md`。
- 摘要应保留：候选分支、提交标识的脱敏展示、测试环境类别、旅程状态、关键步骤摘要、期望/实际差异、发布影响、未覆盖范围、下一步动作。
- 摘要应把附件写成类型和观察结论，例如“截图本地留存，显示发布后进入详情页”，不输出原文件名、绝对路径或可反查云资源的标识。
- 摘要应使用稳定但不可反查的占位符关联同一轮数据，例如 `post_redacted_001`、`request_redacted_a`。
- 摘要应和现有 `scripts/check-manual-evidence.mjs`、`scripts/check-evidence-hygiene.mjs` 串联：先确认本地结果结构，再检查生成内容没有敏感字段。

## 4. 非目标

- L 组不代表真实 WeChat DevTools 或真机手测已经完成。
- 不替代 K 组手测入口 helper、I 组证据完整性检查或 J 组证据卫生规则。
- 不读取、提交、上传或改写原始截图、录屏、完整日志、HAR、数据库截图或 Storage 权限截图。
- 不把 example JSON、mock 数据、自动脚本输出或人工占位内容包装成真实 evidence。
- 不新增小程序功能，不改变手测旅程判定标准；只允许为本地摘要草稿补充忽略规则，不改变原始手测 JSON 的忽略策略。

## 5. 成功标准

- 生成的摘要能让评审者判断：哪些旅程 `passed`、`failed`、`blocked`、`not_covered`，以及每项对发布候选的影响。
- 摘要不包含真实截图路径、CloudBase fileID、request id、trace id、token、手机号、openid、精确经纬度、真实本机绝对路径、完整设备唯一标识或认证信息。
- 对每个 `passed` 项，摘要说明本地 evidence 类型和脱敏观察结论，但不泄露原始附件。
- 对每个 `failed`、`blocked`、`not_covered` 项，摘要说明原因、影响和下一步补测条件。
- 如果输入是 example、空结果、结构缺失或仅有自动检查，摘要必须明确标为非真实手测证据或证据不足，不能生成“已通过”的口吻。
- 生成后的摘要能通过脚本内置敏感扫描；若要把摘要结论写入可提交报告，必须先人工复核，且提交时不附带本地 JSON、local Markdown 草稿或原始附件。

## 6. 必须明确的边界

- 自动检查通过只说明基础脚本或结构校验通过，不说明 WeChat DevTools 或真机旅程通过。
- `harness/manual-test-results.example.json` 只能作为模板，不是真实手测 evidence。
- `manual-test-results.local*.json` 是本地原始结果，默认不提交；摘要只能引用脱敏后的产品结论。
- 原始截图、录屏、控制台日志、云端日志和数据库截图可以作为本地留存证据，但摘要不得暴露它们的原始路径、文件名或可反查 id。
- CloudBase 未部署、DevTools CLI 超时、定位授权未测、图片上传未测、真机未测等情况必须写为 `blocked` 或 `not_covered`，不能因为生成了摘要而升级为 `passed`。
- 如果某条结论来自人工占位、样例数据或非真实运行，应在摘要中显式标注“非真实 evidence”，并从发布准入判断中排除。

## 7. L 组核心结论

L 组定义的是手测结果的脱敏摘要生成口径，不是新的手测结论。工具应帮助 agent 把本地 JSON 中的真实执行结果转成可评审的 local Markdown 草稿，同时拦截明显敏感原始材料。只有真实 DevTools 或真机旅程执行完成，并通过 I 组完整性与 J 组卫生复核后，摘要中的 `passed` 才能支撑发布判断。
