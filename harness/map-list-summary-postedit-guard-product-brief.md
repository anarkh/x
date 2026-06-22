# 地图列表阻塞摘要后编辑保护产品 Brief

## 背景

Y 轮已经把 `scripts/check-map-list-blocked-summary.mjs` 接入 `scripts/prepare-map-list-blocked-summary.mjs`，生成本地阻塞 JSON 和脱敏摘要时会自动跑 guard。这能防止刚生成的 `harness/*.local*.json` 与 `harness/*.local*.md` 在状态、提交、阻塞原因和后续动作上脱节。

剩余风险在生成之后：如果评审前有人手工编辑了本地 JSON 或 Markdown 摘要，wrapper 当时跑过的 guard 不再覆盖最新文件内容。此时必须重新运行 summary guard，才能把这组本地阻塞材料作为“DevTools 端口阻塞”的证据链引用。

## 产品目标

- 让阻塞摘要的可信边界更明确：自动生成后的内容可引用，手工编辑后的内容必须重新校验。
- 降低评审误判风险：评审人看到本地阻塞摘要时，能知道它只证明“手测被阻塞且记录完整”，不证明地图列表 UI 已通过。
- 保持低成本操作：生成后如果需要修正文案，只要求重跑单条 guard 命令，不要求重新执行真实 DevTools 或真机手测。

## 验收标准

- 产品 brief 明确说明 Y 轮 wrapper 自动跑 guard 的能力边界。
- 产品 brief 明确说明生成后的 JSON 或 Markdown 只要被手工编辑，就必须重新运行 `node scripts/check-map-list-blocked-summary.mjs --results <本地结果JSON> --summary <本地摘要MD>`。
- 产品 brief 明确说明重新跑 guard 通过后，本地阻塞证据才可被评审引用。
- 产品 brief 明确保留证据语义：`map-list-visual-smoke=blocked`、`passed=0`、`evidenceCount=0` 不应被改成通过态。

## 非目标

- 不把阻塞摘要当作地图列表 UI 通过证据。
- 不替代 WeChat DevTools 或真机上的真实视觉冒烟测试。
- 不扩大本轮范围到 guard 校验逻辑、真实手测执行或通过态证据生成；脚本层只允许补充成功后的复跑提示。
