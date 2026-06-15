# AE 轮产品 Brief：CI required check runbook

## 目标

在 AD 轮已有最小 GitHub Actions workflow 后，补充一份可执行 runbook，说明如何验证远端 Actions 是否真实触发，以及如何把稳定的 workflow/check 名称配置为分支保护 required check。

AE 轮的重点是把“远端验证和分支保护配置仍未完成”显式化，并让后续执行者按步骤确认，而不是把本地 workflow 文件存在误读为远端已经通过或分支保护已经生效。

## 用户价值

- 维护者能按 runbook 检查 PR/push 是否真的触发远端 Actions，而不是只相信本地 YAML 解析通过。
- 评审者能知道应该引用哪个 workflow/check 名称配置 required check，减少分支保护名称漂移带来的误配风险。
- 后续 agent 可以清楚记录远端 run URL、结论和未完成项，避免把“待配置”写成“已配置”。
- 本地 `npm run check`、CI workflow 和分支保护之间的责任边界更清楚：本地检查证明静态/readiness gate 可运行，远端 run 证明 GitHub Actions 触发，required check 证明合并门禁被仓库设置采用。

## 验收标准

- 新增 runbook 文档，包含远端 Actions 触发验证步骤：推送分支或打开 PR、查看 workflow run、确认运行的是 AD/AE 期望的 workflow、确认执行 `npm run check`。
- runbook 必须写明应记录的证据：workflow run URL、分支或 PR、触发事件、最终状态、失败时的下一步。
- runbook 必须说明如何配置分支保护 required check，并要求引用稳定、易识别的 workflow/check 名称。
- runbook 必须要求配置后再用一次测试 PR 验证 required check 会阻止未通过检查的合并。
- 文档口径必须明确：runbook 只是远端验证和配置步骤，不声称当前仓库已经远端通过，也不声称分支保护已经配置完成。
- 文档口径必须明确：CI/readiness/required check 通过不等于真实 UI passed、DevTools passed 或真机 passed。

## 非目标

- 不在 AE 产品 brief 中直接修改 `.github`、`package.json`、脚本、README 或 harness 状态文件。
- 不假设当前远端仓库已启用 GitHub Actions、已执行成功，或已配置分支保护 required checks。
- 不恢复 WeChat DevTools 9420 服务端口，不新增真实 UI smoke、真机验收或截图证据。
- 不提交 ignored local evidence；`harness/manual-test-results.local*.json` 和 `harness/manual-test-summary.local*.md` 仍只用于本地阻塞证据演练。
- 不把 runbook 当成自动执行器、CI hook 或仓库设置 API；它只定义人工可执行、可记录的操作流程。
