// The Takht keeps a copy of its own files, so that it opens with no connection, installed or not.
// It fetches nothing but these files, from where it was served; nothing leaves the device.
const CACHE = 'takht-2';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const FILE_URLS = new Set(FILES.map(f => new URL(f, self.location.href).href));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
// Only the Takht's own older copies are cleared: other pages on this site keep their caches under other names.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('takht-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// The copy answers at once; a fresh one is fetched behind it when there is a connection, for the next opening.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  // These static files do not vary by query. Read and write one key, keeping headers for Vary matching.
  const url = new URL(r.url); url.search = ''; url.hash = '';
  if (!FILE_URLS.has(url.href)) return;
  const key = new Request(url.href, { headers: r.headers });
  const fresh = fetch(r).catch(() => null);
  const refresh = fresh.then(async res => {
    if (!res || !res.ok) return;
    try { const copy = res.clone(); const c = await caches.open(CACHE); await c.put(key, copy); } catch (_) {}
  });
  const cached = caches.open(CACHE).then(c => c.match(key)).catch(() => null);
  e.respondWith(cached.then(hit => hit || fresh.then(res => res || Response.error())));
  e.waitUntil(refresh);
});
