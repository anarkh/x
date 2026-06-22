# AB DevTools Service Port Config Forensics Checklist

日期：2026-06-17

范围：用于 AB 组 QA / 设计 agent 定义 WeChat DevTools Service Port 配置“只读取证”口径。本文档只定义可采集摘要、隐私边界、只读命令边界、blocked / diagnosis 映射和静态 guard 期望；不执行恢复，不打开、退出、预览、上传或修改 DevTools。

## 0. 总原则

- [ ] 本清单只用于判断“配置证据是否足以解释 service port blocker”，不能替代 DevTools smoke、DevTools UI、分享 payload、CloudBase、窄屏或真机 evidence。
- [ ] 证据必须是摘要化、脱敏、可复核的配置状态，不提交原始配置文件、完整日志、完整 JSON、截图原图或用户数据。
- [ ] 所有结论都必须写清 `status`、`diagnosis`、`confidence`、`conflictCount` 和 `nextHumanConfirmation`。
- [ ] 若只读配置证据与端口探针冲突，以“需要人工确认”收束；不得把配置 `enabled` 写成端口 ready。
- [ ] 若配置路径、文件内容或用户数据会泄露隐私，只记录来源类别、数量、时间 bucket 和 key 状态。

## 1. Allowed Evidence

只允许提交以下配置摘要字段：

- [ ] 配置文件类别：`DevTools preference`、`CLI preference`、`workspace metadata`、`recent launch metadata`、`log-derived config hint`、`unknown config source`。
- [ ] key 名：例如 `servicePort`、`enableServicePort`、`ideHttpPort`、`enableCLI`、`security.servicePort`；只写 key 名，不写完整配置内容。
- [ ] 开关状态：`enabled`、`disabled`、`unconfirmed`。
- [ ] 端口号：目标端口和发现端口，例如 `9420`；未知时写 `unconfirmed`。
- [ ] 多个来源数量：候选配置文件数量、可读来源数量、包含 service-port-like key 的来源数量。
- [ ] 最近修改时间 bucket：`<1d`、`<7d`、`<30d`、`>=30d`、`unknown`；不写精确文件时间戳。
- [ ] 冲突计数：`conflictCount=0..n`，并用短标签说明冲突类型，例如 `enabled-vs-disabled`、`port-mismatch`、`multiple-active-sources`。
- [ ] confidence：`high`、`medium`、`low`；必须说明 confidence 只针对配置解释力，不代表产品验证通过。
- [ ] 下一步人工确认：需要用户在 DevTools UI 中确认 service port 开关、显示端口、当前项目、DevTools 版本或多实例归属。

推荐摘要形态：

```json
{
  "status": "blocked",
  "diagnosis": "mismatch",
  "configSources": {
    "candidateCount": 3,
    "readableCount": 2,
    "servicePortLikeKeyCount": 2,
    "modifiedBuckets": ["<1d", ">=30d"]
  },
  "observedKeys": ["enableServicePort", "ideHttpPort"],
  "configState": "enabled",
  "configuredPort": 9420,
  "observedProbePort": 9530,
  "conflictCount": 1,
  "confidence": "medium",
  "nextHumanConfirmation": [
    "Confirm the Service Port toggle in DevTools UI.",
    "Confirm the displayed service port and rerun read-only port probe."
  ],
  "notClaimed": [
    "DevTools smoke passed",
    "DevTools UI journey passed",
    "real-device journey passed"
  ]
}
```

## 2. Forbidden Evidence

以下内容不得提交、不得出现在可评审摘要中：

- [ ] 完整路径：用户目录、DevTools user data 子路径、项目绝对路径、日志绝对路径、配置文件绝对路径。
- [ ] 文件内容：完整配置文件、完整 JSON、完整 plist、完整 sqlite dump、完整日志片段或完整命令输出。
- [ ] 浏览器 / WebView 存储：localStorage、cookie、session、IndexedDB、缓存目录内容。
- [ ] 用户身份：openid、unionid、nickname、头像 URL、手机号、微信号、联系人、群名。
- [ ] 项目历史：最近打开项目列表、真实项目路径、项目名历史、工作区历史。
- [ ] 凭据：token、Authorization、Bearer、refresh token、access token、client secret、AppSecret、私有 AppID、数据库密码。
- [ ] 数据库内容：sqlite 表内容、CloudBase 数据、评论正文、反馈正文、post 原文、图片 URL。
- [ ] 截图原图、录屏原件、二维码、系统分享面板原图；只允许写脱敏文字摘要或本地附件编号。

## 3. 只读命令边界

允许的只读动作：

- [ ] `stat` / 元数据读取：只用于文件类别、大小段、修改时间 bucket、权限摘要。
- [ ] `read`：只读取必要配置文件，并在脚本内提取 key 名、布尔状态、端口号和计数；不得输出原文。
- [ ] `search limited text`：只搜索 service-port-like key 和短错误关键词，并输出命中计数或脱敏 key 名。
- [ ] `find` / `rg`：限制目录、深度、文件类型和匹配词；输出必须经过路径脱敏和 raw content suppression。
- [ ] 端口探针：只做 `LISTEN` / `connect_refused` / `timeout` / `non-business response` 摘要。

禁止的动作：

- [ ] write、append、delete、move、chmod/chown、压缩、复制 user data、导出配置。
- [ ] open、quit、preview、upload、login、logout、recovery、relaunch、reset。
- [ ] kill、pkill、killall、launchctl 操作、清缓存、清 storage、清 DevTools 设置。
- [ ] 修改 Service Port 开关、修改端口号、修改 DevTools security settings。
- [ ] 打开 DevTools GUI、导入项目、扫码预览、上传小程序、触发系统分享菜单。

## 4. Blocked / Diagnosis Mapping

所有 diagnosis 都只描述配置证据和端口入口状态，不代表产品功能通过。

- [ ] `enabled_match_no_listener`
  - 配置摘要：service port-like key 为 `enabled`，配置端口与目标端口一致。
  - 端口摘要：无 listener 或探针 `connect_refused` / `timeout`。
  - 写法：`blocked`，说明“配置看起来启用且端口匹配，但当前没有可连接 listener”。
  - 下一步：人工确认 DevTools UI 开关和当前实例；再跑端口探针和 smoke。

- [ ] `disabled`
  - 配置摘要：可信来源显示 service port-like key 为 `disabled`。
  - 写法：`blocked`，说明“配置证据指向服务端口未开启”。
  - 下一步：由用户在 DevTools UI 中手动确认并开启；agent 不得改设置。

- [ ] `mismatch`
  - 配置摘要：配置端口与目标探针端口不同，或多个来源端口不同。
  - 写法：`blocked` 或 `unknown`，取决于是否能确认当前 DevTools 实例。
  - 下一步：人工确认 DevTools UI 显示端口；后续命令统一传入实际端口。

- [ ] `unknown`
  - 配置摘要：配置不可读、key 不存在、来源不可信、权限不足或证据过旧。
  - 写法：`unknown`，不得推断 enabled / disabled。
  - 下一步：人工确认 UI 设置、版本、多实例和当前项目。

- [ ] `conflict`
  - 配置摘要：多个来源之间出现 enabled/disabled、端口号、最近修改时间或实例归属冲突。
  - 写法：`blocked` 或 `unknown`，必须写 `conflictCount` 和冲突标签。
  - 下一步：人工确认哪个 DevTools 实例和配置 profile 正在生效。

所有映射都必须带 `notClaimed`：

- [ ] 不声称 DevTools smoke / open passed。
- [ ] 不声称 DevTools UI 编译、地图、发布、详情或分享 journey passed。
- [ ] 不声称真机、窄屏、系统分享、CloudBase readback 或真实 payload passed。
- [ ] 不声称配置 enabled 等于端口 ready；端口 ready 也不能替代 UI / real-device evidence。

## 5. Static Guard 期望

后续脚本或 readiness guard 应静态检查以下约束：

- [ ] Side-effect negative checks：脚本源码不得包含文件写入、删除、移动、kill、open、quit、preview、upload、清缓存、修改 DevTools 设置等副作用路径。
- [ ] Redaction / sanitization：必须存在路径脱敏、用户标识脱敏、token-like 字段过滤和敏感 key 拒绝输出。
- [ ] Raw content suppression：不得打印完整配置文件、完整 JSON、完整 plist、完整 sqlite dump、完整日志行、完整 `ps` 输出或完整 HTTP body。
- [ ] Readiness no-side-effect wording：readiness 输出必须明说该检查是 static / read-only / no-side-effect，不会 quit/open/preview/upload/kill DevTools，也不会替代 smoke、DevTools UI 或真机 evidence。
- [ ] Diagnosis vocabulary guard：脚本输出只能使用本清单定义的 `enabled_match_no_listener`、`disabled`、`mismatch`、`unknown`、`conflict` 或明确扩展后的新 code。
- [ ] Evidence schema guard：脚本输出必须包含 `configState`、`configuredPort`、`sourceCount` 或等价计数、`modifiedBucket`、`conflictCount`、`confidence`、`nextHumanConfirmation` 和 `notClaimed`。

## 6. 收尾验证

- [ ] 修改本清单后运行：

  ```bash
  node harness/check-harness.mjs
  git diff --check
  ```

- [ ] 确认本轮新增产品 brief/checklist，并仅修改配置取证、readiness guard 与 harness evidence 相关文件。
- [ ] 确认没有运行 recovery、quit、open、preview、upload、清缓存或 kill。
