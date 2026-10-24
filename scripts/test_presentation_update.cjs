const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS8AAAAASUVORK5CYII=";
const payload = { type: "zborcek-predstavitev", songs: [1, 31, 32].map((number) => ({ number, title: `Pesem ${number}`, imageDataUrl: png })) };
const makeDirectory = (name) => {
  const files = new Map(), directories = new Map(), writes = [];
  const directory = { name, files, directories, writes, failAt: "",
    async getFileHandle(filename, options = {}) {
      if (!files.has(filename) && !options.create) throw Object.assign(new Error("Missing"), { name: "NotFoundError" });
      return { kind: "file", async getFile() { return { async text() { return String(files.get(filename) || ""); } }; }, async createWritable() {
        let pending;
        return {
          async write(content) { if (directory.failAt && filename.includes(directory.failAt)) throw new Error("Disk full"); pending = content; },
          async close() { files.set(filename, pending); writes.push(filename); }, async abort() {},
        };
      } };
    },
    async getDirectoryHandle(dirname, options = {}) {
      if (!directories.has(dirname) && options.create) directories.set(dirname, makeDirectory(dirname));
      if (!directories.has(dirname)) throw Object.assign(new Error("Missing directory"), { name: "NotFoundError" });
      return directories.get(dirname);
    },
    async *entries() { for (const filename of files.keys()) yield [filename, { kind: "file" }]; },
  };
  return directory;
};
const program = makeDirectory("USB-predvajalnik");
const images = makeDirectory("predvajalnik-pesmi");
program.files.set("zborcek-predvajalnik.ps1", "existing program");
program.files.set("zborcek-predvajalnik.bat", "existing launcher");
program.directories.set(images.name, images);
images.files.set("katalog.tsv", "original catalog");
images.files.set("stara-slika.jpg", "original image");
const button = { disabled: false };
const messages = [];
const downloaded = [];
const selectedPage = { id: "p2", page: 31, printNumber: 30, title: "Druga stran" };
let picks = 0, payloadReads = 0;
const context = vm.createContext({
  crypto, console, Uint8Array, atob, Blob, isAdminView: true,
  window: { showDirectoryPicker: async (options) => { picks++; assert.equal(options.mode, "readwrite"); return program; } },
  $: () => button, setPdfImportStatus: (message) => messages.push(message),
  presentationSongbookPayload: async (options) => { assert.equal(options.requireImages, true); payloadReads++; return payload; },
  state: { canvaPages: [{ id: "p1", page: 30, printNumber: 30 }, selectedPage] },
  currentSongbookItem: () => selectedPage,
  numberForSongbookItem: (item) => item.printNumber,
  canvaPageImages: new Map([[31, png]]),
  imageUrlToDataUrl: async (value) => value,
  document: { createElement: () => ({ click() { downloaded.push(this.download); } }) },
  URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
  program, images, payload,
});
vm.runInContext(fs.readFileSync(path.join(root, "presentation-update.js"), "utf8"), context);
const run = (code) => vm.runInContext(code, context);
async function main() {
  assert.equal(await run("updatePresentationProgram()"), true);
  assert.equal(picks, 1); assert.equal(payloadReads, 1);
  assert.equal(button.disabled, false);
  assert.match(messages.at(-1), /Dodanih 3/);
  assert.equal(program.writes.length, 0, "Never replace the existing program or launchers");
  assert.equal(program.files.get("zborcek-predvajalnik.ps1"), "existing program");
  assert.equal(images.writes.at(-1), "katalog.tsv", "Catalog is committed after every new image");
  const catalog = images.files.get("katalog.tsv");
  for (const number of [1,31,32]) assert.match(catalog, new RegExp(`\\r\\n${number}\\tstran-${number}-`));
  assert.equal(images.files.get("stara-slika.jpg"), "original image");
  for (const filename of images.writes.filter((file) => file !== "katalog.tsv")) {
    assert.ok(images.files.get(filename) instanceof Uint8Array);
  }
  images.failAt = "stran-32-";
  assert.equal(await run("updatePresentationProgram()"), false);
  assert.equal(images.files.get("katalog.tsv"), catalog, "Failure must preserve the working catalog and all its images");
  assert.equal(button.disabled, false);
  images.failAt = "";
  const wrong = makeDirectory("unrelated");
  context.wrong = wrong;
  await assert.rejects(run("updatePresentationFolder(wrong, payload)"), /Izberi glavno mapo/);
  assert.equal(wrong.writes.length, 0);
  const html = makeDirectory("HTML-player");
  html.files.set("usb-predvajalnik.html", "existing HTML program");
  context.html = html;
  assert.equal(JSON.parse(JSON.stringify(await run("updatePresentationFolder(html, payload)"))).added, 3);
  assert.equal(html.files.get("usb-predvajalnik.html"), "existing HTML program");
  assert.deepEqual(html.writes, ["zborcek-predstavitev-pesmarica.js"]);
  const exported = {};
  vm.runInNewContext(html.files.get(html.writes[0]), { window: exported });
  assert.equal(exported.ZBORCEK_SONGBOOK.songs[2].number, 32);
  const combined = makeDirectory("SKUPNA PESMARICA");
  const combinedImages = makeDirectory("predvajalnik-pesmi");
  const dropped = makeDirectory("dodane-pesmi");
  combined.files.set("E-pesmaricaS.ps1", "launcher");
  combined.directories.set("predvajalnik-pesmi", combinedImages);
  combined.directories.set("dodane-pesmi", dropped);
  combinedImages.files.set("katalog.tsv", "# številka\tdatoteka\tnaslov\r\n1\tstran-01.jpg\tPrva\r\n31\tstran-31.jpg\tDruga\r\n");
  context.combined = combined;
  let combinedResult = JSON.parse(JSON.stringify(await run("updatePresentationFolder(combined, payload)")));
  assert.deepEqual(combinedResult, { added: 1, existing: 2, total: 3 });
  assert.deepEqual(dropped.writes, ["pesem-032-1.png"]);
  combinedResult = JSON.parse(JSON.stringify(await run("updatePresentationFolder(combined, payload)")));
  assert.deepEqual(combinedResult, { added: 0, existing: 3, total: 3 });
  assert.deepEqual(dropped.writes, ["pesem-032-1.png"], "Existing pages are never overwritten");
  const twoPageSong = { songs: [
    { number: 30, title: "Prva stran", imageDataUrl: png },
    { number: 30, title: "Druga stran", imageDataUrl: png },
  ] };
  context.twoPageSong = twoPageSong;
  combinedResult = JSON.parse(JSON.stringify(await run("updatePresentationFolder(combined, twoPageSong)")));
  assert.deepEqual(combinedResult, { added: 2, existing: 0, total: 2 });
  assert.deepEqual(dropped.writes.slice(-2), ["pesem-030-1.png", "pesem-030-2.png"]);
  assert.equal(await run("downloadCurrentSongbookPageForUsb()"), true);
  assert.deepEqual(downloaded, ["pesem-030-2.png"]);
  assert.match(messages.at(-1), /dodane-pesmi/);
  const oldWrites = images.writes.length;
  await assert.rejects(run("updatePresentationFolder(program, { songs: [{ number: 0, imageDataUrl: payload.songs[0].imageDataUrl }] })"), /veljavne stalne/);
  await assert.rejects(run("updatePresentationFolder(program, { songs: [{ number: 1, imageDataUrl: '' }] })"), /Manjka slika/);
  await assert.rejects(run("updatePresentationFolder(program, { songs: [{ number: 1, imageDataUrl: 'data:image/png;base64,dGVzdA==' }] })"), /Neveljavna slika/);
  assert.equal(images.writes.length, oldWrites, "Invalid/incomplete data is rejected before writing");
  run("window.showDirectoryPicker = async () => { throw Object.assign(new Error('Cancelled'), { name: 'AbortError' }); }");
  assert.equal(await run("updatePresentationProgram()"), false);
  assert.match(messages.at(-1), /preklicana/);
  run("window.showDirectoryPicker = undefined");
  assert.equal(await run("updatePresentationProgram()"), false);
  assert.match(messages.at(-1), /Chrome ali Edge/);
  run("isAdminView = false");
  assert.equal(await run("updatePresentationProgram()"), false);
  console.log("Presentation updates: combined player adds only missing pages (including multi-page songs), existing Windows/HTML players still update, invalid data/failure/cancellation handling OK. Folder permission UI not exercised.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
