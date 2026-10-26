# 中国移动去开屏广告

[一键导入 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Faoomee%2FLoon-Adblock-Plugins%2Fmain%2Fplugins%2Fcmcc.plugin) · [插件文件](../plugins/cmcc.plugin)

规则由用户于 2026-10-26 提供，未提供上游作者、来源链接或适用 App 版本。本次仅移除正则末尾的多余空格，并补充插件信息、说明与导入入口；不依赖脚本。

匹配 `res.app.coc.10086.cn` 的 `/qwhdcdn_cmcc-cs_cn/prd-mgcenter/` 路径前缀，保留原规则的大小写不敏感匹配，返回 HTTP 200 和空响应体。原表达式末尾的空格会要求 URL 路径后出现空格，导致常规资源 URL 无法命中。

使用 Loon 3.5.1（978）或更新版本，导入并启用插件，安装并信任 MitM 证书，开启 HTTPS 解密，再完全退出中国移动 App 后重开。语法及响应行为参考 [Loon Rewrite 文档](https://nsloon.app/docs/Rewrite/rewrite_v2/)。

此规则匹配整个 `prd-mgcenter/` 目录，无法仅凭路径确认其中所有文件都是开屏广告；如果该目录同时承载其他资源，它们也会返回空响应。若页面资源缺失，请停用此插件检查。

已进行离线正则匹配、域名与路径边界及配置检查，未进行 Loon 导入或中国移动 App 真机验证。
