const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const stateSource = read("state-sync.js");
const liveSource = read("live-sync.js");
const appSource = read("app.js");
const publicStart = appSource.indexOf("function applyRemotePublicState(");
const publicEnd = appSource.indexOf("async function loadRemotePublicState(", publicStart);
assert.ok(publicStart >= 0 && publicEnd > publicStart, "Public projection adapter must exist");
const publicAdapter = appSource.slice(publicStart, publicEnd);
const APP_KEY = "zborcek-sv-trojice-v2";
const PAIR_KEY = "zborcek-live-sync-pair-v1";
const clone = (value) => JSON.parse(JSON.stringify(value));
const mergeContext = vm.createContext({});
vm.runInContext(stateSource, mergeContext);
const S = mergeContext.ZborcekStateSync;

function fixture() {
  return {
    songs: [{ id: "song-1", title: "Original title", lyrics: "Private lyrics", known: true,
      chords: "C", inlineChords: "[C]Fixture", chordHistory: [{ chords: "G" }] }],
    people: [{ id: "person-1", name: "Synthetic participant", email: "fixture@example.test" }],
    massHistory: [{ date: "2026-11-01", note: "Original note", selections: {}, additionalSelections: {}, partLabels: {} }],
    canvaPages: [], mass: { date: "2026-11-01", note: "Local UI" },
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function server(initial = fixture()) {
  let state = clone(initial), revision = 1;
  const calls = [], gates = [];
  const etag = (isPublic) => `"${isPublic ? "public-" : ""}${revision}"`;
  return {
    calls,
    get state() { return clone(state); },
    update(edit) { edit(state); revision++; },
    holdNext(method, name) {
      const entered = deferred(), release = deferred();
      gates.push({ method, name, entered, release });
      return { entered: entered.promise, release: () => release.resolve() };
    },
    async request(name, route, options = {}) {
      const method = options.method || "GET";
      const call = { name, route, method, headers: new Headers(options.headers),
        body: options.body ? JSON.parse(options.body) : null };
      calls.push(call);
      const index = gates.findIndex((gate) => gate.method === method && gate.name === name);
      if (index >= 0) {
        const [gate] = gates.splice(index, 1);
        gate.entered.resolve();
        await gate.release.promise;
      }
      if (method === "POST") {
        assert.equal(route, "/api/state/changes");
        assert.equal(call.body.protocol, 1);
        const merged = S.merge(S.snapshot(state), call.body.changes);
        if (merged.conflicts.length) return Response.json({ state: clone(state), conflicts: merged.conflicts }, { status: 409 });
        if (merged.changed) { state = { ...clone(merged.state), mass: state.mass }; revision++; }
        return Response.json({ saved: true, state: clone(state) }, { headers: { ETag: etag(false) } });
      }
      const isPublic = route === "/api/public-state";
      assert.ok(isPublic || route === "/api/state");
      const headers = { ETag: etag(isPublic) };
      if (call.headers.get("If-None-Match") === headers.ETag) return new Response(null, { status: 304, headers });
      const result = isPublic ? {
        songs: state.songs.map(({ id, title }) => ({ id, title })),
        massHistory: clone(state.massHistory), canvaPages: clone(state.canvaPages),
      } : clone(state);
      return Response.json(result, { headers });
    },
  };
}

function client(remote, { name = "A", initial = fixture(), memory = new Map(), admin = true } = {}) {
  let status = "", conflict = false;
  const c = vm.createContext({ console, setTimeout, clearTimeout,
    state: clone(initial), isAdminView: admin, IS_GITHUB_PUBLIC: false, suppressRemoteSave: false,
    localStorage: { getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, String(value)) },
    window: { addEventListener() {} },
    document: { visibilityState: "visible", addEventListener() {} },
  });
  vm.runInContext(stateSource, c);
  vm.runInContext(liveSource, c);
  vm.runInContext(publicAdapter, c);
  const persist = () => memory.set(APP_KEY, JSON.stringify(c.state));
  const sync = c.createZborcekLiveSync({
    read: () => c.state, admin: () => c.isAdminView, editing: () => false,
    status: (value) => { status = value; }, conflict: (value) => { conflict = value; },
    apply(value, isPublic) {
      if (isPublic) c.applyRemotePublicState(value);
      else c.state = { ...clone(value), mass: c.state.mass };
      persist();
    },
    request: (route, options) => remote.request(name, route, options),
  });
  return {
    sync, memory,
    get state() { return c.state; }, get status() { return status; }, get conflict() { return conflict; },
    access(value) { c.isAdminView = value; },
    edit(edit) { edit(c.state); persist(); sync.dirty(); },
  };
}

test("issue 1: public polling cannot delete private fields or an unsaved private draft on login", async () => {
  const remote = server(), a = client(remote);
  await a.sync.refresh(true);
  a.edit((state) => { state.songs[0].lyrics = "Unsaved private lyrics"; });
  a.access(false);
  await a.sync.refresh(true);
  assert.equal(a.state.songs[0].lyrics, undefined, "Exercise the real public adapter's omitted fields");
  assert.equal(remote.state.songs[0].lyrics, "Private lyrics");
  a.access(true);
  await a.sync.refresh(true);
  assert.equal(a.state.songs[0].lyrics, "Unsaved private lyrics");
  assert.equal(a.state.songs[0].known, true);
  assert.deepEqual(clone(a.state.songs[0].chordHistory), [{ chords: "G" }]);
  assert.equal(await a.sync.save(), true);
  assert.equal(remote.state.songs[0].lyrics, "Unsaved private lyrics");
  assert.equal(remote.state.songs[0].known, true);
  assert.deepEqual(remote.state.songs[0].chordHistory, [{ chords: "G" }]);
});

test("issue 1: reload of public state restores the stored private pair on login", async () => {
  const remote = server(), memory = new Map(), a = client(remote, { memory });
  await a.sync.refresh(true);
  a.edit((state) => { state.songs[0].lyrics = "Private draft survives reload"; });
  a.access(false);
  await a.sync.refresh(true);
  const reloaded = client(remote, { memory, initial: JSON.parse(memory.get(APP_KEY)), admin: false });
  await reloaded.sync.refresh(true);
  reloaded.access(true);
  await reloaded.sync.refresh(true);
  assert.equal(reloaded.state.songs[0].lyrics, "Private draft survives reload");
  assert.equal(await reloaded.sync.save(), true);
  assert.equal(remote.state.songs[0].known, true);
  assert.equal(remote.state.songs[0].lyrics, "Private draft survives reload");
});

test("issue 1: public-first load then first login without an envelope creates no deletions", async () => {
  const remote = server(), a = client(remote, { admin: false });
  await a.sync.refresh(true);
  assert.equal(a.memory.has(PAIR_KEY), false);
  assert.equal(a.state.songs[0].lyrics, undefined);
  a.access(true);
  await a.sync.refresh(true);
  assert.equal(a.conflict, false);
  assert.equal(a.state.songs[0].lyrics, "Private lyrics");
  assert.equal(a.state.songs[0].known, true);
  assert.equal(await a.sync.save(), true);
  assert.deepEqual(remote.state.songs[0], fixture().songs[0]);
  assert.equal(remote.calls.filter((call) => call.method === "POST").length, 0);
});

for (const preferLocal of [false, true]) {
  test(`issue 2: same-field edit during POST conflicts before rebase; resolve ${preferLocal ? "local" : "remote"}`, async () => {
    const remote = server(), a = client(remote), b = client(remote, { name: "B" });
    await a.sync.refresh(true);
    await b.sync.refresh(true);
    a.edit((state) => { state.songs[0].title = "A's independent title"; });
    const gate = remote.holdNext("POST", "A");
    const saving = a.sync.save();
    await gate.entered;
    try {
      a.edit((state) => { state.massHistory[0].note = "A typed during POST"; });
      b.edit((state) => { state.massHistory[0].note = "B's concurrent note"; });
      assert.equal(await b.sync.save(), true);
    } finally { gate.release(); }
    assert.equal(await saving, false);
    assert.equal(a.status, "conflict");
    assert.equal(a.conflict, true);
    assert.equal(a.state.massHistory[0].note, "A typed during POST");
    assert.equal(remote.state.massHistory[0].note, "B's concurrent note");
    assert.equal(remote.state.songs[0].title, "A's independent title");
    assert.equal(remote.calls.filter((call) => call.name === "A" && call.method === "POST").length, 1,
      "Do not silently issue a second POST rebased onto B's note");
    await a.sync.resolve(preferLocal);
    assert.equal(a.conflict, false);
    assert.equal(remote.state.massHistory[0].note, preferLocal ? "A typed during POST" : "B's concurrent note");
    assert.equal(remote.state.songs[0].title, "A's independent title");
  });
}

test("issue 3: cross-tab storage and reload keep draft/baseline paired without rolling back remote edits", async () => {
  const remote = server(), memory = new Map();
  const a = client(remote, { memory }), b = client(remote, { name: "B", memory });
  await a.sync.refresh(true);
  await b.sync.refresh(true);
  b.edit((state) => { state.songs[0].title = "B's saved title"; });
  await b.sync.save();
  a.edit((state) => { state.massHistory[0].note = "A's offline draft"; });
  const pair = JSON.parse(memory.get(PAIR_KEY));
  assert.equal(pair.base.songs[0].title, "Original title");
  assert.equal(pair.draft.songs[0].title, "Original title");
  assert.equal(pair.draft.massHistory[0].note, "A's offline draft");
  const reloaded = client(remote, { name: "reloaded", memory, initial: JSON.parse(memory.get(APP_KEY)) });
  await reloaded.sync.refresh(true);
  assert.equal(reloaded.conflict, false);
  assert.equal(reloaded.state.songs[0].title, "B's saved title");
  assert.equal(reloaded.state.massHistory[0].note, "A's offline draft");
  assert.equal(await reloaded.sync.save(), true);
  assert.equal(remote.state.songs[0].title, "B's saved title");
  assert.equal(remote.state.massHistory[0].note, "A's offline draft");
});

test("issue 4: edits while the first baseline GET is pending survive and are saved", async () => {
  const remote = server(), a = client(remote);
  const gate = remote.holdNext("GET", "A");
  const refreshing = a.sync.refresh(true);
  await gate.entered;
  a.edit((state) => { state.massHistory[0].note = "Typed during initial GET"; });
  remote.update((state) => { state.songs[0].title = "Independent remote edit"; });
  gate.release();
  await refreshing;
  assert.equal(a.conflict, false);
  assert.equal(a.state.massHistory[0].note, "Typed during initial GET");
  assert.equal(a.state.songs[0].title, "Independent remote edit");
  assert.equal(await a.sync.save(), true);
  assert.equal(remote.state.massHistory[0].note, "Typed during initial GET");
  assert.equal(remote.state.songs[0].title, "Independent remote edit");
});

test("issue 6: conflict polling advances its snapshot and resolution invalidates the ETag", async () => {
  const remote = server(), a = client(remote);
  await a.sync.refresh(true);
  a.edit((state) => { state.massHistory[0].note = "A's conflicting draft"; });
  remote.update((state) => { state.massHistory[0].note = "First remote winner"; });
  assert.equal(await a.sync.save(), false);
  assert.equal(a.conflict, true);
  remote.update((state) => { state.massHistory[0].note = "Latest remote winner"; });
  await a.sync.refresh(true);
  assert.equal(a.state.massHistory[0].note, "A's conflicting draft");
  await a.sync.resolve(false);
  assert.equal(a.conflict, false);
  assert.equal(a.state.massHistory[0].note, "Latest remote winner");
  await a.sync.refresh(true);
  assert.equal(remote.calls.at(-1).headers.get("If-None-Match"), null,
    "Resolution must not retain an ETag belonging to a discarded conflict response");
  assert.equal(a.state.massHistory[0].note, remote.state.massHistory[0].note);
  remote.update((state) => { state.massHistory[0].note = "Change after resolution"; });
  await a.sync.refresh(true);
  assert.equal(a.state.massHistory[0].note, "Change after resolution");
});
