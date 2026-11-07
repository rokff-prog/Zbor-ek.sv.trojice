const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
const beforeBootstrap = source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"'));
const nodes = new Map();
const nodeFor = (selector) => {
  if (!nodes.has(selector)) nodes.set(selector, {
    value: "", innerHTML: "", textContent: "",
    classList: { add() {}, remove() {}, toggle() {} },
  });
  return nodes.get(selector);
};
const storage = new Map();
const context = vm.createContext({
  crypto, console, structuredClone, URL, Blob, setTimeout, clearTimeout,
  location: { hostname: "localhost" },
  window: {},
  document: { querySelector: nodeFor, querySelectorAll: () => [] },
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  },
});
vm.runInContext(fs.readFileSync(path.join(root, "song-catalog.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "song-numbering.js"), "utf8"), context);
vm.runInContext(beforeBootstrap, context);
const run = (code) => vm.runInContext(code, context);
const plain = (value) => JSON.parse(JSON.stringify(value));

async function main() {
  if (process.argv[2]) {
    context.legacyState = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    run("state = structuredClone(legacyState)");
  } else {
    run(`
      state.canvaPages = Object.keys(SONGBOOK_PAGE_CATALOG).map((number) => ({
        id: 'canva-page-' + number, page: Number(number), canvaDbPage: Number(number),
        title: 'Canva stran ' + number, songId: state.songs[Number(number) - 1]?.id,
        copies: Number(number) === 26 ? 3 : 0,
      }));
    `);
  }
  run(`
    state.songs[0].inlineChords = '[C]Existing chord draft';
    state.massHistory = [{ date: '2026-10-16', selections: { Vstopna: state.songs[0].id } }];
  `);
  const ids = plain(run("state.songs.map((song) => song.id)"));
  const history = plain(run("state.massHistory"));
  const unrelated = plain(run("state.songs.find((song) => song.title === 'Nihče ne ljubi te kot jaz')"));

  assert.equal(run("repairSongbookMetadata()"), true);
  const pages = plain(run("state.canvaPages"));
  const expected = plain(run("SONGBOOK_PAGE_CATALOG"));
  for (const page of pages) {
    assert.equal(page.title, expected[page.canvaDbPage].title, `Page ${page.page} title`);
    assert.deepEqual(page.categories, expected[page.canvaDbPage].categories, `Page ${page.page} categories`);
  }
  assert.equal(run("songbookSongForPage(state.canvaPages.find((page) => page.page === 12)).title"), "Gospod usmili se");
  assert.equal(run("songbookSongForPage(state.canvaPages.find((page) => page.page === 26)).title"), "Mamica je kakor zarja");
  assert.equal(run("songbookSongForPage({page: 26, title: 'An unknown new song'})"), null);
  assert.deepEqual(plain(run("state.songs.find((song) => song.id === '" + unrelated.id + "')")), unrelated);
  assert.deepEqual(plain(run("state.songs.map((song) => song.id)")), ids);
  assert.deepEqual(plain(run("state.massHistory")), history);
  assert.equal(run("state.songs[0].inlineChords"), "[C]Existing chord draft");
  assert.deepEqual(pages.find((page) => page.page === 26).categories, []);
  assert.deepEqual(pages.find((page) => page.page === 27).categories, []);

  run(`
    selectedSongbookPageId = state.canvaPages.find((page) => page.page === 26).id;
    renderSongbookEditor();
  `);
  assert.equal(nodeFor("#songbookTitle").value, "Mamica je kakor zarja");
  assert.doesNotMatch(nodeFor("#songbookMassParts").innerHTML, /checked/);
  assert.match(nodeFor("#songbookMassParts").innerHTML, /Velikonočne/);
  assert.match(nodeFor("#songbookMassParts").innerHTML, /Božične/);

  run(`
    state.canvaPages.find((page) => page.page === 26).title = 'My edited song title';
    state.canvaPages.find((page) => page.page === 26).categories = ['Zaključek'];
  `);
  assert.equal(run("repairSongbookMetadata()"), false);
  nodeFor("#songbookMassPart").value = "Božične";
  assert.deepEqual(plain(run("getSongbookSongs().map((page) => page.page)")), [15, 16, 17, 18, 19]);
  nodeFor("#songbookMassPart").value = "";
  nodeFor("#songbookSearch").value = "Mamica";
  assert.equal(run("getSongbookSongs().length"), 0);
  nodeFor("#songbookSearch").value = "My edited";
  assert.equal(run("getSongbookSongs().length"), 1);

  run(`
    window.ZBORCEK_SONGBOOK = { songs: state.canvaPages.map((page) => ({
      page: page.canvaDbPage, title: 'Old incorrect bundle title', imageDataUrl: 'data:image/jpeg;base64,test',
    })) };
    loadCanvaPageRecords = async () => [];
  `);
  await run("loadCanvaPageImages()");
  assert.equal(run("state.canvaPages.find((page) => page.page === 26).title"), "My edited song title");
  assert.deepEqual(plain(run("state.canvaPages.find((page) => page.page === 26).categories")), ["Zaključek"]);

  run(`
    loadCanvaPageRecords = async () => state.canvaPages.map((page) => ({
      page: page.canvaDbPage, blob: new Blob(['preview']),
    }));
  `);
  await run("loadCanvaPageImages()");
  assert.equal(run("state.canvaPages.find((page) => page.page === 26).title"), "My edited song title");
  assert.deepEqual(plain(run("state.canvaPages.find((page) => page.page === 26).categories")), ["Zaključek"]);

  context.importedPage = {
    getTextContent: async () => ({ items: [{ str: "D A R U J E M  T I  L J U B E Z E N", transform: [1, 0, 0, 1, 0, 100] }] }),
  };
  assert.equal(await run("extractPdfPageTitle(importedPage, 26)"), "Darujem ti ljubezen");
  if (process.argv[3]) {
    const pdfPages = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
    for (const pdfPage of pdfPages) {
      context.importedPage = {
        getTextContent: async () => ({ items: pdfPage.text.split("\n").map((str, i) => ({
          str, transform: [1, 0, 0, 1, 0, 10000 - i * 20],
        })) }),
      };
      assert.equal(await run("extractPdfPageTitle(importedPage, 100)"), expected[pdfPage.page].title,
        `Imported PDF page ${pdfPage.page} must be recognized regardless of its position`);
    }
  }
  context.originalState = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], "utf8")) : null;
  run(`
    state = originalState ? structuredClone(originalState) : structuredClone(seedData);
    if (!state.canvaPages) state.canvaPages = Object.keys(SONGBOOK_PAGE_CATALOG).map((page) => ({
      id: 'canva-page-' + page, page: Number(page), title: 'Canva stran ' + page,
    }));
    isAdminView = true;
    suppressRemoteSave = true;
    const target = state.songs.find((song) => songbookTitleKey(song.title) === songbookTitleKey('Ko Jezus je začel učiti'));
    target.inlineChords = '[D]Original manual draft';
  `);
  const originalIds = plain(run("state.songs.map((song) => song.id)"));
  assert.equal(run("importSongLibrary()"), true);
  run("repairSongbookMetadata(); refreshSongbookMembership()");
  assert.equal(run("window.ZBORCEK_SONG_CATALOG.songs.every((entry) => state.songs.some((song) => song.catalogKey === entry.key))"), true);
  assert.equal(run("getSongLibraryRows()[0].song.isCover"), true);
  assert.deepEqual(plain(run("getSongLibraryRows()[0].pages")), [1]);
  const rowNumbers = plain(run("getSongLibraryRows().filter((row) => row.pages.length).map((row) => row.pages[0])"));
  assert.deepEqual(rowNumbers, rowNumbers.slice().sort((a, b) => a - b));
  for (const id of originalIds) assert.equal(run(`state.songs.some((song) => song.id === ${JSON.stringify(id)})`), true);
  assert.equal(run("songHasChords({lyrics:'A song',chords:'Plain lyrics with no chords'})"), false);
  assert.equal(run("songHasChords({inlineChords:'[C]A song'})"), true);
  assert.equal(run("getSongLibraryRows().find((row) => row.song.title === 'On nosi ves svet').pages.join(',')"), "5,6");
  assert.equal(run("getSongLibraryRows().find((row) => row.song.title === 'Bojim se samote').pages.length"), 0);
  const target = plain(run("state.songs.find((song) => songbookTitleKey(song.title) === songbookTitleKey('Ko Jezus je začel učiti'))"));
  assert.match(target.inlineChords, /za\[G\]čel u\[C\]čiti/);
  assert.equal(target.chordHistory.at(-1).inlineChords, "[D]Original manual draft");
  assert.equal(run("tokenizeInlineChords('word[a]').at(-1).chord"), "a");
  const toronto = plain(run("state.songs.find((song) => song.catalogKey === 'gospod-toronto-2002')"));
  assert.ok(toronto);
  assert.equal(toronto.link, "https://jubilate.donbosko.si/song/365");
  assert.deepEqual(toronto.categories, ["Gospod usmili se"]);
  assert.match(toronto.inlineChords, /Gos\[D\]pod, spet sem \[G\]tukaj pred Te\[D\]boj/);
  assert.match(toronto.inlineChords, /Modulacija v E-dur/);
  assert.match(toronto.inlineChords, /Modulacija v Fis-dur/);
  assert.equal(toronto.inBook, false);
  assert.equal(run("songHasChords(state.songs.find((song) => song.catalogKey === 'gospod-toronto-2002'))"), true);
  assert.equal(run("songbookSongForPage(state.canvaPages.find((page) => page.page === 12)).title"), "Gospod usmili se");
  assert.equal(run("tokenizeInlineChords(state.songs.find((song) => song.catalogKey === 'gospod-toronto-2002').inlineChords).filter((token) => token.chord === 'Fis').length"), 5);
  assert.equal(run("importSongLibrary()"), false);
  nodeFor("#chordSearch").value = "gospod usmili se";
  assert.equal(run("getChordSongs().some((song) => song.catalogKey === 'gospod-toronto-2002')"), true);
  nodeFor("#chordSearch").value = "ko jezus je zacel uciti";
  assert.equal(run("getChordSongs().length"), 1);
  const rendered = run("renderChordLines(getChordSongs()[0].inlineChords, true)");
  assert.match(rendered, /class="token-chord"/);
  assert.match(rendered, /class="lyric-run">Ko&nbsp;Jezus&nbsp;je&nbsp;začel&nbsp;učiti,/);
  assert.doesNotMatch(rendered, /Ko&nbsp;CJezus/);
  nodeFor("#chordSearch").value = "";
  run("renderChords = () => {}; renderSongs()");
  assert.match(nodeFor("#songList").innerHTML, /Naslovnica/);
  assert.match(nodeFor("#songList").innerHTML, /V pesmarici/);
  console.log("Songbook and library: metadata, import, ordering, automatic membership/chords, and exact chord positions OK.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
