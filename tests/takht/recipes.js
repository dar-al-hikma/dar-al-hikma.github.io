// The other Help recipes with inputs of our own: UT, LST, ST ratio, planets across 0° Aries, latitude ratio.
const H = require('./h'); const { run, press, fresh, dms, hms, S, check, summary } = H;
(async () => {
  const { browser, page, errs } = await H.open(); let v;
  await fresh(page, 'time');
  v = await run(page, 'AC 22 u 30 + 5 =');                    check('UT: 22:30 + 5 h (west) → next day', v.val + '|' + v.note, '03:30:00|27:30:00 → 03:30:00');
  v = await run(page, 'AC 1 u 15 - 5 u 30 =');                check('UT: 01:15 − 5:30 (east) → previous day', v.val + '|' + v.note, '19:45:00|−04:15:00 → 19:45:00');
  v = await run(page, 'AC 0 u 30 - 1 =');                     check('UT: DST across midnight', v.val + '|' + v.note, '23:30:00|−00:30:00 → 23:30:00');
  v = await run(page, '- 5 u 30 =');                          check('  then east zone', v.val, hms(S(18)));
  v = await run(page, 'AC 23 u 30 - 1 + 8 =');                check('UT: DST then west', v.val + '|' + v.note, '06:30:00|30:30:00 → 06:30:00');
  v = await run(page, 'AC 18 + 6 =');                         check('UT: 18 + 6 = 24 → 00:00', v.val + '|' + v.note, '00:00:00|24:00:00 → 00:00:00');
  v = await run(page, 'AC 20 + 12 + 20 accel + M:arc 139 u 41 u 30 d15 ='); check('LST east (139° 41′ 30″ E), sum past 24 h', v.val, hms(S(17,22,3)));
  v = await run(page, 'AC M:time 2 + 23 + 2 accel - M:arc 93 u 15 u 48 d15 =');  check('LST west across 24 h', v.val, hms(S(18,47,17)));
  v = await run(page, 'AC M:time 1 + 2 + 1 accel - M:arc 93 u 15 u 48 d15 =');   check('LST west below 0', v.val + '|' + v.note, '20:47:07|−03:12:53 → 20:47:07');
  await fresh(page, 'time');
  await press(page, 'AC 17 u 36 u 0 >LST'); v = await run(page, 'AC @LST - 17 u 36 = / 0 u 4 = >ratio'); check('ST ratio on the earlier column = 0', v.val, '0');
  v = await run(page, 'AC M:arc 265 u 24 u 38 - 264 u 29 u 30 = * @ratio = + 264 u 29 u 30 ='); check('  MC = earlier MC', v.val, dms(S(264,29,30)));
  await press(page, 'AC M:time 17 u 40 u 0 >LST'); v = await run(page, 'AC @LST - 17 u 36 = / 0 u 4 = >ratio'); check('ST ratio on the later column = 1', v.val, '1');
  v = await run(page, 'AC M:arc 265 u 24 u 38 - 264 u 29 u 30 = * @ratio = + 264 u 29 u 30 ='); check('  MC = later MC', v.val, dms(S(265,24,38)));
  await press(page, 'AC M:time 0 u 1 u 30 >LST'); v = await run(page, 'AC @LST - 23 u 58 =');  check('columns straddle 24:00: difference wraps', v.val + '|' + v.note, '00:03:30|−23:56:30 → 00:03:30');
  v = await run(page, '/ 0 u 4 =');                           check('  ratio 0.875', v.val, '0.875');
  await press(page, 'AC M:time 23 u 59 u 0 >LST'); v = await run(page, 'AC @LST - 23 u 56 = / 0 u 4 ='); check('columns 23:56 / 00:00: ratio 0.75', v.val, '0.75');
  // planets across 0° Aries, Help's two lines
  await fresh(page, 'arc');
  await press(page, 'AC M:time 12 / 24 u = >ratio AC M:arc');
  v = await run(page, 'AC 0 u 30 - 359 u 30 = * @ratio = + 359 u 30 =');   check('direct across Aries at 0.5: 359°30′→0°30′', v.val, dms(0));
  v = await run(page, 'AC 1 u 10 - 359 u 50 =');                            check('  difference wraps', v.val + '|' + v.note, '1° 20′ 00″|−358° 40′ 00″ → 1° 20′ 00″');
  v = await run(page, 'AC 0 u 10 - 359 u 50 = * @ratio = >x AC 0 u 10 - @x ='); check('retrograde across Aries at 0.5: 0°10′→359°50′', v.val, dms(0));
  await press(page, 'AC M:time 6 / 24 u = >ratio AC M:arc'); v = await run(page, 'AC 0 u 20 - 359 u 40 = * @ratio = >x AC 0 u 20 - @x ='); check('retrograde at 0.25', v.val, dms(S(0,10)));
  await press(page, 'AC M:time 18 / 24 u = >ratio AC M:arc'); v = await run(page, 'AC 0 u 20 - 359 u 40 = * @ratio = >x AC 0 u 20 - @x ='); check('retrograde at 0.75', v.val + '|' + v.note, '359° 50′ 00″|−0° 10′ 00″ → 359° 50′ 00″');
  v = await run(page, 'AC 0 u 20 - 359 u 40 = * @ratio = + 359 u 40 =');   check('direct at 0.75', v.val + '|' + v.note, '0° 10′ 00″|360° 10′ 00″ → 0° 10′ 00″');
  v = await run(page, 'AC 100 - 100 = * @ratio = + 100 =');                 check('station', v.val, dms(S(100)));
  v = await run(page, 'AC 169 u 0 u 40 - 169 u 2 u 56 =');                  check('direct line on a retrograde planet gives ~360° (Help warns)', v.val, dms(S(359,57,44)));
  // latitude ratio, southern birth: the table's latitudes carry no sign
  v = await run(page, 'AC 33 u 52 >φ @φ - 33 = / 1 u =');                  check('latitude ratio with |φ|', v.val, '0.8666666…');
  // DST is the shift in force (Lord Howe Island's is 30 min), taken off before the standard zone; the ASC runs forward only below the polar circles
  const ut = await page.evaluate(() => window.takht.I18N.en.ui.rUTnote); check('Help: UT note no longer says to take 1 h off, and names the standard zone', !/take 1 h off first/.test(ut) && /standard time/.test(ut) && /shift in force/.test(ut), true, ut);
  const cusp = await page.evaluate(() => window.takht.I18N.en.ui.rCuspNote); check('Help: cusp note limits the forward ASC to below the polar circles', /ASC below the polar circles/.test(cusp) && /Past the polar circles/.test(cusp), true, cusp);
  const note = await page.evaluate(() => window.takht.I18N.en.ui.rLatNote); check('Help says to store a southern φ without ±', /store <b>φ<\/b> without <b>±<\/b>/.test(note), true, note);
  v = await run(page, 'AC M:time 0 / 24 u =');                              check('UT 00:00 ÷ 24 h', v.val, '0');
  v = await run(page, 'AC M:time 24 / 24 u =');                             check('UT 24:00 ÷ 24 h', v.val, '1');
  v = await run(page, 'AC M:time 23 u 59 u 59 accel');                      check('accel 23:59:59', v.val, hms(237));
  v = await run(page, 'AC M:time 0 u 0 u 1 accel');                         check('accel 1 s note', v.val + '|' + v.note, '00:00:00|rounded from 0.0027 s');
  // a computed ratio is exact: 13:55:12 is 50,112 s and 50112/86400 = 29/50, so 25″ × the ratio is 14.5″ exactly and rounds
  // half away from zero to 15″ (its binary value, 0.58 × 25 = 14.4999…, would give 14″)
  await fresh(page, 'time'); await press(page, 'AC M:time 13 u 55 u 12 / 24 u = >ratio');
  v = await run(page, 'AC M:arc 0 u 0 u 25 * @ratio =');                   check('birth ratio 29/50: 25″ × ratio = 15″ (14.5″ exactly)', v.val + '|' + v.note, dms(15) + '|rounded from 0° 00′ 14.5″');
  v = await run(page, 'AC M:arc n 0 u 0 u 25 * @ratio =');                 check('  −25″ × ratio = −15″', v.val, dms(-15));
  v = await run(page, 'AC M:arc 100 u 0 u 25 - 100 = * @ratio = + 100 ='); check('  planet 100°00′00″ → 100°00′25″ at 13:55:12 UT', v.val, dms(S(100,0,15)));
  v = await run(page, 'AC @ratio n M:arc * 0 u 0 u 25 =');                 check('  −ratio × 25″ = −15″ (± keeps it exact)', v.val, dms(-15));
  v = await run(page, 'AC M:arc 0 u 0 u 25 * 0.58 =');                     check('  typed 0.58 × 25″ = 15″ (in its digits, as before)', v.val, dms(15));
  v = await run(page, 'AC M:arc 0 u 0 u 25 * 0.57999999 =');               check('  typed 0.57999999 × 25″ = 14″ (14.49999975″: no tolerance)', v.val, dms(14));
  // ÷ by a ratio: 0°01′36″ ÷ 1° = 96/3600, and 3″ ÷ 96/3600 = 112.5″ exactly → 113″ (binary: 112.4999…)
  v = await run(page, 'AC M:arc 0 u 1 u 36 / 1 u = >x AC 0 u 0 u 3 / @x ='); check('3″ ÷ (1′36″ ÷ 1°) = 113″ (112.5″ exactly)', v.val + '|' + v.note, dms(113) + '|rounded from 0° 01′ 52.5″');
  v = await run(page, 'AC M:arc n 0 u 0 u 3 / @x =');                      check('  −3″ ÷ the same ratio = −113″', v.val, dms(-113));
  v = await run(page, 'AC @x n >x AC M:arc 0 u 0 u 3 / @x =');             check('  3″ ÷ the negated ratio = −113″', v.val, dms(-113));
  v = await run(page, 'AC M:arc 0 u 1 u 0 / 0 u 1 u 0 = >x AC 0 u 0 u 25 / @x ='); check('  25″ ÷ a ratio of 1 = 25″, no rounding note', v.val + '|' + v.note, dms(25) + '|');
  // the sweep: every half case p/100 × s″ that birth times reach (p·s ending in 50), both signs, and s = 1..59 at a spread
  // of birth times, including the review's 0.29, 0.57, 0.58 and 0.7; expected values by exact rational rounding
  const exact = (s, ut) => { const N = BigInt(Math.abs(s)) * BigInt(ut), D = 86400n, q = Number(N / D + ((N % D) * 2n >= D ? 1n : 0n)); return s < 0 && q ? -q : q; };
  const byUT = new Map(); const add = (ut, s) => { if (!byUT.has(ut)) byUT.set(ut, []); byUT.get(ut).push(s); };
  for (let p = 1; p < 100; p++) for (let s = 1; s < 60; s++) if ((p * s) % 100 === 50) { add(p * 864, s); add(p * 864, -s); }
  for (const ut of [29 * 864, 57 * 864, 58 * 864, 70 * 864, S(0,0,1), S(3,17,41), S(7,7,7), S(11,59,59), S(19,48,31), S(23,59,59)]) for (let s = 1; s < 60; s++) add(ut, s);
  const cases = [...byUT].map(([ut, ss]) => ({ ut, setup: H.tokens(`AC M:time ${H.secToKeys(ut)} / 24 u = >ratio`), runs: ss.map(s => ({ s, keys: H.tokens(`AC M:arc ${s < 0 ? 'n ' : ''}0 u 0 u ${Math.abs(s)} * @ratio =`) })) }));
  const got = await page.evaluate(cs => cs.map(c => { const t = window.takht; document.querySelector('#tapeClear').click(); c.setup.forEach(k => t.press(k));
    return c.runs.map(r => { r.keys.forEach(k => t.press(k)); return t.state.val.sec; }); }), cases);
  const wrong = [], total = cases.reduce((n, c) => n + c.runs.length, 0);
  cases.forEach((c, i) => c.runs.forEach((r, j) => { const w = exact(r.s, c.ut); if (got[i][j] !== w) wrong.push(`${H.hms(c.ut)} ÷ 24 h × ${r.s}″: ${got[i][j]} for ${w}`); }));
  check(`birth ratio × seconds rounds exactly, half away from zero (${total} cases)`, wrong.slice(0, 5).join('; '), '');
  check('no page errors', errs.join('|'), ''); summary(); await browser.close();
})();
