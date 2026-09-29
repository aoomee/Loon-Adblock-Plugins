// Run with: node --test tests/51cg.test.js
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const plugin = readFileSync(`${__dirname}/../plugins/51cg.plugin`, 'utf8');
const rule = plugin.split('\n').find(line => line.includes("response.header['Content-Type']"));
const action = rule.split(' then response.body.replace(')[1].slice(0, -1);
const [pattern, replacement] = Function(`return [${action}]`)();
const html = '<html><head><title>Test</title></head><body><video></video></body></html>';
const rewritten = html.replace(pattern, replacement);
const hook = rewritten.match(/<script id='loon-51cg-preroll'>([\s\S]*?)<\/script>/)[1];

function sandbox() {
  const context = vm.createContext({}, { codeGeneration: { strings: false, wasm: false } });
  vm.runInContext('window = globalThis', context);
  return context;
}

function adModule() {
  return {
    pickAdConfig: () => ({ totalDuration: 5 }),
    attachPreRollAd: () => { throw Error('Ad must not start'); },
    patchVideoInline: function inline() {},
    attachPauseAudioCleanup: function cleanup() {},
  };
}

function checkPatched(actual, original) {
  assert.equal(actual.pickAdConfig({}), null);
  const player = {};
  assert.equal(actual.attachPreRollAd(player, {}, {}), player);
  assert.equal(actual.patchVideoInline, original.patchVideoInline);
  assert.equal(actual.attachPauseAudioCleanup, original.attachPauseAudioCleanup);
}

test('HTML keeps original content and installs the hook before body scripts', () => {
  assert.equal(rewritten.replace(/<style id='loon-51cg-adblock'>[\s\S]*?<\/style>/, '')
    .replace(/<script id='loon-51cg-(?:preroll|cleanup)'>[\s\S]*?<\/script>/g, ''), html);
  assert.ok(rewritten.indexOf('loon-51cg-preroll') < rewritten.indexOf('<body>'));
});

test('cached or newly downloaded player assignment cannot start a preroll', () => {
  const context = sandbox();
  vm.runInContext(hook, context, { timeout: 1000 });
  for (let i = 0; i < 2; i++) {
    const module = adModule();
    const original = { ...module };
    context.cachedModule = module;
    vm.runInContext("window['DPLAYER_PREROLL_AD'] = cachedModule", context);
    checkPatched(context.DPLAYER_PREROLL_AD, original);
  }
});

test('existing module and repeated hook installation remain safe', () => {
  const context = sandbox();
  context.DPLAYER_PREROLL_AD = adModule();
  const original = { ...context.DPLAYER_PREROLL_AD };
  vm.runInContext(hook, context, { timeout: 1000 });
  vm.runInContext(hook, context, { timeout: 1000 });
  checkPatched(context.DPLAYER_PREROLL_AD, original);
});
