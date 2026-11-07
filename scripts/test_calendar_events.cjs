const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, "calendar-events.js"), "utf8"), context);
const eventsFromState = (state, now = "2026-01-01T00:00:00Z") =>
  JSON.parse(JSON.stringify(context.ZborcekCalendar.eventsFromState(state, new Date(now))));
const songs = [
  { id: "song", title: "Pesem", chords: "PRIVATE_CHORDS", lyrics: "PRIVATE_LYRICS", chordHistory: ["PRIVATE_HISTORY"] },
  { id: "second", title: "Druga pesem", inlineChords: "PRIVATE_INLINE" },
  { id: "alias", title: "Old alias title", libraryCanonicalId: "song" },
  { id: "chain", title: "Chain alias title", libraryCanonicalId: "alias" },
  { id: "orphan-alias", title: "Retained alias", libraryCanonicalId: "missing-canonical" },
  { id: "cover", title: "PRIVATE_COVER", isCover: true },
  { id: "cover-alias", title: "PRIVATE_COVER_ALIAS", libraryCanonicalId: "cover" },
  { id: "empty-title", title: "   " },
  { id: "cycle-a", title: "Cycle A", libraryCanonicalId: "cycle-b" },
  { id: "cycle-b", title: "Cycle B", libraryCanonicalId: "cycle-a" },
];
const entry = (date, fields = {}) => ({ date, ...fields });
const exportEntries = (massHistory, now) => eventsFromState({ songs, massHistory }, now);
const dates = (events) => events.map((event) => event.date);
const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

async function main() {
  const noteEntries = ["2026-03-28", "2026-03-29", "2026-03-30"].map((date) => entry(date, { note: "Ma\u0161a" }));
  assert.deepEqual(dates(exportEntries(noteEntries, "2026-03-28T23:30:00Z")), ["2026-03-29", "2026-03-30"], "Ljubljana today before spring DST");
  assert.deepEqual(dates(exportEntries(noteEntries, "2026-03-29T22:30:00Z")), ["2026-03-30"], "Ljubljana today after spring DST");
  const autumn = ["2026-10-24", "2026-10-25", "2026-10-26"].map((date) => entry(date, { note: "Ma\u0161a" }));
  assert.deepEqual(dates(exportEntries(autumn, "2026-10-24T22:30:00Z")), ["2026-10-25", "2026-10-26"]);
  assert.deepEqual(dates(exportEntries(autumn, "2026-10-25T23:30:00Z")), ["2026-10-26"]);
  for (const [date, next] of [["2026-03-29", "2026-03-30"], ["2026-10-25", "2026-10-26"],
    ["2026-12-31", "2027-01-01"], ["2028-02-29", "2028-03-01"]]) {
    assert.equal(exportEntries([entry(date, { note: "Test" })])[0].endDate, next);
  }
  assert.deepEqual(dates(exportEntries([
    entry("2026-12-31", { note: "Yesterday" }), entry("2027-01-01", { note: "Today" }),
  ], "2026-12-31T23:30:00Z")), ["2027-01-01"], "Ljubljana year rollover");

  const invalid = ["", "2026-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-10", "2026-01-00",
    "2026-1-01", "2026-01-1", "2026-01-01T00:00:00Z", " 2026-01-01", "2026-01-01 ", null, 20260101];
  assert.deepEqual(exportEntries(invalid.map((date) => entry(date, { note: "Invalid" }))), []);
  assert.deepEqual(eventsFromState(null), []);
  assert.deepEqual(eventsFromState({ massHistory: {} }), []);
  assert.deepEqual(exportEntries([null, {}, entry("2026-01-02"), entry("2026-01-03", { note: " \n\t " }),
    entry("2026-01-04", { selections: { Vstopna: "missing" } }),
    entry("2026-01-05", { partLabels: { Vstopna: "Label alone" } }),
    entry("2026-01-06", { selections: { Vstopna: "cover", Psalm: "cover-alias", Slava: "empty-title" } }),
    entry("2026-01-07", { selections: { Vstopna: "cycle-a" } }),
  ]), [], "No event without a trimmed note or a valid non-cover song");
  const noteOnly = exportEntries([entry("2026-01-02", { note: "  Praznik  " })])[0];
  assert.deepEqual(noteOnly, { key: "mass:2026-01-02", date: "2026-01-02", endDate: "2026-01-03",
    title: "Zbor\u010dek - Praznik", description: "", allDay: true, colorId: "6" });
  const selected = exportEntries([entry("2026-01-02", { selections: { Vstopna: "song" } })])[0];
  assert.equal(selected.title, "Zbor\u010dek - sveta ma\u0161a");
  assert.equal(selected.description, "Vstopna: Pesem");

  const gloria = (date) => entry(date, { selections: { Slava: "song" }, additionalSelections: { Slava: ["second"] }, partLabels: { Slava: "Renamed" } });
  assert.deepEqual(dates(exportEntries([gloria("2026-11-28"), gloria("2026-11-29"), gloria("2026-12-24"), gloria("2026-12-25")])),
    ["2026-11-28", "2026-12-25"], "Advent Gloria omission follows the first Sunday on/after November 27");
  assert.deepEqual(dates(exportEntries([gloria("2027-11-27"), gloria("2027-11-28"), gloria("2028-12-02"), gloria("2028-12-03")])),
    ["2027-11-27", "2028-12-02"]);
  assert.equal(exportEntries([{ ...gloria("2026-12-06"), note: "Advent" }])[0].description, "");

  const state = freeze({ songs, people: [{ name: "PRIVATE_PERSON" }], canva: { token: "PRIVATE_TOKEN" },
    mass: entry("2026-01-01", { note: "PRIVATE_UNSAVED_MASS" }),
    massHistory: [entry("2026-02-01", { note: " \t ", private: "PRIVATE_ENTRY", selections: { Vstopna: "chain", Obhajilo: "" },
      additionalSelections: { Vstopna: ["second", "song"], Obhajilo: ["", "second", "cover", "song"] },
      partLabels: { Vstopna: "Po meri", Obhajilo: "" } })] });
  const before = JSON.stringify(state);
  const projected = eventsFromState(state);
  assert.equal(projected[0].description, "Po meri: Pesem\nPo meri: Druga pesem\nPo meri: Pesem\nDruga pesem\nPesem",
    "All additional songs survive blank first slots; order, repeats, canonical IDs, and empty labels are preserved");
  assert.equal(JSON.stringify(state), before, "Pure export must not mutate even deeply frozen input");
  assert.ok(!JSON.stringify(projected).includes("PRIVATE_"), "Only whitelisted event metadata is exported");
  assert.equal(exportEntries([entry("2026-01-02", { selections: { Psalm: "missing-canonical" } })])[0].description,
    "Psalm: Retained alias", "Canonical ID can resolve a retained alias");
  assert.deepEqual(dates(exportEntries([entry("2026-02-02", { note: "Later" }), entry("2026-01-01", { note: "First" }),
    entry("2026-01-01", { note: "Duplicate" }), entry("2026-02-01"), entry("2026-02-01", { note: "Eligible" })])),
    ["2026-01-01", "2026-02-01", "2026-02-02"], "Sorted and deduplicated by date, retaining the first eligible entry");

  const workerSource = fs.readFileSync(path.join(root, "dist/server/index.js"), "utf8");
  assert.ok(!workerSource.includes("/* CALENDAR_EVENTS */"), "Build must inline the shared module");
  let providerCalls = 0;
  const workerContext = vm.createContext({ Request, Response, URL, Headers, console, crypto: require("node:crypto").webcrypto, TextEncoder, Uint8Array, btoa,
    fetch: async () => { providerCalls++; throw Error("Unexpected provider write/request"); } });
  vm.runInContext(workerSource.replace("export default {", "globalThis.worker = {"), workerContext);
  const futureDate = "2099-12-31";
  const stored = { songs: [{ id: "toronto", title: "Gospod usmili se (toronto)", chords: "PRIVATE_CHORDS" }],
    people: [{ name: "PRIVATE_PERSON" }], canva: { token: "PRIVATE_TOKEN" },
    massHistory: [entry(futureDate, { selections: { Vstopna: "toronto" }, private: "PRIVATE_ENTRY" })] };
  const storedJson = JSON.stringify(stored);
  let reads = 0, writes = 0, secretReads = 0, assetReads = 0;
  const env = {
    PARTICIPANTS_IMPORT_JSON: { get: async () => { secretReads++; throw Error("Import must not run"); } },
    SESSION_SECRET: { get: async () => { secretReads++; throw Error("Authentication must not run"); } },
    MEDIA: { get: async (key) => { assert.equal(key, "app-state.json"); reads++;
      return { etag: "fixture", text: async () => storedJson }; },
    put: async () => { writes++; throw Error("Read-only export attempted storage write"); } },
    ASSETS: { fetch: async () => { assetReads++; throw Error("Unexpected asset fallback"); } },
  };
  const request = (method = "GET", extra = {}) => workerContext.worker.fetch(new Request("https://choir.test/api/calendar-events", {
    method, headers: { Origin: "https://rokff-prog.github.io", Cookie: "zborcek_admin=invalid.signature" }, ...extra,
  }), env);
  const response = await request();
  assert.equal(response.status, 200, "ChatGPT can read the public calendar export");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://rokff-prog.github.io");
  assert.equal(response.headers.get("Set-Cookie"), null);
  const body = await response.json();
  assert.equal(body.timezone, "Europe/Ljubljana");
  assert.equal(body.events.length, 1);
  assert.equal(body.events[0].date, futureDate);
  assert.match(body.revision, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(response.headers.get("ETag"), `"calendar-${body.revision}"`);
  assert.ok(!JSON.stringify(body).includes("PRIVATE_"));
  const customState = { ...stored, calendarEvents: [{ id: 'custom', date: futureDate, title: 'Pevske vaje',
    description: 'Javni opis', seriesId: 'PRIVATE_SERIES', private: 'PRIVATE_FIELD' }] };
  const customEnv = { MEDIA: { get: async () => ({ text: async () => JSON.stringify(customState) }) } };
  const customExport = await workerContext.worker.fetch(new Request('https://choir.test/api/calendar-events'), customEnv);
  assert.equal(customExport.status, 200);
  const customBody = await customExport.json();
  assert.equal(customBody.events.length, 1, "One daily summary combines Mass and custom events");
  assert.match(customBody.events[0].title, /Pevske vaje/);
  assert.equal(customBody.events[0].colorId, "6");
  assert.ok(!JSON.stringify(customBody).includes("PRIVATE_"));
  assert.notEqual(customBody.revision, body.revision, "Calendar edits change the fingerprint");
  const privateOnlyEnv = { MEDIA: { get: async () => ({ text: async () => JSON.stringify({ ...stored,
    people: [{ name: "CHANGED_PRIVATE_PERSON" }], canva: { token: "CHANGED_PRIVATE_TOKEN" } }) }) } };
  const privateOnly = await workerContext.worker.fetch(new Request('https://choir.test/api/calendar-events'), privateOnlyEnv);
  assert.equal((await privateOnly.json()).revision, body.revision, "Unrelated private edits do not change the fingerprint");
  const publicResponse = await workerContext.worker.fetch(new Request('https://choir.test/api/public-state'), customEnv);
  const publicState = await publicResponse.json();
  assert.deepEqual(publicState.calendarEvents, [{ id: 'custom', date: futureDate, title: 'Pevske vaje', description: 'Javni opis', colorId: '6' }]);
  assert.equal(publicState.people, undefined);
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) {
    const rejected = await request(method);
    assert.equal(rejected.status, 405);
    assert.equal(rejected.headers.get("Allow"), "GET, OPTIONS");
  }
  assert.equal((await request("OPTIONS")).status, 204);
  assert.equal(reads, 1, "Only GET reads the published state");
  assert.equal((await request("GET", { headers: {} })).status, 200);
  assert.equal((await request("GET", { headers: { "If-None-Match": '"public-fixture"' } })).status, 200);
  const unchanged = await request("GET", { headers: { "If-None-Match": response.headers.get("ETag") } });
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), "");
  assert.equal((await request("GET", { headers: { "If-None-Match": `W/${response.headers.get("ETag")}` } })).status, 304);
  assert.equal(JSON.stringify(stored), storedJson);
  assert.equal(writes + secretReads + assetReads + providerCalls, 0, "No imports, auth, storage writes, assets, or Google requests");
  const missing = await workerContext.worker.fetch(new Request("https://choir.test/api/calendar-events"), {
    MEDIA: { get: async () => null },
  });
  assert.equal(missing.status, 404, "Missing storage is a source failure, not an empty calendar");
  const empty = await workerContext.worker.fetch(new Request("https://choir.test/api/calendar-events"), {
    MEDIA: { get: async () => ({ text: async () => "{}" }) },
  });
  assert.deepEqual((await empty.json()).events, []);
  for (const route of ["config", "connect", "callback", "status", "sync", "disconnect"]) {
    const retired = await workerContext.worker.fetch(new Request(`https://choir.test/api/google-calendar/${route}`), env);
    assert.equal(retired.status, 410);
    assert.equal((await retired.json()).code, "chatgpt_calendar_sync");
  }
  assert.equal(writes + secretReads + assetReads + providerCalls, 0, "Export and retired OAuth routes never write or contact Google");
  console.log("Calendar events: Ljubljana dates/DST, validation, Advent, aliases/covers, additional songs, labels, privacy, pure public export and calendar-only revision/ETag OK.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
