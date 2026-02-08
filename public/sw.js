// Service Worker for OmniBiz Connect — Offline-first for African markets
const CACHE_VERSION = 3;
const CACHE_NAME = `omnibiz-cache-v${CACHE_VERSION}`;

// Core app shell to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/favicon.ico',
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v' + CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── Activate — clean old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v' + CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch — strategy depends on request type ───────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase API requests (offline handled via IndexedDB in the app)
  if (request.url.includes('supabase.co')) return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // ── Strategy 1: Cache-first for hashed static assets (/assets/*)
  //    Vite produces content-hashed filenames so they are immutable.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
      })
    );
    return;
  }

  // ── Strategy 2: Cache-first for icons and other static files in public/
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json' || url.pathname === '/favicon.ico') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
      })
    );
    return;
  }

  // ── Strategy 3: Network-first for navigation (HTML pages)
  //    Try network; on failure serve cached /index.html (SPA shell).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest HTML shell
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // ── Strategy 4: Stale-while-revalidate for everything else
  //    Serve from cache immediately, fetch in background and update cache.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // If both cache and network fail, return an offline JSON response
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'No network connection available' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        });

      return cached || fetchPromise;
    })
  );
});

// ─── Background Sync ────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event received:', event.tag);
  if (event.tag === 'sync-offline-orders') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  console.log('[SW] Notifying clients to sync offline orders...');
  const allClients = await self.clients.matchAll({ type: 'window' });
  for (const client of allClients) {
    client.postMessage({ type: 'SYNC_ORDERS' });
  }
}

// ─── Messages from the app ─────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    notifyClientsToSync();
  }
});
