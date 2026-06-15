# F 组组合候选报告

日期：2026-06-13

分支：`codex/iter-candidate-publish-trust`

基础：`codex/iter-publish-flow` HEAD `2187007`

叠加：`codex/iter-detail-trust` 提交 `77f2387`、`46552d5`、`4637a2a`

## 组合目标

把当前评分最高的 B 组发布准备度和 C 组详情信任解释放到同一个候选分支，验证二者是否能共存，并为后续手测提供一个更接近合入候选的版本。

## 已包含能力

- 发布页准备度清单、标题/详情计数、位置确认、定位失败/重试文案、有效期直接按钮。
- 发布主动作由 `primaryAction` 状态机驱动，区分登录、补字段、确认位置、等待定位、发布和提交中。
- 详情页新增 TrustInsight 面板，在信任动作前解释确认、过时、举报和评论数。
- 评论区标题右侧新增写评论入口，保留原有悬浮评论按钮。
- 设计系统同时记录 `PublishReadiness`、`LocationCheck` 和 `TrustInsight` 组件规则。

## 运行过的验证

- `node --check pages/publish/publish.js`
- `node --check pages/publish/publish-state.js`
- `node --check pages/detail/detail.js`
- `node --check utils/format.js`
- `node --check harness/check-trust-insight.mjs`
- `node --no-warnings scripts/check-publish-flow.mjs`
- `node harness/check-trust-insight.mjs`
- `node scripts/check-json.mjs`
- `node harness/check-harness.mjs`
- `git diff --check`
- WeChat DevTools local `wcc` compiled all WXML files with exit code 0.
- WeChat DevTools local `wcsc -lc` compiled all WXSS files with exit code 0.

## 未验证项

- 未在 WeChat DevTools 或真机中验证发布定位授权、键盘安全区、图片上传失败回滚、发布后详情跳转。
- 未验证详情页 TrustInsight 在窄屏、评论入口、信任动作刷新、resolved/expired 只读状态和云端评论路径中的真实表现。
- DevTools CLI `open`/`preview` 在 B 组已记录受 9420 服务端口超时阻塞；本组合分支尚未再次尝试 CLI 预览。

## 初步判断

代码层面 B+C 可以组合，当前自动验证未发现冲突。合入优先级仍取决于 B 组的真实发布手测是否通过；若发布链路通过，F 组比单独 B 更适合作为候选，因为它同时补齐发布前准备和详情后判断。
