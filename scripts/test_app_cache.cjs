const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const events = {};
let matched, fetched;
const context = vm.createContext({
  URL,
  self: { location: { origin: "https://choir.test" }, addEventListener: (name, action) => { events[name] = action; } },
  caches: { open: async () => ({ match: async (request) => { matched = request.url; return undefined; }, put: async () => {} }) },
  fetch: async (request) => { fetched = request.url; return { ok: true, clone: () => ({}) }; },
});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8"), context);
async function main() {
  let result;
  const request = { method: "GET", url: "https://choir.test/app.js?v=20261016-chord-fix" };
  events.fetch({ request, respondWith: (response) => { result = response; } });
  await result;
  assert.equal(matched, request.url);
  assert.equal(fetched, request.url);
  let intercepted = false;
  events.fetch({ request: { ...request, url: "https://choir.test/api/state" }, respondWith: () => { intercepted = true; } });
  assert.equal(intercepted, false);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8"), /ignoreSearch/);
  console.log("App cache: versioned assets use exact URLs, old query versions cannot mask updates, API requests bypass cache OK.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
