/* Picsweep service worker — hand-written, no dependency.
 *
 * Deliberately conservative: this app is auth-gated and API-driven, so
 * caching the wrong thing means stale data or a logged-out shell.
 *
 * Strategy
 *   navigation (HTML)  -> network-first, offline fallback only
 *   static assets      -> stale-while-revalidate
 *   /api/**, /v1/**    -> never touched (network only, no caching)
 *
 * Bump VERSION to invalidate every cache on next visit.
 */

const VERSION = 'v3';
const STATIC_CACHE = `picsweep-static-${VERSION}`;
const SHELL_CACHE = `picsweep-shell-${VERSION}`;

// Precached on install: the offline shell + icons.
const PRECACHE = [
  '/offline.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
];

// Requests we must never intercept.
function isApi(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/');
}

function isStaticAsset(url) {
  return /\.(?:js|css|woff2?|png|jpe?g|svg|webp|ico)$/i.test(url.pathname);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== SHELL_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Firebase, fonts, CDN
  if (isApi(url)) return; // let the network handle API calls untouched

  // Navigations: always try the network so users get the current app.
  // Offline only -> show offline.html.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match('/offline.html')
          .then((r) => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // Static assets are content-hashed by the Angular build, so a given URL's
  // bytes never change. Cache-first is correct AND avoids the "stale app for
  // one load after deploy" problem that stale-while-revalidate caused.
  // The SW itself is never cached by nginx, so a new build ships a new SW
  // version and this cache is dropped on activate.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then(
          (cached) => cached || fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
        )
      )
    );
  }
});

// Let the page tell a waiting worker to take over immediately.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
