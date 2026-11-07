const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const nodes = new Map();
const makeNode = (key) => {
  if (nodes.has(key)) return nodes.get(key);
  const classes = new Set();
  const node = { value: "", innerHTML: "", textContent: "", open: false, events: {}, dataset: {},
    classList: { add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)), contains: (name) => classes.has(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) },
    addEventListener(name, action) { (this.events[name] ||= []).push(action); },
    dispatch(name, event = {}) { for (const action of this.events[name] || []) action({ target: this, ...event }); },
    showModal() { this.open = true; this.modalCalls = (this.modalCalls || 0) + 1; },
    close() { this.open = false; this.dispatch("close"); },
    focus() { this.focused = true; },
  };
  nodes.set(key, node);
  return node;
};
const opener = makeNode("opener");
opener.dataset.songbookOpen = "page-two";
const body = makeNode("body");
let writes = 0;
const context = vm.createContext({
  crypto, console, structuredClone, URL, Blob, setTimeout, clearTimeout,
  location: { hostname: "localhost" }, window: {}, wireCanvaConnection() {},
  document: { body, querySelector: makeNode, querySelectorAll: (query) => {
    if (query === "[data-songbook-open]") return [opener];
    if (query === "#songbookMassParts input:checked") return [{ value: "Vstopna" }];
    return [];
  } },
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
  renderAll = () => renderSongbook();
  state.songs = [{ id: 'song-two', title: 'Testna pesem', page: 2, inBook: true, categories: [], link: '' }];
  state.canvaPages = [{ id: 'page-two', songId: 'song-two', title: 'Testna pesem', page: 2, canvaDbPage: 2, categories: [], copies: 3 }];
  canvaPageImages.set(2, 'blob:fixture-song-image');
  isAdminView = true;
  wireEvents();
`);
makeNode("#songbook").classList.add("active");
makeNode("#songbookPages").dispatch("click", { target: { closest: (selector) => selector === "[data-songbook-open]" ? opener : null } });
const dialog = makeNode("#songbookDialog");
assert.equal(dialog.open, true);
assert.equal(dialog.modalCalls, 1, "Use a native modal with focus trapping and Escape dismissal");
assert.equal(body.classList.contains("songbook-dialog-open"), true);
assert.match(makeNode("#songbookDialogTitle").textContent, /2 · Testna pesem/);
assert.match(makeNode("#songbookDialogPreview").innerHTML, /blob:fixture-song-image/);
assert.equal(makeNode("#songbookTitle").value, "Testna pesem");
makeNode("#songbookTitle").value = "Spremenjena pesem";
makeNode("#songbookLink").value = "https://example.test/song";
makeNode("#songbookEditor").dispatch("submit", { preventDefault() {} });
assert.equal(writes, 1);
assert.equal(run("state.canvaPages[0].title"), "Spremenjena pesem");
assert.equal(run("state.songs[0].title"), "Spremenjena pesem");
assert.equal(run("state.canvaPages[0].canvaDbPage"), 2, "Page edits must not change the underlying image identity");
assert.equal(run("state.canvaPages[0].copies"), 3);
assert.equal(run("state.songs[0].categories[0]"), "Vstopna");
assert.equal(dialog.open, true, "Saving keeps the song visible");
assert.match(makeNode("#songbookDialogTitle").textContent, /2 · Spremenjena pesem/, "Changing PDF position must not renumber a printed song");
makeNode("#closeSongbookDialog").dispatch("click");
assert.equal(dialog.open, false);
assert.equal(run("selectedSongbookPageId"), null);
assert.equal(body.classList.contains("songbook-dialog-open"), false);
assert.equal(opener.focused, true);
assert.equal(makeNode("#songbookDialogPreview").innerHTML, "");
run("openSongbookDialog('page-two')");
dialog.dispatch("click", { target: makeNode("#songbookDialogPreview") });
assert.equal(dialog.open, true, "Clicks within the preview must not close the modal");
dialog.dispatch("click");
assert.equal(dialog.open, false, "Backdrop click closes the modal");
run("isAdminView = false; openSongbookDialog('page-two')");
assert.equal(dialog.classList.contains("readonly"), true);
makeNode("#songbookEditor").dispatch("submit", { preventDefault() {} });
assert.equal(writes, 1, "Public readers cannot save settings");
dialog.close();
run("openSongbookDialog('missing-id')");
assert.equal(dialog.open, false);
run("state.canvaPages = []; isAdminView = true; openSongbookDialog('song-two')");
assert.equal(dialog.open, true, "Legacy songbook entries also open");
dialog.close();
run("openSongbookDialog('song-two'); setView('calendar')");
assert.equal(dialog.open, false, "Changing views releases the modal and scroll lock");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.doesNotMatch(html, /downloadSongbookPageForUsb|usb-page-hint/, "Song settings must not include the removed USB download controls");
assert.doesNotMatch(html, /songbookPageNumber/, "PDF source positions are not editable song settings");
assert.match(html, /id="songbookPrintNumber"/);
assert.match(html, /id="deleteSongbookPage"/);
assert.equal((html.match(/id="songbookEditor"/g) || []).length, 1);
assert.match(html, /<dialog id="songbookDialog"[^>]+aria-labelledby="songbookDialogTitle"/);
assert.match(html, /id="closeSongbookDialog"[^>]+aria-label="Zapri pesem"/);
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
assert.match(css, /\.songbook-dialog-body\s*\{[^}]+grid-template-columns: minmax\(0, 1fr\) 320px/s);
assert.match(css, /@media \(max-width: 860px\)[\s\S]+\.songbook-dialog-body\s*\{[^}]+grid-template-columns: minmax\(0, 1fr\)/);
assert.doesNotMatch(css, /\.songbook-card\.active/);
console.log("Songbook modal: open/preview/settings/save, close/focus/scroll cleanup, backdrop, public permissions, legacy entries, responsive layout rules and accessible markup OK. Browser rendering not exercised.");
