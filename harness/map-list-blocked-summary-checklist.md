# 地图列表 blocked 摘要 Wrapper 设计 / QA 检查清单

范围：用于后续 wrapper 把 U 组生成的 `harness/manual-test-results.local*.json` blocked 草稿，与 L 组 `scripts/create-manual-summary.mjs` 生成的脱敏 `harness/manual-test-summary.local*.md` 串起来。本文只定义设计与 QA 复核口径，不代表 WeChat DevTools 或真机地图列表视觉 smoke 已经执行。

工作目录：`/tmp/street-tasks-iter-worktrees/map-list-blocked-summary`

重要边界：

- [ ] 只处理 ignored 的本地结果和本地摘要：`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md`。
- [ ] 不修改 `harness/manual-test-results.example.json`，不提交 local JSON/local MD，不提交原始截图、录屏、日志或云端证据。
- [ ] wrapper 成功只说明 blocked 草稿可被脱敏摘要化；不能把地图列表视觉 smoke 解释为 `passed`。
- [ ] 如果 DevTools UI 或真机没有真实执行，最终口径必须保持 `blocked` 或未验证，不得用自动脚本通过替代用户可见验收。

## 1. 推荐命令链路

- [ ] 先生成 ignored blocked local JSON。

  ```bash
  node scripts/prepare-map-list-blocked-evidence.mjs \
    --reason "DevTools service port blocked; map-list visual smoke was not executed." \
    --out harness/manual-test-results.local-map-list-blocked.json \
    --force
  ```

  期望：脚本运行 `check-manual-evidence` 和 `check-evidence-hygiene`；输出说明 blocked evidence 不是 UI passed 或 failed evidence。

- [ ] 再从同一个 local JSON 生成 ignored local summary。

  ```bash
  node scripts/create-manual-summary.mjs \
    --input harness/manual-test-results.local-map-list-blocked.json \
    --out harness/manual-test-summary.local-map-list-blocked.md
  ```

  期望：摘要生成成功，输出路径匹配 `harness/manual-test-summary.local*.md`，文件仍为 ignored。

- [ ] wrapper 应把两步串成一个安全路径，但仍保留这两个脚本的原有门禁：local JSON 路径门禁、local summary 路径门禁、manual evidence 校验、evidence hygiene 校验、summary 写入前敏感内容扫描。

## 2. 状态不变量

生成摘要前后都必须复核以下不变量。

- [ ] `summary.overallStatus` 必须保持 `blocked`。
- [ ] `journeys[].id === "map-list-visual-smoke"` 的 journey 必须存在且只存在一条。
- [ ] `map-list-visual-smoke.status` 必须保持 `blocked`。
- [ ] 全部 journey 中 `status === "passed"` 的数量必须为 `0`。
- [ ] `map-list-visual-smoke.evidence` 的证据数量必须为 `0`。
- [ ] 摘要表格中 `overallStatus` 显示为 `blocked`，`map-list-visual-smoke` 行的 `status` 显示为 `blocked`，该行 `evidenceCount` 显示为 `0`。

建议用一次性 Node 断言复核 JSON：

```bash
node -e "const fs=require('fs');const r=JSON.parse(fs.readFileSync('harness/manual-test-results.local-map-list-blocked.json','utf8'));const targets=(r.journeys||[]).filter(j=>j&&j.id==='map-list-visual-smoke');const passed=(r.journeys||[]).filter(j=>j&&j.status==='passed').length;const ev=Array.isArray(targets[0]?.evidence)?targets[0].evidence.length:(targets[0]?.evidence?1:0);if(r.summary?.overallStatus!=='blocked'||targets.length!==1||targets[0].status!=='blocked'||passed!==0||ev!==0){process.exit(1)}"
```

建议用文本检查复核 summary：

```bash
rg -n "overallStatus|map-list-visual-smoke|evidenceCount|\\| 0 \\|" harness/manual-test-summary.local-map-list-blocked.md
```

## 3. 摘要脱敏要求

summary 只能承载可读、脱敏、最小必要的信息。

- [ ] 可以写：分支名、短 commit、测试时间摘要、执行者占位、环境类别、journey 状态、actual 的 blocked 结论、风险摘要、follow-up、证据数量。
- [ ] 只能写证据数量，例如 `evidenceCount=0`；不要把 raw evidence 字符串、截图文件名或截图原路径复制进 summary。
- [ ] 不得出现本机绝对路径，包括 `/Users/...`、`/private/tmp/...`、DevTools 缓存路径、截图原始保存路径。
- [ ] 不得出现具体 `cloud://` 资源、CloudBase env id、Storage fileID、数据库真实记录 id、request id 或 trace id。
- [ ] 不得出现 token、cookie、Authorization/Bearer、access token、refresh token、password、private key、AppSecret。
- [ ] 不得出现手机号、真实微信号、openid、unionid、真实账号、真实昵称、头像 URL、聊天记录或真实地址。
- [ ] 如果需要引用附件，只能写角色化编号或数量，例如“本地无可提交证据，evidenceCount=0”，不能写截图原路径。

`scripts/create-manual-summary.mjs` 已在写入前扫描部分敏感模式；wrapper QA 仍要补充人工复核，避免未覆盖的真实账号、截图路径或云端标识进入摘要。

## 4. 负向样例

以下负向样例应在临时 local 文件上执行，执行后清理，不提交。

- [ ] 非 ignored JSON 输出路径应失败。

  ```bash
  node scripts/prepare-map-list-blocked-evidence.mjs \
    --reason "negative path check" \
    --out harness/manual-test-results.blocked.json \
    --force
  ```

  期望：失败，错误说明输出必须匹配 `harness/manual-test-results.local*.json`。

- [ ] 非 ignored summary 输出路径应失败。

  ```bash
  node scripts/create-manual-summary.mjs \
    --input harness/manual-test-results.local-map-list-blocked.json \
    --out harness/manual-test-summary.md
  ```

  期望：失败，错误说明输出必须匹配 `harness/manual-test-summary.local*.md`。

- [ ] 敏感内容应被 create summary 拦截。

  做法：复制一份 ignored local JSON，在 `actual`、`followUp` 或 `environment.notes` 中临时写入 `/Users/example/secret.png`、`cloud://example-env/path`、`Bearer example-token-123456` 或测试手机号样式内容，再运行 summary 生成。

  期望：`scripts/create-manual-summary.mjs` 在写入前失败，报告 prohibited sensitive content；不得产生 local summary。

- [ ] 不能把 blocked 改成 passed。

  做法：复制一份 ignored local JSON，把 `summary.overallStatus` 或 `map-list-visual-smoke.status` 临时改成 `passed`，再运行 wrapper 或第 2 节状态不变量断言。

  期望：wrapper 或断言失败；不得生成可被误读为通过的 summary。即使静态 readiness、manual evidence gate 或 summary 生成脚本通过，也不能把未执行的 DevTools/真机视觉 smoke 写成 `passed`。

## 5. 清理与 Git 卫生

- [ ] 负向样例和正向演练结束后清理 local JSON/local MD。

  ```bash
  rm -f harness/manual-test-results.local-map-list-blocked.json
  rm -f harness/manual-test-summary.local-map-list-blocked.md
  ```

- [ ] 如果使用了其他临时 local 文件，也一并清理，例如 `harness/manual-test-results.local-*.json`、`harness/manual-test-summary.local-*.md`。
- [ ] 确认本轮可提交改动只包含预期 checklist 或 wrapper 代码；local evidence 不得出现在待提交列表中。

  ```bash
  git status --short --ignored
  ```

  期望：`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md` 不出现在 staged 或 unstaged 待提交项；如果仍存在，只能显示为 ignored，且提交前应清理。

## 6. 最终报告口径

- [ ] 报告必须区分：blocked local JSON 已生成、脱敏 local summary 已生成、状态不变量已验证、证据卫生已验证、DevTools/真机视觉 smoke 未执行。
- [ ] 明确写出：summary 只是便于人阅读的脱敏材料，不是 DevTools/真机 UI passed 证据。
- [ ] 如果仍是环境 blocked，报告应说明地图列表长标题、长正文、图片/无图、安全区、原生 map 层、滚动、marker/list/detail 链路仍未被真实观察。
- [ ] 不使用“通过验收”“视觉通过”“发布可准入”等表述，除非已有 DevTools UI 或真机真实执行证据，且 local JSON 中对应 journey 合规记录为 `passed`。
