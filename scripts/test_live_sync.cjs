const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const context = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, Request, Response, Headers, URL, btoa, atob, console });
vm.runInContext(read("dist/server/index.js").replace("export default {", "globalThis.worker = {"), context);
const S = context.ZborcekStateSync;
let stored = { songs: [], people: [{ id: "p1", name: "Private fixture", email: "private@example.test" }], canvaPages: [],
  massHistory: [{ date: "2026-11-01", note: "", selections: { Vstopna: "", Psalm: "" }, additionalSelections: {}, partLabels: {} }],
  mass: { date: "2026-11-01", note: "local UI" } };
let revision = 1, writes = 0, collision = null;
const env = { ADMIN_USERNAME: "admin", ADMIN_PASSWORD: "fixture-password", SESSION_SECRET: "fixture-secret",
  MEDIA: {
    async get() { const value = JSON.stringify(stored), etag = String(revision); return { etag, text: async () => value }; },
    async put(key, value, options) {
      assert.ok(options.onlyIf, "Every write must use a storage precondition");
      if (collision) { const action = collision; collision = null; action(); revision++; }
      if (options.onlyIf.etagMatches !== String(revision)) return null;
      stored = JSON.parse(value); writes++; return { etag: String(++revision) };
    },
  } };
const request = (route, options = {}) => context.worker.fetch(new Request("https://choir.test" + route, options), env);
let Cookie;
const get = async () => (await request("/api/state", { headers: { Cookie } })).json();
const changes = (base, next) => S.diff(S.snapshot(base), S.snapshot(next));
const post = (ops) => request("/api/state/changes", { method: "POST", headers: { Cookie, Origin: "https://choir.test", "Content-Type": "application/json" }, body: JSON.stringify({ protocol: 1, changes: ops }) });
async function main() {
  Cookie = (await request("/api/login", { method: "POST", body: JSON.stringify({ username: "admin", password: "fixture-password" }) })).headers.get("Set-Cookie").split(";")[0];
  const base = await get(), a = structuredClone(base), b = structuredClone(base);
  a.massHistory[0].selections.Vstopna = "song-a";
  b.massHistory[0].note = "Shared note";
  assert.equal((await post(changes(base, a))).status, 200);
  assert.equal((await post(changes(base, b))).status, 200);
  assert.equal(stored.massHistory[0].selections.Vstopna, "song-a");
  assert.equal(stored.massHistory[0].note, "Shared note");
  assert.equal(stored.mass.note, "local UI", "Chosen date/draft UI must not be shared");
  const beforeRetry = writes;
  assert.equal((await post(changes(base, a))).status, 200);
  assert.equal(writes, beforeRetry, "Retries are idempotent");
  const conflict = structuredClone(base); conflict.massHistory[0].note = "Competing note";
  const clash = await post(changes(base, conflict));
  assert.equal(clash.status, 409);
  assert.equal((await clash.json()).state.massHistory[0].note, "Shared note");
  const nextBase = await get(), next = structuredClone(nextBase);
  next.massHistory[0].selections.Psalm = "song-b";
  collision = () => { stored.massHistory[0].partLabels.Psalm = "Response"; };
  assert.equal((await post(changes(nextBase, next))).status, 200);
  assert.equal(stored.massHistory[0].partLabels.Psalm, "Response", "CAS retries preserve a write made between read and put");
  assert.equal(stored.massHistory[0].selections.Psalm, "song-b");
  const before = await get(), after = structuredClone(before);
  after.people.push({ id: "p2", name: "Second fixture", phone: "123" });
  assert.equal((await post(changes(before, after))).status, 200);
  assert.equal(stored.people.length, 2, "New keyed records can be added");
  const delBase = await get(), deleted = structuredClone(delBase); deleted.people.splice(0, 1);
  const edited = structuredClone(delBase); edited.people[0].phone = "changed";
  assert.equal((await post(changes(delBase, edited))).status, 200);
  assert.equal((await post(changes(delBase, deleted))).status, 409, "Deletion cannot silently discard a simultaneous edit");
  const labelBase = await get(), label = structuredClone(labelBase); label.massHistory[0].partLabels.Psalm = "";
  assert.equal((await post(changes(labelBase, label))).status, 200);
  assert.equal(stored.massHistory[0].partLabels.Psalm, "", "Explicitly empty labels survive synchronization");
  assert.equal((await request("/api/state", { method: "POST", headers: { Cookie }, body: JSON.stringify(base) })).status, 409, "Old tabs cannot overwrite shared state");
  const etagged = await request("/api/state", { headers: { Cookie } });
  assert.equal((await request("/api/state", { headers: { Cookie, "If-None-Match": etagged.headers.get("ETag") } })).status, 304);
  const pub = await request("/api/public-state"), publicData = await pub.json();
  assert.equal(publicData.people, undefined);
  assert.ok(publicData.songs.every((song) => !song.chords && !song.inlineChords));
  assert.equal((await request("/api/public-state", { headers: { "If-None-Match": pub.headers.get("ETag") } })).status, 304);
  assert.equal((await request("/api/public-state", { headers: { "If-None-Match": "W/" + pub.headers.get("ETag") } })).status, 304, "Hosting compression may return a weak ETag");
  assert.equal((await request("/api/state/changes", { method: "POST", body: "{}" })).status, 401);
  assert.equal((await request("/api/state/changes", { method: "POST", headers: { Cookie, Origin: "https://other.test" }, body: "{}" })).status, 403);
  assert.equal((await post([{ path: ["__proto__", "polluted"], beforeMissing: true, value: true }])).status, 400);
  assert.equal((await post([{ path: ["syncMeta"], beforeMissing: true, value: {} }])).status, 400);
  assert.equal((await post([{ path: ["mass", "date"], beforeMissing: true, value: "bad" }])).status, 400);
  assert.equal(writes > 0, true);
  await clients();
  env.PARTICIPANTS_IMPORT_JSON = JSON.stringify([{ sheetRow: 999, name: "Protected import fixture" }]);
  collision = () => { stored.massHistory[0].note = "Concurrent during participant import"; };
  await context.importProtectedParticipants(env);
  assert.equal(stored.massHistory[0].note, "Concurrent during participant import");
  assert.equal(stored.participantsImportedFromSheet20261011, true);
  assert.ok(stored.people.some((person) => person.sheetRow === 999));
  delete env.PARTICIPANTS_IMPORT_JSON;
  console.log("Live sync: independent concurrent fields, conflict detection, CAS race/retry, idempotency, keyed addition/deletion, empty labels, ETags, stale-client protection, auth/privacy and two-client/offline/in-flight edits OK. Browser UI not exercised.");
}

async function clients() {
  function client(initial) {
    let local = structuredClone(initial), status = "", admin = true, online = true, hold;
    const memory = new Map(), events = {};
    const c = vm.createContext({ console, setTimeout, clearTimeout,
      localStorage: { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) },
      window: { addEventListener: (key, fn) => { events[key] = fn; } },
      document: { visibilityState: "visible", addEventListener: (key, fn) => { events[key] = fn; } },
    });
    vm.runInContext(read("state-sync.js"), c); vm.runInContext(read("live-sync.js"), c);
    const sync = c.createZborcekLiveSync({ read: () => local, admin: () => admin, editing: () => false,
      status: (value) => { status = value; }, conflict() {}, apply: (value) => { local = { ...value, mass: local.mass }; },
      request: async (route, options = {}) => {
        if (!online) throw Error("Offline fixture");
        if (hold && options.method === "POST") { const gate = hold; hold = null; await gate; }
        return request(route, { ...options, headers: { ...options.headers, Cookie } });
      },
    });
    return { sync, get local() { return local; }, get status() { return status; },
      offline(value) { online = !value; }, hold(value) { hold = value; }, logout() { admin = false; } };
  }
  const original = await get(), a = client(original), b = client(original);
  await a.sync.refresh(); await b.sync.refresh();
  a.local.massHistory[0].note = "From A"; await a.sync.save();
  b.local.massHistory[0].partLabels.Vstopna = "From B"; await b.sync.save();
  await a.sync.refresh();
  assert.equal(a.local.massHistory[0].partLabels.Vstopna, "From B");
  assert.equal(b.local.massHistory[0].note, "From A");
  a.offline(true); a.local.massHistory[0].note = "Offline A";
  await assert.rejects(a.sync.save()); assert.equal(a.status, "offline");
  b.local.massHistory[0].partLabels.Vstopna = "Online B"; await b.sync.save();
  a.offline(false); await a.sync.refresh(); await a.sync.save();
  assert.equal(a.local.massHistory[0].note, "Offline A");
  assert.equal(a.local.massHistory[0].partLabels.Vstopna, "Online B");
  let resume; a.hold(new Promise((resolve) => { resume = resolve; }));
  a.local.massHistory[0].note = "First typing";
  const saving = a.sync.save();
  a.local.massHistory[0].note = "Latest typing"; resume(); await saving;
  assert.equal((await get()).massHistory[0].note, "Latest typing", "Edits made during the request are sent afterward");
  await b.sync.refresh();
  a.local.massHistory[0].note = "Winner"; await a.sync.save();
  b.local.massHistory[0].note = "Local alternative"; await b.sync.save();
  assert.equal(b.status, "conflict"); assert.equal(b.local.massHistory[0].note, "Local alternative");
  await b.sync.resolve(false);
  assert.equal(b.local.massHistory[0].note, "Winner");
  await a.sync.refresh();
  a.local.massHistory[0].note = "Another winner"; await a.sync.save();
  b.local.massHistory[0].note = "Keep mine"; await b.sync.save(); await b.sync.resolve(true);
  assert.equal((await get()).massHistory[0].note, "Keep mine");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
