// The Jadāwil keeps a copy of its own files, so that it opens with no connection, installed or not.
// It fetches nothing but these files, from where it was served; nothing leaves the device.
// The build writes the cache name from a hash of the files, so a new build is a new cache.
const CACHE = 'jadawil-a3822d00076b';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
const FILE_URLS = new Set(FILES.map(f => new URL(f, self.location.href).href));

// ./ and ./index.html are the same page: whichever is fetched is kept under both, so the two never hold different builds.
const PAGE = [new URL('./', self.location.href).href, new URL('./index.html', self.location.href).href];

// Install and refresh ask the server, not the browser's HTTP cache: a new build is seen on the next opening.
// The page carries the atlas, so it is fetched once and kept under both its names.
const fromServer = href => fetch(href, { cache: 'no-cache', credentials: 'same-origin' });
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const page = await fromServer(PAGE[0]);
    if (!page.ok) throw Error('The page could not be fetched.');
    await Promise.all([c.put(PAGE[0], page.clone()), c.put(PAGE[1], page)]);
    await c.addAll(FILES.filter(f => !PAGE.includes(new URL(f, self.location.href).href)).map(f => new Request(f, { cache: 'no-cache' })));
    await self.skipWaiting();
  })());
});
// Only the Jadāwil's own older copies are cleared: other pages on this site keep their caches under other names. A newer
// build taking the place of an older copy tells the pages open on it, which say so and leave the reload to the student.
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const older = (await caches.keys()).filter(k => k.startsWith('jadawil-') && k !== CACHE);
    await Promise.all(older.map(k => caches.delete(k)));
    await self.clients.claim();
    if (older.length) for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage({ type: 'newBuild' });
  })());
});
// The copy answers at once; a fresh one is fetched behind it when there is a connection, for the next opening.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  const url = new URL(r.url); url.search = ''; url.hash = '';
  if (!FILE_URLS.has(url.href)) return;
  const fresh = fromServer(url.href).catch(() => null);
  const refresh = fresh.then(async res => {
    if (!res || !res.ok || res.redirected) return;
    const hrefs = PAGE.includes(url.href) ? PAGE : [url.href];
    try {
      const copies = hrefs.map(() => res.clone()), c = await caches.open(CACHE);
      await Promise.all(hrefs.map((h, i) => c.put(h, copies[i])));
    } catch (_) {}
  });
  const cached = caches.open(CACHE).then(c => c.match(url.href)).catch(() => null);
  e.respondWith(cached.then(hit => hit || fresh.then(res => (res ? res.clone() : Response.error()))));
  e.waitUntil(refresh);
});
