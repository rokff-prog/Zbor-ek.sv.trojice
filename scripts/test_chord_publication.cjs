const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const original = {
  songs: [
    { id: "manual-ko", title: "KO JEZUS JE ZAČEL UČITI", inlineChords: "Ko CJezus je zaGčel uCčiti,", categories: [] },
    { id: "old-ko", title: "Ko jezus je začel učiti", link: "https://jubilate.donbosko.si/song/116" },
    { id: "old-gospod", title: "Gospod usmili se", link: "https://jubilate.donbosko.si/song/439", inlineChords: "[C]Other version" },
  ],
  people: [{ id: "private-test", name: "Private test person" }],
  massHistory: [{ date: "2026-10-16", selections: { Vstopna: "manual-ko" } }],
};
let stored = structuredClone(original), writes = 0;
const context = vm.createContext({
  crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, Request, Response, URL, btoa, atob, console,
});
vm.runInContext(fs.readFileSync(path.join(root, "dist/server/index.js"), "utf8")
  .replace("export default {", "globalThis.worker = {"), context);
const env = {
  ADMIN_USERNAME: "test-admin", ADMIN_PASSWORD: "test-password", SESSION_SECRET: "test-secret",
  MEDIA: {
    get: async () => ({ etag: String(writes), text: async () => JSON.stringify(stored) }),
    put: async (key, body) => { assert.equal(key, "app-state.json"); writes++; stored = JSON.parse(body); },
  },
};
const request = (route, options = {}) => context.worker.fetch(new Request("https://choir.test" + route, options), env);

async function main() {
  assert.equal((await request("/api/state")).status, 401);
  const login = await request("/api/login", { method: "POST", body: JSON.stringify({ username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD }) });
  const cookie = login.headers.get("Set-Cookie").split(";")[0];
  const state = await (await request("/api/state", { headers: { Cookie: cookie } })).json();
  assert.equal(state.songs.length, 6);
  const miklavz = state.songs.find((song) => song.catalogKey === 'pridi-sveti-miklavz');
  assert.equal(miklavz.title, 'Pridi, sveti Miklavž');
  assert.doesNotMatch(miklavz.inlineChords, /akordi v c.?duru|refren|kitica/i);
  assert.equal((miklavz.inlineChords.match(/\(2x\)/g) || []).length, 3);
  assert.equal((miklavz.lyrics.match(/Pridi, sveti Miklavž,/g) || []).length, 6);
  assert.match(miklavz.inlineChords, /\[C\]Letos priden sem \[G\]bil/);
  assert.match(miklavz.inlineChords, /\[C\]Pismo pisal sem \[G\]ti/);
  assert.equal(miklavz.inBook, false);
  assert.equal(miklavz.printNumber, undefined);
  const lucka = state.songs.find((song) => song.title === "Poglej to lučko");
  assert.match(lucka.inlineChords, /\[D\]Poglej to lučko, \[D\]poglej ta sij/);
  assert.match(lucka.inlineChords, /V\[e\]zemi to \[A7\]lučko/);
  assert.match(lucka.lyrics, /hvala za to luč, še enkrat hvala/);
  const ko = state.songs.find((song) => song.id === "manual-ko");
  assert.match(ko.inlineChords, /Ko \[C\]Jezus je za\[G\]čel u\[C\]čiti,/);
  assert.match(ko.lyrics, /^Ko Jezus je začel učiti,/);
  assert.equal(ko.chordHistory[0].inlineChords, original.songs[0].inlineChords);
  assert.equal(state.songs.find((song) => song.id === "old-ko").inlineChords, ko.inlineChords);
  const toronto = state.songs.find((song) => song.catalogKey === "gospod-toronto-2002");
  assert.match(toronto.inlineChords, /Gos\[D\]pod/);
  assert.match(toronto.inlineChords, /\[Fis\]/);
  assert.deepEqual(state.songs.find((song) => song.id === "old-gospod"), original.songs[2]);
  assert.deepEqual(state.massHistory, original.massHistory);
  assert.deepEqual(state.people, original.people);
  assert.equal(writes, 0, "GET migration must not race a save by overwriting storage");
  const publicState = await (await request("/api/public-state")).json();
  assert.ok(publicState.songs.some((song) => song.title.includes("Toronto 2002")));
  assert.equal(publicState.people, undefined);
  assert.ok(publicState.songs.every((song) => song.inlineChords === undefined && song.chordHistory === undefined));
  await request("/api/state", { method: "POST", headers: { Cookie: cookie }, body: JSON.stringify(original) });
  assert.equal(writes, 1);
  assert.deepEqual(stored, state, "Old clients cannot erase the published corrections on save");
  stored.songs.find((song) => song.id === "manual-ko").inlineChords = "[D]Later user edit";
  const reloaded = await (await request("/api/state", { headers: { Cookie: cookie } })).json();
  assert.equal(reloaded.songs.find((song) => song.id === "manual-ko").inlineChords, "[D]Later user edit");
  assert.equal(reloaded.songs.length, 6, "No duplicates after reopening");
  assert.equal(reloaded.songs.find((song) => song.id === 'manual-ko').title, "Ko Jezus je začel učiti", "An empty source link must not match unrelated songs");
  console.log("Published chords: legacy state repaired on read/save, both songs present, backups and later edits preserved, private fields excluded OK.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
