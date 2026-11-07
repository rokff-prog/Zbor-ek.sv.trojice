const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const output = { innerHTML: "" };
const pages = [1, 2, 3].map((number) => ({ printNumber: number, copies: 1 }));
const context = vm.createContext({
  state: { canvaPages: pages },
  ensurePermanentSongNumbers() {}, ensureSongbookCopies() {},
  getSongbookCopies: (song) => song.copies,
  numberForSongbookItem: (song) => song.printNumber,
  renderCanvaPage: (song) => `<img data-page="${song.printNumber}">`,
  escapeHtml: String,
  $: () => output,
});
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
vm.runInContext(app.slice(app.indexOf("function renderSongbookPrint()"), app.indexOf("function fillSongForm()")), context);
vm.runInContext("renderSongbookPrint()", context);
assert.equal((output.innerHTML.match(/class="songbook-print-sheet"/g) || []).length, 2);
assert.equal((output.innerHTML.match(/data-page=/g) || []).length, 3, "Odd page counts keep every image without adding a song");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const printCss = css.slice(css.indexOf("@media print"));
assert.match(printCss, /\.songbook-print-sheet\s*\{[^}]*position: relative;/);
assert.match(printCss, /\.songbook-print-sheet::before,\s*\.songbook-print-sheet::after\s*\{[^}]*left: 50%;[^}]*height: 4mm;[^}]*border-left: 0\.2mm solid #111;/);
assert.match(printCss, /\.songbook-print-sheet::before\s*\{ top: 3mm; \}/);
assert.match(printCss, /\.songbook-print-sheet::after\s*\{ bottom: 3mm; \}/);
assert.doesNotMatch(css.slice(0, css.indexOf("@media print")), /\.songbook-print-sheet::(?:before|after)/, "Cut marks only appear when printing");
console.log("Songbook cut marks: two short centered border marks per landscape sheet, print-only, even/odd page pairing preserved. Physical print not exercised.");
