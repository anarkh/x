# G 组候选硬化产品 Brief

日期：2026-06-14

依据：`harness/candidate-publish-trust-report.md`。本 worktree 未找到 `harness/iteration-evaluation-report.md`，因此本 brief 不引用 eval 报告结论。

## 1. F/G 候选核心产品风险排序

1. 发布闭环真实可用性风险最高：自动验证覆盖了发布页状态机、JSON、WXML/WXSS 编译，但尚未验证真机或 WeChat DevTools 中的定位授权、定位失败重试、提交中状态、发布成功后的详情跳转。
2. 位置确认与主动作状态一致性风险次高：发布页新增准备度清单、位置确认和 `primaryAction` 状态机后，用户最容易卡住的地方是“字段已填但位置未确认/定位仍在等待/授权失败”时按钮文案与可点击状态是否一致。
3. 详情信任解释的行动理解风险：TrustInsight 面板解释确认、过时、举报和评论数，但尚未验证用户在不同状态下能否正确理解“我该确认、标过时、举报还是只读”。
4. 详情页窄屏与入口竞争风险：评论区标题右侧写评论入口与原有悬浮评论按钮共存，窄屏下可能挤压 TrustInsight、信任动作或评论入口。
5. resolved/expired/hidden 等边界状态风险：报告已说明未验证 resolved/expired 只读状态，若信任动作仍显得可操作，会损害用户对任务状态的判断。

## 2. 发布闭环最该被验证的用户路径

优先验证一条从冷启动到完成发布的主路径：

1. 首次进入发布页，用户未授权定位或定位尚未完成。
2. 填写标题、详情、分类、有效期，观察准备度清单和字数计数实时更新。
3. 触发定位授权、定位失败重试或手动确认当前位置，确认主按钮从补字段/确认位置/等待定位切换到可发布。
4. 点击发布，验证提交中态不会重复提交。
5. 发布成功后进入详情页，详情页展示刚发布的标题、详情、分类、地点、有效期和初始信任数据。
6. 返回地图或列表后，新任务可见且状态仍为 active。

这条路径是硬化优先级最高的原因：它同时覆盖新增发布准备度、位置确认、状态机和发布后详情跳转，是用户产生内容的最短闭环。

## 3. 详情信任最该被验证的用户路径

优先验证一条从详情阅读到信任动作反馈的主路径：

1. 从地图或发布成功页进入 active 任务详情。
2. 阅读 TrustInsight，确认面板能解释当前确认数、过时数、举报数和评论数。
3. 点击“确认仍有效”，验证确认数增加、最后确认时间刷新，且同一用户不能重复确认。
4. 点击或尝试“标记过时”和“举报”，验证阈值前后的状态变化文案清楚，且不会误导用户认为举报等于任务已处理。
5. 对 resolved/expired 任务进入详情，验证信任动作呈现只读或不可操作状态。
6. 在窄屏下查看评论入口与悬浮评论按钮，确认不会遮挡 TrustInsight 或主要操作。

这条路径是硬化优先级最高的原因：详情页是发布后判断任务可信度的核心场景，信任解释必须和动作反馈保持一致。

## 4. 本轮硬化范围

本轮只做自动检查：

- 语法检查：`node --check pages/publish/publish.js`、`node --check pages/publish/publish-state.js`、`node --check pages/detail/detail.js`、`node --check utils/format.js`。
- 发布流程脚本：`node --no-warnings scripts/check-publish-flow.mjs`。
- TrustInsight 脚本：`node harness/check-trust-insight.mjs`。
- JSON 检查：`node scripts/check-json.mjs`。
- harness 检查：`node harness/check-harness.mjs`。
- 空白和补丁卫生：`git diff --check`。
- 如本机 WeChat DevTools CLI 可用，再运行 WXML/WXSS 编译检查；若端口或 CLI 阻塞，只记录为未验证。

本轮不做功能：

- 不新增发布能力、详情能力、评论能力或后台能力。
- 不调整产品文案、视觉样式、页面结构或状态机逻辑。
- 不修复定位授权、图片上传、云端评论、真机兼容等未验证问题。
- 不合并 F/G 之外的新候选能力。
- 不回退或整理他人改动。

## 5. 验收清单

- `harness/hardening-product-brief.md` 已写入并只包含本轮产品硬化范围。
- 工作区除本 brief 外无其他文件改动。
- 已记录 `iteration-evaluation-report.md` 缺失，结论只基于 candidate report。
- 已明确发布闭环与详情信任两条最高优先级用户路径。
- 已明确本轮只跑自动检查，不扩大到功能实现或产品改动。
- 完成后运行 `git status --short`，确认实际改动范围。
