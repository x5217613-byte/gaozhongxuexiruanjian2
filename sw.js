
const CACHE_NAME = 'hs-study-suite-v1';
const CORE = [
  './index.html','./home.html','./dashboard.html','./login.html','./selfcheck.html',
  './manifest.webmanifest',
  './assets/theme.css','./assets/components.css','./assets/layout.css','./assets/sidebar_plus.css',
  './assets/theme.js','./assets/layout.js','./assets/layout_plus.js','./assets/theme_customizer.js',
  './assets/charts.js','./assets/shortcuts.js','./assets/tiny_pdf_bookmarks.js','./assets/wrongbook_pdf_export_bookmarks.js',
  './assets/english_read_aloud.js','./assets/english_read_aloud_plus.js',
  './assets/wrongbook_print_paged_precise.js','./assets/wrongbook_print_enhance.js','./assets/pdf_export_buttons.js',
  './assets/sync_adapters.js','./assets/sync_adapters_plus.js','./assets/knowledge_infer.js',
  './icons/icon-192.png','./icons/icon-512.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=> c.addAll(CORE)));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=> Promise.all(keys.filter(k=> k!==CACHE_NAME).map(k=> caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(r=>{
      const copy = r.clone();
      caches.open(CACHE_NAME).then(c=> c.put(req, copy));
      return r;
    }).catch(()=> cached))
  );
});
