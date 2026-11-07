const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const nodes = new Map();
const node = (id) => {
  if (nodes.has(id)) return nodes.get(id);
  const item = { value: "", innerHTML: "", textContent: "", dataset: {}, events: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); },
    dispatch(name) { for (const fn of this.events[name] || []) fn({ target: this, currentTarget: this, preventDefault() {} }); },
    getAttribute(name) { return this[name]; },
  };
  nodes.set(id, item);
  return item;
};
const c = vm.createContext({ console, crypto: require("node:crypto"), structuredClone, URL, Blob,
  location: { hostname: "localhost" }, localStorage: { getItem: () => null, setItem() {} },
  document: { body: node("body"), querySelector: node, querySelectorAll: () => [] },
  window: {}, setTimeout: () => 1, clearTimeout() {}, wireCanvaConnection() {},
});
for (const file of ["song-catalog.js", "song-numbering.js", "calendar-events.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), c);
}
const source = fs.readFileSync(path.join(root, "app.js"), "utf8");
vm.runInContext(source.slice(0, source.indexOf('document.addEventListener("zborcek-auth-state"')), c);
const run = (code) => vm.runInContext(code, c);
const transpose = (text, steps) => { c.input = text; c.steps = steps; return run("transpose(input, steps)"); };
const lyrics = (text) => text.replace(/\[[^\]\r\n]*\]/g, "");
assert.equal(transpose("[C]a in e, A/B, čaka, hvala. [Am7/G]živi! [(C7)] [Refren]", 2),
  "[D]a in e, A/B, čaka, hvala. [Hm7/A]živi! [(D7)] [Refren]");
assert.equal(transpose("[ D/F# ]Besedilo [e]in [A7] čšž [C/E]", 1), "[ D#/G ]Besedilo [f]in [B7] čšž [C#/F]");
assert.equal(transpose("[Fis] [Cis] [H] [B] [Bes] [hes] [Bb] [Db]", 1), "[G] [D] [C] [H] [H] [h] [H] [D]");
assert.equal(transpose("[C] [e] [A7] [H] [B]", -1), "[H] [d#] [G#7] [B] [A]");
assert.equal(transpose("[C]A \t e\r\n[not a chord]\n[Refren]\nModulacija v E-dur\n", 1),
  "[C#]A \t e\r\n[not a chord]\n[Refren]\nModulacija v E-dur\n");
for (const steps of [-24, -12, 0, 12, 24, NaN, 0.5]) assert.equal(transpose("[Db]Ne spreminjaj", steps), "[Db]Ne spreminjaj");
assert.equal(transpose("A, a, E, e; v veri, čaka in žari. Hvala!", 1), "A, a, E, e; v veri, čaka in žari. Hvala!");

const catalog = run("window.ZBORCEK_SONG_CATALOG");
let tested = 0;
for (const song of [...catalog.songs, ...catalog.chordCorrections]) {
  const text = song.inlineChords || song.chords;
  if (!text) continue;
  const normalized = (c.input = text, run("normalizeChordInput(input)"));
  for (let steps = -13; steps <= 13; steps++) {
    assert.equal(lyrics(transpose(normalized, steps)), lyrics(normalized), `${song.title}: intact lyrics at ${steps}`);
  }
  tested++;
}
assert.ok(tested >= 4, "Exercise the actual published song corrections");

run("wireMobileTabSwipe = () => {}; wireEvents(); isAdminView = true;");
for (const song of catalog.chordCorrections) {
  c.testSong = song;
  run("state.songs = [{ id: 'test', title: testSong.title, inlineChords: testSong.inlineChords }]; selectedChordSongId = 'test'");
  node("#chordTitle").value = song.title;
  node("#chordText").value = song.inlineChords;
  const originalLyrics = lyrics(song.inlineChords);
  const expectedLyrics = (c.input = song.inlineChords, run("inlineTextToLyrics(input)"));
  node("#transposeUp").dispatch("click");
  assert.notEqual(node("#chordText").value, song.inlineChords, "The transpose control changes chords");
  assert.equal(lyrics(node("#chordText").value), originalLyrics, "The actual editor preserves lyrics");
  run("saveCurrentChordDraft()");
  assert.equal(run("state.songs[0].lyrics"), expectedLyrics, "Saved lyrics remain unchanged");
  assert.equal(run("state.songs[0].title"), song.title);
  node("#transposeDown").dispatch("click");
  assert.equal(lyrics(node("#chordText").value), originalLyrics, "Both controls preserve lyrics");
}
console.log(`Chord transposition: marker-only notes, suffixes, slash bass, German/Slovene notes, annotations, Unicode, ${tested} catalog entries, editor controls and saved lyrics OK.`);
