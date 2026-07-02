# 地图列表 UX Resilience 检查清单

日期：2026-06-14

范围：用于 `codex/iter-map-list-resilience` 分支检查地图列表卡片在长内容、图片、状态标签和底部信息挤压下的韧性。当前 WeChat DevTools service port 仍 blocked，本清单不代表视觉验收已经通过；只有后续在 DevTools 或真机逐项确认并记录证据后，才能把相关用户可见结论写为 passed。

工作目录：`/tmp/street-tasks-iter-worktrees/map-list-resilience`

## 0. 进入前检查

- [ ] 确认工作目录和分支。

  ```bash
  pwd
  git branch --show-current
  git status --short
  ```

  期望：工作目录为 `/tmp/street-tasks-iter-worktrees/map-list-resilience`，分支为 `codex/iter-map-list-resilience`；工作区只包含本轮预期的 harness 文档改动。

- [ ] 跑基础 harness。

  ```bash
  bash harness/init.sh
  ```

  期望：`node scripts/check-json.mjs` 输出 JSON 检查通过，`node harness/check-harness.mjs` 输出 harness 自检通过。若失败，先记录基础 blocker，不继续把视觉检查写成通过。

- [ ] 读取当前地图列表实现。

  ```bash
  sed -n '1,220p' pages/map/map.wxml
  sed -n '1,260p' pages/map/map.wxss
  sed -n '1,180p' utils/mock-posts.js
  ```

  期望：理解卡片字段来源、图片分支、状态标签、详情入口、底部统计和 mock 数据覆盖缺口。

## 1. 静态结构检查

这些检查可以由脚本或命令辅助完成，但只能证明结构存在，不能证明视觉不溢出。

- [ ] 列表抽屉存在独立头部、分类筛选、滚动列表和空状态。
  - 可脚本检查：`pages/map/map.wxml` 中有 `list-drawer`、`drawer-head`、`filter-bar`、`post-list`、`empty-panel`。
  - 必须人工确认：抽屉打开时不会压住底部 tabBar，头部、筛选条、列表滚动区域在窄屏上层级清楚。

- [ ] 每张列表卡片包含内容区、标题行、正文摘要、底部信息和详情入口。
  - 可脚本检查：`post-card` 内有 `post-main`、`post-title-row`、`post-summary`、`post-footer`、`mark-button`。
  - 必须人工确认：卡片可点击聚焦任务，右侧详情按钮可以独立进入详情，不与整卡点击冲突。

- [ ] 标签跟随标题行，而不是挤占底部统计。
  - 可脚本检查：`post-title-row` 内包含 `post-title` 和 `post-inline-tags`，状态标签使用 `item.status !== 'active'` 条件渲染。
  - 必须人工确认：长标题、多标签、状态标签同时出现时，标签换行后仍属于标题区域，不把正文或详情按钮顶到不可用。

- [ ] 图片和无图分支结构都存在。
  - 可脚本检查：有 `item.coverImage ? 'with-thumb' : ''` 和 `wx:if="{{item.coverImage}}" class="post-thumb"`。
  - 必须人工确认：有图卡片图片尺寸稳定，无图卡片文字列自动占满，不出现空洞或错位。

## 2. WXSS 布局约束检查

这些检查适合写成静态脚本或 review checklist；若缺失，应先作为布局风险记录。

- [ ] 抽屉高度和滚动区域有明确约束。
  - 可脚本检查：`.list-drawer` 使用 `height: calc(100vh - 116rpx - env(safe-area-inset-bottom))`，`.post-list` 使用 `flex: 1`、`height: 0`、`min-height: 0`。
  - 必须人工确认：列表内容很多时只滚动列表区域，抽屉头部和筛选条不会被推走或遮挡。

- [ ] 卡片主区使用可收缩网格。
  - 可脚本检查：`.post-main` 使用 `grid-template-columns: minmax(0, 1fr) 48rpx`，`.post-main.with-thumb` 使用 `104rpx minmax(0, 1fr) 48rpx`。
  - 必须人工确认：窄屏下文字列会收缩，详情入口仍保持可点，不被标题或标签覆盖。

- [ ] 文本容器允许收缩并处理超长字符串。
  - 可脚本检查：`.post-text` 有 `min-width: 0`，`.post-title` 有 `max-width: 100%` 和 `word-break: break-all`，`.post-summary` 有 `overflow: hidden`、`text-overflow: ellipsis`、`-webkit-line-clamp: 2`。
  - 必须人工确认：连续中文、英文长词、数字地址和标点混排不会横向撑破卡片。

- [ ] 底部左右信息有收缩策略。
  - 可脚本检查：`.post-footer` 为 flex + `justify-content: space-between`，`.post-counts` 可换行，`.post-footer-meta` 有 `flex: 1`、`min-width: 0`、`text-align: right`、`white-space: nowrap`、`text-overflow: ellipsis`。
  - 必须人工确认：左侧“确认/过时”与右侧“时间/距离”在窄屏不重叠；右侧过长时截断，左侧统计仍可读。

- [ ] 固定尺寸元素不会随内容跳动。
  - 可脚本检查：`.post-thumb` 为 `104rpx` 正方形，`.post-card .mark-button` 为 `48rpx`。
  - 必须人工确认：图片加载前后、状态切换前后、筛选条数量变化时，卡片高度变化可接受且不会产生遮挡。

## 3. 内容韧性场景

后续执行者应准备本地 mock 或临时云端测试数据。若修改 mock，只能在专门测试分支或本地临时改动中进行；本清单本身不要求提交测试数据。

- [ ] 长标题。
  - 建议数据：40 到 80 个中文字符；一段不含空格的英文或数字串；标题后同时带分类、lost/found intent 和非 active 状态。
  - 可脚本检查：标题结构和 WXSS 换行约束存在。
  - 必须人工确认：标题换行后不遮挡标签、正文、图片或详情按钮，卡片间距仍清楚。

- [ ] 长正文。
  - 建议数据：正文超过 120 个中文字符，包含地点、时间、联系方式占位和标点。
  - 可脚本检查：`.post-summary` 两行截断规则存在。
  - 必须人工确认：正文最多展示两行，省略后不影响底部统计；极短正文和空格较多正文也不造成高度异常。

- [ ] 长地点、距离和时间。
  - 建议数据：`placeName` 使用长商圈/楼层/门口描述，`distanceText` 覆盖近距离和较远距离，`createdText` 覆盖“刚刚”、小时级和日期级文案。
  - 可脚本检查：底部右侧使用 `.post-footer-meta`，并在模板里渲染 `{{item.createdText}} · {{item.distanceText}}`。
  - 必须人工确认：右侧 meta 截断时仍从右对齐，不挤压左侧统计；长地点若只在选中卡片或详情出现，也要确认不会把列表卡片判断混淆。

- [ ] 有图卡片。
  - 建议数据：至少 1 张横图、1 张竖图、1 张加载慢或失败的图片引用。
  - 可脚本检查：`post-thumb` 使用 `mode="aspectFill"` 和 `lazy-load="{{true}}"`。
  - 必须人工确认：图片裁切稳定，加载失败不导致文字列横跳；有图时标题、标签、正文和详情按钮仍在同一视觉节奏中。

- [ ] 无图卡片。
  - 建议数据：当前 `utils/mock-posts.js` 默认均为无图，可作为最小无图样本。
  - 可脚本检查：`.post-main` 无图网格为文本列 + 详情按钮。
  - 必须人工确认：无图卡片不会留下缩略图空位；长标题场景下详情按钮仍贴右可点。

- [ ] 过期和已解决状态。
  - 建议数据：`status: 'expired'`、`status: 'resolved'`，并保留标题较长、正文较长、图片有无两类组合。
  - 可脚本检查：状态标签条件包含 `expired` 的 `neutral` 和 `resolved` 的 `done` class。
  - 必须人工确认：状态标签颜色可区分但不过度抢占；状态标签换行后不把详情入口挤出卡片。

- [ ] 多标签挤压。
  - 建议数据：`lost_found` + `intent` + `stale/resolved/expired`，标题使用长文本，另加图片。
  - 可脚本检查：`.post-inline-tags` 支持 `flex-wrap: wrap`，`.post-title-row` 也支持换行。
  - 必须人工确认：标签不会覆盖标题或进入右侧 chevron 区，整卡可扫读顺序仍为标题、标签、摘要、底部。

## 4. 底部统计与详情入口

- [ ] 左侧统计只承载轻量数字。
  - 可脚本检查：模板中 `post-counts` 只渲染 `确认：{{item.confirmations}}` 和 `过时：{{item.staleCount}}`。
  - 必须人工确认：两项统计在窄屏可同排或自然换行；不会与右侧时间距离重叠。

- [ ] 右侧 meta 只承载时间和距离。
  - 可脚本检查：模板中 `post-footer-meta` 渲染 `createdText` 和 `distanceText`，WXSS 有右对齐和 ellipsis。
  - 必须人工确认：超长 meta 被截断时仍能看出最近更新时间或距离中的一个关键信息；不出现省略号覆盖左侧统计。

- [ ] 详情入口保持稳定。
  - 可脚本检查：详情按钮为 `button.mark-button`，带 `aria-label="查看详情"`、`data-id="{{item.id}}"`、`catchtap="openDetail"`。
  - 必须人工确认：点击详情按钮进入对应任务详情；点击卡片其他区域仍执行聚焦；两者事件不会串扰。

## 5. 宽度与环境验收

当前 DevTools service port blocked，不能把以下项目写成已通过。端口恢复或 UI 可操作后，按下列矩阵补真实证据。

- [ ] DevTools 窄屏模拟器，约 320 到 360 CSS px。
  - 重点：长标题 + 有图 + 多标签 + 右侧 meta 截断。
  - 通过标准：无横向滚动、无文本重叠、详情按钮可点击、底部统计可读。

- [ ] DevTools 常见宽度，约 375 到 414 CSS px。
  - 重点：默认 mock 无图列表、筛选条滚动、抽屉高度、底部 tabBar safe area。
  - 通过标准：列表滚动顺畅，抽屉不遮挡 tabBar，卡片间距稳定。

- [ ] 大屏或折叠屏宽度。
  - 重点：卡片宽度变大后，标题/标签/正文排布不显得散乱，右侧 meta 不离主体过远。
  - 通过标准：信息层级仍可扫读，右侧详情入口位置一致。

- [ ] iOS 真机。
  - 重点：safe area、地图原生层、图片加载、触摸命中、底部抽屉。
  - 通过标准：抽屉底部与系统安全区协调，卡片和按钮没有被系统手势区遮挡。

- [ ] Android 真机。
  - 重点：字体度量、地图原生层、长英文/数字串、低端机图片加载。
  - 通过标准：文字不被裁掉，图片加载失败有可接受占位，不因渲染差异破坏布局。

## 6. 失败记录字段

任何失败、blocked 或 not covered 都要留下可复查摘要。不要只写“样式异常”。

- `checkedAt`：日期和时间，日期使用 `2026-06-14` 所在轮次口径。
- `branch`：`codex/iter-map-list-resilience`。
- `commit`：`git rev-parse --short HEAD`。
- `worktree`：`/tmp/street-tasks-iter-worktrees/map-list-resilience`。
- `environment`：DevTools 模拟器 / iOS 真机 / Android 真机。
- `viewport`：宽度、高度、像素比或设备型号摘要。
- `dataCase`：长标题 / 长正文 / 长地点 / 有图 / 无图 / 过期 / 已解决 / 多标签。
- `postAlias`：使用 `post_001`、`测试任务 A` 等脱敏别名；真实云端 id 可本地留存，不提交完整值。
- `steps`：打开地图、打开列表、切分类、滚动、点击详情等最小复现步骤。
- `expected`：例如“不重叠、可截断、详情入口可点”。
- `actual`：实际错位、遮挡、截断过度、点击串扰或白屏摘要。
- `impact`：阻断详情进入、仅视觉瑕疵、只影响某宽度、只影响某状态等。
- `evidenceLocation`：本地附件编号或外部安全位置，不写真实绝对路径。
- `nextAction`：需要改 WXSS、改结构、补数据、恢复 DevTools 端口或真机复测。

## 7. 脱敏证据规则

- [ ] 原始截图、录屏、二维码、控制台完整日志、云端记录和真实图片只放 ignored 本地附件目录或外部安全位置。
- [ ] 可提交文档只写脱敏摘要，例如“窄屏 DevTools 截图 S-map-01 显示长标题未遮挡详情入口，本地附件留存”。
- [ ] 不提交真实 AppID、openId、unionId、头像 URL、昵称、手机号、精确经纬度、CloudBase 环境 ID、requestId、完整 `cloud://`、token、cookie 或本机绝对路径。
- [ ] 地点用“默认中心附近”“测试 POI”“约 200m 距离”等模糊说法；不要写真实家庭、公司、学校或门牌号。
- [ ] 日志只摘录最小必要错误类型，例如 service port blocked、connection refused、首条红色错误摘要；不要粘贴完整堆栈或 Network 详情。
- [ ] 提交前运行：

  ```bash
  git status --short --ignored
  rg --no-ignore -n -i "(api[_-]?key|secret|token|password|passwd|pwd|private[_-]?key|session|cookie|authorization|bearer|access[_-]?token|refresh[_-]?token|client[_-]?secret|appsecret|wx[0-9a-f]{16,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})" .
  ```

  期望：真实附件和 local 结果仍是 ignored；secret scan 没有新增真实敏感值。若命中的是清单里的规则说明，也要人工确认不是实际凭据。
