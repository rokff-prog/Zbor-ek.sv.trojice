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
      return { async createWritable() {
        let pending;
        return {
          async write(content) { if (directory.failAt && filename.includes(directory.failAt)) throw new Error("Disk full"); pending = content; },
          async close() { files.set(filename, pending); writes.push(filename); }, async abort() {},
        };
      } };
    },
    async getDirectoryHandle(dirname) {
      if (!directories.has(dirname)) throw Object.assign(new Error("Missing directory"), { name: "NotFoundError" });
      return directories.get(dirname);
    },
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
  assert.match(messages.at(-1), /3 strani/);
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
  await assert.rejects(run("updatePresentationFolder(wrong, payload)"), /Izberi mapo/);
  assert.equal(wrong.writes.length, 0);
  const html = makeDirectory("HTML-player");
  html.files.set("usb-predvajalnik.html", "existing HTML program");
  context.html = html;
  assert.equal(await run("updatePresentationFolder(html, payload)"), 3);
  assert.equal(html.files.get("usb-predvajalnik.html"), "existing HTML program");
  assert.deepEqual(html.writes, ["zborcek-predstavitev-pesmarica.js"]);
  const exported = {};
  vm.runInNewContext(html.files.get(html.writes[0]), { window: exported });
  assert.equal(exported.ZBORCEK_SONGBOOK.songs[2].number, 32);
  assert.equal(await run("downloadCurrentSongbookPageForUsb()"), true);
  assert.deepEqual(downloaded, ["pesem-030-2.png"]);
  assert.match(messages.at(-1), /dodane-pesmi/);
  const oldWrites = images.writes.length;
  await assert.rejects(run("updatePresentationFolder(program, { songs: [payload.songs[0], payload.songs[0]] })"), /enolične/);
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
  console.log("Presentation updates: existing Windows/HTML players, unchanged program files, fixed numbers, complete images, last-write catalog, failure/cancellation and unsupported-browser handling OK. Folder permission UI not exercised.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
