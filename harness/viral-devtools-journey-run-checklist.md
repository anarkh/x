# 传播链 DevTools 真实手测启动 QA Checklist

日期：2026-06-16

范围：用于 P 组在 `codex/iter-viral-devtools-journey-launch` 分支验收“传播链真实手测 DevTools 启动诊断包”，并在 W 组扩展为七条 required journey 后继续作为 readiness 文档。本清单帮助测试者在进入真实 WeChat DevTools 或真机前，先读懂诊断输出、证据草稿和七条传播 journey，避免把 readiness、dry-run、blocked draft 或端口诊断误写成 UI passed。

## 0. 运行前检查

- [ ] 确认工作区和分支。

  ```bash
  pwd
  git branch --show-current
  git rev-parse --short HEAD
  git status --short --ignored
  ```

  期望：工作区是 `/tmp/street-tasks-iter-worktrees/viral-devtools-journey-launch`，分支是 `codex/iter-viral-devtools-journey-launch`。macOS 可能把 `/tmp` 显示为 `/private/tmp`，记录时仍写本轮约定 worktree 路径。

- [ ] 跑基础 harness，确认不是仓库基线异常。

  ```bash
  bash harness/init.sh
  ```

  期望：JSON、harness 和既有 local blocked summary preflight 通过。若失败，先记录 baseline blocker，不继续把 DevTools 或 journey 写成 ready。

- [ ] 确认本轮命令默认无副作用。
  - 不 quit/open WeChat DevTools。
  - 不 preview/upload。
  - 不杀进程、不清缓存、不改 Service Port 设置。
  - 不改 AppID、`project.private.config.json`、本地 storage 或 CloudBase 数据。

- [ ] 确认真实证据落点只使用 ignored/local 路径。
  - 推荐结果文件：`harness/manual-test-results.local-viral-journey.json`。
  - 允许匹配：`harness/manual-test-results.local-viral-journey*.json` 或 `harness/local-viral-journey-results*.json`，前提是 `git check-ignore` 能确认被忽略。
  - 截图、录屏、payload、原始日志和临时草稿不得放入可提交路径；只写脱敏摘要到可提交文档。

## 1. 启动诊断命令输出该看什么

- [ ] 运行 P 轮准备命令。

  ```bash
  node scripts/prepare-viral-journey-devtools-run.mjs
  ```

  若需要指定端口或输出草稿路径：

  ```bash
  node scripts/prepare-viral-journey-devtools-run.mjs \
    --project /tmp/street-tasks-iter-worktrees/viral-devtools-journey-launch \
    --port 9420 \
    --out harness/manual-test-results.local-viral-journey.json
  ```

- [ ] 看 `Read-Only DevTools Port Forensics` 分段。
  - `status: ready`：只表示 service port 看起来可连接，可以准备打开 DevTools UI 或真机继续手测；它不表示页面已渲染，也不表示任何 journey passed。
  - `status: blocked`：记录端口、进程、listener、connection refused 或多实例归属等环境 blocker；不要写成产品 UI failed。
  - `status: unknown`：记录信息不足或归属不清；先补只读诊断，不进入 UI passed 结论。
  - 关注 `no DevTools quit/open commands were run` 等安全边界，确认命令没有产生 GUI 副作用。

- [ ] 看 `Ignored Local Draft Dry Run` 分段。
  - `--dry-run` 只说明会准备哪个 ignored local draft、会填哪些字段、下一步怎么跑。
  - dry-run 不写文件，不代表 blocked draft 已创建，不代表真实手测已执行。
  - 若需要真实 blocked draft，必须由后续明确命令或人工创建，并仍放在 ignored/local 路径。

- [ ] 看 `Existing Ignored Local Evidence Scan` 分段。
  - `No viral journey manual evidence files found; nothing checked.` 是正常的“无本地结果”状态，但不是 UI passed。
  - 若检查到 local 结果文件通过，只说明 schema、分支、commit、环境字段、journey 唯一性、状态聚合和证据字段符合 gate；仍需人工复核截图、录屏、payload 或日志是否真实来自 DevTools/真机。
  - 若出现未 ignored 路径、模板文件、占位符、缺少 evidence 或 share payload 错误，先修本地结果文件，再复跑 checker。

- [ ] 看 `Viral Journey Manual Run Package` 和 `Next Steps`。
  - 必须列出七条 journey：`first-hop-share-entry`、`receiver-confirm-conversion`、`receiver-comment-conversion`、`second-hop-receiver-source`、`ordinary-and-risk-entries`、`timeline-share-channel`、`timeline-risk-gating`。
  - `Next Steps` 若要求先恢复端口，就保持 blocked，不进入 UI 手测结论。
  - 输出最后的提醒“not UI passed evidence”必须保留在汇报口径中。

## 2. Blocked 时怎么记录

- [ ] blocked 只能表示“无法继续真实手测或无法得出 UI 结论”，不能表示产品功能失败。
- [ ] blocked 记录至少包含：
  - `branch`：当前分支。
  - `commit`：当前 HEAD。
  - `worktree`：本轮 worktree。
  - `testedAt`：日期时间和时区。
  - `portStatus`：`blocked` 或 `unknown`。
  - `blocker`：具体原因，例如 `9420 no LISTEN`、`connection refused`、`multiple DevTools instances ambiguous`、`DevTools UI unavailable`、`share payload cannot be inspected on current device`。
  - `impact`：哪些 journey 未执行。
  - `followUp`：启用 Service Port、重开 DevTools、换端口、换机器、准备登录/数据 fixture、或改用真机复测。
  - `evidenceLocation`：ignored local 文件或本地附件编号。

- [ ] 若写入 local JSON，每个被阻塞 journey 使用 `status: "blocked"`，并填写非空 `blocker` 和 `followUp`。
- [ ] `summary.overallStatus` 应随 journey 聚合为 `blocked`，不要手改成 `passed`。
- [ ] blocked draft 的 `evidence` 可以为空；这表示没有真实 UI evidence，不要为了过审填假截图、假 payload 或占位路径。
- [ ] 不要把以下内容写成 passed：
  - 端口 forensics 成功。
  - readiness/preflight 成功。
  - dry-run 成功。
  - blocked draft 创建成功。
  - evidence checker 对 blocked 文件通过。

## 3. Ready 后进入七条 journey 要确认什么

- [ ] 进入真实手测前，记录环境字段。
  - WeChat DevTools 版本、基础库版本、模拟器/真机型号、微信版本或设备系统、网络、CloudBase 是否启用、`posts` 云函数是否部署。
  - 记录测试数据来源：mock/local storage/CloudBase；记录 active 低风险任务、stale signal、report signal、stale/resolved/expired/hidden fixture 的 post id。

- [ ] `first-hop-share-entry`：首跳从分享进入低风险 active 任务。
  - 打开 `/pages/detail/detail?id=<activeLowRiskPostId>&from=share`。
  - 确认 receiver guide 可见。
  - 确认 receiver action strip 可见，且按钮是 confirm/comment 行动，不是直接分享 CTA。
  - 确认普通分享面板没有在同一状态竞争展示。
  - 记录页面截图/录屏、post id、设备/模拟器、实际文案和可见区域。

- [ ] `receiver-confirm-conversion`：接收者确认后的二跳提示。
  - 从首跳分享详情页点击 receiver confirm action。
  - 确认确认动作真实成功；若同一用户已确认导致重复动作被拦截，应换账号/storage 或记录 blocked。
  - 确认 `receiverConversionPrompt` 出现。
  - 确认 `actionRelayPrompt` 没有抢占主 CTA。
  - 检查二跳分享 payload，路径必须包含 `from=share&source=receiver&receiverAction=confirm`；无法检查时写明具体原因。

- [ ] `receiver-comment-conversion`：接收者评论后的二跳提示。
  - 从首跳分享详情页打开评论弹窗并提交有效评论。
  - 确认评论真实提交成功，记录本地 storage 或 CloudBase 路径。
  - 确认 `receiverConversionPrompt` 出现。
  - 确认 `commentRelayPrompt` 没有抢占主 CTA。
  - 检查二跳分享 payload，路径必须包含 `from=share&source=receiver&receiverAction=comment`；无法检查时写明具体原因。

- [ ] `second-hop-receiver-source`：二跳接收者看到接力语境。
  - 优先通过真实系统分享卡片进入；无法操作时可直接打开 `/pages/detail/detail?id=<activeLowRiskPostId>&from=share&source=receiver&receiverAction=confirm` 和 `...&receiverAction=comment`，但必须标注这是 direct route 辅助。
  - 确认 receiver guide 标题或摘要表达“有人接力了任务”的语境。
  - 确认 `receiverAction=confirm` 文案强调上一位刚确认，`receiverAction=comment` 文案强调上一位刚补线索或最新评论。
  - 确认普通分享面板没有在同一状态展示。
  - 记录入口来源、route/payload、实际文案和面板状态。

- [ ] `ordinary-and-risk-entries`：普通入口和风险态不鼓励接收侧扩散。
  - 打开同一 active 低风险任务的普通详情入口，不带 `from=share`。
  - 打开存在 stale signal、report signal 的分享入口。
  - 打开 stale、resolved、expired、hidden fixture；hidden 可能需要 controlled fixture 或 admin/setup，无法访问时记录 blocked。
  - 确认普通入口不展示 receiver guide 或 receiver action strip。
  - 确认有 stale/report 信号时隐藏 receiver action strip。
  - 确认 stale/resolved/expired/hidden 不暴露接收侧 public relay CTA。
  - 记录每个 fixture 的 post id、状态、`staleCount`、`reportCount`、闭合原因和 UI 观察。

- [ ] `timeline-share-channel`：低风险 active 详情页朋友圈系统渠道。
  - 打开同一 active、非 stale、非 reported、非 closed 的任务详情页。
  - 打开真实微信系统菜单，确认同时可见“发送给朋友”和“分享到朋友圈”。
  - 触发或 inspect `onShareTimeline`；若 query 可见，必须包含任务 `id`、`from=share`、`source=timeline`、`shareChannel=timeline`。
  - 记录 `title`、`query`、`imageUrl` 或具体无法 inspect 的字段和原因。
  - 从朋友圈卡片、DevTools 单页模式或等价入口进入，确认首屏标题、地点/距离、状态、正文、图片或占位和接收语境可读。
  - 记录菜单、payload 和单页首屏证据；这条不能替代前五条 receiver journeys。

- [ ] `timeline-risk-gating`：风险和闭合任务不开放鼓励性朋友圈。
  - 打开弱 stale/report、`stale`、`resolved`、`expired`、`hidden`、unknown 或远端刷新失败 fixture。
  - 打开真实微信系统菜单，确认没有鼓励性 `shareTimeline` / “分享到朋友圈”入口。
  - 若仍能 inspect 分享标题、query 或页面文案，确认它们使用谨慎语义，不鼓励继续扩散。
  - 如果菜单无法打开、payload 无法 inspect、fixture 无法准备或设备不支持当前检查，只能记录 blocked 和 follow-up，不能写 passed。
  - 记录每个 fixture 的 post id、状态、`staleCount`、`reportCount`、闭合原因、菜单缺失证据和谨慎文案观察。

## 4. Share payload 怎么记录

- [ ] payload 证据优先记录结构化字段，不粘贴无关隐私或完整系统日志。
  - `journeyId`
  - `postId`
  - `sourceAction`：`confirm`、`comment`、`receiver` 或实际入口。
  - `title`：脱敏后的分享标题摘要。
  - `path`：必须包含页面路径和 query；二跳 conversion 必须看到 `from=share&source=receiver`，confirm/comment conversion 还必须分别看到 `receiverAction=confirm/comment`。
  - `query`：拆出的 `id`、`from`、`source`。
  - `captureMethod`：DevTools share hook、真机分享卡片、控制台日志、截图/录屏或无法检查原因。

- [ ] 结果 JSON 中可以写：

  ```json
  "sharePayload": {
    "path": "/pages/detail/detail?id=post_001&from=share&source=receiver&receiverAction=confirm",
    "title": "脱敏后的分享标题摘要"
  }
  ```

- [ ] 若系统环境无法暴露 payload，必须写 `sharePayloadInspection`，并包含具体原因，例如“真机系统分享面板未暴露 path，已用录屏记录点击路径；payload 待 DevTools hook 复核”。不要只写“无法检查”四个字。
- [ ] 不提交二维码、token、cookie、openId、unionId、真实头像 URL、真实昵称、精确经纬度、完整 CloudBase fileID 或完整 console/network 日志。

## 5. 修改 local 结果后复跑哪些 guard

- [ ] 每次修改 viral journey local 结果文件后复跑：

  ```bash
  node --no-warnings scripts/check-viral-journey-manual-evidence.mjs \
    harness/manual-test-results.local-viral-journey.json
  ```

- [ ] 若只想扫描所有 ignored local viral journey 结果：

  ```bash
  node --no-warnings scripts/check-viral-journey-manual-evidence.mjs
  ```

- [ ] 复跑 readiness，确认新 local 结果不会破坏启动前检查：

  ```bash
  node --no-warnings scripts/check-devtools-readiness.mjs
  ```

- [ ] 跑基础 closeout guard：

  ```bash
  node scripts/check-json.mjs
  node harness/check-harness.mjs
  git diff --check
  ```

- [ ] 最后确认 local evidence 未进入可提交改动：

  ```bash
  git status --short --ignored
  git check-ignore -v harness/manual-test-results.local-viral-journey.json
  ```

  期望：local 结果和附件只显示为 ignored；可提交改动中不得出现真实截图、录屏、payload、日志或 local JSON。

## 6. 汇报口径

- [ ] 可以写：`DevTools 端口诊断 ready，已进入真实手测待记录 UI evidence`。
- [ ] 可以写：`DevTools service port blocked，七条传播 journey 未执行，blocked draft/evidence gate 仅记录环境阻塞`。
- [ ] 可以写：`ignored local viral journey evidence schema 通过，仍需人工复核真实截图/录屏/payload`。
- [ ] 不得写：`readiness 通过，所以 UI passed`。
- [ ] 不得写：`dry-run 通过，所以 DevTools recovered`。
- [ ] 不得写：`blocked draft 通过，所以 journey passed`。
- [ ] 不得写：`没有 local evidence 文件，所以默认通过`。
- [ ] 不得把 direct route 辅助打开伪装成真实系统分享卡片进入；两者都可记录，但必须区分。
