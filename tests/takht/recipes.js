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
  const note = await page.evaluate(() => window.takht.I18N.en.ui.rLatNote); check('Help says to store a southern φ without ±', /store <b>φ<\/b> without <b>±<\/b>/.test(note), true, note);
  v = await run(page, 'AC M:time 0 / 24 u =');                              check('UT 00:00 ÷ 24 h', v.val, '0');
  v = await run(page, 'AC M:time 24 / 24 u =');                             check('UT 24:00 ÷ 24 h', v.val, '1');
  v = await run(page, 'AC M:time 23 u 59 u 59 accel');                      check('accel 23:59:59', v.val, hms(237));
  v = await run(page, 'AC M:time 0 u 0 u 1 accel');                         check('accel 1 s note', v.val + '|' + v.note, '00:00:00|rounded from 0.0027 s');
  check('no page errors', errs.join('|'), ''); summary(); await browser.close();
})();
