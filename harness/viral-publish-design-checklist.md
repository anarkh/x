# 发布后扩散闭环设计 / QA Checklist

日期：2026-06-16  
适用范围：详情页 `from=publish` 发布成功上下文

## 设计取舍

- 信息层级：保留详情 hero 作为主内容，扩散计划放在 hero 后、信任判断前，避免盖住任务本身。
- 结构：使用“先转给 / 想得到 / 稍后回访”三步计划，而不是长段解释，让发布者能直接行动。
- 语气：使用“请附近的人确认、补线索、回看评论”等谨慎表达，避免“保证有效”“一定找回”等绝对承诺。
- 控件：active/stale 任务显示一个主转发按钮；resolved/expired/hidden 不显示转发主按钮，改为返回地图。
- 普通详情页：只有 `from=publish` 时才渲染扩散计划，其他来源不增加额外模块。

## 自动检查

- [ ] `node --no-warnings scripts/check-publish-spread.mjs`
- [ ] `node --check utils/publish-spread.js`
- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check scripts/check-devtools-readiness.mjs`
- [ ] `node --no-warnings scripts/check-devtools-readiness.mjs`
- [ ] `node scripts/check-json.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check`
- [ ] `bash harness/init.sh`

## 手测清单

- [ ] 从发布页成功发布 active 任务后跳转详情，看到扩散计划。
- [ ] 扩散计划三步文案分别回答“转给谁”“想得到什么”“稍后做什么”。
- [ ] 带图任务显示图片相关提示，且不遮挡详情图片。
- [ ] 已有评论的任务提示先回看评论。
- [ ] `resolved` 或 `expired` 任务即使带 `from=publish`，也不鼓励继续转发。
- [ ] 从地图、列表、我的发布、活动动态进入同一详情页，不显示扩散计划。
- [ ] 点击“转发扩散”能打开微信分享面板；分享卡片路径包含任务 `id`，不携带 `from=publish`。
- [ ] 窄屏下三步计划和按钮不重叠、不截断关键动词。

## 未验证不得声称通过

自动检查只覆盖文案模型、路径拼接和基础语法。open-type share、微信分享面板、真实发布跳转、窄屏布局和图片渲染仍需要 WeChat DevTools 或真机验证；未执行时必须记录为未验证风险。
