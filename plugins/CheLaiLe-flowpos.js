let body;

try {
  const raw = $response.body || '';
  const startIdx = raw.indexOf('{');
  const endIdx = raw.lastIndexOf('}');

  let obj = { jsonr: { status: '00', data: {} } };

  if (startIdx !== -1 && endIdx > startIdx) {
    try {
      obj = JSON.parse(raw.slice(startIdx, endIdx + 1));
    } catch (parseErr) {
      obj = { jsonr: { status: '00', data: {} } };
    }
  }

  if (!obj || typeof obj !== 'object') obj = {};
  if (!obj.jsonr || typeof obj.jsonr !== 'object') obj.jsonr = {};
  if (!obj.jsonr.data || typeof obj.jsonr.data !== 'object') obj.jsonr.data = {};

  obj.jsonr.data.flowList = [];
  obj.jsonr.data.list = [];
  obj.jsonr.data.ads = [];

  const prefix = startIdx !== -1 ? raw.slice(0, startIdx) : '';
  const suffix = endIdx !== -1 ? raw.slice(endIdx + 1) : '';

  body = prefix + JSON.stringify(obj) + suffix;
} catch (e) {
  body = '';
}

$done({ body });
