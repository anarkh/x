# 地图列表视觉 Smoke Blocked Summary 产品 Brief

- 日期：2026-06-14
- 分支：`codex/iter-map-list-blocked-summary`
- 角色：V 组产品 agent
- 对应 feature：`map-feed-001`

## 用户问题

U 组已经能把 `map-list-visual-smoke` 在 DevTools 或真机不可用时写成 ignored local JSON，并保持 `map-list-visual-smoke=blocked`、`passed=0`、`evidence=[]`。L 组也已经能从 ignored local JSON 生成 ignored local Markdown 摘要。

剩下的问题是：评测/评审读 JSON 时仍需要自己判断 blocked 的含义，容易把“有摘要”“helper 跑通”“JSON 合规”误读成地图列表视觉 smoke 通过。V 组要补齐产品口径，让 blocked JSON 到脱敏摘要这一步只承担“让结论更易读”的价值，不改变真实 UI 验收状态。

## 产品假设

如果把 blocked local JSON 摘要化，并在摘要边界中明确“真实视觉 smoke 未执行”，评审可以更快理解当前阻塞原因、未验证风险和下一步，而不会把摘要生成误判为 UI passed。

这个假设只针对评审理解效率和证据卫生，不针对地图列表体验本身。地图列表视觉 smoke 是否通过，仍只能由 WeChat DevTools UI 或真机中的真实观察决定。

## 范围

- 定义从 U 组 blocked local JSON 到 L 组脱敏 Markdown 摘要的用户价值。
- 明确摘要应保留 `overallStatus=blocked`、`map-list-visual-smoke=blocked`、`passed=0` 和空真实 UI evidence 的语义。
- 明确摘要用于评审阅读、交接和发布风险判断，不能用于替代真实视觉 smoke。
- 明确 blocked 摘要应突出阻塞原因、未观察范围、风险和恢复后的下一步。
- 帮评审区分“blocked summary 生成合规”和“地图列表视觉 smoke 通过”这两个完全不同的结论。

## 非目标

- V 组不执行 WeChat DevTools、DevTools CLI open/preview、真机调试或任何真实 UI smoke。
- V 组不修改业务 UI、WXML、WXSS、JS、手测脚本或 evidence 生成脚本。
- V 组不声明地图列表视觉 smoke、DevTools smoke、真机 smoke 或完整用户旅程通过。
- V 组不把 U 组 blocked JSON、L 组 Markdown 摘要或任何静态检查结果升级为 `passed`。
- V 组不提交 ignored local JSON 或 ignored local Markdown 摘要；本 brief 只定义产品口径。

## 与 L/S/T/U 的关系

| 组别 | 已提供能力 | V 组补齐的产品口径 |
| --- | --- | --- |
| S | 新增 `map-list-visual-smoke` 证据槽位，要求记录长标题、长正文、带图/无图、安全区、原生地图层、滚动和详情链路 | V 组强调这些观察仍未执行，摘要只能呈现 blocked 状态和未验证范围 |
| T | 要求手测 JSON 中恰好保留一条 `map-list-visual-smoke` journey | V 组要求摘要继续展示该 journey 的 blocked 结论，不能因为摘要化而丢失必备槽位 |
| U | 生成 ignored blocked local JSON，并明确 blocked 不是 UI passed 或 failed evidence | V 组承接 U 的 JSON 语义，把它翻译成评审更容易阅读的脱敏摘要口径 |
| L | 从 ignored local JSON 生成 ignored local Markdown 摘要，并避免泄露 raw evidence | V 组定义 L 摘要在 blocked 场景下的用户价值和发布判断边界 |

## Blocked Summary 边界

blocked summary 可以被认为“通过”的条件：

- 输入来自合规的 ignored local JSON，且 `map-list-visual-smoke` 状态仍为 `blocked`。
- 摘要展示 blocked 原因、实际未执行事实、未验证风险和 follow-up。
- 摘要不包含敏感路径、凭证、手机号、CloudBase 私有资源或未经脱敏的原始证据。
- 摘要中的地图列表视觉 smoke 仍保持 `passed=0` 语义；如果 evidence 为空，只能说明没有真实 UI 证据。
- 摘要让评审能看懂当前结论：环境阻塞已被记录，真实地图列表视觉 smoke 仍未验证。

blocked summary 应判为失败或不可接受的条件：

- 把 `blocked` 改写成 `passed`、`ready`、`已验证通过` 或类似视觉通过表述。
- 隐藏 DevTools/真机未执行事实，或只写“摘要生成成功”而不写 UI 未观察。
- 用 readiness、static guard、helper 成功、JSON 校验通过或 Markdown 生成成功替代真实视觉证据。
- 丢失 `map-list-visual-smoke` journey、丢失 blocked reason、丢失 risks/follow-up，导致评审无法判断发布风险。
- 泄露本机路径、凭证、私有 cloud 路径、用户手机号或其他不应进入评审摘要的信息。

核心边界：blocked summary 的合格只表示“阻塞结论被清楚、脱敏地转述”；它不是地图列表视觉 smoke 的 passed，也不是业务 UI 的 failed。

## 成功标准

- 评审只读摘要即可知道当前地图列表视觉 smoke 是 blocked，而不是 passed。
- 评审能看到为什么 blocked、哪些用户可见风险仍未观察、恢复 DevTools/真机后要做什么。
- 摘要链路保留 U 组的 `passed=0` 和 `evidence=[]` 语义，不制造新的通过证据。
- 摘要链路符合 L 组脱敏目标，不暴露敏感路径、凭证或私有资源。
- 任何发布或合入判断都继续要求真实 WeChat DevTools UI 或真机视觉 smoke 证据。

## 下一步

- 当 DevTools 或真机仍不可用时，先用 U 组 helper 生成 ignored blocked local JSON，再用 L 组摘要脚本生成 ignored local Markdown，供评审理解 blocker。
- 评审 blocked summary 时，只接受“blocked 记录可读且合规”这个结论，不接受“地图列表视觉 smoke 已通过”。
- DevTools 服务端口或真机入口恢复后，重新执行 S 组定义的 `map-list-visual-smoke`；只有真实观察完成并补齐证据后，才允许把 journey 改为 `passed` 或 `failed`。
- 若真实 smoke 仍被阻塞，更新 blocked reason 和 follow-up，再重新生成脱敏摘要，保持 blocked 结论可读、可追踪。
