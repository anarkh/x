# Z 组真实 Evidence 恢复产品 Brief

日期：2026-06-17

分支基线：`ef8f0a5 feat: add viral attribution events`

工作目录：`/tmp/street-tasks-iter-worktrees/viral-real-evidence-recovery`

角色：Z 组产品 agent

## Z 轮产品目标

拿到一份可复核、可区分 `passed` 与 `blocked` 的真实 WeChat DevTools 或真机 evidence package，让评测 agent 相信当前 viral 大版本不只是静态检查通过，而是系统分享、朋友圈、单页落地、二跳归因、CloudBase 事件和隐私边界都在真实环境中被验证或被准确阻塞。

## 背景判断

Y 轮已经把产品链路补到接近完整：`viral_attribution_events` 能记录 `landing`、`load`、`block`、`confirm`、`comment`、`relay`，分享链路带 `share_id`、`parent_share_id`、`share_depth`，并且自动检查覆盖字段白名单、二跳 payload 和 CloudBase best-effort 上报。

当前 99 分天花板不在继续加文案、组件或 CTA，而在真实 evidence 缺失。Z 轮应把研发和 QA 的注意力从“再做一个传播增强点”切到“恢复 DevTools/真机入口并产出可评测证据”。

## 证据缺口优先级

1. P0：WeChat DevTools service port 9420 仍是 blocker。当前 readiness 报告 `connect_refused` / smoke `blocked`，所以没有可信的 DevTools open、compile、system share 或 payload evidence。
2. P0：七条 viral journey 没有真实 `passed` 本地结果文件。`harness/viral-journey-manual-results.example.json` 只是 `not_run` 模板，不能引用为验收证据。
3. P0：系统分享 payload 未真实观察。需要证明好友分享 path、朋友圈 query、二跳 path/query 在微信系统能力里保留 `id`、`from=share`、`source`、`shareChannel`、`share_id`、`parent_share_id`、`share_depth`。
4. P0：朋友圈菜单和单页模式首屏未真实通过。需要真实菜单中朋友圈入口、timeline 卡片信息、从朋友圈打开的单页或等价首屏可读证据。
5. P0：CloudBase `viral_attribution_events` 未真实写入。自动检查证明代码会清洗和 best-effort 上报，但评测需要看到真实或明确 blocked 的云端样本。
6. P1：窄屏和真机转化未验证。`from=share`/`source=timeline` 引导、receiver action strip、confirm/comment 后二跳提示、风险态 no-share CTA 都需要至少一个窄屏 DevTools 或真机观察。
7. P1：隐私字段检查缺少真实证据包级结论。需要确认本地 evidence、CloudBase 样本和可提交摘要里没有评论正文、联系人/群聊、精确经纬度、原始 openid、token、完整 `cloud://` 或 CloudBase env id。

## 本轮不做什么

- 不再增加用户侧传播文案、卡片、CTA、奖励、海报、联系人推荐或渠道选择，除非该改动直接服务于真实 evidence 采集。
- 不新增归因字段，除非当前 evidence 采集无法判断必要的 passed/blocked 状态。
- 不把 readiness、static gate、dry-run、blocked capture、schema checker passed 写成 UI passed。
- 不提交截图、录屏、真实 CloudBase 标识、用户身份、原始日志或 ignored local result 文件。
- 不用直接路由替代系统分享作为唯一 passed 证据。直接路由可以辅助定位问题，但系统分享 payload 仍需真实观察或写为 blocked。

## 可验收 Evidence Package

Z 轮的交付不一定必须全 passed，但必须诚实。一个可被评测接受的 evidence package 至少包含以下六类材料。

### 1. Service-port 状态

记录 `npm run inspect:devtools-port` 或等价命令的摘要：

- 检查时间、worktree、branch、commit。
- 端口号，默认 `9420`。
- 是否存在 `ide-http-port` 声明。
- 是否有 listener。
- IPv4/IPv6 连接结果。
- 诊断结论：`ready`、`blocked` 或 `unknown`。

如果仍是 `connect_refused` 或 no listener，状态只能写 `blocked`，不能继续写 DevTools smoke passed。

### 2. DevTools smoke/open 结果

记录 `npm run check:devtools-smoke`、`npm run prepare:viral-journey-run` 或真实 UI 操作结果：

- DevTools 是否打开了当前 worktree，而不是其他项目。
- 小程序是否编译成功。
- 目标详情页能否打开。
- 当前环境是 DevTools 模拟器、真机 iOS、真机 Android，或 blocked。
- 如果 smoke 脚本失败，保留最小错误摘要和下一步，不贴完整敏感日志。

open 或 smoke 只是入口 evidence。它不自动证明七条 viral journey passed。

### 3. 真实或阻塞的 viral journey 文件

使用 ignored local 文件，例如 `harness/manual-test-results.local-viral-journey.json`，并通过：

```bash
node --no-warnings scripts/check-viral-journey-manual-evidence.mjs harness/manual-test-results.local-viral-journey.json
```

七条 journey 必须完整且唯一：

- `first-hop-share-entry`
- `receiver-confirm-conversion`
- `receiver-comment-conversion`
- `second-hop-receiver-source`
- `ordinary-and-risk-entries`
- `timeline-share-channel`
- `timeline-risk-gating`

`passed` 必须有真实 UI actual、evidence、设备/环境、post id 或脱敏 fixture、必要 payload。`blocked` 必须有 blocker 和 followUp。`failed` 必须来自已进入真实 UI 后观察到的产品偏差。

### 4. Share payload 字段

对好友分享、朋友圈分享、接收者 confirm/comment 后二跳，分别记录可 inspect 的 payload 或无法 inspect 的具体原因。

低风险 passed evidence 至少要覆盖：

- 好友分享 path：`id`、`from=share`、`source`、`share_id`。
- 接收者二跳 path：`source=receiver`、`receiverAction=confirm|comment`、`share_id`、`parent_share_id`、`share_depth=2|2_plus`。
- 朋友圈 query：`id`、`from=share`、`source=timeline`、`shareChannel=timeline`、`share_id`。
- 朋友圈二跳 query：`parent_share_id` 和递增后的 `share_depth`。

如果微信系统环境不暴露 payload，只能把对应 payload 检查写成 `blocked` 或在 journey 内写明无法检查的具体系统限制，不能写 payload passed。

### 5. CloudBase attribution event 样本

真实 CloudBase 样本需要来自 `viral_attribution_events` 集合或云函数日志的脱敏摘要，至少覆盖：

- `share_detail_landing`
- `share_detail_loaded` 或 `share_detail_blocked`
- `share_confirm_success` 或 `share_comment_success`
- `share_relay_success`

每条样本只记录白名单字段摘要，例如 `event_type`、`attribution_session_id`、`post_id`、`post_category`、`post_status`、`from`、`entry_source`、`share_id`、`parent_share_id`、`share_depth`、`action_result`、`blocked_reason`、`is_publisher`、`user_id_hash`、`distance_bucket`、`app_version`。

如果 CloudBase 未部署、集合不存在、权限不通或当前只能本地 fallback，写 `blocked` 或 `partial`，并说明本地 storage 是否记录到 `viral_attribution_events`。不要把本地 fallback 等同于云端 shared attribution passed。

### 6. 隐私字段检查

证据包必须包含一条隐私检查结论：

- CloudBase 样本不含原始 openid、unionid、手机号、微信号、联系人、群聊、评论正文、图片内容、精确经纬度、详细地址、token、cookie、AppSecret。
- 本地 result JSON 和可提交摘要不含真实 CloudBase env id、完整 `cloud://` file id、request id、原始截图路径或完整本机私有路径。
- 若截图或录屏用于复核，只在本地或受控位置留存，仓库只写脱敏观察摘要。

## 端口仍阻塞时的写法

如果 9420 仍然阻塞，Z 轮仍可产出合格 blocked evidence，但写法必须克制：

- `summary.overallStatus` 写 `blocked`。
- 七条 viral journey 全部写 `status: "blocked"`，不能混入未执行的 `passed`。
- `actual` 写真实未发生的事，例如“DevTools service port 9420 connection refused，未打开目标页面，未触发系统分享面板，未检查 payload，未写入 CloudBase 样本”。
- `blocker` 写可复核事实，例如“存在 `--ide-http-port 9420` 声明但无 listener”或“smoke access failed with connect_refused”。
- `evidence` 放脱敏命令摘要，不放 example 文案或虚构截图。
- `followUp` 写恢复条件，例如“启用 DevTools Service Port 或换机后重跑 `npm run inspect:devtools-port`、`npm run check:devtools-smoke`、`npm run prepare:viral-journey-run`，再执行七条真实 journey”。
- 明确声明：blocked evidence 只证明当前环境无法验收，不证明产品 passed，也不证明产品 failed。

推荐 blocked 摘要句式：

> 当前 Z 轮 evidence 状态为 blocked：`9420` service port 无 listener，DevTools smoke 未进入目标项目，所以七条 viral journey、系统分享 payload、朋友圈菜单、单页模式首屏和 CloudBase attribution event 样本均未产生真实 passed evidence。下一步是恢复 DevTools service port 或改用真机后重跑完整 journey。

## 给开发 Agent 的最小实现建议

1. 先不要改产品代码。运行 `npm run inspect:devtools-port`、`npm run check:devtools-smoke`、`npm run prepare:viral-journey-run`，判断当前是 `ready` 还是 `blocked`。
2. 如果端口 blocked，运行或指导使用 `npm run inspect:devtools-recovery` 查看 dry-run，再在用户明确允许的环境下恢复 DevTools Service Port。恢复前后都保留脱敏摘要。
3. 如果短期无法恢复，使用 `npm run capture:viral-blocked-evidence` 生成 ignored local blocked JSON，并复跑 manual evidence checker。不要提交该 local JSON。
4. 如果 DevTools 或真机 ready，按七条 journey 一次性跑通，重点采集系统菜单、share path/query、timeline 单页首屏、confirm/comment 二跳、风险态 no-shareTimeline 和窄屏布局。
5. 为 CloudBase 准备最小测试数据：一个低风险 active post，一个弱 stale/report post，一个 closed/risk fixture，并确认 `posts` 云函数和 `viral_attribution_events` 集合可用。若不可用，写 blocked，不临时绕过。
6. 对每条 passed journey 同步记录归因事件样本或无法读取样本的原因。事件读取只做脱敏摘要，不导出完整数据库截图或原始日志。
7. 收尾时运行 `node --no-warnings scripts/check-viral-journey-manual-evidence.mjs <local-json>`、`node --no-warnings scripts/check-devtools-readiness.mjs`、`node harness/check-harness.mjs` 和 `git diff --check`。检查通过只说明证据结构和基础状态可复核，最终 UI passed 仍以真实 journey 状态为准。

## Z 轮成功标准

- 本 brief 存在于 `harness/viral-real-evidence-recovery-product-brief.md`。
- 后续 agent 能按本 brief 判断当前应恢复 DevTools/真机、采集 passed evidence，还是诚实写 blocked evidence。
- evidence package 覆盖 service port、DevTools smoke/open、七条 viral journey、share payload、CloudBase attribution event 样本和隐私字段检查。
- 没有任何静态检查、dry-run、blocked capture 或 schema checker 被表述为真实 UI passed。
- 没有继续新增与真实 evidence 无关的传播文案或 CTA。
