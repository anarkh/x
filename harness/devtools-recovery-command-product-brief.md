# AG 组 DevTools Recovery Dry-run 产品简报

## 产品目标

AF 已经新增 `inspect:devtools-port` 和 `check:devtools-smoke`，并把当前真实 WeChat DevTools smoke 阻塞收敛为：9420 service port 被声明但实际 blocked。AG 的目标是在这个诊断之后，提供一个清楚的、显式的 recovery dry-run 报告入口，让用户先看到恢复流程会检查什么、准备做什么、实际跳过了什么，以及下一步应该由谁手动决定。

推荐手动入口：

```bash
npm run inspect:devtools-recovery
```

这个入口的产品价值不是“恢复 DevTools”，而是把恢复前后的状态和动作边界说清楚，避免用户误以为脚本已经自动处理了本机 DevTools。

## 非目标

- 不自动 quit/open WeChat DevTools。
- 不恢复 9420 service port，也不承诺恢复成功。
- 不把 recovery dry-run 加入默认 `npm run check`、`check:readiness` 或 CI。
- 不声称真实 DevTools UI smoke、地图页、发布页、详情页或真机链路已经通过。
- 不替代用户在 DevTools UI 中启用 Service Port 的决定。

## 使用场景

当 `npm run check:devtools-smoke` 或 strict smoke 显示 blocked 后，执行者先运行 recovery dry-run 报告，查看：

- `Before status`：当前 9420 service port 是否仍 blocked。
- `Actions attempted/skipped`：脚本原本包含的 quit、wait、open 恢复动作是否全部被跳过，以及跳过原因。
- `After status`：在无副作用模式下复查端口状态是否仍 blocked。
- `Next steps`：下一步是手动启用 Service Port，还是在用户明确同意后另行运行带副作用的 direct node 命令。

用户看完 dry-run 后再决定：

- 去 WeChat DevTools UI 的安全设置中手动启用 Service Port，并重新运行诊断。
- 或在确认不会中断其他手测现场后，显式运行带副作用的 direct node 命令，例如加 `--quit-reopen` 且不加 `--dry-run`。

## 当前预期

在当前已知环境下，dry-run recovery 报告应表现为：

- `Before status` 仍是 `blocked`，原因指向 9420 service port 无可用 listener 或连接失败。
- `Actions attempted/skipped` 中 DevTools quit、reopen wait、DevTools open 都应是 skipped，原因是 `--dry-run` 或未提供 `--quit-reopen`。
- `After status` 仍是 `blocked`；这符合预期，因为 dry-run 不会改变本机 DevTools 状态。
- `Next steps` 应指向手动启用 DevTools Service Port；必要时才在用户明确接受副作用后运行带 `--quit-reopen` 的 direct node 命令。

结论口径：dry-run recovery 是恢复准入报告，不是恢复动作本身；blocked 继续表示 DevTools 环境入口未恢复，不能写成 UI smoke passed。
