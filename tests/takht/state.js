// The input state machine. Every case starts from a pinned state (fresh: AC, arc, sign off, wrap on).
const H = require('./h'); const { run, press, fresh, wrap, signView, dms, hms, S, check, summary } = H;
(async () => {
  const { browser, page, errs } = await H.open(); let v;
  const f = () => fresh(page, 'arc');
  await f(); v = await run(page, '=');                  check('= on the empty display', v.msg, 'Nothing to work out yet.');
  await f(); v = await run(page, '+ 5 =');              check('+ 5 = on the empty display', v.val, dms(S(5)));
  await f(); v = await run(page, 'n');                  check('± on the empty display starts a negative entry', v.val, '−0° 00′ 00″');
  await f(); v = await run(page, '0 = n');              check('0 = ± negates the committed 0', v.last, '−(0° 00′ 00″) = 0° 00′ 00″');
  v = await run(page, '5 =');                           check('  then 5 = is positive', v.val, dms(S(5)));
  await f(); v = await run(page, '5 + - * / + 3 =');    check('operator changes before typing', v.val, dms(S(8)));
  await f(); v = await run(page, '5 * + 3 =');          check('× changed to +', v.val, dms(S(8)));
  await f(); v = await run(page, '5 + * 2 =');          check('+ changed to ×', v.val, dms(S(10)));
  await f(); v = await run(page, '5 + 3 -');            check('operator after typing evaluates', v.pending, '8° 00′ 00″ −');
  await f(); v = await run(page, '5 + 3 C');            check('C clears the right value, keeps the operation', v.pending + '|' + v.val, '5° 00′ 00″ +|0° 00′ 00″');
  v = await run(page, '4 =');                           check('  then 4 =', v.val, dms(S(9)));
  await f(); v = await run(page, '5 + 3 C C');          check('C C clears all', v.pending + '|' + v.val, '|0° 00′ 00″');
  await f(); v = await run(page, '5 + M:time 3 =');     check('arc + time refused', v.msgBad, true);
  v = await run(page, 'M:arc 3 =');                     check('  tap ° and retype', v.val, dms(S(8)));
  await f(); v = await run(page, '5 + M:time 3 = @OE =');  check('  or recall a register', v.val, dms(S(28,26)));
  await f(); v = await run(page, '5 / 0 =');            check('÷ 0 refused, operation kept', v.msgBad + '|' + v.pending, 'true|5° 00′ 00″ ÷');
  v = await run(page, '2 =');                           check('  then 2 =', v.val, dms(S(2,30)));
  // the unit key over a number slot with nothing typed in it starts an empty entry: = asks for the number, as after + u
  await f(); v = await run(page, '5 / 30 u sin u =');   check('÷, a computed number, then the unit key: = asks for the number', [v.msg, v.pending].join('|'), 'Type the number after ÷ first.|5° 00′ 00″ ÷');
  v = await run(page, '3 =');                           check('  then 3 =', v.val, '1.6666666…');
  await f(); v = await run(page, '5 / u =');            check('÷ then the unit key alone: = asks for the number', [v.msg, v.pending].join('|'), 'Type the number after ÷ first.|5° 00′ 00″ ÷');
  await f(); v = await run(page, 'dec 2 * u =');        check('number × then the unit key alone: = asks for the number', [v.msg, v.pending].join('|'), 'Type the number after × first.|2 ×');
  await f(); v = await run(page, '5 / 30 sin u bs bs bs ='); check('a typed number made the first field, then erased: = asks for the number', v.msg, 'Type the number after ÷ first.');
  await f(); v = await run(page, '5 / 30 sin u =');     check('  kept: = divides by it', v.val, '0.1666666…');
  await f(); v = await run(page, '5 + 3 sin');          check('unary on the right operand', v.val + '|' + v.right, '0.0523359…|true');
  v = await run(page, '=');                             check('  = then refuses arc + number', v.msgBad, true);
  v = await run(page, 'dec =');                         check('  dec converts it, = adds', v.val, dms(S(5,3,8)));
  await f(); v = await run(page, '5 * 2 dec');          check('dec on the × operand refused', v.msgBad, true);
  await f(); v = await run(page, '5 * 2 = dec');        check('dec on a result is a view', v.val, '10°');
  await f(); v = await run(page, '5 / 1 u = =');        check('= on a computed number stays', v.val, '5');
  v = await run(page, 'dec');                           check('  dec converts', v.val, dms(S(5)));
  await f(); v = await run(page, '5 / 1 u = M:time dec'); check('ratio, tap h, dec → time', v.val, hms(S(5)));
  await f(); v = await run(page, 'dec 1.5 dec');        check('dec on a typed number converts', v.val, dms(S(1,30)));
  await f(); v = await run(page, '23 u 26 u 12 dec');   check('dec on a typed arc → view', v.val, '23.43666°');
  v = await run(page, '5 =');                           check('  a digit with dec on types a number; = converts', v.val, dms(S(5)));
  await f(); v = await run(page, 'M:time 15 u 55 / 24 u ='); check('÷ 24 h m s → ratio', v.val, '0.6631944…');
  await f(); v = await run(page, 'M:time 15 u 55 / 24 =');   check('÷ 24 → time', v.val, hms(S(0,39,48)));
  await f(); v = await run(page, 'M:time 15 u 55 / M:arc');  check('÷ then ° refused (time ÷ arc)', v.msgBad, true);
  await f(); v = await run(page, 'M:time 15 u 55 / 2.5 u');  check('÷ 2.5 then h m s refused', v.msgBad, true);
  await f(); v = await run(page, 'M:time 15 u 55 * 2 u');    check('× 2 h m s refused (ratio hint)', v.msgBad, true);
  await f(); v = await run(page, 'dec 2 * 3 u 30 =');        check('number × 3° 30′', v.val, dms(S(7)));
  await f(); v = await run(page, 'dec 2 / 3 u');             check('number ÷ ° refused', v.msgBad, true);
  await f(); v = await run(page, 'dec 2 + 3 u');             check('number + ° refused', v.msgBad, true);
  await f(); v = await run(page, '5 / 2 u 30 =');            check('5° ÷ 2° 30′ = 2', v.val, '2');
  await f(); v = await run(page, '5 / 361 u');               check('÷ 361 ° refused', v.msgBad, true);
  await f(); v = await run(page, 'M:time 5 / 25 u');         check('÷ 25 h m s refused', v.msgBad, true);
  await f(); v = await run(page, '5 / 0 u 60');              check('60 in the minutes refused', v.msgBad, true);
  await f(); await press(page, '23 u 26 u 54 >OE');
  v = await run(page, 'AC 5 + @OE =');                       check('recall into the right slot', v.val, dms(S(28,26,54)));
  await f(); v = await run(page, '5 + @OE 3 =');             check('typing after a recall replaces it', v.val, dms(S(8)));
  await f(); v = await run(page, '5 + 3 sto @x =');          check('store the typed right operand, = still works', v.regs.x.sec + '|' + v.val, S(3) + '|' + dms(S(8)));
  await f(); v = await run(page, '5 + sto @x');              check('sto in an empty right slot refused', v.msgBad, true);
  await f(); v = await run(page, '5 + 3 = = =');             check('repeated =', v.val, dms(S(8)));
  await f(); v = await run(page, '23 u 26 bs bs bs');        check('backspace across fields', v.val, '23° 00′ 00″');
  await f(); v = await run(page, 'n bs');                    check('backspace removes the minus', v.val, '0° 00′ 00″');
  await f(); v = await run(page, '5 + 3 = bs');              check('backspace on a result refused', v.msgBad, true);
  await f(); v = await run(page, '5 n');                     check('± mid-entry', v.val, '−5° 00′ 00″');
  v = await run(page, 'u 30 n =');                           check('  ± again', v.val, dms(S(5,30)));
  v = await run(page, 'n');                                  check('± on a value writes a line', v.last, '−(5° 30′ 00″) = −5° 30′ 00″');
  await f(); v = await run(page, '90 cos n');                check('± on a computed 0 stays a number', v.val + '|' + v.sval.k + '|' + v.last, '0|dec|−(0) = 0');
  v = await run(page, '/ 2 = atan');                         check('  ÷ 2 = tan⁻¹ → 0°', v.val, dms(0));
  await f(); v = await run(page, '3 - 5 =');                 check('3 − 5 wraps', v.val, dms(S(358)));
  await f(); v = await run(page, 'n 3 - 5 =');               check('−3 − 5 stays signed', v.val, '−' + dms(S(8)));
  await f(); v = await run(page, 'M:time n 3 + 2 =');        check('times always wrap', v.val, hms(S(23)));
  await f(); v = await run(page, 'n 200 p180');              check('−200° +180 stays signed', v.val, '−' + dms(S(20)));
  await f(); v = await run(page, '200 p180');                check('200° +180 wraps', v.val, dms(S(20)));
  await f(); v = await run(page, 'M:time n 1 x15');          check('−01:00 ×15', v.val, '−' + dms(S(15)));
  await f(); v = await run(page, 'M:time 24 x15');           check('24:00 ×15 = 360°', v.val, dms(S(360)));
  await f(); v = await run(page, '360 d15');                 check('360° ÷15 = 24:00', v.val, hms(S(24)));
  await f(); v = await run(page, '360 u 30');                check('360° 30′ refused', v.msgBad, true);
  await f(); v = await run(page, 'M:time 24 u 30');          check('24:30 refused', v.msgBad, true);
  await f(); v = await run(page, '340 u 10 + 31 u 50 =');    check('340° 10′ + 31° 50′ with the note', v.val + '|' + v.note, '12° 00′ 00″|372° 00′ 00″ → 12° 00′ 00″');
  await f(); v = await run(page, '23 u 26 M:time');          check('° → h mid-entry keeps the digits', v.val, '23:26:00');
  await f(); v = await run(page, '25 u 26 M:time');          check('25 → h refused', v.msgBad, true);
  await f(); v = await run(page, 'n 5 M:time M:arc =');      check('± 5, h, ° = keeps the minus', v.val, '−' + dms(S(5)));
  await f(); v = await run(page, 'dec n 5 M:time M:arc =');  check('dec ± 5, h, ° = keeps the minus', v.val, '−' + dms(S(5)));
  await f(); await press(page, '5 + 3'); await wrap(page, false); v = await run(page, '=');  check('wrap toggled mid-entry', v.val + '|' + v.wrap, '8° 00′ 00″|false'); await wrap(page, true);
  await f(); await press(page, '5 + 3'); await page.evaluate(() => window.takht.applyLang('ja')); v = await run(page, '='); await page.evaluate(() => window.takht.applyLang('en')); check('language switched mid-entry', v.val, dms(S(8)));
  await f(); await page.evaluate(() => window.takht.applyLang('fr')); v = await run(page, '5 / 3 u ='); await page.evaluate(() => window.takht.applyLang('en')); check('French ratio uses a comma', v.val, '1,6666666…');
  // sign-form entry
  await f(); await signView(page, true);
  v = await run(page, '25 u 21 u 41 u u u u u u u u u =');   check('sign entry ♐ = 265° 21′ 41″', v.val + '|' + v.last, '25° 21′ 41″ ♐|25° 21′ 41″ ♐ = 265° 21′ 41″');
  v = await run(page, 'AC 25 u 21 u 41 =');                  check('= without a sign refused', v.msgBad, true);
  v = await run(page, 'AC 30');                              check('30 in a sign refused', v.msgBad, true);
  v = await run(page, 'AC 5 n');                             check('± in sign entry refused', v.msgBad, true);
  v = await run(page, 'AC n');                               check('± on the empty sign entry refused', v.msgBad, true);
  v = await run(page, 'AC 0 u u u = n');                     check('± on a committed 0 ♈ negates, no new entry', v.last + '|' + (v.entry == null), '−(0° 00′ 00″ ♈ (0° 00′ 00″)) = 0° 00′ 00″|true');
  v = await run(page, 'AC 25 u 21 u 41 sign');               check('sign off before choosing keeps the digits', v.val + '|' + v.view.sign, '25° 21′ 41″|false'); await signView(page, true);
  v = await run(page, 'AC M:time n 5 M:arc');                check('sign on: h ± 5 ° is an absolute negative entry', v.val + '|' + JSON.stringify(v.entry && [v.entry.sign, v.entry.neg]), '−5° 00′ 00″|[false,true]');
  v = await run(page, '=');                                  check('  = keeps the minus (sign view shows 25° ♓)', v.sval.sec + '|' + v.val, '-18000|25° 00′ 00″ ♓');
  v = await run(page, 'AC 5 u u u u M:time M:arc =');        check('a chosen sign taken through h and back must be chosen again', v.msgBad, true);
  await signView(page, false);
  await f(); v = await run(page, 'M:time 5 sign');           check('sign in time refused', v.msgBad, true);
  await f(); v = await run(page, '5 / 1 u = sign');         check('sign on a computed number refused', v.msgBad, true);
  // keyboard
  await f(); await page.keyboard.type("23'26\"12+48'13\"56"); await page.keyboard.press('Enter'); v = await H.view(page); check('keyboard: 23°26′12″ + 48°13′56″ Enter', v.val, dms(S(71,40,8)));
  await page.keyboard.press('m'); await page.keyboard.type('15 55'); await page.keyboard.press('t'); v = await H.view(page); check('keyboard: m, Space, t', v.val, dms(S(238,45)));
  await page.keyboard.press('T'); await page.keyboard.press('d'); v = await H.view(page); check('keyboard: T, d', v.val, '15.91666 h');
  await page.keyboard.press('d'); await page.keyboard.press('n'); v = await H.view(page); check('keyboard: n', v.val, '−' + hms(S(15,55)));
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.keyboard.press('?'); check('keyboard: ? opens Help', await page.evaluate(() => document.querySelector('#help').classList.contains('open')), true); await page.keyboard.press('Escape');
  // mixed kinds: a decimal on the right can be turned by dec; one already on the left of + cannot, so the message says start again
  await fresh(page, 'time'); await press(page, 'AC M:time 1 u >LST');
  v = await run(page, 'AC dec 1.5 + @LST =');           check('decimal + time, decimal on the left: start again', v.msg, 'A decimal and h m s cannot be added. Press C twice, dec, type the decimal, dec, then +.');
  v = await run(page, 'C C dec 1.5 dec + @LST =');       check('  its keys exactly as printed give 1.5 h + 1 h = 02:30:00', v.val, hms(S(2,30)));
  v = await run(page, 'AC @LST + dec .5 =');             check('time + decimal, decimal on the right: press dec on it', v.msg, 'A decimal and h m s cannot be added. Press dec on the decimal to turn it into h m s.');
  v = await run(page, 'dec =');                          check('  following it gives 01:30:00', v.val, hms(S(1,30)));
  // the decimal on the right, but the other units selected: dec would convert into those, so choose the units first
  await fresh(page, 'arc');
  v = await run(page, 'AC M:arc 5 + M:time dec .5 =');   check('5° + (h selected) 0.5: tap ° first', v.msg, 'A decimal and ° ′ ″ cannot be added. Tap °, then press dec on the decimal.');
  v = await run(page, 'M:arc dec =');                     check('  following it gives 5° 30′ 00″', v.val, dms(S(5,30)));
  v = await run(page, 'AC M:time 5 u − M:arc dec .5 =');  check('05:00:00 − (° selected) 0.5: tap h first', v.msg, 'A decimal and h m s cannot be subtracted. Tap h, then press dec on the decimal.');
  v = await run(page, 'M:time dec =');                    check('  following it gives 04:30:00', v.val, hms(S(4,30)));
  // the pocket-calculator habits: 2326 and 23 . are refused with the unit key named, in arc and in time (U-3)
  await f(); v = await run(page, '2 3 2 6');            check('2326 in arc: 232° kept, the refusal names ° ′ ″', v.val + '|' + v.msg, dms(S(232)) + '|Degrees run 0–360. For the minutes, press ° ′ ″.');
  await f(); v = await run(page, '2 3 .');              check('23 . in arc: the refusal names ° ′ ″, then dec', v.val + '|' + v.msg, dms(S(23)) + '|For the minutes, press ° ′ ″. For a decimal, press dec first.');
  await f(); v = await run(page, '23 u 26 .');          check('  a point in the minutes names the seconds', v.msg, 'For the seconds, press ° ′ ″. For a decimal, press dec first.');
  await fresh(page, 'time'); v = await run(page, '2 3 2 6'); check('2326 in time: 23 h kept, the refusal names h m s', v.val + '|' + v.msg, hms(S(23)) + '|Hours run 0–24. For the minutes, press h m s.');
  await fresh(page, 'time'); v = await run(page, '2 3 .');   check('23 . in time: the refusal names h m s, then dec', v.val + '|' + v.msg, hms(S(23)) + '|For the minutes, press h m s. For a decimal, press dec first.');
  // round 7. S7-3: a replacement typed over a recalled value and erased leaves the slot empty: = asks for the number
  for (const [op, k] of [['+', '+'], ['×', '*'], ['÷', '/']]) {
    await f(); v = await run(page, `5 ${k} @OE 3 bs =`); check(`5 ${op} OE, 3 typed and erased, = asks for the number`, [v.msg, v.pending].join('|'), `Type the number after ${op} first.|5° 00′ 00″ ${op}`); }
  await f(); v = await run(page, '5 + @OE . bs bs =');  check('5 + OE, a point typed and erased, = asks for the number', v.msg, 'Type the number after + first.');
  await f(); await page.evaluate(() => { window.takht.state.regs.LST = null; });
  v = await run(page, '5 + @OE 3 bs sto @LST');         check('  sto LST after the erasure refuses and stores nothing', [v.msg, v.regs.LST].join('|'), 'Type the number after + first.|');
  await f(); v = await run(page, '5 + 0 =');            check('  control: 5 + 0 = is 5°', v.val, dms(S(5)));
  await f(); v = await run(page, '5 * 0 =');            check('  control: 5 × 0 = is 0°', v.val, dms(0));
  await f(); v = await run(page, '5 + @OE 3 bs 4 =');   check('  control: 5 + OE, 3 erased, 4 = is 9°', v.val, dms(S(9)));
  // S7-6: in sign entry the point's refusal names sign, and its recovery works
  await f(); v = await run(page, 'sign 2 3 .');         check('sign 23 . : the refusal says to turn sign off, then press dec', v.msg, 'For the minutes, press ° ′ ″. For a decimal, turn sign off, then press dec.');
  v = await run(page, 'sign dec 2 3 . 5 =');            check('  following it, 23.5 = gives 23° 30′ 00″', v.val, dms(S(23, 30)));
  // S7-7: an empty register while an operation waits for its number names that operation, and following it stores
  await f(); await page.evaluate(() => { window.takht.state.regs.LST = null; });
  v = await run(page, '5 + @LST');                      check('5 + LST (empty): the message names the + waiting for its number', v.msg, 'LST is empty. Type the number after +, then hold LST to store it.');
  v = await run(page, '3 sto @LST');                    check('  following it (3, sto, LST) stores 3° and keeps 5° + waiting', [v.regs.LST && v.regs.LST.sec, v.pending].join('|'), `${S(3)}|5° 00′ 00″ +`);
  await f(); await page.evaluate(() => { window.takht.state.regs.LST = null; });
  v = await run(page, '5 + 3 @LST');                    check('  with 3 typed, the ordinary advice stands', v.msg, 'LST is empty. Hold LST, or press sto then LST, to store the display.');
  // S7-18: a key that cancels sto keeps the cancellation beside its own message; a refusal keeps its reason alone
  await f(); v = await run(page, '5 sto M:time');       check('5 sto, then h: sto cancelled and the mode both said', v.msg, 'sto cancelled. Time: hours, minutes, seconds.');
  check('  sto is off', await page.evaluate(() => window.takht.state.sto), false);
  await f(); v = await run(page, '5 + sto =');          check('5 + sto =: the refusal keeps its reason alone', v.msg + '|' + await page.evaluate(() => window.takht.state.sto), 'Type the number after + first.|false');
  await f(); await run(page, '5 sto 3 bs .');           check('  entry edits leave sto armed', await page.evaluate(() => window.takht.state.sto), true);
  // S7-8: ± keeps a typed number typed, so = still turns it into ° ′ ″, after store and recall as well; a computed one stays a number
  await f(); v = await run(page, 'AC dec 23.4367 sto @x @x n'); check('typed 23.4367, sto x, x, ±: the display', v.val, '−23.4367');
  v = await run(page, '=');                             check('  then = turns it into −23° 26′ 12″', v.val, dms(-S(23, 26, 12)));
  await f(); v = await run(page, 'AC dec 23.4367 >x n ='); check('typed 23.4367 held into x, ±, = gives −23° 26′ 12″', v.val, dms(-S(23, 26, 12)));
  await f(); v = await run(page, 'AC dec 1 / 4 = n =');  check('  control: a computed −0.25 stays a number on =', [v.val, v.msg].join('|'), '−0.25|This number stays a number. Press dec to turn it into ° ′ ″.');
  await f(); v = await run(page, 'AC dec 0 >x n =');     check('  control: a typed 0, ±, = is 0°, no minus', v.val, dms(0));
  // PR #22 review 2, F1: in sign entry an empty register's advice names the sign first, which the store needs; following it stores
  await f(); await page.evaluate(() => { window.takht.state.regs.LST = null; });
  v = await run(page, 'sign 2 3 @LST');                 check('sign 23, LST empty: the message says to choose the sign first', v.msg, 'LST is empty. Choose the sign first (press ° ′ ″ until it shows), then hold LST.');
  v = await run(page, 'u u u >LST');                    check('  following it (° ′ ″ to the sign, hold LST) stores 23° Aries', v.regs.LST && v.regs.LST.sec, S(23));
  await signView(page, false); await f();
  check('no page errors', errs.join('|'), ''); summary(); await browser.close();
})();
