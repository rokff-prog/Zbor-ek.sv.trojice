const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const node = { disabled: false, close() {} };
let confirmed = true, published = 0;
const context = vm.createContext({ crypto, console, structuredClone, URL, Blob, setTimeout, clearTimeout,
  location: { hostname: 'localhost' }, window: { confirm: () => confirmed },
  document: { querySelector: () => node, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem() {} }, recordPublish: () => published++ });
for (const file of ['song-catalog.js', 'song-numbering.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), context);
const run = (code) => vm.runInContext(code, context);
run(`state = { songs: [{ id:'songbook-cover', isCover:true, title:'Naslovnica' },
  { id:'ko',title:'Ko Jezus je začel učiti', inlineChords:'[D]Ohrani' },
  { id:'new-image',title:'Canva stran 35',lyrics:'' }],
  canvaPages:[{id:'old-cover',page:1,canvaPageId:'OLD',title:'Pesmarica',cover:true},
    {id:'ko-page',page:31,title:'Ko Jezus je začel učiti',songId:'ko'},
    {id:'new-cover',page:35,canvaDbPage:35,canvaPageId:'NEW',title:'Canva stran 35',songId:'new-image'}], canva:{} };
  ensurePermanentSongNumbers(state);
  const before = structuredClone(state);
  persist = () => ensurePermanentSongNumbers(state);
  renderAll = () => {};
  saveSongbookToSongs = async () => { recordPublish(); return true; };
  isAdminView = true; selectedSongbookPageId = 'old-cover';`);
async function main() {
  assert.throws(() => run("setSongbookPrintNumber(state.canvaPages[2],1)"), /Najprej izbriši/);
  confirmed = false;
  assert.equal(await run('deleteCurrentSongbookPage()'), false);
  assert.equal(run('state.canvaPages.length'), 3);
  confirmed = true;
  assert.equal(await run('deleteCurrentSongbookPage()'), true);
  assert.equal(published, 1);
  assert.equal(run('state.canva.ignoredPageIds[0]'), 'OLD');
  assert.equal(run('state.songs.length'), 3, 'Deleting a page must not delete songs or their chords');
  assert.equal(run("setSongbookPrintNumber(state.canvaPages.find((p)=>p.id==='new-cover'),1)"), true);
  run('ensurePermanentSongNumbers(state, before)');
  assert.equal(run("state.canvaPages.find((p)=>p.id==='new-cover').printNumber"), 1);
  assert.equal(run("state.canvaPages.find((p)=>p.id==='new-cover').canvaDbPage"), 35, 'Changing printed number must not change its image/PDF source');
  assert.equal(run("state.canvaPages.find((p)=>p.id==='ko-page').printNumber"), 31);
  assert.equal(run("state.songs.find((s)=>s.id==='ko').inlineChords"), '[D]Ohrani');
  assert.equal(run("state.songNumbering.numbers['print:35']"), 35, 'The retired image number is never reused for another song');
  assert.equal(run("state.songs.find((s)=>s.id==='songbook-cover').printNumbers.join(',')"), '1');
  assert.throws(() => run("setSongbookPrintNumber(state.canvaPages.find((p)=>p.id==='ko-page'),5)"), /natisnjene številke/);
  run("isAdminView = false; selectedSongbookPageId = 'new-cover'");
  assert.equal(await run('deleteCurrentSongbookPage()'), false);
  run("state.canvaPages = []; window.ZBORCEK_SONGBOOK = { songs: [{ page:1,title:'Deleted old cover',imageDataUrl:'data:image/jpeg;base64,b2xk' }] }; loadCanvaPageRecords = async () => [];");
  await run('loadCanvaPageImages()');
  assert.equal(run('state.canvaPages.length'), 0, 'An intentionally emptied book must not restore deleted pages from a stale bundle');
  console.log('Cover settings: cancel/delete only selected page, song/chord preservation, manual cover number 1, server reconciliation, retired numbers and public permissions OK. Browser UI not exercised.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
