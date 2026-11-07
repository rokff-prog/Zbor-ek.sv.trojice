const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const nodes = new Map(), classes = new Set();
const node = (id) => {
  if (!nodes.has(id)) nodes.set(id, { value: "", textContent: "", innerHTML: "", events: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(name, action) { (this.events[name] ||= []).push(action); },
    close() { this.closed = true; }, showModal() { this.open = true; },
  });
  return nodes.get(id);
};
const makePage = (width, height) => {
  const viewport = { clientWidth: 650, clientHeight: 950 };
  const content = { style: {} };
  const body = { offsetTop: 100, style: { fontSize: "12pt" },
    get scrollHeight() { return Math.ceil(height * parseFloat(this.style.fontSize) / 12); },
    querySelectorAll: () => columns };
  const columns = [0, 1].map(() => ({ clientWidth: 310,
    get scrollWidth() { return Math.max(this.clientWidth, width * parseFloat(body.style.fontSize) / 12); } }));
  return { viewport, content, body, columns, querySelector: (selector) =>
    selector.includes("viewport") ? viewport : selector.includes("body") ? body : content };
};
const pages = [makePage(200, 700), makePage(250, 2400), makePage(1400, 500)];
let printCalls = 0;
const context = vm.createContext({
  crypto, console, structuredClone, URL, Blob, setTimeout, clearTimeout,
  location: { hostname: "localhost" }, window: {}, wireCanvaConnection() {},
  document: { body: { classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) } },
    querySelector: node, querySelectorAll: (selector) => selector === "#chordPrint .chord-print-page" ? pages : [] },
  localStorage: { getItem: () => null, setItem() {} },
});
const run = (code) => vm.runInContext(code, context);
for (const file of ["song-catalog.js", "song-numbering.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), context);
assert.equal(run(`matchPreviousCanvaPage('On nosi cel svet', 'second-image',
  [{ page: 5, title: 'On nosi cel svet', numberKey: 'print:5' }, { page: 6, title: 'On nosi cel svet', numberKey: 'print:6' }],
  new Map([[5, 'first-image'], [6, 'second-image']]), new Set()).numberKey`), 'print:6',
  'Reordered pages with duplicate titles keep the identity of their actual image');
context.recordPrint = () => printCalls++;
run(`
  wireMobileTabSwipe = () => {};
  printInMode = (mode, orientation) => { if (mode !== 'printing-chords' || orientation !== 'portrait') throw Error('wrong print mode'); recordPrint(); };
  state.songs = [{ id: 'ko', title: 'Ko Jezus je začel učiti', inlineChords: '[C]Prva vrstica\\n\\n' + Array(1005).fill('[G]Dolga vrstica').join('\\n') + '\\n[D]ZADNJA VRSTICA', categories: [] }];
  state.canvaPages = [{ page: 31, title: state.songs[0].title, songId: 'ko' }];
  selectedChordSongId = 'ko';
  wireEvents();
`);
assert.equal(run("printChordSongs(state.songs)"), true);
assert.equal(printCalls, 1);
assert.equal(node("#chordPrintDialog").closed, true);
assert.equal(pages[0].body.style.fontSize, "12pt", "Two-column songs that fit keep their normal type size");
for (const { viewport, content, body, columns } of pages) {
  assert.equal(content.style.width, `${viewport.clientWidth}px`);
  assert.ok(columns.every((column) => column.scrollWidth <= column.clientWidth + 0.01), "Neither column may overlap its neighbor");
  assert.ok(body.scrollHeight <= viewport.clientHeight - body.offsetTop - 2);
}
assert.equal(classes.has("measuring-chords"), false);
assert.match(node("#chordPrint").innerHTML, /ZADNJA(?:&nbsp;| )VRSTICA/, "Printing never truncates at 999 lines");
assert.match(node("#chordPrint").innerHTML, /print-song-number">31</);
run("fitChordPrint()");
assert.ok(parseFloat(pages[1].body.style.fontSize) < 12, "Exceptional overflow is reflowed without zoom or transforms");
run(`renderChordPrint([window.ZBORCEK_SONG_CATALOG.chordCorrections.find((song) => song.title === 'Poglej to lučko')])`);
const fullSong = node("#chordPrint").innerHTML;
assert.match(fullSong, /Poglej to lučko/);
assert.match(fullSong, /Bog(?:&nbsp;| )je(?:&nbsp;| )dal/);
assert.match(fullSong, /hvala\./, "The final chorus must be included in print output");
assert.equal((fullSong.match(/class="chord-print-page"/g) || []).length, 1);
const songColumns = fullSong.split('<div class="chord-print-column">');
assert.equal(songColumns.length, 3);
assert.match(songColumns[1], /Poglej(?:&nbsp;| )to(?:&nbsp;| )lučko/);
assert.match(songColumns[2], /hvala\./, "The ending continues in the right column, not below the paper");
for (const count of [1, 2, 19, 1200]) {
  const lines = Array.from({ length: count }, (_, index) => [{ text: String(index) }]);
  const split = run(`splitChordPrintLines(${JSON.stringify(lines)})`);
  assert.equal(JSON.stringify(split.flat()), JSON.stringify(lines), "Every line stays in order, with no omission or duplication");
  assert.equal(split[1].length, 0, "A verse without separators must never be split in the middle");
}
const verses = run("splitChordPrintLines([[1],[2],[],[3],[4],[],[5],[6]])");
assert.ok(!verses[0].at(-1).length || !verses[1][0].length, "Always move a whole verse to the next column");
const unevenVerses = run("splitChordPrintLines([[1],[],...Array(40).fill([2]),[],[3]])");
assert.ok(!unevenVerses[0].at(-1).length || !unevenVerses[1][0].length, "Even a very long verse must stay intact");
run(`renderChordPrint([window.ZBORCEK_SONG_CATALOG.chordCorrections.find((song) => song.title === 'Pridi, sveti Miklavž')])`);
assert.equal((node("#chordPrint").innerHTML.match(/class="chord-print-page"/g) || []).length, 1, "Miklavz also stays on one sheet");
assert.equal((node("#chordPrint").innerHTML.match(/class="chord-print-column"/g) || []).length, 2);
assert.equal((node("#chordPrint").innerHTML.match(/\(2x\)/g) || []).length, 3, "Every full refrain is retained");
pages[0].viewport.clientWidth = 0;
assert.equal(run("printChordSongs(state.songs)"), false);
assert.equal(printCalls, 1, "Never print unmeasurable, potentially clipped content");
assert.equal(classes.has("measuring-chords"), false);
run("renderChordEditor()");
assert.equal(node("#chordPermanentNumber").value, "31");
assert.match(node("#chordEditorDialogTitle").textContent, /^31 · /);
node("#chordPages").events.click[0]({ target: { closest: () => ({ dataset: { chordOpen: 'ko' } }) } });
assert.equal(node("#chordEditorDialog").open, true);
assert.ok(classes.has('chord-dialog-open'));
node("#chordEditorDialog").events.close[0]();
assert.equal(classes.has('chord-dialog-open'), false);
assert.equal(run('selectedChordSongId'), null);
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const printContentCss = css.match(/\.chord-print-content\s*\{([^}]+)\}/)[1];
assert.doesNotMatch(printContentCss, /zoom:|transform:/, "Column layout must not use visual scaling");
assert.match(css, /\.chord-print-body\s*\{[^}]+grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]+gap: 8mm/s);
assert.match(css, /body\.printing-chords \.app\s*\{[^}]+overflow: visible;[^}]+perspective: none/s, "Mobile swipe clipping must not apply to print");
assert.match(css, /\.chord-print-page \.inline-chord-line\s*\{[^}]+max-width: none;[^}]+overflow: visible;/s);
assert.match(css, /\.chord-editor-body\s*\{[^}]+grid-template-columns: minmax\(0, 1fr\) 320px/s);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(html, /inlineChordEditor[^>]+chord-editor-preview/);
assert.match(html, /class="chord-editor-settings"/);
console.log("Chord print: two columns in reading order, preferred verse boundaries, complete final chorus, readable default size, overflow reflow without zoom, one A4 page and unchanged numbers OK. Browser rendering/physical print not exercised.");
