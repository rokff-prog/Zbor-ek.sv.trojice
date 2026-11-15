const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const events = {}, notifications = [], stored = new Map();
const cache = {
  async match(key) { const value = stored.get(String(key)); return value === undefined ? undefined : new Response(value); },
  async put(key, response) { stored.set(String(key), await response.text()); },
};
const context = vm.createContext({
  URL, Response, Intl, Date,
  self: {
    location: { origin: "https://choir.test" },
    registration: { scope: "https://choir.test/", async showNotification(title, options) { notifications.push({ title, options }); } },
    addEventListener(name, action) { events[name] = action; },
    clients: { matchAll: async () => [] },
  },
  clients: { matchAll: async () => [], openWindow: async () => {} },
  caches: { open: async () => cache, delete: async () => { stored.clear(); }, keys: async () => [] },
  fetch: async () => ({ ok: true, clone: () => ({}) }),
});
vm.runInContext(fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8"), context);

async function dispatchMessage(data) {
  let promise;
  events.message({ data, waitUntil(value) { promise = value; } });
  if (promise) await promise;
}

(async () => {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Ljubljana", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  await dispatchMessage({ type: "SYNC_BIRTHDAYS", people: [{ id: "p1", name: "Testni otrok", birthDate: `2015-${today.slice(5)}` }] });
  assert.equal(notifications.length, 1);
  assert.match(notifications[0].options.body, /Testni otrok/);
  await dispatchMessage({ type: "SYNC_BIRTHDAYS", people: [{ id: "p1", name: "Testni otrok", birthDate: `2015-${today.slice(5)}` }] });
  assert.equal(notifications.length, 1, "The same birthday is notified only once per day");
  await dispatchMessage({ type: "CLEAR_BIRTHDAYS" });
  assert.equal(stored.size, 0);
  console.log("Birthday notifications: private device data, same-day reminder, daily deduplication and logout cleanup OK.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
