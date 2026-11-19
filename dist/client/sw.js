const CACHE_NAME = "zborcek-app-v55";
const BIRTHDAY_CACHE = "zborcek-private-birthdays-v1";
const BIRTHDAY_DATA_URL = new URL("./__birthday-data", self.registration.scope).href;
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20261119-single-chord-column",
  "./auth-config.js?v=20260915-public",
  "./auth.js?v=20261115-fast-start",
  "./song-catalog.js?v=20261119-angelcek-2",
  "./song-numbering.js?v=20261025-distinct-arrangements",
  "./canva-client.js?v=20261024-new-pages",
  "./presentation-update.js?v=20261025-unified-usb",
  "./state-sync.js?v=20261025-live-sync",
  "./live-sync.js?v=20261025-live-sync",
  "./vendor/rrule-2.8.1.min.js",
  "./calendar-draft.js?v=20261025-calendar-repeat",
  "./calendar-events.js?v=20261115-mass-fields-2",
  "./app.js?v=20261119-single-chord-column",
  "./install-app.js?v=20261115-poldi4-restore",
  "./manifest.webmanifest",
  "./assets/icons/zborcek-192.png",
  "./assets/icons/zborcek-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== BIRTHDAY_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => cache.match(request)).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});

async function readBirthdayData() {
  const cache = await caches.open(BIRTHDAY_CACHE);
  const response = await cache.match(BIRTHDAY_DATA_URL);
  return response ? response.json() : { people: [], lastNotified: "" };
}

async function writeBirthdayData(data) {
  const cache = await caches.open(BIRTHDAY_CACHE);
  await cache.put(BIRTHDAY_DATA_URL, new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  }));
}

function ljubljanaToday() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Ljubljana", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function checkBirthdays() {
  const data = await readBirthdayData();
  const today = ljubljanaToday();
  if (data.lastNotified === today) return;
  const monthDay = today.slice(5);
  const names = (data.people || []).filter((person) => String(person.birthDate || "").slice(5) === monthDay)
    .map((person) => String(person.name || "").trim()).filter(Boolean);
  if (!names.length) return;
  await self.registration.showNotification(names.length === 1 ? "Rojstni dan v zborčku" : "Rojstni dnevi v zborčku", {
    body: names.length === 1 ? `Danes praznuje ${names[0]}.` : `Danes praznujejo: ${names.join(", ")}.`,
    icon: "./assets/icons/zborcek-192.png",
    badge: "./assets/icons/zborcek-192.png",
    tag: `zborcek-birthday-${today}`,
    data: { url: "./?admin=1&view=people" },
  });
  await writeBirthdayData({ ...data, lastNotified: today });
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_BIRTHDAYS") {
    event.waitUntil(readBirthdayData().then((previous) => writeBirthdayData({ people: event.data.people || [], lastNotified: previous.lastNotified || "" })).then(checkBirthdays));
  }
  if (event.data?.type === "CLEAR_BIRTHDAYS") event.waitUntil(caches.delete(BIRTHDAY_CACHE));
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "zborcek-birthday-check") event.waitUntil(checkBirthdays());
});

self.addEventListener("sync", (event) => {
  if (event.tag === "zborcek-birthday-check") event.waitUntil(checkBirthdays());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.registration.scope));
    if (!existing) return clients.openWindow(event.notification.data?.url || "./?admin=1");
    existing.postMessage({ type: "OPEN_BIRTHDAYS" });
    return existing.focus();
  }));
});
