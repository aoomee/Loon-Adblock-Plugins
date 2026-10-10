/* Qunar Clean companion for Loon, v1.0.0, 2026-10-10.
 * Routes and fields traced from the supplied Qunar 5.3.8 bundle.
 * Only JSON responses and explicitly identified promotion fields are changed.
 * No network calls, credential storage, remote code, or subscription changes.
 */
(function () {
  'use strict';
  var VERSION = '1.0.0', STORE = 'qunar-clean-v1-stats';
  var HOSTS = ['slugger.qunar.com', 'minislugger.qunar.com', 'homefront.qunar.com',
    'homeback.qunar.com', 'qbi.qunar.com', 'lang.qunar.com', 'qde.qunar.com', 'client.qunar.com'];
  var SERVICES = [
    'pp_gw_u_myHeadInfo', 'pp_gw_u_myMainCard', 'p_feedlist_recommend',
    'm_gw_myPage_doAppDelivery', 'p_tripcard_list', 'p_homeRecommend',
    'content_api_common_feed_open_postList', 't_ga_TrainBottomADBanner',
    'f_flight_home_banner', 'f_flight_homecard_banner', 'f_flight_home_bottom',
    'f_sylas_get_adspotId', 'f_flightHome_float_window'
  ];
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function obj(o) { return o !== null && typeof o === 'object' && !Array.isArray(o); }
  function decode(s) { try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch (_) { return s; } }
  function params(s) {
    var out = Object.create(null);
    String(s || '').split('&').forEach(function (part) {
      var i = part.indexOf('=');
      if (i >= 0) out[decode(part.slice(0, i))] = decode(part.slice(i + 1));
    });
    return out;
  }
  function route(request) {
    var url = String(request.url || ''), m = /^https?:\/\/([^/:?#]+)(?::\d+)?([^?#]*)(?:\?([^#]*))?/i.exec(url);
    if (!m || HOSTS.indexOf(m[1].toLowerCase()) < 0) return null;
    var host = m[1].toLowerCase(), path = m[2], bags = [params(m[3])];
    var body = request.body;
    if (typeof body === 'string' && body.length < 131072) {
      try { bags.push(JSON.parse(body)); } catch (_) { bags.push(params(body)); }
    }
    var candidates = [], serviceKeys = ['qrt', 'serviceType', 't'];
    bags.forEach(function (bag) {
      if (!obj(bag)) return;
      [bag, bag.head].forEach(function (item) {
        if (!obj(item)) return;
        serviceKeys.forEach(function (key) {
          if (typeof item[key] === 'string' && SERVICES.indexOf(item[key]) >= 0 && candidates.indexOf(item[key]) < 0) candidates.push(item[key]);
        });
      });
    });
    // Conflicting service selectors are ambiguous; never choose one silently.
    if (candidates.length > 1) return {host:host, service:'', ambiguous:true};
    var service = candidates[0] || '';
    if (host === 'lang.qunar.com' && path === '/api/common/feed/open/postList') service = 'content_api_common_feed_open_postList';
    return {host:host, service:service, ambiguous:false};
  }
  function clean(request, response) {
    var r = route(request);
    if (!r) return {kind:'outside-scope', actions:[]};
    var result = {kind:'unmatched', host:r.host, service:r.service, actions:[]};
    if (r.ambiguous) { result.kind = 'ambiguous'; return result; }
    if (response.status && (Number(response.status) < 200 || Number(response.status) >= 300)) { result.kind = 'http-error'; return result; }
    if (typeof response.body !== 'string' || response.body.length > 4 * 1024 * 1024) { result.kind = 'unreadable'; return result; }
    var root;
    try {
      root = JSON.parse(response.body, function (_, value) {
        // Re-serializing an unsafe numeric order ID would silently round it.
        if (typeof value === 'number' && (!isFinite(value) || (Math.floor(value) === value && Math.abs(value) > 9007199254740991))) throw new Error('unsafe-number');
        return value;
      });
    } catch (error) { result.kind = error.message === 'unsafe-number' ? 'unsafe-number' : 'non-json'; return result; }
    if (!obj(root)) { result.kind = 'unknown-shape'; return result; }
    if (obj(root.bstatus) && own(root.bstatus, 'code') && Number(root.bstatus.code) !== 0) { result.kind = 'api-error'; return result; }
    if (obj(root.responseBizHead) && own(root.responseBizHead, 'code') && Number(root.responseBizHead.code) !== 0) { result.kind = 'api-error'; return result; }
    var d = obj(root.data) ? root.data : null, service = r.service;
    function set(o, k, value, label) {
      if (!obj(o) || !own(o, k) || JSON.stringify(o[k]) === JSON.stringify(value)) return;
      o[k] = value;
      if (result.actions.indexOf(label) < 0) result.actions.push(label);
    }
    function add(o, k, value) { if (obj(o)) o[k] = value; }
    // Strong response signatures also work when service routing is hidden in
    // the request transport. No generic traversal of order or search results.
    if (d && (service === 'pp_gw_u_myHeadInfo' || (!service && obj(d.myHead) && own(d, 'vipArea') && own(d, 'topRightIcons')))) {
      set(d, 'rightQuickEntrance', null, 'mine.student');
    }
    if (d && (service === 'pp_gw_u_myMainCard' || (!service && obj(d.financial) && obj(d.order) && own(d, 'pointsCenter')))) {
      if (obj(d.financial) && Array.isArray(d.financial.cards)) set(d.financial, 'cards', [], 'mine.finance');
      set(d, 'financialBanner', null, 'mine.finance-banner');
    }
    if (service === 'm_gw_myPage_doAppDelivery' && d) {
      set(d, 'popInfo', null, 'mine.popup'); set(d, 'floatInfo', null, 'mine.float');
    }
    if (service === 'p_feedlist_recommend' && d && Array.isArray(d.contentList)) {
      set(d, 'contentList', [], 'mine.feed');
      if (d.pageFinished !== true) { add(d, 'pageFinished', true); result.actions.push('mine.feed-end'); }
    }
    if (service === 'content_api_common_feed_open_postList' && d && Array.isArray(d.list)) {
      set(d, 'list', [], 'shared.content-feed');
      if (d.isLastOne !== true) { add(d, 'isLastOne', true); result.actions.push('shared.feed-end'); }
      if (Array.isArray(d.fastFilterNameList)) set(d, 'fastFilterNameList', [], 'shared.feed-filters');
    }
    if (service === 'p_tripcard_list' && d) {
      // This leaves real trip/order data intact. It cannot remove native tabs
      // or the app's bundled fallback background image.
      if (obj(d.emptyCardMap)) set(d, 'emptyCardMap', {}, 'trip.empty-promotion');
      if (obj(d.funMapCard)) set(d, 'funMapCard', {}, 'trip.fun-map');
    }
    if (service === 't_ga_TrainBottomADBanner' || (!service && obj(root.responseBizHead) && obj(root.bottomADBannerMap))) {
      if (obj(root.bottomADBannerMap)) set(root, 'bottomADBannerMap', {}, 'train.bottom-ad');
      if (d && obj(d.bottomADBannerMap)) set(d, 'bottomADBannerMap', {}, 'train.bottom-ad');
    }
    if (service === 'f_flight_home_banner' && d && Array.isArray(d.banners)) set(d, 'banners', [], 'flight.home-banners');
    if (service === 'f_flight_homecard_banner' && d) {
      ['bannerImageUrl', 'bannerJumpUrl'].forEach(function (k) { set(d, k, '', 'flight.home-card-banner'); });
    }
    if (d && (service === 'f_flight_home_bottom' || service === 'f_sylas_get_adspotId' ||
      (typeof d.adspotidIOS === 'string' && typeof d.AdrAdsPotId === 'string'))) {
      ['imageURL', 'clickURL', 'DEEPLINKURL', 'MONITORURL', 'ONCLICKURL', 'monitorURL', 'adspotidIOS', 'AdrAdsPotId'].forEach(function (k) {
        if (typeof d[k] === 'string') set(d, k, '', 'shared.sdk-ad');
      });
    }
    // QWHAdvertiseInfo is an ad-only native model. Traverse only its known
    // response containers and require all identifying fields before changing it.
    var adNodes = [root], adCount = 0;
    while (adNodes.length && adCount++ < 100) {
      var ad = adNodes.pop();
      if (Array.isArray(ad)) { ad.forEach(function (v) { if (obj(v)) adNodes.push(v); }); continue; }
      if (!obj(ad)) continue;
      if (typeof ad.adUrl320 === 'string' && own(ad, 'locIndex') && own(ad, 'locName')) set(ad, 'adUrl320', '', 'hotel.native-ad');
      ['data', 'adBanner', 'adRecommendArray'].forEach(function (k) { if (obj(ad[k]) || Array.isArray(ad[k])) adNodes.push(ad[k]); });
    }
    // Dedicated flight popup response: keep the envelope and the data type.
    if (service === 'f_flightHome_float_window' && d && Object.keys(d).length) set(root, 'data', {}, 'flight.float');
    // Native SearchFiveCardModel names, restricted to the home-recommend API.
    // Only a complete card signature is accepted; new layouts pass unchanged.
    if (service === 'p_homeRecommend' && d) {
      var pending = [d], visited = 0;
      while (pending.length && visited++ < 200) {
        var n = pending.pop();
        if (Array.isArray(n)) { n.forEach(function (v) { if (obj(v)) pending.push(v); }); continue; }
        if (!obj(n)) continue;
        if (Array.isArray(n.marketList) && Array.isArray(n.rankList) && own(n, 'promotion')) {
          set(n, 'marketList', [], 'home.five-cards'); set(n, 'rankList', [], 'home.five-cards');
          set(n, 'promotion', null, 'home.five-cards'); set(n, 'couponBanner', null, 'home.five-cards');
        }
        ['cards', 'cardList', 'modules', 'data', 'list'].forEach(function (k) { if (obj(n[k]) || Array.isArray(n[k])) pending.push(n[k]); });
      }
    }
    if (result.actions.length) { result.kind = 'changed'; result.body = JSON.stringify(root); }
    else result.kind = service ? 'no-target-fields' : 'unmatched';
    return result;
  }
  function statsRead() {
    try { return JSON.parse($persistentStore.read(STORE) || '{}'); } catch (_) { return {}; }
  }
  function record(result) {
    if (result.kind === 'outside-scope') return;
    var s = statsRead();
    s.version = VERSION; s.total = (s.total || 0) + 1;
    s.counts = s.counts || {}; s.counts[result.kind] = (s.counts[result.kind] || 0) + 1;
    s.recent = s.recent || [];
    s.recent.push({time:new Date().toISOString(), host:result.host, service:result.service || '(未识别)', kind:result.kind, actions:result.actions});
    s.recent = s.recent.slice(-15);
    try { $persistentStore.write(JSON.stringify(s), STORE); } catch (_) {}
    // Deliberately omit URL queries, headers, response bodies and account data.
    console.log('[QunarClean ' + VERSION + '] ' + JSON.stringify(s.recent[s.recent.length - 1]));
  }
  function report() {
    var s = statsRead(), c = s.counts || {}, msg = '脚本可运行；捕获响应 ' + (s.total || 0) + ' 次，已改写 ' + (c.changed || 0) + ' 次。\n';
    msg += '非 JSON ' + (c['non-json'] || 0) + ' 次；未识别接口 ' + (c.unmatched || 0) + ' 次；已识别但无目标字段 ' + (c['no-target-fields'] || 0) + ' 次。\n';
    msg += '捕获为 0：检查规则、解密域名或缓存。非 JSON 多：需查看真实响应格式。改写计数不等于页面验收通过。';
    console.log('[QunarClean report] ' + JSON.stringify(s));
    if (typeof $notification !== 'undefined') $notification.post('去哪儿配套清理 v' + VERSION, '运行状态', msg);
    return msg;
  }
  if (typeof module !== 'undefined' && module.exports && typeof $done === 'undefined') {
    module.exports = {clean:clean, route:route, hosts:HOSTS, services:SERVICES}; return;
  }
  var output = {};
  try {
    if (typeof $request === 'undefined') report();
    else if (typeof $response !== 'undefined') {
      var result = clean($request, $response);
      record(result);
      if (result.kind === 'changed') output.body = result.body;
    }
  } catch (_) { console.log('[QunarClean ' + VERSION + '] 内部处理失败，保留原响应。'); }
  $done(output);
})();
