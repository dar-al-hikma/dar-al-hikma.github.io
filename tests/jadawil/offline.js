// Opened once online, the Jadāwil opens with no connection and still works. Served over http at /jadawil/, as the site
// serves it; the network is then cut and the page reopened from its own address, from index.html and from its
// start_url, and each time it searches the atlas and gathers the lesson's sheet. Then a next build is served (the
// review's switchable server): its worker clears the older Jadāwil copy and only that, not another piece's cache.
// Needs sw.js, the manifest and the icons beside the page under test.
const H = require('./h'); const { check, DIR, path, fs } = H;
const os = require('os');
const SW = fs.readFileSync(path.join(DIR, 'sw.js'), 'utf8'), CACHE = SW.match(/const CACHE = '([^']+)'/)[1];
const FILES = JSON.parse(SW.match(/const FILES = (\[[^\]]*\]);/)[1].replace(/'/g, '"'));
const L = JSON.parse(fs.readFileSync(path.join(__dirname, 'lesson-values.json'), 'utf8')).native1950;
const cacheState = p => p.evaluate(async () => { const r = {}; for (const k of (await caches.keys()).sort()) r[k] = (await (await caches.open(k)).keys()).map(q => q.url).sort(); return r; });

// the student's two errands: find Minneapolis in the atlas, and gather the lesson's sheet for it
async function work(p) {
  await p.locator('[data-tab="atlas"]').click(); await p.locator('#citySearch').fill('Minneapolis');
  // the list answers as it is typed: wait until its first entry is the answer
  const found = await p.waitForFunction(() => { const e = document.querySelector('#cityResults [data-city]'); return e && /^Minneapolis/.test(e.textContent.trim()) && e.textContent; }, null, { timeout: 15000 }).then(h => h.jsonValue()).catch(() => '');
  await p.locator('#cityResults [data-city]').first().click(); await p.locator('#usePlace').click();
  for (const [sel, v] of [['#birthDate', L.localDate], ['#birthTime', L.localTime]]) { await p.locator(sel).fill(v); await p.dispatchEvent(sel, 'change'); }
  await p.waitForTimeout(200); await p.locator('#worksheetForm button[type=submit]').click(); await p.waitForTimeout(300);
  const ut = await p.$eval('.ut-badge', e => e.textContent.replace(/\s+/g, ' ').trim());
  return `${/^Minneapolis/.test(found.trim())} ${ut.includes(L.rows['8'] + ' UT')}`;
}

H.main(async () => {
  const srv = await H.serve(), b = await H.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  // before the Jadāwil is ever opened: another page on the site has its own cache, the Takht its own, and an older
  // Jadāwil left one
  const p0 = await ctx.newPage(); await p0.goto(srv.origin + '/elsewhere/');
  await p0.evaluate(async () => { await (await caches.open('other-app-offline')).put('/elsewhere/data', new Response('sentinel'));
    await (await caches.open('takht-0')).put('/takht/', new Response('takht')); await (await caches.open('jadawil-0')).put('/jadawil/old', new Response('old')); });
  await p0.close();
  const outside = [], errors = []; ctx.on('request', r => { const u = r.url(); if (!u.startsWith(srv.base) && !u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith(srv.origin + '/elsewhere/')) outside.push(u); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(srv.base); await H.ready(p);
  await p.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => 1), new Promise(r => setTimeout(() => r(0), 10000))]));
  await p.reload(); await H.ready(p); await p.waitForTimeout(500);
  check('the offline worker takes control', await p.evaluate(() => !!navigator.serviceWorker.controller), true);
  let c = await cacheState(p);
  check('activation keeps another page\'s cache and the Takht\'s, and clears only the older Jadāwil one', Object.keys(c).join(','), [CACHE, 'other-app-offline', 'takht-0'].sort().join(','));
  check('another page\'s cache is untouched', await p.evaluate(async () => { const r = await (await caches.open('other-app-offline')).match('/elsewhere/data'); return r ? r.text() : 'gone'; }), 'sentinel');
  check(`the Jadāwil's cache holds its seven files`, JSON.stringify(c[CACHE] || []), JSON.stringify(FILES.map(f => new URL(f, srv.base).href).sort()));
  const online = await work(p);
  check('online: the atlas finds Minneapolis and the sheet gathers at row 8\'s UT', online, 'true true');

  await ctx.setOffline(true);
  for (const [label, url] of [['reload', null], ['index.html', srv.base + 'index.html'], ['start_url ./', new URL(JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.webmanifest'), 'utf8')).start_url, srv.base).href]]) {
    let got; try { if (url) await p.goto(url, { timeout: 20000 }); else await p.reload({ timeout: 20000 }); await H.ready(p); got = await work(p); } catch (e) { got = e.message.split('\n')[0]; }
    check(`offline, ${label}: opens, searches the atlas and gathers the sheet`, got, online);
  }
  let icons; try { icons = await p.evaluate(async base => Promise.all(['manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'].map(f => fetch(base + f).then(x => x.ok).catch(() => false))), srv.base); }
  catch (e) { icons = 'page gone: ' + e.message.split('\n')[0]; }
  check('offline: the manifest and icons still load', JSON.stringify(icons), '[true,true,true,true,true]');
  await ctx.setOffline(false);

  // a next build on the same address: a new cache name and a marker in the page
  const next = fs.mkdtempSync(path.join(os.tmpdir(), 'jadawil-next-')); fs.cpSync(DIR, next, { recursive: true });
  const NEXT = 'jadawil-0000000000ff'; fs.writeFileSync(path.join(next, 'sw.js'), SW.split(CACHE).join(NEXT));
  fs.writeFileSync(path.join(next, 'index.html'), fs.readFileSync(path.join(DIR, 'index.html'), 'utf8').replace('<meta name="description"', '<meta name="build-marker" content="next"><meta name="description"'));
  srv.root = next;
  try {
    await p.goto(srv.base); await H.ready(p);
    for (let t = 0; t < 60 && Object.keys(await cacheState(p)).includes(CACHE); t++) await p.waitForTimeout(250);   // the new worker installs, then activates
    c = await cacheState(p);
    check('a next build: its worker clears the older Jadāwil copy and keeps the other caches', Object.keys(c).join(','), [NEXT, 'other-app-offline', 'takht-0'].sort().join(','));
    check('a next build: its copy holds its seven files', (c[NEXT] || []).length, FILES.length);
    await p.reload(); await H.ready(p);
    check('a next build: the reload after it opens the new page', await p.evaluate(() => !!document.querySelector('meta[name="build-marker"]')), true);
  } finally { srv.root = DIR; fs.rmSync(next, { recursive: true, force: true }); }

  check('nothing is requested from outside the Jadāwil', outside.join(', '), '');
  check('no page errors', errors.join(' | '), '');
  await b.close(); await srv.close();
});
