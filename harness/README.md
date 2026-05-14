# Street Tasks Harness

这个目录是本仓库的 agent harness。它把教程里的最小闭环落到一个地方：开工入口、功能状态、进度日志、验证证据、交接和质量快照。

## 使用顺序

1. 从根目录读 `AGENTS.md`。
2. 读 `harness/claude-progress.md`，确认当前已验证状态和下一步。
3. 读 `harness/feature_list.json`，选择最高优先级未完成项。
4. 运行 `bash harness/init.sh`，确认基础验证可用。
5. 做窄范围改动。
6. 把验证证据写回 `harness/feature_list.json` 或 `harness/claude-progress.md`。
7. 按 `harness/clean-state-checklist.md` 收尾。

## 文件分工

- `init.sh`: 统一初始化和基础验证入口。
- `check-harness.mjs`: 验证 harness 文件结构和关键规则。
- `feature_list.json`: 功能状态和验收证据的机器可读清单。
- `claude-progress.md`: 跨会话进度日志。
- `session-handoff.md`: 当前会话交接摘要。
- `clean-state-checklist.md`: 收尾检查清单。
- `evaluator-rubric.md`: 单轮工作验收评分表。
- `quality-document.md`: 项目质量快照。

## 本仓库验证边界

当前自动化验证覆盖 JSON 配置和 harness 自检。小程序真实交互仍需要 WeChat DevTools 或真机预览手动确认，因此不能只凭 `npm run check:json` 把用户可见功能标为 `passing`。
