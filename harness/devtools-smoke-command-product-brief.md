# DevTools Smoke Command Product Brief

## 本轮 AF 产品目标

把真实 WeChat DevTools UI smoke 的本机 blocker，从零散脚本诊断变成一个明确、可引用的手动命令入口。开发者和评测员在准备手动 smoke 前，可以先运行端口诊断，清楚知道当前是否被 DevTools service port 环境挡住。

这轮关注的是“把阻塞证据说清楚”，不是证明地图、发布、详情等真实 UI smoke 已经通过。

## 非目标

- 不把 GUI 或本机 WeChat DevTools 依赖加入默认 CI。
- 不把真实 DevTools smoke 接入 `npm run check`。
- 不声称 UI smoke 通过；当前只能记录被本机 9420 service port 阻塞。

## 使用场景

- 开发者准备打开 WeChat DevTools 做手动 smoke 前，先运行端口诊断，确认 service port 是否真的可连。
- 评测员看到 strict smoke 被标记为 blocked 时，应检查诊断输出。如果输出指向本机端口无监听，则判定为“环境阻塞证据”，而不是产品功能失败。
- 如果后续本机 DevTools 端口恢复，再重新运行同一入口，才进入真实 UI smoke 判断。

## 当前预期

在当前环境下：

- `node scripts/inspect-devtools-port-state.mjs` 应输出 `status: blocked`，诊断为 `declared_without_listener` / `connect_refused`。
- `npm run check:devtools-smoke` 的 strict smoke 访问应失败，并说明 service port `9420` 没有 listener，同时存在 1 个 `ide-http-port` 进程声明端口。

这个失败是 DevTools 本机服务端口没有实际监听的环境阻塞证据，不是 Street Tasks 产品功能失败，也不能替代真实 WeChat DevTools UI smoke 通过证据。
