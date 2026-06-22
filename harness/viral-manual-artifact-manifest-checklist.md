# AF 传播链人工证据附件 Manifest QA Checklist

日期：2026-06-17

范围：本清单面向测试者和评测者，用于规范七条真实 viral journey 的人工证据附件如何收集、标注、脱敏和复核。它不定义用户界面文案，不执行 WeChat DevTools 或真机操作，不声明任何 journey passed。

## 0. 总原则

- [ ] Artifact manifest 只记录附件索引和脱敏观察，不提交截图、录屏、payload 原文、CloudBase 原始记录或本机文件路径。
- [ ] 每条 journey 的状态只能由真实人工执行结果填写为 `passed`、`failed` 或 `blocked`。
- [ ] `passed` 只能在所有必收和条件必收 artifact slot 已收集、已脱敏、已复核通过后填写。
- [ ] 缺少必收附件、payload 无法检查、CloudBase 读回不可用或附件未完成脱敏时，不得填写 `passed`。
- [ ] `failed` 用于已经完成观察且实际行为不符合预期；必须写清 `actual` 和 `followUp`。
- [ ] `blocked` 用于环境、工具、权限、设备或附件能力阻塞验证；必须写清 `blocker` 和 `followUp`。
- [ ] 可选附件缺失不阻塞 journey，但 manifest 必须标注 `optional_not_collected`，不能伪装成已收集。
- [ ] 每份 manifest 都必须包含一句边界说明：`notClaimed: no DevTools UI journey passed; no real-device journey passed; no viral journey passed`；即使 manifest 来自真实手测结果，也只能说明附件清单已复核，不能替代 journey 本身的 evidence gate。

## 1. Artifact Slot 定义

每个 artifact slot 都只能记录脱敏后的索引和语义摘要。

| slot | 用途 | 允许记录 | 禁止记录 |
| --- | --- | --- | --- |
| `screenshot` | 静态页面或系统菜单状态 | 附件编号、journeyId、场景、可见/不可见组件摘要、设备类别 | 图片原件、本机路径、URL、二维码、真实用户资料 |
| `recording` | 连续交互过程 | 附件编号、起止动作、关键状态变化、是否覆盖完整操作 | 视频原件、文件路径、账号画面细节、联系人信息 |
| `payload-sample` | 分享 path/query/title/imageUrl/attribution 的结构化检查 | 字段是否存在、字段语义状态、敏感字段是否已脱敏 | 原始 path/query 值、完整 title、URL、cloud fileID、token、openid |
| `cloud-readback` | 云端或共享数据路径的结果读回 | 集合语义、记录是否存在、状态/计数/动作语义是否符合预期 | 完整 CloudBase 文档、`cloud://`、环境 id、真实 openid/unionid |
| `device-observation` | 设备和运行环境观察 | DevTools/真机类别、基础库版本、网络类别、入口方式、是否 CloudBase 启用 | 设备唯一标识、本机用户目录、日志路径、真实账号 |
| `risk-state-note` | 风险态和闭合态判定 | active/stale/resolved/expired/hidden 等语义、stale/report 风险桶、闭合原因摘要 | 真实地址、精确经纬度、完整 post 内容、真实姓名/手机号/邮箱 |

Manifest 行建议字段：

```text
journeyId: <七条 journey id 之一>
slot: screenshot | recording | payload-sample | cloud-readback | device-observation | risk-state-note
requirement: required | conditional-required | optional
slotStatus: collected | not_collected | blocked | not_applicable | rejected_for_redaction
artifactRef: <不含路径和 URL 的本地附件编号>
sanitizedObservation: <只写语义摘要>
redactionCheck: pending | passed | rework_required
reviewStatus: pending | accepted | rejected
blocker: <slotStatus=blocked 时必填>
followUp: <slotStatus=blocked/rejected_for_redaction/not_collected 且该 slot 非 optional 时必填>
```

## 2. 全局脱敏规则

- [ ] 不得记录 `cloud://`、CloudBase fileID、真实云环境 id、私有 AppID。
- [ ] 不得记录本机路径、DevTools user-data 路径、截图/录屏/payload/raw log 文件路径。
- [ ] 不得记录任何 URL、预览链接、二维码、图片链接或网络请求完整地址。
- [ ] 不得记录 token、cookie、session、authorization、bearer、access token、refresh token、password、secret。
- [ ] 不得记录 openid、unionid、微信号、真实昵称、头像 URL、真实姓名、真实手机号、真实邮箱。
- [ ] 不得记录精确经纬度、详细住址、门牌号、真实评论正文全文、完整 post title/body。
- [ ] `payload-sample` 只能记录字段是否存在和语义状态，例如“`source` 存在且语义为 receiver”，不能记录原始字段值。
- [ ] `id`、`share_id`、`parent_share_id`、`imageUrl`、`title`、`path`、`query` 等字段只能写存在性、缺失性、语义类别或已脱敏占位。
- [ ] 错误信息和复核意见只报告敏感类别和 slot，不回显敏感原文。
- [ ] 如果附件中出现敏感内容，slot 必须标记为 `rejected_for_redaction`，待替换或二次脱敏后才能复核通过。

## 3. 七条 Journey Artifact Slots

### 3.1 `first-hop-share-entry`：首跳从分享进入低风险 active 任务

| slot | 要求 | 收集与标注要求 |
| --- | --- | --- |
| `screenshot` | 必收 | 记录从分享入口进入后的首屏状态，必须覆盖 receiver guide、receiver action strip、任务主体是否可读。 |
| `device-observation` | 必收 | 记录入口来自真实分享卡片或可说明的 DevTools/真机入口，记录设备类别、基础库、网络和 CloudBase 是否启用。 |
| `risk-state-note` | 必收 | 记录 fixture 是低风险 active 任务，且无 stale/report/closed 风险信号；只写语义，不写原始 post 内容。 |
| `payload-sample` | 条件必收 | 当分享 path/query 可检查时，记录 `id`、`from=share` 等字段存在性和语义；无法检查时必须写 blocker/follow-up，不能直接 passed。 |
| `recording` | 可选 | 当需要证明入口到首屏连续性时收集短录屏；缺失不阻塞，但必须标注 optional。 |
| `cloud-readback` | 可选 | CloudBase 启用时可读回 post 仍为 active 的语义状态；不得记录原始云记录。 |

### 3.2 `receiver-confirm-conversion`：接收者确认后的二跳提示

| slot | 要求 | 收集与标注要求 |
| --- | --- | --- |
| `recording` | 必收 | 记录从首跳分享详情页点击确认、确认成功、二跳提示出现的完整过程。 |
| `screenshot` | 必收 | 至少记录确认前状态和二跳提示出现后的状态；若用录屏覆盖，也要在 manifest 写明关键帧位置的语义摘要。 |
| `payload-sample` | 必收 | 记录二跳分享 payload 字段存在性和语义：`from=share`、`source=receiver`、`receiverAction=confirm`、attribution 字段是否存在；不记录原始值。 |
| `device-observation` | 必收 | 记录确认动作来自接收者路径，且不是普通详情入口；记录真机/DevTools、网络和 CloudBase 状态。 |
| `risk-state-note` | 必收 | 记录任务在确认时仍可接受信任动作，且不是 stale/report/closed 阻断态。 |
| `cloud-readback` | 条件必收 | CloudBase 启用或测试声明共享数据路径时，必须读回确认动作语义或计数变化；本地 fallback 时写明非云端证据。 |

### 3.3 `receiver-comment-conversion`：接收者评论后的二跳提示

| slot | 要求 | 收集与标注要求 |
| --- | --- | --- |
| `recording` | 必收 | 记录从首跳分享详情页打开评论、提交评论、评论成功、二跳提示出现的完整过程。 |
| `screenshot` | 必收 | 记录评论成功状态和二跳提示；不得暴露评论正文全文、真实昵称或头像。 |
| `payload-sample` | 必收 | 记录二跳分享 payload 字段存在性和语义：`from=share`、`source=receiver`、`receiverAction=comment`、attribution 字段是否存在；不记录原始值。 |
| `cloud-readback` | 条件必收 | CloudBase 启用或声明共享评论路径时，必须读回“评论记录存在/计数变化”的语义状态；不得记录原始评论内容。 |
| `device-observation` | 必收 | 记录评论提交环境、入口来源和是否真机/DevTools；不记录账号标识。 |
| `risk-state-note` | 必收 | 记录任务允许评论且不是 closed 状态；若评论被 closed gating 拦截，应改填 failed 或 blocked。 |

### 3.4 `second-hop-receiver-source`：二跳接收者看到接力语境

| slot | 要求 | 收集与标注要求 |
| --- | --- | --- |
| `screenshot` | 必收 | 分别记录 confirm 来源和 comment 来源的二跳首屏语境，证明文案能区分“刚确认”和“刚补线索”。 |
| `payload-sample` | 必收 | confirm/comment 两种二跳都要记录字段存在性和语义：`source=receiver`、`receiverAction=confirm/comment`；不得记录原始 query。 |
| `device-observation` | 必收 | 标注入口是真实二跳分享卡片还是 direct route 辅助；direct route 只能作为辅助 evidence，不能伪装成系统卡片 evidence。 |
| `risk-state-note` | 必收 | 记录二跳任务仍处于可接收扩散的低风险状态；如状态变化，应记录变化原因和影响。 |
| `recording` | 可选 | 当需要证明从二跳卡片到首屏的连续性时收集。 |
| `cloud-readback` | 可选 | 可记录 attribution 链路存在的语义读回；不得记录 share id 原值或云端原始文档。 |

### 3.5 `ordinary-and-risk-entries`：普通入口和风险态不鼓励接收侧扩散

| slot | 要求 | 收集与标注要求 |
| --- | --- | --- |
| `screenshot` | 必收 | 普通入口、weak stale/report、`stale`、`resolved`、`expired`、`hidden` fixtures 都要有 UI 证据或明确 blocker。 |
| `risk-state-note` | 必收 | 每个 fixture 都要记录状态语义、风险桶、闭合原因，以及是否应隐藏鼓励性 public relay CTA。 |
| `device-observation` | 必收 | 记录每个 fixture 的入口类型、设备类别和 CloudBase/本地 fixture 来源语义。 |
| `cloud-readback` | 条件必收 | 当 fixture 状态来自 CloudBase 或声明为共享状态时，必须读回状态语义；本地 fixture 要写明不是云端证据。 |
| `recording` | 可选 | 如需要证明切换多个 fixture 的连续性，可收集一段录屏。 |
| `payload-sample` | 可选 | 一般不要求；若系统分享菜单仍可打开或有 payload 可检查，必须记录谨慎语义或 blocker。 |

### 3.6 `timeline-share-channel`：低风险 active 详情页朋友圈系统渠道

| slot | 要求 | 收集与标注要求 |
| --- | --- | --- |
| `recording` | 必收 | 记录低风险 active 详情页打开系统菜单、看到发送给朋友和朋友圈入口、进入朋友圈或单页模式首屏的过程。 |
| `screenshot` | 必收 | 记录系统菜单和朋友圈/单页模式首屏；截图只能以附件编号引用。 |
| `payload-sample` | 必收 | 记录 timeline payload 字段存在性和语义：`id`、`from=share`、`source=timeline`、`shareChannel=timeline`、`title`、`imageUrl`；不记录原始值或 URL。 |
| `device-observation` | 必收 | 记录真机/DevTools、基础库、网络和系统菜单能力；如果 DevTools 不暴露朋友圈能力，必须写 blocker/follow-up。 |
| `risk-state-note` | 必收 | 记录任务是低风险 active，且朋友圈扩散没有被 stale/report/closed gating 阻断。 |
| `cloud-readback` | 可选 | 可读回 post 状态或 share attribution 语义；不得记录云端原始记录。 |

### 3.7 `timeline-risk-gating`：风险和闭合任务不开放鼓励性朋友圈

| slot | 要求 | 收集与标注要求 |
| --- | --- | --- |
| `screenshot` | 必收 | weak stale/report、`stale`、`resolved`、`expired`、`hidden`、unknown 或刷新失败 fixtures 都要记录菜单缺失、禁用或谨慎文案证据。 |
| `risk-state-note` | 必收 | 每个 fixture 都要记录风险/闭合语义和预期 gating；不得记录原始内容、地址或坐标。 |
| `device-observation` | 必收 | 记录系统菜单能力、设备类别、基础库和入口来源；无法打开菜单时必须写 blocker/follow-up。 |
| `payload-sample` | 条件必收 | 如果菜单或 payload 可检查，必须记录 title/query/copy 是否为谨慎语义；无法检查 payload 且该字段影响结论时只能 blocked，不能 passed。 |
| `cloud-readback` | 条件必收 | 当风险或闭合状态来自 CloudBase 时，必须读回状态语义；如果云端不可用，记录 blocker 或降级范围。 |
| `recording` | 可选 | 如需证明多个风险 fixtures 的菜单状态切换，可收集录屏。 |

## 4. Passed / Failed / Blocked 填写规则

- [ ] `passed` 必须满足：所有必收 slot 为 `collected`，所有触发的条件必收 slot 为 `collected` 或有被规则允许的 `not_applicable`，全部 `redactionCheck=passed`，全部 `reviewStatus=accepted`。
- [ ] `passed.actual` 必须描述真实观察结果，不能写 `Not run`、`TODO`、`待补充`、`见附件` 或只写“附件齐了”。
- [ ] `passed` 不得建立在 blocked draft、readiness、静态 checker、准备脚本、summary 生成或无附件结果之上。
- [ ] `failed` 必须写实际偏差，例如“风险态仍出现鼓励性朋友圈入口”或“receiverAction 语义缺失”，并写清复测或修复 follow-up。
- [ ] `blocked` 必须写具体 blocker，例如 Service Port 不可用、系统菜单不可打开、payload 不可 inspect、CloudBase 无权限、真机缺失或附件脱敏失败。
- [ ] `blocked.followUp` 必须是下一步可执行动作，例如“使用真机复测朋友圈入口”“重新导出脱敏录屏”“补 CloudBase 只读读回”。
- [ ] 缺少必收附件时只能填写 `blocked`，不能填写 `passed` 或把缺失项写成“无需验证”。
- [ ] 附件含敏感信息时，相关 slot 先标记 `rejected_for_redaction`；替换为合格附件前，journey 不能 passed。
- [ ] 如果 UI 已可观察且行为不符合预期，应填 `failed`，不要用 `blocked` 掩盖产品缺陷。

## 5. 复核流程

- [ ] 测试者先填写 manifest，不提交 raw artifact，只提交脱敏后的 slot 索引和语义摘要。
- [ ] 测试者自查每个 slot 是否包含禁止信息，尤其是 payload、cloud-readback、截图说明和 blocker/follow-up。
- [ ] 评测者逐条核对七个 journey 的必收、条件必收、可选 slot 状态，确认缺附件没有被写成 passed。
- [ ] 评测者抽查附件编号是否能在 ignored/local 证据包中定位，但不得把定位路径写回可提交 manifest。
- [ ] 评测者复核 `payload-sample` 是否只记录字段存在性和语义状态，不含原始 query/path/title/imageUrl。
- [ ] 评测者复核 `cloud-readback` 是否只记录语义状态，不含 `cloud://`、云环境 id、完整文档或用户标识。
- [ ] 评测者复核 `risk-state-note` 是否覆盖每个风险/闭合 fixture，且没有真实地址、精确坐标或个人信息。
- [ ] 任一必收 slot `reviewStatus=rejected` 时，journey 总状态必须是 `blocked` 或 `failed`，直到重新收集并复核通过。

## 6. 收尾检查

- [ ] 可提交改动只包含本 checklist 或后续明确允许的 manifest 模板，不包含 local evidence、截图、录屏、payload、raw log 或 CloudBase dump。
- [ ] manifest 中每条 journey 都能看出哪些 slot 必收、哪些条件必收、哪些可选。
- [ ] manifest 中每个 `blocked` 都有 blocker 和 follow-up。
- [ ] manifest 中没有把 readiness、blocked draft、summary integrity、schema checker 或附件缺失写成真实 journey passed。
- [ ] 修改文档后至少运行：

  ```bash
  git diff --check
  ```

- [ ] 如本轮还修改了 JSON、脚本或 harness 入口，追加运行对应 `node --check`、`node scripts/check-json.mjs`、`node harness/check-harness.mjs` 或 `bash harness/init.sh`。
