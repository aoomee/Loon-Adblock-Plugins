// Run with: node --test tests/91porn.test.js
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const plugin = readFileSync(`${__dirname}/../plugins/91porn.plugin`, 'utf8');
const rule = plugin.split('\n').find(line => line.startsWith('response if'));
const guard = Function(`return ${rule.match(/\$\{url\} ~= (.*?) &&/)[1]}`)();
const actions = rule.split(' then ')[1].split(' | ').map(action =>
  Function(`return [${action.slice('response.body.replace('.length, -1)}]`)());
const rewrite = html => actions.reduce((body, [pattern, replacement]) =>
  body.replace(new RegExp(pattern.source, pattern.flags + 'g'), replacement), html);

test('only the requested domain and its www host are matched', () => {
  for (const url of ['https://91porn.com/index.php', 'https://www.91porn.com/view_video.php?viewkey=test']) {
    assert.ok(guard.test(url));
  }
  for (const url of ['https://91porn.com.example.org/', 'https://example.org/?91porn.com/', 'https://other.91porn.com/']) {
    assert.ok(!guard.test(url));
  }
});

test('preroll is skipped while player initialization and controls still run', () => {
  const code = `var player = videojs('player_one');
    player.nuevo({logo:'images/logo1.png'});
    player.preroll({src:{src:'https://example.test/ad.mp4',type:'video/mp4'},skipTime:1});
    player.pip(); player.seekButtons({forward:10,back:10});`;
  const calls = [];
  const player = {
    nuevo: () => calls.push('nuevo'),
    preroll: () => { throw Error('Preroll must not run'); },
    pip: () => calls.push('pip'),
    seekButtons: () => calls.push('seek'),
  };
  vm.runInNewContext(rewrite(code), { videojs: id => {
    assert.equal(id, 'player_one'); return player;
  } }, { timeout: 1000 });
  assert.deepEqual(calls, ['nuevo', 'pip', 'seek']);
});

test('ad scripts and frames are removed, regular scripts and video sources remain', () => {
  const video = '<video id="player_one"><source src="https://example.test/main.mp4"></video>';
  const normal = '<script src="/videojs/videojs720.js"></script><iframe src="/help.html"></iframe>';
  const ad = '<script src="https://poweredby.jads.co/js/jads.js"></script>';
  const frame = '<iframe style="width:300px" src="https://go.rmhfrtnd.com/smartpop/test?a=1"></iframe>';
  const output = rewrite(`<html><head></head><body>${ad}${ad}${frame}${normal}${video}</body></html>`);
  assert.ok(!output.includes('src="https://poweredby.jads.co'));
  assert.ok(!output.includes('src="https://go.rmhfrtnd.com'));
  assert.ok(output.includes(normal));
  assert.ok(output.includes(video));
  assert.ok(output.includes("id='loon-91porn-adblock'"));
});
