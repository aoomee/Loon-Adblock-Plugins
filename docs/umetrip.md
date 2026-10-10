# 航旅纵横广告净化

本插件依据 [@ddgksf2013 / 墨鱼的 UmetripAds 规则](https://ddgksf2013.top/rewrite/UmetripAds.conf) v1.0.3（2026-10-05）转换为 Loon 格式，并保留原作者署名。脚本基于其官方 `umetrip.ads.js`，适配 Loon 的二进制响应接口和 JSON 响应入口。

## 导入与使用

在安装 Loon 的 iPhone 或 iPad 上打开仓库首页，点击“航旅纵横广告净化”的一键导入链接并启用插件。规则需要 MitM；请确认 Loon 证书已安装、信任，并且下面的域名均已启用 HTTPS 解密。完成后彻底退出航旅纵横再重开。

插件匹配 `*.umetrip.com` 中列出的 native gateway 服务，并拦截 `oss.umetrip.com/fs/advert/` 下的广告图片。上游规则定位的内容包括开屏/动作弹窗、首页运营位、瀑布流、会员营销及行程扩容推广。航旅纵横接口会更新，未在设备上验证的页面效果不作保证。

上游脚本源码 SHA-256：`f1a37c300126b1bd64451261207a9166ee2aad77a3e79705a0f5c24229aef46e`。规则抓取版本为 v1.0.3；本仓库采用带 Loon 响应处理适配的副本，后续上游变化不会自动合并。
