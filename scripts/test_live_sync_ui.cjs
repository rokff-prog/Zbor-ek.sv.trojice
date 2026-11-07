const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const nodes = new Map(), field = (id) => {
  if (!nodes.has(id)) nodes.set(id, { value: "", textContent: "", innerHTML: "", dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, matches() { return false; } });
  return nodes.get(id);
};
const c = vm.createContext({ crypto: require("node:crypto"), console, structuredClone, URL, location: { hostname: "localhost" }, window: {},
  document: { querySelector: field, querySelectorAll: () => [], body: field("body") },
  localStorage: { getItem: () => null, setItem() {} }, setTimeout: () => 1, clearTimeout() {},
});
for (const file of ["song-catalog.js", "song-numbering.js", "state-sync.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), c);
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), c);
const run = (code) => vm.runInContext(code, c);
run(`
  isAdminView = true;
  persist = () => {}; renderAll = () => {}; renderLiveChanges = () => {};
  renderMassCalendar = () => {}; renderUpcomingMasses = () => {}; renderPrint = () => {};
  state.mass = { date: '2026-11-01', note: '', selections: { Vstopna: '', Psalm: '', Obhajilo: 'first' }, additionalSelections: { Obhajilo: ['second'] } };
  state.massHistory = [{ date: '2026-11-01', note: 'Remote note', selections: { Vstopna: 'remote', Psalm: '', Obhajilo: 'first' }, additionalSelections: { Obhajilo: ['second'] }, partLabels: { Vstopna: '' } }];
  state.canvaPages = []; visibleMassMonth = '2026-11';
  const remote = structuredClone(state);
  remote.mass.date = '2026-12-25';
  applyLiveState(remote, false);
`);
assert.equal(run("state.mass.date"), "2026-11-01", "Another editor cannot change the local selected date");
assert.equal(run("state.mass.note"), "Remote note");
assert.equal(run("state.mass.partLabels.Vstopna"), "");
assert.equal(run("visibleMassMonth"), "2026-11");
field("#massDate").value = "2026-11-01";
field("#massNote").value = "My note";
run('autosaveMassFromForm({ target: $("#massNote") })');
assert.equal(run("state.massHistory[0].note"), "My note");
assert.equal(run("state.massHistory[0].selections.Vstopna"), "remote", "Typing a note does not read stale selection fields");
run(`autosaveMassFromForm({ target: { dataset: { massPart: 'Obhajilo', massIndex: '1' }, value: 'new-second' } })`);
assert.equal(run("state.massHistory[0].selections.Obhajilo"), "first");
assert.equal(run("state.massHistory[0].additionalSelections.Obhajilo[0]"), "new-second");
assert.equal(run("state.massHistory[0].note"), "My note");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8"), sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
assert.ok(index.indexOf("state-sync.js?") < index.indexOf("live-sync.js?") && index.indexOf("live-sync.js?") < index.indexOf('src="app.js?'));
assert.match(index, /id="liveSyncStatus"[^>]*role="status"[^>]*aria-live="polite"/);
assert.match(sw, /live-sync\.js\?v=20261025-live-sync/);
assert.match(sw, /url\.pathname\.includes\("\/api\/"\)/);
console.log("Live sync UI: selected date/month preserved, incoming shared day/empty headings applied, Mass note and each Communion field update only themselves, accessible status and versioned modules OK. Browser rendering not exercised.");
