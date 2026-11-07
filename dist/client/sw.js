const CACHE_NAME = "zborcek-app-v41";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=20261026-chat-calendar",
  "./auth-config.js?v=20260915-public",
  "./auth.js?v=20261016-remember",
  "./song-catalog.js?v=20261024-miklavz",
  "./song-numbering.js?v=20261025-distinct-arrangements",
  "./canva-client.js?v=20261024-new-pages",
  "./presentation-update.js?v=20261025-unified-usb",
  "./state-sync.js?v=20261025-live-sync",
  "./live-sync.js?v=20261025-live-sync",
  "./vendor/rrule-2.8.1.min.js",
  "./calendar-draft.js?v=20261025-calendar-repeat",
  "./calendar-events.js?v=20261026-chat-calendar",
  "./app.js?v=20261026-chord-transpose",
  "./install-app.js?v=20261025-chrome-install",
  "./zborcek-predstavitev-pesmarica.js?v=20260915-public",
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
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
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
