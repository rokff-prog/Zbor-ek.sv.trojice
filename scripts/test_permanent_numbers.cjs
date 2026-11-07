const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, "song-numbering.js"), "utf8"), context);
const number = (state, previous = null) => context.ensurePermanentSongNumbers(state, previous);
const state = { songs: [
  { id: "cover", title: "Naslovnica", isCover: true },
  { id: "a", title: "Prva pesem", songNumber: 85 },
  { id: "ko", title: "Ko Jezus je začel učiti", songNumber: 97 },
  { id: "toronto", title: "Gospod, usmili se (SDM Toronto 2002)", songNumber: 98 },
], canvaPages: [
  { page: 1, title: "Naslovnica", cover: true }, { page: 2, title: "Prva pesem", songId: "a" },
  { page: 31, title: "Ko Jezus je začel učiti", songId: "ko" },
  { page: 32, title: "Gospod, usmili se (SDM Toronto 2002)", songId: "toronto" },
] };
number(state);
assert.deepEqual(state.songs.map((song) => song.printNumber), [1, 2, 31, 32]);
const first = JSON.stringify(state);
const shortTitle = { songs: [{ id: 'manual-toronto', title: 'Gospod usmili se (toronto)' }],
  canvaPages: [{ page: 32, title: 'Gospod usmili se (toronto)', songId: 'manual-toronto' }] };
number(shortTitle);
assert.equal(shortTitle.songs[0].printNumber, 32, "The title used in the actual Canva PDF keeps the confirmed number");
number(state);
assert.equal(JSON.stringify(state), first, "Numbering is idempotent");
state.canvaPages.reverse();
state.canvaPages.forEach((page, index) => { page.page = index + 5; });
state.songs.reverse();
number(state);
assert.equal(state.songs.find((song) => song.id === "ko").printNumber, 31);
assert.equal(state.songs.find((song) => song.id === "toronto").printNumber, 32);
assert.equal(state.canvaPages.find((page) => page.songId === "a").printNumber, 2);
state.songs.push({ id: "new", title: "Nova pesem" });
state.canvaPages.push({ page: 2, title: "Nova pesem", songId: "new" });
number(state);
assert.equal(state.songs.find((song) => song.id === "new").printNumber, 33, "Inserted PDF pages receive a new number, not the displaced number");
state.songs = state.songs.filter((song) => song.id !== "a");
state.canvaPages = state.canvaPages.filter((page) => page.songId !== "a");
state.songs.push({ id: "later", title: "Poznejša pesem" });
state.canvaPages.push({ page: 2, title: "Poznejša pesem", songId: "later" });
number(state);
assert.equal(state.songs.find((song) => song.id === "later").printNumber, 34, "Deleted numbers are never recycled");
const renamed = state.songs.find((song) => song.id === "ko");
renamed.title = "Nov naslov iste pesmi";
state.canvaPages.find((page) => page.songId === "ko").title = renamed.title;
number(state);
assert.equal(renamed.printNumber, 31, "Editing a title preserves song identity");
const oldClient = structuredClone(state);
delete oldClient.songNumbering;
oldClient.songs.forEach((song) => { song.printNumber = 500; });
oldClient.canvaPages.forEach((page) => { page.printNumber = 500; });
number(oldClient, state);
assert.equal(oldClient.songs.find((song) => song.id === "ko").printNumber, 31, "Server-side reconciliation protects printed numbers from old clients");
const reimport = structuredClone(state);
reimport.canvaPages = reimport.canvaPages.map((page, index) => ({ title: page.title, page: index + 1 }));
number(reimport);
assert.equal(reimport.canvaPages.find((page) => page.title.includes("Toronto")).printNumber, 32, "Canva re-import without page/song IDs uses the persisted title association");
const multi = { songs: [ { id: 'two-pages', title: 'On nosi cel svet' }, { id: 'bad-link', title: 'Gospod usmili se (toronto)' } ],
  canvaPages: [ { page: 5, title: 'On nosi cel svet', songId: 'two-pages' }, { page: 6, title: 'On nosi cel svet', songId: 'two-pages' },
    { page: 12, title: 'Gospod usmili se', songId: 'bad-link' }, { page: 32, title: 'Gospod usmili se (toronto)', songId: 'bad-link' } ] };
number(multi);
assert.deepEqual(multi.canvaPages.map((page) => page.printNumber), [5,6,12,32], 'Duplicate titles and stale song IDs must not renumber printed pages');
assert.equal(JSON.stringify(multi.songs[0].printNumbers), '[5,6]');
assert.equal(multi.songs[1].printNumber, 32, 'Toronto must not inherit the older arrangement number 12');
assert.equal(multi.canvaPages[2].songId, undefined, 'Repair the incorrect cross-arrangement link without changing lyrics');
const crossed = { songs: [{ id:'old',title:'Gospod usmili se' },
  { id:'toronto',title:'Gospod, usmili se (Toronto)',catalogKey:'gospod-toronto-2002' }],
  canvaPages: [{ id:'p12',page:12,title:'Gospod usmili se',songId:'old',numberKey:'print:12',printNumber:12 },
    { id:'p32',page:32,title:'Gospod usmili se',songId:'old',numberKey:'print:32',printNumber:32 }],
  songNumbering: { bookInitialized:true,nextNumber:36,numbers:{'print:12':12,'print:32':32},entries:{
    'print:12':{songKey:'song:old',titleKeys:['gospodusmilise','gospodusmilisetoronto']},
    'print:32':{songKey:'song:old',titleKeys:['gospodusmilise','gospodusmilisetoronto']} } } };
const crossedBefore = structuredClone(crossed);
number(crossed, crossedBefore);
assert.equal(crossed.canvaPages[0].songId,'old');
assert.equal(crossed.canvaPages[1].songId,'toronto');
assert.equal(JSON.stringify(crossed.songs[0].printNumbers),'[12]');
assert.equal(JSON.stringify(crossed.songs[1].printNumbers),'[32]');
number(crossed);
assert.equal(JSON.stringify(crossed.songs.map((song)=>song.printNumbers)),'[[12],[32]]','Reload must not merge two arrangements with the same PDF title');
console.log("Permanent numbers: distinct 12/32 arrangements repaired even with contaminated title aliases, printed baseline, multi-page songs, non-reuse and stale-client protection OK.");
