# 手测执行 Runbook 清单

本清单给实际手测执行者使用，覆盖准备、执行、收尾和常见修复。它是操作清单，不代表已经完成 WeChat DevTools 或真机手测；只有执行者按本清单完成并写入本地结果文件后，才能在报告中引用对应结论。

## 0. 执行原则

- [ ] 只把脱敏摘要写入可提交文件；原始截图、录屏、日志、云端标识和本地路径只保存在 ignored 目录或提交外部位置。
- [ ] `passed` 只能用于真实跑过且证据足够的 journey；未执行写 `not_covered`，环境阻断写 `blocked`，发现问题写 `failed`。
- [ ] 不把真实账号、真实地点、精确经纬度、完整云端 file id、request id、环境 id、token、cookie、绝对本地路径写进可提交文件。
- [ ] 不修改 `harness/manual-test-results.example.json` 作为真实结果；真实结果写入 local 文件。

## 1. 准备阶段

- [ ] 确认当前仓库和分支。

  ```bash
  pwd
  git branch --show-current
  git rev-parse --short HEAD
  git status --short
  ```

  期望：分支为 `codex/iter-manual-runbook` 或本轮指定的被测分支；记录短 commit；工作区没有会混入手测报告的意外改动。

- [ ] 跑 readiness 门禁，确认进入手测前的候选状态。

  ```bash
  node --no-warnings scripts/check-devtools-readiness.mjs
  ```

  期望：readiness 检查通过。若失败，先记录 blocker，不继续把 UI journey 标为通过。

- [ ] 跑 manual evidence 示例检查，确认结果模板和证据规则可用。

  ```bash
  node scripts/check-manual-evidence.mjs
  ```

  期望：示例 JSON 通过校验；注意这只证明示例结构有效，不是手测通过证据。

- [ ] 跑 evidence hygiene 门禁，确认本地证据边界仍正确。

  ```bash
  node scripts/check-evidence-hygiene.mjs
  ```

  期望：hygiene 检查通过；若失败，先修复可提交证据边界。

- [ ] 生成本地手测结果文件。

  ```bash
  cp harness/manual-test-results.example.json harness/manual-test-results.local.json
  ```

  然后把 `branch`、`commit`、`testedAt`、`tester`、`environment` 和每个 journey 的状态改成真实执行记录。local 文件应保持 ignored，不提交。

- [ ] 准备本地原始附件目录。

  ```bash
  mkdir -p harness/manual-evidence-artifacts
  git status --short --ignored
  ```

  期望：`harness/manual-test-results.local.json` 和 `harness/manual-evidence-artifacts/` 显示为 ignored 或未提交状态；原始附件只放这里或提交外部安全位置。

- [ ] 打开 WeChat DevTools。
  - 打开当前 worktree 的小程序项目。
  - 记录 DevTools 版本、基础库版本、模拟器或真机型号、网络档位、定位权限初始状态、CloudBase 和本地 storage 状态。
  - 如需真机，确认预览或真机调试路径可用；若 DevTools 服务端口或预览失败，写入 `blocked`，不要写 `passed`。

## 2. 执行阶段

- [ ] 按核心旅程逐项手测，并同步填写 `harness/manual-test-results.local.json`。
  - `map-to-detail`：地图页渲染、marker 或列表进入正确详情、返回后仍可操作。
  - `publish-readiness-location-retry`：发布准备度、定位拒绝或失败、重试、允许后的主动作变化。
  - `publish-success-to-detail`：填齐表单、发布只创建一次、成功跳转新任务详情、返回地图可见。
  - `detail-trust-insight-comments`：详情 TrustInsight、确认或 stale/report、重复操作限制、评论入口和重进详情。
  - `image-cloud-paths`：图片上传、失败提示、保存引用形态、清缓存或跨用户可见性。

- [ ] 每个 journey 都写清楚真实观察。
  - `steps` 保留或补充实际步骤。
  - `expected` 保留验收标准。
  - `actual` 写观察到的行为，不写“正常”这类无法复核的结论。
  - `evidence` 写脱敏后的证据索引，例如“截图 S1，本地附件目录保存，显示发布按钮未被遮挡”。
  - `risks` 写仍未覆盖或环境差异。
  - `followUp` 写失败、阻断或未覆盖项的下一步。

- [ ] 保存原始附件到 ignored 目录。
  - 截图、录屏、控制台日志、Network 详情、云函数日志、数据库截图等原件放入 `harness/manual-evidence-artifacts/` 或提交外部安全位置。
  - 文件名用编号和旅程名，例如 `S1-map-to-detail.png`、`V1-location-retry.mov`。
  - 可提交报告里只写附件编号和脱敏摘要，不写真实绝对路径。

- [ ] 控制敏感信息。
  - 真实用户只写“用户 A”“游客态”“管理员账号”等角色化称呼。
  - 真实地点只写“测试 POI”“默认中心附近”“约 200m 距离”等模糊描述。
  - 云端 file id、request id、环境 id 只写“已生成云端文件引用，原值本地留存”这类摘要。
  - 本地路径只写仓库相对目录或“本地附件目录”。
  - 日志只摘录错误类型、状态码、页面路由和脱敏 message。

## 3. 收尾阶段

- [ ] 校验本地手测结果文件。

  ```bash
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local.json
  ```

  期望：通过。若失败，根据报错补齐环境、步骤、actual、evidence、risks 或 followUp；不要为了过校验把未测 journey 写成 `passed`。

- [ ] 校验证据卫生。

  ```bash
  node scripts/check-evidence-hygiene.mjs
  ```

  期望：通过。若失败，先处理敏感内容或 ignored 边界，再继续。

- [ ] 查看工作区和 ignored 文件。

  ```bash
  git status --short --ignored
  ```

  期望：可提交文件只包含预期报告或清单；local 结果、原始附件、私有配置和日志不应进入待提交列表。

- [ ] 执行 secret scan。

  ```bash
  rg --no-ignore -n -i "(api[_-]?key|secret|token|password|passwd|pwd|private[_-]?key|session|cookie|authorization|bearer|access[_-]?token|refresh[_-]?token|client[_-]?secret|appsecret|wx[0-9a-f]{16,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})" .
  ```

  期望：没有新增真实敏感值。若命中的是文档中的规则说明，仍要人工确认不是实际凭据。

- [ ] 判断是否能把脱敏摘要带入报告。
  - 可以带入：分支、commit、执行时间、DevTools 版本、基础库版本、设备类别、网络档位、定位权限状态、journey 状态、脱敏 actual、脱敏 evidence 编号、风险和 follow-up。
  - 不可带入：原始截图或录屏、完整日志、真实用户信息、真实地点、精确经纬度、完整云端资源标识、真实本机路径、token、cookie、私有 AppID 或密钥。
  - 如果不能判断是否敏感，按敏感处理，只写“原件本地留存，提交摘要待 reviewer 判断”。

## 4. 常见失败和修复

### 4.1 local 文件误被跟踪

- 现象：`git status --short` 中出现 `harness/manual-test-results.local.json` 或原始附件。
- 修复：
  - 先停止暂存或提交。
  - 确认文件名是否匹配 ignored 规则：`harness/manual-test-results.local*.json` 或 `harness/manual-evidence-artifacts/`。
  - 如果已经暂存，取消暂存对应文件，再重新运行 `git status --short --ignored`。
  - 不修改 `.gitignore`，除非本轮任务明确要求；本 runbook 执行不需要改 ignore 规则。

### 4.2 example 被误改

- 现象：`git diff -- harness/manual-test-results.example.json` 出现真实手测内容，或 example journey 被改成 `passed`。
- 修复：
  - 把真实内容移到 `harness/manual-test-results.local.json`。
  - example 文件只保留示例占位和非通过状态。
  - 重新运行 `node scripts/check-manual-evidence.mjs` 和 `node scripts/check-evidence-hygiene.mjs`。

### 4.3 journey 写 passed 但证据不足

- 现象：`node scripts/check-manual-evidence.mjs <local-results>` 报 passed journey 缺 evidence、actual、steps 或具体环境信息。
- 修复：
  - 若真实执行过，补充具体 DevTools 或设备信息、实际结果和脱敏证据索引。
  - 若没有真实执行，改为 `not_covered`。
  - 若被环境阻断，改为 `blocked`，并写清 blocker、risks 和 followUp。
  - 若发现行为错误，改为 `failed`，写复现步骤、实际结果和下一步。

### 4.4 hygiene 发现云端 file id 或本地路径

- 现象：`node scripts/check-evidence-hygiene.mjs` 或 secret scan 命中具体云端资源标识、本地绝对路径、账号或日志原文。
- 修复：
  - 把原始值移到 ignored 附件或提交外部安全位置。
  - 可提交内容改成脱敏摘要，例如“云端图片引用已生成，原值本地留存”“截图 S2 本地留存”。
  - 对需要稳定追踪的对象使用别名，例如“测试任务 A”“图片文件 1”“用户 A”。
  - 重新跑 manual evidence、hygiene、`git status --short --ignored` 和 secret scan，确认没有二次泄漏。

## 5. 最终交接口径

- [ ] 明确说明哪些 journey 已真实执行，哪些未覆盖或被阻断。
- [ ] 报告只引用 `harness/manual-test-results.local.json` 中的脱敏摘要，不引用原始附件内容。
- [ ] 若要把摘要写入可提交报告，先完成收尾阶段全部命令，并由 reviewer 按 `harness/evidence-redaction-checklist.md` 再审一遍。
- [ ] 不声称“已完成真实手测”或“可发布”，除非本轮执行记录、证据和 reviewer 结论都支持这个说法。
