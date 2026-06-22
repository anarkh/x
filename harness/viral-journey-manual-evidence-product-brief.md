# 传播链路真实手测证据 Product Brief

日期：2026-06-16

## 目标

在 N 组 `harness/viral-journey-manual-results.example.json` 的 `not_run` 模板之后，补一个只校验真实本地手测结果文件的 gate。默认没有本地结果文件时，gate 应通过并说明“没有检查任何真实 UI 结果”；一旦存在本地结果文件，gate 必须验证它是否能支撑传播链路的真实 DevTools/真机结论。

## 产品判断

传播链路当前已经有自动场景模型，但自动模型只能证明 helper 输出、详情页互斥条件和分享路径拼接逻辑没有回归。真实链路仍会被 DevTools 渲染、系统分享面板、点击顺序、登录/本地 storage 状态、云端评论路径、窄屏布局和真实二跳入口影响。因此需要把“可选的本地手测结果文件”升级成可复跑校验入口，防止把 example、占位文本或无 evidence 的 `passed` 写进交接。

## 结果文件边界

- 推荐使用既有 ignored 命名：`harness/manual-test-results.local-viral-journey*.json`。
- 如果使用 `harness/local-viral-journey-results*.json`，必须先通过本地 git ignore/exclude 让它成为 ignored local 文件；未忽略的真实结果不应进入 readiness 扫描。
- `harness/viral-journey-manual-results.example.json` 永远只是模板，不是结果文件。
- 真实结果文件应记录当前分支、当前 commit、测试环境、数据准备和每条 required journey 的状态。

## 状态规则

- `passed`：必须有非空 evidence，`actual` 不能是模板/占位文本；关键二跳 journey 必须记录 share payload，或明确写出为什么无法检查 payload。
- `failed`：必须写明实际观察到的 `actual` 和下一步 `followUp`。
- `blocked`：必须写明具体 `blocker` 和下一步 `followUp`。
- `overallStatus` 只能由 journey 聚合得出：任一 `failed` 为 `failed`；否则任一 `blocked` 为 `blocked`；否则 required journey 全部 `passed` 才是 `passed`。
- 没有本地结果文件时不能产生 `passed` 结论，只能说明没有真实结果被检查。

## 非目标

- 不改变小程序页面、文案、按钮、分享策略或评论/确认逻辑。
- 不提交真实截图、录屏、payload 或日志。
- 不把 DevTools readiness、自动场景模型或 dry-run 草稿当成 UI passed。
- 不要求 CI 或默认检查拥有 DevTools/真机访问。

## 成功标准

- 默认无本地文件时，manual evidence checker exit 0，并输出没有找到文件且不代表 UI passed。
- 本地 ignored 结果文件存在时，checker 校验 schema、分支/commit、环境、required journey 唯一性、状态字段和 `overallStatus` 聚合。
- readiness 会运行这个 checker，但无文件时不阻塞，也不会暗示 DevTools/真机通过。
- prepare helper 可以生成或预览 ignored local draft；draft 不得声称任何 journey `passed`。
