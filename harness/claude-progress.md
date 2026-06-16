# 进度日志

## 当前已验证状态

- 仓库根目录：`/Users/bytedance/git/x`
- 标准启动路径：在 WeChat DevTools 中打开仓库，使用 `project.config.json`，公开 appid 保持 `touristappid`
- 标准初始化入口：`bash harness/init.sh`
- 标准基础验证：`npm run check:json`，`node harness/check-harness.mjs`
- 当前最高优先级未完成功能：`map-feed-001`
- 当前正在实现的用户请求：详情页任务转发最小可验证迭代
- 当前 blocker：自动验证可以覆盖 JSON、harness、详情页分享文案 helper、分享路径和代码静态检查；真实 WeChat DevTools UI smoke/真机验证仍需要手动确认详情页分享模块的文案、按钮和换行表现，以及分享菜单实际行为

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

### Session 014Docs

- 日期：2026-05-26
- 本轮目标：总结当前项目并写出 Markdown 文档
- 已完成：新增根目录 `PROJECT_SUMMARY.md`，从项目定位、核心用户场景、技术栈、页面结构、共享模块、数据模型、状态规则、云端/本地降级、设计系统、运行验证方式、当前状态和后续风险等维度总结 Street Tasks 小程序
- 运行过的验证：`bash harness/init.sh`；`git diff --check`；`rg --files -g 'AGENT*'`
- 已记录证据：`bash harness/init.sh` 完整跑通；当前无 npm 时基于 package-lock 无外部依赖跳过安装，随后 `node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`git diff --check` 通过无输出；`rg --files -g 'AGENT*'` 仅输出 `AGENTS.md`，确认误建的 `AGENT.MD` 已移除
- 更新过的文件或工件：`PROJECT_SUMMARY.md`，`harness/claude-progress.md`
- 已知风险或未解决问题：本轮仅新增项目总结文档，没有改变小程序运行逻辑；既有 WeChat DevTools/真机验证缺口仍然存在
- 下一步最佳动作：继续围绕 `map-feed-001` 做地图首页、定位授权、marker 详情链路和不同机型列表抽屉的手动验证

### Session 015Docs

- 日期：2026-05-26
- 本轮目标：生成/更新根目录 `AGENTS.md`
- 已完成：按用户纠正移除误建的 `AGENT.MD`；更新现有 `AGENTS.md`，补充当前项目快照、CloudBase/本地降级、图片发布约束、关键模块与页面、验证命令、评论/反馈/反应数据说明和收尾要求
- 运行过的验证：`bash harness/init.sh`
- 已记录证据：`bash harness/init.sh` 完整跑通；当前无 npm 时基于 package-lock 无外部依赖跳过安装，随后 `node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`
- 更新过的文件或工件：`AGENTS.md`，`harness/claude-progress.md`
- 已知风险或未解决问题：本轮仅新增 agent 文档，没有改变小程序运行逻辑；既有 WeChat DevTools/真机验证缺口仍然存在
- 下一步最佳动作：继续围绕 `map-feed-001` 做地图首页、定位授权、marker 详情链路和不同机型列表抽屉的手动验证

### Session 016Understand

- 日期：2026-05-28
- 本轮目标：运行 `understand` skill，为当前仓库生成 Understand Anything 知识图谱
- 已完成：构建本地 understand-anything core 依赖；生成并调整 `.understand-anything/.understandignore`，排除 `.agents/`、`log/`、本地私有配置和分析器临时目录；扫描 73 个项目文件；生成 `.understand-anything/knowledge-graph.json`、`meta.json` 和 `fingerprints.json`
- 运行过的验证：`bash harness/init.sh`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`git diff --check`；`node` 解析 `.understand-anything/knowledge-graph.json`、`meta.json`、`fingerprints.json`；Understand inline graph validation
- 已记录证据：图谱验证结果为 0 issues、0 warnings；图谱包含 164 个节点、188 条边、7 个架构层和 8 个 guided tour steps；`build-fingerprints.mjs` 输出 `Fingerprints baseline: 73 files`；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通
- 更新过的文件或工件：`.understand-anything/.understandignore`，`.understand-anything/knowledge-graph.json`，`.understand-anything/meta.json`，`.understand-anything/fingerprints.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：本轮仅生成代码理解图谱，没有改变小程序运行逻辑；WeChat DevTools/真机验证缺口仍沿用既有记录
- 下一步最佳动作：需要浏览架构时打开 Understand dashboard；产品验证仍继续围绕 `map-feed-001` 的定位授权、marker 详情链路和列表抽屉做手动确认

### Session 014A

- 日期：2026-06-12
- 分支：`codex/iter-map-ux`
- 本轮目标：A 组产品/设计/开发探索地图首页附近任务浏览迭代
- 产品假设：地图首屏虽然有列表入口，但用户进入后仍需要打开抽屉才知道最近可处理任务；新增附近优先预览应降低首次浏览成本
- 已完成：新增 `NearbyPreview` 首屏横向预览，按距离优先展示 active/stale 任务；地图任务装饰抽到 `utils/post-presenter.js`；marker、预览和列表选中态联动；选中 marker callout 使用深色强调；新增 `harness/check-map-feed.mjs`
- 运行过的验证：`node --check pages/map/map.js`；`node --check utils/post-presenter.js`；`node --check utils/geo.js`；`node harness/check-map-feed.mjs`
- 已记录证据：三条 `node --check` 通过；`node harness/check-map-feed.mjs` 输出 `Map feed checks passed.`
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机验证地图原生层、首屏预览是否遮挡地图工具、窄屏文案省略、marker 点击和详情链路
- 下一步最佳动作：在 WeChat DevTools 打开地图页，观察 NearbyPreview、点击预览/marker/列表之间的选中联动，再决定是否合入主线

### Session 015A

- 日期：2026-06-12
- 分支：`codex/iter-map-ux`
- 本轮目标：按用户评测报告收敛 NearbyPreview 遮挡和长标题风险
- 已完成：NearbyPreview 改用 `previewTitle` 短标题；`buildNearbyPreviewPosts` 为预览卡生成截断标题；检查脚本覆盖长标题截断，避免首屏预览被超长标题撑开
- 运行过的验证：`node harness/check-map-feed.mjs`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS
- 已记录证据：`node harness/check-map-feed.mjs` 先因 `previewTitle` 缺失按预期失败，补实现后输出 `Map feed checks passed.`；`wcc` 和 `wcsc -lc` 全量编译退出码为 0 且无输出
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机验证真实地图覆盖层、横向滚动和 marker callout 渲染
- 下一步最佳动作：跑完整自动验证后，用 DevTools 验证窄屏首屏遮挡关系

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

### Session 027P

- 日期：2026-06-14
- 分支：`codex/iter-map-list-resilience`
- 本轮目标：第十六组地图列表 UX resilience 静态防回归实验，在 DevTools 端口 blocked 的情况下先守住地图列表卡片结构和关键 WXSS 约束，降低长标题、长正文、带图和底部统计挤压风险
- 已完成：产品 agent 新增 `harness/map-list-resilience-product-brief.md`，定义地图列表抽屉和任务卡的静态防回归价值、非目标、关键 UX 风险、成功标准和真机/DevTools 未验证边界；设计/QA agent 新增 `harness/map-list-resilience-checklist.md`，区分可脚本检查项和必须人工确认项，覆盖长标题、长正文、长地点、带图/无图、过期/已解决、多标签、底部统计和详情入口；开发 agent 新增 `scripts/check-map-list-resilience.mjs`，检查 `pages/map/map.wxml` 和 `pages/map/map.wxss` 中抽屉、列表、卡片、标题/标签、正文、footer、图片和详情按钮的结构/样式 guard
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/check-map-list-resilience.mjs`；`node scripts/check-map-list-resilience.mjs`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`git diff --check`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-resilience`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-resilience`；当前分支为 `codex/iter-map-list-resilience`；`bash harness/init.sh` 完整跑通，依赖 up to date，`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；map list resilience 脚本输出 `Map list resilience checks passed.`；`git diff --check` 通过；`wcc`/`wcsc -lc` 编译退出码为 0
- 更新过的文件或工件：`harness/map-list-resilience-product-brief.md`，`harness/map-list-resilience-checklist.md`，`scripts/check-map-list-resilience.mjs`，`harness/claude-progress.md`
- 已知风险或未解决问题：P 组不代表地图列表视觉已通过；它只证明当前 WXML/WXSS 保留了关键结构和防挤压约束。DevTools service port 9420 仍 blocked，真机/DevTools 中长标题、长正文、图片加载、safe area、地图原生层和详情点击仍未验证
- 下一步最佳动作：提交 P 组并启动用户评测 agent；端口恢复后按 P 组 checklist 做地图列表真实视觉 smoke，补充窄屏/常见宽度/真机截图或录屏证据

### Session 028Q

- 日期：2026-06-14
- 分支：`codex/iter-map-list-preflight`
- 本轮目标：第十七组地图列表 preflight 集成实验，把 P 组新增的地图列表静态韧性检查接入 DevTools readiness 聚合门禁，降低后续候选版漏跑该检查的风险
- 已完成：产品 agent 新增 `harness/map-list-preflight-product-brief.md`，定义 Q 组用户价值、非目标、preflight blocker 口径和 9420 blocked 下的边界；QA/设计 agent 新增 `harness/map-list-preflight-checklist.md`，覆盖自动命令、失败提示、长标题/标签/缩略图/footer/详情入口风险、人工验证项和降级证据字段；开发 agent 更新 `scripts/check-devtools-readiness.mjs`，把 `scripts/check-map-list-resilience.mjs` 作为必需文件和默认运行项，并在输出中明确静态 WXML/WXSS guard 不代表 DevTools 或真机视觉验收通过；主线程同步更新 `harness/feature_list.json` 的 map-feed evidence 和 notes
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/check-devtools-readiness.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`node --no-warnings scripts/check-map-list-resilience.mjs`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`git diff --check`
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-preflight`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-preflight`；当前分支为 `codex/iter-map-list-preflight`；`bash harness/init.sh` 完整跑通，依赖 up to date，`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；readiness 聚合输出 `Publish flow checks passed.`、`Trust insight checks passed.`、`Candidate flow checks passed.`、`Running map list static layout regression guard...`、`Map list resilience checks passed.`、`Map list static layout regression guard passed; DevTools and real-device visual acceptance are still required.`、`DevTools readiness checks passed. Static gates passed; DevTools and real-device visual acceptance are still required.`；独立地图列表检查输出 `Map list resilience checks passed.`；`git diff --check` 通过
- 更新过的文件或工件：`harness/map-list-preflight-product-brief.md`，`harness/map-list-preflight-checklist.md`，`scripts/check-devtools-readiness.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：Q 组没有修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只保证 readiness/preflight 默认串联地图列表静态 guard。地图列表真实渲染、长内容视觉、图片加载、safe area、地图原生层和详情点击仍需 DevTools 或真机证据
- 下一步最佳动作：提交 Q 组并启动用户评测 agent，评估 Q 相比 P 是否减少“新增检查但未来候选漏跑”的风险；若继续推进，优先做能在端口 blocked 状态下提升真实 UI 证据准备度的下一组实验，或等待人工恢复 DevTools 服务端口后执行地图列表视觉 smoke

### Session 029R

- 日期：2026-06-14
- 分支：`codex/iter-manual-preflight-alignment`
- 本轮目标：第十八组手测准备入口 preflight 对齐实验，在 Q 组 readiness 已串联地图列表 static guard 后，让真实手测准备 helper 显式提示它会先运行 readiness preflight，并继续强调这不代表 DevTools 或真机视觉通过
- 已完成：产品 agent 新增 `harness/manual-preflight-alignment-product-brief.md`，定义 R 组价值、非目标、与 P/Q/K/L 的关系和 9420 blocked 边界；QA/设计 agent 新增 `harness/manual-preflight-alignment-checklist.md`，覆盖 helper exact command、预期输出、ignored local JSON、manual evidence/evidence hygiene/summary 收尾和 blocked 口径；开发 agent 更新 `scripts/prepare-manual-test-run.mjs`，在 readiness gate 前输出 `Running readiness preflight before manual UI testing.`、点名 `scripts/check-devtools-readiness.mjs` 与 map list static guard，并把 Next steps 第一步改为先阅读 readiness preflight 输出；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/prepare-manual-test-run.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-r-smoke.json --force`；`node scripts/check-manual-evidence.mjs harness/manual-test-results.local-r-smoke.json`；`node scripts/check-evidence-hygiene.mjs`；解析 local JSON 确认 `summary.overallStatus=not_covered` 且 passed journey 数量为 0；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`git diff --check`；检查未写入错误日期；清理 local smoke 文件
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/manual-preflight-alignment`，对应约定 `/tmp/street-tasks-iter-worktrees/manual-preflight-alignment`；当前分支为 `codex/iter-manual-preflight-alignment`；`bash harness/init.sh` 完整跑通，依赖 up to date，`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；helper smoke 输出 `Running readiness preflight before manual UI testing.`、`This includes scripts/check-devtools-readiness.mjs and the map list static guard.`、`Map list resilience checks passed.`、`Manual evidence checks passed.`、`Evidence hygiene checks passed.`、`Manual test run prepared.`；local JSON 解析输出 `codex/iter-manual-preflight-alignment 4d49eb1 overall=not_covered passed=0`；`git diff --check` 通过
- 更新过的文件或工件：`harness/manual-preflight-alignment-product-brief.md`，`harness/manual-preflight-alignment-checklist.md`，`scripts/prepare-manual-test-run.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：R 组没有修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只让手测准备入口更清楚地运行并展示 Q readiness。地图列表真实渲染、长内容视觉、图片加载、safe area、地图原生层、列表滚动和详情入口点击仍需 DevTools 或真机证据
- 下一步最佳动作：提交 R 组并启动用户评测 agent，评估 R 相比 Q 是否更贴近真实手测执行入口；若继续推进，优先围绕 9420 blocked 的人工 UI 恢复或真实视觉 smoke 证据闭环，而不是继续把 static gate 当作 UI 通过

### Session 030S

- 日期：2026-06-14
- 分支：`codex/iter-map-list-visual-evidence`
- 本轮目标：第十九组地图列表真实视觉证据结构实验，在 P/Q/R 已经补齐 static guard、readiness 集成和手测准备提示后，为地图列表真实视觉 smoke 增加固定记录入口
- 已完成：产品 agent 新增 `harness/map-list-visual-evidence-product-brief.md`，定义长标题、长正文、带图/无图、安全区、原生地图层、列表滚动和详情链路的证据槽位与通过/阻塞口径；QA agent 新增 `harness/map-list-visual-evidence-checklist.md`，覆盖环境记录、视觉项、交互项、数据变体、失败/blocked 记录、证据卫生和收尾验证；开发 agent 在 `harness/manual-test-results.example.json` 新增 `map-list-visual-smoke` journey，并保持 `status: not_covered` 和空 evidence，避免把未执行的 DevTools/真机观察写成通过；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node scripts/check-json.mjs`；`node scripts/check-manual-evidence.mjs`；`node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-s-smoke.json --force`；`node scripts/check-manual-evidence.mjs harness/manual-test-results.local-s-smoke.json`；`node scripts/check-evidence-hygiene.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`node harness/check-harness.mjs`；`git diff --check`；检查未写入错误日期；清理 local smoke 文件
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-visual-evidence`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-visual-evidence`；当前分支为 `codex/iter-map-list-visual-evidence`；`bash harness/init.sh` 完整跑通，依赖 up to date，`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；manual evidence 检查输出 `Manual evidence checks passed.`；helper smoke 输出 readiness、map list static guard、manual evidence 和 evidence hygiene 均通过，并生成只含未覆盖/占位结果的 ignored local JSON；`map-list-visual-smoke` journey 在 example 和 local smoke 中保持 `not_covered` 且没有 passed evidence；`git diff --check` 通过
- 更新过的文件或工件：`harness/map-list-visual-evidence-product-brief.md`，`harness/map-list-visual-evidence-checklist.md`，`harness/manual-test-results.example.json`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：S 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只让真实视觉 smoke 有固定证据结构。地图列表长标题、长正文、图片加载、safe area、原生地图层、列表滚动、marker/list/detail 链路仍未在 DevTools 或真机中验证
- 下一步最佳动作：提交 S 组并启动用户评测 agent，评估 S 相比 R 是否更接近真实视觉证据闭环；若继续推进，优先执行或恢复真实 DevTools UI/真机 smoke，而不是把模板和清单当作视觉通过

### Session 031T

- 日期：2026-06-14
- 分支：`codex/iter-map-list-evidence-gate`
- 本轮目标：第二十组地图列表视觉证据必备 journey 门禁实验，在 S 组已新增 `map-list-visual-smoke` 后，防止该证据槽位未来被删除或重复而仍通过手测证据校验
- 已完成：产品 agent 新增 `harness/map-list-evidence-gate-product-brief.md`，定义 `map-list-visual-smoke` 从文档约定升级为必备 journey gate 的价值和边界；QA agent 新增 `harness/map-list-evidence-gate-checklist.md`，覆盖正向模板、缺 journey、重复 journey、关键字段、错误状态、blocked/passed 边界、local helper 和证据卫生；开发 agent 更新 `scripts/check-manual-evidence.mjs`，要求 manual evidence JSON 中恰好包含一条 `map-list-visual-smoke` journey；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/check-manual-evidence.mjs`；`node scripts/check-manual-evidence.mjs`；缺失 `map-list-visual-smoke` 的 `/tmp` 坏样例检查应失败；重复 `map-list-visual-smoke` 的 `/tmp` 坏样例检查应失败；`node scripts/prepare-manual-test-run.mjs --out harness/manual-test-results.local-t-smoke.json --force`；`node scripts/check-manual-evidence.mjs harness/manual-test-results.local-t-smoke.json`；解析 local JSON 确认 `map-list-visual-smoke=not_covered`、`passed=0`、`evidence=0`；`node scripts/check-evidence-hygiene.mjs`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`git diff --check`；检查未写入错误日期；清理 local smoke 和 `/tmp` 坏样例
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-evidence-gate`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-evidence-gate`；当前分支为 `codex/iter-map-list-evidence-gate`；`bash harness/init.sh` 完整跑通，依赖 up to date，`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；manual evidence 正向检查输出 `Manual evidence checks passed.`；缺失坏样例输出 `Missing required journey id: map-list-visual-smoke`；重复坏样例输出 `Expected exactly one required journey id: map-list-visual-smoke; found 2.`；helper local JSON 解析保持 `map-list-visual-smoke=not_covered passed=0 evidence=0`；evidence hygiene、readiness 和 `git diff --check` 均通过
- 更新过的文件或工件：`harness/map-list-evidence-gate-product-brief.md`，`harness/map-list-evidence-gate-checklist.md`，`scripts/check-manual-evidence.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：T 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只守护 S 组新增的手测证据槽位。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed
- 下一步最佳动作：提交 T 组并启动用户评测 agent，评估 T 相比 S 是否降低“证据结构未来被误删”的风险；若继续推进，优先执行真实 DevTools UI/真机 smoke 或将 blocked 结果按 T/S 结构写入 local evidence

### Session 032U

- 日期：2026-06-14
- 分支：`codex/iter-map-list-blocked-evidence`
- 本轮目标：第二十一组地图列表视觉 smoke blocked evidence 演练，在 S/T 已经提供并守护 `map-list-visual-smoke` journey 后，让 DevTools 或真机不可用时也能生成合规的 ignored blocked local JSON 草稿
- 已完成：产品 agent 新增 `harness/map-list-blocked-evidence-product-brief.md`，定义 blocked evidence 只说明环境阻塞被合规记录，不代表产品失败或 UI passed；QA agent 新增 `harness/map-list-blocked-evidence-checklist.md`，覆盖生成 local JSON、将 `map-list-visual-smoke` 写成 blocked/not_covered、坏样例、证据卫生、ignored 文件和清理；开发 agent 新增 `scripts/prepare-map-list-blocked-evidence.mjs`，从 example 生成 ignored local JSON，设置当前分支/commit/testedAt，将 `map-list-visual-smoke` 改为 blocked，并自动运行 manual evidence 与 evidence hygiene gate；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/prepare-map-list-blocked-evidence.mjs`；`node scripts/prepare-map-list-blocked-evidence.mjs --out harness/manual-test-results.local-u-blocked.json --reason \"DevTools service port 9420 blocked\" --force`；`node scripts/check-manual-evidence.mjs harness/manual-test-results.local-u-blocked.json`；`node scripts/check-evidence-hygiene.mjs`；解析 local JSON 确认 `branch=codex/iter-map-list-blocked-evidence`、`summary.overallStatus=blocked`、`map-list-visual-smoke=blocked`、`passed=0`、`risks/followUp` 非空；非 ignored 输出路径被拒绝；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`git diff --check`；检查未写入错误日期；清理 local blocked 文件
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-blocked-evidence`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-blocked-evidence`；当前分支为 `codex/iter-map-list-blocked-evidence`；helper 正向输出 `Map-list blocked evidence draft created.` 和 `Blocked evidence is not UI passed or failed evidence; it only records the blocker.`；manual evidence 与 evidence hygiene gate 均通过；local JSON 解析输出 `overall=blocked mapList=blocked passed=0 evidence=0`；非 ignored 输出路径失败并提示必须匹配 `harness/manual-test-results.local*.json`；`bash harness/init.sh` 完整跑通，`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；readiness 与 `git diff --check` 均通过
- 更新过的文件或工件：`harness/map-list-blocked-evidence-product-brief.md`，`harness/map-list-blocked-evidence-checklist.md`，`scripts/prepare-map-list-blocked-evidence.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：U 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只生成可校验的 blocked local 草稿并清理该本地产物。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed
- 下一步最佳动作：提交 U 组并启动用户评测 agent，评估 U 相比 T 是否更接近真实证据闭环；若继续推进，优先实际恢复 DevTools UI/真机入口或用 U 组 helper 生成 blocked local JSON 后制作脱敏摘要草稿

### Session 033V

- 日期：2026-06-14
- 分支：`codex/iter-map-list-blocked-summary`
- 本轮目标：第二十二组地图列表 blocked summary 演练，在 U 组能生成 blocked local JSON、L 组能生成脱敏 local summary 后，提供一条 reviewer 可读的 blocked 摘要生成入口
- 已完成：产品 agent 新增 `harness/map-list-blocked-summary-product-brief.md`，定义 blocked summary 只提升评审理解效率，不改变真实 UI 验收状态；设计/QA agent 新增 `harness/map-list-blocked-summary-checklist.md`，覆盖推荐命令链路、状态不变量、脱敏要求、负向样例、清理与报告口径；开发 agent 新增 `scripts/prepare-map-list-blocked-summary.mjs`，校验 results/summary 输出都必须是 ignored local 路径，先调用 `scripts/prepare-map-list-blocked-evidence.mjs`，再调用 `scripts/create-manual-summary.mjs`；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/prepare-map-list-blocked-summary.mjs`；`node scripts/prepare-map-list-blocked-summary.mjs --reason \"DevTools service port 9420 blocked\" --results-out harness/manual-test-results.local-v-blocked.json --summary-out harness/manual-test-summary.local-v-blocked.md --force`；`node scripts/check-manual-evidence.mjs harness/manual-test-results.local-v-blocked.json`；`node scripts/check-evidence-hygiene.mjs`；解析 local JSON 和 summary 确认 `summary.overallStatus=blocked`、`map-list-visual-smoke=blocked`、`passed=0`、`evidence=0`、summary 含 `overallStatus`/`map-list-visual-smoke`/`evidenceCount` 且未把目标 journey 写成 passed；非 ignored results 路径被拒绝；非 ignored summary 路径被拒绝；缺失 `--reason` 被拒绝；带 `/Users/example/secret.png` 的敏感 local JSON 被 summary 生成器拦截且未写出 summary；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`git diff --check`；检查未写入错误日期
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-blocked-summary`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-blocked-summary`；当前分支为 `codex/iter-map-list-blocked-summary`；wrapper 正向输出 `Created blocked result and sanitized summary.`、`Summary is not UI passed evidence...`；local JSON 解析输出 `overall=blocked mapList=blocked passed=0 evidence=0`；summary 生成输出 `Manual summary draft created.`；非 ignored results 路径提示必须匹配 `harness/manual-test-results.local*.json`；非 ignored summary 路径提示必须匹配 `harness/manual-test-summary.local*.md`；敏感路径负向输出 `Generated summary contains prohibited macOS user path on line 43.`；readiness、JSON、harness 和 `git diff --check` 均通过
- 更新过的文件或工件：`harness/map-list-blocked-summary-product-brief.md`，`harness/map-list-blocked-summary-checklist.md`，`scripts/prepare-map-list-blocked-summary.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：V 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只让 U 组 blocked local JSON 更容易生成脱敏 local summary。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed；生成的 local JSON/MD 仍是 ignored 本地产物，不能提交为真实 UI 证据
- 下一步最佳动作：提交 V 组并启动用户评测 agent，评估 V 相比 U 是否提升 blocked 证据的评审可读性且不制造 UI passed 误读；若继续推进，优先恢复 DevTools UI/真机入口或增加对 local summary 状态不变量的自动守门

### Session 034W

- 日期：2026-06-14
- 分支：`codex/iter-map-list-summary-guard`
- 本轮目标：第二十三组地图列表 blocked summary guard 实验，在 V 组已经生成 blocked local JSON 与脱敏 summary 后，增加自动守门，防止 summary 被改成 passed 或丢失 blocked 语义
- 已完成：产品 agent 新增 `harness/map-list-summary-guard-product-brief.md`，定义 summary guard 只守 blocked JSON 与 summary 的状态一致性，不代表真实 UI 验收；QA agent 新增 `harness/map-list-summary-guard-checklist.md`，覆盖正向 wrapper 命令、guard 命令、JSON/summary 不变量、坏样例、清理与报告口径；开发 agent 新增 `scripts/check-map-list-blocked-summary.mjs`，限制 results/summary 都必须是 ignored local 路径，先运行 manual evidence 与 evidence hygiene gate，再检查 JSON `overallStatus=blocked`、唯一 `map-list-visual-smoke`、`passed=0`、目标 evidence count 为 0，并检查 summary 中 `overallStatus=blocked`、目标 journey 行 status 为 blocked 且 evidenceCount 为 0；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/check-map-list-blocked-summary.mjs`；`node scripts/prepare-map-list-blocked-summary.mjs --reason \"DevTools service port 9420 blocked\" --results-out harness/manual-test-results.local-w-blocked.json --summary-out harness/manual-test-summary.local-w-blocked.md --force`；`node scripts/check-map-list-blocked-summary.mjs --results harness/manual-test-results.local-w-blocked.json --summary harness/manual-test-summary.local-w-blocked.md`；summary 目标行改成 `passed` 的坏样例应失败；summary 目标行 `evidenceCount` 改成 `1` 的坏样例应失败；JSON 目标 journey 改成 `passed` 的坏样例应失败；summary 删除 `map-list-visual-smoke` 行的坏样例应失败；非 local results 路径应失败；非 local summary 路径应失败；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`git diff --check`；检查未写入错误日期；清理 local JSON/MD 和 `/tmp` 临时输出
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-summary-guard`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-summary-guard`；当前分支为 `codex/iter-map-list-summary-guard`；正向 guard 输出 `Map-list blocked summary checks passed.`；summary 改 passed 坏样例输出 `map-list-visual-smoke summary row must not be passed`；summary evidenceCount 改 1 坏样例输出 `summary row evidenceCount must be 0`；JSON 改 passed 坏样例先被 manual evidence gate 拦截，输出 `journey map-list-visual-smoke is passed but evidence is empty`；summary 删除目标行坏样例输出 `Summary Markdown must contain exactly one map-list-visual-smoke row; found 0.`；非 local results/summary 路径均被拒绝；readiness、JSON、harness 和 `git diff --check` 均通过
- 更新过的文件或工件：`harness/map-list-summary-guard-product-brief.md`，`harness/map-list-summary-guard-checklist.md`，`scripts/check-map-list-blocked-summary.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：W 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只验证 ignored local JSON 与 ignored local summary 的 blocked 状态一致性。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed；guard 通过也不能替代真实 UI 证据
- 下一步最佳动作：提交 W 组并启动用户评测 agent，评估 W 相比 V 是否降低 summary 被误改成 passed 的风险；若继续推进，优先恢复 DevTools UI/真机入口，或将 W guard 串入 V wrapper 输出后的推荐流程

### Session 035X

- 日期：2026-06-14
- 分支：`codex/iter-map-list-summary-integrity`
- 本轮目标：第二十四组地图列表 blocked summary 同源完整性实验，在 W 组已守住 blocked 状态不变量后，进一步确认 summary 的 branch、commit、actual、followUp 和 blocker/risk 内容仍来自同一份 ignored blocked JSON
- 已完成：产品 agent 新增 `harness/map-list-summary-integrity-product-brief.md`，定义同源完整性只证明 summary 是 blocked JSON 的可信转述，不代表真实 UI 验收；QA agent 新增 `harness/map-list-summary-integrity-checklist.md`，覆盖正向 wrapper/guard 命令、W 组不变量、新增 branch/commit/actual/followUp/blocker 不变量、坏样例、清理与报告口径；开发 agent 增强 `scripts/check-map-list-blocked-summary.mjs`，在原有 status/evidenceCount 检查上增加 Run branch/commit 与 JSON 比对、目标 journey actual/followUp 关键片段比对、目标 blocker 非空且包含 JSON risks 关键片段，并处理 `<br>`、空白压缩与 escaped pipe；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/check-map-list-blocked-summary.mjs`；`node scripts/prepare-map-list-blocked-summary.mjs --reason \"DevTools service port 9420 blocked\" --results-out harness/manual-test-results.local-x-blocked.json --summary-out harness/manual-test-summary.local-x-blocked.md --force`；`node scripts/check-map-list-blocked-summary.mjs --results harness/manual-test-results.local-x-blocked.json --summary harness/manual-test-summary.local-x-blocked.md`；summary branch 改错坏样例应失败；summary commit 改错坏样例应失败；summary actual 替换为 unrelated text 坏样例应失败；summary followUp 替换为 unrelated text 坏样例应失败；summary blocker 替换为 unrelated text 坏样例应失败；非 local results 路径应失败；非 local summary 路径应失败；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`git diff --check`；检查未写入错误日期；清理 local JSON/MD 和 `/tmp` 临时输出
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-summary-integrity`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-summary-integrity`；当前分支为 `codex/iter-map-list-summary-integrity`；正向 guard 输出 `Map-list blocked summary checks passed.`；branch 坏样例输出 `Run branch must match blocked results JSON branch`；commit 坏样例输出 `Run commit must match blocked results JSON commit`；actual 坏样例输出 `summary row actual must include the matching JSON actual fragment`；followUp 坏样例输出 `summary row followUp must include the matching JSON followUp fragment`；blocker 坏样例输出 `summary row blocker must include at least one JSON risk phrase`；非 local results/summary 路径均被拒绝；readiness、JSON、harness 和 `git diff --check` 均通过
- 更新过的文件或工件：`harness/map-list-summary-integrity-product-brief.md`，`harness/map-list-summary-integrity-checklist.md`，`scripts/check-map-list-blocked-summary.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：X 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只验证 ignored local JSON 与 ignored local summary 的同源摘要完整性。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed；同源 guard 通过也不能替代真实 UI 证据
- 下一步最佳动作：提交 X 组并启动用户评测 agent，评估 X 相比 W 是否降低 summary 跨 run/跨 blocker 拼接的风险；若继续推进，优先恢复 DevTools UI/真机入口，或将增强后的 summary guard 串入 blocked summary wrapper 的推荐输出

### Session 036Y

- 日期：2026-06-14
- 分支：`codex/iter-map-list-summary-wrapper-guarded`
- 本轮目标：第二十五组地图列表 blocked summary wrapper guard 实验，在 X 组已增强 summary 同源 guard 后，把该 guard 接入 blocked summary wrapper，避免生成 JSON/summary 后漏跑守门检查
- 已完成：产品 agent 新增 `harness/map-list-summary-wrapper-guarded-product-brief.md`，定义 wrapper 默认串 guard 的价值和边界；QA agent 新增 `harness/map-list-summary-wrapper-guarded-checklist.md`，覆盖正向 wrapper+guard 输出、ignored local 路径、非 local summary 路径失败、损坏 summary 回归、清理与报告口径；开发 agent 更新 `scripts/prepare-map-list-blocked-summary.mjs`，在 `scripts/create-manual-summary.mjs` 成功后立即调用 `scripts/check-map-list-blocked-summary.mjs --results <resultsOutPath> --summary <summaryOutPath>`，并输出 `Blocked summary guard passed.`；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/prepare-map-list-blocked-summary.mjs`；`node --check scripts/check-map-list-blocked-summary.mjs`；`node scripts/prepare-map-list-blocked-summary.mjs --reason \"DevTools service port 9420 blocked\" --results-out harness/manual-test-results.local-y-blocked.json --summary-out harness/manual-test-summary.local-y-blocked.md --force`；`node scripts/check-map-list-blocked-summary.mjs --results harness/manual-test-results.local-y-blocked.json --summary harness/manual-test-summary.local-y-blocked.md`；非 local summary 输出路径应失败且不生成 results；summary commit 改错坏样例应失败；summary 目标行改成 passed 坏样例应失败；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`git diff --check`；检查未写入错误日期；清理 local JSON/MD 和 `/tmp` 临时输出
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-summary-wrapper-guarded`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-summary-wrapper-guarded`；当前分支为 `codex/iter-map-list-summary-wrapper-guarded`；wrapper 正向输出 `Map-list blocked evidence draft created.`、`Manual summary draft created.`、`Map-list blocked summary checks passed.`、`Blocked summary guard passed.` 和 `Summary is not UI passed evidence...`；单独 guard 正向输出 `Map-list blocked summary checks passed.`；非 local summary 路径提示必须匹配 `harness/manual-test-summary.local*.md` 且未生成 bad results；commit 坏样例输出 `Run commit must match blocked results JSON commit`；passed 坏样例输出 `map-list-visual-smoke summary row must not be passed`；readiness、JSON、harness 和 `git diff --check` 均通过
- 更新过的文件或工件：`harness/map-list-summary-wrapper-guarded-product-brief.md`，`harness/map-list-summary-wrapper-guarded-checklist.md`，`scripts/prepare-map-list-blocked-summary.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：Y 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只确保 wrapper 生成 blocked local JSON 和 summary 后默认跑同源 guard。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed；wrapper+guard 成功也不能替代真实 UI 证据
- 下一步最佳动作：提交 Y 组并启动用户评测 agent，评估 Y 相比 X 是否降低执行者漏跑 guard 的风险；若继续推进，优先恢复 DevTools UI/真机入口，或给 wrapper 输出增加更明确的下一步真实 UI smoke 指引

### Session 037Z

- 日期：2026-06-14
- 分支：`codex/iter-map-list-summary-postedit-guard`
- 本轮目标：第二十六组地图列表 blocked summary 后编辑 guard 提示实验，在 Y 组 wrapper 已默认运行同源 guard 后，进一步降低生成后手工编辑 JSON/Markdown 却沿用旧 guard 结果的误用风险
- 已完成：产品 agent 新增 `harness/map-list-summary-postedit-guard-product-brief.md`，定义 wrapper 自动 guard 的可信边界和生成后编辑必须复跑 guard 的产品口径；设计/QA agent 新增 `harness/map-list-summary-postedit-guard-checklist.md`，覆盖正向生成、后编辑篡改失败、修复路径、不能证明 UI 通过和未验证项；开发 agent 更新 `scripts/prepare-map-list-blocked-summary.mjs`，在成功输出中打印 `Post-edit rerun guard` 以及当前 JSON/MD 对应的 `node scripts/check-map-list-blocked-summary.mjs --results ... --summary ...` 命令；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/prepare-map-list-blocked-summary.mjs`；`node --check scripts/check-map-list-blocked-summary.mjs`；`node scripts/prepare-map-list-blocked-summary.mjs --reason "DevTools service port 9420 blocked" --results-out harness/manual-test-results.local-z-postedit.json --summary-out harness/manual-test-summary.local-z-postedit.md --force`；`node scripts/check-map-list-blocked-summary.mjs --results harness/manual-test-results.local-z-postedit.json --summary harness/manual-test-summary.local-z-postedit.md`；summary 目标行改成 `passed` 的坏样例应失败；summary commit 改错坏样例应失败；`git diff --check`；清理 local JSON/MD
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-summary-postedit-guard`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-summary-postedit-guard`；当前分支为 `codex/iter-map-list-summary-postedit-guard`；wrapper 正向输出 `Map-list blocked evidence draft created.`、`Manual summary draft created.`、`Map-list blocked summary checks passed.`、`Blocked summary guard passed.`、`Post-edit rerun guard`、`node scripts/check-map-list-blocked-summary.mjs --results harness/manual-test-results.local-z-postedit.json --summary harness/manual-test-summary.local-z-postedit.md` 和 `Summary is not UI passed evidence...`；单独 guard 正向输出 `Map-list blocked summary checks passed.`；passed 坏样例输出 `map-list-visual-smoke summary row must not be passed`；commit 坏样例输出 `Summary Markdown Run commit must match blocked results JSON commit`；`git diff --check` 通过
- 更新过的文件或工件：`harness/map-list-summary-postedit-guard-product-brief.md`，`harness/map-list-summary-postedit-guard-checklist.md`，`scripts/prepare-map-list-blocked-summary.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：Z 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只让 wrapper 成功输出更明确地要求生成后编辑必须复跑 guard。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed；post-edit guard 通过也不能替代真实 UI 证据
- 下一步最佳动作：提交 Z 组并启动用户评测 agent，评估 Z 相比 Y 是否降低“生成后手工编辑但不复跑 guard”的误用风险；若继续推进，优先恢复 DevTools UI/真机入口，或把当前 blocked evidence 链路整理成更高层的人工验收准入说明

### Session 038AA

- 日期：2026-06-14
- 分支：`codex/iter-map-list-summary-preflight`
- 本轮目标：第二十七组地图列表 blocked summary 评审前 preflight 实验，在 Z 组已打印单对 post-edit guard 命令后，提供一键扫描 ignored local blocked summary/result 对并逐对复跑 guard 的入口
- 已完成：产品 agent 新增 `harness/map-list-summary-preflight-product-brief.md`，定义一键 preflight 的评审价值、验收标准和非 UI passed 边界；设计/QA agent 新增 `harness/map-list-summary-preflight-checklist.md`，覆盖无 local summary、正向扫描一对、缺 results JSON、summary 被改 passed、清理和报告口径；开发 agent 新增 `scripts/check-map-list-blocked-summary-preflight.mjs`，扫描 `harness/manual-test-summary.local*.md`，派生对应 `harness/manual-test-results.local*.json`，并对每对调用 `scripts/check-map-list-blocked-summary.mjs`；开发 agent同时更新 `scripts/prepare-map-list-blocked-summary.mjs`，在成功输出中提示评审前可运行 `node scripts/check-map-list-blocked-summary-preflight.mjs`；主线程补充 preflight 输出，明确它不是 UI passed evidence；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/check-map-list-blocked-summary-preflight.mjs`；`node --check scripts/prepare-map-list-blocked-summary.mjs`；无 local summary 时运行 `node scripts/check-map-list-blocked-summary-preflight.mjs` 应通过；`node scripts/prepare-map-list-blocked-summary.mjs --reason "DevTools service port blocked; map-list visual smoke was not executed." --results-out harness/manual-test-results.local-aa-preflight.json --summary-out harness/manual-test-summary.local-aa-preflight.md --force`；正向运行 `node scripts/check-map-list-blocked-summary-preflight.mjs` 应通过；删除对应 results JSON 后 preflight 应失败；重新生成 pair 后把 summary 目标行改成 `passed`，preflight 应失败；清理 local JSON/MD 和 `/tmp` 临时文件
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-summary-preflight`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-summary-preflight`；当前分支为 `codex/iter-map-list-summary-preflight`；无 local summary 输出 `No local blocked summary files found; nothing checked.` 和 `Preflight is not UI passed evidence...`；wrapper 输出 `Review preflight: before citing local blocked summaries, run:` 以及 `node scripts/check-map-list-blocked-summary-preflight.mjs`；正向 preflight 输出 `Checking harness/manual-test-summary.local-aa-preflight.md with harness/manual-test-results.local-aa-preflight.json.`、`Map-list blocked summary checks passed.`、`Map-list blocked summary preflight passed. Checked 1 pair(s).` 和 `Preflight is not UI passed evidence...`；缺 results 负向输出 `Missing results JSON for harness/manual-test-summary.local-aa-preflight.md; expected harness/manual-test-results.local-aa-preflight.json.`；passed 篡改负向输出 `map-list-visual-smoke summary row must not be passed` 和 `Map-list blocked summary preflight failed for 1 item(s).`
- 更新过的文件或工件：`harness/map-list-summary-preflight-product-brief.md`，`harness/map-list-summary-preflight-checklist.md`，`scripts/check-map-list-blocked-summary-preflight.mjs`，`scripts/prepare-map-list-blocked-summary.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：AA 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只让评审前更容易统一复跑 ignored local blocked summary guard。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed；preflight 通过也不能替代真实 UI 证据
- 下一步最佳动作：提交 AA 组并启动用户评测 agent，评估 AA 相比 Z 是否降低 reviewer 漏跑单对 guard 的风险；若继续推进，优先恢复 DevTools UI/真机入口，或把 blocked evidence/preflight 流程接入更靠近提交前的 harness/readiness 检查但仍保持不提交 ignored local 证据

### Session 039AB

- 日期：2026-06-14
- 分支：`codex/iter-map-list-summary-readiness-preflight`
- 本轮目标：第二十八组地图列表 blocked summary 默认入口 preflight 实验，在 AA 组已有一键 preflight 后，把它接入常规启动和 DevTools readiness 检查，降低评审前忘记运行 preflight 的风险
- 已完成：产品 agent 新增 `harness/map-list-summary-readiness-preflight-product-brief.md`，定义默认入口运行 blocked summary preflight 的价值、验收和非 UI passed 边界；设计/QA agent 新增 `harness/map-list-summary-readiness-preflight-checklist.md`，覆盖无 local summary、正向 pair、缺 results JSON、summary 改 passed、清理和报告口径；开发 agent 更新 `harness/init.sh`，在 JSON/harness 检查后运行 `node scripts/check-map-list-blocked-summary-preflight.mjs`；开发 agent 更新 `scripts/check-devtools-readiness.mjs`，把 blocked summary preflight 接入 readiness，并输出它不证明 DevTools 或真机 UI passed；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/check-map-list-blocked-summary-preflight.mjs`；`node --check scripts/check-devtools-readiness.mjs`；无 local summary 时运行 `bash harness/init.sh` 应通过；无 local summary 时运行 `node --no-warnings scripts/check-devtools-readiness.mjs` 应通过；生成 `harness/manual-test-results.local-ab-readiness.json` 和 `harness/manual-test-summary.local-ab-readiness.md` 后，`bash harness/init.sh` 和 readiness 均应通过；删除对应 results JSON 后 `bash harness/init.sh` 应失败；重新生成 pair 并把 summary 目标行改成 `passed` 后 readiness 应失败；清理 local JSON/MD
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/map-list-summary-readiness-preflight`，对应约定 `/tmp/street-tasks-iter-worktrees/map-list-summary-readiness-preflight`；当前分支为 `codex/iter-map-list-summary-readiness-preflight`；无 local summary 的 init 输出 `+ node scripts/check-map-list-blocked-summary-preflight.mjs`、`No local blocked summary files found; nothing checked.` 和 `Preflight is not UI passed evidence...`；无 local summary 的 readiness 输出 `Running blocked summary preflight. This preflight does not prove DevTools or real-device UI passed.`；正向 pair 的 init/readiness 输出 `Checking harness/manual-test-summary.local-ab-readiness.md with harness/manual-test-results.local-ab-readiness.json.`、`Map-list blocked summary checks passed.` 和 `Map-list blocked summary preflight passed. Checked 1 pair(s).`；缺 results 负向输出 `Missing results JSON for harness/manual-test-summary.local-ab-readiness.md; expected harness/manual-test-results.local-ab-readiness.json.`；passed 篡改负向输出 `map-list-visual-smoke summary row must not be passed` 且 readiness gate failed
- 更新过的文件或工件：`harness/map-list-summary-readiness-preflight-product-brief.md`，`harness/map-list-summary-readiness-preflight-checklist.md`，`harness/init.sh`，`scripts/check-devtools-readiness.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：AB 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只让常规启动和 readiness 默认复跑 ignored local blocked summary guard。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed；默认入口 preflight 通过也不能替代真实 UI 证据
- 下一步最佳动作：提交 AB 组并启动用户评测 agent，评估 AB 相比 AA 是否降低人工忘记运行 preflight 的风险；若继续推进，优先恢复 DevTools UI/真机入口，或改善 failed readiness 输出可读性但不改变 blocked evidence 语义

### Session 040AC

- 日期：2026-06-14
- 分支：`codex/iter-package-readiness-gate`
- 本轮目标：第二十九组 npm 级 readiness gate 实验，在 AB 组已将 blocked summary preflight 接入默认入口后，把 JSON、harness、readiness/default preflight 暴露为更常见的 npm 检查命令，方便人工和自动化统一调用
- 已完成：产品 agent 新增 `harness/package-readiness-gate-product-brief.md`，定义 npm 级检查入口的价值、验收和非 UI passed 边界；设计/QA agent 新增 `harness/package-readiness-gate-checklist.md`，覆盖各 npm script、正向 local pair、缺 results JSON、summary 改 passed、清理和报告口径；开发 agent 更新 `package.json`，新增 `check`、`check:harness`、`check:blocked-summary`、`check:readiness`，并保留 `check:json`；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`git diff --check`；`npm run check:json`；`npm run check:harness`；`npm run check:blocked-summary`；`npm run check:readiness`；`npm run check`；生成 `harness/manual-test-results.local-ac-package.json` 和 `harness/manual-test-summary.local-ac-package.md` 后 `npm run check` 应通过；删除对应 results JSON 后 `npm run check` 应失败；重新生成 pair 并把 summary 目标行改成 `passed` 后 `npm run check:readiness` 应失败；清理 local JSON/MD
- 已记录证据：`npm run check:json` 输出 `Checked 11 JSON files.`；`npm run check:harness` 输出 `Harness OK: 6 features checked.`；无 local summary 的 `npm run check:blocked-summary` 输出 `No local blocked summary files found; nothing checked.` 和 `Preflight is not UI passed evidence...`；无 local summary 的 `npm run check:readiness` 输出 blocked summary preflight 口径且通过；`npm run check` 串联 `check:json`、`check:harness`、`check:readiness` 并通过；正向 local pair 的 `npm run check` 输出 `Checking harness/manual-test-summary.local-ac-package.md with harness/manual-test-results.local-ac-package.json.`、`Map-list blocked summary checks passed.` 和 `Map-list blocked summary preflight passed. Checked 1 pair(s).`；缺 results 负向输出 `Missing results JSON for harness/manual-test-summary.local-ac-package.md; expected harness/manual-test-results.local-ac-package.json.`；passed 篡改负向输出 `map-list-visual-smoke summary row must not be passed`
- 更新过的文件或工件：`harness/package-readiness-gate-product-brief.md`，`harness/package-readiness-gate-checklist.md`，`package.json`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：AC 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只让本地和未来自动化更容易调用现有静态/readiness/preflight 门禁。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed；`npm run check` 通过也不能替代真实 UI 证据
- 下一步最佳动作：提交 AC 组并启动用户评测 agent，评估 AC 相比 AB 是否降低“默认入口存在但调用不统一”的风险；若继续推进，优先恢复 DevTools UI/真机入口，或设计不强制安装的可选 git hook/CI 文档，但避免把本地 blocked evidence 当发布准入

### Session 041AD

- 日期：2026-06-14
- 分支：`codex/iter-ci-readiness-gate`
- 本轮目标：第三十组 CI readiness gate 实验，在 AC 组已有 `npm run check` 后，新增最小 GitHub Actions workflow，让 push 和 pull_request 自动运行 JSON、harness、readiness 和 blocked summary preflight 门禁
- 已完成：产品 agent 新增 `harness/ci-readiness-gate-product-brief.md`，定义 CI 门禁价值、验收和非 UI passed 边界；设计/QA agent 新增 `harness/ci-readiness-gate-checklist.md`，覆盖 workflow 结构、npm check 正向、缺 results/summary passed 负向、清理和报告口径；开发 agent 新增 `.github/workflows/readiness.yml`，在 push/pull_request 上用 Ubuntu、Node 20、`npm ci --ignore-scripts` 和 `npm run check` 执行门禁，并设置 `contents: read` 权限；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`ruby -e 'require "yaml"; YAML.load_file(".github/workflows/readiness.yml"); puts "workflow yaml ok"'`；workflow 结构检查；workflow 单独扫描确认不含 secrets、artifact、local evidence 或 UI passed 口径；`npm run check`；生成 `harness/manual-test-results.local-ad-ci.json` 和 `harness/manual-test-summary.local-ad-ci.md` 后 `npm run check` 应通过；删除对应 results JSON 后 `npm run check` 应失败；重新生成 pair 并把 summary 目标行改成 `passed` 后 `npm run check` 应失败；清理 local JSON/MD
- 已记录证据：workflow YAML 解析输出 `workflow yaml ok`，结构检查输出 `workflow structure ok`；workflow 中包含 `on: push`、`pull_request`、`permissions: contents: read`、`actions/checkout@v4`、`actions/setup-node@v4`、`npm ci --ignore-scripts` 和 `npm run check`；workflow 单独敏感词扫描无命中；无 local summary 的 `npm run check` 通过并输出 `Preflight is not UI passed evidence...`；正向 local pair 的 `npm run check` 输出 `Checking harness/manual-test-summary.local-ad-ci.md with harness/manual-test-results.local-ad-ci.json.`、`Map-list blocked summary checks passed.` 和 `Map-list blocked summary preflight passed. Checked 1 pair(s).`；缺 results 负向输出 `Missing results JSON for harness/manual-test-summary.local-ad-ci.md; expected harness/manual-test-results.local-ad-ci.json.`；passed 篡改负向输出 `map-list-visual-smoke summary row must not be passed`
- 更新过的文件或工件：`.github/workflows/readiness.yml`，`harness/ci-readiness-gate-product-brief.md`，`harness/ci-readiness-gate-checklist.md`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：AD 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只让 `npm run check` 具备未来 push/PR 自动化入口。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed；本地未验证 GitHub Actions 在远端仓库真实触发、分支保护或 PR required check 配置
- 下一步最佳动作：提交 AD 组并启动用户评测 agent，评估 AD 相比 AC 是否降低“本地命令存在但没有自动化门禁”的风险；若继续推进，优先恢复 DevTools UI/真机入口，或改善 readiness 失败输出可读性并避免断言真实 UI 通过

### Session 042AE

- 日期：2026-06-14
- 分支：`codex/iter-ci-required-check-runbook`
- 本轮目标：第三十一组 CI required-check runbook 实验，在 AD 组已有 GitHub Actions workflow 后，补充远端 workflow 触发验证、required check 名称确认和 branch protection 配置步骤，同时避免声称远端已通过或分支保护已配置
- 已完成：产品 agent 新增 `harness/ci-required-check-runbook-product-brief.md`，定义 runbook 的目标、用户价值、验收和非 UI passed 边界；设计/QA agent 新增 `harness/ci-required-check-runbook-checklist.md`，覆盖本地 `npm run check`、workflow YAML、远端 Actions 验证、required check 名称、branch protection 配置和未验证口径；开发 agent 更新 `.github/workflows/readiness.yml`，为 `readiness` job 添加稳定显示名 `readiness / npm run check`；开发 agent 新增 `harness/ci-required-check-runbook.md`，说明如何验证远端 workflow、读取实际 check 名称、配置 required status check、记录证据和报告未验证状态；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`npm run check`；`ruby -e 'require "yaml"; y=YAML.load_file(".github/workflows/readiness.yml"); puts "workflow=#{y["name"]}; job=#{y.dig("jobs", "readiness", "name")}"'`；`git diff --check`；`rg` 检查 runbook 包含 remote Actions、required status checks、branch protection、unverified、workflow run URL 等关键口径；workflow/runbook 扫描确认没有 secrets、artifact、local evidence 引用或虚假 UI passed 声称
- 已记录证据：`npm run check` 通过并继续输出 static/readiness/preflight 非 UI passed 口径；workflow YAML 解析输出 `workflow=Readiness checks; job=readiness / npm run check`；runbook 明确 `Do not record the workflow as verified until a remote run exists and its final status has been checked in GitHub.`；runbook 明确 `Do not mark branch protection as configured until the repository settings show the readiness check as required and a pull request displays it as a required check.`；runbook 证据模板包含 `Workflow run URL`、`Observed check name` 和 `Required check configured`
- 更新过的文件或工件：`.github/workflows/readiness.yml`，`harness/ci-required-check-runbook.md`，`harness/ci-required-check-runbook-product-brief.md`，`harness/ci-required-check-runbook-checklist.md`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：AE 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只把远端 Actions 和 branch protection 验证步骤文档化并稳定 job display name。地图列表真实视觉 smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed；本地仍未实际验证远端 GitHub Actions 触发、分支保护 required check 生效或 PR 合并阻断
- 下一步最佳动作：提交 AE 组并启动用户评测 agent，评估 AE 相比 AD 是否降低“有 workflow 但远端触发和 required check 配置不可验证”的风险；若继续推进，优先恢复 DevTools UI/真机入口，或在有远端权限时实际执行 runbook 并记录真实 workflow run URL 与 branch protection 结果

### Session 043AF

- 日期：2026-06-14
- 分支：`codex/iter-devtools-smoke-command`
- 本轮目标：第三十二组 DevTools smoke 手动命令入口实验，在 AE 已补充远端 CI runbook 但本机 DevTools 9420 端口仍 blocked 后，把真实 UI smoke 的端口诊断和 strict smoke 入口暴露为明确 npm 命令，同时不把本机 GUI 依赖加入默认 `npm run check` 或 CI
- 已完成：产品 agent 新增 `harness/devtools-smoke-command-product-brief.md`，定义 AF 的价值、非目标、当前 blocked 预期和“不声称 UI smoke 通过”的边界；设计 agent 新增 `harness/devtools-smoke-command-design-note.md`，统一 `blocked`、`unverified`、`passing` 口径和 `inspect:*` / `check:*` 命名体验；QA agent 新增 `harness/devtools-smoke-command-checklist.md`，覆盖 package scripts、当前 blocked 记录、恢复 Service Port 后复测和证据字段；开发 agent 更新 `package.json`，新增 `inspect:devtools-port` 与 `check:devtools-smoke`，并保持默认 `check` 不运行 strict DevTools smoke；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node scripts/check-json.mjs`；`npm run inspect:devtools-port`；`npm run check:devtools-smoke`；`npm run check`；`git diff --check`；检查未写入错误日期
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/devtools-smoke-command`，对应约定 `/tmp/street-tasks-iter-worktrees/devtools-smoke-command`；当前分支为 `codex/iter-devtools-smoke-command`；`bash harness/init.sh` 完整跑通，`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`npm run inspect:devtools-port` 退出 0 并输出 `status: blocked`、`diagnosis: declared_without_listener, connect_refused`、`lsof listener: no (no listener rows)`、`socket connect: no (127.0.0.1: ECONNREFUSED; ::1: ECONNREFUSED)`、`process scan: yes (21 related process(es), 1 declaring requested port)`；`npm run check:devtools-smoke` 按预期以 strict 模式非零退出并输出 `status: blocked`、`service port 9420: no`、`ide-http-port process: yes (1 matching declaration(s), 1 DevTools-like)`、`requested DevTools service port is not listening`；`npm run check` 仍只串联 JSON、harness 和 readiness/default preflight 并通过；`git diff --check` 通过
- 更新过的文件或工件：`package.json`，`harness/devtools-smoke-command-product-brief.md`，`harness/devtools-smoke-command-design-note.md`，`harness/devtools-smoke-command-checklist.md`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：AF 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只把端口诊断和 strict smoke 入口变成显式手动命令。`check:devtools-smoke` 当前 blocked 是环境阻塞证据，不是地图、列表、发布或详情 UI 失败；真实 DevTools UI smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed
- 下一步最佳动作：提交 AF 组并启动用户评测 agent，评估 AF 相比 AE 是否更直接暴露当前真实 DevTools blocker；若继续推进，优先在有用户操作配合时启用 WeChat DevTools Service Port 并复跑 strict smoke，或围绕 blocked/ready 转换补充更高层恢复准入说明

### Session 044AG

- 日期：2026-06-14
- 分支：`codex/iter-devtools-recovery-command`
- 本轮目标：第三十三组 DevTools recovery dry-run 手动入口实验，在 AF 已能明确诊断和 strict smoke blocked 后，把已有 recovery helper 的无副作用干跑模式暴露为 npm 命令，帮助执行者看到 before/actions/after/next steps，但不默认退出或重新打开 DevTools
- 已完成：产品 agent 新增 `harness/devtools-recovery-command-product-brief.md`，定义 recovery dry-run 的用户价值、非目标、使用场景和当前 blocked 预期；设计 agent 新增 `harness/devtools-recovery-command-design-note.md`，定义 before status、actions attempted/skipped、after status、next steps 四段报告结构和 side-effect 文案边界；QA agent 新增 `harness/devtools-recovery-command-checklist.md`，覆盖 package script、dry-run 输出、显式 side-effect 恢复复测和证据格式；开发 agent 更新 `package.json`，新增 `inspect:devtools-recovery` 并保持默认 `check` 不运行 recovery dry-run 或 `--quit-reopen`；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node scripts/check-json.mjs`；`npm run inspect:devtools-recovery`；`npm run check`；`git diff --check`；检查未写入错误日期
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/devtools-recovery-command`，对应约定 `/tmp/street-tasks-iter-worktrees/devtools-recovery-command`；当前分支为 `codex/iter-devtools-recovery-command`；`bash harness/init.sh` 完整跑通，`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`，`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`npm run inspect:devtools-recovery` 退出 0 并输出 `WeChat DevTools service port recovery report`、`mode: dry-run diagnostics`、`Before status: status: blocked`、`Actions attempted/skipped` 中 DevTools quit、reopen wait、DevTools open 均为 `skipped because --dry-run was requested`、`After status: status: blocked`、`Next steps` 提示如需恢复须显式 `--quit-reopen` 且实际 UI journey 需另行手测；`npm run check` 仍只串联 JSON、harness 和 readiness/default preflight 并通过；`git diff --check` 通过
- 更新过的文件或工件：`package.json`，`harness/devtools-recovery-command-product-brief.md`，`harness/devtools-recovery-command-design-note.md`，`harness/devtools-recovery-command-checklist.md`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：AG 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只提供无副作用 recovery dry-run 报告入口。dry-run before/after blocked 是环境仍阻塞且恢复未执行的证据，不是恢复失败的产品 bug，也不是地图、列表、发布或详情 UI 失败。真实 DevTools UI smoke 仍未执行，不能写 UI passed、DevTools passed 或真机 passed
- 下一步最佳动作：提交 AG 组并启动用户评测 agent，评估 AG 相比 AF 是否降低“诊断 blocked 后不知道恢复动作边界”的风险；若继续推进，优先由用户在 WeChat DevTools UI 中启用 Service Port 后复跑 AF/AG 命令，或在明确接受 side effect 时直接运行带 `--quit-reopen` 的 node 命令并记录 side effects

### Session 045AH

- 日期：2026-06-15
- 分支：`codex/iter-devtools-recovery-report`
- 本轮目标：第三十四组 DevTools recovery dry-run local report 实验，在 AG 已有无副作用 recovery dry-run 命令后，把该输出保存为 ignored local Markdown 草稿，并用 guard 防止交接报告被误写成恢复成功或 UI smoke passed
- 已完成：产品 agent 新增 `harness/devtools-recovery-report-product-brief.md`，定义 ignored local report 的交接价值、非目标、报告字段和 guard 要求；设计 agent 新增 `harness/devtools-recovery-report-design-note.md`，定义 run metadata、guard status、raw dry-run report、next action 的信息层级和避免写法；QA agent 新增 `harness/devtools-recovery-report-checklist.md`，覆盖 ignored 路径、package scripts、正向生成、负向篡改和清理；开发 agent 新增 `scripts/prepare-devtools-recovery-report.mjs` 与 `scripts/check-devtools-recovery-report.mjs`，更新 `.gitignore` 和 `package.json`，并保持默认 `npm run check` 不运行 local report 工具；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/prepare-devtools-recovery-report.mjs`；`node --check scripts/check-devtools-recovery-report.mjs`；`node scripts/check-json.mjs`；`npm run prepare:devtools-recovery-report -- --out harness/devtools-recovery-report.local-ah.md --force`；`npm run check:devtools-recovery-report -- --report harness/devtools-recovery-report.local-ah.md`；非 ignored output 路径负向；已有报告无 `--force` 负向；`UI smoke passed`、`DevTools recovered`、`恢复成功` 三类篡改负向；`npm run check`；`git diff --check`；清理 local report 文件
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/devtools-recovery-report`，对应约定 `/tmp/street-tasks-iter-worktrees/devtools-recovery-report`；当前分支为 `codex/iter-devtools-recovery-report`；正向 prepare 输出 `DevTools recovery report checks passed.`、`Report: harness/devtools-recovery-report.local-ah.md`、`DevTools recovery report guard passed.`、`This report is not UI passed evidence.`；生成的 local report 包含 branch `codex/iter-devtools-recovery-report`、commit `e6a5cf2`、command `node scripts/recover-devtools-service-port.mjs --dry-run`、exitCode `0`、`mode: dry-run diagnostics`、before/after `status: blocked`、DevTools quit/reopen wait/DevTools open 均 `skipped because --dry-run was requested`；单独 guard 输出 `DevTools recovery report checks passed.`；非 ignored output 路径被拒绝；已有报告无 `--force` 被拒绝；三类篡改分别输出 `Report must not claim unverified success: UI smoke passed`、`DevTools recovered`、`恢复成功`；`npm run check` 仍通过且不调用 local report 工具；local report 文件已清理
- 更新过的文件或工件：`.gitignore`，`package.json`，`scripts/prepare-devtools-recovery-report.mjs`，`scripts/check-devtools-recovery-report.mjs`，`harness/devtools-recovery-report-product-brief.md`，`harness/devtools-recovery-report-design-note.md`，`harness/devtools-recovery-report-checklist.md`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：AH 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；它只生成并校验 ignored local recovery dry-run 草稿。报告 guard 通过只证明草稿仍是 dry-run/actions skipped/非通过声明，不能写 UI passed、DevTools recovered、真机 passed 或地图列表视觉通过。真实 DevTools UI smoke 仍未执行
- 下一步最佳动作：提交 AH 组并启动用户评测 agent，评估 AH 相比 AG 是否降低“控制台输出难交接或 local 草稿被误写成恢复成功”的风险；若继续推进，优先在用户可操作 DevTools 时启用 Service Port 后复跑 AF/AG/AH 命令，或把 recovery report guard 接入更高层的手测交接 preflight 但继续避免默认 CI/`npm run check` 依赖本机 GUI

### Session 046AI

- 日期：2026-06-15
- 分支：`codex/iter-devtools-recovery-report-preflight`
- 本轮目标：第三十五组 AI DevTools recovery report preflight 实验，在 AH 已能生成并 guard 单份 ignored local recovery dry-run report 后，新增交接前手动 preflight 扫描当前 worktree 的所有 local reports 并逐份复跑 guard
- 已完成：产品 agent 新增 `harness/devtools-recovery-report-preflight-product-brief.md`，定义批量 preflight 的用户价值、非目标、使用场景和验收口径；设计 agent 新增 `harness/devtools-recovery-report-preflight-design-note.md`，定义 scan scope、per-report result、aggregate status 和非 UI evidence 警告；QA agent 新增 `harness/devtools-recovery-report-preflight-checklist.md`，覆盖默认 check 不接入、无 report、单份/多份 report、负向篡改和清理；开发 agent 新增 `scripts/check-devtools-recovery-report-preflight.mjs` 并在 `package.json` 暴露 `check:devtools-recovery-report-preflight`，保持默认 `npm run check` 不运行本地 recovery report preflight；主线程同步更新 `harness/feature_list.json`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check scripts/check-devtools-recovery-report-preflight.mjs`；无 local report 的 `npm run check:devtools-recovery-report-preflight`；生成两份有效 local report 后的 `npm run check:devtools-recovery-report-preflight`；追加 `DevTools recovered` 的负向 preflight；追加 `UI smoke passed` 的负向 preflight；清理 `harness/devtools-recovery-report.local*.md`；`npm run check`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`git diff --check`；检查新文件未写入旧日期
- 已记录证据：无 local report 时 preflight 输出 `No local DevTools recovery reports found; nothing checked.` 和非 UI passed 警告；两份有效 local report 时 preflight 逐份输出 `Checking harness/devtools-recovery-report.local-ai-*.md.`、单份 guard 通过，并输出 `DevTools recovery report preflight passed. Checked 2 report(s).`；追加 `DevTools recovered` 或 `UI smoke passed` 后 preflight 均非零退出，单份 guard 输出对应 `Report must not claim unverified success` 原因；`npm run check` 仍只串联 JSON、harness 和 readiness/default preflight，不调用 recovery report preflight；所有 ignored local recovery reports 已清理
- 更新过的文件或工件：`package.json`，`scripts/check-devtools-recovery-report-preflight.mjs`，`harness/devtools-recovery-report-preflight-product-brief.md`，`harness/devtools-recovery-report-preflight-design-note.md`，`harness/devtools-recovery-report-preflight-checklist.md`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：AI 组不修改页面 UI，也没有恢复 DevTools 9420 服务端口；preflight 通过只证明当前 ignored local recovery dry-run 草稿逐份通过 guard，不代表 UI passed、DevTools recovered、真机 passed、地图列表视觉通过或 service port 已恢复。真实 DevTools UI smoke 仍未执行
- 下一步最佳动作：按用户要求本轮运行完后生成结论并终止；若未来恢复工作，应优先由有 UI 权限的执行者恢复 WeChat DevTools service port，再复跑 AF/AG/AH/AI 手动命令并单独执行真实 UI smoke

### Session 047Integration

- 日期：2026-06-15
- 分支：`codex/integrate-all-capabilities`
- 本轮目标：按用户要求把已探索完成的产品能力和验证能力集合到主分支候选中
- 已完成：从 `main` 新建独立集成 worktree，合并 `codex/iter-devtools-recovery-report-preflight`、`codex/iter-map-ux`、`codex/iter-detail-trust`、`codex/iter-admin-risk` 和 `codex/iter-profile-activity`；保留发布准备度、详情 TrustInsight、地图 NearbyPreview、地图列表静态 guard、管理风险处理、个人中心状态面板、manual evidence/readiness/DevTools 诊断/recovery report 等能力；解决 DESIGN_SYSTEM 和 harness 记录冲突
- 运行过的验证：合并前后运行 `bash harness/init.sh`；地图合并后运行 `node --check pages/map/map.js`、`node --check utils/post-presenter.js`、`node --check utils/geo.js`、`node harness/check-map-feed.mjs`；详情合并后运行 `node --check pages/detail/detail.js`、`node --check utils/format.js`、`node harness/check-trust-insight.mjs`；管理合并后运行 `node --check pages/admin/admin.js`、`node --check pages/admin/admin-review.js`、`node scripts/check-admin-review.mjs`；个人中心合并后运行 `node --check pages/me/me.js`、`node --check pages/me/me-state.js`、`node scripts/check-me-state.mjs`；后续还需跑完整候选验证
- 已记录证据：各功能 helper 均已通过；`node scripts/check-json.mjs` 和 `node harness/check-harness.mjs` 在冲突解决后通过；项目既有 `MODULE_TYPELESS_PACKAGE_JSON` ESM warning 仍只影响 Node 检查输出，不影响退出码
- 已知风险或未解决问题：本集成仍未完成真实 WeChat DevTools UI smoke 或真机验证；9420 service port blocker 仍需用户在 DevTools UI 中处理。集成进入 main 后仍不能把 map-feed 或其他用户可见旅程标记为 passing
- 下一步最佳动作：运行完整候选验证，通过后把 `codex/integrate-all-capabilities` 合入 `main`，同时保护 `/Users/bytedance/git/x` 当前未提交的本地文件

### Session 048Bugfix

- 日期：2026-06-15
- 分支：`main`
- 本轮目标：按用户真实体验反馈，修复地图“附近优先”看不见，以及管理员校验失败时展示 raw cloud.callFunction 堆栈的问题
- 已完成：地图 `NearbyPreview` 从“未打开列表且未选中任务才显示”改为“未打开列表且有预览任务就显示”；选中任务卡在预览条可见时上移，避免与预览条重叠；管理员校验新增 `formatAdminRoleError`，把 `wx-server-sdk` 缺依赖、getMyRole 未部署/环境不匹配和未知云函数失败映射成短状态与处理步骤；“我的”页管理员入口展示 `处理:` 下一步；readiness 新增 admin auth error formatting guard
- 运行过的验证：`node --check utils/auth.js`；`node --check pages/me/me.js`；`node --check pages/map/map.js`；`node scripts/check-admin-auth-errors.mjs`；`node harness/check-map-feed.mjs`；`npm run check`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS
- 已记录证据：`scripts/check-admin-auth-errors.mjs` 输出 `Admin auth error checks passed.`；`harness/check-map-feed.mjs` 输出 `Map feed checks passed.`；`npm run check` 输出 JSON、harness、publish flow、TrustInsight、candidate flow、Admin auth error、map list resilience 和 blocked summary preflight 全部通过；`wcc` 与 `wcsc -lc` 均退出 0 且无错误输出
- 已知风险或未解决问题：尚未由用户在 WeChat DevTools 里重新编译后肉眼确认地图首屏；管理员真正通过仍取决于云端 `getMyRole` 函数重新上传并选择“云端安装依赖”，以及 `admins` 集合里有当前 openid 的 enabled admin 记录
- 下一步最佳动作：请用户在 WeChat DevTools 重新编译项目，先回到地图 tab 确认“附近优先”出现；再到“我的”页点管理员校验，若仍提示依赖未安装，则按提示重新上传部署 `cloudfunctions/getMyRole`

### Session 049Bugfix

- 日期：2026-06-15
- 分支：`main`
- 本轮目标：继续修复用户反馈的“底部任务列表入口/抽屉依旧没看到”
- 已完成：确认原实现把 `button/view/scroll-view` 绝对定位在全屏 `map` 原生组件上方，真实 DevTools 中可能被原生 map 层遮挡；将折叠态地图任务入口改为 `cover-view` 底部 dock，文案为“附近优先 / 列表”；地图工具按钮也改为 `cover-view`/`cover-image`；打开列表时为根节点增加 `list-open`，把 native map 高度缩到 `38vh`，并让普通任务卡抽屉从 `top: 38vh` 开始渲染，避免抽屉继续压在原生地图上
- 运行过的验证：`node --check pages/map/map.js`；`node --check scripts/check-map-list-resilience.mjs`；`node --check harness/check-map-feed.mjs`；`node harness/check-map-feed.mjs`；`node scripts/check-map-list-resilience.mjs`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；`npm run check`
- 已记录证据：`harness/check-map-feed.mjs` 输出 `Map feed checks passed.`；`scripts/check-map-list-resilience.mjs` 输出 `Map list resilience checks passed.`；`npm run check` 输出 JSON、harness、publish flow、TrustInsight、candidate flow、Admin auth error、map list resilience 和 blocked summary preflight 全部通过；`wcc` 与 `wcsc -lc` 均退出 0 且无错误输出
- 已知风险或未解决问题：仍需用户在 WeChat DevTools 中重新编译后确认底部 cover-view dock 可见，点击后抽屉在下半屏显示并能滚动/点击任务卡；自动检查不能替代真实原生 map 层视觉验收
- 下一步最佳动作：用户重新编译并打开地图 tab，观察底部“附近优先 / 列表”dock，点击“列表”确认抽屉露出；若仍不显示，优先截图地图页全屏和控制台首条错误

### Session 050Bugfix

- 日期：2026-06-15
- 分支：`main`
- 本轮目标：修复用户截图反馈的“附近优先 dock 和回到当前位置按钮重叠，找一找按钮不见”
- 已完成：将 `map-tool-row` 从和 `list-dock` 相同的底部位置上移到 `268rpx + safe-area`，确保定位/找一找两个 cover-view 按钮位于 dock 上方；把 cover-view 工具栏从 grid/gap 改为更稳的 flex + margin；把找一找按钮从 gradient 改成 cover-view 更稳定的实色橙色背景；图标改用绝对居中，确保两个按钮都可见
- 运行过的验证：`bash harness/init.sh`；`node --check scripts/check-map-list-resilience.mjs`；`node --check harness/check-map-feed.mjs`；`node harness/check-map-feed.mjs`；`node scripts/check-map-list-resilience.mjs`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS
- 已记录证据：`harness/check-map-feed.mjs` 输出 `Map feed checks passed.`；`scripts/check-map-list-resilience.mjs` 输出 `Map list resilience checks passed.`；`wcc` 与 `wcsc -lc` 均退出 0 且无错误输出
- 已知风险或未解决问题：仍需用户在 WeChat DevTools 重新编译后确认定位和找一找两个按钮在 dock 上方并排可见，点击找一找仍能切换到附近任务
- 下一步最佳动作：用户重新编译地图页，检查 dock 上方右侧是否有两个按钮：左边回到当前位置，右边橙色找一找

### Session 051Bugfix

- 日期：2026-06-15
- 分支：`main`
- 本轮目标：修复用户反馈的“附近优先含义不清、任务卡片和地图 icon 仍重叠”
- 已完成：底部 dock 标题从“附近优先”改为“附近任务”，副文案改成“全部/分类 · N 条任务”，去掉“点开看任务卡”的教学式文案；将定位/找一找工具栏从底部区域移动到地图右上角，彻底避开选中任务卡、详情按钮和底部 dock
- 运行过的验证：`bash harness/init.sh`；`node --check pages/map/map.js`；`node --check scripts/check-map-list-resilience.mjs`；`node --check harness/check-map-feed.mjs`；`node harness/check-map-feed.mjs`；`node scripts/check-map-list-resilience.mjs`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS
- 已记录证据：`harness/check-map-feed.mjs` 输出 `Map feed checks passed.`；`scripts/check-map-list-resilience.mjs` 输出 `Map list resilience checks passed.`；`wcc` 与 `wcsc -lc` 均退出 0 且无错误输出
- 已知风险或未解决问题：仍需用户在 WeChat DevTools 重新编译后确认地图右上角两个工具按钮不再和选中任务卡重叠，底部 dock 文案更易理解
- 下一步最佳动作：用户重新编译地图页，点击 marker 后确认任务卡内详情按钮无遮挡；观察底部 dock 是否显示“附近任务”

### Session 052Bugfix

- 日期：2026-06-15
- 分支：`main`
- 本轮目标：按用户明确偏好，把地图 UI 收敛为“列表入口右上角，回到当前位置和找一找按钮右下角”
- 已完成：取消底部大 dock，改为右上角 `cover-view` 紧凑“列表 + 数量”入口；定位和找一找两个 `cover-view` 工具按钮放回右下角并保持并排；选中任务卡底部上移到工具行上方，避免遮挡按钮；移除选中卡片上旧的 `with-nearby-preview` 条件类；同步更新 `DESIGN_SYSTEM.md`、`harness/check-map-feed.mjs` 和 `scripts/check-map-list-resilience.mjs`，防止后续回退到底部 dock 或顶部工具行
- 运行过的验证：`bash harness/init.sh`；`node --check pages/map/map.js`；`node --check scripts/check-map-list-resilience.mjs`；`node --check harness/check-map-feed.mjs`；`node harness/check-map-feed.mjs`；`node scripts/check-map-list-resilience.mjs`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；`node scripts/check-json.mjs && node harness/check-harness.mjs && git diff --check`；`npm run check`
- 已记录证据：`harness/check-map-feed.mjs` 输出 `Map feed checks passed.`；`scripts/check-map-list-resilience.mjs` 输出 `Map list resilience checks passed.`；`wcc` 与 `wcsc -lc` 均退出 0 且无错误输出；`npm run check` 输出 JSON、harness、publish flow、TrustInsight、candidate flow、Admin auth error、map list resilience 和 blocked summary preflight 全部通过
- 已知风险或未解决问题：自动检查不能替代真实原生地图层视觉验收；仍需用户在 WeChat DevTools 中重新编译后确认右上角“列表 N”入口可见、右下角两个按钮不与选中任务卡重叠、点击“列表”后抽屉仍正常打开
- 下一步最佳动作：用户在 WeChat DevTools 重新编译地图页，先看右上角“列表 N”，再点击 marker 看任务卡和右下角定位/找一找按钮是否分离

### Session 053Bugfix

- 日期：2026-06-15
- 分支：`main`
- 本轮目标：修复用户截图反馈的“右上角列表按钮样式有问题”
- 已完成：确认截图中白底“列表 6”更像地图标签而不是操作按钮；将右上角列表入口改为绿色实色 `cover-view` 按钮，只显示“列表”，任务数量改为右上角橙色小角标；同步更新 `DESIGN_SYSTEM.md`、`harness/check-map-feed.mjs` 和 `scripts/check-map-list-resilience.mjs`，要求后续保持绿色按钮和数量角标
- 运行过的验证：`bash harness/init.sh`；`node --check pages/map/map.js`；`node --check scripts/check-map-list-resilience.mjs`；`node --check harness/check-map-feed.mjs`；`node harness/check-map-feed.mjs`；`node scripts/check-map-list-resilience.mjs`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；`node scripts/check-json.mjs && node harness/check-harness.mjs && git diff --check`；`npm run check`
- 已记录证据：`harness/check-map-feed.mjs` 输出 `Map feed checks passed.`；`scripts/check-map-list-resilience.mjs` 输出 `Map list resilience checks passed.`；`wcc` 与 `wcsc -lc` 均退出 0 且无错误输出；`npm run check` 输出 JSON、harness、publish flow、TrustInsight、candidate flow、Admin auth error、map list resilience 和 blocked summary preflight 全部通过
- 已知风险或未解决问题：自动检查仍不能替代真实原生地图层视觉验收；需要用户在 WeChat DevTools 中重新编译后确认绿色列表按钮和角标不再像地图标签，并且点击仍打开列表抽屉
- 下一步最佳动作：用户在 WeChat DevTools 重新编译地图页，观察右上角是否变成绿色“列表”按钮并带小角标

### Session 054Bugfix

- 日期：2026-06-15
- 分支：`main`
- 本轮目标：按用户澄清修正右上角列表按钮的对齐问题，而不是颜色问题
- 已完成：撤销上一轮绿色按钮/角标方向，恢复白色右上角 `cover-view` 按钮；把原来分开的“列表”和数量节点改为单个 `list-fab-line`，内容为“列表 {{visiblePosts.length}}”；通过固定 `height: 70rpx`、同等 `line-height: 70rpx` 和 `text-align: center` 保证文本与数字在同一条视觉中线上；同步更新 `DESIGN_SYSTEM.md`、`harness/check-map-feed.mjs` 和 `scripts/check-map-list-resilience.mjs`，防止再次拆成两个基线不一致的节点
- 运行过的验证：`bash harness/init.sh`；`node --check pages/map/map.js`；`node --check scripts/check-map-list-resilience.mjs`；`node --check harness/check-map-feed.mjs`；`node harness/check-map-feed.mjs`；`node scripts/check-map-list-resilience.mjs`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；`node scripts/check-json.mjs && node harness/check-harness.mjs && git diff --check`；`npm run check`
- 已记录证据：`harness/check-map-feed.mjs` 输出 `Map feed checks passed.`；`scripts/check-map-list-resilience.mjs` 输出 `Map list resilience checks passed.`；`wcc` 与 `wcsc -lc` 均退出 0 且无错误输出；`npm run check` 输出 JSON、harness、publish flow、TrustInsight、candidate flow、Admin auth error、map list resilience 和 blocked summary preflight 全部通过
- 已知风险或未解决问题：自动检查不能替代真实原生地图层视觉验收；需要用户在 WeChat DevTools 中重新编译后确认“列表 6”同一行居中对齐，并且点击仍打开列表抽屉
- 下一步最佳动作：用户在 WeChat DevTools 重新编译地图页，观察右上角白色“列表 N”按钮内文字和数字是否齐平

### Session 055C

- 日期：2026-06-16
- 分支：`codex/iter-viral-publish`
- 本轮目标：C 组产品/设计/开发围绕“发布成功后的扩散闭环”做最小可验证迭代，让发布者在刚发布任务后知道转给谁、想获得什么信号、稍后如何回访
- 产品假设：发布者刚创建任务时动机最强，如果在 `from=publish` 详情上下文给出清晰扩散对象、确认/线索目标和回访动作，会更愿意转发到附近群或让朋友确认
- 已完成：新增 `harness/viral-publish-product-brief.md` 和 `harness/viral-publish-design-checklist.md`；新增 `utils/publish-spread.js` 生成分类/意图/图片/评论/状态相关的谨慎扩散计划；详情页仅在 `from=publish` 时把原发布成功卡升级为三步扩散计划；`resolved`、`expired`、`hidden` 不鼓励扩散；分享 path 保留非发布来源参数但移除 `from=publish`；新增 `scripts/check-publish-spread.mjs` 并接入 `scripts/check-devtools-readiness.mjs`
- 运行过的验证：`pwd`；读取 `harness/claude-progress.md` 和 `harness/feature_list.json`；`git log --oneline -5`；`bash harness/init.sh`；`node --check utils/publish-spread.js`；`node --check pages/detail/detail.js`；`node --check scripts/check-publish-spread.mjs`；`node --check scripts/check-devtools-readiness.mjs`；`node --no-warnings scripts/check-publish-spread.mjs`；`node --no-warnings scripts/check-devtools-readiness.mjs`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`git diff --check`；微信开发者工具内置 `wcc` 全量编译 WXML；微信开发者工具内置 `wcsc -lc` 全量编译 WXSS；`npm run check`
- 已记录证据：`pwd` 确认为 `/private/tmp/street-tasks-iter-worktrees/viral-publish`，对应约定 `/tmp/street-tasks-iter-worktrees/viral-publish`；当前分支为 `codex/iter-viral-publish`；新增检查先因缺少 `utils/publish-spread.js` 按预期失败，补实现后输出 `Publish spread checks passed.`；四条 `node --check` 均通过；readiness 输出 `Publish flow checks passed.`、`Publish spread checks passed.`、`Trust insight checks passed.`、`Candidate flow checks passed.`、`Admin auth error checks passed.`、`Map list resilience checks passed.` 和 `DevTools readiness checks passed.`；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`git diff --check` 通过无输出；`bash harness/init.sh` 完整跑通；`wcc` 和 `wcsc -lc` 全量编译退出码为 0 且无输出；`npm run check` 通过
- 更新过的文件或工件：`utils/publish-spread.js`，`pages/detail/detail.js`，`pages/detail/detail.wxml`，`pages/detail/detail.wxss`，`scripts/check-publish-spread.mjs`，`scripts/check-devtools-readiness.mjs`，`harness/viral-publish-product-brief.md`，`harness/viral-publish-design-checklist.md`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：尚未在 WeChat DevTools 或真机中完成真实发布、发布后详情跳转、open-type share 系统面板、分享接收路径、窄屏扩散计划布局、图片任务渲染和 resolved/expired 非扩散视觉验证；自动检查不能证明转发率提升或真实分享面板可用
- 下一步最佳动作：在 WeChat DevTools 中用一条带图和一条无图任务走完整发布成功链路，确认扩散计划出现、普通详情入口不出现、转发路径不带 `from=publish`，再用真机观察分享卡片和窄屏布局

### Session 055Share

- 日期：2026-06-16
- 分支：`codex/iter-viral-share`
- 本轮目标：围绕详情页任务转发做一版能提升用户自发裂变的最小可验证迭代
- 已完成：新增 `utils/share-message.js`，把详情页分享标题、路径和说明文案统一收敛到单一 helper；新增 `scripts/check-share-message.mjs` 覆盖 active、stale、report、resolved、expired、hidden 和无任务边界；详情页改为展示轻量分享提示层，明确告诉用户转给谁、为什么转、转出去能帮什么，并让 `onShareAppMessage` 直接复用同一 helper 输出动态 title/path
- 运行过的验证：`node --check utils/share-message.js`；`node --check pages/detail/detail.js`；`node --check scripts/check-share-message.mjs`；`node scripts/check-share-message.mjs`；`node --no-warnings scripts/check-share-message.mjs`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`git diff --check`；`bash harness/init.sh`
- 已记录证据：`node --check` 三项均通过；`node scripts/check-share-message.mjs` 首次命中 expired 断言后已按更谨慎的文案调整通过；`node --no-warnings scripts/check-share-message.mjs` 输出 `Share message checks passed.`；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`git diff --check` 通过无输出；`bash harness/init.sh` 完整跑通并再次通过 JSON 和 harness 自检
- 更新过的文件或工件：`utils/share-message.js`，`scripts/check-share-message.mjs`，`pages/detail/detail.js`，`pages/detail/detail.wxml`，`pages/detail/detail.wxss`，`harness/viral-share-product-brief.md`，`harness/viral-share-design-checklist.md`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：分享模块的实际视觉表现、按钮触发和系统分享菜单仍需在 WeChat DevTools 中手动确认；当前只验证了静态结构和 Node 逻辑
- 下一步最佳动作：在 WeChat DevTools 中打开一条 active、resolved、expired 和高举报详情，逐个点开分享菜单确认 title/path 与页面提示一致

### Session 056ViralCandidate

- 日期：2026-06-16
- 分支：`codex/iter-viral-candidate`
- 本轮目标：组合 C 组发布后扩散计划和 A 组普通详情分享提示，形成更接近合入候选的大版本
- 已完成：从 `codex/iter-viral-publish` 创建候选分支并合入 `codex/iter-viral-share`；详情页现在在 `from=publish` 场景展示发布者专属三步扩散计划，在普通详情入口展示“转给谁 / 为什么转 / 能帮什么”的通用分享提示；`onShareAppMessage` 使用 A 组谨慎标题，发布成功场景继续用 C 组接收侧普通详情 path，避免把发布者专属卡转给接收者
- 运行过的验证：`node --check pages/detail/detail.js`；`node --check utils/share-message.js`；`node --check utils/publish-spread.js`；`node --check scripts/check-share-message.mjs`；`node --check scripts/check-publish-spread.mjs`；`node --check scripts/check-viral-candidate.mjs`；`node --no-warnings scripts/check-share-message.mjs`；`node --no-warnings scripts/check-publish-spread.mjs`；`node --no-warnings scripts/check-viral-candidate.mjs`；`node scripts/check-json.mjs`；`node harness/check-harness.mjs`；`git diff --check`；`bash harness/init.sh`；`npm run check`
- 已记录证据：`node --no-warnings scripts/check-share-message.mjs` 输出 `Share message checks passed.`；`node --no-warnings scripts/check-publish-spread.mjs` 输出 `Publish spread checks passed.`；`node --no-warnings scripts/check-viral-candidate.mjs` 输出 `Viral candidate checks passed.`；`node scripts/check-json.mjs` 输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通；`npm run check` 输出 JSON、harness、publish flow、publish spread、TrustInsight、candidate flow、Admin auth error、map list resilience 和 blocked summary preflight 全部通过
- 更新过的文件或工件：`utils/share-message.js`，`utils/publish-spread.js`，`pages/detail/detail.js`，`pages/detail/detail.wxml`，`pages/detail/detail.wxss`，`scripts/check-share-message.mjs`，`scripts/check-publish-spread.mjs`，`harness/feature_list.json`，`harness/claude-progress.md`
- 已知风险或未解决问题：尚未在 WeChat DevTools/真机中验证组合后的发布成功页、普通详情页、分享面板、接收路径、窄屏布局和带图任务渲染
- 下一步最佳动作：提交组合候选，再把该大版本发送给用户评测 agent 追加评分
