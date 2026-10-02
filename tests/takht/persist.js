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
  // leading zeros in a saved exact form do not move the exponent
  for (const [reg, want] of [[{k:'dec', v:1, dx:'0000000000001'}, '1° 00′ 00″ × 1 = 1° 00′ 00″'], [{k:'dec', v:0.1, dx:'0000000000000.1'}, '1° 00′ 00″ × 0.1 = 0° 06′ 00″']]) {
    const z = await withStore(JSON.stringify({ratio: reg}), 'en'); await press(z.p, 'AC M:arc 1 u * @ratio =');
    check(`saved dx ${reg.dx} shows as its value`, (await view(z.p)).last, want); await z.c.close(); }
  // two open Takhts: B storing LST keeps A's RAMC and OE, and B recalls A's RAMC without a reload
  { const c = await browser.newContext(), A = await c.newPage(), B = await c.newPage();
    for (const p of [A, B]) { await p.goto(H.URL); await p.waitForFunction(() => window.takht); }
    await press(A, 'AC M:arc 264 u >RAMC AC 23 u 26 u 54 >OE'); await press(B, 'AC M:time 17 u 39 u 47 >LST');
    await A.reload(); await A.waitForFunction(() => window.takht); const r = (await view(A)).regs;
    check('two tabs: B storing LST keeps the RAMC and OE A stored', [r.RAMC && r.RAMC.sec, r.OE && r.OE.sec, r.LST && r.LST.sec].join('|'), [S(264), S(23,26,54), S(17,39,47)].join('|'));
    await press(A, 'AC M:arc 100 u >x'); await B.waitForTimeout(200); await press(B, 'AC @x');
    check('  B recalls the x A just stored, without a reload', (await view(B)).val, dms(S(100))); await c.close(); }
  // two tabs storing at the same moment, a clear, a failed save, and saves by an older build (round 6, S6-5):
  // a register a tab confirmed as stored is never lost or reverted by another tab's save
  { const K = 'dah.takht.registers', c = await browser.newContext(), A = await c.newPage(), B = await c.newPage(), P = await c.newPage(), C = await c.newPage();
    await C.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'dah.takht.registers' && window.__full) throw new DOMException('full', 'QuotaExceededError'); return set.call(this, k, v); }; });
    for (const p of [A, B, P, C]) { await p.goto(H.URL); await p.waitForFunction(() => window.takht); }
    const regs = p => p.evaluate(() => JSON.parse(JSON.stringify(window.takht.state.regs)));
    const saved = () => P.evaluate(() => JSON.parse(localStorage.getItem('dah.takht.registers') || '{}'));
    const settle = () => A.waitForTimeout(250), at = (o, n) => o[n] ? o[n].sec : null;
    const store = (p, n) => p.evaluate(n => window.takht.press('store:' + n), n);
    let lost = 0, stale = 0;
    for (let i = 1; i <= 30; i++){
      await press(A, `AC M:time ${i % 24} u ${i}`); await press(B, `AC M:arc ${i} u ${i}`);
      await Promise.all([store(A, 'LST'), store(B, 'RAMC')]); await settle();
      const want = { LST: S(i % 24, i), RAMC: S(i, i) };
      for (const o of [await regs(A), await regs(B), await saved()]) for (const n of ['LST', 'RAMC']) { if (at(o, n) == null) lost++; else if (at(o, n) !== want[n]) stale++; } }
    check('two tabs storing LST and RAMC at once (30 rounds): no register lost from either tab or from storage', lost, 0);
    check('  and none left at an older value', stale, 0);
    let split = 0;
    for (let i = 1; i <= 15; i++){
      await press(A, `AC M:arc ${i} u`); await press(B, `AC M:arc ${100 + i} u`);
      await Promise.all([store(A, 'x'), store(B, 'x')]); await settle();
      const xs = [at(await regs(A), 'x'), at(await regs(B), 'x'), at(await saved(), 'x')]; if (new Set(xs).size !== 1 || ![S(i), S(100 + i)].includes(xs[0])) split++; }
    check('the same register stored in two tabs at once (15 rounds): one value, the later save, in both tabs and storage', split, 0);
    await P.evaluate(() => localStorage.clear()); await settle(); const a = await regs(A), b = await regs(B);
    check('a clear by any page of the site leaves both tabs their registers', [at(a, 'LST'), at(a, 'RAMC'), at(b, 'x')].every(v => v != null), true);
    await C.evaluate(() => { window.__full = true; }); await press(C, 'AC M:arc 23 u 26 u 54 >OE'); const cm = (await view(C)).msg;
    await press(A, 'AC M:arc 50 u >x'); await settle(); const cr = await regs(C);
    check('a save that fails in one tab, then another tab saves: it keeps its value and takes the other\'s', [cm.startsWith('Stored in OE for now:'), at(cr, 'OE'), at(cr, 'x')].join('|'), ['true', S(23,26,54), S(50)].join('|'));
    await C.evaluate(() => { window.__full = false; });
    await P.evaluate(() => { const r = JSON.parse(localStorage.getItem('dah.takht.registers') || '{}'); r.φ = { k: 'sex', sec: 44 * 3600, mode: 'arc' }; localStorage.setItem('dah.takht.registers', JSON.stringify(r)); });   // an older build: copies the mark it read
    await settle(); await P.evaluate(() => { const r = JSON.parse(localStorage.getItem('dah.takht.registers') || '{}'); delete r._w; r.ratio = { k: 'dec', v: 0.25, txt: '0.25', dx: '0.25' }; localStorage.setItem('dah.takht.registers', JSON.stringify(r)); });   // and with no mark at all
    await settle(); const a2 = await regs(A), b2 = await regs(B);
    check('an older build\'s saves (mark copied, or none) are taken in by both tabs', [at(a2, 'φ'), at(b2, 'φ'), a2.ratio && a2.ratio.v, b2.ratio && b2.ratio.v].join('|'), [S(44), S(44), 0.25, 0.25].join('|'));
    await press(A, 'AC M:time 7 u 7 >LST'); await settle();
    await P.evaluate(() => { const r = JSON.parse(localStorage.getItem('dah.takht.registers') || '{}'); r.LST = { k: 'sex', sec: 3600, mode: 'time' }; localStorage.setItem('dah.takht.registers', JSON.stringify(r)); });   // an older build's stale copy of LST
    await settle(); const ls = [at(await regs(A), 'LST'), at(await regs(B), 'LST'), at(await saved(), 'LST')];
    check('an older build writing back a stale LST: the tab that stored LST keeps it and puts it back in storage and in the other tab', ls.join('|'), [S(7,7), S(7,7), S(7,7)].join('|'));
    await c.close(); }
  check('size within the 450 KiB ceiling', require('fs').statSync(H.PAGE).size < 460800, true, String(require('fs').statSync(H.PAGE).size));
  summary(); await browser.close();
})();
