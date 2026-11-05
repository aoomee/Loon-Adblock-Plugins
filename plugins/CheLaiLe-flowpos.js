/*
 * 车来了 flowPos/listByPos 流量位置空
 *
 * 只用于「我的」页等 listByPos 流量位，不要用于 flowPos/home：
 * home 的响应结构未验证（抓包中一直被拦截，从未拿到过真实响应），
 * 盲目清字段可能无效，home 用 reject 更稳。
 *
 * 设计要点：
 *   1. 不硬编码外壳字面量，用 String.fromCharCode 拼，避免被编辑器当 Markdown 吃掉
 *   2. 不用正则，直接找第一个 { 和最后一个 }
 *   3. 解析成功才保留原外壳拼接；解析失败一律返回干净外壳，绝不拼接可疑内容
 *      （响应体若是压缩二进制，indexOf 会定位错误，拼接会产生损坏的 body）
 */

const STAR = String.fromCharCode(42);
const CLEAN = STAR + STAR + 'YGKJ{"jsonr":{"status":"00","data":{"flowList":[],"list":[],"ads":[]}}}YGKJ##';

let body = '';

try {
  const raw = $response.body || '';
  const startIdx = raw.indexOf('{');
  const endIdx = raw.lastIndexOf('}');

  if (startIdx !== -1 && endIdx > startIdx) {
    let obj = null;
    try {
      obj = JSON.parse(raw.slice(startIdx, endIdx + 1));
    } catch (parseErr) {
      obj = null;
    }

    if (obj && typeof obj === 'object') {
      if (!obj.jsonr || typeof obj.jsonr !== 'object') obj.jsonr = {};
      if (!obj.jsonr.data || typeof obj.jsonr.data !== 'object') obj.jsonr.data = {};

      // 只清广告位列表，其余字段原样保留
      obj.jsonr.data.flowList = [];
      obj.jsonr.data.list = [];
      obj.jsonr.data.ads = [];

      body = raw.slice(0, startIdx) + JSON.stringify(obj) + raw.slice(endIdx + 1);
    }
  }
} catch (e) {
  body = '';
}

if (!body) body = CLEAN;

$done({ body });
