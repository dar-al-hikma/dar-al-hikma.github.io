// Focus and keyboard with real clicks and key presses; the 300-line history on desktop; the history sheet across a turn to
// landscape; the field and sign being typed, said in the live region.
const H = require('./h'); const { press, view, fresh, check, summary, dms, S } = H;
(async () => {
  const browser = await H.chromium.launch();
  for (const vp of [[1400,860],[1024,768],[700,900]]) { const { page, errs } = await H.open({ browser, viewport: { width: vp[0], height: vp[1] } }); const tag = vp.join('×');
    await page.click('.helpbtn'); await page.waitForTimeout(300); check(`${tag} Help opens with focus inside`, await page.evaluate(() => document.activeElement.id), 'helpClose');
    const seen = new Set(); for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); seen.add(await page.evaluate(() => document.activeElement.closest('#help') ? 'in' : 'out')); } check(`${tag} Tab stays inside Help`, [...seen].join(','), 'in');
    await page.keyboard.press('Escape'); await page.waitForTimeout(100); check(`${tag} Escape returns focus to ?`, await page.evaluate(() => document.activeElement.className), 'helpbtn');
    await page.keyboard.type('2+3'); await page.keyboard.press('Enter'); await page.waitForTimeout(100); check(`${tag} 2 + 3 Enter after Help`, (await view(page)).val + '|' + await page.evaluate(() => document.querySelector('#help').classList.contains('open')), '5° 00′ 00″|false');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.focus('.helpbtn'); await page.keyboard.press('Enter'); await page.waitForTimeout(300); check(`${tag} Enter on a focused ? opens Help`, await page.evaluate(() => document.querySelector('#help').classList.contains('open')), true); await page.keyboard.press('Escape');
    await page.focus('[data-k="reg:OE"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(50); check(`${tag} Enter on a focused OE recalls it`, (await view(page)).last, 'OE → 23° 26′ 00″');
    await page.focus('[data-k="7"]'); await page.keyboard.press(' '); await page.waitForTimeout(50); check(`${tag} Space on a focused 7 types 7`, (await view(page)).val, '7° 00′ 00″');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.keyboard.type("23'26\"12+48'13\"56"); await page.keyboard.press('Enter'); await page.waitForTimeout(50); check(`${tag} live region`, (await view(page)).live, '23° 26′ 12″ + 48° 13′ 56″ = 71° 40′ 08″');
    const before = await page.evaluate(() => document.documentElement.scrollHeight); for (let i = 0; i < 300; i++) await page.evaluate(() => { window.takht.press('+'); window.takht.press('1'); window.takht.press('='); });
    const after = await page.evaluate(() => { const l = document.querySelector('#tapeList'); const li = l.lastElementChild, r = li.getBoundingClientRect(), lr = l.getBoundingClientRect(); return { page: document.documentElement.scrollHeight, newest: r.bottom <= lr.bottom + 1 && r.top >= lr.top - 1 }; });
    check(`${tag} 300 history lines: page height unchanged, newest line visible`, after.page + '|' + after.newest, before + '|true'); check(`${tag} no errors`, errs.join('|'), ''); await page.context().close(); }
  for (const vp of [[390,844],[320,568]]) { const { page, errs } = await H.open({ browser, viewport: { width: vp[0], height: vp[1] }, touch: true }); const tag = vp.join('×');
    await press(page, 'AC M:arc 5 + 3 ='); await page.click('#tapeHandle'); await page.waitForTimeout(350); check(`${tag} sheet takes focus`, await page.evaluate(() => document.activeElement.id), 'tapeClose');
    const seen = new Set(); for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); seen.add(await page.evaluate(() => document.activeElement.closest('#tape') ? 'in' : 'out')); } for (let i = 0; i < 4; i++) { await page.keyboard.press('Shift+Tab'); seen.add(await page.evaluate(() => document.activeElement.closest('#tape') ? 'in' : 'out')); }
    check(`${tag} Tab and Shift+Tab stay inside the sheet`, [...seen].join(','), 'in'); check(`${tag} calculator inert behind the sheet`, await page.evaluate(() => document.querySelector('.calc').inert), true);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300); check(`${tag} Escape closes the sheet and returns focus`, await page.evaluate(() => document.querySelector('#tape').classList.contains('open') + '|' + document.activeElement.id + '|' + document.querySelector('.calc').inert), 'false|tapeHandle|false');
    await page.click('#tapeHandle'); await page.waitForTimeout(350); await page.click('.tl[data-i="0"]'); await page.waitForTimeout(400); check(`${tag} tapping a line recalls and closes`, (await view(page)).val + '|' + await page.evaluate(() => document.querySelector('#tape').classList.contains('open')), '8° 00′ 00″|false');
    await page.click('.helpbtn'); await page.waitForTimeout(350); await page.keyboard.press('Escape'); await page.waitForTimeout(300); check(`${tag} Help Escape → ?`, await page.evaluate(() => document.activeElement.className), 'helpbtn');
    await press(page, 'AC M:arc 5 + 3'); const c = await (await page.$('#kC')).boundingBox(); await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up(); await page.waitForTimeout(50); let v = await view(page); check(`${tag} hold C → all clear`, v.pending + '|' + v.val, '|0° 00′ 00″');
    await press(page, 'AC M:arc 7'); const x = await (await page.$('[data-k="reg:x"]')).boundingBox(); await page.mouse.move(x.x + x.width / 2, x.y + x.height / 2); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up(); await page.waitForTimeout(50); v = await view(page); check(`${tag} hold x stores`, v.regs.x && v.regs.x.sec, S(7));
    await page.click('#kC'); await page.click('#kC'); await page.waitForTimeout(50); check(`${tag} tap C twice → all clear`, (await view(page)).msg, 'All clear.'); check(`${tag} no errors`, errs.join('|'), ''); await page.context().close(); }
  // History open on a phone, then turned to landscape: the sheet gives way to the history beside the keys
  { const { page, errs } = await H.open({ browser, viewport: { width: 390, height: 844 }, touch: true });
    await press(page, 'AC M:arc 5 + 3 ='); await page.click('#tapeHandle'); await page.waitForTimeout(350);
    await page.setViewportSize({ width: 844, height: 390 }); await page.waitForTimeout(350);
    check('390×844 → 844×390 with History open: calculator not inert, scrim hidden, no dialog left', await page.evaluate(() => [document.querySelector('.calc').inert, document.querySelector('.page').inert, getComputedStyle(document.querySelector('#scrim')).pointerEvents, String(document.querySelector('#tape').getAttribute('aria-modal'))].join('|')), 'false|false|none|null');
    check('  focus goes to the latest history line, not to "clear history"', await page.evaluate(() => { const a = document.activeElement, ls = document.querySelectorAll('#tapeList .tl'); return a === ls[ls.length - 1]; }), true);
    await page.keyboard.press('Enter'); await page.waitForTimeout(100); check('  Enter there keeps the history and brings back 8°', (await view(page)).n + '|' + (await view(page)).val, '1|' + dms(S(8)));
    await page.keyboard.press('Escape'); await page.waitForTimeout(100); check('  Escape then leaves 8° on the display', (await view(page)).val, dms(S(8)));
    let reached = false; for (let i = 0; i < 60 && !reached; i++) { await page.keyboard.press('Tab'); reached = await page.evaluate(() => !!document.activeElement.closest('.calc')); }
    check('  Tab reaches the calculator', reached, true);
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(350); await page.click('#tapeHandle'); await page.waitForTimeout(350); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    check('  back on the phone: the sheet opens and Escape closes it, 8° kept', await page.evaluate(() => document.querySelector('#tape').classList.contains('open') + '|' + document.querySelector('.calc').inert) + '|' + (await view(page)).val, 'false|false|' + dms(S(8)));
    check('  no errors', errs.join('|'), ''); await page.context().close(); }
  // the field being typed and the sign chosen are said in the live region, as the look of the display shows them
  for (const [lang, want] of [['en', ['minutes', 'seconds', 'minutes', 'degrees', 'hours', 'Aries', 'Taurus', 'seconds']], ['de', ['Minuten', 'Sekunden', 'Minuten', 'Grad', 'Stunden', 'Widder', 'Stier', 'Sekunden']]]) {
    const { page, errs } = await H.open({ browser, viewport: { width: 1024, height: 768 }, lang }); await fresh(page); const live = async () => (await view(page)).live; const got = [];
    await page.keyboard.type('5'); await page.keyboard.press("'"); got.push(await live()); await page.keyboard.press("'"); got.push(await live());
    await page.keyboard.press('Backspace'); got.push(await live()); await page.keyboard.press('Backspace'); got.push(await live());
    await fresh(page, 'time'); await page.keyboard.type('5'); await page.keyboard.press("'"); await page.keyboard.press('Backspace'); got.push(await live());
    await fresh(page); await page.keyboard.press('s'); await page.keyboard.type("1'2'3'"); got.push(await live()); await page.keyboard.press("'"); got.push(await live());
    await page.keyboard.press('Backspace'); got.push(await live()); await page.keyboard.press('s');
    check(`${lang}: the live region names the field after the unit key and Backspace, and the sign when it changes`, got.join(', '), want.join(', '));
    check(`${lang}: no errors`, errs.join('|'), ''); await page.context().close(); }
  // a completed hold released off its key leaves no click; the next keyboard press on another key still counts
  { const { page, errs } = await H.open({ browser, viewport: { width: 1024, height: 768 } }); await fresh(page); await press(page, 'AC 5 + 3 =');
    const bx = await page.locator('.k[data-reg="x"]').boundingBox();
    await page.mouse.move(bx.x + bx.width/2, bx.y + bx.height/2); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.move(5, 5); await page.mouse.up();
    check('hold x released off the key stores 8°', (await view(page)).regs.x.sec, S(8));
    await page.locator('[data-k="7"]').focus(); await page.keyboard.press('Enter');
    check('  then Enter on 7 types 7 at once', (await view(page)).val, dms(S(7)));
    check('  no errors', errs.join('|'), ''); await page.context().close(); }
  // holds by touch, through the gesture pipeline a phone uses (CDP touch events): a hold is one action, and its release
  // is not also a press; a tap straight after it counts (round 6, S6-8 and S6-20)
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(H.URL); await page.waitForFunction(() => window.takht); await fresh(page); const cdp = await ctx.newCDPSession(page);
    const at = async sel => { const r = await page.locator(sel).first().boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    const touch = async (sel, ms) => { const p = await at(sel); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] }); await page.waitForTimeout(ms); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(80); };
    await press(page, 'AC 5 + 3 ='); const n = (await view(page)).n; await touch('[data-k="reg:x"]', 800); let v = await view(page);
    check('touch hold on x stores 8° and adds one history line (no recall from its release)', [v.regs.x && v.regs.x.sec, v.n - n, v.last].join('|'), [S(8), 1, '8° 00′ 00″ → x'].join('|'));
    await touch('[data-k="reg:x"]', 60); check('  a touch tap on x straight after it recalls x', (await view(page)).last, 'x → 8° 00′ 00″');
    await press(page, 'AC M:arc 5 + 3'); await touch('#kC', 800); v = await view(page);
    check('touch hold on C clears all, and its release does not arm C again', [v.pending, v.val, await page.evaluate(() => window.takht.state.cArmed), await page.$eval('#kC', e => e.textContent)].join('|'), ['', dms(0), false, 'C'].join('|'));
    await press(page, 'AC M:arc 5 +'); await touch('[data-k="reg:x"]', 800); const m1 = (await view(page)).msg; await press(page, '='); v = await view(page);
    check('a touch store refused for want of a number keeps its reason, and = refuses again (no x recalled into the slot)', [m1, v.msgBad, v.pending, v.val].join('|'), ['Type the number after + first.', true, '5° 00′ 00″ +', dms(0)].join('|'));
    // round 7, S7-13: a key typed on a keyboard while the finger still holds C stays; the lift is still the hold's own
    await press(page, 'AC M:arc 5 + 3'); const pc = await at('#kC'); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pc] });
    await page.waitForTimeout(800); await page.keyboard.press('7'); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(80); v = await view(page);
    check('touch hold on C, a hardware 7, then the lift: 7 stays and C is not armed', [v.val, await page.evaluate(() => window.takht.state.cArmed), await page.$eval('#kC', e => e.textContent)].join('|'), [dms(S(7)), false, 'C'].join('|'));
    await press(page, 'AC 5 + 3 ='); await page.tap('#tapeHandle'); await page.waitForTimeout(350); const hd = await at('.tape-head');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [hd] });
    for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: hd.x, y: hd.y + i * 15 }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(350);
    check('a touch swipe down the history sheet\'s head closes it', await page.evaluate(() => document.querySelector('#tape').classList.contains('open')), false);
    check('  no errors', errs.join('|'), ''); await ctx.close(); }
  // a mouse hold released on its key swallows only its own click: Enter on another key just after still counts
  { const { page, errs } = await H.open({ browser, viewport: { width: 1024, height: 768 } }); await fresh(page); await press(page, 'AC 5 + 3 =');
    const bx = await page.locator('.k[data-reg="x"]').boundingBox();
    await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up(); await page.waitForTimeout(50);
    check('mouse hold on x released on the key stores 8°, one line', (await view(page)).last, '8° 00′ 00″ → x');
    await page.locator('[data-k="7"]').focus(); await page.keyboard.press('Enter');
    check('  then Enter on 7 types 7 at once', (await view(page)).val, dms(S(7)));
    // round 7, S7-13: a key typed while the mouse button still holds x stays; the release after it is still the hold's own
    await page.evaluate(() => document.activeElement && document.activeElement.blur()); await press(page, 'AC 8 u ='); const n13 = (await view(page)).n;
    await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await page.mouse.down(); await page.waitForTimeout(800);
    await page.keyboard.press('7'); await page.mouse.up(); await page.waitForTimeout(50); const v13 = await view(page);
    check('mouse hold on x, a hardware 7, then the release: 7 stays and x adds only its store line', [v13.val, v13.n - n13, v13.last].join('|'), [dms(S(7)), 1, '8° 00′ 00″ → x'].join('|'));
    check('  no errors', errs.join('|'), ''); await page.context().close(); }
  // PR #22 review (P22-1, R22-1): the hold's own release click is the one after its pointer is up, wherever it comes up.
  // Enter or Space on the focused key while the pointer is still down is that key's press, and the later release is swallowed
  { const { page, errs } = await H.open({ browser, viewport: { width: 1024, height: 768 } }); const cdp = await page.context().newCDPSession(page);
    const at = async sel => { const r = await page.locator(sel).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    const mouse = (type, p, buttons) => cdp.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons, clickCount: 1 });
    const hold = async (sel, keyDuring, releaseAt) => { const p = await at(sel); await page.focus(sel); await mouse('mouseMoved', p, 0); await mouse('mousePressed', p, 1);
      await page.waitForTimeout(800); for (const k of keyDuring) await page.keyboard.press(k); await mouse('mouseReleased', releaseAt || p, 0); await page.waitForTimeout(80); };
    await fresh(page); await page.evaluate(() => { window.takht.state.regs.x = null; }); await press(page, 'AC 8');
    await hold('[data-k="reg:x"]', ['Enter', '7']); let v = await view(page);
    check('mouse hold on focused x, Enter, 7, release: Enter recalls x, and 7 stays', [v.val, v.last].join('|'), [dms(S(7)), 'x → 8° 00′ 00″'].join('|'));
    await fresh(page); await press(page, 'AC 5 + 3'); await hold('#kC', [' ', '7']); v = await view(page);
    check('mouse hold on focused C, Space, 7, release: 7 stays and C is not armed by the release', [v.val, await page.evaluate(() => window.takht.state.cArmed)].join('|'), [dms(S(7)), false].join('|'));
    await fresh(page); await page.evaluate(() => { window.takht.state.regs.x = null; }); await press(page, 'AC 8'); const x = await at('[data-k="reg:x"]');
    await hold('[data-k="reg:x"]', [], { x: x.x, y: 5 }); await page.waitForTimeout(1200); await page.keyboard.press('7');
    await page.focus('[data-k="reg:x"]'); await page.keyboard.press('Enter'); v = await view(page);
    check('mouse hold on x released off the key with no move seen, 7, then Enter on the focused x recalls 8°', v.val, dms(S(8)));
    check('  no errors', errs.join('|'), ''); await page.context().close(); }
  // on a phone Help starts under the display, so the value stays in sight; the Tab trap, Escape and focus return as before (U-5)
  for (const [w, h] of [[320,568],[350,600],[360,560],[375,553],[390,664],[390,844]]) { const { page, errs } = await H.open({ browser, viewport: { width: w, height: h }, touch: true }); const tag = `${w}×${h}`;
    await press(page, 'AC M:arc 5 + 3'); await page.click('.helpbtn'); await page.waitForTimeout(350);
    const g = await page.evaluate(() => ({ top: document.querySelector('#help').getBoundingClientRect().top, display: document.querySelector('.display').getBoundingClientRect().bottom, focus: document.activeElement.id }));
    check(`${tag} Help starts at or below the display's bottom, with focus inside`, [g.top >= g.display - 0.5, g.focus].join('|'), 'true|helpClose', JSON.stringify(g));
    const seen = new Set(); for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); seen.add(await page.evaluate(() => document.activeElement.closest('#help') ? 'in' : 'out')); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    check(`${tag}   Tab stays inside; Escape closes it and returns focus to ?`, [...seen].join(',') + '|' + await page.evaluate(() => document.querySelector('#help').classList.contains('open') + '|' + document.activeElement.className), 'in|false|helpbtn');
    check(`${tag}   no errors`, errs.join('|'), ''); await page.context().close(); }
  // round 7, S7-12: a message from inside Help (its wrap switch) grows the display; Help moves down with it
  { const { page, errs } = await H.open({ browser, viewport: { width: 320, height: 568 }, lang: 'fr' }); await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; }); await press(page, 'AC 123 u =');
    await page.click('.helpbtn'); await page.waitForTimeout(300);
    const where = () => page.evaluate(() => ({ help: document.querySelector('#help').getBoundingClientRect().top, val: document.querySelector('#val').getBoundingClientRect().bottom,
      display: document.querySelector('.display').getBoundingClientRect().bottom }));
    const before = await where(); await page.click('#wrapSwitch'); await page.waitForTimeout(200); const after = await where();
    check('fr, 320×568, 200 %: Help starts below the value when it opens', before.help >= before.val, true, JSON.stringify(before));
    check('  and still after its wrap switch makes the display taller', [after.display > before.display, after.help >= after.val].join('|'), 'true|true', JSON.stringify(after));
    await page.click('#wrapSwitch'); check('  no errors', errs.join('|'), ''); await page.context().close(); }
  // round 7, S7-14: a tapped history line closes its sheet a moment later, but not a sheet opened since
  { const { page, errs } = await H.open({ browser, viewport: { width: 390, height: 844 }, touch: true }); await fresh(page); await press(page, 'AC 5 + 3 =');
    await page.tap('#tapeHandle'); await page.waitForTimeout(300); await page.tap('.tl');
    await page.keyboard.press('Escape'); await page.keyboard.press('?'); await page.waitForTimeout(200);
    const st = await page.evaluate(() => ({ help: document.querySelector('#help').classList.contains('open'), inert: document.querySelector('.page').inert, focus: document.activeElement && document.activeElement.id }));
    check('history line, Escape, ?: Help is still open 200 ms later, the page behind it inert, focus inside', [st.help, st.inert, st.focus].join('|'), 'true|true|helpClose');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    await page.tap('#tapeHandle'); await page.waitForTimeout(300); await page.tap('.tl'); await page.waitForTimeout(400);
    check('  control: a tapped line still closes its sheet', await page.evaluate(() => document.querySelector('#tape').classList.contains('open')), false);
    check('  no errors', errs.join('|'), ''); await page.context().close(); }
  summary(); await browser.close();
})();
