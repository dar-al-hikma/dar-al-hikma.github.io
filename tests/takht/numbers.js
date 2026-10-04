// The number model: exact typed arithmetic (+ − ×), binary elsewhere, display forms, the limits, conversion.
const H = require('./h'); const { run, press, fresh, wrap, dms, hms, S, check, summary } = H;
(async () => {
  const { browser, page, errs } = await H.open(); let v;
  await fresh(page, 'arc');
  // exact typed decimals
  v = await run(page, 'AC dec 0.1 + 0.2 =');            check('0.1 + 0.2 = 0.3', v.val + '|' + v.sval.dx, '0.3|0.3');
  v = await run(page, 'AC dec 0.3 - 0.1 - 0.2 =');      check('0.3 − 0.1 − 0.2 = 0', v.val + '|' + v.sval.v, '0|0');
  v = await run(page, 'AC dec 1 - 0.9 =');              check('1 − 0.9 = 0.1', v.val, '0.1');
  v = await run(page, 'AC dec 0.7 * 3 =');              check('0.7 × 3 = 2.1 (rule: typed products are exact)', v.val + '|' + v.sval.dx, '2.1|2.1');
  v = await run(page, '+ 0.1 =');                       check('  + 0.1 = 2.2', v.val, '2.2');
  v = await run(page, 'AC dec 0.1 * 0.2 =');            check('0.1 × 0.2 = 0.02', v.val, '0.02');
  v = await run(page, 'AC dec n 0.25 * 0.2 =');         check('−0.25 × 0.2 = −0.05', v.val, '−0.05');
  v = await run(page, 'AC dec n 0.25 * n 0.2 =');       check('−0.25 × −0.2 = 0.05', v.val, '0.05');
  v = await run(page, 'AC dec n 0.5 * 0 =');            check('−0.5 × 0 = 0, no minus', v.val + '|' + v.sval.dx, '0|0');
  v = await run(page, 'AC dec 1.1 * 1.1 * 1.1 =');      check('1.1 × 1.1 × 1.1 = 1.331', v.val, '1.331');
  v = await run(page, 'AC dec 0.1 + 0.2 = * 3 =');      check('(0.1 + 0.2) × 3 = 0.9', v.val, '0.9');
  v = await run(page, 'AC dec 0.7 * 3 = - 2.1 =');      check('0.7 × 3 − 2.1 = 0 exactly', v.sval.v, 0);
  v = await run(page, 'AC dec 2.50 * 4 =');             check('2.50 × 4 = 10', v.val, '10');
  v = await run(page, 'AC dec 0.123456 * 0.654321 =');  check('0.123456 × 0.654321 = 0.080779853376', v.sval.dx, '0.080779853376');
  v = await run(page, 'AC dec 999999999999 * 999999999999 ='); check('24-digit product kept exactly', v.sval.dx + '|' + v.val, '999999999998000000000001|9.999…×1023');
  v = await run(page, '* 999999999999 =');              check('a product past 30 digits falls back to binary', v.sval.dx == null && isFinite(v.sval.v), true);
  v = await run(page, 'AC dec 0.7 / 3 =');              check('division keeps a fraction, not digits: 0.7 ÷ 3 = 7/30', v.val + '|' + (v.sval.dx == null) + '|' + JSON.stringify(v.sval.rq), '0.2333333…|true|[7,30]');
  v = await run(page, 'AC dec 2 / 3 =');                check('2 ÷ 3 = 0.6666666…', v.val, '0.6666666…');
  v = await run(page, 'AC dec 1 / 3 * 3 =');            check('1 ÷ 3 × 3 = 1', v.val, '1');
  v = await run(page, 'AC M:time 15 u 55 / 24 u = * 3 ='); check('a computed number × a typed one is binary', v.sval.dx == null, true);
  await fresh(page, 'arc');
  v = await run(page, 'AC dec 0.7 * 3 = >x');           await page.reload(); await page.waitForFunction(() => window.takht); await fresh(page, 'arc');
  v = await run(page, 'AC dec @x * 2 =');               check('a stored product keeps its digits across a reload: 2.1 × 2 = 4.2', v.val + '|' + v.sval.dx, '4.2|4.2');
  // display forms
  v = await run(page, 'AC dec 100000 * 1000000 =');     check('1e11 shows all digits', v.val, '100000000000');
  v = await run(page, 'AC dec 12345678901 * 10 =');     check('123456789010 keeps its zero', v.val, '123456789010');
  v = await run(page, 'AC dec 99999999999 + 1 =');      check('99999999999 + 1', v.val, '100000000000');
  v = await run(page, 'AC dec 1000000 * 1000000 =');    check('1e12 in exponent form', v.val + '|' + v.live, '1×1012|1000000 × 1000000 = 1 times 10 to the power 12');
  v = await run(page, 'AC dec 123456 * 10000000 =');    check('1.23456e12', v.val, '1.234…×1012');
  v = await run(page, 'AC dec 999999999999 + 0.5 =');   check('999999999999.5 shows the cut', v.val, '999999999999…');
  v = await run(page, 'AC M:arc 0 u 0 u 1 sin');        check('sin 1″', v.val, '0.0000048…');
  v = await run(page, '* 0.0000001 =');                 check('4.848…×10⁻¹³', v.val + '|' + v.live, '4.848…×10−13|0.0000048… × 0.0000001 = 4.848… times 10 to the power −13');
  v = await run(page, 'AC dec 0.00000009 * 1 =');       check('9×10⁻⁸', v.val, '9×10−8');
  v = await run(page, 'AC dec 0.0000001 * 1 u =');      check('0.0000001 × 1° note', v.val + '|' + v.note, '0° 00′ 00″|rounded from 0° 00′ 00.0003…″');
  // trig ranges
  v = await run(page, 'AC dec 1 asin');                 check('asin 1 = 90°', v.val, dms(S(90)));
  v = await run(page, 'AC dec 1.0000001 asin');         check('asin 1.0000001 refused', v.msgBad, true);
  v = await run(page, 'AC dec n 1 acos');               check('acos −1 = 180°', v.val, dms(S(180)));
  v = await run(page, 'AC n . 5 asin');                 check('± . 5 sin⁻¹ = −30°', v.val, '−' + dms(S(30)));
  v = await run(page, 'AC dec . 5 n asin');             check('. 5 ± sin⁻¹ = −30°', v.val, '−' + dms(S(30)));
  v = await run(page, 'AC dec n . 5 acos');             check('± . 5 cos⁻¹ = 120°', v.val, dms(S(120)));
  v = await run(page, 'AC dec n 1 atan');               check('atan −1 wraps to 315° with the note', v.val + '|' + v.note, '315° 00′ 00″|−45° 00′ 00″ → 315° 00′ 00″');
  v = await run(page, 'AC dec 12.32470 atan');          check('atan 12.32470 = 85° 21′ 41″', v.val + '|' + v.note, '85° 21′ 41″|rounded from 85° 21′ 40.69…″');
  v = await run(page, 'AC M:arc 90 tan');               check('tan 90° refused', v.msgBad, true);
  v = await run(page, 'AC M:arc 270 tan');              check('tan 270° refused', v.msgBad, true);
  v = await run(page, 'AC M:arc 89 u 59 u 59 tan');     check('tan 89° 59′ 59″', v.val, '206264.806241…');
  // conversion: the lesson's way, carrying 60″, no wrap inside the conversion
  await wrap(page, false);
  v = await run(page, 'AC M:arc dec 359.999999999 =');  check('wrap off: 359.999999999 = 360°', v.val, dms(S(360)));
  v = await run(page, 'AC M:arc dec 360.999999999 =');  check('wrap off: 360.999999999 = 361°', v.val, dms(S(361)));
  v = await run(page, 'AC M:arc dec n 359.999999999 ='); check('wrap off: −359.999999999 = −360°', v.val, '−' + dms(S(360)));
  v = await run(page, 'AC M:arc dec 999999.999999 =');  check('wrap off: 999999.999999 = 1000000°', v.val, dms(S(1000000)));
  v = await run(page, 'AC M:time dec 359.999999999 =');  check('wrap off, time: 360:00:00', v.val, hms(S(360)));
  for (const mode of ['arc', 'time']) { const bad = await page.evaluate((mode) => { const t = window.takht, out = []; let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 300; i++) { const x = +(rnd() * 9999).toFixed(Math.floor(rnd() * 8)); t.press('AC'); t.press('mode:' + mode); t.press('dec'); for (const c of String(x)) t.press(c); t.press('='); const want = Math.round(x * 3600); if (t.state.val.k !== 'sex' || t.state.val.sec !== want) out.push({ x, got: t.state.val.sec, want }); } return out; }, mode);
    check(`${mode}: 300 random decimals convert to round(x·3600)`, bad.length, 0, JSON.stringify(bad.slice(0, 3))); }
  await wrap(page, true);
  v = await run(page, 'AC M:arc dec 359.999999999 =');  check('wrap on: 359.999999999 → 0° and says so', v.val + '|' + v.note, '0° 00′ 00″|rounded from 359° 59′ 59.99…″ · 360° 00′ 00″ → 0° 00′ 00″');
  v = await run(page, 'AC M:arc dec n 359.999999999 ='); check('wrap on: −359.999999999 stays −360°', v.val, '−' + dms(S(360)));
  v = await run(page, 'AC M:arc dec 23.43666 =');       check('23.43666 = 23° 26′ 12″', v.val, dms(S(23,26,12)));
  // the limit: 10,000,000° or h on the raw result, before any wrap; operands built with wrap off
  await wrap(page, false);
  await press(page, 'AC M:arc dec 9999999 = >x AC M:arc dec 9999900 = >ratio AC M:time dec 9999999 = >LST AC M:arc dec 5000000 = >RAMC');
  await wrap(page, true);
  const big = 'That result is too large for the Takht.';
  v = await run(page, 'AC @x + @x =');                  check('9999999° + 9999999° refused', v.msgBad + '|' + v.msg, 'true|' + big);
  v = await run(page, 'AC @x + 1 u =');                 check('9999999° + 1° refused', v.msgBad, true);
  v = await run(page, 'AC @x + 0 u 59 u 59 =');         check('9999999° 59′ 59″ allowed → 279° 59′ 59″', v.val, dms(S(279,59,59)));
  v = await run(page, 'AC @x - n 1 u =');               check('9999999° − (−1°) refused', v.msgBad, true);
  v = await run(page, 'AC @x n - 1 u =');               check('−9999999° − 1° refused', v.msgBad, true);
  v = await run(page, 'AC @ratio p180');                check('+180 on 9999900° refused', v.msgBad, true);
  v = await run(page, 'AC @RAMC p180');                 check('+180 on 5000000° → 140°', v.val + '|' + v.note, '140° 00′ 00″|5000180° 00′ 00″ → 140° 00′ 00″');
  v = await run(page, 'AC @RAMC * 2 =');                check('5000000° × 2 refused', v.msgBad, true);
  v = await run(page, 'AC @RAMC * 1.9999999 =');        check('5000000° × 1.9999999 → 279° 30′', v.val, dms(S(279,30)));
  v = await run(page, 'AC @x / 0.9999999 =');           check('9999999° ÷ 0.9999999 refused', v.msgBad, true);
  v = await run(page, 'AC @LST + @LST =');              check('9999999 h + 9999999 h refused', v.msgBad, true);
  v = await run(page, 'AC @LST x15');                   check('9999999 h ×15 refused', v.msgBad, true);
  v = await run(page, 'AC @x d15');                     check('9999999° ÷15 = 666666:36:00', v.val, hms(S(666666,36)));
  v = await run(page, 'AC M:arc 5 * 1999999 =');        check('5° × 1999999 → 275°', v.val, dms(S(275)));
  v = await run(page, 'AC M:arc 5 * 2000000 =');        check('5° × 2000000 refused', v.msgBad, true);
  v = await run(page, 'AC M:arc dec 10000000 =');       check('typed 10000000 = refused', v.msgBad, true);
  v = await run(page, 'AC M:arc dec 9999999.9999 =');   check('typed 9999999.9999 = refused (rounds to 10000000°)', v.msgBad, true);
  let s = 'AC dec 999999999999 * 999999999999 ='; for (let i = 0; i < 23; i++) s += ' * 999999999999 ='; v = await run(page, s); check('10²⁹⁹ accepted', v.val, '9.999…×10299');
  v = await run(page, '* 999999999999 =');              check('overflow refused, operation kept open', v.msgBad + '|' + v.pending, 'true|9.999…×10299 ×');
  // a computed value within binary noise of a half is the half the display shows: sin 30° is held as 0.49999999999999994
  await fresh(page, 'arc'); await press(page, 'AC 30 sin >ratio');
  v = await run(page, 'AC 0 u 0 u 1 * @ratio =');      check('1″ × sin 30° = 1″, as 1″ × 0.5', v.last + '|' + v.note, '0° 00′ 01″ × 0.5 = 0° 00′ 01″|rounded from 0° 00′ 00.5″');
  v = await run(page, 'AC n 0 u 0 u 1 * @ratio =');    check('  −1″ × sin 30° = −1″', v.val, '−0° 00′ 01″');
  v = await run(page, 'AC 60 cos >ratio AC 0 u 0 u 1 * @ratio ='); check('  1″ × cos 60° = 1″', v.val, dms(S(0,0,1)));
  v = await run(page, 'AC 29 u 59 u 59 sin >ratio AC 0 u 0 u 1 * @ratio ='); check('  a value truly below a half still rounds down (sin 29° 59′ 59″)', v.val + '|' + v.note, '0° 00′ 00″|rounded from 0° 00′ 00.49…″');
  v = await run(page, 'AC 0 u 0 u 1 d15');             check('1″ ÷ 15: the note marks its cut digits', v.note, 'rounded from 00:00:00.06…');
  // typed ÷ typed is kept exact, so a value just below a half-second rounds down however large or small
  await wrap(page, false);
  v = await run(page, 'AC M:arc dec 999999778471 / 1000001 = * 1 u ='); check('999999778471 ÷ 1000001 × 1° = 999998° 46′ 42″ (2.5 µs below the half)', v.val + '|' + v.note, '999998° 46′ 42″|rounded from 999998° 46′ 42.49…″');
  v = await run(page, 'AC M:arc dec 999999778471 / 1000001 = n * 1 u ='); check('  and negated, −999998° 46′ 42″', v.val, '−999998° 46′ 42″');
  // sin 30° is a half at any size: 2000° 00′ 01″ × sin 30° = 1000° 00′ 00.5″ → 1000° 00′ 01″
  v = await run(page, 'AC 30 sin >ratio AC 1 u * dec 2000 = + 0 u 0 u 1 = * @ratio ='); check('2000° 00′ 01″ × sin 30° = 1000° 00′ 01″', v.val, '1000° 00′ 01″');
  await wrap(page, true);
  v = await run(page, 'AC M:arc dec 737361111103 / 999999999989 = * 1 u ='); check('737361111103 ÷ 999999999989 × 1° = 0° 44′ 14″ (below the half by 5×10^−13″)', v.val, '0° 44′ 14″');
  v = await run(page, 'AC M:arc dec 1 / 3 = * 0 u 0 u 3 ='); check('(1 ÷ 3) × 3″ = 1″ exactly, no rounding note', v.val + '|' + v.note, '0° 00′ 01″|');
  // an exact fraction shows its own digits: ½ − 1/18014398509481982 is 0.4999999…, not the 0.5 of its nearest double
  await press(page, 'AC dec 4503599 * 1000000000 + 627370495 = >x AC dec 9007199 * 1000000000 + 254740991 = >ratio');
  v = await run(page, 'AC @x / @ratio =');                check('4503599627370495 ÷ 9007199254740991 shows 0.4999999…', v.val, '0.4999999…');
  v = await run(page, '* 0 u 0 u 1 =');                   check('  × 1″: the history line agrees with its result', v.last, '0.4999999… × 0° 00′ 01″ = 0° 00′ 00″');
  v = await run(page, 'AC @ratio - 1 = >x AC @ratio / @x ='); check('9007199254740991 ÷ 9007199254740990 shows 1…, so sin⁻¹ refusing it is no surprise', v.val, '1…');
  v = await run(page, 'AC M:time 15 u 55 / 24 u =');      check('  an ordinary ratio shows as before', v.val, '0.6631944…');
  await fresh(page, 'time'); v = await run(page, 'AC 15 u 55 accel'); check('accel 15:55:00: the note marks its cut digits', v.note, 'rounded from 156.93… s');
  // round 7, S7-1: cos 30° × tan 240° is exactly 3/2 (√3/2 × √3); shown as 1.5, it is used as 1.5 on every later path
  await fresh(page, 'arc');
  v = await run(page, 'AC 30 cos * 240 u tan =');        check('cos 30° × tan 240° shows 1.5 and is held as 1.5', v.val + '|' + v.sval.v, '1.5|1.5');
  v = await run(page, '* 3 =');                           check('  × 3 = 4.5 (number × number)', v.val, '4.5');
  v = await run(page, '* 0 u 0 u 1 =');                   check('  then × 1″ = 5″', v.val, dms(5));
  v = await run(page, 'AC 30 cos * 240 u tan = * 0 u 0 u 3 ='); check('  × 3″ = 5″ (4.5″ rounds away from zero)', v.val + '|' + v.note, dms(5) + '|rounded from 0° 00′ 04.5″');
  v = await run(page, 'AC 30 cos * 240 u tan = >x AC @x * 0 u 0 u 3 ='); check('  stored, recalled, × 3″ = 5″', v.val, dms(5));
  v = await run(page, 'AC 30 cos * 240 u tan = * 7 = dec'); check('  × 7 then dec = 10° 30′ 00″', v.val, dms(S(10, 30)));
  v = await run(page, 'AC 0 u 0 u 3 * 1.4999999 =');      check('  control: typed 1.4999999 × 3″ = 4″ (exact, below the half)', v.val, dms(4));
  // PR #22 review, R22-2: a binary sum shown as a half is held as that half: 1 + cos 240° is exactly 1/2, so × 11″ is 5.5″ → 6″
  v = await run(page, 'AC 240 cos + 1 = * 0 u 0 u 11 ='); check('1 + cos 240° × 0° 00′ 11″ = 6″ (5.5″ rounds away from zero)', v.val + '|' + v.note, dms(6) + '|rounded from 0° 00′ 05.5″');
  // round 7, S7-4: sin⁻¹ and cos⁻¹ take binary noise just past ±1 as ±1, typed values past 1 are refused; whatever is decided, these hold
  v = await run(page, 'AC dec 1.0000001 asin');           check('sin⁻¹ of a typed 1.0000001 is refused', v.msgBad, true);
  v = await run(page, 'AC dec 1 asin');                   check('sin⁻¹ 1 = 90°', v.val, dms(S(90)));
  v = await run(page, 'AC dec n 1 acos');                 check('cos⁻¹ −1 = 180°', v.val, dms(S(180)));
  v = await run(page, 'AC 90 sin asin');                  check('sin 90°, then sin⁻¹ = 90°', v.val, dms(S(90)));
  for (const d of [8, 12, 58]) {
    v = await run(page, `AC ${d} u 0 u 0 sin * ${d} u 0 u 0 sin = >x AC ${d} u 0 u 0 cos * ${d} u 0 u 0 cos = + @x = asin`);
    check(`sin² ${d}° + cos² ${d}° (binary, a little past 1), then sin⁻¹ = 90°`, v.val, dms(S(90))); }
  await fresh(page, 'arc');
  check('no page errors', errs.join('|'), ''); summary(); await browser.close();
})();
