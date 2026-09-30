// MC and ASC against independent atan2 formulas and Dykes' table (p. 34); the southern-birth method.
const H = require('./h'); const { run, press, fresh, dms, hms, S, check, summary, mcSec, ascSec, wrap360, secToKeys } = H;
(async () => {
  const { browser, page, errs } = await H.open(); let v;
  await fresh(page, 'arc');
  const OE = S(23,26,54); await press(page, `AC ${secToKeys(OE)} >OE`);
  // --- MC in every quadrant, at the cardinal points and 1″ either side of them ---
  const ramcs = [0, S(0,0,1), S(1), S(30), S(45), S(89), S(89,59,59), S(90), S(90,0,1), S(91), S(120), S(135), S(179,59,59), S(180), S(180,0,1), S(200), S(225), S(264,56,45), S(269,59,59), S(270), S(270,0,1), S(300), S(315), S(330), S(359,59,59)];
  for (const r of ramcs) {
    await press(page, `AC ${secToKeys(r)} >RAMC`); v = await run(page, 'AC @RAMC tan / @OE cos = atan');
    let got; if (v.msgBad && /tan/.test(v.msg)) got = r; else { const d = wrap360((v.sval.sec - r) / 3600); got = (d > 90 && d < 270) ? (await run(page, 'p180')).sval.sec : v.sval.sec; }
    check(`MC at RAMC ${dms(r)}`, got, mcSec(r / 3600, OE / 3600));
  }
  // --- direct ASC: Help's recipe with its quadrant rule, against atan2, below the polar circles ---
  const lats = [0, S(5), S(15), S(23,26,54), S(30), S(44,58,48), S(51,30), S(60), S(65), S(66,33), -S(5), -S(33,52), -S(44,58,48), -S(60), -S(66,33)];
  const ramc2 = [0, S(30), S(90), S(120), S(180), S(240), S(264,56,45), S(270), S(300), S(359,59)];
  let n = 0, bad = [];
  for (const r of ramc2) { await press(page, `AC ${secToKeys(r)} >RAMC`); const mc = mcSec(r / 3600, OE / 3600);
    for (const p of lats) {
      await press(page, `AC ${p < 0 ? 'n ' : ''}${secToKeys(p)} >φ AC @OE cos * @RAMC sin = >x AC @OE sin * @φ tan + @x = >x`);
      v = await run(page, 'AC @RAMC cos n / @x = atan'); let got;
      if (v.msgBad && /zero/.test(v.msg)) { got = [S(90), S(270)].find(a => wrap360((a - mc) / 3600) < 180); }   // Help: 90° or 270°, the one within the 180° after the MC
      else if (v.msgBad) got = -1;
      else { const t = v.sval.sec; got = wrap360((t - mc) / 3600) < 180 ? t : (await run(page, 'p180')).sval.sec; }
      const want = ascSec(r / 3600, p / 3600, OE / 3600); n++;
      if (Math.abs(got - want) > 1 && Math.abs(got - want) !== 1296000 - 1) bad.push(`RAMC ${dms(r)} φ ${dms(p)}: got ${got < 0 ? v.msg : dms(got)} want ${dms(want)}`);
    } }
  check(`direct ASC at ${n} RAMC/latitude pairs below the polar circles (±1″)`, bad.join('; '), '');
  // --- Dykes' table p. 34, OE 23° 26′ 00″ ---
  await press(page, 'AC 23 u 26 u 0 >OE');
  const table = { 264: { 0: S(353,27,54), 5: S(353,12,30), 30: S(351,17,51), 44: S(348,48,41), 45: S(348,31,22), 55: S(343,7,24), 60: S(334,57,14) }, 265: { 0: S(354,33,11), 5: S(354,20,20), 30: S(352,44,35), 44: S(350,39,41), 45: S(350,25,9), 55: S(345,51,54), 60: S(338,50,42) } };
  const tableMC = { 264: S(264,29,30), 265: S(265,24,38) };
  for (const r of [264, 265]) { await press(page, `AC ${r} u 0 u 0 >RAMC`);
    v = await run(page, 'AC @RAMC tan / @OE cos = atan p180'); check(`Dykes MC at ST ${r === 264 ? '17:36' : '17:40'}`, v.val, dms(tableMC[r]));
    for (const [lat, want] of Object.entries(table[r])) { await press(page, `AC ${lat} u 0 u 0 >φ AC @OE cos * @RAMC sin = >x AC @OE sin * @φ tan + @x = >x`); v = await run(page, 'AC @RAMC cos n / @x = atan'); check(`Dykes ASC at ST ${r === 264 ? '17:36' : '17:40'}, latitude ${lat}°`, v.val, dms(want)); } }
  // --- southern births: lesson §6.2.3 example (45° S, LST 16:00, OE 23° 26′) and the lesson's chart at −33° 52′ ---
  await press(page, 'AC 240 u 0 u 0 >RAMC AC n 45 u 0 u 0 >φ AC @OE cos * @RAMC sin = >x AC @OE sin * @φ tan + @x = >x');
  v = await run(page, 'AC @RAMC cos n / @x = atan'); const mcS = mcSec(240, 23 + 26/60); const ascS = wrap360((v.sval.sec - mcS) / 3600) < 180 ? v.sval.sec : (v.sval.sec + 648000) % 1296000;
  check('§6.2.3 example: MC 2° 05′ ♐ (±1′)', Math.abs(mcS - S(242,5)) < 60, true, dms(mcS)); check('§6.2.3 example: ASC 7° 15′ ♓ (±1′)', Math.abs(ascS - S(337,15)) < 60, true, dms(ascS));
  await press(page, 'AC M:time 16 u 0 u 0 >LST'); v = await run(page, 'AC @LST + 12 u ='); check('southern: LST + 12 h m s', v.val + '|' + v.note, '04:00:00|28:00:00 → 04:00:00');
  v = await run(page, 'x15 >RAMC'); await press(page, 'AC M:arc 45 u 0 u 0 >φ'); v = await run(page, 'AC @RAMC tan / @OE cos = atan'); const mcN = v.sval.sec; v = await run(page, 'p180'); check('southern: table MC +180 = MC', v.sval.sec, mcS);
  await press(page, 'AC @OE cos * @RAMC sin = >x AC @OE sin * @φ tan + @x = >x'); v = await run(page, 'AC @RAMC cos n / @x = atan'); const t = v.sval.sec; const ascN = wrap360((t - mcN) / 3600) < 180 ? t : (t + 648000) % 1296000;
  check('southern: table ASC +180 = direct southern ASC', (ascN + 648000) % 1296000, ascS);
  await press(page, 'AC 23 u 26 u 54 >OE AC 264 u 56 u 45 >RAMC AC n 33 u 52 u 0 >φ AC @OE cos * @RAMC sin = >x AC @OE sin * @φ tan + @x = >x');
  v = await run(page, 'AC @RAMC cos n / @x = atan'); check('§11.5 −33° 52′ direct ASC', v.val, dms(S(355,44,1)));
  // --- polar circles (φ = 90° − OE): the two valid pairings and the two degenerate ones ---
  for (const [name, phi, ramc, want] of [['north at RAMC 90° (valid)', '66 u 33 u 6', 90, S(180)], ['south at RAMC 270° (valid)', 'n 66 u 33 u 6', 270, 0]]) {
    await press(page, `AC M:arc ${phi} >φ AC ${ramc} u 0 u 0 >RAMC AC @OE cos * @RAMC sin = >x AC @OE sin * @φ tan + @x = >x`);
    v = await run(page, 'AC @RAMC cos n / @x = atan'); const mc = mcSec(ramc, 23 + 26/60 + 54/3600); const asc = wrap360((v.sval.sec - mc) / 3600) < 180 ? v.sval.sec : (v.sval.sec + 648000) % 1296000;
    check(`polar circle, ${name}`, asc, want); }
  for (const [name, phi, ramc] of [['north at RAMC 270°', '66 u 33 u 6', 270], ['south at RAMC 90°', 'n 66 u 33 u 6', 90]]) {
    await press(page, `AC M:arc ${phi} >φ AC ${ramc} u 0 u 0 >RAMC AC @OE cos * @RAMC sin = >x`); v = await run(page, 'AC @OE sin * @φ tan + @x = >x');
    check(`polar circle, ${name}: denominator is noise (degenerate, as Help says)`, Math.abs(v.regs.x.v) < 1e-12, true, String(v.regs.x.v)); }
  const help = await page.evaluate(() => { const o = {}; for (const l of Object.keys(window.takht.I18N)) o[l] = window.takht.I18N[l].ui.rAscNote; return o; });
  check('Help (en) pairs the northern circle with RAMC 270° and the southern with 90°', /northern polar circle[^.]*RAMC 270°, or the southern one with RAMC 90°/.test(help.en), true);
  // --- past the polar circles, one second of RAMC apart, the ASC jumps 180°: Help's sign test (step 3 against x) picks the eastern root
  await press(page, 'AC 23 u 26 u 54 >OE AC 69 u 0 u 0 >φ');
  for (const [s, want] of [[50, S(295,45,47)], [51, S(115,45,47)]]) {
    await press(page, `AC 297 u 44 u ${s} >RAMC AC @OE cos * @RAMC sin = >x AC @OE sin * @φ tan + @x = >x`);
    v = await run(page, 'AC @OE sin * @φ tan = * @RAMC sin = + @OE cos ='); const same = Math.sign(v.sval.v) === Math.sign(v.regs.x.v);
    v = await run(page, 'AC @RAMC cos n / @x = atan' + (same ? ' p180' : ''));
    check(`69° N, RAMC 297° 44′ ${s}″: the sign test gives the eastern ASC`, v.sval.sec, want, v.val); }
  check('no page errors', errs.join('|'), ''); summary(); await browser.close();
})();
