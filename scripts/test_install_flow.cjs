const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../install-app.js'), 'utf8');
const publicUrl = 'https://zborcek-sv-trojice-haloze.poldi4.chatgpt.site/?source=app';
function setup(userAgent, standalone = false) {
  const nodes = new Map(), events = {};
  let copied = '', failClipboard = false;
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { hidden: false, events: {}, textContent: '', value: '',
      addEventListener(type, fn) { this.events[type] = fn; },
      showModal() { this.open = true; }, close() { this.open = false; }, select() { this.selected = true; },
    });
    return nodes.get(id);
  };
  const navigator = { userAgent, standalone, clipboard: { writeText: async text => { if (failClipboard) throw Error('denied'); copied = text; } } };
  vm.runInNewContext(source, { navigator, console, location: { protocol: 'https:', hostname: 'rokff-prog.github.io', pathname: '/old/', search: '?admin=1#secret' },
    document: { querySelector: node }, window: { navigator, matchMedia: () => ({ matches: standalone }), addEventListener: (type, fn) => { events[type] = fn; } },
  });
  return { node, events, click: () => node('#installAppButton').events.click(), get copied() { return copied; }, fail: () => { failClipboard = true; } };
}
async function main() {
  const samsung = setup('Android Chrome/120.0 SamsungBrowser/28.0');
  let prompts = 0;
  samsung.events.beforeinstallprompt({ preventDefault() {}, prompt: async () => { prompts++; }, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  await samsung.click();
  assert.equal(prompts, 0, 'Samsung must not trigger the browser-generated package installation');
  assert.equal(samsung.node('#installHelpDialog').open, true);
  assert.equal(samsung.node('#installChromeActions').hidden, false);
  const intent = samsung.node('#openInstallChrome').href;
  assert.match(intent, /^intent:\/\/zborcek-sv-trojice-haloze\.poldi4\.chatgpt\.site\/\?source=app#Intent;scheme=https;package=com\.android\.chrome;/);
  assert.ok(intent.includes('S.browser_fallback_url=' + encodeURIComponent(publicUrl)));
  assert.doesNotMatch(intent, /admin=1|secret|github/);
  assert.equal(samsung.node('#installPublicUrl').value, publicUrl);
  await samsung.node('#copyInstallUrl').events.click(); assert.equal(samsung.copied, publicUrl);
  samsung.fail(); await samsung.node('#copyInstallUrl').events.click(); assert.equal(samsung.node('#installPublicUrl').selected, true);
  samsung.node('#confirmInstallHelp').events.click(); assert.equal(samsung.node('#installHelpDialog').open, false);
  const chrome = setup('Android Chrome/141.0');
  chrome.events.beforeinstallprompt({ preventDefault() {}, prompt: async () => { prompts++; }, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
  await chrome.click(); assert.equal(prompts, 1, 'Chrome keeps the standard user-initiated installation');
  chrome.events.appinstalled(); assert.equal(chrome.node('#installAppButton').hidden, true);
  const failedPrompt = setup('Android Chrome/141.0');
  failedPrompt.events.beforeinstallprompt({ preventDefault() {}, prompt: async () => { throw Error('unavailable'); } });
  await failedPrompt.click(); assert.equal(failedPrompt.node('#installHelpDialog').open, true);
  assert.equal(failedPrompt.node('#installChromeActions').hidden, true);
  const ios = setup('iPhone Safari/604.1'); await ios.click(); assert.match(ios.node('#installHelpText').textContent, /Safari/);
  const installed = setup('Android Chrome/141.0', true); await installed.click(); assert.equal(installed.node('#installAppButton').hidden, true);
  console.log('Install flow: Samsung native prompt avoided, explicit Chrome handoff/public URL/fallback/copy, unchanged Chrome/iOS flow, prompt failure and standalone states OK. Actual Android installation not exercised.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
