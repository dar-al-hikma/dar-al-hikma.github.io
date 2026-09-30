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
  summary(); await browser.close();
})();
