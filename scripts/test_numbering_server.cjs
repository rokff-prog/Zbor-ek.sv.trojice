const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const original = { songs: [
  { id: 'ko', title: 'Ko Jezus je začel učiti', songNumber: 97 },
  { id: 'toronto', title: 'Gospod usmili se (toronto)', songNumber: 98 },
], canvaPages: [
  { page: 1, cover: true, title: 'Naslovnica' },
  { page: 31, title: 'KO JEZUS JE ZAČEL UČITI', songId: 'ko' },
  { page: 32, title: 'Gospod usmili se (toronto)', songId: 'toronto' },
], people: [{ name: 'Private fixture' }] };
let stored = structuredClone(original), writes = 0;
const env = { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'fixture-password', SESSION_SECRET: 'fixture-secret',
  MEDIA: { get: async () => ({ etag: String(writes), text: async () => JSON.stringify(stored) }),
    put: async (key, value) => { stored = JSON.parse(value); writes++; } } };
const context = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, Request, Response, URL, btoa, atob, console });
vm.runInContext(fs.readFileSync(path.join(root, 'dist/server/index.js'), 'utf8').replace('export default {', 'globalThis.worker = {'), context);
const request = (route, options = {}) => context.worker.fetch(new Request('https://choir.test' + route, options), env);
async function main() {
  const login = await request('/api/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'fixture-password' }) });
  const Cookie = login.headers.get('Set-Cookie').split(';')[0];
  const numbered = await (await request('/api/state', { headers: { Cookie } })).json();
  assert.equal(numbered.songs.find((song) => song.id === 'ko').printNumber, 31);
  assert.equal(numbered.songs.find((song) => song.id === 'toronto').printNumber, 32);
  assert.equal(writes, 0, 'GET migrations must not overwrite storage');
  await request('/api/state', { method: 'POST', headers: { Cookie }, body: JSON.stringify(numbered) });
  const stale = structuredClone(original);
  stale.canvaPages[1].page = 3;
  stale.canvaPages[2].page = 2;
  stale.songs.forEach((song) => { song.printNumber = 7; });
  await request('/api/state', { method: 'POST', headers: { Cookie }, body: JSON.stringify(stale) });
  assert.equal(stored.songs.find((song) => song.id === 'ko').printNumber, 31);
  assert.equal(stored.canvaPages.find((page) => page.songId === 'toronto').printNumber, 32);
  const publicState = await (await request('/api/public-state')).json();
  assert.equal(publicState.songs.find((song) => song.id === 'ko').printNumber, 31);
  assert.equal(publicState.people, undefined);
  assert.ok(publicState.songNumbering.numbers);
  console.log('Numbering server: printed 31/32 survive old-client saves/reordering and agree in public/admin state; private fields remain excluded OK.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
