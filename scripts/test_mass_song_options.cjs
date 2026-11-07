const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const nodes = new Map(), selects = new Map();
const node = (id) => {
  if (!nodes.has(id)) nodes.set(id, { value: "", textContent: "", innerHTML: "", classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } });
  return nodes.get(id);
};
const context = vm.createContext({ crypto: require("node:crypto"), console, structuredClone, URL,
  location: { hostname: "localhost" }, window: {}, setTimeout: () => 1, clearTimeout() {},
  localStorage: { getItem: () => null, setItem() {} },
  document: { body: node("body"), querySelector: node, querySelectorAll(query) {
    const match = query.match(/^\[data-mass-part="(.+)"\]$/);
    return match ? selects.get(match[1]) || [] : [];
  } },
});
for (const file of ["song-catalog.js", "song-numbering.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), context);
const run = (code) => vm.runInContext(code, context);
run(`
  isAdminView = true; persist = () => {}; renderUpcomingMasses = () => {}; renderCalendar = () => {}; renderPrint = () => {};
  massSongNumber = song => String(song.printNumber || '');
  state.songs = [
    { id: 'entrance', title: 'Entrance', printNumber: 9, categories: ['Vstopna'] },
    { id: 'communion', title: 'Communion', printNumber: 3, categories: ['Obhajilo'] },
    { id: 'uncategorized', title: 'No category', printNumber: 12, categories: [] },
    { id: 'outside', title: 'Without songbook page', categories: ['Zaključek'] },
    { id: 'cover', title: 'Cover', isCover: true, printNumber: 1, categories: ['Vstopna'] },
  ];
  state.massHistory = [];
  state.mass = { date: '2099-10-03', note: '', selections: { Vstopna: 'entrance', Obhajilo: 'communion' }, additionalSelections: { Obhajilo: ['outside'] }, partLabels: {} };
`);
const ids = (html) => [...html.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);
const all = ['communion', 'entrance', 'uncategorized', 'outside'];
assert.deepEqual(ids(run('massSongOptions("Vstopna", "entrance")')), ['entrance']);
const slot = { value: 'entrance', dataset: { massIndex: '0' }, innerHTML: '' };
selects.set('Vstopna', [slot]);
run('saveMassPartLabel("Vstopna", "Custom heading", "2099-10-03")');
assert.deepEqual(ids(slot.innerHTML), all, "Options expand immediately on heading save");
assert.equal(slot.value, 'entrance');
assert.match(slot.innerHTML, /value="entrance" selected/);
run('saveMassPartLabel("Vstopna", "", "2099-10-03")');
assert.deepEqual(ids(slot.innerHTML), all, "An explicitly empty heading also shows all songs");
run('state.mass.selections.Vstopna = "communion"; saveMassPartLabel("Vstopna", "Vstopna", "2099-10-03")');
assert.deepEqual(ids(slot.innerHTML), ['communion', 'entrance'], "Restoring the default filters again but retains an already selected song");
assert.equal(slot.value, 'communion');
run('state.mass.selections.Vstopna = "entrance"; saveMassPartLabel("Vstopna", "  VSTOPNA  ", "2099-10-03")');
assert.deepEqual(ids(slot.innerHTML), ['entrance'], "Case/outer whitespace alone does not rename a part");
const communion = [0, 1].map((index) => ({ dataset: { massIndex: String(index) }, innerHTML: '', value: '' }));
selects.set('Obhajilo', communion);
run('saveMassPartLabel("Obhajilo", "Special songs", "2099-10-03")');
for (const select of communion) assert.deepEqual(ids(select.innerHTML), all);
assert.equal(communion[0].value, 'communion'); assert.equal(communion[1].value, 'outside');
run('state.mass = { date: "2099-10-04", selections: {}, additionalSelections: {}, partLabels: {} }');
assert.deepEqual(ids(run('massSongOptions("Vstopna", "")')), ['entrance'], "Renaming is isolated to its day");
run('state.mass = structuredClone(state.massHistory.find(item => item.date === "2099-10-03"))');
assert.deepEqual(ids(run('massSongOptions("Obhajilo", "communion")')), all, "The expanded list survives dated history reload");
const disabled = { dataset: { massIndex: '0' }, disabled: true, innerHTML: 'disabled-options' };
selects.set('Slava', [disabled]);
run('refreshMassPartSongOptions("Slava")');
assert.equal(disabled.innerHTML, 'disabled-options', "The existing disabled Advent Gloria is not replaced");
assert.equal(run('state.songs[0].categories.join(",")'), 'Vstopna');
assert.equal(run('state.songs[0].printNumber'), 9);
console.log('Mass song choices: renamed/empty parts show all songs, immediate option refresh, ordinary/restored names keep category filtering, selections/both Communion fields/date isolation/order/numbers and Advent disablement preserved OK. Browser UI not exercised.');
