const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const c = vm.createContext({ window: {}, crypto: require('node:crypto'), structuredClone, console,
  URL, Blob, setTimeout, clearTimeout, location: { hostname: 'localhost' },
  localStorage: { getItem: () => null, setItem() {} },
  document: { querySelector: () => ({ value:'', classList: { add(){},remove(){},toggle(){} } }), querySelectorAll: () => [] } });
for (const file of ['song-catalog.js','song-numbering.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
vm.runInContext(source.slice(0,source.indexOf('document.addEventListener("zborcek-auth-state"')),c);
const run = (s) => vm.runInContext(s,c);
const imported=c.window.ZBORCEK_SONG_CATALOG.chordCorrections.filter(s=>s.sourceImport);
assert.equal(imported.length,32);
assert.equal(new Set(imported.map(s=>s.title)).size,32);
for(const song of imported){
  assert.ok(song.inlineChords.trim(), song.title);
  assert.doesNotMatch(song.inlineChords,/\uFFFD|\[[^\]]*$|\]\[/,song.title);
  const tokens=run(`tokenizeInlineChords(${JSON.stringify(song.inlineChords)})`);
  const rebuilt=run(`tokensToInlineText(tokenizeInlineChords(${JSON.stringify(song.inlineChords)}))`);
  assert.equal(rebuilt,song.inlineChords.trim(),`Roundtrip keeps every chord and lyric: ${song.title}`);
  assert.ok(tokens.some(t=>t.chord),song.title);
}
assert.equal(run('tokenizeInlineChords("[C][G]a")[0].chord'),'C G','No adjacent chord can be silently overwritten');
const pastirci=imported.find(s=>s.title.includes('Kaj se vam zdi'));
assert.match(pastirci.inlineChords.replace(/\[[^\]]+\]/g,''),/zveličarja boga/i);
assert.match(pastirci.inlineChords.replace(/\[[^\]]+\]/g,''),/odprto je nebo/);
assert.ok(imported.some(s=>s.title==='Glori, glori aleluja (Rok)'));
assert.ok(imported.some(s=>s.title==='Mamica je kakor zarja'));
assert.ok(imported.some(s=>s.title==='Mi se imamo radi'));
const report=JSON.parse(fs.readFileSync(path.join(root,'scripts/fixtures/chord-reconciliation-report.json'),'utf8'));
assert.equal(report.flatMap(r=>r.unmapped).length,0,'Every original chord is accounted for');
console.log('Original PDF: all 32 songs, no missing anchors, lossless token roundtrips, both Glori variants and complete Pastirci text OK.');
