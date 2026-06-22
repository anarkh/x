# CI Required Check Runbook QA Checklist

## 验收目标

确认 AE 轮 runbook 能把 AD 轮新增的 GitHub Actions 门禁推进到可执行的远端验证流程：本地 `npm run check` 仍是基础，但最终必须能说明远端 workflow 是否触发、required check 的实际名称是什么、branch protection 如何配置，以及哪些 UI/真机项仍未验证。

## 必跑检查

- [ ] 本地执行 `npm run check`，确认它覆盖 JSON、harness、readiness，以及 ignored local blocked summary preflight。
- [ ] 检查 `.github/workflows/readiness.yml` 可解析且保持最小门禁：`push` / `pull_request` 触发、`contents: read`、Node 20、`npm ci --ignore-scripts`、`npm run check`。
- [ ] runbook 必须包含远端验证步骤：推送 AE 分支或打开 PR 后，在 GitHub Actions / PR Checks 页面确认 `Readiness checks` workflow 已实际运行。
- [ ] runbook 必须要求记录 required check 的实际显示名称；候选名称是 `readiness / npm run check` 或 GitHub UI 中与 `Readiness checks` workflow 组合显示的等价名称，最终以 GitHub PR Checks 页面显示为准。
- [ ] runbook 必须包含 branch protection 配置步骤：进入仓库 Settings -> Branches，选择目标分支规则，启用 required status checks，并勾选上一步确认的 required check 名称。
- [ ] runbook 必须说明配置后要用一个测试 PR 验证阻断效果：required check 未完成或失败时不能合并，通过后才允许合并。
- [ ] runbook 必须保留未验证口径：远端 Actions 触发、required check 名称、branch protection 生效状态如果未在 GitHub 上实际验证，只能标为未验证，不能写成已完成。
- [ ] runbook 和报告中不能写 “UI passed”、真机通过、DevTools 视觉 smoke 通过，除非有真实 DevTools 或真机证据。

## 负向检查

- [ ] 如果 runbook 只写本地 `npm run check`，没有远端 Actions / PR Checks 验证步骤，应判定不通过。
- [ ] 如果 runbook 写死 required check 名称但没有要求从 PR Checks 页面确认实际名称，应判定有风险。
- [ ] 如果 runbook 只说“配置分支保护”，没有写启用 required status checks 和选择 check 名称的步骤，应判定不通过。
- [ ] 如果 runbook 声称 CI 通过等同于地图列表 UI 通过、DevTools 通过或真机通过，应判定不通过。
- [ ] 如果 runbook 没有列出未验证项，应判定不通过。

## 未验证项

- 远端 GitHub Actions 是否已在 AE 分支或 PR 上实际触发。
- PR Checks 页面显示的 required check 最终名称。
- 目标分支的 branch protection 是否已经配置并强制 required check。
- required check 失败时是否真实阻止合并。
- WeChat DevTools 地图列表视觉 smoke、真机定位授权、真机交互路径。
