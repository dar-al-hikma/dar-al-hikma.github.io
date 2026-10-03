// The piece's own files: exactly the seven the build ships, the manifest's id, scope and icons, the worker's list, and
// nothing requested from outside /jadawil/ when the page loads from a server, as the site serves it.
const H = require('./h'); const { check, DIR, path, fs } = H;
const SEVEN = ['icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'index.html', 'manifest.webmanifest', 'sw.js'];
// a PNG's width and height, from its IHDR chunk
const png = f => { const b = fs.readFileSync(f); return b.toString('latin1', 1, 4) === 'PNG' ? `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}` : 'not a PNG'; };

H.main(async () => {
  check('the folder holds exactly the seven files', fs.readdirSync(DIR).sort().join(' '), SEVEN.join(' '));
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  check('the page links its manifest', /<link rel="manifest" href="manifest\.webmanifest"/.test(html), true);
  check('the page links its home-screen icon, 180×180', /<link rel="apple-touch-icon" href="icon-180\.png"/.test(html) && png(path.join(DIR, 'icon-180.png')), '180x180');

  const M = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.webmanifest'), 'utf8'));
  check('the manifest\'s id is the piece\'s own path', M.id, '/jadawil/');
  check('its start_url is ./', M.start_url, './');
  check('its scope is ./', M.scope, './');
  check('it names icons', Array.isArray(M.icons) && M.icons.length > 0, true);
  for (const i of M.icons || []) {
    const f = path.join(DIR, i.src);
    check(`icon ${i.src} (${i.purpose}) is there, a PNG of ${i.sizes}`, fs.existsSync(f) && i.type === 'image/png' && png(f), i.sizes.replace(/\s.*/, ''));
  }
  check('one icon is maskable', (M.icons || []).some(i => /maskable/.test(i.purpose)), true);

  const sw = fs.readFileSync(path.join(DIR, 'sw.js'), 'utf8');
  check('the worker\'s cache is a jadawil- one', /const CACHE = 'jadawil-[0-9a-f]+';/.test(sw), true);
  const FILES = JSON.parse((sw.match(/const FILES = (\[[^\]]*\]);/) || [, 'null'])[1].replace(/'/g, '"'));
  check('the worker lists ./ and the seven files beside it (itself aside)', JSON.stringify((FILES || []).slice().sort()), JSON.stringify(['./', ...SEVEN.filter(f => f !== 'sw.js').map(f => './' + f)].sort()));
  for (const f of FILES || []) check(`the worker's ${f} is there`, fs.existsSync(path.join(DIR, f === './' ? 'index.html' : f)), true);

  // loaded from a server: every request stays inside /jadawil/
  const srv = await H.serve(), b = await H.chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const outside = [], errors = [];
  ctx.on('request', r => { const u = r.url(); if (!u.startsWith(srv.base) && !u.startsWith('data:') && !u.startsWith('blob:')) outside.push(u); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(srv.base, { waitUntil: 'load' }); await H.ready(p);
  await p.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 10000))])); await p.waitForTimeout(1500);
  check('the worker registers and installs', await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && (r.active || r.waiting)); }), true);
  // the server's own log, which sees the worker's and the manifest's fetches too
  const seen = new Set(srv.log.map(u => u.slice('/jadawil/'.length) || 'index.html'));
  check('the page and its worker fetch all seven files', SEVEN.every(f => seen.has(f)), true, [...seen].sort().join(' '));
  check('nothing is requested from outside /jadawil/', outside.join(', '), '');
  check('the server was asked for nothing outside /jadawil/', srv.log.filter(u => !u.startsWith('/jadawil/')).join(', '), '');
  check('no page errors', errors.join(' | '), '');
  await b.close(); await srv.close();
});
