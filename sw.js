// REAL Therapies — Service Worker
// Caches the app shell for full offline use

const CACHE_NAME = 'real-therapies-v1';

// Everything needed to run offline
const PRECACHE = [
  './REAL Therapies App.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  // External fonts & scripts — cached on first load
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap',
];

// ── Install: pre-cache the app shell ────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local files strictly; external ones best-effort
      const local  = PRECACHE.filter(u => u.startsWith('./'));
      const remote = PRECACHE.filter(u => !u.startsWith('./'));
      return cache.addAll(local).then(() =>
        Promise.allSettled(remote.map(u => cache.add(u)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for same-origin; network-first for CDN ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Google Fonts / unpkg CDN — stale-while-revalidate
  if (url.hostname.includes('fonts.g') || url.hostname.includes('unpkg.com')) {
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(res => {
          caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Same-origin assets — cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
        }
        return res;
      }).catch(() => {
        // Offline fallback: return the app shell for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('./REAL Therapies App.html');
        }
      });
    })
  );
});
