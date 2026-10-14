# 车来了去广告

[一键导入 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Faoomee%2FLoon-Adblock-Plugins%2Fmain%2Fplugins%2Fchelaile.plugin) · [插件文件](../plugins/chelaile.plugin)

## 来源与适配

源规则为 [CaoXiaoMann / XiaoMan 的 CheLaiLe.sgmodule](https://raw.githubusercontent.com/CaoXiaoMann/XiaoMan/main/Scripts/CheLaiLe/CheLaiLe.sgmodule)，于 2026-10-14 转换。上游标注适配车来了 7.6.6，原作者署名保留。

- 保留 9 条域名规则和 5 条广告路径规则，无需 JavaScript 或远程脚本。
- 将 Surge 的 `[URL Rewrite]` 和 `- reject` 转为 Loon 的 `[Rewrite]` 和 `reject`，保留直接拒绝请求的行为。采用 Loon 仍支持的旧版输入语法，兼容仓库现有插件格式。
- 移除 Surge 的 `%APPEND%`，使用 Loon 插件的 `hostname` 合并机制；补齐 `chelaile.cn`、`chelaileapp.cn`、`chelaile.net.cn` 主域及子域的 MitM 覆盖，避免广告路径规则因未解密而失效。
- 收紧车来了 URL 正则的域名边界，避免匹配 `notchelaile.cn` 等相似域名。公交 API 域名未被整域屏蔽，仅广告路径被拒绝。

格式依据：[Loon 插件文档](https://nsloon.app/docs/Plugin/)、[Loon 旧版 Rewrite 文档](https://nsloon.app/docs/Rewrite/)。

## 使用与范围

1. 点击一键导入并启用插件。
2. 安装并信任 Loon 的 MitM 证书，开启 HTTPS 解密。
3. 完全退出车来了后重新打开，检查开屏、首页广告及线路搜索、站点和实时到站查询。

原规则包含穿山甲、亿广、百度的共享广告与统计域名，启用后会同时影响其他 App 对这些域名的请求。需要缩小作用范围时，可在本地副本中移除“第三方广告 SDK”和“第三方广告接口”两组规则，仅保留车来了专用规则。

已进行离线格式、域名与 URL 匹配检查；未在 Loon / 车来了真机上验证，实际效果可能受 App 版本、缓存及接口变更影响。这里的业务 URL 样例只用于验证匹配边界，不是实时抓包证据。
