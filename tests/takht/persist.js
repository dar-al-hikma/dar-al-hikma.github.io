// Registers, wrap and language across a reload; blocked, corrupt and inconsistent storage; the page requests nothing but itself.
const H = require('./h'); const { press, view, check, summary, dms, S } = H;
(async () => {
  const browser = await H.chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); await page.goto(H.URL); await page.waitForFunction(() => window.takht);
  await press(page, 'AC M:arc dec 0.1 >x AC M:time 17 u 39 u 47 >LST AC M:time 15 u 55 / 24 u = >ratio AC M:arc n 33 u 52 >φ AC M:arc 23 u 26 u 54 >OE'); await page.evaluate(() => { document.querySelector('#wrapChip').click(); window.takht.applyLang('de'); });
  await page.reload(); await page.waitForFunction(() => window.takht); let v = await view(page);
  check('registers survive a reload', JSON.stringify([v.regs.x.dx, v.regs.LST.sec, v.regs.ratio.v, v.regs.φ.sec, v.regs.OE.sec]), JSON.stringify(['0.1', S(17,39,47), 57300/86400, -S(33,52), S(23,26,54)]));
  check('wrap and language persist', v.wrap + '|' + await page.evaluate(() => document.documentElement.lang), 'false|de');
  await press(page, 'AC M:arc @x + 0.2 ='); check('a stored typed 0.1 + 0.2 is exact after the reload', (await view(page)).val, '0,3');
  await page.evaluate(() => { document.querySelector('#wrapChip').click(); window.takht.applyLang('en'); }); await ctx.close();
  const c2 = await browser.newContext(); await c2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); }); const p2 = await c2.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(e.message)); await p2.goto(H.URL); await p2.waitForFunction(() => window.takht);
  await press(p2, 'AC M:arc 5 + 3 = >x'); v = await view(p2); check('works with storage blocked', v.val + '|' + v.regs.x.sec + '|' + e2.join(), '8° 00′ 00″|' + S(8) + '|'); await c2.close();
  const c3 = await browser.newContext(); await c3.addInitScript(() => { localStorage.setItem('dah.takht.registers', '{"x":{"k":"dec","v":"abc"},"LST":{"k":"sex","sec":1.5,"mode":"time"},"ratio":{"k":"dec","v":1e308,"dx":"1e308"}}'); localStorage.setItem('dah.takht.wrap', 'garbage'); }); const p3 = await c3.newPage(); const e3 = []; p3.on('pageerror', e => e3.push(e.message)); await p3.goto(H.URL); await p3.waitForFunction(() => window.takht);
  v = await view(p3); check('corrupt storage is dropped, no errors', JSON.stringify([v.regs.x, v.regs.LST, v.wrap]) + '|' + e3.join(), '[null,null,true]|'); await c3.close();
  // a page opened on stored settings of our own: registers as JSON, and a saved language
  const withStore = async (regs, lang) => { const c = await browser.newContext(); await c.addInitScript(([r, l]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); if (r) localStorage.setItem('dah.takht.registers', r); if (l) localStorage.setItem('dah.lang', l); } }, [regs, lang]);
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(H.URL); await p.waitForFunction(() => window.takht); return { c, p, errs }; };
  // a ratio from time ÷ time keeps its exact seconds across a reload: 13:55:12 ÷ 24 h = 29/50, 25″ × 29/50 = 14.5″ → 15″
  let o = await withStore(null, null); await press(o.p, 'AC M:time 13 u 55 u 12 / 24 u = >ratio AC @ratio n >x'); await o.p.reload(); await o.p.waitForFunction(() => window.takht);
  await press(o.p, 'AC M:arc 0 u 0 u 25 * @ratio ='); v = await view(o.p); check('a computed ratio stored, reloaded and recalled: 25″ × 29/50 = 15″', v.val, dms(15));
  await press(o.p, 'AC M:arc 0 u 0 u 25 * @x ='); v = await view(o.p); check('  its negation too: 25″ × −29/50 = −15″', v.val + '|' + o.errs.join(), dms(-15) + '|'); await o.c.close();
  // numbers whose stored forms disagree are dropped: the display would show one and the arithmetic use another
  o = await withStore(JSON.stringify({ ratio: { k: 'dec', v: 0.5, txt: '0.5', dx: '0.75' }, x: { k: 'dec', v: 0.5, txt: '0.5', dx: '0' }, LST: { k: 'dec', v: 0.5, txt: '0.25' },
    RAMC: { k: 'dec', v: 0.5, rq: [1, 3] }, OE: { k: 'dec', v: 0.5, rq: [1, 0] }, φ: { k: 'dec', v: 0.5, rq: '1/2' } }), null);
  v = await view(o.p); check('inconsistent txt, dx and rq are dropped: the registers read empty', JSON.stringify([v.regs.ratio, v.regs.x, v.regs.LST, v.regs.RAMC, v.regs.φ, v.regs.OE]), JSON.stringify([null, null, null, null, null, null]));
  await press(o.p, 'AC 1 * @ratio'); v = await view(o.p); check('  1° × the dropped ratio is refused as empty, not 0° 45′', v.msg, 'ratio is empty. Hold ratio, or press sto then ratio, to store the display.');
  await press(o.p, 'AC 1 / @x ='); v = await view(o.p); check('  1° ÷ the dropped dx "0" throws nothing', v.pending + '|' + o.errs.join(), dms(S(1)) + ' ÷|'); await o.c.close();
  o = await withStore(JSON.stringify({ x: { k: 'sex', sec: 36e9, mode: 'arc' }, LST: { k: 'sex', sec: -36e9, mode: 'time' }, RAMC: { k: 'sex', sec: 1e300, mode: 'arc' }, φ: { k: 'sex', sec: 36e9 - 1, mode: 'arc' } }), null);
  v = await view(o.p); check('seconds of 10,000,000° or more are dropped; just under is kept', JSON.stringify([v.regs.x, v.regs.LST, v.regs.RAMC, v.regs.φ && v.regs.φ.sec]) + '|' + o.errs.join(), JSON.stringify([null, null, null, 36e9 - 1]) + '|'); await o.c.close();
  // every kind the page stores comes back: arc and time, a typed number, a sum of typed numbers, a computed number, a ratio and its negation
  const good = { LST: { k: 'sex', sec: S(17,39,47), mode: 'time' }, OE: { k: 'sex', sec: -S(23,26,54), mode: 'arc' }, φ: { k: 'dec', v: -0.25, txt: '-0.25', dx: '-0.25' },
    RAMC: { k: 'dec', v: 0.3, dx: '0.3' }, x: { k: 'dec', v: 1 / 3 }, ratio: { k: 'dec', v: -0.58, rq: [-50112, 86400] } };
  o = await withStore(JSON.stringify(good), null); v = await view(o.p); const keyed = r => JSON.stringify(Object.keys(good).map(n => [n, r[n]]));
  check('valid registers of every kind survive a load', keyed(v.regs), keyed(good)); await o.c.close();
  // only the page's own languages: a saved "__proto__", "constructor" or "toString" is English
  for (const l of ['__proto__', 'constructor', 'toString']) { o = await withStore(null, l); await press(o.p, 'AC 5 / 3 u =');
    check(`saved language "${l}" falls back to English; 5 ÷ 3° reads 1.6666666…`, (await o.p.evaluate(() => document.documentElement.lang)) + '|' + (await view(o.p)).val + '|' + o.errs.join(), 'en|1.6666666…|'); await o.c.close(); }
  for (const withFiles of [true, false]) { const c = await browser.newContext(); const p = await c.newPage(); const reqs = [], errs = []; p.on('request', r => reqs.push(r.url())); p.on('pageerror', e => errs.push(e.message)); if (!withFiles) await p.route(/manifest\.webmanifest|icon-.*\.png/, r => r.abort()); await p.goto(H.URL); await p.waitForFunction(() => window.takht);
    for (const l of await p.evaluate(() => Object.keys(window.takht.I18N))) { await p.evaluate(l => { window.takht.applyLang(l); window.takht.press('help'); }, l); await p.keyboard.press('Escape'); } await p.waitForTimeout(300);
    const other = reqs.filter(u => !u.endsWith('index.html') && !/manifest\.webmanifest|icon-.*\.png/.test(u)); check(`network with install files ${withFiles ? 'present' : 'absent'}: only the page and its own files`, other.join(',') + '|' + errs.join(','), '|');
    check(`  fonts loaded from the inline data`, await p.evaluate(() => [...document.fonts].every(f => f.status === 'loaded')), true); await c.close(); }
  check('size within the 450 KiB ceiling', require('fs').statSync(H.PAGE).size < 460800, true, String(require('fs').statSync(H.PAGE).size));
  summary(); await browser.close();
})();
