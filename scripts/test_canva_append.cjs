const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const nodes = new Map(), records = new Map();
const node = (selector) => {
  if (!nodes.has(selector)) nodes.set(selector, { value: '', textContent: '', innerHTML: '', classList: { add() {}, remove() {}, toggle() {} } });
  return nodes.get(selector);
};
let writes = 0, destroyed = 0, invalidPdf = false, renderFails = false;
const context = vm.createContext({
  crypto, structuredClone, console, Blob, URL, setTimeout, clearTimeout, location: { hostname: 'localhost' },
  window: {}, document: { querySelector: node, querySelectorAll: () => [], createElement: () => ({
    getContext: () => ({}), toBlob: (resolve) => resolve(new Blob(['new-page-jpeg'], { type: 'image/jpeg' })),
  }) }, localStorage: { getItem: () => null, setItem() {} },
  recordWrite: () => writes++,
  openPdf: async () => ({ numPages: invalidPdf ? 2 : 1, destroy: async () => destroyed++, getPage: async () => ({
    getViewport: () => ({ width: 50, height: 80 }), render: () => ({ promise: renderFails ? Promise.reject(Error('render failed')) : Promise.resolve() }),
  }) }),
  readRecords: async () => [...records.values()],
  storeRecord: async (page, blob) => records.set(page, { page, blob }),
});
for (const file of ['song-catalog.js', 'song-numbering.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), context);
const run = (code) => vm.runInContext(code, context);
run(`
  state.songs = [{ id: 'a', title: 'Stara A', categories: ['Vstopna'], inlineChords: '[G]Ohrani akorde' },
    { id: 'b', title: 'Stara B', categories: ['Obhajilo'], lyrics: 'Ohrani besedilo' }];
  state.canvaPages = [{ id: 'old-a', page: 2, canvaDbPage: 2, canvaPageId: 'A', title: 'Stara A', songId: 'a', categories: ['Vstopna'], settingsEditedByUser: true },
    { id: 'old-b', page: 3, canvaDbPage: 3, canvaPageId: 'B', title: 'Stara B', songId: 'b', categories: ['Obhajilo'], settingsEditedByUser: true }];
  state.canva = {}; ensurePermanentSongNumbers(state);
  window.ZBORCEK_SONGBOOK = { exportedAt: 'before', songs: [{ page: 2, imageDataUrl: 'data:image/jpeg;base64,b2xkYQ==' }, { page: 3, imageDataUrl: 'data:image/jpeg;base64,b2xkYg==' }] };
  canvaPageImages.set(2, 'data:image/jpeg;base64,b2xkYQ=='); canvaPageImages.set(3, 'data:image/jpeg;base64,b2xkYg==');
  persist = () => { ensurePermanentSongNumbers(state); recordWrite(); };
  readCanvaPdf = openPdf; loadCanvaPageRecords = readRecords; saveCanvaPageImage = storeRecord;
  extractPdfPageTitle = async () => 'Pridi, sveti Miklavž';
`);
const oldPages = run('JSON.stringify(state.canvaPages)'), oldSongs = run('JSON.stringify(state.songs)');
async function main() {
  assert.equal(await run("appendCanvaPdfPage({}, { canvaPageId: 'NEW', sourcePage: 2 })"), true);
  assert.equal(run('state.canvaPages.length'), 3);
  assert.equal(run('state.songs.length'), 3, 'A new Canva song appears in the song library immediately');
  assert.equal(run('state.canvaPages[2].songId'), run('state.songs[2].id'));
  assert.equal(run('JSON.stringify(state.canvaPages.slice(0,2))'), oldPages, 'Insertion in the source must not replace/relabel old local pages');
  assert.equal(run('JSON.stringify(state.songs.slice(0,2))'), oldSongs);
  assert.equal(run('state.canvaPages[2].canvaDbPage'), 4);
  assert.equal(run('state.canvaPages[2].canvaSourcePage'), 2);
  assert.equal(run('state.canvaPages[2].printNumber'), 33, 'The new page receives the next permanent number, not its source/PDF position');
  assert.equal(records.size, 1, 'Only the new image is written; the image store is not cleared/rebuilt');
  assert.equal(run('state.canva.pendingDirectPublish'), true);
  assert.equal(destroyed, 1);
  const writesBeforeDuplicate = writes;
  assert.equal(await run("appendCanvaPdfPage({}, { canvaPageId: 'NEW', sourcePage: 2 })"), false);
  assert.equal(writes, writesBeforeDuplicate, 'A retry cannot duplicate a page');
  await run('loadCanvaPageImages()');
  assert.equal(run('state.canvaPages.length'), 3, 'Partial local image cache must never discard old pages from the server bundle');
  assert.equal(run('canvaPageImages.get(2)'), 'data:image/jpeg;base64,b2xkYQ==');
  assert.equal(run('canvaPageImages.size'), 3);
  invalidPdf = true;
  await assert.rejects(run("appendCanvaPdfPage({}, { canvaPageId: 'BAD', sourcePage: 5 })"), /samo izbrane/);
  invalidPdf = false; renderFails = true;
  await assert.rejects(run("appendCanvaPdfPage({}, { canvaPageId: 'BAD', sourcePage: 5 })"), /render failed/);
  assert.equal(run('state.canvaPages.length'), 3);
  assert.equal(records.size, 1);
  assert.equal(destroyed, 3, 'PDF documents are released on success and failure');
  renderFails = false;
  assert.equal(await run("appendCanvaPdfPage({}, { canvaPageId: 'SAME-SONG-SECOND-PAGE', sourcePage: 6 })"), true);
  assert.equal(run('state.songs.length'), 3, 'Another page of the same song must reuse its existing library entry');
  assert.equal(run('state.canvaPages[3].songId'), run('state.songs[2].id'));
  run(`extractPdfPageTitle = async () => 'Nova pesem iz ročnega PDF';
    getCurrentCanvaPageHashes = async () => new Map(); hashCanvaImage = async () => 'fixture-hash';
    replaceCanvaPageImages = async () => {}; loadCanvaPageImages = async () => {}; renderAll = () => {};`);
  assert.equal(await run("importCanvaPdf({name:'manual.pdf'})"), true);
  assert.equal(run('state.songs.length'), 4, 'Manual Canva import also creates the missing song immediately');
  assert.equal(run('state.canvaPages[0].songId'), run('state.songs[3].id'));
  assert.equal(await run("importCanvaPdf({name:'manual.pdf'})"), true);
  assert.equal(run('state.songs.length'), 4, 'Repeating a manual import must not duplicate a song');
  console.log('Canva append: only new image/page added, old images/metadata/chords/numbers preserved, source insertions handled, duplicate/retry protection, mixed-cache reload and failed-render cleanup OK. PDF rendering mocked.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
