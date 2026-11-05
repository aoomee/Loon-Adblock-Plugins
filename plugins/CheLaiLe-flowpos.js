const ENVELOPE_HEAD = '**YGKJ';
const ENVELOPE_TAIL = 'YGKJ##';

let obj;
try {
  const raw = ($response.body || '').trim();
  const matched = raw.match(/cr-emphasis:0YGKJ([\s\S]*?)YGKJ##/);
  obj = JSON.parse(matched ? matched[1] : raw);
} catch (e) {
  obj = { jsonr: { status: '00', data: {} } };
}

if (!obj.jsonr || typeof obj.jsonr !== 'object') obj.jsonr = {};
if (!obj.jsonr.data || typeof obj.jsonr.data !== 'object') obj.jsonr.data = {};

obj.jsonr.data.flowList = [];
obj.jsonr.data.list = [];
obj.jsonr.data.ads = [];

$done({ body: ENVELOPE_HEAD + JSON.stringify(obj) + ENVELOPE_TAIL });
