// Displays that cut digits: a cut value is never shown below the one held. Exact typed sums and the decimal view of
// arc and time, against exact decimal strings and integer seconds; none read from the page.
const H = require('./h'); const { run, fresh, check, summary } = H;
// exact: the digits of a + b for decimal strings, cut to the page's places (7, fewer past 5 whole digits), trailing zeros dropped
function exactSum(a, b) {
  const k = Math.max((a.split('.')[1] || '').length, (b.split('.')[1] || '').length);
  const n = BigInt(a.replace('.', '') + '0'.repeat(k - (a.split('.')[1] || '').length)) + BigInt(b.replace('.', '') + '0'.repeat(k - (b.split('.')[1] || '').length));
  const d = n.toString().padStart(k + 1, '0'), i = k ? d.slice(0, -k) : d, f = k ? d.slice(-k) : '';
  const p = Math.max(0, Math.min(7, 12 - i.length)), kept = f.slice(0, p).replace(/0+$/, '');
  return i + (kept ? '.' + kept : '') + (/[1-9]/.test(f.slice(p)) ? '…' : '');
}
// exact: the decimal view of whole seconds, five places cut
const decView = (sec, unit) => (Math.floor(sec / 3600) + '.' + String(Math.floor(sec % 3600 * 100000 / 3600)).padStart(5, '0')).replace(/\.?0+$/, '') + unit;
(async () => {
  const { browser, page, errs } = await H.open(); let v;
  await fresh(page, 'arc');
  v = await run(page, 'AC dec 1 + 1.002 =');        check('1 + 1.002 = 2.002', v.val, '2.002');
  v = await run(page, 'AC dec 16 + 0.06902 =');     check('16 + 0.06902 = 16.06902', v.val, '16.06902');
  v = await run(page, 'AC dec 1.001 / 0.5 =');          check('1.001 ÷ 0.5 = 2.002 (binary, within its noise)', v.val, '2.002');
  // exact sums whose nearest double sits just below the decimal: 2.002, 4.004 … and a spread of others
  let bad = [];
  for (const [a, b] of [['1', '1.002'], ['2', '2.004'], ['3', '0.009'], ['100', '0.00375'], ['255', '1.0225'], ['7', '0.07'], ['12', '0.123'], ['0.5', '4.515'],
                        ['359', '0.99999'], ['180', '0.00001'], ['64', '0.4'], ['9', '0.99']]) {
    v = await run(page, `AC dec ${a} + ${b} =`); const want = exactSum(a, b); if (v.val !== want) bad.push(`${a} + ${b}: ${v.val} ≠ ${want}`);
  }
  check('twelve exact sums shown as their digits', bad.join('; '), '');
  // the decimal view of arc and time
  v = await run(page, 'AC M:arc 256 u 1 u 21 = dec');   check('256° 01′ 21″ in decimal view = 256.0225°', v.val, '256.0225°');
  bad = [];
  for (const sec of [921681, 921690, 921699, 1000000, 1234567, 1295999, 606000, 777777, 999999, 1111111]) {
    const d = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    v = await run(page, `AC M:arc ${d} u ${m} u ${s} = dec`); const want = decView(sec, '°'); if (v.val !== want) bad.push(`${d}° ${m}′ ${s}″: ${v.val} ≠ ${want}`);
  }
  check('ten arcs above 168° in decimal view', bad.join('; '), '');
  bad = [];
  for (const sec of [61281, 72345, 86399, 83999, 45678]) {
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    v = await run(page, `AC M:time ${h} u ${m} u ${s} = dec`); const want = decView(sec, ' h'); if (v.val !== want) bad.push(`${h}:${m}:${s}: ${v.val} ≠ ${want}`);
  }
  check('five times in decimal view', bad.join('; '), '');
  v = await run(page, 'AC M:arc 23 u 26 u 12 = dec');   check('23° 26′ 12″ still 23.43666°', v.val, '23.43666°');
  check('no page errors', errs.join('|'), ''); summary(); await browser.close();
})();
