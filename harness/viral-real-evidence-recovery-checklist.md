# Z 轮真实证据恢复 QA Checklist

日期：2026-06-17

## 目标与状态口径

- [ ] 本清单用于把 viral 分享证据分成可判分层级，避免把自动 readiness、blocked draft、未运行手测或真实 UI 通过混在一起。
- [ ] 本轮只定义设计 / QA 证据要求，不新增或修改产品代码、脚本、云函数或真实结果文件。
- [ ] `passed` 只能用于真实执行过目标层级、actual 非占位、关键期望满足、证据可定位且无隐私泄漏的结果。
- [ ] `blocked` 只能用于已经尝试进入该层级，但被环境、账号、数据、权限、CloudBase 或设备阻断；必须写 `blocker`、`followUp` 和环境信息。
- [ ] `not_run` 用于没有尝试执行；不得伪装成 `blocked`，也不得写成“看起来可通过”。
- [ ] 如果真实运行后观察到产品不符合期望，应记为 `failed`；不要把产品缺陷写成环境 blocked。

## 全局 Evidence Header

每一层级记录 passed、blocked、failed 或 not_run 前，都先补齐同一组 header，方便评测 agent 判断证据是否属于当前代码和环境。

- [ ] `branch`：当前分支名。
- [ ] `commit`：当前 HEAD 的 full SHA 或短 SHA。
- [ ] `testedAt`：测试时间，含时区。
- [ ] `tester`：执行人或 agent 名称。
- [ ] `repoPath`：本地仓库路径。
- [ ] `projectPath`：WeChat DevTools 打开的项目路径。
- [ ] `devtoolsVersion` 和 `baseLibraryVersion`：无法读取时写清楚原因。
- [ ] `device`：模拟器机型 / 真机型号 / 系统版本 / 微信版本。
- [ ] `network`：在线、弱网、断网、代理、公司网络等。
- [ ] `cloudbaseEnv`：环境 id 或脱敏别名、云函数版本、集合状态；不能记录密钥。
- [ ] `dataFixtures`：测试 post id、状态、stale/report/closed 字段、是否低风险；不要记录精确经纬度或私人内容。

## QA 分层

### 1. 自动 Readiness

用途：确认静态模型、JSON、harness、manual evidence schema 和 no-side-effect 准备包仍可运行。它是前置检查，不是 UI 通过证据。

Passed evidence 必须记录：

- [ ] 命令和退出码：至少包含 `bash harness/init.sh`、`npm run check` 或 `npm run check:readiness` 的真实输出摘要。
- [ ] `scripts/check-devtools-readiness.mjs` 是否仍报告 service port / smoke blocker；如果报告 blocker，readiness 仍可通过，但 UI 层不能 passed。
- [ ] 本次 readiness 使用的 branch、commit、Node 版本和运行时间。
- [ ] 如果扫描到 ignored local manual evidence，记录文件路径、overallStatus 和 checker 输出摘要。

Blocked 时必须记录：

- [ ] `blocker`：命令不可运行、依赖不可安装、Node 不可用、harness 文件缺失或 checker 失败的具体错误。
- [ ] `followUp`：修复哪条命令、哪个文件或哪个环境依赖。
- [ ] 环境信息：Node/npm 版本、shell、repoPath、退出码、stderr 关键行。
- [ ] 不得宣称：WeChat DevTools 已打开、系统分享菜单可见、真实 payload 正确、CloudBase attribution 已写入、真机或窄屏已通过。

### 2. DevTools Service Port

用途：确认 WeChat DevTools 服务端口可被 CLI / 探针访问，当前默认关注 `9420`。

Passed evidence 必须记录：

- [ ] `npm run inspect:devtools-port` 或等价只读端口取证输出，明确 `9420` 正在监听。
- [ ] `lsof` / 探针摘要：监听进程名、PID、端口、是否像 WeChat DevTools。
- [ ] DevTools 设置截图或日志摘要：服务端口已开启，项目路径是本仓库。
- [ ] 如果端口不是 `9420`，记录实际端口、为什么改端口、后续命令如何传参。

Blocked 时必须记录：

- [ ] `blocker`：未监听、端口被其他进程占用、DevTools 未安装 / 未启动、服务端口开关不可用、权限禁止探测等。
- [ ] `followUp`：谁需要打开 DevTools、开启服务端口、重启工具、换端口或提供机器访问。
- [ ] 环境信息：DevTools 安装路径、进程摘要、端口探针输出、macOS 用户上下文、项目路径。
- [ ] 不得宣称：CLI open 成功、模拟器编译成功、系统分享面板可打开、朋友圈菜单可见、单页模式可读。

### 3. DevTools Smoke / Open

用途：确认 DevTools 能打开项目或被 smoke 探针访问，并能到达小程序首屏。它仍不等于 viral journey passed。

Passed evidence 必须记录：

- [ ] `npm run check:devtools-smoke` 或 `node scripts/check-devtools-smoke-access.mjs --strict` 的退出码和关键输出。
- [ ] DevTools UI 截图或录屏：项目已打开、路径是本仓库、模拟器不白屏、控制台首个错误为空或已说明为非阻塞。
- [ ] 编译 / 打开动作摘要：打开的页面路径、是否清缓存、是否重新编译、是否有 warnings/errors。
- [ ] 如果使用 `npm run prepare:viral-journey-run`，记录其中 port/smoke 状态，但不要把 run package 当成 UI evidence。

Blocked 时必须记录：

- [ ] `blocker`：service port 不通、CLI timeout、DevTools 打不开项目、模拟器白屏、编译卡死、账号未登录、AppID / project config 阻断。
- [ ] `followUp`：重开 DevTools、开启端口、清缓存、重新导入项目、登录开发者账号、提供控制台第一条红色错误。
- [ ] 环境信息：DevTools 版本、base library、appid 使用 `touristappid` 还是本地私有 AppID、打开页面、错误日志摘要。
- [ ] 不得宣称：系统分享 payload 已 inspect、朋友圈菜单存在、receiver 转化链路已通过、CloudBase 事件已落库、真机表现已通过。

### 4. 真实 Viral Journeys

用途：运行真实用户传播链路，包括 friend share、timeline share、receiver confirm/comment 转化、二跳接力、风险态不鼓励扩散和单页模式。

Passed evidence 必须记录：

- [ ] 所有 required journeys 各自有 `status=passed`、真实 `actual`、独立 evidence 引用和对应 post fixture。
- [ ] 系统分享菜单截图 / 录屏：低风险 active 任务能看到朋友分享；timeline journey 还要看到朋友圈入口。
- [ ] payload evidence：可 inspect 时记录 `title`、`path` 或 `query`、`imageUrl` / 图片来源、分享渠道和关键参数；不可 inspect 时必须写明工具限制、替代证据和未验证字段。
- [ ] 落地页截图 / 录屏：`from=share`、`source=timeline`、`source=receiver` 等入口的首屏说明正确，普通入口不被 viral 文案覆盖。
- [ ] 转化截图 / 录屏：接收者完成 confirm/comment 后，数量或评论刷新正确，二跳 prompt 优先级正确，普通 share panel 不同时竞争。
- [ ] 风险态 evidence：weak stale/report、stale、resolved、expired、hidden、unknown 任务不出现鼓励扩散菜单或文案。

Blocked 时必须记录：

- [ ] `blocker`：无法打开系统菜单、无法触发真实分享、账号无朋友圈能力、缺 fixture、单页模式无法启动、payload inspector 不可用、接收端无法进入。
- [ ] `followUp`：需要哪个账号 / 设备 / fixture / DevTools 设置 / CloudBase 数据，以及下一次从哪条 journey 继续。
- [ ] 环境信息：设备、微信版本、DevTools 版本、页面路径、fixture post id、入口 query、截图或控制台摘要。
- [ ] 不得宣称：分享 payload 正确、朋友圈渠道通过、单页模式首屏可读、二跳链路完成、风险态 gating 生效。

### 5. CloudBase Attribution

用途：确认 viral attribution 事件在真实链路中 best-effort 触发，并在 CloudBase 或明确 fallback 中可审计。

Passed evidence 必须记录：

- [ ] 真实链路动作：landing、loaded / blocked、confirm_success、comment_success、relay_intent、relay_success 中实际跑过哪些。
- [ ] 事件 payload 摘要：event name、post id、entry source、share id、parent share id、share depth、share channel、receiver action、conversion action、status / risk 字段。
- [ ] CloudBase readback：`viral_attribution_events` 集合中脱敏事件数量、时间范围、字段摘要、`user_id_hash` 存在且没有 raw openid。
- [ ] 降级 evidence：若 CloudBase 不可用但用户链路继续，记录本地 fallback / 控制台摘要、失败原因和未落库风险；这只能证明不阻断体验，不能证明 CloudBase 写入 passed。
- [ ] 云端环境：云函数版本、集合权限、测试账号角色、网络状态。

Blocked 时必须记录：

- [ ] `blocker`：云函数未部署、集合不存在、权限不足、网络失败、无法查看云端数据、服务端日志不可用、真实分享链路未跑到归因点。
- [ ] `followUp`：部署哪个云函数、创建哪个集合、用哪个账号复跑、如何读取脱敏事件。
- [ ] 环境信息：CloudBase env 脱敏名、函数名、集合名、调用时间、错误码 / 错误摘要。
- [ ] 不得宣称：归因已落库、链路可统计、CloudBase 通过、用户 id 已安全脱敏，除非有 readback 或明确字段证据。

### 6. 真机 / 窄屏

用途：确认真实设备和小屏宽度下，地图、详情、接收页、转化提示、timeline 单页模式和底部操作不遮挡、不溢出。

Passed evidence 必须记录：

- [ ] 真机或窄屏模拟器截图 / 录屏：至少覆盖 320-375px 级别窄屏、常见 iPhone 宽度、一个 Android 或微信真机场景。
- [ ] 首屏 evidence：标题、状态、地点 / 距离摘要、receiver guide、系统导航栏、tabBar / 单页模式无 tabBar 都可读。
- [ ] 交互 evidence：打开评论、完成 confirm、完成 comment、触发二跳 prompt、打开系统菜单、滚动到底部。
- [ ] 布局检查：不遮挡地图控件、评论入口、分享按钮、relayChannels、shareReason、targetRows、底部安全区。
- [ ] 性能 / 稳定性摘要：首屏没有无限 loading、白屏、明显卡死或遮挡式授权循环。

Blocked 时必须记录：

- [ ] `blocker`：没有真机、无法登录微信、无法扫码预览、设备不支持朋友圈、窄屏模拟器不可用、网络 / 定位权限阻断。
- [ ] `followUp`：需要哪台设备、哪个微信账号、哪个二维码 / 预览包、哪组 fixture、谁来补测。
- [ ] 环境信息：机型、系统、微信版本、屏幕宽度、像素比、网络、定位授权状态。
- [ ] 不得宣称：移动端视觉通过、真机分享通过、单页模式可读、窄屏转化 CTA 可用。

## 真实分享 Payload 检查点

每个可 inspect 的真实分享 payload 都要记录原始字段摘要和规范化字段摘要；不可 inspect 时必须写清楚“哪个工具不支持、用什么替代、哪些字段仍未验证”。

- [ ] `from`：应区分普通入口和分享入口；真实接收链路应包含 `from=share`。
- [ ] `source`：至少区分 `timeline`、`receiver`、`comment`、`confirm`；未知 source 不应触发鼓励扩散语境。
- [ ] `share_id`：当前分享或接力分享的脱敏 id；不能是用户 openid、unionid 或手机号。
- [ ] `parent_share_id`：二跳或多跳接力时指向上一级分享；首跳为空或显式说明。
- [ ] `share_depth`：首跳 / 二跳 / 多跳深度，必须是合理数字，不得无限增长或缺失。
- [ ] `share_channel`：规范化事件字段；timeline payload query 如使用 `shareChannel=timeline`，需要在 evidence 中说明映射到 `share_channel=timeline`。
- [ ] `receiverAction`：二跳接收者上一次完成 `confirm` 还是 `comment`；仅在相关链路出现，风险态不应伪造。
- [ ] `conversionAction`：归因事件里的转化动作；如实现字段为 `conversion_action`，evidence 应同时写出原字段名和值。
- [ ] `path` / `query`：朋友分享通常检查 `path`，朋友圈通常检查 `query` 且不得声称有自定义 timeline path。
- [ ] `title` / `imageUrl`：文案谨慎、不诱导、不泄露隐私；风险态标题不能鼓励扩散。

## 隐私检查点

证据、payload、日志、截图和 CloudBase readback 都要先脱敏。出现以下内容时，评测 agent 应把相关层级判为 failed 或要求重采。

- [ ] 不能出现评论正文、用户输入全文、图片原始 URL 或完整分享文案全文。
- [ ] 不能出现联系人姓名、好友关系、群名、微信群 id 或私聊上下文。
- [ ] 不能出现 raw openid、unionid、手机号、微信号、身份证号、邮箱、门牌号或详细住址。
- [ ] 不能出现精确经纬度；如果需要位置，只能用 post id、地点摘要、距离段或脱敏区域。
- [ ] 不能出现 cookie、token、Authorization、session、refresh token、access token、client secret、AppSecret 或私有 AppID。
- [ ] 不能把用户头像、昵称、云环境 id、设备序列号等可识别信息直接提交；必要时打码或用脱敏别名。

## Blocked 记录模板

每个 blocked 层级至少包含以下字段；缺字段时只能算记录不完整，不能作为有效阻塞证据。

```json
{
  "layer": "devtools-service-port",
  "status": "blocked",
  "blocker": "Port 9420 is not listening after DevTools was opened.",
  "followUp": "Enable service port in WeChat DevTools, reopen this project, then rerun npm run inspect:devtools-port and npm run check:devtools-smoke.",
  "environment": {
    "repoPath": "/private/tmp/street-tasks-iter-worktrees/viral-real-evidence-recovery",
    "projectPath": "/private/tmp/street-tasks-iter-worktrees/viral-real-evidence-recovery",
    "devtoolsVersion": "unknown",
    "device": "not reached",
    "network": "not reached",
    "cloudbaseEnv": "not reached"
  },
  "notClaimed": [
    "DevTools smoke/open passed",
    "system share payload inspected",
    "timeline menu verified",
    "CloudBase attribution written",
    "real-device or narrow-screen conversion passed"
  ]
}
```

## 评测 Agent 判分规则

- [ ] 先检查全局 header 是否匹配当前 branch / commit；旧证据或不同分支证据不能直接给当前轮加分。
- [ ] 自动 readiness 只能给“结构准备好”分，不给 DevTools、分享、CloudBase 或真机通过分。
- [ ] Service port passed 只说明可以尝试 DevTools smoke；不能替代 smoke/open，也不能替代 viral journeys。
- [ ] Smoke/open passed 只说明项目能被 DevTools 打开和首屏可见；不能替代系统分享菜单、payload、CloudBase 或真机证据。
- [ ] Viral journeys 是用户侧裂变判分主项；所有 required journeys 没有真实 passed evidence 时，不能评为最终用户链路通过。
- [ ] CloudBase attribution 必须有真实 readback 或明确降级证据；只有客户端静态检查或“应当写入”不得给 CloudBase passed。
- [ ] 真机 / 窄屏必须有截图或录屏；桌面宽屏 DevTools 截图不能替代窄屏和真机结论。
- [ ] 任一层级 `not_run` 时，只能写未运行；不得用前置层通过、模板存在或 blocked draft 填补。
- [ ] 任一层级 `blocked` 时，只能写真实阻塞和下一步；不得写“功能通过但缺证据”。
- [ ] 任一层级出现隐私泄漏、占位 actual、不可定位 evidence、无法复现的口头描述，应扣回该层级 passed。
- [ ] 若 service port 9420 仍未监听，评测结论应停在“真实 DevTools / 真机证据 blocked”，不能给 100/100 的真实通过结论。

## 收尾验证

- [ ] 修改本清单后运行 `node harness/check-harness.mjs`。
- [ ] 修改本清单后运行 `git diff --check`。
- [ ] 不提交真实截图、录屏、payload 或 local manual evidence；它们应保持 ignored/local。
