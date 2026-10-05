// Кэширует файлы приложения, чтобы оно открывалось в зале без интернета.
const CACHE = 'tablo-v9';
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "vendor/jszip.min.js",
  "fonts/fonts.css",
  "fonts/oswald-cyrillic-500-normal.woff2",
  "fonts/oswald-latin-500-normal.woff2",
  "fonts/oswald-cyrillic-600-normal.woff2",
  "fonts/oswald-latin-600-normal.woff2",
  "fonts/oswald-cyrillic-700-normal.woff2",
  "fonts/oswald-latin-700-normal.woff2",
  "fonts/golos-text-cyrillic-400-normal.woff2",
  "fonts/golos-text-latin-400-normal.woff2",
  "fonts/golos-text-cyrillic-500-normal.woff2",
  "fonts/golos-text-latin-500-normal.woff2",
  "fonts/golos-text-cyrillic-600-normal.woff2",
  "fonts/golos-text-latin-600-normal.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сначала отдаем из кэша, в фоне обновляем: новая версия появится при следующем открытии.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
