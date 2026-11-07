const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const root = path.resolve(__dirname, "..");
const year = 365 * 24 * 60 * 60;
let now = Date.UTC(2026, 9, 16);
class TestDate extends Date { static now() { return now; } }
const env = { ADMIN_USERNAME: "test-admin", ADMIN_PASSWORD: "test-password", SESSION_SECRET: "test-session-secret" };
const workerContext = vm.createContext({
  crypto: webcrypto, TextEncoder, TextDecoder, Uint8Array, Request, Response,
  URL, btoa, atob, Date: TestDate, console,
});
vm.runInContext(fs.readFileSync(path.join(root, "dist/server/index.js"), "utf8")
  .replace("export default {", "globalThis.worker = {"), workerContext);
const server = (route, options = {}, settings = env) => workerContext.worker.fetch(
  new Request("https://choir.test" + route, options), settings,
);
const signedCookie = async (username, expiresAt) => {
  const payload = Buffer.from(JSON.stringify({ username, expiresAt })).toString("base64url");
  const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = Buffer.from(await webcrypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))).toString("base64url");
  return `zborcek_admin=${payload}.${signature}`;
};
const payloadFor = (cookie) => JSON.parse(Buffer.from(cookie.split("=")[1].split(".")[0], "base64url"));

function device() {
  let cookie = "", expiresAt = 0, offline = false;
  let releaseRequest = null;
  const requests = new Set();
  const fetch = (route, options = {}) => {
    const task = (async () => {
      assert.equal(options.credentials, "same-origin");
      if (offline) throw new Error("Offline");
      if (releaseRequest) await releaseRequest;
      const response = await server(route, { ...options, headers: {
        ...options.headers, Cookie: expiresAt > now ? cookie : "",
      } });
      const setCookie = response.headers.get("Set-Cookie");
      if (setCookie) {
        cookie = setCookie.split(";")[0];
        expiresAt = now + Number(/Max-Age=(\d+)/.exec(setCookie)[1]) * 1000;
      }
      return response;
    })();
    requests.add(task);
    task.then(() => requests.delete(task), () => requests.delete(task));
    return task;
  };
  const idle = async () => {
    while (requests.size) await Promise.allSettled([...requests]);
    await new Promise(setImmediate);
  };
  function open() {
    const documentEvents = {}, windowEvents = {};
    const document = {
      visibilityState: "visible", querySelector: () => null, dispatchEvent() {},
      addEventListener: (name, action) => { documentEvents[name] = action; },
    };
    const window = { addEventListener: (name, action) => { windowEvents[name] = action; } };
    const context = vm.createContext({
      window, document, fetch, URLSearchParams,
      CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
      location: { protocol: "https:", hostname: "choir.test", search: "?source=app", pathname: "/", assign() {} },
    });
    vm.runInContext(fs.readFileSync(path.join(root, "auth.js"), "utf8"), context);
    return { api: window.zborcekAuth, documentEvents, windowEvents };
  }
  return {
    open, idle,
    offline(value) { offline = value; },
    hold() { let release; releaseRequest = new Promise((resolve) => { release = resolve; });
      return () => { releaseRequest = null; release(); }; },
    cookie: () => cookie,
  };
}

async function main() {
  const login = await server("/api/login", { method: "POST", body: JSON.stringify({ username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD }) });
  const cookie = login.headers.get("Set-Cookie");
  assert.equal(login.status, 200);
  assert.match(cookie, new RegExp(`Max-Age=${year};`));
  for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Path=/"]) assert.ok(cookie.includes(flag));
  assert.equal(payloadFor(cookie).expiresAt, now + year * 1000);
  assert.equal((await server("/api/login", { method: "POST", body: JSON.stringify({ username: env.ADMIN_USERNAME, password: "wrong" }) })).status, 401);
  for (const bad of ["", "zborcek_admin=forged.invalid", await signedCookie("other-user", now + 60000), await signedCookie(env.ADMIN_USERNAME, now - 1)]) {
    const response = await server("/api/auth-state", { headers: { Cookie: bad } });
    assert.equal((await response.json()).isAdmin, false);
    assert.equal(response.headers.get("Set-Cookie"), null);
    assert.equal((await server("/api/state", { headers: { Cookie: bad } })).status, 401);
  }
  const legacy = await server("/api/auth-state", { headers: { Cookie: await signedCookie(env.ADMIN_USERNAME, now + 12 * 60 * 60 * 1000) } });
  assert.equal((await legacy.json()).isAdmin, true);
  assert.equal(payloadFor(legacy.headers.get("Set-Cookie")).expiresAt, now + year * 1000);

  for (const label of ["phone", "computer"]) {
    const browser = device();
    let app = browser.open();
    await browser.idle();
    assert.equal(app.api.state.isAdmin, false, label);
    await app.api.signIn(env.ADMIN_USERNAME, env.ADMIN_PASSWORD);
    assert.equal(app.api.state.isAdmin, true, label);
    const previousExpiry = payloadFor(browser.cookie()).expiresAt;
    now += 200 * 24 * 60 * 60 * 1000;
    app = browser.open();
    await browser.idle();
    assert.equal(app.api.state.isAdmin, true, `${label}: reopen without a password`);
    assert.ok(payloadFor(browser.cookie()).expiresAt > previousExpiry);
    now += 200 * 24 * 60 * 60 * 1000;
    app.documentEvents.visibilitychange();
    await browser.idle();
    assert.equal(app.api.state.isAdmin, true, `${label}: return from background`);
    browser.offline(true);
    app.windowEvents.online();
    await browser.idle();
    assert.equal(app.api.state.isAdmin, true, `${label}: network interruption`);
    browser.offline(false);
    const release = browser.hold();
    app.windowEvents.pageshow({ persisted: true });
    const logout = app.api.signOut();
    release();
    await logout;
    await browser.idle();
    assert.equal(app.api.state.isAdmin, false);
    app = browser.open();
    await browser.idle();
    assert.equal(app.api.state.isAdmin, false, `${label}: logout survives reopen`);
    await app.api.signIn(env.ADMIN_USERNAME, env.ADMIN_PASSWORD);
    now += (year + 1) * 1000;
    app = browser.open();
    await browser.idle();
    assert.equal(app.api.state.isAdmin, false, `${label}: expired session is not revived`);
  }
  console.log("Persistent login: phone/computer reopen, renewal, legacy migration, offline, logout and invalid-session rejection OK.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
