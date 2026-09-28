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
    const msgs = await page.evaluate((lang) => { const I = window.takht.I18N, en = I.en.m, L = I[lang].m || {}; const a = { signDigits: ['° ′ ″'], minTwo: ['h m s'], minRange: [false], decRead: [true], notHour: [359], modeSet: [false], modeFresh: [false], chooseSign: ['° ′ ″'], typeAfter: ['÷'], arcTime: [false], decSex: [false], decToFields: ['h m s'], numStays: ['h m s'], fwdDec: ['tan⁻¹'], fwdTime: ['tan⁻¹'], invSex: ['tan⁻¹', '12,32470'], invRange: ['cos⁻¹'], stayDec: ['÷'], regEmpty: ['ratio'], stored: ['RAMC'], broughtBack: ['−359° 59′ 59″'], rounded: ['−359° 59′ 59.9999″'] };
      const o = {}; for (const k of Object.keys(en)) { const f = L[k] || en[k]; o[k] = typeof f === 'function' ? f(...(a[k] || [])) : f; } return o; }, lang);
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
  summary(); await browser.close();
})();
