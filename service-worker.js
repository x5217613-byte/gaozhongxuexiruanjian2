const CACHE_NAME = 'hs-suite-cache-v1';
const CORE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './data_manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Cache-first for JSON & core assets
  if (url.pathname.endsWith('.json') || CORE.some(x => url.pathname.endsWith(x.replace('./','/')))) {
    e.respondWith(
      caches.match(e.request).then(res => res || fetch(e.request).then(net => {
        const copy = net.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return net;
      }).catch(()=>res))
    );
  }
});
