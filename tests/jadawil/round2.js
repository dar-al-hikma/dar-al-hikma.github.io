// What the round-2 survey found a student would meet (the development repo's jadawil-round2/ and the fixes-3 record), walked
// again by real input on a phone: the UTC offset before standard time (J2-1, decision 2 as option C), the same place
// chosen twice (J2-3), a refused pocket table (J2-4), and a kept pocket table after a reload (J2-8, J2-9).
// Expected values come from the tz database's published offsets, the lesson (lesson-values.json), the place's own
// longitude as the page prints it (divided by 15, as the lesson's row 12 is) and an atan2 written in h.js, never from the
// page's own answer.
const H = require('./h'), { open } = require('./ui'); const { check, arcSec, dms, ascDeg, arcDiff, path, fs } = H;
const L = JSON.parse(fs.readFileSync(path.join(__dirname, 'lesson-values.json'), 'utf8')), N = L.native1950, ROW = N.rows;
const flat = s => String(s).replace(/\s+/g, '').replace(/−/g, '-');
// seconds of time as the offset field writes them: +01:07:43
const hms = (s, signed = true) => { const a = Math.abs(Math.round(s)); return (signed ? (s < 0 ? '-' : '+') : '') + [a / 3600, a % 3600 / 60, a % 60].map(x => String(Math.floor(x)).padStart(2, '0')).join(':'); };
// a place's own longitude in time, from the longitude the atlas panel prints in English (93° 15′ 48″ W)
const ownTime = lonText => (/E$/.test(lonText.trim()) ? 1 : -1) * arcSec(lonText) / 15;
const clock = t => { const [h, m, s = 0] = t.split(':').map(Number); return h * 3600 + m * 60 + s; };
const valueOf = (rows, n) => (rows[String(n)] || {}).value || '';

async function place(W, page, name) {
  await W.tap('[data-tab="atlas"]'); await W.type('#citySearch', name);
  await page.waitForFunction(n => ((document.querySelector('#cityResults [data-city]') || {}).textContent || '').trim().startsWith(n), name, { timeout: 15000 }).catch(() => {});
  await W.tap('#cityResults [data-city]'); await W.pause(250);
  return { name: await W.text('#atlasPlaceName'), lon: await W.text('#atlasLon') };
}
const sheetRows = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.work-line')].map(l => [l.querySelector('.row-num')?.textContent, { value: l.querySelector('.work-value')?.textContent?.trim() || '' }])));
const directAsc = page => page.evaluate(() => (/ASC.*?[NS]:\s*(\d+°\s*\d+′\s*\d+″)/.exec(document.querySelector('#housesContent .direct-check')?.textContent || '') || [])[1] || '');

H.main(async () => {
  const srv = await H.serve(), browser = await H.chromium.launch();
  try {
    // J2-1. Monrovia kept Monrovia Mean Time, −00:44:30, until 1972: in 1971 the zone's offset, seconds and all.
    {
      const { page, W, errs, ctx } = await open(srv.base, { browser });
      await place(W, page, 'Monrovia'); await W.tap('#usePlace'); await W.pause(250);
      await W.fill('#birthDate', '1971-01-01'); await W.fill('#birthTime', '12:00'); await W.pause(200);
      check('J2-1 Monrovia 1971: the zone\'s −00:44:30 is suggested', flat(await page.inputValue('#utcOffset')), '-00:44:30');
      await W.tap('#worksheetForm button[type=submit]'); await W.pause(350);
      check('J2-1 Monrovia 1971: the sheet at 12:44:30 UT', (await W.text('.ut-badge')).includes('12:44:30 UT'), true, await W.text('.ut-badge'));
      // Poznań kept its own local mean time before Warsaw's first rule (1880): its longitude in time, to the second.
      await W.tap('#clearChart'); await W.pause(200);
      const poz = await place(W, page, 'Poznań'); await W.tap('#usePlace'); await W.pause(250);
      await W.fill('#birthDate', '1800-01-01'); await W.fill('#birthTime', '12:00'); await W.pause(200);
      const own = ownTime(poz.lon);
      check(`J2-1 Poznań 1800: its own longitude in time (${poz.lon} ÷ 15)`, flat(await page.inputValue('#utcOffset')), hms(own));
      await W.tap('#worksheetForm button[type=submit]'); await W.pause(350);
      check('J2-1 Poznań 1800: the sheet at noon less that offset', (await W.text('.ut-badge')).includes(hms(clock('12:00:00') - Math.round(own), false) + ' UT'), true, await W.text('.ut-badge'));
      // Lyon in 1900 kept Paris Mean Time (+00:09:21) by law, 10 minutes from its own: the page declines and names both.
      await W.tap('#clearChart'); await W.pause(200);
      const lyon = await place(W, page, 'Lyon'); await W.tap('#usePlace'); await W.pause(250);
      await W.fill('#birthDate', '1900-06-01'); await W.fill('#birthTime', '12:00'); await W.pause(200);
      const line = await W.text('#offsetSuggestion');
      check('J2-1 Lyon 1900: nothing is filled in', await page.inputValue('#utcOffset'), '');
      check(`J2-1 Lyon 1900: the line names Lyon's own ${hms(ownTime(lyon.lon))} and Paris Mean Time +00:09:21`, line.includes(hms(ownTime(lyon.lon))) && line.includes('+00:09:21'), true, line);
      await W.tap('#worksheetForm button[type=submit]'); await W.pause(250);
      check('J2-1 Lyon 1900: Gather asks for the offset', await W.text('#worksheetError'), 'Enter the UTC offset.');
      check('J2-1: no page error', errs.join(' | '), '');
      await ctx.close();
    }
    // J2-3. The lesson's chart with its own local mean time typed (row 12), then the same place chosen again: the typed
    // offset and the sheet stand.
    {
      const { page, W, errs, ctx } = await open(srv.base, { browser });
      await place(W, page, 'Minneapolis'); await W.tap('#usePlace'); await W.pause(250);
      await W.fill('#birthDate', N.localDate); await W.fill('#birthTime', N.localTime);
      await W.type('#utcOffset', ROW['12']); await W.tap('#worksheetForm button[type=submit]'); await W.pause(350);
      const ut = hms(clock(N.localTime) - clock(ROW['12'].replace(/^[-−]/, '')) * (ROW['12'].startsWith('-') ? -1 : 1), false);
      check(`J2-3: the sheet at ${ut} UT (row 12 typed)`, (await W.text('.ut-badge')).includes(ut + ' UT'), true, await W.text('.ut-badge'));
      await place(W, page, 'Minneapolis'); await W.tap('#usePlace'); await W.pause(250);
      check('J2-3: the same place again leaves the typed offset', flat(await page.inputValue('#utcOffset')), flat(ROW['12']));
      check('J2-3: and the sheet', (await W.text('.ut-badge')).includes(ut + ' UT'), true, await W.text('.ut-badge'));
      check('J2-3: no page error', errs.join(' | '), '');
      await ctx.close();
    }
    // J2-4. The lesson's pocket table fills rows 17–33 for its own chart; the next day's sheet leaves them blank, and a
    // refused table (61°) must not give them back, in another language either.
    {
      const { page, W, errs, ctx } = await open(srv.base, { browser });
      await place(W, page, 'Minneapolis'); await W.tap('#usePlace'); await W.pause(250);
      await W.fill('#birthDate', N.localDate); await W.fill('#birthTime', N.localTime); await W.pause(200);
      await W.tap('#worksheetForm button[type=submit]'); await W.pause(350);
      await W.tap('.text-button[data-goto="houses"]'); await W.pause(250); await W.type('#houseST', ROW['13']); await W.tap('#housesForm button[type=submit]'); await W.pause(350);
      await W.tap('[data-tab="worksheet"]'); await W.pause(250);
      check('J2-4: the lesson\'s table fills row 17', valueOf(await sheetRows(page), 17), ROW['17']);
      await W.fill('#birthDate', '1950-01-21'); await W.tap('#worksheetForm button[type=submit]'); await W.pause(350);
      check('J2-4: the next day\'s sheet leaves row 17 blank', valueOf(await sheetRows(page), 17), '');
      await W.tap('[data-tab="houses"]'); await W.pause(200); await W.type('#houseLat', '61'); await W.tap('#housesForm button[type=submit]'); await W.pause(300);
      check('J2-4: 61° is refused', (await W.text('#housesError')).length > 0, true);
      await page.selectOption('#langTop', 'de'); await W.pause(300); await W.tap('[data-tab="worksheet"]'); await W.pause(250);
      check('J2-4: after the refusal and a change to German, row 17 is still blank', valueOf(await sheetRows(page), 17), '');
      check('J2-4: no page error', errs.join(' | '), '');
      await ctx.close();
    }
    // J2-8, J2-9. A pocket table opened at its own LST, latitude and obliquity comes back after a reload with all three
    // (decision 24), the ASC at atan2's, and its rows blank for a chart at another place.
    {
      const { page, W, errs, ctx } = await open(srv.base, { browser });
      await W.tap('[data-tab="worksheet"]'); await W.fill('#birthDate', N.localDate); await W.fill('#birthTime', N.localTime);
      await W.type('#utcOffset', '+03:00'); await W.tap('#worksheetForm button[type=submit]'); await W.pause(350);
      await W.tap('[data-tab="houses"]'); await W.pause(200);
      await W.type('#houseST', ROW['13']); await W.type('#houseLat', '44.98'); await W.type('#houseOE', '24'); await W.tap('#housesForm button[type=submit]'); await W.pause(350);
      const ramc = clock(ROW['13']) / 240, want = Math.round(ascDeg(ramc, 44.98, 24) * 3600);
      const before = await directAsc(page);
      check('J2-8, J2-9: the direct ASC at 44.98° and 24° is atan2\'s', Math.abs(arcDiff(arcSec(before), want)) <= 1, true, `${before} against ${dms(want)}`);
      await page.reload(); await H.ready(page); await W.pause(300);
      check('J2-9: after a reload the latitude is the table\'s', flat(await page.inputValue('#houseLat')), '44.98');
      check('J2-8: and the obliquity', flat(await page.inputValue('#houseOE')), '24');
      check('J2-8, J2-9: and the direct ASC', before && await directAsc(page), before || 'a direct ASC');
      await W.tap('[data-tab="worksheet"]'); await W.pause(250);
      check('J2-8, J2-9: the Baghdad sheet\'s row 17 is blank', valueOf(await sheetRows(page), 17), '');
      check('J2-8, J2-9: no page error', errs.join(' | '), '');
      await ctx.close();
    }
  } finally { await browser.close(); await srv.close(); }
});
