# Street Tasks 项目总结

## 项目定位

Street Tasks（街区任务）是一个原生微信小程序，用于发布、浏览和处理附近短时信息。产品以地图为第一入口，帮助用户快速看到身边正在发生的任务或动态，并通过确认、标记过时、举报、评论和关闭等结构化动作，让附近信息持续被更新和校准。

当前版本刻意保持轻量：地图首页、发布流程、任务详情、信任动作、评论、个人中心、反馈入口和轻量管理后台已经形成基本闭环。项目没有固定服务区域，默认支持用户基于当前位置或默认中心浏览和发布内容。

## 核心用户场景

- 浏览附近信息：用户进入地图页后，可以看到附近任务标记、分类筛选、任务列表抽屉和随机查找附近任务入口。
- 发布短时任务：登录用户可以填写分类、标题、详情、地点、过期时间，并可上传最多 4 张图片。
- 查看任务详情：用户可以查看任务内容、图片、发布者、地点、距离、发布时间、评论和状态。
- 参与信息校准：用户可以确认仍有效、标记过时或举报内容，同一用户对同一任务的同一动作会被本地去重。
- 关闭任务：发布者或管理员可以将任务关闭为已解决状态。
- 管理风险内容：管理员可以查看举报、过时、隐藏、已关闭等风险任务，并执行隐藏或关闭操作。
- 提交反馈：用户可以提交功能建议、问题反馈、内容体验等反馈，管理员可在管理台集中查看。

## 技术栈

- 原生微信小程序：`.js`、`.json`、`.wxml`、`.wxss`
- JavaScript ES Modules
- 本地持久化：`wx.getStorageSync` / `wx.setStorageSync`
- 地图与定位：微信 `map` 组件、`wx.getLocation`，坐标类型使用 `gcj02`
- 云端能力：CloudBase 云函数与数据库集合
- 自动化基线：`node scripts/check-json.mjs`、`node harness/check-harness.mjs`

项目没有前端框架、构建器或小程序 npm 组件依赖。UI 以原生组件实现，并参考 TDesign 风格规则维护统一视觉语言。

## 页面结构

| 页面 | 路径 | 主要职责 |
| --- | --- | --- |
| 地图 | `pages/map/map` | 地图首屏、附近任务 marker、分类筛选、列表抽屉、定位、随机发现、进入详情 |
| 发布 | `pages/publish/publish` | 任务表单、分类/失物招领方向、有效期、图片选择压缩上传、当前位置发布 |
| 详情 | `pages/detail/detail` | 任务详情、图片预览、发布者信息、评论、确认/过时/举报、发布者关闭 |
| 管理 | `pages/admin/admin` | 管理员鉴权、风险筛选、搜索、隐藏/关闭任务、反馈查看 |
| 我的 | `pages/me/me` | 本地登录、头像昵称、管理员入口、我的发布/参与统计、反馈入口 |
| 我的发布 | `pages/my-posts/my-posts` | 当前用户发布任务列表和状态统计 |
| 动态 | `pages/activities/activities` | 当前用户确认、过时、举报等参与记录 |
| 反馈 | `pages/feedback/feedback` | 用户反馈提交 |

底部导航使用自定义 tabBar，主 tab 为地图、发布、管理、我的。

## 共享模块

| 模块 | 作用 |
| --- | --- |
| `utils/config.js` | 默认中心、应用信息、CloudBase 配置、分类、失物招领方向、反馈类型、有效期和发布提示文案 |
| `utils/store.js` | 任务数据边界，封装列表、详情、创建、评论、信任动作、关闭、隐藏、图片上传准备，本地和云端 fallback 都在这里处理 |
| `utils/auth.js` | 本地用户、微信资料补全、管理员身份刷新和权限判断 |
| `utils/geo.js` | 距离计算、距离格式化、地图 marker 转换 |
| `utils/format.js` | 分类、状态、动作、时间和有效期文案格式化 |
| `utils/feedback.js` | 反馈创建和反馈列表，支持云端与本地 fallback |
| `utils/post-presenter.js` | 我的发布和动态页复用的任务展示与参与记录整理 |
| `utils/diagnostics.js` | 运行诊断记录，用于地图页启动异常排查 |

## 数据模型

任务是核心数据对象，主要字段包括：

- `id` / `markerId`：任务 id 和地图 marker id。
- `title` / `body` / `category` / `intent`：标题、正文、分类和失物招领方向。
- `placeName` / `latitude` / `longitude`：地点名称和坐标。
- `imageUrls`：图片地址；云端图片使用 `cloud://` fileID。
- `status`：`active`、`stale`、`resolved`、`expired`、`hidden`。
- `confirmations` / `lastConfirmedAt`：有效确认计数和最近确认时间。
- `staleCount` / `reportCount`：过时和举报计数。
- `createdAt` / `expiresAt`：创建时间和过期时间。
- `publisherId` / `publisher` / `publisherAvatarUrl`：发布者身份与展示信息。

评论存储在 `post_comments`，反馈存储在 `feedback_items`，用户对任务的信任动作存储在本地 `post_reactions` 或云端 `post_reactions`。

## 状态规则

- 确认任务会增加 `confirmations`，并记录 `lastConfirmedAt`。
- 同一用户不能重复执行同一条任务的同一种信任动作。
- 标记过时会增加 `staleCount`，达到 3 次后任务变为 `stale`。
- 举报会增加 `reportCount`，达到 2 次后任务变为 `hidden`。
- 关闭任务会将状态设为 `resolved`。
- 已过期任务在列表派生为 `expired`。
- 普通列表不展示 `hidden` 任务；管理员可查看隐藏任务。
- `hidden` 和 `resolved` 属于关闭状态，不再接受评论或信任动作。

## 云端与本地降级

项目当前支持两条数据路径：

1. CloudBase 可用时，帖子、评论、反馈、反应和管理员身份通过云函数处理。
2. 云函数、集合或开发环境不可用时，开发环境会回退到本地 storage 和 mock 数据。

云端相关函数：

- `cloudfunctions/posts`：处理帖子列表、详情、创建、评论、反馈、信任动作、关闭、隐藏和图片上传路径准备。
- `cloudfunctions/getMyRole`：根据 `admins` 集合判断当前 openid 是否为管理员。

需要配置的 CloudBase 集合：

- `posts`
- `post_reactions`
- `post_comments`
- `feedback_items`
- `admins`

图片发布要求更严格：带图任务必须上传到 CloudBase Storage 并保存 `cloud://` fileID。如果云存储或云端帖子保存不可用，带图发布会明确失败，不会退化成本地临时图片路径。

## 设计系统

项目有独立的 `DESIGN_SYSTEM.md`。当前视觉方向是“温暖、克制、本地生活工具感”，避免营销式页面、重渐变和装饰性视觉。关键规则包括：

- 地图保持首屏核心体验。
- 页面使用原生控件实现，暂不引入 `tdesign-miniprogram`。
- 表单按 `FormSection` 组织，底部主操作使用 `BottomAction`。
- 地图列表使用底部抽屉和紧凑任务卡。
- 自定义 tabBar 贴底、不透明，避免内容从底部透出。
- 用户可见文案保持中文。

## 运行与验证

本地运行方式：

1. 使用 WeChat DevTools 打开仓库根目录。
2. 保持 `project.config.json` 的公开占位 appid 为 `touristappid`。
3. 如需真实 AppID，放在已忽略的 `project.private.config.json` 中。

基础验证命令：

```bash
bash harness/init.sh
node scripts/check-json.mjs
node harness/check-harness.mjs
```

`harness/init.sh` 会执行当前项目的基线检查，并提示用 WeChat DevTools 打开项目。由于这是原生微信小程序，用户可见行为仍需要在 WeChat DevTools 或真机中手动验证。

## 当前项目状态

截至最近 harness 记录，基础 JSON 与 harness 自检通过。地图、发布、详情、评论、反馈、管理和个人页已有可运行实现，但部分产品链路仍需要 WeChat DevTools 或真机补充验证证据。

当前最高优先级未完成功能是 `map-feed-001`：地图首页附近任务浏览。最近的实现重点包括：

- 地图首屏改为默认中心 + 本地数据优先，避免启动时被定位、云函数或地图 region 读取阻塞。
- 地图页增加运行诊断，用于白屏或原生层超时排查。
- 地图列表抽屉已铺满 tabBar 上方空间，任务卡展示标题、分类/状态、正文、统计、时间和距离。
- 详情页已支持本地任务 fallback，避免本地列表任务因云端不存在而显示“任务不存在”。

## 已知风险与后续工作

- WeChat DevTools 偶发 `WAServiceMainContext timeout`，目前观察未阻断地图和详情渲染，但仍建议继续跟踪。
- 定位授权、拒绝、超时和真机地图行为仍需要真机验证。
- CloudBase 云函数、数据库集合和 Storage 权限需要部署后做端到端验证。
- 评论目前没有单条举报、隐藏或删除能力，后续需要补充评论治理。
- 缺少自动化的小程序端到端测试和 `utils/store.js` 行为测试。
- 地图高密度场景尚未做聚合、分页或城市级查询优化。
- 发布图片跨用户可见性、超大图片拦截和清理失败路径需要线上环境验证。

## 项目价值小结

Street Tasks 的核心价值是把“附近短时信息”从松散聊天变成可确认、可更新、可关闭的轻量任务流。它不是完整社区平台，而是一个地图优先的本地信息工具：用户可以快速发布身边状态，附近的人可以用低成本动作帮助信息保持可信，管理员也有基本能力处理风险内容。

当前代码结构已经把页面层、共享业务边界、本地持久化和云函数职责分开，适合继续沿着“小范围功能 + harness 证据”的方式迭代。
