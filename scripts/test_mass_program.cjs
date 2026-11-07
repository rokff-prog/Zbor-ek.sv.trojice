const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const nodes = new Map(), selections = new Map(), windowEvents = new Map();
let printed = 0, writes = 0, fontSize = 10, measuredHeight = 300;
const node = (id) => {
  if (nodes.has(id)) return nodes.get(id);
  const classes = new Set();
  const item = { value: "", textContent: "", innerHTML: "", events: {},
    classList: { add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name), contains: (name) => classes.has(name) },
    style: { setProperty: (name, value) => { if (name === "--program-font-size") fontSize = parseFloat(value); } },
    addEventListener(name, action) { (this.events[name] ||= []).push(action); },
    dispatch(name, event = {}) { for (const action of this.events[name] || []) action({ target: this, ...event }); },
    remove() { this.removed = true; },
  };
  nodes.set(id, item);
  return item;
};
const copy = { clientHeight: 500, get scrollHeight() { return measuredHeight * fontSize / 10; } };
const context = vm.createContext({
  crypto, console, structuredClone, URL, Blob, location: { hostname: "localhost" },
  setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: (action) => action(), wireCanvaConnection() {},
  window: { print: () => printed++, matchMedia: () => ({ addEventListener() {}, removeEventListener() {} }),
    addEventListener: (name, action) => windowEvents.set(name, action), removeEventListener: (name) => windowEvents.delete(name) },
  document: { body: node("body"), head: { append: (item) => nodes.set("#" + item.id, item) },
    querySelector: node, querySelectorAll: (query) => {
      if (query === "#massProgramPrint .mass-program-copy") return [copy, copy, copy];
      const match = query.match(/^\[data-mass-part="(.+)"\]$/);
      return match ? (selections.get(match[1]) || []).map((value) => ({ value })) : [];
    }, createElement: () => ({ remove() { this.removed = true; } }) },
  localStorage: { getItem: () => null, setItem() {} },
});
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
vm.runInContext(fs.readFileSync(path.join(root, "song-catalog.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "song-numbering.js"), "utf8"), context);
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), context);
const run = (code) => vm.runInContext(code, context);
context.recordWrite = () => writes++;
run(`
  wireMobileTabSwipe = () => {};
  persist = () => recordWrite();
  isAdminView = true;
  state.songs = [
    { id: 'first', title: 'Pesem <ena>', songNumber: 95, categories: ['Vstopna'] },
    { id: 'second', title: 'Pesem dva', songNumber: 96, categories: ['Obhajilo'] },
    { id: 'cover', title: 'Naslovnica', isCover: true },
  ];
  state.canvaPages = [{ id: 'page', songId: 'first', title: 'Pesem <ena>', page: 7 }];
  state.massHistory = [];
  state.mass = { date: '2026-10-03', note: '', selections: {}, additionalSelections: {} };
  visibleMassMonth = '2026-10';
  wireEvents();
`);
node("#massDate").value = "2026-10-03";
node("#massNote").value = "Družinska maša <opomba>";
selections.set("Vstopna", ["first"]);
selections.set("Obhajilo", ["second", "first"]);
node("#printMassProgram").dispatch("click");
assert.equal(printed, 1);
assert.equal(node("body").classList.contains("printing-mass-program"), true);
assert.match(node("#print-orientation-override").textContent, /A4 landscape/);
const html = node("#massProgramPrint").innerHTML;
assert.equal((html.match(/class="mass-program-copy"/g) || []).length, 3);
assert.equal((html.match(/class="mass-program-note"/g) || []).length, 3);
assert.equal((html.match(/<th scope="row">Obhajilo/g) || []).length, 6, "Additional songs retain their mass part");
assert.match(html, /<td>7<\/td><td>Pesem &lt;ena&gt;/, "Numbers follow the actual songbook, not stale catalog numbering");
assert.match(html, /<td>–<\/td><td>Pesem dva/, "Songs outside the PDF must not display stale spreadsheet numbers");
assert.ok(html.indexOf("mass-program-note") < html.indexOf("mass-program-table"));
assert.ok(!html.includes("<opomba>") && !html.includes("<ena>"));
assert.equal(run("state.massHistory[0].editedByUser"), true);
windowEvents.get("afterprint")();
assert.equal(node("body").classList.contains("printing-mass-program"), false);
assert.equal(node("#print-orientation-override").removed, true);
const calendarClass = () => node("#massCalendar").innerHTML.match(/class="([^"]+)"[^>]+data-mass-date="2026-10-03"/)[1];
assert.match(calendarClass(), /has-mass/);
selections.clear();
node("#massSlots").dispatch("change", { target: { matches: () => true } });
assert.doesNotMatch(calendarClass(), /has-mass/, "Removing the final song clears the orange date");
assert.equal(run("hasMassSongs(state.massHistory[0])"), false);
run("renderMass()");
assert.equal(run("massProgramRows().length"), 0, "Rendering must not resurrect cleared selections");
assert.equal(run("hasMassSongs({ selections: { Vstopna: 'deleted-id' } })"), false);
assert.equal(run("hasMassSongs({ selections: { Vstopna: 'cover' } })"), false);
assert.equal(run("hasMassSongs({ additionalSelections: { Obhajilo: ['second'] } })"), true);
node("#printMassProgram").dispatch("click");
assert.equal(printed, 1, "An empty plan does not open the print dialog");
assert.match(node("#massProgramStatus").textContent, /vsaj eno pesem/);
selections.set("Vstopna", ["first"]);
node("#massNote").value = " ";
run("autosaveMassFromForm(); renderMassProgramPrint()");
assert.doesNotMatch(node("#massProgramPrint").innerHTML, /class="mass-program-note"/);
measuredHeight = 600;
assert.equal(run("fitMassProgramPrint()"), true);
assert.ok(fontSize < 10 && fontSize >= 7, "Longer programs fit without clipping");
assert.equal(node("body").classList.contains("measuring-mass-program"), false);
measuredHeight = 2000;
node("#printMassProgram").dispatch("click");
assert.equal(printed, 1, "Oversize content is rejected instead of silently cut off");
assert.match(node("#massProgramStatus").textContent, /predolg/);
run(`
  state.mass.date = seedData.massHistory[0].date;
  state.mass.selections = {};
  state.mass.additionalSelections = {};
  saveMassToHistory();
  migrateState();
`);
assert.equal(run("hasMassSongs(state.massHistory.find((entry) => entry.date === state.mass.date))"), false,
  "Startup migrations must respect an explicitly emptied imported date");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
run(`state.massHistory = [
  { date: '2026-11-01', note: 'Kasneje', selections: {} },
  { date: '2026-10-16', note: 'Preteklo', selections: {} },
  { date: '2026-10-17', note: 'Danes', selections: {} },
  { date: '2026-10-18', note: 'Jutri', selections: {} },
  { date: '2026-10-19', note: '', selections: {} },
];`);
assert.equal(JSON.stringify(run("upcomingMassEvents(new Date('2026-10-16T22:30:00Z')).map((event) => event.date)")),
  JSON.stringify(['2026-10-17', '2026-10-18', '2026-11-01']), "Upcoming list uses Ljubljana's date, includes today, excludes blank plans and sorts nearest first");
assert.equal(run("calendarEventsFromMassHistory().length"), 5, "Past plans remain available for history and calendar export");
for (const [year, startDate] of [[2022, '2022-11-27'], [2023, '2023-12-03'], [2024, '2024-12-01'], [2025, '2025-11-30'], [2026, '2026-11-29'], [2027, '2027-11-28']]) {
  const before = new Date(startDate + 'T12:00:00Z');
  before.setUTCDate(before.getUTCDate() - 1);
  assert.equal(run(`isAdventDate('${before.toISOString().slice(0, 10)}')`), false);
  assert.equal(run(`isAdventDate('${startDate}')`), true);
  assert.equal(run(`isAdventDate('${year}-12-24')`), true);
  assert.equal(run(`isAdventDate('${year}-12-25')`), false);
}
for (const value of ['', 'invalid', '2026-11-31', '2026-02-29']) assert.equal(run(`isAdventDate('${value}')`), false);
run(`state.songs.push({ id: 'gloria', title: 'Slava testna', categories: ['Slava'] });
  state.mass = { date: '2026-11-29', note: '', selections: { Slava: 'gloria', Obhajilo: 'second' }, additionalSelections: { Slava: ['first'], Obhajilo: ['first'] } };
  visibleMassMonth = '2026-11'; renderMass();`);
const slotMarkup = (part) => node("#massSlots").innerHTML.split(`<h3>${part}</h3>`)[1].split('</div>')[0];
assert.match(slotMarkup('Slava'), /<select[^>]+disabled>/);
assert.match(slotMarkup('Slava'), /V adventu se ne poje/);
assert.doesNotMatch(slotMarkup('Slava'), /value="gloria"/);
assert.equal((slotMarkup('Obhajilo').match(/<select /g) || []).length, 2);
assert.equal(run("state.mass.selections.Slava"), 'gloria', 'Viewing history must not erase previously saved choices');
assert.equal(run("massProgramRows().some((row) => row.part === 'Slava')"), false);
run("renderMassProgramPrint(); renderPrint(); state.massHistory = [structuredClone(state.mass)]");
assert.doesNotMatch(node('#massProgramPrint').innerHTML, /Slava testna/);
assert.doesNotMatch(run("calendarEventsFromMassHistory()[0].description"), /Slava/);
assert.equal(run("massProgramRows().filter((row) => row.part === 'Obhajilo').map((row) => row.song.id).join(',')"), 'second,first');
assert.equal(run("hasMassSongs({ date: '2026-12-06', selections: { Slava: 'gloria' } })"), false);
selections.clear();
selections.set('Slava', ['gloria']);
selections.set('Obhajilo', ['', 'second']);
node('#massDate').value = '2026-11-29';
node('#massNote').value = '';
run('autosaveMassFromForm(); renderMass()');
assert.equal(run("state.mass.selections.Slava"), '');
assert.equal(run("state.mass.additionalSelections.Slava.length"), 0);
assert.equal(run("state.mass.selections.Obhajilo"), '');
assert.equal(run("state.mass.additionalSelections.Obhajilo[0]"), 'second', 'The second communion field keeps its position when the first is empty');
assert.match(slotMarkup('Obhajilo'), /data-mass-index="1"[^>]*>[\s\S]*value="second" selected/);
assert.equal(run("state.massHistory[0].additionalSelections.Obhajilo[0]"), 'second');
run("loadMassFromHistory('2026-11-29')");
assert.equal(run("massProgramRows().length"), 1);
assert.equal((slotMarkup('Obhajilo').match(/<select /g) || []).length, 2);
run("state.mass.date = '2026-12-25'; renderMass()");
assert.doesNotMatch(slotMarkup('Slava'), /disabled/);
assert.match(slotMarkup('Slava'), /value="gloria"/);
run("state.mass.additionalSelections.Obhajilo = ['second', 'first']; renderMass()");
assert.equal((slotMarkup('Obhajilo').match(/<select /g) || []).length, 3, 'Legacy plans with more communion songs must not be truncated');
assert.match(css, /\.mass-program-sheet\s*\{[^}]+repeat\(3, minmax\(0, 1fr\)\)[^}]+gap: 8mm[^}]+width: 296mm[^}]+height: 209mm/s);
assert.match(css, /body\.printing-mass-program #print\.view\s*\{\s*display: none !important/);
assert.match(css, /\.calendar-day\s*\{[^}]+background: white/s);
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.equal((index.match(/id="massNote"/g) || []).length, 1);
assert.ok(index.indexOf('id="massCalendar"') < index.indexOf('id="massNote"')
  && index.indexOf('id="massNote"') < index.indexOf('id="massSlots"'), "The note belongs below the small calendar and above the songs");
console.log("Mass program: three landscape copies with spacing, notes, songbook numbers, additional songs, escaped text, fit/overflow handling and print cleanup OK. Empty/deleted-song dates stay white, clearing persists across migration. Browser/physical print not exercised.");
