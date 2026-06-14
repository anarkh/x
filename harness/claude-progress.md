# 进度日志

## 当前已验证状态

- 仓库根目录：`/Users/bytedance/git/x`
- 标准启动路径：在 WeChat DevTools 中打开仓库，使用 `project.config.json`，公开 appid 保持 `touristappid`
- 标准初始化入口：`bash harness/init.sh`
- 标准基础验证：`npm run check:json`，`node harness/check-harness.mjs`
- 当前最高优先级未完成功能：`map-feed-001`
- 当前正在实现的用户请求：优化地图信息列表卡片布局；已改为列表抽屉铺满、标题后展示分类/状态、标题下展示详情、底部左侧展示简单统计、右侧展示时间和距离
- 当前 blocker：任务详情不存在问题在 DevTools 中已验证缓解；地图原生层仍会偶发输出 `WAServiceMainContext timeout`，但页面可显示且详情链路可用；定位按钮、真机授权、云端数据、图片跨用户可见性仍需要真机或部署后验证

## 会话记录

### Session 001

- 日期：2026-05-13
- 本轮目标：按 Learn Harness Engineering 中文教程和模板，为本仓库建立最小可用 harness；除根 `AGENTS.md` 外，新增文件都放在 `harness/`
- 已完成：已创建 harness 入口、功能清单、进度日志、交接、收尾、评审和质量快照；根 `AGENTS.md` 已指向 `harness/`
- 运行过的验证：`npm run check:json`；`node harness/check-harness.mjs`；`bash harness/init.sh`
- 已记录证据：`npm run check:json` 输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通，`npm ci --ignore-scripts` 报告 up to date，随后两条验证通过
- 提交记录：未提交
- 更新过的文件或工件：`AGENTS.md`，`harness/*`
- 已知风险或未解决问题：工作树在本轮开始前已有大量业务改动，本轮不归属这些改动；小程序用户流程尚未经 WeChat DevTools 手动验证
- 下一步最佳动作：从 `map-feed-001` 开始做 WeChat DevTools 手动验证，补充地图首页证据

### Session 002

- 日期：2026-05-14
- 本轮目标：对任务详情添加评论功能
- 已完成：为详情页新增评论区、空内容/长度校验、评论列表展示；详情页已移除内嵌地图和独立指标卡，确认/过时/举报改为一行三列并在控件上直接显示数量；评论列表默认不展示发布面板，右下方悬浮按钮会打开底部评论弹窗；`utils/store.js` 新增本地 `post_comments` 存储和 CloudBase fallback；`cloudfunctions/posts` 新增 `listComments` 与 `createComment` action
- 运行过的验证：`node --check utils/store.js`；`node --check pages/detail/detail.js`；`node --check cloudfunctions/posts/index.js`；`npm run check:json`；`node harness/check-harness.mjs`；`bash harness/init.sh`
- 已记录证据：三条 `node --check` 均通过，无语法错误输出；`npm run check:json` 输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通，`npm ci --ignore-scripts` 报告 up to date，随后两条验证通过；紧凑详情布局和悬浮评论弹窗分别改完后再次跑同一组验证仍通过
- 更新过的文件或工件：`utils/store.js`，`cloudfunctions/posts/index.js`，`pages/detail/detail.js`，`pages/detail/detail.wxml`，`pages/detail/detail.wxss`，`README.md`，`TODOS.md`，`harness/feature_list.json`
- 已知风险或未解决问题：评论用户流程仍需 WeChat DevTools 手动验证；云端使用前需要部署更新后的 `posts` 云函数并准备 `post_comments` 集合，未部署时客户端会回落本地评论存储
- 下一步最佳动作：在 WeChat DevTools 中验证 active、resolved/expired、游客和登录用户评论流程，并确认详情页无地图、信任动作一行展示、右下悬浮评论按钮和弹窗发布体验正常

### Session 003

- 日期：2026-05-14
- 本轮目标：修复“反馈建议只存在用户本地，管理员无法集中查看”的产品缺口
- 已完成：`utils/feedback.js` 改为调用 `posts` 云函数的 `createFeedback`/`listFeedback` action；`cloudfunctions/posts` 新增 `feedback_items` 集合写入和管理员读取；反馈提交页改为等待云端结果，失败时提示；管理台异步读取反馈并在云函数或集合配置异常时显示错误；README 补充 CloudBase 集合要求
- 运行过的验证：`node --check utils/feedback.js`；`node --check pages/feedback/feedback.js`；`node --check pages/admin/admin.js`；`node --check cloudfunctions/posts/index.js`；`git diff --check`；`npm run check:json`；`node harness/check-harness.mjs`；`bash harness/init.sh`
- 已记录证据：四条 `node --check` 均通过，无语法错误输出；`git diff --check` 通过；`npm run check:json` 输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通，依赖 up to date，随后 JSON 和 harness 自检通过
- 更新过的文件或工件：`utils/feedback.js`，`pages/feedback/feedback.js`，`pages/admin/admin.js`，`pages/admin/admin.wxml`，`cloudfunctions/posts/index.js`，`utils/config.js`，`README.md`，`harness/claude-progress.md`
- 已知风险或未解决问题：尚未在 WeChat DevTools 中提交真实反馈；尚未部署更新后的 `posts` 云函数；CloudBase 需要存在 `feedback_items` 集合，否则提交/管理台会显式失败而不是静默落本地
- 下一步最佳动作：部署 `posts` 云函数并创建 `feedback_items` 集合后，用普通用户提交反馈，再用管理员账号打开管理台确认能看到该反馈

### Session 004

- 日期：2026-05-15
- 本轮目标：修复发布图片只存在本地、其他用户浏览不到的问题，同时限制图片存储压力
- 已完成：发布页选图改为最多 4 张，压缩后单张需小于 1.5MB；图片提交时必须上传 CloudBase Storage 并保存 `cloud://` fileID；图片帖子设置 `requireCloud`，云端帖子保存失败时不再回退成本地帖子；定位先于上传执行，上传后若帖子保存失败会清理新上传的云文件并重置图片项；`posts` 云函数图片数量上限同步为 4，并在 `prepareUpload` 返回大小上限；README 补充图片云存储要求；`harness/init.sh` 支持当前无 npm 且无依赖的 Codex 环境
- 运行过的验证：`node --check pages/publish/publish.js`；`node --check utils/store.js`；`node --check cloudfunctions/posts/index.js`；`git diff --check`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`bash harness/init.sh`
- 已记录证据：三条 `node --check` 均通过，无语法错误输出；`git diff --check` 通过；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 在 npm 不存在但 package-lock 无外部依赖时跳过安装，随后 JSON 和 harness 自检通过
- 更新过的文件或工件：`pages/publish/publish.js`，`pages/publish/publish.wxml`，`utils/store.js`，`cloudfunctions/posts/index.js`，`README.md`，`harness/init.sh`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：尚未在 WeChat DevTools 或真机中实际选择图片发布；尚未部署更新后的 `posts` 云函数；CloudBase Storage 读权限和跨用户图片显示仍需线上验证
- 下一步最佳动作：部署 `posts` 云函数后，用用户 A 发布含图片任务，再用用户 B 打开地图/详情确认能看到图片，并尝试上传超大图片确认被拦截

### Session 005

- 日期：2026-05-18
- 本轮目标：按照小程序/TDesign 式设计系统改进现有 UI，降低 AI 生成页面的模板感和旧感
- 已完成：新增 `DESIGN_SYSTEM.md`，明确本项目的用途、视觉方向、TDesign 策略、语义色、字号和 QA 清单；统一全局背景、卡片、标签、按钮、表单控件和语义状态色；优化自定义 tabBar 为浮动胶囊式底栏；重做地图页列表入口、工具按钮、选中卡片和列表抽屉样式；同步刷新详情、发布、反馈、管理、我的、我的发布和参与记录页面的主要视觉样式
- 运行过的验证：`node scripts/check-json.mjs`；`git diff --check`；`node harness/check-harness.mjs`；`bash harness/init.sh`
- 已记录证据：`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`git diff --check` 通过，无输出；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通，npm-free fallback 跳过安装，随后 JSON 和 harness 自检通过
- 更新过的文件或工件：`DESIGN_SYSTEM.md`，`app.json`，`app.wxss`，`custom-tab-bar/index.wxml`，`custom-tab-bar/index.wxss`，`pages/map/map.wxml`，`pages/map/map.wxss`，`pages/detail/detail.wxml`，`pages/detail/detail.wxss`，`pages/publish/publish.wxss`，`pages/feedback/feedback.wxss`，`pages/admin/admin.wxss`，`pages/me/me.wxss`，`pages/my-posts/my-posts.wxss`，`pages/activities/activities.wxss`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：没有安装 `tdesign-miniprogram` 依赖，原因是当前仓库没有小程序 npm 构建链路且本地 baseline 会在 npm 不存在时跳过安装；本轮采用 TDesign 式 token 和控件规则落地。尚未在 WeChat DevTools 或真机中做截图验收，tabBar safe area、地图浮层和表单视觉仍需手动确认。
- 下一步最佳动作：在 WeChat DevTools 中打开地图、发布、详情、我的和管理页，确认浮动 tab、地图抽屉、详情图片、评论弹窗和表单控件在常见手机宽度下无遮挡和溢出。

### Session 006

- 日期：2026-05-18
- 本轮目标：修正底部 tabBar 悬浮导致表单页底部内容透出、主按钮被压在后方的视觉问题
- 已完成：自定义 tabBar 从浮动胶囊改为贴底不透明导航栏，保留 active 背景和橙色短指示条；地图页工具按钮、选中任务卡和列表抽屉的底部偏移同步调整，列表抽屉贴到 tabBar 上沿；`DESIGN_SYSTEM.md` 增加“tabBar 贴底且不留透底间隙”的规则
- 运行过的验证：`bash harness/init.sh`；`git diff --check`；`node harness/check-harness.mjs`
- 已记录证据：`bash harness/init.sh` 完整跑通，npm-free fallback 跳过安装，随后 JSON 和 harness 自检通过；`git diff --check` 通过，无输出；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`
- 更新过的文件或工件：`custom-tab-bar/index.wxss`，`pages/map/map.wxss`，`DESIGN_SYSTEM.md`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机中重新截图确认发布页底部、地图抽屉和 safe area 表现。
- 下一步最佳动作：在 WeChat DevTools 中打开发布页，确认底部按钮不再从 tabBar 下方透出；再打开地图页列表抽屉，确认抽屉底部与 tabBar 上沿衔接自然。

### Session 007

- 日期：2026-05-19
- 本轮目标：调用 `design-ui-designer` skill，把上一轮 UI 优化方案落地到核心页面，优先让发布页和地图页产生可见质感变化
- 已完成：新增全局 `BottomAction` 固定底部操作区样式；发布页改成“任务内容”和“分类与位置”两个 `FormSection`，分类从 picker 改为两列直接点选按钮，提交按钮固定在 tabBar 上方；地图列表抽屉新增 `DrawerCounter` 屏幕内计数，任务卡信号改成确认/过时/有效期三枚 `SignalPill`；`DESIGN_SYSTEM.md` 补充 BottomAction、FormSection、CategoryOption、DrawerCounter、SignalPill 组件规范
- 运行过的验证：`node --check pages/publish/publish.js`；`node scripts/check-json.mjs`；`git diff --check`；`node harness/check-harness.mjs`；`bash harness/init.sh`
- 已记录证据：`node --check pages/publish/publish.js` 通过；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`git diff --check` 通过，无输出；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通，npm-free fallback 跳过安装，随后 JSON 和 harness 自检通过
- 更新过的文件或工件：`app.wxss`，`pages/publish/publish.wxml`，`pages/publish/publish.wxss`，`pages/publish/publish.js`，`pages/map/map.wxml`，`pages/map/map.wxss`，`DESIGN_SYSTEM.md`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机中确认发布页固定底部操作区是否与键盘、tabBar、safe area 完全协调；地图抽屉新增计数和三指标信息栏仍需截图验收。
- 下一步最佳动作：在 WeChat DevTools 中打开发布页逐项填写并滚动到底部，确认固定提交区不遮挡表单；打开地图页列表抽屉，确认任务卡三指标不挤压、不溢出。

### Session 008

- 日期：2026-05-21
- 本轮目标：修复 UI 优化后小程序打开白屏/报错的问题
- 已完成：检查项目日志、微信开发者工具本地日志、WXML/WXSS 全量本地编译和 JS 语法；未发现模板、样式或 JS 语法错误；将自定义 tabBar 中新增的空 `cover-view` 指示条、绝对定位和裁剪样式移除，保留贴底不透明导航栏与 active 背景，降低 `cover-view` 渲染兼容风险
- 运行过的验证：微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；`node --check pages/map/map.js`；`node --check pages/publish/publish.js`；`node scripts/check-json.mjs`；`git diff --check`；`bash harness/init.sh`
- 已记录证据：全量 WXML/WXSS 本地编译均通过，无错误输出；两条 `node --check` 均通过，无语法错误输出；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`git diff --check` 通过，无输出；`bash harness/init.sh` 完整跑通，npm install up to date，随后 JSON 和 harness 自检通过
- 更新过的文件或工件：`custom-tab-bar/index.wxml`，`custom-tab-bar/index.wxss`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：无法在当前安全约束下调用 DevTools preview 生成预览包；仍需用户在已打开的 WeChat DevTools 中重新编译确认白屏是否消失。若仍白屏，需要记录控制台第一条红色错误。
- 下一步最佳动作：在 WeChat DevTools 中重新编译项目，先看地图 tab 是否恢复；再切到发布 tab，确认底部固定提交区和贴底 tabBar 正常显示。

### Session 009

- 日期：2026-05-21
- 本轮目标：继续修复“打开页面依然白屏，并且没有日志可确认错误原因”
- 已完成：用 WeChat DevTools 直接确认模拟器先报 `TypeError: Cannot read property 'subPackages' of undefined`，该错误来自 DevTools hot reload/getAppConfig；新增 `utils/diagnostics.js` 记录运行诊断；`app.js` 对 CloudBase 初始化、用户初始化、全局错误和未处理 Promise 增加保护；`utils/store.js` 在云端读取失败时记录诊断并回落本地 mock；地图页新增启动诊断面板，启动失败时可直接在页面上看到最近错误；通过 DevTools UI 清除编译缓存、终止模拟器并重新编译后，地图页恢复显示，控制台清空后再次编译无调试器错误
- 运行过的验证：`node --check app.js`；`node --check utils/diagnostics.js`；`node --check utils/store.js`；`node --check pages/map/map.js`；`node scripts/check-json.mjs`；`git diff --check`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；`node harness/check-harness.mjs`；`bash harness/init.sh`；WeChat DevTools 手动清编译缓存、终止模拟器、重新编译并观察地图页
- 已记录证据：四条 `node --check` 均通过，无语法错误输出；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`git diff --check` 通过，无输出；全量 WXML/WXSS 本地编译均通过，无错误输出；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通，npm install up to date，随后 JSON 和 harness 自检通过；WeChat DevTools 地图页显示地图、底部 tabBar 和列表入口，页面路径为 `pages/map/map`；清空控制台后再次编译，调试器错误为 0
- 更新过的文件或工件：`utils/diagnostics.js`，`app.js`，`utils/store.js`，`pages/map/map.js`，`pages/map/map.wxml`，`pages/map/map.wxss`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：DevTools CLI 清缓存需要开启服务端口，本轮没有开启该设置，改用 DevTools UI 完成清编译缓存；尚未真机验证定位授权、地图 marker 点击和发布页完整流程；云函数/CloudBase Storage 仍需部署后验证
- 下一步最佳动作：在 DevTools 中点“列表”打开地图抽屉，再切到发布 tab 检查固定底部按钮和 tabBar 贴底效果；随后真机验证定位授权和云端数据路径

### Session 010

- 日期：2026-05-21
- 本轮目标：修复清缓存后仍可能出现的 `Error: timeout`，并确认打开地图页不再白屏
- 已完成：`utils/store.js` 新增 `listPosts(center, { localOnly: true })` 路径；地图首页首屏改为默认中心 + 本地帖子优先展示，不再启动时自动请求定位、不再启动时调用 CloudBase 列表、不再启动时读取 `mapContext.getRegion`；`map` 组件的 `show-location` 改为定位成功后才开启；地图抽屉文案从“屏幕内”调整为“附近”，避免取消首屏 region 读取后的语义不一致
- 运行过的验证：`node --check utils/store.js`；`node --check pages/map/map.js`；`node scripts/check-json.mjs`；`git diff --check`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；`node harness/check-harness.mjs`；`bash harness/init.sh`；WeChat DevTools 清空控制台后重新编译地图页
- 已记录证据：两条 `node --check` 均通过，无语法错误输出；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`git diff --check` 通过，无输出；`wcc` 和 `wcsc -lc` 全量编译退出码为 0；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通，npm install up to date，随后 JSON 和 harness 自检通过；WeChat DevTools 地图页显示地图、marker、底部 tabBar 和列表入口，清空控制台并重新编译后调试器显示 Errors: 0，未再出现 `Error: timeout`
- 更新过的文件或工件：`utils/store.js`，`pages/map/map.js`，`pages/map/map.wxml`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：定位按钮仍会在用户点击时调用 `wx.getLocation`，需要真机验证授权/拒绝/超时三种路径；地图首屏现在以本地 mock/storage 数据兜底，云端列表不会阻塞首屏，后续若要实时云端 feed 需要加后台刷新策略；DevTools 仍有热重载、SharedArrayBuffer、getSystemInfo 三条非阻塞警告
- 下一步最佳动作：在真机或 DevTools 中点击“返回当前位置”验证定位授权分支；再打开列表抽屉和任务详情确认交互链路完整

### Session 011

- 日期：2026-05-21
- 本轮目标：解释并修复“任务列表里好几个任务点击详情提示任务不存在”
- 已完成：确认根因是地图列表首屏使用本地 mock/storage 数据，而详情页 `getPost` 在 CloudBase 可用时只查云函数；当云端没有这些本地任务 id 时会返回 `post: null`，详情页因此显示不存在。`utils/store.js` 现在会先记住本地同 id 任务，云端 get 返回空或 `NOT_FOUND` 时回落本地；`NOT_FOUND` 也纳入评论/信任动作的本地 fallback 范围，保证本地列表任务进入详情后评论区和操作链路不再被云端缺失拦住。
- 运行过的验证：`node --check utils/store.js`；`node --check pages/detail/detail.js`；`node scripts/check-json.mjs`；`git diff --check`；`bash harness/init.sh`；WeChat DevTools 从地图列表打开“测试”任务详情
- 已记录证据：两条 `node --check` 均通过，无语法错误输出；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`git diff --check` 通过，无输出；`bash harness/init.sh` 完整跑通，npm install up to date，随后 JSON 和 harness 自检通过；WeChat DevTools 中打开列表后点击“测试”的“查看详情”，详情页显示任务标题、正文、状态、信任动作和评论区，没有再显示“任务不存在”
- 更新过的文件或工件：`utils/store.js`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：DevTools 仍会偶发输出 `WAServiceMainContext timeout`，当前观察它来自小程序/地图原生层而不是详情数据缺失；若要彻底压掉，需要继续单独排查地图组件本身或 DevTools 模拟器行为
- 下一步最佳动作：再点列表里的失物招领、求助问答、地点动态各一条进入详情，确认多分类 id 都能走本地 fallback；随后再决定是否继续单独处理原生 timeout

### Session 012

- 日期：2026-05-21
- 本轮目标：详情页添加发布者头像和名称，并与地址/时间同排展示
- 已完成：`pages/detail/detail.js` 为详情数据补充发布者名称、头像 URL 和无头像首字兜底；`pages/detail/detail.wxml` 将原底部元信息改成左侧发布者、右侧地点/距离/发布时间的同排布局；`pages/detail/detail.wxss` 增加头像、名称省略和右侧元信息右对齐样式
- 运行过的验证：`bash harness/init.sh`；`node --check pages/detail/detail.js`；`node scripts/check-json.mjs`；`git diff --check`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；`node harness/check-harness.mjs`；WeChat DevTools 查看详情页渲染
- 已记录证据：`bash harness/init.sh` 完整跑通，npm install up to date，随后 JSON 和 harness 自检通过；`node --check pages/detail/detail.js`、`node scripts/check-json.mjs`、`git diff --check`、全量 WXML/WXSS 编译和 `node harness/check-harness.mjs` 均通过；WeChat DevTools 详情页可见左侧“匿名用户”和右侧“大钟寺广场 · 226m · 23天前”同排展示
- 更新过的文件或工件：`pages/detail/detail.js`，`pages/detail/detail.wxml`，`pages/detail/detail.wxss`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：DevTools 控制台仍显示既有的原生 `WAServiceMainContext timeout`，本轮观察该错误未阻断详情页渲染；发布者行的真实头像展示仍需在已设置头像的账号上验证
- 下一步最佳动作：用一个已登录且设置头像的发布者发布任务后进入详情，确认真实头像展示；再在更长地点名称的数据上确认右侧文本省略符合预期

### Session 013

- 日期：2026-05-21
- 本轮目标：按反馈优化地图信息列表卡片布局和抽屉高度
- 已完成：地图列表抽屉改为 `flex` 纵向布局并撑满 tabBar 上方空间；任务卡取消三块指标卡，分类/状态标签移动到标题后面；标题下展示任务正文；底部左侧改为 `确认：数量`、`过时：数量` 的轻量文字，右侧显示发布时间和距离；右侧详情入口从粗边框箭头改为居中轻量 `›`
- 运行过的验证：`bash harness/init.sh`；`node --check pages/map/map.js`；`node scripts/check-json.mjs`；`git diff --check`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；`node harness/check-harness.mjs`；WeChat DevTools 查看打开的信息列表
- 已记录证据：`bash harness/init.sh` 完整跑通，npm install up to date，随后 JSON 和 harness 自检通过；`node --check pages/map/map.js`、`node scripts/check-json.mjs`、`git diff --check`、全量 WXML/WXSS 编译和 `node harness/check-harness.mjs` 均通过；WeChat DevTools 中信息列表铺到 tabBar 上沿，卡片显示“标题 + 打卡/已过期标签”、正文、底部统计和右侧时间距离
- 更新过的文件或工件：`pages/map/map.wxml`，`pages/map/map.wxss`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：DevTools 控制台仍显示既有的原生 `WAServiceMainContext timeout`，本轮观察该错误未阻断地图列表渲染；更长标题和带图卡片仍建议真机再看一次
- 下一步最佳动作：在真机或 DevTools 不同机型宽度下打开信息列表，确认标题较长、正文较长和带图卡片都不挤压底部统计

### Session 014B

- 日期：2026-06-12
- 分支：`codex/iter-publish-flow`
- 本轮目标：B 组产品/设计/开发探索发布流程迭代
- 产品假设：用户在提交时才触发定位和校验会造成失败感；把发布准备度和位置确认前置，应提升表单完成率
- 已完成：新增 `pages/publish/publish-state.js` 计算身份、内容、分类和位置准备度；发布页新增发布准备清单、标题/详情字数提示、当前位置显式确认、有效期直接按钮和动态底部提交文案；新增 `scripts/check-publish-flow.mjs`
- 运行过的验证：`node --check pages/publish/publish.js`；`node --check pages/publish/publish-state.js`；`node --no-warnings scripts/check-publish-flow.mjs`
- 已记录证据：两条 `node --check` 通过；`node --no-warnings scripts/check-publish-flow.mjs` 输出 `Publish flow checks passed.`
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机验证定位授权、键盘遮挡、位置确认失败恢复、图片上传和真实发布闭环
- 下一步最佳动作：在 WeChat DevTools 用游客和登录用户分别打开发布页，验证准备度清单、定位确认、必填提示、图片和发布成功链路

### Session 015B

- 日期：2026-06-12
- 分支：`codex/iter-publish-flow`
- 本轮目标：按用户评测报告收敛发布准备度的定位失败和重试路径
- 已完成：`buildPublishState` 细化 locating/failed/ready 文案；只缺当前位置时底部按钮可直接触发定位确认；定位失败文案改为检查授权或重试；发布检查脚本覆盖定位中、待确认、失败重试和失物招领方向补齐
- 运行过的验证：`node --no-warnings scripts/check-publish-flow.mjs`
- 已记录证据：`node --no-warnings scripts/check-publish-flow.mjs` 输出 `Publish flow checks passed.`
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机验证定位授权弹窗、拒绝/超时恢复、键盘遮挡和图片上传失败回滚
- 下一步最佳动作：跑完整自动验证后，在真机或 DevTools 中验证定位允许、拒绝、重试三条路径

### Session 016B

- 日期：2026-06-12
- 分支：`codex/iter-publish-flow`
- 本轮目标：第三轮聚焦发布准备度状态机稳定性
- 已完成：`buildPublishState` 新增 `primaryAction`，显式区分 `login`、`fill`、`confirmLocation`、`waitLocation`、`publish`、`submitting`；发布页 `submit()` 改为按 `primaryAction` 分派，避免页面层重复推断 missing 数组
- 运行过的验证：`node --no-warnings scripts/check-publish-flow.mjs`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS
- 已记录证据：检查脚本先因 `primaryAction` 缺失按预期失败，补实现后输出 `Publish flow checks passed.`；`wcc` 和 `wcsc -lc` 全量编译退出码为 0 且无输出
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机验证定位授权、键盘安全区、图片上传失败回滚和发布后详情跳转；CLI `open`/`preview` 已尝试启用服务端口并连接 9420，但均因 `wait IDE port timeout` 失败，`preview` 未产出二维码信息
- 下一步最佳动作：在本机 WeChat DevTools UI 中确认“设置 -> 安全设置 -> 服务端口”已开启并重新打开 `/tmp/street-tasks-iter-worktrees/publish`，再执行游客、缺位置、定位失败/重试、图片发布和发布后详情跳转手测

### Session 014C

- 日期：2026-06-12
- 分支：`codex/iter-detail-trust`
- 本轮目标：C 组产品/设计/开发探索详情页信任判断迭代
- 产品假设：详情页已有评论和信任动作，但用户仍需从原始计数自行判断可信度；信任判断摘要应让下一步行动更清楚
- 已完成：新增 `formatTrustInsight` 将确认、过时、举报和评论数归纳为信任判断；详情页在信任动作前新增 TrustInsight 面板和分段指标；评论区标题右侧新增写评论入口，保留长页面上的悬浮评论按钮
- 运行过的验证：`node --check pages/detail/detail.js`；`node --check utils/format.js`；Node import check for `formatTrustInsight`
- 已记录证据：两条 `node --check` 通过；Node import check 输出 `Trust insight checks passed.`
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机验证窄屏布局、信任动作后的面板刷新、游客登录评论引导、resolved/expired 只读状态和云端评论路径
- 下一步最佳动作：在 WeChat DevTools 打开 active、stale、resolved、expired 任务详情，验证 TrustInsight 文案、指标换行和评论入口

### Session 017F

- 日期：2026-06-13
- 分支：`codex/iter-candidate-publish-trust`
- 本轮目标：组合 B 组发布准备度和 C 组详情信任解释，形成更接近合入候选的第六组实验
- 已完成：从 `codex/iter-publish-flow` HEAD 创建候选分支，cherry-pick C 组详情信任三个提交；合并 `DESIGN_SYSTEM.md` 和 harness 记录冲突，保留 `PublishReadiness`、`LocationCheck` 和谨慎版 `TrustInsight` 规则；新增 `harness/candidate-publish-trust-report.md` 记录组合目标、验证和未手测项
- 运行过的验证：`node --check pages/publish/publish.js`；`node --check pages/publish/publish-state.js`；`node --check pages/detail/detail.js`；`node --check utils/format.js`；`node --check harness/check-trust-insight.mjs`；`node --no-warnings scripts/check-publish-flow.mjs`；`node harness/check-trust-insight.mjs`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`git diff --check`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS
- 已记录证据：发布检查输出 `Publish flow checks passed.`；详情信任检查输出 `Trust insight checks passed.`；JSON 检查输出 `Checked 11 JSON files.`；harness 检查输出 `Harness OK: 6 features checked.`；`git diff --check` 通过；全量 WXML/WXSS 本地编译退出码均为 0
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机验证发布定位授权、键盘安全区、图片上传失败回滚、发布后详情跳转；尚未验证详情页 TrustInsight 窄屏、评论入口、信任动作刷新和云端评论路径；DevTools CLI 9420 端口超时问题未在本组合分支重新尝试
- 下一步最佳动作：启动用户评测 agent 对 F 组组合候选评分；随后在 WeChat DevTools UI 中优先手测 F 组发布闭环，再手测详情 TrustInsight

### Session 018G

- 日期：2026-06-14
- 分支：`codex/iter-candidate-hardening`
- 本轮目标：第七组候选硬化实验，为 F 组组合候选补充产品风险排序、视觉手测清单和跨页面 smoke 检查
- 已完成：产品 agent 输出 `harness/hardening-product-brief.md`，明确发布闭环、位置确认、详情信任解释和边界状态是最高风险；设计 agent 输出 `harness/hardening-design-checklist.md`，覆盖发布准备度、定位卡片、底部按钮、TrustInsight、评论入口、信任动作、窄屏、键盘、安全区和图片状态；开发 agent 新增 `scripts/check-candidate-flow.mjs`，用纯逻辑同时覆盖发布 `primaryAction` 状态机和 TrustInsight 谨慎文案
- 运行过的验证：`node --check scripts/check-candidate-flow.mjs`；`node scripts/check-candidate-flow.mjs`
- 已记录证据：`node scripts/check-candidate-flow.mjs` 输出 `Candidate flow checks passed.`，同时出现项目既有的 `MODULE_TYPELESS_PACKAGE_JSON` ESM 警告
- 更新过的文件或工件：`harness/hardening-product-brief.md`，`harness/hardening-design-checklist.md`，`scripts/check-candidate-flow.mjs`
- 已知风险或未解决问题：本轮不改功能代码，仍未完成 WeChat DevTools/真机真实发布闭环、图片上传、定位授权、详情信任动作刷新、评论入口和云端路径验证
- 下一步最佳动作：运行完整候选验证命令并提交 G 组硬化；随后更新用户评测报告，记录 G 组不是新功能合入候选，而是降低 F 组手测风险的验证增强

### Session 015C

- 日期：2026-06-12
- 分支：`codex/iter-detail-trust`
- 本轮目标：按用户评测报告收敛 TrustInsight 文案误导和冲突优先级风险
- 已完成：确认文案从“有人确认有效”改为更谨慎的“有确认信号”；评论-only 场景改为“先看评论线索”；新增 `harness/check-trust-insight.mjs` 覆盖举报优先、过时优先、resolved/expired、comments-only 和四指标短 note
- 运行过的验证：`node harness/check-trust-insight.mjs`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS
- 已记录证据：`node harness/check-trust-insight.mjs` 先因旧文案按预期失败，补实现后输出 `Trust insight checks passed.`；`wcc` 和 `wcsc -lc` 全量编译退出码为 0 且无输出
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机验证 TrustInsight 面板密度、信任动作点击刷新和云端评论路径
- 下一步最佳动作：跑完整自动验证后，优先做 DevTools 手测以决定是否将 C 组合入主线

### Session 019H

- 日期：2026-06-14
- 分支：`codex/iter-devtools-readiness`
- 本轮目标：第八组 DevTools/真机手测准入实验，为 G/F 候选补齐产品准入、手测清单和自动前置门禁，避免把脚本结果误判为真实用户旅程通过
- 已完成：产品 agent 输出 `harness/devtools-readiness-product-brief.md`，明确 H 组目标、非目标、自动检查门槛、必测用户旅程、证据升级规则和阻塞记录口径；设计/QA agent 输出 `harness/devtools-readiness-checklist.md`，覆盖测试环境记录、DevTools 编译/控制台、地图、发布、详情、跨用户和云端路径的待执行手测清单；开发 agent 新增 `scripts/check-devtools-readiness.mjs`，检查 readiness 文档和既有候选脚本齐备，并串联发布、TrustInsight、候选 flow 检查
- 运行过的验证：`node --check scripts/check-devtools-readiness.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`git diff --check`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`bash harness/init.sh`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS
- 已记录证据：`node --no-warnings scripts/check-devtools-readiness.mjs` 输出 `Publish flow checks passed.`、`Trust insight checks passed.`、`Candidate flow checks passed.`、`DevTools readiness checks passed.`；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通；`git diff --check` 通过；`wcc` 和 `wcsc -lc` 全量编译退出码为 0 且无输出
- 更新过的文件或工件：`harness/devtools-readiness-product-brief.md`，`harness/devtools-readiness-checklist.md`，`scripts/check-devtools-readiness.mjs`
- 已知风险或未解决问题：H 组不新增功能，也不代表已经完成 WeChat DevTools/真机手测；真实定位授权、键盘/安全区、图片上传、发布后详情跳转、信任动作刷新、评论入口、跨用户和云端路径仍必须按清单执行并记录证据
- 下一步最佳动作：启动用户评测 agent 评估 H 组相对 G 组的价值；若继续推进，优先在 WeChat DevTools UI 打开 `/tmp/street-tasks-iter-worktrees/devtools-readiness`，按 readiness 清单执行完整手测并把结果写回 harness

### Session 020I

- 日期：2026-06-14
- 分支：`codex/iter-manual-evidence-gate`
- 本轮目标：第九组手测证据完整性实验，为 H 组 readiness 后续真实手测补充机器可读结果模板和校验脚本，防止“已通过”缺少环境、步骤、实际结果和证据
- 已完成：产品 agent 输出 `harness/manual-evidence-product-brief.md`，定义 `passed`、`failed`、`blocked`、`not_covered` 状态和发布准入影响；QA/数据 agent 输出 `harness/manual-test-results.example.json`，提供不声称真实通过的手测结果示例；开发 agent 新增 `scripts/check-manual-evidence.mjs`，校验顶层环境、journey 字段、状态枚举和不同状态的证据要求
- 运行过的验证：`node --check scripts/check-manual-evidence.mjs`；`node scripts/check-manual-evidence.mjs`；`node -e` 解析 `harness/manual-test-results.example.json`；`git diff --check`；用 `/tmp/manual-evidence-bad.json` 临时坏样例验证缺 evidence 的 `passed` 会失败
- 已记录证据：`node scripts/check-manual-evidence.mjs` 输出 `Manual evidence checks passed.`；JSON 解析输出 `manual evidence example JSON parsed`；坏样例检查输出 `Bad passed evidence rejected as expected.`
- 更新过的文件或工件：`harness/manual-evidence-product-brief.md`，`harness/manual-test-results.example.json`，`scripts/check-manual-evidence.mjs`
- 已知风险或未解决问题：I 组仍不代表已经完成真实 WeChat DevTools/真机手测；示例 JSON 只覆盖 `not_covered` 和 `blocked` 写法，没有真实 `passed` 证据；后续若填真实结果，必须附可复核截图、录屏、日志、任务 id 或云端记录
- 下一步最佳动作：运行完整候选验证并提交 I 组；随后启动用户评测 agent，评估 I 组相对 H 组是否进一步降低“手测口头通过但证据不足”的风险

### Session 021J

- 日期：2026-06-14
- 分支：`codex/iter-evidence-hygiene`
- 本轮目标：第十组证据卫生实验，为 I 组手测结果证据补充提交前脱敏边界、本地附件忽略规则和敏感内容扫描，避免真实截图、云端 ID、本机路径或 token 进入仓库
- 已完成：产品 agent 输出 `harness/evidence-hygiene-product-brief.md`，区分可提交摘要与本地原始证据；安全/QA agent 输出 `harness/evidence-redaction-checklist.md`，列出提交前脱敏和 reviewer 检查项；开发 agent 新增 `scripts/check-evidence-hygiene.mjs`，校验 `.gitignore`、可提交 evidence 文档和 example JSON；主线程更新 `.gitignore`，忽略 `harness/manual-test-results.local*.json` 与 `harness/manual-evidence-artifacts/`
- 运行过的验证：`node --check scripts/check-evidence-hygiene.mjs`；`node scripts/check-evidence-hygiene.mjs`；`node scripts/check-manual-evidence.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`git diff --check`；用 `/tmp/evidence-hygiene-bad-root` 临时坏样例验证具体 `cloud://` 路径和 example 中 `passed` 会失败
- 已记录证据：`node scripts/check-evidence-hygiene.mjs` 输出 `Evidence hygiene checks passed.`；`node scripts/check-manual-evidence.mjs` 输出 `Manual evidence checks passed.`；readiness 检查输出 `Publish flow checks passed.`、`Trust insight checks passed.`、`Candidate flow checks passed.`、`DevTools readiness checks passed.`；坏样例检查输出 `Bad evidence hygiene sample rejected as expected.`
- 更新过的文件或工件：`.gitignore`，`harness/evidence-hygiene-product-brief.md`，`harness/evidence-redaction-checklist.md`，`scripts/check-evidence-hygiene.mjs`
- 已知风险或未解决问题：J 组不代表真实 DevTools/真机手测或真实脱敏审查已经完成；它只保护 future 手测证据提交边界。真实附件仍应保存在本地或受控系统，提交前还需按清单人工复核
- 下一步最佳动作：运行完整候选验证并提交 J 组；随后启动用户评测 agent，评估 J 组是否进一步降低“完整证据但含敏感原始材料”的风险

### Session 022K

- 日期：2026-06-14
- 分支：`codex/iter-manual-runbook`
- 本轮目标：第十一组手测运行手册实验，为 J 组证据卫生链路补充可执行入口，帮助后续执行者准备 ignored local 结果文件、确认 worktree、运行前置门禁和收尾门禁
- 已完成：产品 agent 输出 `harness/manual-runbook-product-brief.md`，定义 helper 目标、非目标、本地文件命名和 H/I/J/K 分工；QA agent 输出 `harness/manual-runbook-checklist.md`，覆盖准备、执行、收尾和常见失败修复；开发 agent 新增 `scripts/prepare-manual-test-run.mjs`，从 example 生成 ignored local 结果文件、创建 ignored 附件目录、运行 readiness/manual evidence/evidence hygiene 三层门禁并打印下一步；主线程补充输出路径 guard，只允许 `harness/manual-test-results.local*.json`
- 运行过的验证：`node --check scripts/prepare-manual-test-run.mjs`；`node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-smoke.json`；`node scripts/prepare-manual-test-run.mjs --out harness/not-local-test-results.json` 验证非 ignored 路径会失败；重复运行 local smoke 验证默认拒绝覆盖；解析生成的 local smoke JSON，确认 `branch=codex/iter-manual-runbook`、`summary.overallStatus=not_covered`、`passed` journey 数量为 0；清理临时 ignored 产物
- 已记录证据：helper 正向运行输出 readiness、manual evidence、evidence hygiene 三层门禁均通过并输出 `Manual test run prepared.`；非 ignored 输出路径失败并提示必须匹配 `harness/manual-test-results.local*.json`；重复运行失败并提示 `Refusing to overwrite existing output file`；local smoke 解析输出 `local smoke result prepared for codex/iter-manual-runbook@4aff484; passed journeys: 0`
- 更新过的文件或工件：`harness/manual-runbook-product-brief.md`，`harness/manual-runbook-checklist.md`，`scripts/prepare-manual-test-run.mjs`
- 已知风险或未解决问题：K 组仍不代表真实 DevTools/真机手测已经完成；helper 只准备本地结果文件和命令入口，不收集真实截图/录屏/日志，也不替执行者判断 passed；后续仍需真实手测、填写 local JSON，并通过 I/J 门禁和人工脱敏复核
- 下一步最佳动作：运行完整候选验证并提交 K 组；随后启动用户评测 agent，评估 K 组是否进一步降低“准备手测时漏跑门禁或误改 example”的风险

### Session 023L

- 日期：2026-06-14
- 分支：`codex/iter-sanitized-summary`
- 本轮目标：第十二组手测脱敏摘要实验，为 K 组 local 手测结果补充 Markdown 摘要草稿生成器，方便评测/评审阅读而不提交原始证据
- 已完成：产品 agent 输出 `harness/sanitized-summary-product-brief.md`，明确摘要草稿价值、非真实手测边界和不提交原始 evidence 的口径；QA agent 输出 `harness/sanitized-summary-checklist.md`，定义摘要字段白名单、敏感内容黑名单、生成前后检查和失败处理；开发 agent 新增 `scripts/create-manual-summary.mjs`，只允许读取 `harness/manual-test-results.local*.json` 并写入 ignored 的 `harness/manual-test-summary.local*.md`，生成前串联 manual evidence 与 evidence hygiene 门禁，生成后扫描敏感模式且不输出原始 `evidence` 字符串；主线程更新 `.gitignore` 和 `scripts/check-evidence-hygiene.mjs`，把 local summary 草稿和 L 组文档纳入证据卫生边界
- 运行过的验证：`node --check scripts/create-manual-summary.mjs`；`node --check scripts/check-evidence-hygiene.mjs`；`node scripts/check-evidence-hygiene.mjs`；`node scripts/check-manual-evidence.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-l-smoke.json --force`；`node scripts/create-manual-summary.mjs --input harness/manual-test-results.local-l-smoke.json --out harness/manual-test-summary.local-l-smoke.md`；`node scripts/create-manual-summary.mjs --input harness/manual-test-results.example.json --out harness/manual-test-summary.local-example.md` 验证 example 输入会失败；`node scripts/create-manual-summary.mjs --input harness/manual-test-results.local-l-smoke.json --out harness/manual-test-summary.md` 验证非 ignored 输出路径会失败；临时 bad local JSON 中写入 `/Users/...` 验证生成内容敏感扫描会失败；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`bash harness/init.sh`；`git diff --check`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；清理临时 ignored 产物
- 已记录证据：正向 smoke 输出 readiness、manual evidence、evidence hygiene 三层门禁均通过并输出 `Manual summary draft created.`；example 输入失败并提示 `Input must match`；非 local summary 输出失败并提示 `Output must match`；敏感路径样例失败并提示 `prohibited macOS user path`；`node scripts/check-evidence-hygiene.mjs` 输出 `Evidence hygiene checks passed.`；`node scripts/check-manual-evidence.mjs` 输出 `Manual evidence checks passed.`；readiness 输出 `Publish flow checks passed.`、`Trust insight checks passed.`、`Candidate flow checks passed.`、`DevTools readiness checks passed.`；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通；`git diff --check` 通过；`wcc`/`wcsc -lc` 全量编译退出码为 0，输出 `WXML/WXSS compile checks passed.`
- 更新过的文件或工件：`.gitignore`，`harness/sanitized-summary-product-brief.md`，`harness/sanitized-summary-checklist.md`，`scripts/check-evidence-hygiene.mjs`，`scripts/create-manual-summary.mjs`
- 已知风险或未解决问题：L 组仍不代表真实 DevTools/真机手测已经完成；摘要草稿来自本地 JSON，不能把 example、mock、占位或自动脚本结果包装成真实 evidence；local Markdown 草稿保持 ignored，若要写入可提交报告仍需人工脱敏复核
- 下一步最佳动作：运行完整候选验证并提交 L 组；随后启动用户评测 agent，评估 L 组是否进一步降低“本地证据可读性不足或摘要误泄漏”的风险

### Session 024M

- 日期：2026-06-14
- 分支：`codex/iter-devtools-smoke-unblock`
- 本轮目标：第十三组 DevTools smoke access unblock 实验，把真实 WeChat DevTools smoke 的 CLI/服务端口阻塞变成可重复诊断和明确 blocked 记录，避免继续把 harness 完整度误读成真实用户旅程通过
- 已完成：产品 agent 输出 `harness/devtools-smoke-product-brief.md`，明确 M 组从扩展 harness 转向真实 smoke access 排查；QA agent 输出 `harness/devtools-smoke-checklist.md`，覆盖端口/进程/CLI/blocked 字段和端口恢复后的最小 smoke 旅程；开发 agent 新增 `scripts/check-devtools-smoke-access.mjs`，默认无副作用检查项目、DevTools CLI、服务端口监听和 `ide-http-port` 进程声明，可选 `--attempt-open` 捕获 CLI open 结果，默认 blocked exit 0，`--strict` 时 blocked exit 1，并对输出中的本机路径和凭证模式做脱敏
- 运行过的验证：`node --check scripts/check-devtools-smoke-access.mjs`；`node scripts/check-devtools-smoke-access.mjs --project /tmp/street-tasks-iter-worktrees/devtools-smoke --port 9420`；`node scripts/check-devtools-smoke-access.mjs --project /tmp/street-tasks-iter-worktrees/devtools-smoke --port 9420 --strict` 验证 blocked 会 exit 1；`node scripts/check-devtools-smoke-access.mjs --project /tmp/street-tasks-iter-worktrees/devtools-smoke --port 9420 --attempt-open --timeout-ms 12000`；对 attempt-open 输出运行路径泄漏扫描，确认没有 `/Users/`、`/private/tmp` 或 `/tmp/street-tasks`；手动复现 `curl http://127.0.0.1:9420/` connection refused、`cli open --project ... --port 9420` 12s timeout、进程列表中存在 1 个声明 `--ide-http-port 9420` 的 DevTools-like 进程
- 已记录证据：默认诊断报告输出 `status: blocked`，项目和 CLI 可用，但 `service port 9420: no (127.0.0.1: ECONNREFUSED; ::1: ECONNREFUSED)`，`ide-http-port process: yes (1 matching declaration(s), 1 DevTools-like)`；strict 模式输出同样 blocked 报告且 exit 1；attempt-open 输出 `attempt-open: no (timed out)`、`signal: SIGTERM`、stderr 摘要包含 `IDE may already started at port 9420, trying to connect`；脱敏检查输出 `DevTools smoke report redaction check passed.`
- 更新过的文件或工件：`harness/devtools-smoke-product-brief.md`，`harness/devtools-smoke-checklist.md`，`scripts/check-devtools-smoke-access.mjs`
- 已知风险或未解决问题：M 组仍未完成真实 DevTools/真机 smoke；当前环境显示 DevTools 进程声明 9420 但端口未监听，CLI open 只能进入 timeout；下一步需要有 UI 权限的执行者确认 DevTools 安全设置服务端口、正常退出重启 IDE 或换端口/换机，再执行 L/K 的真实 smoke runbook
- 下一步最佳动作：运行完整候选验证并提交 M 组；随后启动用户评测 agent，评估 M 组是否比 L 更接近真实手测入口恢复，若端口仍 blocked，下轮应优先进行人工 DevTools UI 服务端口恢复而不是继续新增文档

### Session 025N

- 日期：2026-06-14
- 分支：`codex/iter-devtools-service-recovery`
- 本轮目标：第十四组 DevTools service port 受控恢复实验，在 M 组诊断基础上尝试显式 quit/reopen 恢复 9420 服务端口，并记录恢复成功或继续 blocked 的证据
- 已完成：产品 agent 输出 `harness/devtools-service-recovery-product-brief.md`，定义受控恢复边界和避免误判口径；QA agent 输出 `harness/devtools-service-recovery-checklist.md`，覆盖恢复前检查、退出/重启风险、恢复命令、ready/blocked 判定和最小 smoke；开发 agent 新增 `scripts/recover-devtools-service-port.mjs`，默认 dry-run，只在显式 `--quit-reopen` 且非 `--dry-run` 时执行 DevTools CLI `quit`、等待、`open --project <repo> --port 9420 --disable-gpu`，并用 M 组 access 检查做 before/after 对比
- 运行过的验证：`node --check scripts/recover-devtools-service-port.mjs`；默认 dry-run 报告 before/after 均为 blocked 且跳过 quit/open；`--dry-run --quit-reopen` 确认仍跳过 quit/open；`--strict` blocked 路径 exit 1；执行 `node scripts/recover-devtools-service-port.mjs --project /tmp/street-tasks-iter-worktrees/devtools-recovery --port 9420 --timeout-ms 20000 --quit-reopen` 做受控恢复尝试；恢复后运行 `node scripts/check-devtools-smoke-access.mjs --project /tmp/street-tasks-iter-worktrees/devtools-recovery --port 9420 --strict`；恢复报告路径脱敏扫描确认没有 `/Users/`、`/private/tmp` 或 `/tmp/street-tasks`；检查 9420 仍无监听，进程列表仍有 1 个声明 `--ide-http-port 9420` 的 DevTools-like 进程；补跑 `node scripts/check-json.mjs`、`node harness/check-harness.mjs`、`bash harness/init.sh`、`git diff --check`、`node --no-warnings scripts/check-devtools-readiness.mjs`、`node scripts/check-manual-evidence.mjs`、`node scripts/check-evidence-hygiene.mjs`、`node --check scripts/check-devtools-smoke-access.mjs`、微信开发者工具内置 `wcc` 全量编译 WXML、微信开发者工具内置 `wcsc -lc` 全量编译 WXSS
- 已记录证据：受控恢复报告显示 before 为 blocked；`DevTools quit` timed out，`signal: SIGTERM`，stderr 摘要包含 `IDE may already started at port 9420, trying to connect`；等待 1200ms 后 `DevTools open` 同样 timed out；after 仍为 blocked，`service port 9420: no (127.0.0.1: ECONNREFUSED; ::1: ECONNREFUSED)`；strict after check exit 1 并输出 `After recovery still blocked as expected.`；恢复报告脱敏检查输出 `Recovery report redaction check passed.`；JSON 检查输出 `Checked 11 JSON files.`；harness 自检输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通；readiness 检查输出 `Publish flow checks passed.`、`Trust insight checks passed.`、`Candidate flow checks passed.`、`DevTools readiness checks passed.`；manual evidence 和 evidence hygiene 分别输出通过；`git diff --check` 通过；`wcc`/`wcsc -lc` 编译退出码为 0
- 更新过的文件或工件：`harness/devtools-service-recovery-product-brief.md`，`harness/devtools-service-recovery-checklist.md`，`scripts/recover-devtools-service-port.mjs`
- 已知风险或未解决问题：N 组未恢复 9420 服务端口，真实 DevTools/真机 smoke 仍未执行；CLI quit/open 均因 IDE 端口连接问题超时，下一步需要人工操作 DevTools UI 安全设置、正常退出重启或换机/换端口验证
- 下一步最佳动作：提交 N 组并启动用户评测 agent，评估 N 组是否推动了阻塞收敛。若继续推进，应由有 UI 权限的执行者手动恢复 DevTools 服务端口，而不是继续用 CLI 反复 quit/open

### Session 026O

- 日期：2026-06-14
- 分支：`codex/iter-devtools-port-forensics`
- 本轮目标：第十五组 DevTools port forensics 只读排查实验，在 M/N 组 9420 blocked 结论之后固化只读观察项、脱敏字段、ready/blocked/unknown 判定、人工 UI 恢复建议和更细的端口状态诊断
- 已完成：产品 agent 新增 `harness/devtools-port-forensics-product-brief.md`，明确 O 组不是产品功能、真实 smoke 或端口恢复，只解释 DevTools 环境 blocker；QA/设计 agent 新增 `harness/devtools-port-forensics-checklist.md`，覆盖准备/基线、只读进程与端口检查、DevTools app/CLI 版本与路径摘要、多实例识别、声明 `ide-http-port` 但无监听的记录口径、blocked 字段、状态判定、脱敏规则和后续人工 UI 恢复建议；开发 agent 新增 `scripts/inspect-devtools-port-state.mjs`，只读汇总 project config、DevTools CLI、app bundle Info.plist、`lsof`、socket connect 和进程声明，不执行 quit/open/kill/清缓存/写配置
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/inspect-devtools-port-state.mjs`；`node scripts/inspect-devtools-port-state.mjs --project /tmp/street-tasks-iter-worktrees/devtools-forensics --port 9420`；`node scripts/inspect-devtools-port-state.mjs --project /tmp/street-tasks-iter-worktrees/devtools-forensics --port 9420 --strict`；`node scripts/inspect-devtools-port-state.mjs --project /tmp/street-tasks-iter-worktrees/devtools-forensics --port 1 --strict`；对默认报告运行路径和 token 脱敏扫描
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/devtools-forensics`，对应约定 `/tmp/street-tasks-iter-worktrees/devtools-forensics`；当前分支为 `codex/iter-devtools-port-forensics`；`bash harness/init.sh` 完整跑通，依赖 up to date，`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；默认 forensics 报告输出 `status: blocked`、`diagnosis: declared_without_listener, connect_refused`，DevTools CLI 和 app bundle 可用，版本为 `2.01.2510290` / `4240.111`，`lsof` 无监听，IPv4/IPv6 均 `ECONNREFUSED`，22 个 DevTools-like 相关进程中 1 个声明 requested port；strict 模式对 9420 blocked exit 1；`--port 1 --strict` 输出 `status: unknown` 并 exit 1；脱敏扫描未发现 `/Users/`、`/private/tmp`、`/tmp/street-tasks`、Bearer、cookie 或 token 片段
- 更新过的文件或工件：`harness/devtools-port-forensics-product-brief.md`，`harness/devtools-port-forensics-checklist.md`，`scripts/inspect-devtools-port-state.mjs`，`harness/claude-progress.md`
- 已知风险或未解决问题：O 组没有退出 DevTools、打开/重启项目、杀进程、清缓存、写用户配置或执行真实 DevTools/真机 smoke；本轮也不证明 9420 已恢复。真实端口恢复和产品旅程仍需有 UI 权限的执行者后续操作并记录脱敏证据
- 下一步最佳动作：由有本机 UI 权限的执行者按清单先做只读端口观察；若端口仍 blocked，走人工 UI 安全设置、正常退出重开、换端口或换机；若端口 access ready，再按已有手测 runbook 执行真实 DevTools UI/真机 smoke
