/* ============================================================
   Seedwel Investment LTD — service worker
   ------------------------------------------------------------
   Deliberately conservative. Its only jobs are:
     1. Serve a friendly offline page when navigation fails.
     2. Cache the static shell (CSS/JS/icons) for repeat visits.

   It NEVER caches:
     - the private portal (/admin, /dashboard, /login, /register, /verify)
     - Firebase or Cloudinary traffic
     - anything that is not a GET request
   so no personal or authenticated data is ever written to disk.
   ============================================================ */

const VERSION = 'seedwel-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = '/offline.html';

/* Files worth having available immediately. */
const PRECACHE = [
    OFFLINE_URL,
    '/assets/css/site.css',
    '/assets/js/site.js',
    '/favicon.svg',
    '/site.webmanifest',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png'
];

/* Never touched by the service worker. */
const PRIVATE_PATHS = ['/admin', '/dashboard', '/login', '/register', '/verify', '/member', '/api'];

function isPrivate(pathname) {
    return PRIVATE_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            // Individual failures must not abort the whole install.
            .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Only handle our own origin; Firebase/Cloudinary/CDN traffic passes straight through.
    if (url.origin !== self.location.origin) return;

    // The private portal is never cached or intercepted.
    if (isPrivate(url.pathname)) return;

    // Navigations: network first, fall back to cache, then to the offline page.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() =>
                    caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
                )
        );
        return;
    }

    // Static assets: serve from cache, refresh in the background.
    if (/\.(css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const network = fetch(request)
                    .then((response) => {
                        if (response && response.status === 200) {
                            const copy = response.clone();
                            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
                        }
                        return response;
                    })
                    .catch(() => cached);
                return cached || network;
            })
        );
    }
});
