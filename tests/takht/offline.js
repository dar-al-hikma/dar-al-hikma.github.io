// Opened once online, the Takht opens and calculates with no connection. Served over http at /takht/, as the site
// serves it; the network is then cut and the page reopened, from its own address and from its start_url.
// Needs sw.js, the manifest and the icons beside the page under test.
const H = require('./h'); const { check, summary } = H;
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = path.dirname(H.PAGE);
const CACHE = fs.readFileSync(path.join(DIR, 'sw.js'), 'utf8').match(/const CACHE = '([^']+)'/)[1];   // the worker's current cache
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (!u.startsWith('/takht/')) { res.writeHead(404); return res.end(); }
  const f = path.join(DIR, u.slice('/takht/'.length) || 'index.html'); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); });
(async () => { await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = `http://127.0.0.1:${srv.address().port}/takht/`;
  const b = await H.chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  // before the Takht is ever opened: another page on the same site has its own cache, and an older Takht left one
  const p0 = await ctx.newPage(); await p0.goto(base.replace('/takht/', '/elsewhere/'));
  await p0.evaluate(async () => { await (await caches.open('other-app-offline')).put('/elsewhere/data', new Response('sentinel')); await (await caches.open('takht-0')).put('/takht/old', new Response('old')); }); await p0.close();
  const outside = [], errors = []; ctx.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) outside.push(r.url()); });
  const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(base); await p.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => 1), new Promise(r => setTimeout(() => r(0), 3000))])); await p.reload(); await p.waitForTimeout(500);
  check('the offline worker takes control', await p.evaluate(() => !!navigator.serviceWorker.controller), true);
  check('activation keeps another page\'s cache and clears only the older Takht one', await p.evaluate(async () => { const ks = (await caches.keys()).sort();
    const r = await (await caches.open('other-app-offline')).match('/elsewhere/data'); return ks.join(',') + '|' + (r ? await r.text() : 'gone'); }), 'other-app-offline,' + CACHE + '|sentinel');
  const calc = async () => { await p.evaluate(() => { const t = window.takht; t.press('C'); t.press('C'); ['7', '+', '5', '='].forEach(k => t.press(k)); }); return p.$eval('#val', e => e.textContent.trim()); };
  const online = await calc();
  await ctx.setOffline(true);
  for (const [label, url] of [['reload', null], ['index.html', base + 'index.html'], ['start_url ./', base]]) {
    let got; try { if (url) await p.goto(url, { timeout: 15000 }); else await p.reload({ timeout: 15000 }); await p.waitForTimeout(400);
      got = `${(await p.$$eval('[data-k]', e => e.length)) > 0} ${await calc()}`; } catch (e) { got = e.message.split('\n')[0]; }
    check(`offline, ${label}: opens and calculates 7 + 5`, got, `true ${online}`);
  }
  let icons; try { icons = await p.evaluate(async base => Promise.all(['manifest.webmanifest', 'icon-192.png', 'icon-512.png'].map(f => fetch(base + f).then(x => x.ok).catch(() => false))), base); }
  catch (e) { icons = 'page gone: ' + e.message.split('\n')[0]; }
  check('offline: the manifest and icons still load', JSON.stringify(icons), '[true,true,true]');
  check('nothing is requested from outside the Takht', outside.join(', '), '');
  check('no page errors', errors.join(' | '), '');
  summary(); await b.close(); srv.close(); })();
