const CACHE_NAME = 'price-tracker-v2.0.2';
const ASSETS = [
  './', './index.html', './css/app.css',
  './js/db.js', './js/analysis.js', './js/app.js', './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => {
      return Promise.all(
        ASSETS.map(url => {
          const req = new Request(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
          return fetch(req).then(res => {
            if (!res.ok) throw new Error('Fetch failed for ' + url);
            return c.put(url, res.clone());
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
