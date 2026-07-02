/* オフライン対応 SW。更新反映を優先し network-first、オフライン時はキャッシュへフォールバック。 */
const CACHE = "iem-audition-log-v1";
const ASSETS = [
  "./iem-audition-log.html",
  "./styles/app.css",
  "./src/main.js","./src/ui.js","./src/core.js","./src/data.js",
  "./manifest.webmanifest","./icon.svg"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(hit => hit || caches.match("./iem-audition-log.html")))
  );
});
