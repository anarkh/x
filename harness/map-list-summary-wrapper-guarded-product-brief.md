# 地图列表 blocked summary wrapper guard 产品 brief

- 日期：2026-06-14
- 分支：`codex/iter-map-list-summary-wrapper-guarded`
- 角色：Y 组产品 agent

## 用户问题

X 组已经增强 `scripts/check-map-list-blocked-summary.mjs`，可以校验 blocked JSON 与 summary 的状态和同源完整性。当前剩余风险是：执行者使用 V wrapper `scripts/prepare-map-list-blocked-summary.mjs` 生成 JSON 和 summary 后，可能忘记再手动运行 X guard，导致未校验、状态不一致或非同源的产物进入后续交接。

## 产品假设

- 生成 blocked JSON 与 summary 的默认路径应该在产物生成后立即自检。
- 只要 V wrapper 默认自动调用 X guard，就能显著降低“生成 summary 后漏跑 guard”的人为风险。
- guard 失败应反映到 wrapper 的退出结果中，避免出现“文件已生成，所以流程已完成”的误判。
- 这是流程安全补强，不是地图列表业务体验或视觉验收的变化。

## 范围

- 将 `scripts/check-map-list-blocked-summary.mjs` 接入 `scripts/prepare-map-list-blocked-summary.mjs` 的生成后流程。
- 默认校验 wrapper 本次生成的 blocked JSON 与 summary。
- 在 guard 失败时让 wrapper 失败退出，并保留清楚的错误输出，方便执行者定位。
- 保留执行者单独手动运行 X guard 的能力。

## 非目标

- Y 不执行 WeChat DevTools/真机。
- Y 不修改业务 UI。
- Y 不声明地图列表视觉 smoke 通过。
- 不重写 V wrapper 的输入语义、产物格式或 X guard 的核心规则。
- 不扩展新的地图列表视觉、交互或数据验收范围。
- 本目标只减少生成 summary 后漏跑 guard 的风险。

## 与 V/W/X 的关系

- V：提供生成 blocked JSON 与 summary 的 wrapper。Y 的产品要求是让该 wrapper 在生成后默认触发 X guard。
- W：作为后续消费、复核或交接产物的协作方，应默认拿到已经过状态与同源校验的 wrapper 输出。
- X：提供 `scripts/check-map-list-blocked-summary.mjs` guard。Y 不改变 X 的判定标准，只要求把它接入默认生成链路。

## Wrapper Guard 成功边界

- wrapper 成功生成 blocked JSON 与 summary。
- wrapper 随后自动调用 X guard 校验同一轮生成产物。
- X guard 返回成功，且 wrapper 最终以成功状态结束。
- 输出能让执行者看出 guard 已运行且通过。
- 成功只代表 JSON 与 summary 的状态和同源完整性通过 guard，不代表地图列表视觉 smoke 通过。

## Wrapper Guard 失败边界

- wrapper 生成的 JSON 或 summary 缺失、不可读或格式不符合 X guard 要求。
- blocked JSON 与 summary 的状态、来源或同源关系不一致。
- X guard 执行异常或返回失败。
- guard 失败时，wrapper 不应吞掉错误或继续声明生成流程成功。
- 失败边界不包含 WeChat DevTools、真机、业务 UI 或地图列表视觉 smoke 的判定。

## 成功标准

- 默认执行 `scripts/prepare-map-list-blocked-summary.mjs` 后，会自动运行 `scripts/check-map-list-blocked-summary.mjs`。
- guard 通过时，wrapper 返回成功，并留下可读的通过证据。
- guard 失败时，wrapper 返回失败，并留下可读的失败原因。
- 手动运行 X guard 的路径仍然可用。
- 变更不触碰业务 UI，不引入地图列表视觉验收结论，也不把 WeChat DevTools/真机验证包装成已完成。

## 下一步

- 执行者在 `scripts/prepare-map-list-blocked-summary.mjs` 中接入生成后 guard。
- 为成功路径和 guard 失败路径补充聚焦验证，确认退出状态会正确透传。
- 将实际命令与结果记录到 harness 进度或特性状态文件中。
- 需要视觉或真机结论时，由对应验证负责人另行执行并记录，Y brief 不替代该类验收。
