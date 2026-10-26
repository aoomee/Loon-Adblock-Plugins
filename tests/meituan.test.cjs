const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'scripts/meituan-clean.js'), 'utf8');
const plugin = fs.readFileSync(path.join(root, 'plugins/meituan.lpx'), 'utf8');
const routes = plugin.split('\n').filter(line => line.startsWith('http-response ')).map(line => {
  const [, pattern, options] = line.split(/\s+/, 3);
  assert.match(options, /requires-body=true/);
  assert.match(options, /script-path=https:\/\/raw\.githubusercontent\.com\/aoomee\/Loon-Adblock-Plugins\/main\/scripts\/meituan-clean\.js,/);
  return new RegExp(pattern, 'i');
});
const mitm = plugin.match(/^hostname = (.+)$/m)[1].split(', ');

function run(url, body) {
  const calls = [];
  vm.runInNewContext(source, {
    $request: { url }, $response: { body },
    $done: value => calls.push(JSON.parse(JSON.stringify(value))),
  }, { timeout: 1000 });
  assert.equal(calls.length, 1, 'script must finish exactly once');
  return calls[0];
}
function transform(url, input) {
  assert.equal(routes.filter(pattern => pattern.test(url)).length, 1);
  assert.ok(mitm.includes(new URL(url).hostname));
  const result = run(url, JSON.stringify(input));
  assert.equal(typeof result.body, 'string');
  return JSON.parse(result.body);
}

test('homepage removes only video and AI, preserving navigation and other fields', () => {
  const url = 'https://apimobile.meituan.com/aggroup/indexTab?version=1';
  const tabArea = ['homepage', 'video', 'xiaotuan', 'orders', 'mine'].map(tabName => ({ tabName }));
  const output = transform(url, { data: { resource: { tabArea }, city: 1 }, code: 0 });
  assert.deepEqual(output, { data: { resource: { tabArea: ['homepage', 'orders', 'mine'].map(tabName => ({ tabName })) }, city: 1 }, code: 0 });
  assert.deepEqual(run(url, JSON.stringify({ data: { resource: { tabArea: [{ tabName: 'video' }] } } })), {});
});

test('only the two configured feed scenes are emptied', () => {
  for (const scene of ['gwc_feed1_2265', 'personalcenter_2154']) {
    const url = `https://feedguess.meituan.com/lycoris/scene/${scene}?page=1`;
    assert.deepEqual(transform(url, { data: [{ ad: 1 }], ext: { keep: 1 }, code: 0 }), {
      data: [], ext: { keep: 1, forbidByExp: true }, code: 0, bottom: true,
    });
  }
  for (const scene of ['homepage', 'gwc_feed1_22650', 'personalcenter_2154_extra']) {
    const url = `https://feedguess.meituan.com/lycoris/scene/${scene}`;
    assert.ok(routes.every(pattern => !pattern.test(url)));
    assert.deepEqual(run(url, '{"data":[{"keep":1}]}'), {});
  }
});

test('mine preserves orders and wallet', () => {
  assert.deepEqual(transform('https://mt-personalcenter.meituan.com/usercenter/display', {
    children: [{ name: 'orders' }, { name: 'mine_cross_recommend' }, { name: 'wallet' }], code: 0,
  }), { children: [{ name: 'orders' }, { name: 'wallet' }], code: 0 });
});

test('search clears recommendations while preserving unrelated data', () => {
  assert.deepEqual(transform('https://apimobile.meituan.com/group/v1/deal/searchpage/defaultword', {
    searchIntroduceResponse: { defaultWordRes: { defaultWordItems: [1], keep: 2 }, HotWordInfos: [3] }, keep: 4,
  }), { searchIntroduceResponse: { defaultWordRes: { defaultWordItems: [], keep: 2 }, HotWordInfos: [] }, keep: 4 });
  assert.deepEqual(transform('https://apimobile.meituan.com/group/v1/deal/searchpage/hotword/city/divide/hotrecommend/1', {
    data: { segmentsV2: [{ hotwordSegments: [{ pageName: 'EntranceHotwordsV2Hotwords' }, { pageName: 'keep' }] },
      { hotwordSegments: [{ pageName: 'EntranceHotwordsV2ContentCard' }] }, { other: 1 }],
    aiSearchBubble: { bubbleTexts: ['ad'], keep: 2 } },
  }), { data: { segmentsV2: [{ hotwordSegments: [{ pageName: 'keep' }] }, { other: 1 }], aiSearchBubble: { bubbleTexts: [], keep: 2 } } });
});

test('AI config preserves fields outside skills and tolerates invalid nested JSON', () => {
  const url = 'https://assistify.meituan.com/assistant/getAppClientHornConfig';
  const output = transform(url, { data: JSON.stringify({ skills: { ai: 1 }, keep: 2 }), code: 0 });
  assert.deepEqual(JSON.parse(output.data), { skills: {}, keep: 2 });
  assert.equal(output.code, 0);
  assert.deepEqual(run(url, '{"data":"invalid json"}'), {});
});

test('cart and splash clear only their target area across supported response shapes', () => {
  for (const [endpoint, key] of [['mop/entry/shoppingCartEntry', 'topBannerArea'], ['api/entryModule/startupPicture', 'startupPicArea']]) {
    for (const nested of [false, true]) {
      for (const field of ['resourcesMap', 'resource']) {
        const holder = { [field]: { [key]: [1], businessArea: [{ id: 42 }] } };
        const input = nested ? { data: holder, code: 0 } : { ...holder, code: 0 };
        const expected = JSON.parse(JSON.stringify(input));
        (nested ? expected.data : expected)[field][key] = [];
        assert.deepEqual(transform(`https://mop.meituan.com/${endpoint}`, input), expected);
      }
    }
  }
});

test('bad bodies and unexpected schemas pass through without replacing response', () => {
  const urls = ['https://apimobile.meituan.com/aggroup/indexTab', 'https://feedguess.meituan.com/lycoris/scene/gwc_feed1_2265',
    'https://mt-personalcenter.meituan.com/usercenter/display', 'https://apimobile.meituan.com/group/v1/deal/searchpage/defaultword',
    'https://apimobile.meituan.com/group/v1/deal/searchpage/hotword/city/divide/hotrecommend/1',
    'https://assistify.meituan.com/assistant/getAppClientHornConfig', 'https://mop.meituan.com/mop/entry/shoppingCartEntry',
    'https://mop.meituan.com/api/entryModule/startupPicture'];
  assert.equal(routes.length, 8);
  for (const url of urls) {
    for (const body of ['', '<html>error</html>', 'null', '{}', '{"unexpected":true}', undefined]) {
      assert.deepEqual(run(url, body), {});
    }
  }
  assert.ok(routes.every(pattern => !pattern.test('https://apimobile.meituan.com.evil.example/aggroup/indexTab')));
});
