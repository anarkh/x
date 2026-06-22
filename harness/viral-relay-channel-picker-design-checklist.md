# 接收者二跳转发场景建议设计 / QA Checklist

## 验收目标

- [ ] 在 `receiverConversionPrompt` 内增加 2-3 个轻量“适合转给”场景建议，帮助接收者判断更适合转给哪类群/人
- [ ] 场景建议只补充接力对象判断，不读取联系人、不读取真实群、不承诺已经识别用户的微信群或好友
- [ ] 现有 `receiverConversionPrompt.targetRows`、`shareReason` 和主分享按钮仍是核心结构；新增内容不替代 `shareReason`
- [ ] 新增内容保持 U 轮低密度，不制造大型 UI、不增加新的常驻分享入口、不让多个 CTA 同屏竞争
- [ ] 风险态、关闭态或不应公开扩散状态下，不能因为出现“适合转给”建议而变成可扩散状态
- [ ] 本清单是设计与验收要求，不代表 WeChat DevTools 或真机视觉验证已经通过

## 信息层级

- [ ] 不建议把 channel picker 放在 `shareReason` 与按钮之间；建议顺序为 `targetRows` -> 场景建议 -> `shareReason` -> 主分享按钮 / note
- [ ] 放在 `targetRows` 之后，是因为用户先看到“推荐转给 / 为什么可信 / 下一位先看”的完整判断框架，再看 2-3 个更具体的场景例子
- [ ] 放在 `shareReason` 之前，是因为 `shareReason` 是点击分享前最贴近动作的一句转述话术，应该继续紧邻主按钮
- [ ] 场景建议不应插入标题、body 或 `targetRows` 内部，避免破坏既有三行结构和扫描节奏
- [ ] 场景建议不应放到按钮下方；按钮后的 note 只保留安全边界和低压提醒，不再承载新的选择信息
- [ ] 面板阅读路径应是“为什么值得接力”到“适合给谁”到“可以怎么说”到“继续接力”，不要让用户先面对选择再理解风险边界

## UI 形态约束

- [ ] 首选 2-3 个轻量 chip 或紧凑微行，标题可为 `更适合转给` / `适合转给`，内容一眼扫完
- [ ] chip 应是场景提示，不是新的分享按钮；不得使用 `open-type="share"`、主按钮颜色、加载态、倒计时或强行动词
- [ ] chip 不应出现选中后才能继续的必填感；如有本地选中态，也只能改变轻微高亮，不改变分享路径、不读取真实群、不生成联系人数据
- [ ] 若采用 rows，最多 3 行，每行只表达一个场景；不要再嵌套说明、头像、群图标、人数、在线状态或推荐理由长文
- [ ] 若采用 segmented choices，必须弱化为“场景标签”而非模式切换；不能像三个并列 CTA，也不能把主分享按钮压低或挤窄
- [ ] 场景建议区域高度应低于 `targetRows`，视觉重量低于标题/body，接近 `shareReason` 的信息密度
- [ ] 不新增弹层、抽屉、联系人列表、群选择页、搜索框或“查看更多群”入口

## 选项文案

- [ ] 每个选项文案应短、可扫读，优先 4-8 个中文字符；最长不超过一行优先
- [ ] 文案表达“人群/场景”，不表达真实识别结果；可写 `附近邻居`、`门卫前台`、`会路过的人`，不要写 `已识别的业主群`、`你的家长群`、`张三`
- [ ] 不使用“推荐联系人”“智能匹配”“已找到群聊”“一键转群”等会让用户以为系统读取了社交关系的词
- [ ] 不使用压力型或扩散型文案，例如 `马上扩散`、`转发所有群`、`让大家都看到`
- [ ] `lost_found` 可偏向 `路过的人`、`门卫前台`、`楼栋邻居`；`intent=found` 时避免暗示高价值物品可私下交付
- [ ] `help_needed` 可偏向 `能搭把手的人`、`附近店员`、`熟悉现场的人`
- [ ] `street_update` 可偏向 `同路线的人`、`即将经过的人`、`楼栋邻居`
- [ ] `check_in` 可偏向 `会到这里的人`、`附近朋友`、`社区邻居`
- [ ] 兜底 category 使用 `熟悉地点的人`、`附近邻居`、`可能路过的人` 这类通用但仍目标化的短句，不退化成泛泛“分享给好友”

## 风险 / 关闭态互斥

- [ ] 只有 `receiverConversionPrompt.shouldRelay === true` 时才显示场景建议
- [ ] `shareReason` 为 `null` 或 `targetRows` 为空时，不显示场景建议，避免在谨慎态制造转发暗示
- [ ] `stale`、高 `staleCount`、高 `reportCount`、`resolved`、`expired`、`hidden` 都不能显示“适合转给”场景建议
- [ ] 风险态即使来自 `from=share` 且用户完成过 confirm/comment，也只能保留先核对、看评论、看现场状态的谨慎语义
- [ ] 关闭态只允许作为历史线索或处理结果查看，不出现 public relay CTA、场景建议或可转述扩散理由
- [ ] 普通详情入口、`from=publish` 入口、非 `from=share` 入口不显示接收者二跳场景建议
- [ ] `receiverConversionPrompt` 出现时仍优先压住普通分享面板、`actionRelayPrompt` 和 `commentRelayPrompt`，避免同屏多个传播入口

## 自动检查关注点

- [ ] 检查低风险 active + `from=share` + confirm/comment 时，`receiverConversionPrompt` 才返回 2-3 个场景建议
- [ ] 检查场景建议数量不小于 2、不大于 3，且每个 label/value 都是短文案
- [ ] 检查风险态、关闭态、普通入口、`from=publish`、`shouldRelay === false`、`shareReason === null` 时不返回或不渲染场景建议
- [ ] 检查现有 `targetRows` 仍为三行，且顺序仍为 `推荐转给`、`为什么可信`、`下一位先看`
- [ ] 检查 WXML 顺序为 `targetRows` 后显示场景建议，再显示 `shareReason`，最后显示主分享按钮和 note
- [ ] 检查场景 chip/row 不带 `open-type="share"`，不绑定真实联系人或真实群选择行为
- [ ] 检查新增实现不调用联系人、群聊、通讯录或外部社交关系读取 API，也不新增云端联系人匹配逻辑
- [ ] 检查普通分享面板互斥条件没有回退：`receiverConversionPrompt` 可见时不同时显示普通 share、action relay 或 comment relay 主面板
- [ ] 建议命令：`node --check utils/receiver-conversion.js`
- [ ] 建议命令：`node --check pages/detail/detail.js`
- [ ] 建议命令：`node --no-warnings scripts/check-receiver-conversion.mjs`
- [ ] 建议命令：`node --no-warnings scripts/check-viral-candidate.mjs`
- [ ] 基线建议：`node scripts/check-json.mjs`、`node harness/check-harness.mjs`、`git diff --check`

## 手测关注点

- [ ] WeChat DevTools 从 `from=share` 打开 active 低风险任务，点击确认后观察场景建议是否出现在 `targetRows` 与 `shareReason` 之间
- [ ] WeChat DevTools 从 `from=share` 打开 active 低风险任务，提交评论后观察场景建议是否仍为 2-3 个短选项，且不替代 comment 版本 `shareReason`
- [ ] WeChat DevTools 验证 `stale`、高举报、高过时、`resolved`、`expired`、`hidden` 不出现场景建议和公开 relay CTA
- [ ] WeChat DevTools 验证普通详情入口、`from=publish` 入口不出现接收者二跳场景建议
- [ ] 窄屏 320px / iPhone SE 下验证 chip/row 可自然换行，不撑破 panel，不挤压 `shareReason`、主按钮或 note
- [ ] 窄屏下验证多个按钮和分享入口不会拥挤：场景建议不是按钮组，主分享按钮仍是唯一高权重 CTA，评论入口和信任动作不与其重叠
- [ ] 长标题、长地点、长 category、长评论摘要场景下，场景建议不与 `targetRows`、`shareReason`、按钮文字或底部 note 重叠
- [ ] 触发系统分享面板时，确认用户看到的是一个主分享按钮，而不是多个看起来都能“转发”的 chip/按钮
- [ ] 手测记录必须写明设备/视口、入口、动作、任务状态和观察结果；未执行或因 DevTools service port blocker 无法执行时，记录为 not_run / blocked，不写成 passed
