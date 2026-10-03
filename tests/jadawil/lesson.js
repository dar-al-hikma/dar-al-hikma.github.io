// The lesson's chart (Lesson 5, p. 30: Minneapolis, 20 Jan 1950, 09:55) through the page by real input, as a student
// works it on a phone: the atlas, the suggested offset, the worksheet, the pocket table from the worksheet's own link,
// and back to the worksheet; then the print button and the sheet on Letter and A4. In English, and in German with
// dah.lang preset, whose numbers must be the English ones. After the review's u2-lesson.js.
// Every expected value comes from lesson-values.json (the lesson's rows and its table of houses on p. 34) or from an
// atan2 written in h.js, never from the page. The page's pocket table is computed at the birth's true obliquity
// (row 15); the lesson's printed table is at 23°26′, so the page is held to atan2 at row 15 to 1″ and to the printed
// table to 5″ (MC) and 30″ (ASC).
const H = require('./h'), { open } = require('./ui'); const { check, arcSec, dms, mcDeg, ascDeg, arcDiff, path, fs } = H;
let PDFDocument; try { ({ PDFDocument } = require('pdf-lib')); } catch (e) { console.error('pdf-lib is not available: ' + String(e.message).split('\n')[0]); process.exit(2); }
const L = JSON.parse(fs.readFileSync(path.join(__dirname, 'lesson-values.json'), 'utf8'));
const N = L.native1950, ROW = N.rows, T = L.lessonTable;
const flat = s => String(s).replace(/\s+/g, '').replace(/−/g, '-');
const OE = arcSec(ROW['15']) / 3600, LST = ROW['13'];
const ascPrinted = (col, lat) => T[col ? 'asc1740' : 'asc1736'][T.latitudes.indexOf(lat)];
const mcIn = head => (head.match(/(?<!RA)MC\D*?(\d+°\s*\d+′\s*\d+″)/) || [])[1];
const within = (got, want, tol) => { const d = arcDiff(arcSec(got), Math.round(want)); return Math.abs(d) <= tol ? 'ok' : `${got}: ${d > 0 ? '+' : ''}${d}″ from ${dms(Math.round(want))}`; };

async function walk(browser, base, lang) {
  const { page, W, errs, ctx } = await open(base, { browser, vp: 'p390', lang: lang === 'en' ? null : lang, locale: H.LOCALES[lang] });
  const tag = s => `${lang}: ${s}`, nums = {};
  // 1. the place
  await W.tap('[data-tab="atlas"]'); await W.type('#citySearch', 'Minneapolis');
  // the list answers as it is typed: wait until its first entry is the answer (or 15 s, and the check below fails)
  await page.waitForFunction(() => /^Minneapolis/.test((document.querySelector('#cityResults [data-city]') || {}).textContent?.trim()), null, { timeout: 15000 }).catch(() => {});
  check(tag('the atlas finds Minneapolis, Minnesota, first'), /^Minneapolis(?![a-z]).*Minnesota/.test(await W.text('#cityResults [data-city]')), true, await W.text('#cityResults [data-city]'));
  await W.tap('#cityResults [data-city]'); await W.pause(250);
  const place = { name: await W.text('#atlasPlaceName'), lat: await W.text('#atlasLat'), lon: await W.text('#atlasLon'), corr: await W.text('#atlasCorrection') };
  check(tag('the place chosen'), place.name, 'Minneapolis');
  check(tag('its latitude is the lesson\'s'), flat(place.lat), flat(N.latDMS));
  check(tag('its longitude within 3″ of the lesson\'s (the atlas is GeoNames)'), Math.abs(arcSec(place.lon) - arcSec(N.lonDMS)) <= 3 && /W$/.test(place.lon), true, `${place.lon} against ${N.lonDMS}`);
  check(tag('the longitude correction is row 12'), flat(place.corr), flat(ROW['12']));
  nums.place = [place.lat, place.lon, place.corr];
  // 2. the birth data; the offset arrives as a suggestion once the date and time are in
  await W.tap('#usePlace'); await W.pause(250);
  await W.fill('#birthDate', N.localDate); await W.fill('#birthTime', N.localTime); await W.pause(200);
  const offset = await page.inputValue('#utcOffset');
  check(tag('the UTC offset is suggested as the lesson\'s'), flat(offset), flat(N.utcOffset));
  check(tag('the suggestion is shown, to be checked'), await page.evaluate(() => { const s = document.querySelector('#offsetSuggestion'); return !s.hidden && s.textContent.trim().length > 0; }), true);
  nums.offset = offset;
  await W.tap('#worksheetForm button[type=submit]'); await W.pause(350);
  const ut = await W.text('.ut-badge');
  if (lang === 'en') check(tag('the sheet\'s UT is row 8'), ut, `At Greenwich 20 Jan 1950 · ${ROW['8']} UT`);
  else check(tag('the sheet\'s UT is row 8'), ut.includes(`· ${ROW['8']} UT`), true, ut);
  check(tag('the sheet names its place'), (await W.text('.worksheet-head h3')).includes('Minneapolis'), true);
  nums.ut = ut.match(/\d\d:\d\d:\d\d/)[0];
  // 3. the pocket table from the link in the worksheet's step 2, at the lesson's LST (row 13)
  await W.tap('.text-button[data-goto="houses"]'); await W.pause(250);
  check(tag('the worksheet\'s link opens the pocket table'), await W.view(), 'houses');
  check(tag('the table arrives at the birth\'s latitude'), Math.abs(parseFloat((await page.inputValue('#houseLat')).replace(',', '.')) - N.lat) < 0.005, true, await page.inputValue('#houseLat'));
  await W.type('#houseST', LST); await W.tap('#housesForm button[type=submit]'); await W.pause(350);
  const cols = await page.evaluate(() => [...document.querySelectorAll('.house-column')].map(c => ({ head: c.querySelector('.house-column-header').textContent.replace(/\s+/g, ' ').trim(),
    bracket: [...c.querySelectorAll('tbody tr.bracket')].map(tr => [...tr.children].slice(0, 2).map(td => td.textContent.trim())) })));
  check(tag('two columns, either side of the LST'), cols.length, 2);
  const lats = [ROW['25'], ROW['31']];
  for (const [i, col] of cols.slice(0, 2).entries()) {
    const want = T.columns[i], st = (col.head.match(/\d\d:\d\d:\d\d/) || [])[0], ramc = (col.head.match(/RAMC\s*(\d+°\s*\d+′\s*\d+″)/) || [])[1], mc = mcIn(col.head);
    const which = i ? 'later' : 'earlier';
    check(tag(`the ${which} column's sidereal time is the lesson's ${want.st}`), st, want.st);
    check(tag(`its RAMC is ${want.ramc}°`), ramc, dms(want.ramc * 3600));
    check(tag(`its MC, to atan2 at row 15's obliquity within 1″`), within(mc, mcDeg(want.ramc, OE) * 3600, 1), 'ok');
    check(tag(`its MC, to the lesson's printed ${want.mc} within 5″`), within(mc, arcSec(want.mc), 5), 'ok');
    check(tag(`its bracket is ${lats[0]}° N and ${lats[1]}° N`), JSON.stringify(col.bracket.map(r => r[0])), JSON.stringify(lats.map(l => `${l}° N`)));
    for (const [j, lat] of lats.entries()) {
      const asc = (col.bracket[j] || [])[1];
      check(tag(`${which}, ${lat}° N: the ASC to atan2 within 1″`), within(asc, ascDeg(want.ramc, lat, OE) * 3600, 1), 'ok');
      check(tag(`${which}, ${lat}° N: the ASC to the lesson's printed ${ascPrinted(i, lat)} within 30″`), within(asc, arcSec(ascPrinted(i, lat)), 30), 'ok');
    }
  }
  nums.table = cols.map(c => [c.head.match(/\d\d:\d\d:\d\d|\d+° \d+′ \d+″/g), c.bracket]);
  // 4. back to the worksheet: the rows the pocket table fills
  await W.tap('[data-tab="worksheet"]'); await W.pause(250);
  const rows = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.work-line')].map(l => [l.querySelector('.row-num')?.textContent, { sub: l.querySelector('small')?.textContent || '', value: l.querySelector('.work-value')?.textContent.trim() ?? null }])));
  const col = i => cols[i] || { head: '', bracket: [] }, mcOf = i => mcIn(col(i).head);
  const fills = { 17: [ROW['17'], ROW['17']], 20: [mcOf(1), ROW['20']], 21: [mcOf(0), ROW['21']], 25: [`${ROW['25']}° N`, ROW['25']], 26: [(col(1).bracket[0] || [])[1], ROW['26']], 27: [(col(0).bracket[0] || [])[1], ROW['27']] };
  for (const [r, [fromTable, lesson]] of Object.entries(fills)) {
    const got = rows[r] || {};
    check(tag(`row ${r} is filled from the pocket table at ${LST}`), got.value != null && got.sub.includes(LST), true, JSON.stringify(got));
    check(tag(`row ${r} is the table's value (the lesson prints ${lesson})`), got.value, fromTable);
  }
  nums.rows = Object.keys(fills).map(r => (rows[r] || {}).value);
  // 5. paper: the page's own print button, then the sheet as the browser prints it
  await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  await page.evaluate(() => document.querySelector('#printWorksheet').scrollIntoView({ block: 'center' })); await W.tap('#printWorksheet'); await W.pause(400);
  check(tag('the print button prints, once'), await page.evaluate(() => window.__printed), 1);
  await page.emulateMedia({ media: 'print' });
  for (const [format, w, h] of [['Letter', 612, 792], ['A4', 595.28, 841.89]]) {
    const doc = await PDFDocument.load(await page.pdf({ format, printBackground: true }));
    const sizes = doc.getPages().map(p => p.getSize()), bad = sizes.filter(s => Math.abs(s.width - w) > 1 || Math.abs(s.height - h) > 1);
    check(tag(`the sheet prints on ${format}: pages, every one ${format}`), sizes.length >= 1 && !bad.length, true, `${sizes.length} pages, ${bad.length} of another size`);
  }
  await page.emulateMedia({ media: 'screen' });
  check(tag('no page errors'), errs.join(' | '), '');
  await ctx.close();
  return nums;
}

H.main(async () => {
  const srv = await H.serve(), browser = await H.chromium.launch();
  const en = await walk(browser, srv.base, 'en');
  const de = await walk(browser, srv.base, 'de');
  for (const k of Object.keys(en)) check(`de: the ${k} numbers are the English ones`, JSON.stringify(de[k]), JSON.stringify(en[k]));
  await browser.close(); await srv.close();
});
