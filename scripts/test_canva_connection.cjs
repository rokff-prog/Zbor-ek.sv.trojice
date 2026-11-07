const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const origin = "https://zborcek-sv-trojice-haloze.poldi4.chatgpt.site";
const storage = new Map(), calls = [];
let poll = 0, refreshes = 0, failExport = false, licenseRequired = false, downloadMode = "direct";
let designPages = [1, 2, 3].map((page_number) => ({ id: `P${page_number}`, page_number }));
const diagnosticLogs = [];
const env = {
  ADMIN_USERNAME: "test-admin", ADMIN_PASSWORD: "test-password", SESSION_SECRET: "fixture-session-secret",
  MEDIA: {
    get: async (key) => storage.has(key) ? { text: async () => storage.get(key) } : null,
    put: async (key, value) => storage.set(key, value), delete: async (key) => storage.delete(key),
  },
};
const providerFetch = async (url, options = {}) => {
  calls.push({ url, options });
  if (url.includes('/designs/DAG0E3TU2Go/pages?')) {
    const offset = Number(new URL(url).searchParams.get('offset'));
    return Response.json({ items: designPages.slice(offset - 1, offset + 199) });
  }
  if (url.endsWith("/oauth/token")) {
    assert.equal(options.headers.Authorization, `Basic ${btoa("OC-test-client:fixture-client-secret")}`);
    const params = new URLSearchParams(options.body);
    if (params.get("grant_type") === "refresh_token") {
      assert.equal(params.get("refresh_token"), "fixture-refresh"); refreshes++;
    } else {
      assert.equal(params.get("code"), "fixture-code");
      assert.equal(params.get("redirect_uri"), origin + "/api/canva/callback");
      assert.ok(params.get("code_verifier").length >= 43);
    }
    return Response.json({ access_token: "fixture-access", refresh_token: refreshes ? "fixture-refresh-rotated" : "fixture-refresh", expires_in: 3600 });
  }
  if (url.endsWith("/exports")) {
    if (failExport) return Response.json({ message: "Provider details are private" }, { status: 403 });
    const body = JSON.parse(options.body);
    assert.equal(body.design_id, "DAG0E3TU2Go");
    assert.deepEqual(body.format, { type: "pdf", export_quality: "pro", ...(body.format.pages ? { pages: body.format.pages } : {}) }, "Never silently import a regular-quality watermarked draft");
    return Response.json({ job: { id: "fixture-provider-job", status: "in_progress" } });
  }
  if (url.endsWith("/exports/fixture-provider-job")) {
    if (licenseRequired) return Response.json({ job: { status: "failed", error: { code: "license_required", message: "Private provider error" } } });
    poll++;
    return Response.json({ job: poll === 1 ? { status: "in_progress" } : {
      status: "success", urls: ["https://export-download.canva.com/fixture.pdf"],
    } });
  }
  if (url === "https://export-download.canva.com/fixture.pdf") {
    assert.equal(options.headers?.Authorization, undefined, "Never forward API credentials to a download URL");
    assert.equal(options.headers?.Cookie, undefined);
    assert.equal(options.redirect, "manual");
    if (downloadMode === "redirect") return new Response(null, { status: 302, headers: { Location: "https://document-export.canva.com/final.pdf" } });
    if (downloadMode === "relative") return new Response(null, { status: 307, headers: { Location: "/final.pdf" } });
    if (downloadMode === "untrusted") return new Response(null, { status: 302, headers: { Location: "https://attacker.test/secret" } });
    if (downloadMode === "downgrade") return new Response(null, { status: 302, headers: { Location: "http://export-download.canva.com/final.pdf" } });
    if (downloadMode === "loop") return new Response(null, { status: 302, headers: { Location: "/fixture.pdf" } });
    if (downloadMode === "missing-location") return new Response(null, { status: 302 });
    if (downloadMode === "network") throw new TypeError("Private URL https://export-download.canva.com/?token=fixture-secret");
    if (downloadMode === "timeout") throw Object.assign(new Error("Private provider data"), { name: "TimeoutError" });
    if (downloadMode === "http") return new Response("private provider error", { status: 403 });
    if (downloadMode === "empty") return new Response(null);
    if (downloadMode === "oversized") return new Response("%PDF-1.7", { headers: { "Content-Length": String(26 * 1024 * 1024) } });
    if (downloadMode === "not-pdf") return new Response("<html>not a PDF</html>");
    if (downloadMode === "stream-error") return new Response(new ReadableStream({ start(controller) { controller.error(new TypeError("private-stream-data")); } }));
    return new Response("%PDF-1.7\nfixture", { headers: { "Content-Type": "application/pdf" } });
  }
  if (["https://document-export.canva.com/final.pdf", "https://export-download.canva.com/final.pdf"].includes(url)) {
    assert.equal(options.redirect, "manual");
    assert.equal(options.headers, undefined, "No credentials on any redirect hop");
    return new Response("%PDF-1.7\nredirect fixture");
  }
  throw new Error("Unexpected provider URL: " + url);
};
const context = vm.createContext({ crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, URL, URLSearchParams,
  Request, Response, btoa, atob, AbortSignal, console: { ...console, error: (entry) => diagnosticLogs.push(entry) }, fetch: providerFetch });
vm.runInContext(fs.readFileSync(path.join(root, "dist/server/index.js"), "utf8")
  .replace("export default {", "globalThis.worker = {"), context);
const run = (code) => vm.runInContext(code, context);
context.testEnv = env;
let adminCookie = "";
const request = (route, { method = "GET", body, cookie = adminCookie, requestOrigin = origin } = {}) => context.worker.fetch(
  new Request(origin + route, { method, headers: { Cookie: cookie, Origin: requestOrigin },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env,
);
async function main() {
  for (const route of ["status", "config", "connect", "export", "plan"]) {
    assert.equal((await request("/api/canva/" + route, { cookie: "", method: route === "status" ? "GET" : "POST" })).status, 401);
  }
  const login = await request("/api/login", { method: "POST", body: { username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD } });
  adminCookie = login.headers.get("Set-Cookie").split(";")[0];
  assert.equal((await (await request("/api/canva/status")).json()).configured, false);
  assert.equal((await request("/api/canva/config", { method: "POST", requestOrigin: "https://attacker.test", body: {} })).status, 403);
  assert.equal((await request("/api/canva/config", { method: "POST", body: { clientId: "OC-test-client", clientSecret: "fixture-client-secret" } })).status, 200);
  assert.ok(!storage.get("canva-private/config.json").includes("fixture-client-secret"));
  const start = await request("/api/canva/connect", { method: "POST" });
  const auth = new URL((await start.json()).url);
  assert.equal(auth.origin, "https://www.canva.com");
  assert.equal(auth.searchParams.get("scope"), "design:meta:read design:content:read");
  assert.equal(auth.searchParams.get("code_challenge_method"), "S256");
  const state = auth.searchParams.get("state");
  const flowCookie = start.headers.get("Set-Cookie").split(";")[0];
  assert.match(start.headers.get("Set-Cookie"), /HttpOnly; Secure; SameSite=Lax/);
  const flow = await run(`loadCanvaPrivate(testEnv, 'flows/${state}')`);
  const challenge = Buffer.from(await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(flow.verifier))).toString("base64url");
  assert.equal(auth.searchParams.get("code_challenge"), challenge);
  assert.equal((await request(`/api/canva/callback?state=${state}&code=fixture-code`, { cookie: "" })).status, 400);
  const callback = await request(`/api/canva/callback?state=${state}&code=fixture-code`, { cookie: flowCookie });
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get("Location"), origin + "/?source=app&canva=connected");
  assert.equal((await request(`/api/canva/callback?state=${state}&code=fixture-code`, { cookie: flowCookie })).status, 400);
  assert.ok(!storage.get("canva-private/tokens.json").includes("fixture-refresh"));
  const status = await request("/api/canva/status");
  const details = await status.json();
  assert.equal(details.connected, true);
  assert.ok(!JSON.stringify(details).includes("fixture-"));
  assert.match(status.headers.get("Cache-Control"), /no-store/);
  const originalPages = designPages;
  storage.set('app-state.json', JSON.stringify({ canvaPages: [{ id: 'local1', page: 1 }, { id: 'local2', page: 2 }] }));
  const plan = await (await request('/api/canva/plan', { method: 'POST' })).json();
  assert.equal(plan.requiresBaselineConfirmation, true);
  assert.deepEqual(plan.newPages, [{ canvaPageId: 'P3', sourcePage: 3 }]);
  assert.equal((await request('/api/canva/export', { method: 'POST', body: { requestId: webcrypto.randomUUID(), planId: plan.planId, pages: [1] } })).status, 400, 'Previously imported pages cannot be exported by the incremental flow');
  const deltaBody = { requestId: webcrypto.randomUUID(), planId: plan.planId, pages: [3] };
  const delta = await (await request('/api/canva/export', { method: 'POST', body: deltaBody })).json();
  assert.deepEqual(JSON.parse(calls.filter((call) => call.url.endsWith('/exports')).at(-1).options.body).format.pages, [3]);
  assert.equal((await (await request('/api/canva/export', { method: 'POST', body: deltaBody })).json()).jobId, delta.jobId);
  assert.equal((await request('/api/canva/export', { method: 'POST', body: { ...deltaBody, pages: [2] } })).status, 400);
  storage.set('app-state.json', JSON.stringify({ canvaPages: [{ id: 'local1', page: 1, canvaPageId: 'P1' }, { id: 'local2', page: 2, canvaPageId: 'P2' }] }));
  designPages = [{ id: 'P1', page_number: 1 }, { id: 'NEW', page_number: 2 }, { id: 'P2', page_number: 3 }];
  const middle = await (await request('/api/canva/plan', { method: 'POST' })).json();
  assert.equal(middle.requiresBaselineConfirmation, false);
  assert.deepEqual(middle.newPages, [{ canvaPageId: 'NEW', sourcePage: 2 }], 'New pages inserted in the middle are recognized by identity, not count');
  storage.set('app-state.json', JSON.stringify({ canvaPages: [{ id: 'local2', page: 2, canvaPageId: 'P2' }], canva: { ignoredPageIds: ['P1'] } }));
  const afterDelete = await (await request('/api/canva/plan', { method: 'POST' })).json();
  assert.deepEqual(afterDelete.newPages, [{ canvaPageId: 'NEW', sourcePage: 2 }], 'A deleted old cover must not reappear on the next direct import');
  const middleJob = await (await request('/api/canva/export', { method: 'POST', body: { requestId: webcrypto.randomUUID(), planId: middle.planId, pages: [2] } })).json();
  await request(`/api/canva/export/${middleJob.jobId}`);
  await request(`/api/canva/export/${middleJob.jobId}`);
  designPages = [{ id: 'P1', page_number: 1 }, { id: 'P2', page_number: 2 }, { id: 'NEW', page_number: 3 }];
  const beforeStaleDownload = calls.length;
  assert.equal((await request(`/api/canva/export/${middleJob.jobId}/file`)).status, 409);
  assert.ok(!calls.slice(beforeStaleDownload).some((call) => call.url.includes('export-download')), 'Changing page order aborts rather than importing the wrong page');
  designPages = [{ page_number: 1 }];
  assert.equal((await request('/api/canva/plan', { method: 'POST' })).status, 409, 'Missing provider identities never trigger a whole-book fallback');
  designPages = Array.from({ length: 201 }, (_, index) => ({ id: `P${index + 1}`, page_number: index + 1 }));
  assert.equal((await run('canvaDesignPages(testEnv)')).length, 201, 'Page discovery is paginated');
  designPages = originalPages;
  storage.delete('app-state.json');
  poll = 0;
  const exportsBeforeLegacy = calls.filter((call) => call.url.endsWith('/exports')).length;
  const requestId = webcrypto.randomUUID();
  const job = await (await request("/api/canva/export", { method: "POST", body: { designId: "not-allowed", requestId } })).json();
  const duplicate = await (await request("/api/canva/export", { method: "POST", body: { requestId } })).json();
  assert.equal(duplicate.jobId, job.jobId);
  assert.equal(calls.filter((call) => call.url.endsWith("/exports")).length, exportsBeforeLegacy + 1);
  assert.equal((await (await request(`/api/canva/export/${job.jobId}`)).json()).status, "in_progress");
  assert.equal((await (await request(`/api/canva/export/${job.jobId}`)).json()).status, "success");
  const pdf = await request(`/api/canva/export/${job.jobId}/file`);
  assert.equal(pdf.headers.get("Content-Type"), "application/pdf");
  assert.match(await pdf.text(), /^%PDF-/);
  for (const mode of ["redirect", "relative"]) {
    downloadMode = mode;
    const response = await request(`/api/canva/export/${job.jobId}/file`);
    assert.equal(response.status, 200, mode);
    assert.match(await response.text(), /^%PDF-/);
  }
  for (const [mode, expectedStatus, code] of [
    ["untrusted", 502, "download_url_invalid"], ["downgrade", 502, "download_url_invalid"],
    ["loop", 502, "download_redirect_invalid"], ["missing-location", 502, "download_redirect_invalid"],
    ["network", 502, "download_transport_error"], ["timeout", 502, "download_timeout"],
    ["stream-error", 502, "download_transport_error"], ["http", 502, "download_http_error"],
    ["empty", 502, "download_empty"], ["oversized", 413, "download_too_large"], ["not-pdf", 502, "download_not_pdf"],
  ]) {
    downloadMode = mode;
    const before = calls.length;
    const response = await request(`/api/canva/export/${job.jobId}/file`);
    assert.equal(response.status, expectedStatus, mode);
    const error = await response.json();
    assert.equal(error.code, code, mode);
    assert.ok(!JSON.stringify(error).includes("private"), mode);
    assert.equal((await (await request("/api/canva/status")).json()).connected, true, "Download errors must not erase the connection");
    assert.ok(!calls.slice(before).some((call) => call.url.includes("attacker.test")));
    if (mode === "loop") assert.equal(calls.length - before, 5, "Bound redirect hops");
  }
  downloadMode = "direct";
  licenseRequired = true;
  const licenseError = await request(`/api/canva/export/${job.jobId}`);
  assert.equal(licenseError.status, 422);
  const licenseDetails = await licenseError.json();
  assert.equal(licenseDetails.code, "license_required");
  assert.match(licenseDetails.error, /brez vodnega žiga/);
  assert.ok(!licenseDetails.error.includes("Private provider"));
  licenseRequired = false;
  assert.ok(diagnosticLogs.some((entry) => entry.includes("download_transport_error")));
  assert.ok(!diagnosticLogs.join("").match(/fixture-secret|private-stream-data|https:|fixture-access|fixture-refresh/), "Diagnostic logs must not contain secrets or signed URLs");
  const tokens = await run("loadCanvaPrivate(testEnv, 'tokens')");
  tokens.expiresAt = 0;
  context.expiredTokens = tokens;
  await run("saveCanvaPrivate(testEnv, 'tokens', expiredTokens)");
  await Promise.all([request(`/api/canva/export/${job.jobId}`), request(`/api/canva/export/${job.jobId}`)]);
  assert.equal(refreshes, 1);
  assert.throws(() => run("canvaDownloadUrl('https://attacker.test/secret')"));
  assert.throws(() => run("canvaDownloadUrl('https://export-download.canva.com:8443/file')"));
  failExport = true;
  const rejected = await request("/api/canva/export", { method: "POST", body: { requestId: webcrypto.randomUUID() } });
  assert.equal(rejected.status, 403);
  assert.ok(!(await rejected.text()).includes("Provider details"));
  assert.ok(!storage.has("app-state.json") && !storage.has("songbook.json"), "Failed exports must not alter the songbook");
  await request("/api/canva/disconnect", { method: "POST" });
  assert.equal((await (await request("/api/canva/status")).json()).connected, false);
  console.log("Canva connection: OAuth, encryption, refresh rotation, export, direct/redirected PDF download, redirect/HTTPS limits, timeout/network/stream/HTTP/size errors, secret-free diagnostics and auth OK. Provider calls mocked.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
