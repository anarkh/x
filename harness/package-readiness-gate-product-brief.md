# AC 轮产品 Brief：npm 级检查入口

## 目标

为仓库新增统一的 npm 检查入口，让人和自动化可以通过更常见的命令运行现有静态、harness、readiness 和 blocked summary preflight 检查。

当前 `package.json` 只有 `check:json`。AC 轮希望把 AB 轮已接入默认路径的检查能力暴露为更易发现、可复用的 npm scripts，例如 `npm run check` 覆盖 JSON、harness、DevTools readiness/default preflight 等默认门禁。

## 用户价值

- 新接手的 agent 或开发者不需要记住多条 Node 命令，先运行 `npm run check` 即可完成基础准入检查。
- 自动化、评审和本地开发可以共用同一个入口，减少“只跑了 JSON 检查、漏掉 harness 或 blocked summary preflight”的风险。
- 失败输出仍来自现有脚本，便于定位是 JSON、harness、readiness 还是 ignored local blocked summary 证据不一致。
- npm 入口让 package 层显式表达项目质量门禁，降低后续接入 CI 或提交前检查的成本。

## 验收标准

- `package.json` 保留现有 `check:json`，并新增统一检查入口，优先命名为 `check`。
- `npm run check` 至少运行：
  - `node scripts/check-json.mjs`
  - `node harness/check-harness.mjs`
  - `node --no-warnings scripts/check-devtools-readiness.mjs`
- 如果存在 `harness/manual-test-summary.local*.md`，默认检查必须触发 blocked summary preflight，并在缺失 matching results JSON 或 summary 被改成 `passed` 时失败。
- 无 ignored local summary 时，`npm run check` 应通过，并清楚输出该 preflight 没有真实 UI passed 含义。
- 需要保留或补充一个轻量命令，方便只跑 JSON 检查；不得破坏现有 `npm run check:json`。
- 主 agent 验证时应覆盖正向无 local summary、正向 local blocked pair、缺 results JSON 负向、summary 改 `passed` 负向。

## 非目标

- 不恢复 WeChat DevTools 9420 服务端口，也不改变 DevTools 打开、预览或真机调试方式。
- 不把 blocked summary、readiness 或 npm check 结果写成真实 UI passed、DevTools passed 或真机 passed。
- 不新增 UI、业务行为、云函数或数据模型改动。
- 不引入 npm 依赖、构建框架、CI 配置或 git hook；本轮只定义 package 级本地检查入口。
- 不提交 ignored local evidence 文件；local JSON/Markdown 仍只用于本地阻塞证据演练和评审前检查。
