# CI Readiness Gate Checklist

## 目标

AD 轮要把 AC 轮已有的 `npm run check` 从本地常用命令推进到 GitHub Actions 自动门禁。这个门禁只覆盖 JSON、harness、readiness 和 ignored local blocked summary preflight，不代表地图列表或小程序 UI 已经通过 DevTools/真机验收。

## Workflow 结构

- [ ] 仓库存在 GitHub Actions workflow 文件，本轮路径为 `.github/workflows/readiness.yml`。
- [ ] workflow 使用 `on: push` 触发，确保分支推送会自动运行门禁。
- [ ] workflow 使用 `on: pull_request` 触发，确保合入前会自动运行门禁。
- [ ] job 中使用 `actions/setup-node` 配置 Node 环境。
- [ ] job 中运行 `npm ci`，避免跳过锁文件安装路径。
- [ ] job 中运行 `npm run check`，且不拆成只跑 `npm run check:json` 的弱化版本。
- [ ] workflow 不读取、声明或打印任何 secrets。
- [ ] workflow 不上传、提交、缓存或引用 `harness/manual-test-results.local*.json`、`harness/manual-test-summary.local*.md` 等 ignored local evidence。

## 本地正向验证

- [ ] `npm run check` 在无 local blocked summary 时通过。
- [ ] 生成一对 ignored local blocked summary/result 后，`npm run check` 仍通过，并能看到 blocked summary preflight 检查到该 pair。
- [ ] `npm run check` 输出中仍保留“不代表 DevTools/真机 UI passed”的口径。

建议正向命令：

```bash
npm run check
node scripts/prepare-map-list-blocked-summary.mjs \
  --reason "DevTools service port blocked; map-list visual smoke was not executed." \
  --results-out harness/manual-test-results.local-ad-ci.json \
  --summary-out harness/manual-test-summary.local-ad-ci.md \
  --force
npm run check
rm -f harness/manual-test-results.local-ad-ci.json harness/manual-test-summary.local-ad-ci.md
```

## 负向验证

- [ ] 生成 local blocked summary/result 后删除 matching results JSON，`npm run check` 必须失败并提示缺失 results JSON。
- [ ] 重新生成 local blocked summary/result 后，把 summary 的 `map-list-visual-smoke` 行改成 `passed`，`npm run check` 必须失败。
- [ ] 负向验证结束后清理所有 `harness/manual-test-results.local-ad-ci*.json` 和 `harness/manual-test-summary.local-ad-ci*.md` 本地产物。

建议负向命令：

```bash
node scripts/prepare-map-list-blocked-summary.mjs \
  --reason "DevTools service port blocked; map-list visual smoke was not executed." \
  --results-out harness/manual-test-results.local-ad-ci.json \
  --summary-out harness/manual-test-summary.local-ad-ci.md \
  --force
rm -f harness/manual-test-results.local-ad-ci.json
npm run check

node scripts/prepare-map-list-blocked-summary.mjs \
  --reason "DevTools service port blocked; map-list visual smoke was not executed." \
  --results-out harness/manual-test-results.local-ad-ci.json \
  --summary-out harness/manual-test-summary.local-ad-ci.md \
  --force
# 手工把 harness/manual-test-summary.local-ad-ci.md 的 map-list-visual-smoke 状态改成 passed。
npm run check
rm -f harness/manual-test-results.local-ad-ci.json harness/manual-test-summary.local-ad-ci.md
```

## 报告口径

- [ ] 评测报告只能写 CI/readiness/static/preflight gate 通过，不能写 UI passed、DevTools passed 或真机 passed。
- [ ] 如果 workflow 通过，只能说明 `npm run check` 自动化路径可运行，不能说明地图列表抽屉、原生地图层、safe area、滚动、长标题、带图卡片或详情跳转已视觉验收。
- [ ] 如果 workflow 失败，需要先定位是安装、JSON、harness、readiness 还是 blocked summary preflight 阻断，再记录具体错误输出。

## 未验证项

- [ ] 未验证真实 WeChat DevTools 编译和模拟器运行。
- [ ] 未验证真机定位授权、拒绝、超时和重试路径。
- [ ] 未验证地图列表真实视觉 smoke，包括 safe area、原生地图层覆盖、长标题/长正文、带图/无图、滚动和详情入口。
- [ ] 未验证 GitHub Actions 在远端仓库实际触发后的日志和分支保护配置。
