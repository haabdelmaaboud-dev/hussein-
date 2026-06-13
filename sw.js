/* Shawarmer IT Operations — Service Worker */
const CACHE_NAME = 'shawarmer-it-v5.3';
const BASE = '/hussein-';
const STATIC_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/css/main.css',
  BASE + '/js/config.js',
  BASE + '/js/api.js',
  BASE + '/js/state.js',
  BASE + '/js/ui.js',
  BASE + '/js/notifications.js',
  BASE + '/js/communication.js',
  BASE + '/js/views/dashboard.js',
  BASE + '/js/views/stores.js',
  BASE + '/js/views/critical.js',
  BASE + '/js/views/reports.js',
  BASE + '/js/views/engineers.js',
  BASE + '/js/views/alerts.js',
  BASE + '/js/views/admin.js',
  BASE + '/js/views/auditlog.js',
  BASE + '/js/views/history.js',
  BASE + '/js/views/profile.js',
  BASE + '/js/modals.js',
  BASE + '/js/app.js',
  BASE + '/assets/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Failed to cache:', url, err))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(BASE + '/index.html').then((res) => res || new Response('Offline', { status: 503 }));
        }
        return new Response('', { status: 503 });
      });
    })
  );
});
