const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const nodes = new Map();
let writes = 0;
const node = (id) => {
  if (!nodes.has(id)) {
    const classes = new Set();
    nodes.set(id, { value: "", innerHTML: "", textContent: "", open: false, events: {},
      classList: { add: (...names) => names.forEach((name) => classes.add(name)), remove: (...names) => names.forEach((name) => classes.delete(name)),
        toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name), contains: (name) => classes.has(name) },
      addEventListener(name, action) { (this.events[name] ||= []).push(action); },
      dispatch(name, event = {}) { for (const action of this.events[name] || []) action({ target: this, currentTarget: this, ...event }); },
      focus() { this.focused = true; }, showModal() { this.open = true; }, close() { this.open = false; this.dispatch("close"); },
    });
  }
  return nodes.get(id);
};
const context = vm.createContext({
  crypto, console, structuredClone, URL, Blob, setTimeout, clearTimeout,
  location: { hostname: "localhost" }, window: {}, wireCanvaConnection() {},
  document: { body: node("body"), querySelector: node, querySelectorAll: (query) => {
    if (query === "#songbookMassParts input:checked") return [{ value: "Darovanje" }, { value: "Postne" }];
    if (query === "#songCategories input:checked") return [{ value: "Obhajilo" }];
    return [];
  } },
  localStorage: { getItem: () => null, setItem() {} }, recordWrite: () => writes++,
});
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
for (const file of ["song-catalog.js", "song-numbering.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), context);
const run = (code) => vm.runInContext(code, context);
run(`
  wireMobileTabSwipe = () => {};
  persist = () => { ensurePermanentSongNumbers(state); recordWrite(); };
  isAdminView = true;
  state.songs = [
    { id: 'a', title: 'Prva', categories: ['Vstopna'], lyrics: 'Prva pesem' },
    { id: 'b', title: 'Druga', categories: ['Obhajilo'], lyrics: 'Druga pesem', link: '' },
    { id: 'b-alias', title: 'Druga', categories: ['Obhajilo'], libraryCanonicalId: 'b' },
    { id: 'text-only', title: 'Samo besedilo', lyrics: 'Vse vrstice besedila', categories: [] },
  ];
  state.canvaPages = [
    { id: 'page-a', page: 2, canvaDbPage: 2, songId: 'a', title: 'Prva', categories: ['Vstopna'] },
    { id: 'page-b', page: 5, canvaDbPage: 5, songId: 'b', title: 'Druga', categories: ['Obhajilo'] },
    { id: 'page-b2', page: 6, canvaDbPage: 6, songId: 'b-alias', title: 'Druga', categories: ['Obhajilo'] },
  ];
  canvaPageImages.set(2, 'blob:prva'); canvaPageImages.set(5, 'blob:druga'); canvaPageImages.set(6, 'blob:druga-nadaljevanje');
  selectedSongId = 'a';
  wireEvents();
`);
node("#songs").classList.add("active");
node("#songList").dispatch("click", { target: { closest: () => ({ dataset: { songId: "b" } }) } });
assert.equal(node("#songbookDialog").open, true);
assert.equal(run("selectedSongbookPageId"), "page-b", "Click opens the clicked song, not the first song/PDF page");
assert.match(node("#songbookDialogPreview").innerHTML, /blob:druga/);
assert.doesNotMatch(node("#songbookDialogPreview").innerHTML, /blob:prva/);
node("#songbookSearch").value = "does-not-match";
node("#songbookTitle").value = "Druga, novo ime";
node("#songbookLink").value = "https://example.test/song";
node("#songbookPageNumber").value = "5";
node("#songbookKnown").checked = true;
node("#songbookLyrics").value = "Novo skupno besedilo";
node("#songbookEditor").dispatch("submit", { preventDefault() {} });
assert.equal(writes, 1);
for (const id of ["b", "b-alias"]) {
  assert.equal(run(`songById('${id}').title`), "Druga, novo ime");
  assert.equal(run(`songById('${id}').categories.join(',')`), "Darovanje,Postne");
  assert.equal(run(`songById('${id}').lyrics`), "Novo skupno besedilo");
}
assert.equal(run("state.canvaPages.filter((page) => page.songId === 'b').length"), 2);
assert.equal(run("state.canvaPages[1].title"), "Druga, novo ime");
assert.equal(run("state.canvaPages[2].categories.join(',')"), "Darovanje,Postne");
assert.equal(run("state.canvaPages[1].printNumber"), 5);
assert.equal(run("state.canvaPages[2].printNumber"), 6);
assert.equal(run("state.canvaPages[1].canvaDbPage"), 5);
assert.equal(run("songById('a').title"), "Prva");
assert.equal(node("#songbookDialog").open, true, "Songbook filters cannot close a song opened from the library");
run("state = JSON.parse(JSON.stringify(state)); state.canvaPages[1].metadataVersion = ''; repairSongbookMetadata()");
assert.equal(run("state.canvaPages[1].title"), "Druga, novo ime", "Reviewed defaults cannot undo user settings after reload");
node("#songbookDialog").close();
run("openSongbookDialog('page-b')");
assert.equal(node("#songbookTitle").value, "Druga, novo ime", "Songbook opens the same saved database record");
node("#songbookDialog").close();
run("openLibrarySong('text-only')");
assert.match(node("#songbookDialogPreview").innerHTML, /Vse vrstice besedila/);
assert.equal(node("#songbookPrintNumber").disabled, true);
assert.equal(run("state.canvaPages.length"), 3, "Non-PDF songs must never create fake PDF pages");
node("#songbookDialog").close();
node("#songSearch").value = "Prva";
node("#songStatusFilter").value = "inBook";
node("#newSong").dispatch("click");
assert.equal(node("#newSongDialog").open, true);
assert.equal(node("#songTitle").value, "");
assert.equal(run("state.songs.length"), 4, "Opening a blank form does not save a placeholder song");
node("#closeNewSongDialog").dispatch("click");
assert.equal(run("state.songs.length"), 4);
assert.equal(writes, 1);
assert.equal(node("body").classList.contains("new-song-dialog-open"), false);
node("#newSong").dispatch("click");
node("#songTitle").value = "Moja nova pesem";
node("#songLink").value = "https://example.test/new";
node("#songLyrics").value = "Novo besedilo";
node("#songForm").dispatch("submit", { preventDefault() {} });
assert.equal(run("state.songs.length"), 5);
assert.equal(run("songById(selectedSongId).title"), "Moja nova pesem");
assert.equal(run("songById(selectedSongId).categories[0]"), "Obhajilo");
assert.equal(run("state.canvaPages.length"), 3);
assert.equal(node("#newSongDialog").open, false);
assert.equal(node("#songbookDialog").open, true);
assert.equal(node("#songSearch").value, "");
assert.equal(node("#songStatusFilter").value, "");
node("#songForm").dispatch("submit", { preventDefault() {} });
assert.equal(run("state.songs.length"), 5, "Repeated submission cannot create another song after the form closes");
assert.equal(run("songById('a').lyrics"), "Prva pesem");
node("#songbookDialog").close();
run("isAdminView = false");
node("#newSong").dispatch("click");
assert.equal(node("#newSongDialog").open, false);
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.doesNotMatch(html, /id="(?:songPage|songbookPermanentNumber)"/, "Song settings and add form must not contain a song-number field");
assert.doesNotMatch(source, /#(?:songPage|songbookPermanentNumber)\b/, "Removed fields must not be accessed during rendering");
assert.match(html, /<dialog id="newSongDialog"[\s\S]*?<form id="songForm"[\s\S]*?<button id="addSongFromForm"[^>]*type="submit"/);
assert.ok(html.indexOf('<dialog id="songbookDialog"') > html.indexOf('<article id="songbookPrint"'), "Shared modal must be outside the inactive songbook view");
console.log("Songs: exact clicked PDF/text song in shared modal, one saved metadata record, aliases/multi-page sync, no renumbering, reload persistence, blank add-only form, cancel/no duplicates and public access checks OK. Browser rendering not exercised.");
