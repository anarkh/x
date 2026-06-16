# 目标化二跳接力设计 / QA Checklist

日期：2026-06-16

## 验收目标

- [ ] `receiverConversionPrompt` 不只是提示“再分享一次”，而是说明接力对象、接力理由、下一位接收者会看到什么
- [ ] 面板能让完成 confirm/comment 的分享接收者理解“我为什么要转给这个人”
- [ ] 面板不把风险任务、关闭任务或普通详情页推向公开扩散
- [ ] 新结构不与发布后扩散、普通分享、评论接力、确认接力和分享接收侧行动竞争

## 触发条件

- [ ] 只有 `from=share` 的详情页在低风险 active 任务完成 confirm 后显示目标化二跳接力
- [ ] 只有 `from=share` 的详情页在低风险 active 任务完成 comment 后显示目标化二跳接力
- [ ] 普通详情入口、`from=publish` 入口和非分享来源完成 confirm/comment 后不显示该面板
- [ ] 页面首次加载、重新进入、刷新详情或切换任务时默认清空该面板
- [ ] confirm/comment 成功后优先显示 `receiverConversionPrompt`，不同时显示 `actionRelayPrompt` 或 `commentRelayPrompt`

## 状态与风险边界

- [ ] 只有 active、未关闭、未过期、未隐藏、低举报、低过时反馈任务出现公开 relay CTA
- [ ] `resolved` / `expired` / `hidden` / closed 状态不出现 public relay CTA
- [ ] `stale`、高 `staleCount` 或高 `reportCount` 只显示谨慎核对文案，不鼓励继续公开传播
- [ ] 风险态可以提示“先看评论、确认和现场状态”，但按钮不能暗示“帮忙转发”
- [ ] 面板文案不说“已证实”“可靠无误”“请扩散”等确定性或压力型表达

## 信息层级

- [ ] 标题一句话交代二跳动作，例如“把线索转给更可能在附近的人”
- [ ] body 先承接用户刚完成的 confirm/comment，再说明为什么现在适合接力
- [ ] 结构化行第一行说明“接力对象”，例如附近邻居、同楼栋、同校区、店员、宠物群、家长群
- [ ] 结构化行第二行说明“接力理由”，且理由来自 category/intent、地点、刚确认或刚补充的线索
- [ ] 结构化行第三行说明“下一位接收者看到什么”，包括任务摘要、你的确认/线索、先核对提示
- [ ] note 保持低压和安全边界，强调只转给可能真的能帮忙的人
- [ ] 主按钮只承担一次明确接力动作，次级信息不做成额外 CTA

## 按钮与文案边界

- [ ] 主按钮使用低压文案，例如“转给可能帮得上的人”，避免“立即扩散”“全网转发”
- [ ] confirm 后文案强调“你刚提供了一个现场确认信号”，不夸大为事实证明
- [ ] comment 后文案强调“你刚补了一条线索/问题”，鼓励转给能补下一步的人
- [ ] 按钮附近不重复出现普通分享按钮，避免用户不知道该点哪个
- [ ] 没有接力对象建议时，不显示空泛的目标化行；回退为谨慎 note 或不显示面板
- [ ] 文案保持中文、短句、可扫读，避免营销化、催促式或道德绑架式语气

## Category / Intent 目标化文案

- [ ] `lost_found` + `intent=lost`：接力对象指向最后出现地点附近、物业/店员/同楼栋邻居；理由是“可能见过或能留意”
- [ ] `lost_found` + `intent=found`：接力对象指向失主可能所在人群；理由是“帮助物品回到主人手里”，不暗示私下交付高价值物品
- [ ] `help_needed`：接力对象指向现场附近且能提供具体帮助或熟悉情况的人；理由强调“就近、短时、可确认”
- [ ] `street_update`：接力对象指向会经过该地点、同楼栋或同路线的人；理由强调“先核对现场再行动”
- [ ] `check_in`：接力对象指向可能会到这里、附近朋友或同社区邻居；理由强调“地点状态仍有参考价值”
- [ ] 其他 category 使用通用但仍目标化的“附近/熟悉该地点的人”，不退化成泛泛“分享给好友”

## 互斥与竞争关系

- [ ] 目标化二跳面板出现时，普通 share 面板不出现
- [ ] 目标化二跳面板出现时，分享接收侧 action strip 不再作为主 CTA 抢焦点
- [ ] 目标化二跳面板出现时，comment relay 和 action relay 不同屏显示
- [ ] 发布后扩散计划只服务 `from=publish`，不与接收者二跳面板同屏
- [ ] 普通信任动作和评论入口仍可用，但视觉层级低于当前二跳主 CTA
- [ ] 面板不会遮挡任务正文、信任摘要、评论列表或关闭任务入口

## 窄屏与视觉 QA

- [ ] 320px 宽度下标题、body、结构化行 label/value、note 和按钮都能自然换行
- [ ] 长地点、长 category 文案、长评论摘要不会撑破卡片或挤压按钮
- [ ] 结构化行 label 不依赖固定大宽度；value 换行后仍能看出对应关系
- [ ] 主按钮在窄屏下高度可增长，文字不截断、不溢出、不与 note 重叠
- [ ] 面板沿用详情页现有 panel、间距、字体和谨慎色系，不新增强营销视觉
- [ ] 多行结构在 iPhone SE / 常见安卓窄屏中不把评论入口挤出首屏过远

## DevTools / 真机待验证

- [ ] WeChat DevTools 从 `from=share` 打开 active 低风险任务，点击确认后出现目标化二跳面板
- [ ] WeChat DevTools 从 `from=share` 打开 active 低风险任务，发布评论后出现目标化二跳面板
- [ ] WeChat DevTools 验证 stale / high-report / resolved / expired / hidden 不出现公开 relay CTA
- [ ] WeChat DevTools 验证普通详情入口 confirm/comment 后不出现该面板
- [ ] WeChat DevTools 验证普通 share/action/comment relay 不与该面板同屏竞争
- [ ] 真机触发主按钮后能打开系统分享面板，分享路径保留 `from=share&source=receiver`
- [ ] 真机二跳接收者打开后能看到“上一位接收者刚确认/补充”的上下文
- [ ] 真机窄屏验证结构化行、按钮、note 换行和滚动位置
- [ ] 记录任何未执行的 DevTools/真机项为待验证，不标记为通过

## 自动检查项

- [ ] `node --check utils/receiver-conversion.js`
- [ ] `node --check utils/share-receiver.js`
- [ ] `node --check pages/detail/detail.js`
- [ ] `node --check scripts/check-receiver-conversion.mjs`
- [ ] `node --check scripts/check-share-receiver.mjs`
- [ ] `node --check scripts/check-share-receiver-action.mjs`
- [ ] `node --check scripts/check-action-relay.mjs`
- [ ] `node --check scripts/check-comment-relay.mjs`
- [ ] `node --check scripts/check-viral-candidate.mjs`
- [ ] `node --check scripts/check-devtools-readiness.mjs`
- [ ] `node --no-warnings scripts/check-receiver-conversion.mjs`
- [ ] `node --no-warnings scripts/check-share-receiver.mjs`
- [ ] `node --no-warnings scripts/check-share-receiver-action.mjs`
- [ ] `node --no-warnings scripts/check-action-relay.mjs`
- [ ] `node --no-warnings scripts/check-comment-relay.mjs`
- [ ] `node --no-warnings scripts/check-viral-candidate.mjs`
- [ ] `node --no-warnings scripts/check-devtools-readiness.mjs`
- [ ] `node scripts/check-json.mjs`
- [ ] `node harness/check-harness.mjs`
- [ ] `git diff --check`
- [ ] `npm run check`
- [ ] `bash harness/init.sh`
