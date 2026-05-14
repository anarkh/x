# 会话交接

## 当前已验证

- 现在明确可用的部分：仓库已有 `npm run check:json` 作为 JSON 配置检查；harness 基础文件已放在 `harness/`
- 这轮实际跑过的验证：`npm run check:json` 通过，输出 `Checked 11 JSON files.`；`node harness/check-harness.mjs` 通过，输出 `Harness OK: 6 features checked.`；`bash harness/init.sh` 完整跑通，`npm ci --ignore-scripts` 报告 up to date，随后两条验证通过

## 本轮改动

- 新增了哪些代码或行为：无业务行为改动
- 基础设施或 harness 发生了哪些变化：新增 agent harness 文件；根 `AGENTS.md` 增加开工流程、完成定义和收尾要求

## 仍损坏或未验证

- 已知缺陷：未发现由 harness 改动引入的业务缺陷
- 未验证路径：WeChat DevTools 编译、地图浏览、发布、详情信任动作、管理、我的/反馈等用户流程
- 下一轮会话需要注意的风险：本轮开始前已有未提交业务改动；不要误认为这些改动由 harness 初始化产生

## 下一步最佳动作

- 最高优先级未完成功能：`map-feed-001`
- 为什么它是下一步：地图首页是产品主入口，也是发布、详情和管理验证的前置入口
- 什么结果才算 passing：WeChat DevTools 编译通过，地图定位/回退、任务标记、列表和详情跳转都按 `harness/feature_list.json` 记录证据
- 这一步中哪些东西不要动：不要顺手重构 CloudBase 存储或管理权限，除非它直接阻塞地图验证

## 命令

- 初始化命令：`bash harness/init.sh`
- 基础验证命令：`npm run check:json`，`node harness/check-harness.mjs`
- 手动验证入口：WeChat DevTools 打开 `/Users/bytedance/git/x`
