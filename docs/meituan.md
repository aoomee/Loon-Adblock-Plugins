# 美团去广告

[一键导入 Loon](https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Fraw.githubusercontent.com%2Faoomee%2FLoon-Adblock-Plugins%2Fmain%2Fplugins%2Fmeituan.lpx) · [插件](../plugins/meituan.lpx) · [脚本](../scripts/meituan-clean.js)

## 来源与整理

插件来自用户提供的 `MeiTuan.lpx`，署名 ZenmoFeiShi，原文件版本为 `2026-10-25 21:14:00`。未核实该配置文件的公开发布地址。依赖脚本来自作者的 [MT.js](https://github.com/ZenmoFeiShi/Qx/blob/main/MT.js)，于 2026-10-26 获取。

本次将 UTF-16 LE 文件转换为 UTF-8，统一排版、补充说明与仓库入口。保留原来的 46 条分流规则、2 条 Rewrite、8 条响应脚本规则及 9 个 MitM 域名，不扩大拦截范围。脚本以本仓库副本加载，保留上游逻辑，仅增加来源注释；无需另行导入 JS，上游后续更新不会自动同步。原作者权利不因收录改变。

上游脚本原始字节 SHA-256：`9a48981f5d1cdac2d7c72c8f1164752ce712113eaf687aeeba2829e78c66308a`。

## 处理范围

- 首页底部：移除 `video`、`xiaotuan` 标签；脚本确认首页和我的标签存在后才修改。
- 购物车、我的页：清空指定推荐流场景、移除 `mine_cross_recommend`，清理购物车顶部横幅。
- 搜索：清理默认词、热词、指定热搜推荐卡片和 AI 气泡。
- AI 助手：清理返回配置中的 `skills`，不限于单个角标字段。
- 开屏：清理响应中的 `startupPicArea`。

脚本仅在命中接口且响应结构符合预期时处理；无效 JSON 或不符合预期的结构保持原响应。检查时未发现脚本主动联网、读取本地存储或发送数据的代码。

## 兼容性与使用

1. 使用 **Loon build 1008 或更新版本**。原配置的 `DOMAIN-WILDCARD` 依赖此版本，详见 [Loon 域名规则文档](https://nsloon.app/docs/Rule/domain_rule/)。其余 Script / Rewrite 保留官方支持的旧版输入格式。
2. 点击一键导入并启用，安装并信任 Loon 的 MitM 证书，开启 HTTPS 解密。
3. 完全退出美团后重开。检查开屏、首页、搜索、购物车、我的页以及下单和支付流程。

原插件包含 Shark、HTTPDNS、`mquic-*` 域名和 33 条单 IP 地址拦截，这些并非全部是广告服务器。规则还涉及外卖与点评域名，IP 拦截也不按 App 区分；可能导致加载失败、无网络或影响其他连接。出现异常时先停用本插件并重开 App，不应将离线测试视为业务功能正常的保证。

## 验证

已检查编码、规则与原文件的一致性、IP 地址、正则、脚本 URL 与 MitM 覆盖，并使用合成响应验证各处理入口、业务字段保留和异常响应回退。测试命令：`node --test tests/meituan.test.cjs`。

未进行 Loon 导入或美团真机测试，原文件也未注明美团 App 版本。实际效果取决于 App 接口及缓存。
