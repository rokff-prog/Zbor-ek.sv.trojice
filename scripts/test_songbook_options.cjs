const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const nodes = new Map(), documentEvents = new Map();
const node = (id) => {
  if (!nodes.has(id)) nodes.set(id, { value: "", open: false, events: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener(name, action) { (this.events[name] ||= []).push(action); },
    async dispatch(name, event = {}) { for (const action of this.events[name] || []) await action({ target: this, ...event }); },
    querySelector: (selector) => node(id + " " + selector),
    contains: (target) => target === node(id),
    focus() { this.focused = true; }, click() { this.clicks = (this.clicks || 0) + 1; },
  });
  return nodes.get(id);
};
const context = vm.createContext({
  crypto, console, structuredClone, URL, Blob, setTimeout, clearTimeout,
  location: { hostname: "localhost" }, window: {}, wireCanvaConnection() {},
  document: { querySelector: node, querySelectorAll: () => [], addEventListener: (name, action) => documentEvents.set(name, action) },
  localStorage: { getItem: () => null, setItem() {} },
});
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
vm.runInContext(fs.readFileSync(path.join(root, "song-catalog.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "song-numbering.js"), "utf8"), context);
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), context);
const run = (code) => vm.runInContext(code, context);
let imports = 0, publishes = 0, updates = 0, syncs = 0;
context.recordImport = (file) => { assert.equal(file.name, "songbook.pdf"); imports++; };
context.recordSave = (options) => { assert.equal(options.download, false); publishes++; };
context.recordUpdate = () => updates++;
context.recordSync = () => syncs++;
run(`wireMobileTabSwipe = () => {}; setView = () => {};
  importCanvaPdf = recordImport; saveSongbookToSongs = recordSave;
  updatePresentationProgram = recordUpdate; syncCanvaSongbook = recordSync;
  wireEvents();`);
async function main() {
  const options = node("#songbookOptions");
  options.open = true;
  await options.dispatch("click", { target: { closest: () => ({}) } });
  assert.equal(options.open, false);
  options.open = true;
  await options.dispatch("keydown", { key: "Escape", preventDefault() {} });
  assert.equal(options.open, false);
  assert.equal(node("#songbookOptions summary").focused, true);
  options.open = true;
  documentEvents.get("click")({ target: node("outside") });
  assert.equal(options.open, false);
  await node("#songbookManualImport").dispatch("click");
  assert.equal(node("#importCanvaPdf").clicks, 1);
  const input = node("#importCanvaPdf");
  input.files = [{ name: "songbook.pdf" }]; input.value = "songbook.pdf";
  await input.dispatch("change");
  assert.equal(imports, 1); assert.equal(input.value, "", "Same PDF can be chosen again");
  input.files = [];
  await input.dispatch("change");
  assert.equal(imports, 1);
  await node("#saveSongbookToSongs").dispatch("click");
  await node("#updatePresentation").dispatch("click");
  await node("#syncCanva").dispatch("click");
  assert.equal(publishes, 1); assert.equal(updates, 1); assert.equal(syncs, 1);
  context.newImage = "data:image/png;base64,bmV3";
  run(`state.songs = [{ id: 'test', title: 'Test', lyrics: 'Besedilo', categories: [] }];
    state.canvaPages = [{ page: 2, canvaDbPage: 2, songId: 'test', title: 'Test' }];
    state.canva = {};
    window.ZBORCEK_SONGBOOK = { exportedAt: 'before', songs: [{ page: 2, imageDataUrl: 'data:image/png;base64,b2xk' }] };
    canvaPageImages.set(2, newImage);`);
  let payload = await run("presentationSongbookPayload({ requireImages: true })");
  assert.equal(payload.songs[0].imageDataUrl, context.newImage, "Latest displayed image takes precedence over an older exported bundle");
  run("canvaPageImages.clear(); state.canva.needsPresentationExport = true");
  await assert.rejects(run("presentationSongbookPayload({ requireImages: true })"), /Manjka slika/);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const toolbar = html.match(/<div class="toolbar songbook-toolbar[^>]*>([\s\S]*?)<\/details>/)[1];
  const beforeOptions = toolbar.split('<details id="songbookOptions"')[0];
  for (const id of ["songbookSearch", "songbookMassPart", "printSongbook"]) assert.ok(beforeOptions.includes(`id="${id}"`));
  for (const id of ["syncCanva", "songbookManualImport", "updatePresentation"]) assert.ok(toolbar.indexOf(`id="${id}"`) > toolbar.indexOf('<details'));
  assert.doesNotMatch(beforeOptions, /file-button|canva-open-link|saveSongbookToSongs/);
  assert.match(html, /id="songbookSearch" class="search"/, "Search is available in the public songbook too");
  for (const id of ["syncCanva", "canvaConnection", "updatePresentation", "importCanvaPdf"]) {
    assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1);
  }
  console.log("Songbook toolbar: visible search/filter/print, right-hand options, keyboard/outside dismissal, both Canva imports, save/update actions, latest images and incomplete export rejection OK. Browser layout not exercised.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
