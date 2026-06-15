# K 组手测运行手册与入口 helper 产品简报

日期：2026-06-14

分支：`codex/iter-manual-runbook`

对象：准备开始、执行后收尾、或交接 WeChat DevTools/真机手测的 agent。

## 1. K 组目标

- 把“开始一次真实手测前要准备什么、先跑哪些门禁、手测后怎么收尾”沉淀成稳定运行手册。
- 定义一个轻量 helper 的产品需求，帮助执行者准备本地结果文件、确认当前 worktree、列出前置命令和收尾命令。
- 降低后续 agent 漏跑 H/I/J 相关门禁、误写仓库证据、或把未完成手测说成已通过的风险。
- 让每次手测都有清晰入口：先准备本地结果文件，再执行真实 DevTools/真机旅程，最后用门禁复核并记录结论。

## 2. K 组非目标

- K 组不代表真实 WeChat DevTools 或真机手测已经完成。
- 不新增或修改小程序功能代码。
- 不修改 `.gitignore`，不改变 H/I/J 已有门禁规则。
- 不提交本地结果文件、截图、录屏、日志或其它手测附件。
- 不替代执行者对真实页面、授权、定位、地图、发布、详情、信任动作和云端路径的人工判断。

## 3. 为什么需要运行手册和 helper

H/I/J 已经分别定义了手测前 readiness、手测结果完整性、提交前证据卫生，但实际执行者仍可能在入口处漏步骤。例如没有先从 example 复制本地结果文件、在错误 worktree 打开 DevTools、只跑了 JSON 检查就开始测试，或手测后忘记用证据完整性和卫生门禁复核。

K 组补齐的是执行入口：把准备动作和收尾动作显式列出来，让后续 agent 在开始真实手测前就知道当前候选、当前 worktree、本地结果文件和必跑命令。它不判断旅程是否通过，只降低流程遗漏。

## 4. helper 应做什么

建议 helper 作为一个只做本地准备和提示的命令或脚本，职责保持克制：

- 复制 `harness/manual-test-results.example.json` 到 ignored 的本地结果文件。
- 如果目标本地结果文件已存在，提醒执行者选择复用、备份或换时间戳文件名，不应静默覆盖。
- 明确打印当前应该在 WeChat DevTools 打开的 worktree 路径和当前分支。
- 列出开始手测前必须跑的前置命令。
- 列出真实手测后必须跑的收尾命令。
- 提醒执行者：只有真实 DevTools/真机执行并补齐证据后，旅程状态才可写为 `passed`。
- 提醒执行者：本地结果文件和原始附件默认不提交，提交前只保留脱敏摘要。

helper 的输出应更像 checklist，而不是测试报告。它可以帮助执行者准备环境，但不应替执行者下结论。

## 5. helper 不应做什么

- 不自动把任何旅程标记为 `passed`。
- 不因为自动检查通过而声称真实手测通过。
- 不提交本地结果文件。
- 不修改 `.gitignore`。
- 不收集真实截图、录屏、控制台日志、Network/HAR、云端日志或数据库截图。
- 不上传附件到仓库、云存储、Issue、PR 或外部服务。
- 不读取、脱敏或重写真实敏感附件；证据卫生应由执行者按 J 组规则处理。
- 不把 blocked、not covered 或证据缺失包装成 release-ready。

## 6. 本地结果文件命名建议

默认推荐：

```text
harness/manual-test-results.local.json
```

多轮并行或需要保留历史时，推荐带时间戳：

```text
harness/manual-test-results.20260614-1530.local.json
```

命名原则：

- 文件名必须明确包含 `local`，提示它是本机真实手测结果，不应提交。
- 时间戳使用本地执行时间，方便多轮手测区分。
- 不在文件名里写真实用户、设备、地理位置、CloudBase env id、request id 或其它敏感信息。
- 若后续落地 helper，应优先生成 `manual-test-results.local.json`；发现已存在时建议切换到带时间戳文件。

## 7. 推荐前置命令

开始真实 DevTools/真机手测前，helper 应展示以下命令，并提示所有失败都需要先处理或记录为阻塞：

```bash
pwd
git branch --show-current
git status --short
bash harness/init.sh
node --check pages/publish/publish.js
node --check pages/publish/publish-state.js
node --check pages/detail/detail.js
node --check utils/format.js
node --no-warnings scripts/check-publish-flow.mjs
node harness/check-trust-insight.mjs
node scripts/check-json.mjs
node harness/check-harness.mjs
git diff --check
```

如本机 WeChat DevTools `wcc`/`wcsc` 或 CLI 可用，执行者可以补充编译或预览检查；不可用时应记录为“编译未验证”或“CLI 阻塞”，不得写成通过。

## 8. 推荐手测后命令

完成真实 DevTools/真机手测并填写本地结果文件后，helper 应展示以下收尾命令：

```bash
node scripts/check-manual-evidence.mjs harness/manual-test-results.local.json
node scripts/check-json.mjs
node harness/check-harness.mjs
git diff --check
git status --short --ignored
```

如果使用带时间戳结果文件，应把第一条命令里的路径替换为实际本地文件名。若 evidence hygiene gate 已落地为独立命令，也应在这里列出，并要求提交前确认本地结果文件和原始附件仍处于 ignored 或未跟踪且不提交状态。

## 9. 与 H/I/J 的关系

- H 组是开始前 readiness：回答“候选是否具备进入 DevTools/真机手测的前置条件”。
- I 组是结果完整性：回答“手测后每条旅程的状态、环境、步骤、期望、实际和附件是否足以支撑结论”。
- J 组是提交卫生：回答“哪些证据可以摘要化进入仓库，哪些本地结果和原始附件不能提交”。
- K 组是执行入口和运行手册：回答“执行者从哪里开始、准备哪个本地结果文件、先跑什么、测后再跑什么”。

四组应串联使用：K 引导入口，H 判断是否可以开始，真实 DevTools/真机手测产生本地结果，I 校验结果完整性，J 约束提交卫生。K 不能替代 H/I/J，也不能把任何未手测状态升级为通过。

## 10. 成功标准

- 后续 agent 能按手册在正确 worktree 打开 WeChat DevTools 或真机项目。
- 本地结果文件从 example 复制而来，结构一致，且文件名明确为 local。
- 开始手测前的自动检查和 readiness 命令被逐项执行或明确记录为阻塞。
- 手测后执行者能用本地结果文件跑结果完整性检查，并区分 passed、failed、blocked、not_covered。
- 提交前不会把本地结果文件、真实截图、录屏、完整日志或敏感云端附件加入仓库。
- 文档读者不会误以为 K 组已经完成了真实手测。

## 11. 风险

- 如果 helper 输出过于像测试报告，后续 agent 可能误把“已准备”理解成“已通过”。
- 如果本地结果文件没有被忽略，真实手测证据可能被误提交；K 组只能提出需求，不能在本任务中修改 `.gitignore`。
- 如果执行者在错误 worktree 打开 DevTools，手测结果会和当前分支不匹配。
- 如果只跑自动命令不做真实 DevTools/真机旅程，发布、定位、地图、授权、键盘、安全区、云端和附件路径仍然未验证。
- 如果原始截图或日志被当作完整性证据直接提交，会违反 J 组证据卫生边界。

## 12. K 组核心结论

K 组定义的是手测执行入口和运行手册，不是手测结果。helper 应帮助执行者复制本地结果模板、确认 worktree、列出开始前和收尾后的门禁命令，并反复提醒本地结果和原始附件不应提交。只有真实 DevTools/真机执行完成，并通过 I 组完整性和 J 组卫生复核后，相关旅程才可能被记录为 `passed`。
