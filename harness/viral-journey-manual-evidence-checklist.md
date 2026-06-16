# 传播链路真实手测证据 Checklist

日期：2026-06-16

## 文档和入口

- [ ] `harness/viral-journey-manual-evidence-product-brief.md` 说明真实手测结果文件的价值、边界和状态规则。
- [ ] `harness/viral-journey-manual-evidence-checklist.md` 明确开发、QA 和收尾验证项。
- [ ] `scripts/check-viral-journey-manual-evidence.mjs` 默认只扫描 ignored/local 结果文件。
- [ ] 即使显式传入结果文件，checker 也拒绝未被 git ignore 的路径。
- [ ] `scripts/prepare-viral-journey-manual-evidence.mjs --dry-run` 不写文件，只打印将生成的 ignored local draft 和后续命令。

## Checker 正向规则

- [ ] 无结果文件时输出 `No viral journey manual evidence files found; nothing checked.`。
- [ ] 无结果文件时额外说明这不代表 DevTools 或真机 UI passed。
- [ ] ignored local 结果文件存在时，校验 `schemaVersion`、`branch`、`commit`、`testedAt`、`tester`、`environment`、`summary` 和 `journeys`。
- [ ] `branch` 必须等于当前分支。
- [ ] `commit` 必须等于当前 HEAD 的 full SHA 或 short SHA。
- [ ] `environment` 必须记录 DevTools/base library、设备、真机/模拟器、网络、CloudBase 和数据准备。
- [ ] 每个 required journey 必须存在且只能存在一次。
- [ ] 不允许把 `harness/viral-journey-manual-results.example.json` 当作真实结果文件。

## Journey 状态规则

- [ ] 状态只允许 `passed`、`failed`、`blocked`。
- [ ] `passed` 必须有非空 evidence，且 evidence 类型是 screenshot、recording、payload 或 log。
- [ ] `passed.actual` 不能是 `Not run`、`<replace-with-...>`、`placeholder`、`TODO`、`待填写` 等占位文本。
- [ ] 关键二跳 journey 的 `passed` 必须包含 share payload，或用 `sharePayloadInspection` 明确说明无法检查。
- [ ] `blocked` 必须有非空 `blocker` 和 `followUp`。
- [ ] `failed` 必须有非空 `actual` 和 `followUp`。
- [ ] `summary.overallStatus` 必须符合聚合规则：任何 failed -> failed；否则任何 blocked -> blocked；否则 required journey 全 passed -> passed。

## Readiness 接入

- [ ] `scripts/check-devtools-readiness.mjs` 运行 manual evidence checker。
- [ ] readiness 输出明确说明 manual evidence checker 只是扫描 ignored/local 结果文件。
- [ ] 没有本地结果文件时 readiness 不阻塞。
- [ ] readiness 不得把无文件、blocked draft 或自动场景模型说成 DevTools/真机 UI passed。

## 手测者填报提醒

- [ ] 从 prepare helper 生成 ignored local draft，或手动复制模板后改成真实 schema。
- [ ] 填入真实分支、commit、DevTools 版本、base library、设备、网络、CloudBase 和测试 post id。
- [ ] 对 confirm/comment 转化 journey，尽量记录系统分享 payload；如果 DevTools 无法检查 payload，要写清楚原因。
- [ ] 截图、录屏、payload 或日志只放 ignored/local 路径，不提交真实结果文件。
- [ ] 修改结果文件后复跑 `node --no-warnings scripts/check-viral-journey-manual-evidence.mjs`。
