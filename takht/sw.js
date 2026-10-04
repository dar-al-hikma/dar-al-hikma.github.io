// The Takht keeps a copy of its own files, so that it opens with no connection, installed or not.
// It fetches nothing but these files, from where it was served; nothing leaves the device.
const CACHE = 'takht-3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const FILE_URLS = new Set(FILES.map(f => new URL(f, self.location.href).href));

// Install and refresh ask the server, not the browser's HTTP cache: a new build is seen on the next opening,
// and a new cache name does not copy the old files into the new cache (an unchanged file costs a 304).
const fromServer = href => fetch(href, { cache: 'no-cache', credentials: 'same-origin' });
// ./ and ./index.html are the same page: whichever is fetched is kept under both, so the two never hold different builds
const PAGE = [new URL('./', self.location.href).href, new URL('./index.html', self.location.href).href];
// Install fetches the page once and keeps that one response under both addresses: a deploy between two requests
// for it could otherwise leave two builds behind them for as long as the device stays offline.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([
    c.addAll(FILES.filter(f => !PAGE.includes(new URL(f, self.location.href).href)).map(f => new Request(f, { cache: 'no-cache' }))),
    fromServer(PAGE[0]).then(page => {
      if (!page.ok) throw new Error('page ' + page.status);
      const copies = PAGE.map(() => page.clone());
      return Promise.all(PAGE.map((h, i) => c.put(h, copies[i])));
    }),
  ])).then(() => self.skipWaiting()));
});
// Only the Takht's own older copies are cleared: other pages on this site keep their caches under other names.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('takht-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// The copy answers at once; a fresh one is fetched behind it when there is a connection, for the next opening.
// Refreshes are kept in the order they finish: if one begun before a deploy finishes after one begun after it, the
// older build stays until the next opening with a connection refreshes again.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  // These static files do not vary by query. Read and write one key, keeping headers for Vary matching.
  const url = new URL(r.url); url.search = ''; url.hash = '';
  if (!FILE_URLS.has(url.href)) return;
  const key = new Request(url.href, { headers: r.headers });
  const fresh = fromServer(url.href).catch(() => null);
  const refresh = fresh.then(async res => {
    if (!res || !res.ok) return;
    const hrefs = PAGE.includes(url.href) ? PAGE : [url.href];
    try {
      const copies = hrefs.map(() => res.clone()), c = await caches.open(CACHE);
      await Promise.all(hrefs.map((h, i) => c.put(new Request(h, { headers: r.headers }), copies[i])));
    } catch (_) {}
  });
  const cached = caches.open(CACHE).then(c => c.match(key)).catch(() => null);
  e.respondWith(cached.then(hit => hit || fresh.then(res => res || Response.error())));
  e.waitUntil(refresh);
});
