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
