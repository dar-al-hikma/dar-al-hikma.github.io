// Harness for the Jadāwil's suites. The site cannot rebuild the page, so these walk the shipped file.
// Point it at another copy with JADAWIL=/path/to/index.html (default: the repo's jadawil/index.html); the page's
// six install files must sit beside it.
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not available: ' + String(e.message).split('\n')[0]); process.exit(2); }
const http = require('http'), path = require('path'), fs = require('fs');
const PAGE = path.resolve(process.env.JADAWIL || path.join(__dirname, '..', '..', 'jadawil', 'index.html'));
if (!fs.existsSync(PAGE)) { console.error('page not found: ' + PAGE + ' (set JADAWIL=/path/to/index.html)'); process.exit(2); }
const DIR = path.dirname(PAGE);
const LANGS = ['en', 'nb', 'es', 'fr', 'de', 'zh', 'ja'];
const LOCALES = { en: 'en-GB', nb: 'nb-NO', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP' };

// The site as GitHub Pages serves it, cut down to one piece: the page's folder at /jadawil/, nothing else. Every
// request is logged; serve.root switches the folder (a next build), serve.close() stops it.
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
async function serve(root = DIR) {
  const s = { root, log: [] };
  const srv = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split('?')[0]); s.log.push(u);
    if (!u.startsWith('/jadawil/')) { res.writeHead(404); return res.end(); }
    const f = path.join(s.root, u.slice('/jadawil/'.length) || 'index.html');
    if (!f.startsWith(s.root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(fs.readFileSync(f)); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  s.origin = `http://127.0.0.1:${srv.address().port}`; s.base = s.origin + '/jadawil/';
  s.close = () => new Promise(r => srv.close(r));
  return s;
}
// The page is ready when the atlas has counted its places.
const ready = page => page.waitForFunction(() => (document.querySelector('#atlasCount') || {}).textContent, null, { timeout: 120000 });

const R = { pass: 0, fail: 0 };
function check(name, got, want, extra) {
  const ok = got === want; if (ok) R.pass++; else R.fail++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : `\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(want)}` + (extra ? `\n      ${extra}` : '')));
  return ok;
}
function summary() { console.log(`\n${R.pass} passed, ${R.fail} failed`); process.exitCode = R.fail ? 1 : 0; }
// A suite that throws has failed, whatever it had passed.
function main(fn) { fn().then(summary, e => { R.fail++; console.log('FAIL the suite ran to the end\n      ' + String(e.stack || e).split('\n').slice(0, 4).join('\n      ')); summary(); }); }

// Angles as the page prints them (264° 29′ 32″), in integer seconds of arc.
const RAD = Math.PI / 180, wrap360 = x => ((x % 360) + 360) % 360;
const arcSec = s => { const m = String(s).match(/(\d+)°\s*(\d+)′\s*(\d+)″/); return m ? (+m[1] * 60 + +m[2]) * 60 + +m[3] : NaN; };
const dms = sec => `${Math.floor(sec / 3600)}° ${String(Math.floor(sec % 3600 / 60)).padStart(2, '0')}′ ${String(sec % 60).padStart(2, '0')}″`;
// MC and ASC by atan2, written here, for a RAMC, a latitude and an obliquity in degrees.
const mcDeg = (ramc, oe) => wrap360(Math.atan2(Math.sin(ramc * RAD), Math.cos(ramc * RAD) * Math.cos(oe * RAD)) / RAD);
const ascDeg = (ramc, phi, oe) => wrap360(Math.atan2(Math.cos(ramc * RAD), -(Math.sin(ramc * RAD) * Math.cos(oe * RAD) + Math.tan(phi * RAD) * Math.sin(oe * RAD))) / RAD);
// The signed difference of two arcs in seconds, across 0°.
const arcDiff = (a, b) => { let d = (a - b) % 1296000; if (d > 648000) d -= 1296000; if (d < -648000) d += 1296000; return d; };

module.exports = { chromium, PAGE, DIR, LANGS, LOCALES, serve, ready, check, summary, main, R, arcSec, dms, mcDeg, ascDeg, arcDiff, path, fs };
