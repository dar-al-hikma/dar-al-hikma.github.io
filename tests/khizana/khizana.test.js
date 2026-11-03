// al-Khizāna (khizana/): the gate and its pages hold only ciphertext, so these tests never see the real keys.
// The live pages are checked locked: no key, a wrong key. The fixture (fixture/, built by the same encryptor
// with the published keys in fixture-keys.json) runs the same decryptor through every path that opens something.
// Run: NODE_PATH=$(npm root -g) node tests/khizana/khizana.test.js   (VERBOSE=1 prints every check)
// Exit status: 0 when every check passed, 1 when any failed, 2 when Playwright is missing.
const path = require('path'), fs = require('fs'), http = require('http');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not available: ' + String(e.message).split('\n')[0]); process.exit(2); }
const ROOT = path.join(__dirname, '..', '..'), LIVE = 'khizana', FIX = 'tests/khizana/fixture';
const K = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-keys.json'), 'utf8'));
const LANGS = ['en', 'nb', 'es', 'fr', 'de', 'zh', 'ja'];
let pass = 0, fail = 0; const failures = [];
function check(name, ok, detail) {
  if (ok) pass++; else { fail++; failures.push(`${name}\n      ${String(detail === undefined ? '' : detail).slice(0, 600)}`); }
  if (process.env.VERBOSE) console.log((ok ? 'ok  \t' : 'FAIL\t') + name);
}
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const items = fs.readdirSync(path.join(ROOT, LIVE)).filter(d => fs.statSync(path.join(ROOT, LIVE, d)).isDirectory());
// the decryptor without its data line: the live pages and the fixture must run the same code
const code = f => read(f).replace(/^\s*var I18N = .*$/m, '').replace(/<link rel="icon"[^>]*>/, '');

(async () => {
  const server = http.createServer((req, res) => {
    let f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(f));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASE = `http://127.0.0.1:${server.address().port}`, L = `${BASE}/${LIVE}/`, F = `${BASE}/${FIX}/`;
  const browser = await chromium.launch();
  async function tab(ctx, o = {}) {
    ctx = ctx || await browser.newContext({ viewport: o.viewport || { width: 1280, height: 800 } });
    const page = await ctx.newPage(), errs = [], outside = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
    page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) outside.push(r.url()); });
    return { ctx, page, errs, outside };
  }
  const isOpen = p => p.waitForSelector('#opened:not([hidden])', { timeout: 20000 }).then(() => true, () => false);
  const keys = (p, s) => p.evaluate(s => { const o = []; for (let i = 0; i < window[s].length; i++) if (/^dah\.khizana\./.test(window[s].key(i))) o.push(window[s].key(i)); return o; }, s);
  try {
    // the files
    check('the gate and at least one item are there', items.length >= 1, items.join(' '));
    for (const f of [`${LIVE}/index.html`, ...items.map(i => `${LIVE}/${i}/index.html`)]) {
      const h = read(f);
      check(`${f} is marked noindex`, /<meta name="robots" content="noindex, nofollow/.test(h));
      check(`${f} holds ciphertext, not a page`, /<title>al-Khizāna<\/title>/.test(h) && (h.match(/<script\b/gi) || []).length === 1);
    }
    check('the gate runs the same code as the fixture', code(`${LIVE}/index.html`) === code(`${FIX}/index.html`));
    for (const i of items) check(`${i} runs the same code as the fixture's item`, code(`${LIVE}/${i}/index.html`) === code(`${FIX}/a1/index.html`));

    // the live pages, locked
    { const t = await tab(); await t.page.goto(L);
      const s = await t.page.evaluate(() => ({ locked: !document.getElementById('locked').hidden, open: !document.getElementById('opened').hidden }));
      check('the gate without a key shows the passphrase form and nothing else', s.locked && !s.open, JSON.stringify(s));
      await t.page.goto(L + '#k=' + K.master); await t.page.waitForTimeout(800);
      const b = await t.page.evaluate(() => ({ locked: !document.getElementById('locked').hidden, msg: document.getElementById('status').textContent, href: location.href }));
      check('a wrong key fails cleanly, says so and leaves the address', b.locked && /link/.test(b.msg) && !b.href.includes('#'), JSON.stringify(b));
      await t.page.fill('#pass', K.passphrase); await t.page.click('#openBtn');
      await t.page.waitForFunction(() => /doesn’t/.test(document.getElementById('status').textContent), null, { timeout: 20000 }).catch(() => {});
      check('a wrong passphrase fails cleanly and says so', /doesn’t/.test(await t.page.textContent('#status')));
      for (const i of items) {
        await t.page.goto(`${L}${i}/`); check(`${i} without a key says where it opens from`, /al-Khizāna/.test(await t.page.textContent('#msg')));
        await t.page.goto(`${L}${i}/#k=${K.item}`); await t.page.waitForTimeout(600);
        check(`${i} with a wrong key fails cleanly`, (await t.page.title()) === 'al-Khizāna' && /doesn’t open/.test(await t.page.textContent('#msg')));
      }
      check('no errors and no requests beyond the pages', !t.errs.length && !t.outside.length, [...t.errs, ...t.outside].join(' | ')); await t.ctx.close(); }

    // the fixture, opened every way
    { const t = await tab(); await t.page.goto(F + '#k=' + K.master);
      check('fixture: the link opens the gate and leaves the address', await isOpen(t.page) && !(await t.page.evaluate(() => location.href)).includes('#'));
      check('fixture: the tab keeps the keys, the device does not', (await keys(t.page, 'sessionStorage')).length === 2 && !(await keys(t.page, 'localStorage')).length);
      await t.page.click('a.piece'); await t.page.waitForTimeout(800);
      const s = await t.page.evaluate(() => ({ title: document.title, ran: (document.getElementById('fx') || {}).dataset, href: location.href, mode: document.compatMode, n: document.querySelectorAll('html').length, shell: !!document.getElementById('msg') }));
      check('fixture: the item opens, replaces its shell, runs its script and leaves the address', s.title === 'Fixture page' && s.ran && s.ran.ran === 'yes' && !s.href.includes('#') && s.mode === 'CSS1Compat' && !s.shell, JSON.stringify(s));
      await t.page.reload(); await t.page.waitForTimeout(800);
      check('fixture: a reload in the tab opens it again', (await t.page.title()) === 'Fixture page');
      await t.page.goto(F); await isOpen(t.page); await t.page.check('#remember');
      check('fixture: remembered, the keys are kept on the device', (await keys(t.page, 'localStorage')).length === 2);
      const u = await tab(t.ctx); await u.page.goto(F);
      check('fixture: a new tab then opens without a key', await isOpen(u.page));
      check('fixture: the button reads "Mischief managed"', (await u.page.textContent('#forget')) === 'Mischief managed');
      await u.page.click('#forget');
      check('fixture: Mischief managed closes the press and forgets every key', !(await u.page.evaluate(() => document.getElementById('locked').hidden)) && !(await keys(u.page, 'localStorage')).length && !(await keys(u.page, 'sessionStorage')).length);
      await u.page.goto(F + 'a1/'); await u.page.waitForTimeout(500);
      check('fixture: after it the item no longer opens', (await u.page.title()) === 'al-Khizāna');
      check('fixture: no errors and no requests beyond the pages', !t.errs.length && !t.outside.length && !u.errs.length && !u.outside.length, [...t.errs, ...u.errs, ...t.outside, ...u.outside].join(' | '));
      await t.ctx.close(); }
    { const t = await tab(); await t.page.goto(F);
      await t.page.fill('#pass', '  ' + K.passphrase.toUpperCase().replace(/ - /g, '--') + ' '); await t.page.click('#openBtn');
      check('fixture: the passphrase opens it, whatever the case and spacing', await isOpen(t.page));
      await t.page.goto(F + 'a1/'); await t.page.waitForTimeout(600);
      check('fixture: and the item then opens from the tab', (await t.page.title()) === 'Fixture page'); await t.ctx.close(); }
    { const t = await tab(); await t.page.goto(F); await t.page.goto(F + '#k=' + K.master);
      check('fixture: a link pasted into an open tab opens the gate', await isOpen(t.page));
      await t.page.goto(F + 'a1/'); await t.page.evaluate(() => sessionStorage.clear()); await t.page.reload();
      await t.page.goto(F + 'a1/#k=' + K.item); await t.page.waitForTimeout(1200);
      check('fixture: and into an item\'s tab, opens the item', (await t.page.title()) === 'Fixture page'); await t.ctx.close(); }

    // seven languages at 320 px, locked and open
    for (const l of LANGS) {
      const t = await tab(null, { viewport: { width: 320, height: 640 } });
      await t.ctx.addInitScript(l => localStorage.setItem('dah.lang', l), l);
      await t.page.goto(L); const a = await t.page.evaluate(() => ({ lang: document.documentElement.lang, over: document.documentElement.scrollWidth > innerWidth, sel: document.getElementById('langSel').value }));
      await t.page.goto(F + '#k=' + K.master); await isOpen(t.page);
      const b = await t.page.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, past: [...document.querySelectorAll('h1,h2,h3,p,button,label,input,select')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).map(e => e.tagName) }));
      check(`${l}: the gate follows dah.lang and fits 320 px, locked and open`, a.lang.split('-')[0] === l && a.sel === l && !a.over && !b.over && !b.past.length, JSON.stringify({ a, b }));
      await t.ctx.close();
    }
    { const t = await tab(); await t.page.goto(L); await t.page.selectOption('#langSel', 'fr');
      check('choosing a language in the gate saves it for every piece', (await t.page.evaluate(() => localStorage.getItem('dah.lang'))) === 'fr'); await t.ctx.close(); }
  } catch (e) { check('the suite ran to the end', false, e.stack); }
  await browser.close(); server.close();
  console.log(`${pass} passed, ${fail} failed`); failures.forEach(f => console.log('  ✗ ' + f));
  process.exit(fail ? 1 : 0);
})();
