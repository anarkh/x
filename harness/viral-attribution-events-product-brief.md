# 自发裂变传播归因事件产品 Brief

## 背景与目标

Street Tasks 已支持用户把任务详情分享给他人或朋友圈。为了评估“用户侧自发裂变使用”是否带来后续有效动作，需要记录从分享入口进入详情后的最小归因事件。

本 brief 只定义产品事件口径，不改业务代码。核心回答：

- 用户从 `from=share&source=timeline` 进入详情后，是否产生评论、确认、再次转发。
- 用户从二跳来源 `source=receiver`、`source=comment`、`source=confirm` 进入详情后，是否继续产生评论、确认、再次转发。
- 后续如何按朋友圈、一跳接收者、评论触发转发、确认触发转发等来源评估 `confirm` / `comment` / `relay`。

## 非目标

- 不声称真实转化率、评论率或确认率已经提升。
- 不替代 WeChat DevTools、真机、真实分享链路 evidence。
- 不读取联系人、微信群、会话名称、好友关系。
- 不采集评论正文、图片内容、精确经纬度、通讯录、设备指纹。
- 不把归因事件用于广告定向、用户画像扩展或跨产品追踪。

## 最小归因模型

一次分享落地页访问形成一个 `attribution_session_id`。它从详情页 `onLoad` 的分享参数生成，并在当前详情页生命周期内串联后续动作。

推荐分享路径参数：

- `from=share`：标记来自分享。
- `source=timeline|receiver|comment|confirm`：标记这次分享按钮出现或触发的场景。
- `post_id`：任务 ID。
- `share_id`：本次分享实例 ID。若无法生成，至少记录 `source` 级别归因。
- `parent_share_id`：二跳转发时带上上一跳 `share_id`，用于判断 relay 链路。
- `share_depth`：`1` 表示从原始分享进入，`2` 表示接收者再次转发进入；超过 2 可统一记为 `2_plus`。

最小评估口径：

- 朋友圈带来的有效动作：`entry_source=timeline` 的落地 session 内成功发生 `confirm_success`、`comment_success` 或 `relay_share_success`。
- 二跳带来的有效动作：存在 `parent_share_id` 或 `share_depth>=2` 的落地 session 内成功发生上述动作。
- 动作归因窗口：默认只归因当前详情页 session；如需要跨天复访，另行定义短期窗口，不能默认为真实转化提升。

## 事件类型

| 事件 | 触发含义 | 用途 |
| --- | --- | --- |
| `share_detail_landing` | 用户带 `from=share` 打开详情页，且解析到分享来源参数 | 统计朋友圈、一跳、二跳入口量 |
| `share_detail_loaded` | 详情任务成功加载，且任务未被隐藏 | 排除打开失败或无效任务 |
| `share_detail_blocked` | 分享详情打开但任务不可见、已隐藏或加载失败 | 评估分享落地损耗 |
| `share_confirm_success` | 分享落地 session 内确认任务仍有效成功 | 评估分享带来的信任动作 |
| `share_comment_success` | 分享落地 session 内评论提交成功 | 评估分享带来的线索/提问动作 |
| `share_relay_intent` | 用户在分享落地详情页点击或唤起再次分享 | 评估再次传播意图 |
| `share_relay_success` | 分享路径参数生成并交给微信分享能力 | 评估可归因 relay，不代表接收者已打开 |

说明：`share_relay_success` 只能表示用户完成分享动作的客户端侧准备，不能代表好友或朋友圈实际曝光。

## 字段白名单

所有事件只允许采集以下字段。未列入字段默认禁止采集。

| 字段 | 示例 | 说明 |
| --- | --- | --- |
| `event_type` | `share_detail_landing` | 事件名 |
| `event_time_ms` | `1781683200000` | 客户端事件时间 |
| `attribution_session_id` | `attr_...` | 当前分享落地 session ID |
| `post_id` | `post_001` | 任务 ID |
| `post_category` | `lost_found` | 任务分类 |
| `post_status` | `active` | 事件发生时任务状态 |
| `from` | `share` | 入口来源，只允许 `share` |
| `entry_source` | `timeline` | 只允许 `timeline`、`receiver`、`comment`、`confirm` |
| `share_id` | `sh_...` | 当前分享实例 ID |
| `parent_share_id` | `sh_...` | 上一跳分享实例 ID，可为空 |
| `share_depth` | `1` / `2` / `2_plus` | 传播深度分桶 |
| `action_result` | `success` / `blocked` / `failed` | 动作结果 |
| `blocked_reason` | `closed_post` | 失败或拦截原因枚举 |
| `is_publisher` | `true` / `false` | 当前用户是否发布者，布尔值 |
| `user_id_hash` | `u_hash_...` | 可选，使用现有用户 ID 的不可逆哈希；禁止原始 openid |
| `distance_bucket` | `0_500m` | 可选粗粒度距离分桶；禁止经纬度 |
| `app_version` | `0.1.0` | 可选，用于排查版本差异 |

禁止字段：

- 评论正文、评论图片内容、输入框草稿。
- 联系人、微信群、聊天会话、好友昵称、群名称。
- 精确经纬度、详细地址、实时轨迹。
- 原始 `openid`、手机号、微信号、设备指纹、广告标识。
- 分享接收者身份或实际曝光人数。

## 触发时机

### 进入详情

- 在详情页 `onLoad` 解析到 `from=share` 且 `source` 属于白名单时，生成 `attribution_session_id`，记录 `share_detail_landing`。
- 任务数据成功加载后，记录 `share_detail_loaded`，带上 `post_category`、`post_status`、`is_publisher`。
- 如果任务不存在、隐藏、云端读取失败或本地 fallback 仍失败，记录 `share_detail_blocked`，只带枚举化 `blocked_reason`。

### 后续动作

- 用户成功确认任务仍有效后，记录 `share_confirm_success`。重复确认被拦截时可以记录 `action_result=blocked` 和 `blocked_reason=duplicate_action`，不记录额外用户信息。
- 用户成功提交评论后，记录 `share_comment_success`。只记录提交成功，不记录正文长度以外的可识别内容；如需要质量判断，优先使用是否成功提交。
- 用户从分享落地详情页唤起再次分享时，记录 `share_relay_intent`。
- 客户端生成新的分享路径参数并交给微信分享能力后，记录 `share_relay_success`，新分享应带 `parent_share_id` 和递增后的 `share_depth`。

### 不触发事件

- 普通地图、列表、个人页进入详情，不记录本 brief 的分享归因事件。
- 关闭页、滚动、停留时长、复制文本、查看评论正文，不纳入本版。
- 微信实际把分享展示给谁、谁所在群聊、是否被朋友圈曝光，本版不记录也不推断。

## 评估问题与看板口径

最小看板应回答：

- `entry_source=timeline` 的 `share_detail_loaded` 数量，以及后续 `confirm/comment/relay` 成功率。
- `entry_source=receiver|comment|confirm` 的二跳落地量，以及后续 `confirm/comment/relay` 成功率。
- `share_depth=1` 与 `share_depth=2/2_plus` 的动作差异。
- `share_detail_blocked` 占比，用于发现已隐藏、已关闭、过期或读取失败导致的传播损耗。

口径提醒：

- `share_relay_success` 不等于二跳落地，只有新接收者打开并触发 `share_detail_landing` 才算二跳进入。
- `confirm/comment` 只能说明分享落地 session 内发生了动作，不能单独证明长期留存或真实线下完成。
- 没有 `share_id` 时只能做 `source` 级别粗归因，不能做链路级 relay 分析。

## 成功验收标准

- 产品 brief 文件存在于 `harness/viral-attribution-events-product-brief.md`。
- brief 明确列出事件类型、字段白名单、触发时机、评估口径、成功验收标准和风险边界。
- brief 明确覆盖 `from=share&source=timeline` 与 `source=receiver/comment/confirm`。
- brief 明确不采集评论正文、联系人/群、精确位置、原始 openid 等敏感信息。
- brief 明确不声称真实转化提升，不替代 DevTools/真机 evidence。
- 后续研发可按本 brief 在 `utils/store.js` 或独立 analytics 边界内实现，页面代码只负责触发事件，不重复归因逻辑。

## 风险边界

- 隐私风险：任何新增字段必须先进入白名单；默认拒绝联系人、群聊、正文、精确位置和原始身份标识。
- 误归因风险：分享参数可能被转发、截图或手动拼接；结果只能作为产品趋势参考。
- 平台能力边界：微信客户端不提供真实朋友圈曝光、群接收者列表和好友打开明细，不能用客户端事件反推。
- 数据质量风险：离线、云函数失败、用户清缓存会导致事件缺失；看板需要展示缺失或失败比例。
- 用户体验风险：事件上报必须异步、失败静默，不阻塞详情加载、评论、确认和分享。
- 合规边界：若未来需要跨 session 归因、用户级长期分析或更细位置分桶，必须重新评审字段和告知方式。
