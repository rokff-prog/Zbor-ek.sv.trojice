const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const nodes = new Map();
const node = (id) => {
  if (!nodes.has(id)) nodes.set(id, { value: "", textContent: "", disabled: false, hidden: false, events: {},
    addEventListener(name, action) { this.events[name] = action; },
    showModal() { this.open = true; }, close() { this.open = false; this.events.close?.(); },
  });
  return nodes.get(id);
};
let connected = true, configured = true, fail = false, failDownload = false, failLicense = false, imports = 0, publishes = 0, polls = 0;
let failPublish = false, confirmBaseline = true, baseline = false, mismatchedState = false;
const available = [{ canvaPageId: 'P3', sourcePage: 3 }], exportBodies = [];
const bodies = [], navigations = [], statuses = [];
const context = vm.createContext({
  URL, File, Blob, crypto: webcrypto, console, isAdminView: true, IS_GITHUB_PUBLIC: false,
  HOSTED_APP_ORIGIN: "https://zborcek-sv-trojice-haloze.poldi4.chatgpt.site",
  state: { canva: {}, canvaPages: [{ id: 'one', page: 1 }, { id: 'two', page: 2 }] },
  window: { confirm: () => confirmBaseline }, persist() {}, saveStateToServer: async () => true,
  location: { href: "https://zborcek-sv-trojice-haloze.poldi4.chatgpt.site/?source=app", assign: (url) => navigations.push(url) },
  history: { replaceState() {} }, $: node, setView() {}, setPdfImportStatus: (message) => statuses.push(message),
  setTimeout: (action) => { action(); return 1; },
  appendCanvaPdfPage: async (file, page) => {
    assert.equal(file.name, `Canva-stran-${page.sourcePage}.pdf`); assert.match(await file.text(), /^%PDF-/);
    imports++; context.state.canvaPages.push({ id: page.canvaPageId, canvaPageId: page.canvaPageId });
    context.state.canva.pendingDirectPublish = true; return true;
  },
  saveSongbookToSongs: async (options) => { assert.equal(options.download, false); if (failPublish) return false; publishes++; return true; },
  apiFetch: async (route, options = {}) => {
    if (route === "/api/canva/status") return Response.json({ configured, connected, redirectUri: "https://example.test/callback" });
    if (route === '/api/canva/plan') return Response.json({
      planId: 'fixture-plan', pageCount: available.length + 2, existingPages: [], requiresBaselineConfirmation: baseline,
      localPageIds: mismatchedState ? ['other-state'] : context.state.canvaPages.map((page) => page.id).sort(),
      newPages: available.filter((page) => !context.state.canvaPages.some((local) => local.canvaPageId === page.canvaPageId)),
    });
    if (route === "/api/canva/export") {
      const body = JSON.parse(options.body); assert.equal(body.planId, 'fixture-plan'); assert.equal(body.pages.length, 1); exportBodies.push(body);
      return fail ? Response.json({ error: "Fixture export failure" }, { status: 403 }) : Response.json({ jobId: "fixture-job" });
    }
    if (route === "/api/canva/export/fixture-job") return failLicense
      ? Response.json({ error: "Fixture Canva license required", code: "license_required" }, { status: 422 })
      : Response.json({ status: ++polls > 1 ? "success" : "in_progress" });
    if (route === "/api/canva/export/fixture-job/file") return failDownload
      ? Response.json({ error: "Fixture PDF transport failure", code: "download_transport_error" }, { status: 502 })
      : new Response("%PDF-1.7 fixture");
    if (route === "/api/canva/config") { bodies.push(JSON.parse(options.body)); configured = true; return Response.json({ saved: true }); }
    if (route === "/api/canva/connect") return Response.json({ url: "https://www.canva.com/api/oauth/authorize?state=fixture" });
    throw new Error("Unexpected app route " + route);
  },
});
vm.runInContext(fs.readFileSync(path.join(root, "canva-client.js"), "utf8"), context);
const run = (code) => vm.runInContext(code, context);
async function main() {
  await run("syncConnectedCanva()");
  assert.equal(imports, 1); assert.equal(publishes, 1);
  assert.match(node("#syncStatus").textContent, /1 novih strani/);
  assert.deepEqual(exportBodies[0].pages, [3]);
  assert.equal(node("#syncCanva").disabled, false);
  await run('syncConnectedCanva()');
  assert.equal(exportBodies.length, 1, 'A no-change refresh never starts an export or PDF download');
  assert.match(statuses.at(-1), /Noben PDF ni bil prenesen/);
  available.push({ canvaPageId: 'P4', sourcePage: 4 });
  failDownload = true;
  await run("syncConnectedCanva()");
  assert.equal(imports, 1); assert.equal(publishes, 1);
  assert.equal(node("#syncStatus").textContent, "Fixture PDF transport failure");
  assert.equal(node("#syncCanva").disabled, false);
  assert.ok(!node("#canvaConnectionDialog").open, "Download failures must not trigger another OAuth setup");
  failDownload = false;
  failLicense = true;
  await run("syncConnectedCanva()");
  assert.equal(imports, 1); assert.equal(publishes, 1);
  assert.equal(node("#syncStatus").textContent, "Fixture Canva license required");
  assert.equal(node("#syncCanva").disabled, false);
  failLicense = false;
  fail = true;
  await run("syncConnectedCanva()");
  assert.equal(imports, 1); assert.equal(publishes, 1);
  assert.equal(node("#syncStatus").textContent, "Fixture export failure");
  fail = false; failPublish = true;
  await run('syncConnectedCanva()');
  assert.equal(imports, 2);
  assert.equal(context.state.canva.pendingDirectPublish, true);
  const exportsBeforeRetry = exportBodies.length;
  failPublish = false;
  await run('syncConnectedCanva()');
  assert.equal(exportBodies.length, exportsBeforeRetry, 'Retry publishes already downloaded pages without downloading them again');
  assert.equal(context.state.canva.pendingDirectPublish, false);
  available.push({ canvaPageId: 'P5', sourcePage: 5 });
  baseline = true; confirmBaseline = false;
  await run('syncConnectedCanva()');
  assert.equal(exportBodies.length, exportsBeforeRetry, 'Cancelling legacy-baseline confirmation leaves all old pages untouched');
  baseline = false; mismatchedState = true;
  await run('syncConnectedCanva()');
  assert.equal(exportBodies.length, exportsBeforeRetry);
  mismatchedState = false;
  connected = false; configured = false;
  await run("syncConnectedCanva()");
  assert.equal(node("#canvaConnectionDialog").open, true);
  assert.equal(imports, 2);
  run("wireCanvaConnection()");
  node("#canvaClientId").value = "OC-test-client";
  node("#canvaClientSecret").value = "fixture-client-secret";
  await node("#canvaConnectionForm").events.submit({ preventDefault() {} });
  assert.equal(bodies[0].clientSecret, "fixture-client-secret");
  assert.equal(node("#canvaClientId").value, "");
  assert.equal(node("#canvaClientSecret").value, "");
  assert.match(navigations[0], /^https:\/\/www.canva.com\/api\/oauth\/authorize/);
  console.log("Canva client: export polling, PDF import and publish, failures preserve data, setup flow and secret-field cleanup OK. Provider calls mocked.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
