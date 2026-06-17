# Viral Manual Artifact Manifest 产品 Brief

- 日期：2026-06-17
- 分支：`codex/iter-viral-manual-artifact-manifest`
- 角色：AF 组产品 agent
- 基线：AE 的 viral manual JSON/Markdown summary integrity 之后
- 对应 feature：`map-feed-001`

## 背景

Street Tasks 的用户侧自发裂变目标不是“强推分享按钮”，而是让发布者和首跳接收者在真实任务场景里自然判断“这条街区任务值得转给下一位能帮忙的人”。理想链路是：低风险 active 任务可以被首跳分享；接收者先确认或评论；完成动作后再出现二跳接力语境；朋友圈渠道只在低风险场景可被谨慎使用；风险态、闭合态和未知任务不能被鼓励扩散。

AD 已把七条 viral manual journey 拆成可执行 evidence packet。后续手测结果会写入 ignored local JSON，并生成脱敏 Markdown summary。AE 已补上 JSON/Markdown summary integrity：评审可以知道 summary 是否忠实复述了同一份 local JSON 的 branch、commit、overallStatus、七条 journey 状态、actual、evidenceCount、blocker 和 followUp。

AE 之后还缺一层：真实 DevTools 或真机手测通常会产生截图、录屏、payload 摘要、系统菜单观察、CloudBase 或本地 readback 等附件。JSON/summary 可以说“有几份 evidence”以及“状态是什么”，但它们不适合承载附件清单细节；如果评审另行收到一批附件，仍可能不知道每个附件对应哪条 journey、是否脱敏、是否有 payload/readback 缺口、是否和 local JSON/summary 对齐，或者是否被误当成 passed evidence。

Artifact manifest 是下一步，因为它只解决“附件能不能被安全引用”的问题：给每个真实附件建立脱敏、可复核、可对齐的清单记录，让评审知道附件类型、覆盖 journey、来源环境、隐私处理、与 JSON/summary 的关系和剩余缺口。manifest 存在或 manifest 检查通过，不代表真实 DevTools UI、真机、朋友圈、payload 或 CloudBase 行为已经通过。

## 用户与评审价值

用户价值：执行者可以把真实手测附件按七条 journey 归档，而不是把截图、录屏和 payload 摘要散落在聊天、临时目录或个人机器状态里。后续补测时，也能看出哪条 journey 缺截图、缺录屏、缺 payload 摘要或缺 readback。

评审价值：评审可以安全引用“某条 journey 有哪些脱敏附件可复核”，并能区分附件清单完整性、JSON/summary 同源完整性和真实产品通过三件事。manifest 降低误引附件、泄露个人信息、引用旧附件和把 blocked/ready 误读成 passed 的风险。

## 范围内

- 定义 viral manual artifact manifest 的产品边界、字段口径和状态口径。
- 固定覆盖七条 viral manual journey，不能删除、合并、改名或只记录整体附件。
- 为每条 journey 说明需要的附件类型，但不写真实路径、真实 URL、账号、昵称、头像、手机号、精确地址、经纬度、token、cookie、CloudBase 私密值或 raw log。
- 要求 manifest 与 ignored local JSON/Markdown summary 可对齐：journey id、status、evidenceCount 或附件计数、blocker、followUp 不能互相矛盾。
- 要求每个附件记录脱敏状态、可引用状态、缺口说明和风险说明。
- 明确 manifest 通过只表示附件清单字段完整、脱敏、可对齐，不表示 UI 或真机 passed。

## 非目标

- 不执行 WeChat DevTools、真机、系统分享、朋友圈、payload inspect、CloudBase readback 或本地 storage readback。
- 不新增、不搬运、不提交真实截图、录屏、payload、readback、日志或云端数据。
- 不把附件清单写成真实 evidence 内容本身；manifest 只记录可引用元数据和脱敏摘要。
- 不生成或修改 ignored local JSON/Markdown summary。
- 不修改小程序 UI、分享策略、归因逻辑、评论/确认流程、风控策略或页面文案。
- 不把 readiness、summary integrity、manifest integrity、附件数量非零或评审可引用升级为 viral journey passed。

## Manifest 字段口径

manifest 建议只保存最小可引用元数据：

- `run`: 分支、提交、测试时间、执行环境类别、结果 JSON/summary 对齐说明。
- `journeys`: 七条固定 journey，每条记录 `id`、`title`、`status`、`artifactCount`、`missingArtifactTypes`、`blocker`、`followUp`。
- `artifacts`: 每个附件的脱敏别名、附件类型、对应 journey、采集环境类别、引用用途、脱敏说明、是否可被评审引用、是否需要人工二次复核。
- `alignment`: 与 ignored local JSON/summary 的对应关系，只记录“可对齐/不可对齐/待补齐”和原因，不回显真实本机路径或附件地址。
- `privacy`: 敏感信息扫描结论、人工脱敏说明、不能公开引用的原因。
- `notClaimed`: 固定声明 manifest 不是 DevTools UI passed、real-device passed、viral journey passed 或 CloudBase passed evidence。

artifact slot 使用固定枚举，而不是自由文本路径：

- `screenshot`: 脱敏 UI 截图。
- `recording`: 脱敏操作录屏或短视频。
- `payload-sample`: 只记录分享 payload 字段名存在性和语义状态，不记录原始值。
- `cloud-readback`: 只记录 CloudBase 或本地共享数据回读字段名和语义状态，不记录原始记录。
- `device-observation`: 记录 DevTools/真机类别、基础库、网络、入口方式等非身份环境信息。
- `risk-state-note`: 记录 active/stale/resolved/expired/hidden、stale/report 风险桶或关闭原因等语义。

系统菜单、route、文字观察和限制说明应落在上述 slot 的 `description`、`reviewerNote`、`blocker` 或 `followUp` 中，不能新增自由命名 slot。

## 七条 Journey 的附件需求

| Journey | 需要的附件类型 | 附件目的 |
| --- | --- | --- |
| `first-hop-share-entry` | `screenshot`；`device-observation`；`risk-state-note`；条件 `payload-sample`；可选 `recording`、`cloud-readback` | 证明首跳分享入口下接收者 guide 和行动入口真实可见，并记录普通分享面板是否被隐藏或不竞争。 |
| `receiver-confirm-conversion` | `recording`；`screenshot`；`payload-sample`；`device-observation`；`risk-state-note`；条件 `cloud-readback` | 证明接收者确认成功后出现二跳接力提示，且确认来源能在分享 payload 或限制说明中被复核。 |
| `receiver-comment-conversion` | `recording`；`screenshot`；`payload-sample`；`device-observation`；`risk-state-note`；条件 `cloud-readback` | 证明接收者评论提交成功后出现二跳接力提示，且评论来源、评论存储路径和 payload 检查缺口有记录。 |
| `second-hop-receiver-source` | `screenshot`；`payload-sample`；`device-observation`；`risk-state-note`；可选 `recording`、`cloud-readback` | 证明二跳接收者能看到“有人接力”的语境，并区分真实系统分享进入与直接 route 辅助进入。 |
| `ordinary-and-risk-entries` | `screenshot`；`risk-state-note`；`device-observation`；条件 `cloud-readback`；可选 `recording`、`payload-sample` | 证明普通入口不展示接收侧扩散，风险或闭合状态不暴露 public relay CTA，并记录各 fixture 的状态依据。 |
| `timeline-share-channel` | `recording`；`screenshot`；`payload-sample`；`device-observation`；`risk-state-note`；可选 `cloud-readback` | 证明低风险 active 详情页真实系统菜单包含朋友圈渠道，或记录无法 inspect 菜单/payload 的系统限制。 |
| `timeline-risk-gating` | `screenshot`；`risk-state-note`；`device-observation`；条件 `payload-sample`、`cloud-readback`；可选 `recording` | 证明风险态、闭合态或未知任务没有鼓励性朋友圈扩散，并记录菜单缺失、谨慎文案或 payload 限制。 |

## 状态边界

### `blocked`

manifest 层面的 `blocked` 表示附件清单无法达到可引用最低条件，常见原因包括：

- 缺少对应 ignored local JSON/summary，无法对齐 journey 状态。
- 某条 journey 的必需附件类型缺失，且没有具体 `limitation-note`。
- 附件脱敏状态未知，可能包含个人信息、真实路径、真实 URL、raw payload、raw log 或账号信息。
- manifest 记录的 journey status、artifactCount、blocker 或 followUp 与 JSON/summary 冲突。
- DevTools、真机、系统菜单、朋友圈、payload inspect、CloudBase/readback 或数据 fixture 仍阻塞真实采集。

`blocked` 不能被写成产品失败或产品通过；它只说明当前附件清单不足以安全引用。

### `ready`

manifest 层面的 `ready` 表示可以进入评审引用准备，但还不能判定真实产品通过：

- 七条 journey 都有清单记录。
- 每条 journey 的必需附件类型已记录，或缺失项有明确限制说明。
- 每个附件都有脱敏别名、类型、对应 journey、引用用途、隐私处理和可引用状态。
- manifest 与 ignored local JSON/summary 的 branch、commit、journey id、status、evidenceCount 或附件数量关系可解释。
- 输出不包含真实路径、真实 URL、个人信息、raw payload、raw log 或敏感凭证。

`ready` 只说明附件清单可供人工评审继续查看，不说明 DevTools UI、真机或 viral journey passed。

### `passed`

manifest 检查的 `passed` 只能表示 manifest 自身通过，例如：

- 字段完整。
- 附件类型覆盖符合七条 journey 的最低要求。
- 所有附件引用信息已脱敏。
- 与 ignored local JSON/Markdown summary 可对齐。
- 没有把 blocked、ready、summary integrity 或 manifest integrity 写成 UI/真机通过。

manifest `passed` 不代表：

- 七条 journey 真实 passed。
- WeChat DevTools UI passed。
- 真机 passed。
- 系统分享面板或朋友圈 passed。
- payload inspect passed。
- CloudBase 或本地 readback passed。

真实 journey `passed` 仍必须来自已执行的 DevTools/真机观察、脱敏 evidence、payload 或限制说明、readback 或限制说明，以及人工复核。

## 误读防线

manifest 输出和评审报告允许写：

- “artifact manifest passed，说明附件清单字段完整、脱敏并可与 ignored local JSON/summary 对齐。”
- “manifest 中列出七条 journey 的附件类型和缺口，供评审继续人工查看。”
- “manifest 不是 UI passed evidence，也不是真机 passed evidence。”

manifest 输出和评审报告禁止写：

- “manifest passed，所以 viral journey passed。”
- “附件清单存在，所以七条 journey 已真实通过。”
- “summary integrity passed 加 manifest passed，所以 DevTools/真机通过。”
- “有截图别名，所以无需人工查看截图内容。”
- “payload 附件缺失但 manifest 完整，所以 payload 通过。”

## 验收标准

- brief 用中文说明用户侧自发裂变目标、AE summary integrity 后的缺口，以及 artifact manifest 为什么是下一步。
- brief 固定列出七条 journey，并说明每条需要的附件类型。
- brief 不写真实附件路径、真实 URL 或个人信息。
- brief 明确 `blocked`、`ready`、`passed` 的 manifest 层边界。
- brief 明确 manifest 通过只说明附件清单字段完整、脱敏、与 ignored local JSON/summary 可对齐。
- brief 明确 manifest 通过不代表 DevTools UI、真机、朋友圈、payload、readback 或 viral journey 真实通过。
