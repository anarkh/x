# 地图列表真实视觉 smoke 检查清单

日期：2026-06-14

范围：用于 `codex/iter-map-list-visual-evidence` 分支后续在 WeChat DevTools UI 或真机中执行地图列表真实视觉 smoke。P/Q/R 已经覆盖地图列表静态 guard、readiness 接入和手测准备 helper；本清单只固定真实看屏幕时的观察项、数据变体和证据记录口径，不代表 DevTools 或真机已经通过。

工作目录：`/tmp/street-tasks-iter-worktrees/map-list-visual-evidence`

重要边界：

- [ ] 当前已知 WeChat DevTools service port `9420` 仍可能 blocked；如果无法打开、预览或连接 DevTools，不得把任何视觉项写成 `passed`。
- [ ] 真实手测结果只能写入 ignored 的 `harness/manual-test-results.local*.json`；不要把真实结果写进 `harness/manual-test-results.example.json`。
- [ ] 原始截图、录屏、二维码、完整 Console/Network 日志、云端记录和真实图片只放 ignored 的 `harness/manual-evidence-artifacts/` 或外部安全位置，不提交到仓库。
- [ ] 未执行或环境不可用时，结果写 `not_covered` 或 `blocked`；只有真实打开目标页面并观察到预期表现，才能写 `passed`。

## 1. 准备

- [ ] 确认工作树与分支。

  ```bash
  pwd
  git branch --show-current
  git rev-parse --short HEAD
  git status --short
  ```

  期望：工作树为 `/tmp/street-tasks-iter-worktrees/map-list-visual-evidence`，分支为 `codex/iter-map-list-visual-evidence`；待提交范围只包含本轮预期 QA 清单或后续脱敏摘要。

- [ ] 跑基础 harness。

  ```bash
  bash harness/init.sh
  ```

  期望：JSON 检查和 harness 自检通过。若失败，先记录为基础 blocker，不继续声称视觉 smoke 通过。

- [ ] 准备 ignored 的本地手测结果文件。

  ```bash
  node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-s-map-list.json --force
  ```

  期望：helper 输出 readiness preflight 已运行，且提醒 preflight 不等于 DevTools 或真机视觉验收；生成的 local JSON 保持 ignored。

- [ ] 阅读 readiness 输出，确认地图列表 static guard 已包含在 preflight 中。
- [ ] 打开 WeChat DevTools UI 时使用本 worktree，保留 `project.config.json` 的公开 `appid: touristappid`；真实 AppID 只在本机 `project.private.config.json` 中使用，不能提交。
- [ ] 若 DevTools CLI 或 UI 因 `9420`、服务端口、登录态、项目导入失败等原因不可用，在 local JSON 中把对应 journey 写为 `blocked`，并记录最小错误摘要。

## 2. 环境记录

每次真实视觉 smoke 至少记录以下字段；不要写敏感原始值。

- [ ] `checkedAt`：执行时间，包含时区或本地日期。
- [ ] `branch`：`codex/iter-map-list-visual-evidence`。
- [ ] `commit`：`git rev-parse --short HEAD` 的短 SHA。
- [ ] `worktree`：本 worktree 的路径摘要，不需要写个人用户目录之外的敏感路径。
- [ ] `runner`：QA 执行人或 agent 标识。
- [ ] `entry`：WeChat DevTools UI、真机预览、真机调试或其他入口。
- [ ] `devtoolsVersion`：DevTools 版本；无法获取时写 `not_covered`。
- [ ] `baseLibrary`：基础库版本；无法获取时写 `not_covered`。
- [ ] `device`：模拟器机型或真机型号摘要，例如 iPhone 带安全区、Android 常见宽度。
- [ ] `viewport`：宽高、像素比或屏幕宽度档位；不要依赖截图文件名承载这些信息。
- [ ] `safeArea`：是否带 Home 指示条、底部安全区、状态栏/胶囊影响。
- [ ] `network`：在线、弱网、断网或未覆盖。
- [ ] `locationPermission`：允许、拒绝、未触发或未覆盖。
- [ ] `dataSource`：mock/local storage、CloudBase、临时测试数据或未确认。
- [ ] `resultFile`：例如 `harness/manual-test-results.local-s-map-list.json`，确认该文件 ignored。
- [ ] `evidenceRefs`：只写脱敏附件编号，例如 `S-map-01`、`S-map-scroll-02`，不写原始截图路径。

## 3. 地图列表视觉项

### 3.1 首屏与地图原生层

- [ ] 地图页首屏显示默认中心或定位后的地图，不出现白屏、无限 loading 或不可理解的空状态。
- [ ] 原生 `map` 层与上层 `cover-view`/列表抽屉层级正确；抽屉打开后列表内容位于地图之上，不被地图瓦片、marker 或定位控件盖住。
- [ ] 抽屉关闭或半开时，地图 marker 可见且不会与底部 tabBar、列表入口、浮层按钮产生遮挡。
- [ ] 抽屉打开后滚动列表时，手势优先滚动列表，不应误触发地图拖动或缩放。
- [ ] 地图原生层偶发 `WAServiceMainContext timeout` 时，若页面仍可操作，只能记录为已知 console 风险；若阻断渲染或交互，则记录 `failed` 或 `blocked`，不能忽略。

### 3.2 抽屉、安全区与底部区域

- [ ] 列表抽屉顶部、筛选条、滚动区域和底部边界清晰，抽屉高度铺到 tabBar 上沿，不压住 tabBar。
- [ ] iPhone 带 Home 指示条设备上，抽屉底部、tabBar 和系统安全区之间没有文字、按钮或卡片被裁切。
- [ ] Android 常见屏宽下，抽屉底部不留异常空洞，也不把最后一张卡片压在 tabBar 后方。
- [ ] 横向较窄设备上，抽屉头部计数、筛选条和列表内容不互相重叠。
- [ ] 切换分类筛选时，抽屉高度和滚动容器稳定，不出现布局跳动到地图背后。

### 3.3 卡片信息层级

- [ ] 卡片阅读顺序清楚：标题、分类/状态标签、正文摘要、底部统计、时间距离、详情入口。
- [ ] 长标题可以自然换行或截断，不覆盖分类标签、状态标签、缩略图、底部统计或详情入口。
- [ ] 长正文最多占用预期摘要高度，省略后不遮挡下一张卡片，也不把底部统计挤出卡片。
- [ ] 标题后同时出现分类、失物/招领方向和非 active 状态时，标签可换行但仍归属于标题区域。
- [ ] 底部左侧“确认/过时”统计轻量可读，右侧时间/距离右对齐且必要时截断，左右两侧不重叠。
- [ ] 计数为两位数或三位数时，卡片高度变化可接受，详情入口仍保持固定触摸区域。
- [ ] 空列表状态、单条列表和多条列表状态都没有视觉塌陷或异常留白。

### 3.4 图片与无图

- [ ] 无图卡片不保留缩略图空位，正文列自然占满可用宽度。
- [ ] 单图卡片缩略图比例稳定，加载前后不造成标题、标签或详情入口横跳。
- [ ] 多图任务如果列表只取封面图，封面图呈现稳定；如列表展示多图入口，也不得挤压正文和详情入口。
- [ ] 图片加载失败时，卡片仍可读、可滚动、可进入详情；失败占位不遮挡文字。
- [ ] 竖图、横图、深色图和浅色图都不影响文字可读性；列表不依赖图片内容承载关键信息。

### 3.5 列表滚动

- [ ] 列表超过一屏时，只滚动列表区域；抽屉头部、筛选条和底部 tabBar 保持稳定。
- [ ] 快速上滑/下滑不会出现卡片重叠、空白闪烁、地图层穿透或点击区域错位。
- [ ] 滚动到最后一条时，最后一张卡片底部完整可见，不被 tabBar、安全区或系统手势区遮挡。
- [ ] 滚动过程中图片懒加载不会导致已阅读位置明显跳动。
- [ ] 切换分类后滚动位置表现可理解；若回到顶部，应记录为预期或后续产品问题，不混写成视觉通过。

## 4. 交互项

- [ ] 点击 marker 后，选中态、列表对应任务或详情入口关系清楚；marker 对应的任务标题与列表/详情一致。
- [ ] 点击列表卡片主体时，若预期为聚焦地图或选中任务，地图和列表反馈一致，不误进入错误详情。
- [ ] 点击卡片右侧详情入口时，进入对应任务详情页，详情页标题、分类、正文与列表卡片一致。
- [ ] 从详情页返回地图页后，地图列表状态可恢复；不出现白屏、抽屉丢失、滚动锁死或 marker 丢失。
- [ ] 筛选分类后，marker、列表卡片和详情页仍指向同一任务集合；不出现列表有任务但 marker/detail 不匹配。
- [ ] 点击“查找附近任务”或定位按钮后，列表仍可打开并显示与地图中心一致的任务；定位失败时保留可浏览状态。
- [ ] 在列表滚动中点击详情入口，事件不应被滚动手势吞掉；若误触或无响应，需要记录复现手势和设备。
- [ ] 详情页出现“任务不存在”时，记录为链路失败；不要只用列表渲染正常来判定 smoke 通过。

## 5. 数据变体

执行真实视觉 smoke 时至少覆盖以下变体；无法准备的数据写 `not_covered`，不要补写为通过。

- [ ] 长标题：40 到 80 个中文字符；另测一条连续英文/数字长串。
- [ ] 长正文：超过 120 个中文字符，包含时间、地点、补充说明和标点。
- [ ] 无图任务：使用默认 mock/local storage 样本或明确无图片的测试任务。
- [ ] 有图任务：至少覆盖 1 张图片；如果条件允许，再覆盖多图、加载慢和加载失败。
- [ ] 状态组合：active、stale、resolved、expired 至少各一条；hidden 不应出现在普通列表。
- [ ] 分类组合：求助、跑腿、失物招领、地点动态等常见分类；失物招领需覆盖 lost/found 方向。
- [ ] 计数组合：确认/过时为 0、1、两位数；高计数无法准备时写 `not_covered`。
- [ ] 时间距离组合：刚刚/小时级/日期级，近距离/较远距离；异常距离文案写明数据条件。
- [ ] 列表数量：0 条、1 条、超过一屏；超过一屏用于滚动和底部安全区观察。
- [ ] 宽度组合：320-360、375-414、较大屏宽；真机 iOS/Android 条件不足时分别写 `not_covered` 或 `blocked`。

## 6. 失败 / blocked 记录

遇到失败或阻塞时，用可复查摘要记录，不要只写“样式异常”。

- [ ] `status` 只使用 `failed`、`blocked`、`not_covered` 或真实观察后的 `passed`。
- [ ] `blockedReason`：例如 `9420 service port timeout`、DevTools 未登录、项目无法导入、真机不可用、测试数据无法准备。
- [ ] `dataCase`：长标题、有图、无图、安全区、原生 map 覆盖、滚动、marker/list/detail 链路等。
- [ ] `steps`：最小复现步骤，从打开地图页、打开列表、切换筛选、滚动、点击 marker/详情开始写。
- [ ] `expected`：明确期望，例如“不重叠、可截断、详情入口可点、返回后列表恢复”。
- [ ] `actual`：实际表现摘要，例如“标题覆盖详情箭头”“滚动时地图层穿透”“点击详情进入任务不存在”。
- [ ] `impact`：阻断核心链路、影响某设备、纯视觉瑕疵、证据不足或环境阻塞。
- [ ] `evidence`：脱敏附件编号和证据类型，不写真实路径、完整日志或云端 id。
- [ ] `nextAction`：需要恢复 DevTools 端口、补测试数据、调整 WXSS、排查 map 原生层、补详情 fallback 或真机复测。

示例 blocked 摘要：

```json
{
  "journey": "map-list-visual-smoke",
  "status": "blocked",
  "blockedReason": "WeChat DevTools service port 9420 timeout; UI visual smoke was not executed.",
  "evidence": ["命令摘要本地留存，未提交原始日志"],
  "nextAction": "在 DevTools UI 确认服务端口开启后重新执行真实视觉 smoke"
}
```

## 7. 证据卫生

- [ ] 本地真实结果文件必须匹配 `harness/manual-test-results.local*.json`，并保持 ignored。
- [ ] 本地脱敏摘要草稿必须匹配 `harness/manual-test-summary.local*.md`，并保持 ignored。
- [ ] 原始附件只放 `harness/manual-evidence-artifacts/` 或外部安全位置；该目录 ignored，不要 `git add -f`。
- [ ] 可提交文档只写观察结论和附件编号，例如“截图 S-map-03 本地留存，显示长标题未遮挡详情入口”。
- [ ] 不提交真实截图、录屏、二维码、完整 Console/Network、云函数日志、数据库截图或 Storage 权限截图。
- [ ] 不写真实 AppID、openId、unionId、头像 URL、昵称、手机号、精确经纬度、CloudBase env id、request id、完整 `cloud://`、token、cookie 或本机绝对路径。
- [ ] 地点和用户使用角色化描述，例如“默认中心附近”“测试 POI”“用户 A”“游客态”，不要写可识别真实个人或住址的信息。
- [ ] 如果需要分享失败画面，先裁剪或打码；提交前仍只保留脱敏摘要，原图不进仓库。
- [ ] 提交前用 `git status --short --ignored` 确认 local JSON、local summary 和附件目录没有进入待提交列表。

## 8. 收尾验证

真实视觉 smoke 执行完成或被阻塞后，至少跑以下检查并记录结果。

- [ ] 校验本地手测结果结构。

  ```bash
  node scripts/check-manual-evidence.mjs harness/manual-test-results.local-s-map-list.json
  ```

  若手测未执行，local JSON 应保留 `blocked` 或 `not_covered`，不要为了通过检查改成 `passed`。

- [ ] 校验证据卫生。

  ```bash
  node scripts/check-evidence-hygiene.mjs
  ```

- [ ] 跑基础 harness。

  ```bash
  bash harness/init.sh
  ```

- [ ] 检查 Markdown 和代码 diff 空白。

  ```bash
  git diff --check
  ```

- [ ] 检查工作树。

  ```bash
  git status --short --ignored
  ```

  期望：可提交改动只包含预期 QA 清单或脱敏报告；`harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md` 和 `harness/manual-evidence-artifacts/` 仍为 ignored。

- [ ] 最终报告必须区分三类结果：自动 readiness/preflight 已通过、真实 DevTools/真机视觉 smoke 已通过、真实视觉 smoke 因环境或数据被 `blocked/not_covered`。不得用第一类替代第二类。
