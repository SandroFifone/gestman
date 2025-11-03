// Service Worker per PWA GESTMAN
const CACHE_NAME = 'gestman-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/AAM.png'
];

// Installa il service worker e crea la cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Intercetta le richieste di rete
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Restituisci dalla cache se disponibile, altrimenti fetch dalla rete
        return response || fetch(event.request);
      }
    )
  );
});

// Gestisce la navigazione per SPA
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
  }
});