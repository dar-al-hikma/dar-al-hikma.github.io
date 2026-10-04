// Phone layouts under stress, in every language the page carries: the longest values, every message, a long history line.
// Floor: the value never below 34 px, except the documented cases (German sign entry at 320–325 px; wrap-off values of 10,000° and more).
const H = require('./h'); const { press, check, summary } = H;
const VIEWS = [[320,568],[350,600],[360,560],[375,553],[390,664],[390,844]];
async function measure(page, exempt) { return page.evaluate((exempt) => {
  const vw = window.innerWidth, p = [], de = document.documentElement, val = document.querySelector('#val'), fs = parseFloat(getComputedStyle(val).fontSize);
  if (de.scrollWidth > vw + 0.5) p.push(`horizontal overflow ${de.scrollWidth} > ${vw}`);
  if (fs < 34 && !exempt) p.push(`value ${fs}px`);
  if (val.scrollWidth > val.clientWidth + 1) p.push(`value clipped (${val.textContent})`);
  const handle = document.querySelector('#tapeHandle').getBoundingClientRect(); let minH = 1e9;
  for (const k of document.querySelectorAll('.k')) { const r = k.getBoundingClientRect(); minH = Math.min(minH, r.height);
    if (r.right > vw + 0.5 || r.left < -0.5) p.push(`key ${k.dataset.k} outside`); if (handle.height && r.bottom > handle.top + 0.5 && r.top < handle.bottom) p.push(`key ${k.dataset.k} under handle`);
    if (k.scrollWidth > k.clientWidth + 1) p.push(`key label overflows ${k.dataset.k}`); if (r.bottom > de.scrollHeight + 0.5) p.push(`key ${k.dataset.k} beyond page`); }
  if (minH < 41.5) p.push(`key row ${minH}px`);
  const msg = document.querySelector('#msg'), mr = msg.getBoundingClientRect(), top = document.querySelector('.dtop').getBoundingClientRect();
  if (msg.classList.contains('show')) { if (msg.scrollWidth > msg.clientWidth + 1) p.push('message overflows'); if (mr.top < top.bottom - 0.5) p.push('message overlaps the top row'); if (mr.height > 36.5) p.push(`message ${Math.round(mr.height)}px > 2 lines (${msg.textContent})`); }
  return p; }, exempt); }
(async () => {
  const browser = await H.chromium.launch(); const problems = []; const LANGS = await H.languages(browser);
  for (const [w, h] of VIEWS) for (const lang of LANGS) {
    const { page, errs } = await H.open({ browser, viewport: { width: w, height: h }, lang }); const tag = `${w}×${h} ${lang}`;
    const cases = [['−359° 59′ 59″', 'AC M:arc n 359 u 59 u 59 =', false], ['sign 29° 59′ 59″ ♓', 'AC M:arc 359 u 59 u 59 = sign', false], ['dec view', 'AC M:arc n 359 u 59 u 59 = dec', false], ['time dec', 'AC M:time n 23 u 59 u 59 = dec', false],
      ['typed 13 digits', 'AC M:arc dec n 0.12345678901', false], ['computed −123456.123456…', 'AC dec n 123456.1234567 / 1 =', false], ['10⁻¹³', 'AC M:arc 0 u 0 u 1 sin * 0.0000001 = n', false], ['10²³', 'AC dec n 999999999999 * 999999999999 =', false], ['tan 89° 59′ 59″', 'AC M:arc 89 u 59 u 59 tan', false],
      ['sign entry', 'AC M:arc sign 15 u 59 u 59', lang === 'de' && w <= 325], ['pending', 'AC sign M:arc n 359 u 59 u 59 - 359 u 59 u 59', false]];
    for (const [name, seq, exempt] of cases) { await press(page, seq); const p = await measure(page, exempt); if (p.length) problems.push(`${tag} ${name}: ${p.join(', ')}`); }
    await page.evaluate(() => { const S = window.takht.state; if (S.view.sign) window.takht.press('sign'); document.querySelector('#wrapChip').click(); });
    await press(page, 'AC M:arc n 359 u 59 u 59 * 27000 ='); let p = await measure(page, true); if (p.length) problems.push(`${tag} wrap-off millions: ${p.join(', ')}`);
    await page.evaluate(() => document.querySelector('#wrapChip').click());
    const msgs = await page.evaluate((lang) => { const I = window.takht.I18N, en = I.en.m, L = I[lang].m || {}; const a = { signDigits: ['° ′ ″'], minTwo: ['h m s'], minRange: [false], decRead: [true], notHour: [359], modeSet: [false], modeFresh: [false], chooseSign: ['° ′ ″'], typeAfter: ['÷'], arcTime: [false], decSex: [false], decToFields: ['h m s'], numStays: ['h m s'], fwdDec: ['tan⁻¹'], fwdTime: ['tan⁻¹'], invSex: ['tan⁻¹', '12,32470'], invRange: ['cos⁻¹'], stayDec: ['÷'], regEmpty: ['ratio'], regEmptyAfter: ['ratio', '÷'], stored: ['RAMC'], storedOnly: ['RAMC'], wholeNumbers: ['° ′ ″', 1], degreesNext: ['° ′ ″'], hoursNext: ['h m s'], broughtBack: ['−359° 59′ 59″'], rounded: ['−359° 59′ 59.9999″'] };
      const o = {}; for (const k of Object.keys(en)) { const f = L[k] || en[k]; o[k] = typeof f === 'function' ? f(...(a[k] || [])) : f; }
      // round 7: the point refused in sign entry, and sto cancelled beside the mode the key set
      o.wholeNumbersSign = (L.wholeNumbers || en.wholeNumbers)('° ′ ″', 1, true); const c = L.stoCancel || en.stoCancel; o.stoCancelMode = c + (/。$/.test(c) ? '' : ' ') + o.modeSet; return o; }, lang);
    await press(page, 'AC M:arc n 359 u 59 u 59 =');
    for (const [k, text] of Object.entries(msgs)) { await page.evaluate(t => { const m = document.querySelector('#msg'); m.innerHTML = String(t).replace(/⁻¹/g, '<sup>−1</sup>'); m.className = 'msg show bad'; }, text); p = await measure(page, false); if (p.length) problems.push(`${tag} message ${k}: ${p.join(', ')}`); }
    await press(page, 'AC M:arc 89 u 59 u 59 tan'); await page.evaluate(() => document.querySelector('#tapeHandle').click()); await page.waitForTimeout(250);
    p = await page.evaluate(() => { const t = document.querySelector('#tape'), r = t.getBoundingClientRect(), o = []; if (r.left < -0.5 || r.right > window.innerWidth + 0.5) o.push('sheet outside'); for (const li of t.querySelectorAll('.tl')) if (li.scrollWidth > li.clientWidth + 1) o.push('history line overflows'); if (document.documentElement.scrollWidth > window.innerWidth + 0.5) o.push('horizontal overflow with the sheet open'); return o; });
    if (p.length) problems.push(`${tag} sheet: ${p.join(', ')}`); await page.keyboard.press('Escape');
    if (errs.length) problems.push(`${tag} errors: ${errs.join('|')}`); await page.context().close(); }
  for (const [w, h] of [[700,900],[744,1133],[768,1024],[819,900],[820,900],[1024,768],[1400,860]]) { const { page } = await H.open({ browser, viewport: { width: w, height: h } });
    const r = await page.evaluate(() => { const c = document.querySelector('.calc').getBoundingClientRect(), t = document.querySelector('#tape').getBoundingClientRect(), st = document.querySelector('.stage').getBoundingClientRect(); return { w: Math.round(c.width), below: t.top >= c.bottom - 1, beside: t.left >= c.right - 1, h: document.documentElement.scrollWidth > window.innerWidth, centred: Math.abs(st.left + st.width / 2 - window.innerWidth / 2) < 2 }; });
    const want = w < 820 ? { w: 420, below: true, beside: false, h: false, centred: true } : { w: 420, below: false, beside: true, h: false, centred: true };
    if (JSON.stringify(r) !== JSON.stringify(want)) problems.push(`${w}×${h}: ${JSON.stringify(r)}`); await page.context().close(); }
  check(`phone layouts at ${VIEWS.length} viewports × ${LANGS.length} languages, and 7 tablet/desktop breakpoints`, problems.join('\n'), '');
  // the value stays readable when the indicator chips wrap at 320 px: its rendered box, not its font size (round 6, S6-6)
  for (const [lang, keys, label] of [['en', 'AC 23 u 26 u 12 = sto', 'sto armed'], ['en', 'AC 23 u 26 u 12 = dec sto', 'dec view, sto armed'],
      ['en', 'AC 23 u 26 u 12 = sign sto', 'sign view, sto armed'], ['de', 'W:off AC 23 u 26 u 12 = dec', 'German, wrap off, dec view']]){
    const { page } = await H.open({ browser, viewport: { width: 320, height: 568 }, lang }); await H.fresh(page);
    for (const t of keys.split(' ')) { if (t === 'W:off') await H.wrap(page, false); else await press(page, t); }
    const r = await page.evaluate(() => { const v = document.querySelector('#val'), cs = getComputedStyle(v), keys = [...document.querySelectorAll('.calc .k')].map(k => k.getBoundingClientRect().height).filter(Boolean);
      return { h: v.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight), fs: parseFloat(cs.fontSize), key: Math.min(...keys), scroll: document.scrollingElement.scrollHeight - innerHeight }; });
    check(`320×568 ${label}: the value's box holds a whole line, keys ≥ 42 px, no scroll`, [r.h >= r.lh, r.fs >= 34, r.key >= 41.9, r.scroll <= 0].join('|'), 'true|true|true|true', JSON.stringify(r));
    await page.context().close(); }
  // the field being typed is underlined in full, inside the value's box (round 6, S6-9)
  for (const [w, h] of [[320, 568], [390, 600], [390, 844], [1024, 768]]){
    const { page } = await H.open({ browser, viewport: { width: w, height: h } }); await H.fresh(page); await press(page, 'AC 5 u');
    const b = await page.$eval('#val', e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    const png = (await page.screenshot({ clip: b })).toString('base64');
    const rows = await page.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0;
      for (let y = 0; y < c.height; y++) { let k = 0; for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (Math.abs(d[i] - 0xE3) < 24 && Math.abs(d[i + 1] - 0xAA) < 24 && Math.abs(d[i + 2] - 0x3E) < 24) k++; } if (k > 8) n++; }
      return n; }, png);
    check(`${w}×${h}: the current field's underline shows all three brass rows`, rows >= 3, true, `rows ${rows}`); await page.context().close(); }
  // the chip row stays one row in every state, and the = row above the history handle, at default and 150 % text (U-1)
  { const bad = [], STATES = [['sto armed', 'AC 23 u 26 u 12 = sto'], ['dec view, sto armed', 'AC 23 u 26 u 12 = dec sto'], ['sign view, sto armed', 'AC 23 u 26 u 12 = sign sto'],
      ['wrap off, sign view', 'W:off AC 23 u 26 u 12 = sign'], ['sign view, a two-line refusal', 'AC 23 u 26 u 12 = sign C 10 u 75']];
    for (const [w, h] of VIEWS) for (const lang of LANGS) for (const fs of ['', '150%']) {
      const { page } = await H.open({ browser, viewport: { width: w, height: h }, lang });
      if (fs) await page.evaluate(s => { document.documentElement.style.fontSize = s; }, fs);
      for (const [name, keys] of STATES) { await H.fresh(page);
        for (const t of keys.split(' ')) { if (t === 'W:off') await H.wrap(page, false); else await press(page, t); }
        const r = await page.evaluate(() => { const chips = [...document.querySelectorAll('#inds .ind')], eq = document.querySelector('[data-k="="]').getBoundingClientRect(), hd = document.querySelector('#tapeHandle').getBoundingClientRect();
          return { rows: new Set(chips.map(c => Math.round(c.getBoundingClientRect().top))).size, past: Math.round(eq.bottom - hd.top) }; });
        if (r.rows !== 1 || r.past > 0) bad.push(`${w}×${h} ${lang}${fs ? ' at 150 %' : ''}, ${name}: ${r.rows} chip rows, = ${r.past} px past the handle`); }
      await page.context().close(); }
    check(`chip states at ${VIEWS.length} viewports × ${LANGS.length} languages × two text sizes: one chip row, = above the handle`, bad.join('\n'), ''); }
  // the history handle cuts a long line at its start and keeps its end, the result (U-2)
  for (const [w, h] of [[320, 568], [390, 844]]) { const bad = [];
    for (const lang of LANGS) { const { page } = await H.open({ browser, viewport: { width: w, height: h }, lang }); await H.fresh(page);
      await press(page, 'AC 359 u 59 u 59 + 359 u 59 u 59 =');
      const r = await page.evaluate(() => { const sp = document.querySelector('#tapePreview'), b = sp.getBoundingClientRect(), tn = [], tw = document.createTreeWalker(sp, NodeFilter.SHOW_TEXT);
        while (tw.nextNode()) tn.push(tw.currentNode); const at = (n, i) => { const g = document.createRange(); g.setStart(n, i); g.setEnd(n, i + 1); return g.getBoundingClientRect(); };
        const first = at(tn[0], 0), last = at(tn[tn.length - 1], tn[tn.length - 1].length - 1);
        return { text: sp.textContent, cut: sp.scrollWidth > sp.clientWidth, firstOut: first.left < b.left - 0.5, lastIn: last.width > 0 && last.left >= b.left - 0.5 && last.right <= b.right + 0.5 }; });
      if (!r.text.endsWith('= 359° 59′ 58″') || !r.lastIn || (r.cut && !r.firstOut)) bad.push(`${lang}: ${JSON.stringify(r)}`); await page.context().close(); }
    check(`${w}×${h}: a long history line shows its result on the handle, cut at its start, in every language`, bad.join('\n'), ''); }
  // round 7, S7-17: on the desktop at 150 % and 200 % text a long refusal makes the display taller instead of covering the top row
  for (const [lang, size] of [['fr', 200], ['de', 200], ['en', 150]]) { const { page, errs } = await H.open({ browser, viewport: { width: 1024, height: 768 }, lang });
    await page.evaluate(() => document.fonts.ready); await page.evaluate(sz => { document.documentElement.style.fontSize = sz + '%'; }, size); await H.fresh(page);
    for (const k of ['.', '5', '+', '3', 'unit']) await page.click(`[data-k="${k}"]`);
    const r = await page.evaluate(() => { const b = s => document.querySelector(s).getBoundingClientRect(), m = b('#msg'), t = b('.dtop'), v = b('#val');
      return { lines: Math.round(m.height / parseFloat(getComputedStyle(document.querySelector('#msg')).lineHeight)), below: m.top >= t.bottom - 0.5, valBelow: v.top >= m.bottom - 0.5 }; });
    check(`1024×768 ${lang} ${size} %: a ${r.lines}-line refusal stays below the top row and above the value`, [r.below, r.valBelow, errs.join('|')].join('|'), 'true|true|');
    await page.context().close(); }
  summary(); await browser.close();
})();
