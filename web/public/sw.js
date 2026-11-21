// Minimal app-shell service worker (HR-007): the jornada reloads without network after the first visit.
// Navigations: network first, cached index.html when offline. Static assets: cache first. /api is never cached.
const CACHE = "hilo-rosa-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/index.html"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r || Response.error())),
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// The page sends the assets it loaded before this worker took control (first visit), so they work offline too.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "cache-urls" || !Array.isArray(data.urls)) return;
  const urls = data.urls.filter((u) => {
    try {
      const url = new URL(u, self.location.origin);
      return url.origin === self.location.origin && !url.pathname.startsWith("/api/");
    } catch {
      return false;
    }
  });
  event.waitUntil(caches.open(CACHE).then((c) => Promise.all(urls.map((u) => c.add(u).catch(() => undefined)))));
});
