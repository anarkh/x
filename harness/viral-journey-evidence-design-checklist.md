# 传播链路证据设计 / QA Checklist

日期：2026-06-16

## 自动场景

- [ ] `node --no-warnings scripts/check-viral-journey-evidence.mjs` 输出 `Viral journey evidence checks passed.`
- [ ] DevTools readiness 会运行传播链路证据脚本
- [ ] Viral candidate 检查会运行传播链路证据脚本或同等关键断言

## 首跳接收

- [ ] `from=share` 且 active、无 stale/report 的任务展示接收侧说明
- [ ] 同一状态展示接收侧第一步 action strip
- [ ] 接收侧 action strip 不包含 `open-type="share"`
- [ ] 普通分享面板在接收侧说明存在时不同时出现

## 转化后接力

- [ ] 从分享进入后点击确认，会生成 `receiverConversionPrompt`
- [ ] 从分享进入后提交评论，会生成 `receiverConversionPrompt`
- [ ] `receiverConversionPrompt` 出现时，`actionRelayPrompt` 和 `commentRelayPrompt` 不同时抢主 CTA
- [ ] 可接力状态的分享路径包含 `from=share&source=receiver`

## 二跳接收

- [ ] `source=receiver` 的接收侧标题能表达“有人接力转给你”
- [ ] `source=receiver` 的说明强调先看确认和评论
- [ ] 风险态二跳仍然先提示谨慎核对

## 风险和普通入口

- [ ] 普通入口不显示 `shareReceiverGuide`
- [ ] 普通入口不显示 `shareReceiverActionStrip`
- [ ] 普通入口不会生成 `receiverConversionPrompt`
- [ ] 任意 stale/report 信号不显示接收侧鼓励 action strip
- [ ] `stale` / `resolved` / `expired` / `hidden` 不显示接收者公开接力 CTA

## 手测记录

- [ ] 手测前复制 `harness/viral-journey-manual-results.example.json`，并替换分支、commit、环境和实际 post id
- [ ] 没有实际执行时，保留 `overallStatus: "not_run"` 或记录为明确 blocker
- [ ] DevTools/真机结果必须写明是否观察到系统分享面板、真实二跳路径和窄屏层级
- [ ] 自动脚本结果只能作为预检证据，不能当成 DevTools 或真机完成证据

