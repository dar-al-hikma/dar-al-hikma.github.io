// Sayyid's Orrery: tests for the principles it teaches and the claims it makes, then its walkthrough, every
// language and phone layouts. Expected values come from Lesson 5 (Figures 27 and 28), from real events (published
// ephemerides, UT) and from the geometry itself; none is read from the page.
// Run: NODE_PATH=$(npm root -g) node orrery.test.js [page.html]   (default: the repo's sayyids-orrery/index.html; VERBOSE=1 prints every check)
// Exit status: 0 when every check passed, 1 when any failed or a group threw, 2 when the page or Playwright is missing.
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not available: ' + String(e.message).split('\n')[0]); process.exit(2); }
const PAGE = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'sayyids-orrery', 'index.html'));
if (!fs.existsSync(PAGE)) { console.error('page not found: ' + PAGE); process.exit(2); }
const URL = 'file://' + PAGE;

let pass = 0, fail = 0; const failures = [];
function check(group, name, ok, detail) {
  if (ok) pass++; else { fail++; failures.push(`[${group}] ${name}\n      ${String(detail === undefined ? '' : detail).slice(0, 600)}`); }
  if (process.env.VERBOSE) console.log([ok ? 'ok  ' : 'FAIL', group, name].join('\t'));
}

// ---- expected values ----
const day = s => (Date.parse(s) - Date.UTC(2000, 0, 1, 12)) / 864e5;   // days from J2000.0, the page's own count
// Lesson 5, Figure 27: epicycle, eccentricity, rate (°/day) and 2020 apogee; Figure 28: tropical periods (years; the Moon in days)
const FIG27 = { venus: [.72, .01, .98, 101.0], mars: [.66, .10, .52, 150.5], jupiter: [.19, .04, .08, 190.8], saturn: [.10, .05, .03, 273.2] };
const FIG28 = { saturn: 29.4241465, jupiter: 11.85677613, mars: 1.880869735, moonDays: 27.321582 };
// real events
const MARS_STATIONS = [['2020-09-09', 'R'], ['2020-11-14', 'D'], ['2022-10-30', 'R'], ['2023-01-12', 'D'], ['2024-12-06', 'R'], ['2025-02-24', 'D'], ['2027-01-10', 'R'], ['2027-04-01', 'D']];
const MARS_OPPOSITIONS = [['2020-10-13T23:20Z', 20.5], ['2022-12-08T05:41Z', 76.0], ['2025-01-16T02:38Z', 116.0]];   // Mars opposite the Sun: the Sun's longitude + 180°
const SEASONS_2026 = { spring: 92.74, summer: 93.65, autumn: 89.86, winter: 88.98 };   // equinox to solstice and on, 2026–27; the lesson rounds to 92.8, 93.7, 89.9, 89.0
const GREAT_CONJ = ['2020-12-21T18:20Z', 300.48];   // Jupiter and Saturn, 0° 29′ Aquarius
const LUNATIONS = { newJan: '2024-01-11T11:57Z', fullJan: '2024-01-25T17:54Z', newFeb: '2024-02-09T22:59Z' };
const SYNODIC = 29.530589, TROPICAL_YEAR = 365.24219;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const sdeg = d => ((d % 360) + 540) % 360 - 180;

(async () => {
  const browser = await chromium.launch(); const errs = [], outside = [];
  const open = async (vp, lang) => { const ctx = await browser.newContext({ viewport: vp || { width: 1280, height: 800 } });
    if (lang) await ctx.addInitScript(l => { try { localStorage.setItem('dah.lang', l); } catch (e) {} }, lang);
    const page = await ctx.newPage(); page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('request', r => { const u = r.url(); if (u !== URL && !u.startsWith('data:') && !u.startsWith('blob:')) outside.push(u); });
    await page.goto(URL); await page.waitForFunction(() => typeof WALK !== 'undefined' && document.querySelector('#stepTitle').textContent.trim()); return { ctx, page }; };
  const { ctx, page } = await open();
  const LANGS = await page.$$eval('#langSel option', os => os.map(o => o.value));
  let G;
  const group = async (name, fn) => { G = name; try { await fn(); } catch (e) { check(name, 'group ran to the end', false, e.message); } };

  // ---------- the lesson's parameters ----------
  await group('parameters', async () => {
    const { b, sunRate } = await page.evaluate(() => ({ b: JSON.parse(JSON.stringify(BODIES)), sunRate: SUN.n }));
    for (const [k, [r, e, rate, ap]] of Object.entries(FIG27))
      check(G, `${k}: epicycle ${r}, eccentricity ${e}, ${rate}°/day as the lesson cuts it to two places${k === 'venus' ? ' (her deferent rides the mean Sun)' : ''}, apogee ${ap}° (Figure 27)`, near(b[k].r, r, .005) && near(b[k].e, e, .005) && Math.floor((k === 'venus' ? sunRate : b[k].n) * 100 + 1e-9) / 100 === rate && near(b[k].ap, ap, .05), JSON.stringify(b[k]));
    const per = await page.evaluate(y => ({ saturn: 360 / BODIES.saturn.n / y, jupiter: 360 / BODIES.jupiter.n / y, mars: 360 / BODIES.mars.n / y, moon: 360 / MOON.n }), TROPICAL_YEAR);
    for (const k of ['saturn', 'jupiter', 'mars']) check(G, `${k}'s deferent turns in its tropical period, ${FIG28[k].toFixed(2)} y, within 0.1 y (Figure 28)`, near(per[k], FIG28[k], .1), per[k].toFixed(3));
    check(G, `the Moon returns in the tropical month, ${FIG28.moonDays} d, within a minute (Figure 28)`, near(per.moon, FIG28.moonDays, 1 / 1440), per.moon);
  });

  // ---------- the geometry the page teaches ----------
  await group('geometry', async () => {
    const r = await page.evaluate(() => { const out = { eq: [], radius: [], venus: [], equant: [] }; const ang = (v) => Math.atan2(v[1], v[0]) * 180 / Math.PI;
      for (let t = -3000; t <= 12000; t += 97) {
        for (const k of ['mars', 'jupiter', 'saturn', 'venus']) { const m = planetModel(k, t);
          // the equant: on the apsidal line, twice as far from the earth as the deferent's centre, and K moves evenly as seen from it
          out.equant.push([Math.hypot(...m.E) / Math.hypot(...m.C), m.E[0] * m.C[1] - m.E[1] * m.C[0], ((ang([m.K[0] - m.E[0], m.K[1] - m.E[1]]) - m.mean) % 360 + 540) % 360 - 180, Math.hypot(m.K[0] - m.C[0], m.K[1] - m.C[1])]);
          if (k !== 'venus') out.radius.push(((ang([m.P[0] - m.K[0], m.P[1] - m.K[1]]) - meanSun(t)) % 360 + 540) % 360 - 180);
          else out.venus.push([((m.mean - meanSun(t)) % 360 + 540) % 360 - 180, ((m.lon - meanSun(t)) % 360 + 540) % 360 - 180]); } }
      return out; });
    check(G, 'the equant sits on the apsidal line at twice the eccentricity, and K moves evenly as seen from it, on a deferent of radius 1', r.equant.every(([ratio, cross, dev, rad]) => near(ratio, 2, 1e-9) && near(cross, 0, 1e-12) && near(dev, 0, 1e-6) && near(rad, 1, 1e-9)), JSON.stringify(r.equant.find(([ratio, cross, dev, rad]) => !(near(ratio, 2, 1e-9) && near(dev, 0, 1e-6) && near(rad, 1, 1e-9)))));
    check(G, 'Mars, Jupiter and Saturn: the epicycle radius always points the way of the mean Sun', r.radius.every(d => near(d, 0, 1e-6)), Math.max(...r.radius.map(Math.abs)));
    check(G, 'Venus: K rides with the mean Sun', r.venus.every(([k]) => near(k, 0, 1e-9)), '');
    const el = Math.max(...r.venus.map(([, e]) => Math.abs(e)));
    check(G, `Venus is never seen far from the Sun: greatest elongation 44°–48° (real: about 46°–47°), found ${el.toFixed(1)}°`, el >= 44 && el <= 48, el);
  });

  // ---------- the Sun ----------
  await group('sun', async () => {
    const s = await page.evaluate(([t0]) => { const eq = t => ((sunModel(t).lon - sunModel(t).mean) % 360 + 540) % 360 - 180; let max = 0, zeros = [];
      for (let t = t0; t < t0 + 366; t += 0.25) { max = Math.max(max, Math.abs(eq(t))); if (Math.sign(eq(t)) !== Math.sign(eq(t + 0.25))) zeros.push([t + 0.125, eq(t) > 0 ? 'down' : 'up']); }
      return { max, zeros, seasons: seasonLengths(t0 + 70, 1), flat: seasonLengths(t0 + 70, 0) }; }, [day('2026-01-01T00:00Z')]);
    check(G, `the equation reaches nearly 2° (real: 1.9°); found ${s.max.toFixed(2)}°`, near(s.max, 1.915, .05), s.max);
    const down = s.zeros.find(z => z[1] === 'down'), up = s.zeros.find(z => z[1] === 'up');
    check(G, 'mean and true coincide at the apogee, early July (true falling behind), and at the perigee, early January (true drawing ahead), within 4 days', !!down && !!up && near(down[0], day('2026-07-05T00:00Z'), 4) && near(up[0], day('2026-01-03T12:00Z'), 4), JSON.stringify(s.zeros));
    for (const k of Object.keys(SEASONS_2026)) check(G, `${k} lasts ${SEASONS_2026[k]} days, within 0.1`, near(s.seasons[k], SEASONS_2026[k], .1), s.seasons[k]);
    check(G, 'summer is the longest season and winter the shortest', s.seasons.summer > s.seasons.spring && s.seasons.spring > s.seasons.autumn && s.seasons.autumn > s.seasons.winter, JSON.stringify(s.seasons));
    check(G, 'with the circle concentric the four seasons are equal', Math.max(...Object.values(s.flat)) - Math.min(...Object.values(s.flat)) < .05, JSON.stringify(s.flat));
  });

  // ---------- Mars, Jupiter and Saturn in the real sky ----------
  await group('planets', async () => {
    const st = await page.evaluate(t0 => { const out = []; let t = t0; for (let i = 0; i < 8; i++) { const s = nextStation('mars', t); out.push([s.t, s.retro ? 'R' : 'D']); t = s.t + 2; } return out; }, day('2020-06-01T00:00Z'));
    // the Notes: "Mars turns retrograde within a day of when he really does"; true from 2022 on (1.5 d allows for the real stations' hour); 2020's come about 3 days early
    const off = (from, to, tol) => MARS_STATIONS.map(([d, k], i) => [d, k, st[i]]).filter(([d]) => d >= from && d < to).map(([d, k, got]) => { const diff = got[0] - day(d + 'T12:00Z'); return got[1] !== k || Math.abs(diff) > tol ? `${d} ${k}: model ${got[1]} ${diff.toFixed(1)} d` : ''; }).filter(Boolean);
    let bad = off('2022', '2028', 1.5); check(G, 'Mars stations 2022–2027 come within a day or so of the real ones, retrograde and direct in turn', bad.length === 0, bad.join('; '));
    bad = off('2020', '2021', 3); check(G, 'Mars stations 2020 come within 3 days of the real ones', bad.length === 0, bad.join('; '));
    for (const [d, lon] of MARS_OPPOSITIONS) { const got = await page.evaluate(t => planetModel('mars', t).lon, day(d));
      check(G, `Mars at opposition ${d.slice(0, 10)} within 1° of ${lon}°`, Math.abs(sdeg(got - lon)) <= 1, got.toFixed(2)); }
    const c = await page.evaluate(t => { const tc = nextConjunction(t, false), tm = nextConjunction(t, true); return { tc, lon: planetModel('jupiter', tc).lon, tm }; }, day('2020-01-01T00:00Z'));
    check(G, `the 2020 great conjunction within a week of 21 December and 1° of ${GREAT_CONJ[1]}°`, near(c.tc, day(GREAT_CONJ[0]), 7) && Math.abs(sdeg(c.lon - GREAT_CONJ[1])) <= 1, `${(c.tc - day(GREAT_CONJ[0])).toFixed(1)} d, ${c.lon.toFixed(2)}°`);
    check(G, 'its mean conjunction falls some months before the true one, in September 2020', c.tm >= day('2020-09-01T00:00Z') && c.tm < day('2020-10-01T00:00Z'), new Date(Date.UTC(2000, 0, 1, 12) + c.tm * 864e5).toISOString().slice(0, 10));
  });

  // ---------- the Moon ----------
  await group('moon', async () => {
    const m = await page.evaluate(ts => ts.map(t => { const r = moonModel(t); return { c: r.conjunctional, D: r.D, prevGap: ((r.prevDeg - r.conjDeg) % 360 + 360) % 360, month: r.tNext - r.tConj, trop: r.tTrop - r.tConj, tConj: r.tConj }; }),
      [day('2024-01-15T12:00Z'), day('2024-01-29T12:00Z'), day('2024-02-13T12:00Z')]);
    check(G, 'born four days after the new moon of 11 January 2024: conjunctional', m[0].c === true, JSON.stringify(m[0]));
    check(G, 'born four days after the full moon of 25 January 2024: preventional', m[1].c === false, JSON.stringify(m[1]));
    check(G, 'born four days after the new moon of 9 February 2024: conjunctional', m[2].c === true, JSON.stringify(m[2]));
    check(G, 'the model\'s last meeting before 15 January 2024 is within a day of the real new moon (it counts mean motion)', near(m[0].tConj, day(LUNATIONS.newJan), 1), (m[0].tConj - day(LUNATIONS.newJan)).toFixed(2));
    check(G, `the synodic month is ${SYNODIC} d, the tropical month ${FIG28.moonDays} d`, near(m[0].month, SYNODIC, 1e-4) && near(m[0].trop, FIG28.moonDays, 1e-4), `${m[0].month} / ${m[0].trop}`);
    check(G, 'the prevention falls not 180° but about 194° past the meeting', m.every(x => x.prevGap > 193 && x.prevGap < 196), m.map(x => x.prevGap.toFixed(1)).join(' '));
  });

  // ---------- the royal stars ----------
  await group('stars', async () => {
    const s = await page.evaluate(() => { const f = STARS.find(x => x.n === 'Fomalhaut'); return { f2000: starLon(f, 0), f72: starLon(f, 72 * 365.25) - starLon(f, 0), names: STARS.map(x => x.n) }; });
    check(G, 'the four royal stars are Aldebaran, Regulus, Antares and Fomalhaut', s.names.join() === 'Aldebaran,Regulus,Antares,Fomalhaut', s.names.join());
    check(G, 'Fomalhaut stood at about 3° 52′ Pisces in 2000', near(s.f2000, 333.87, .1), s.f2000);
    check(G, 'the stars move on about 1° in 72 years', near(s.f72, 1, .02), s.f72);
  });

  // ---------- the walkthrough ----------
  await group('walkthrough', async () => {
    const n = await page.evaluate(() => WALK.length); const titles = [];
    for (let i = 0; i < n; i++) { if (i) await page.click('#nextBtn'); titles.push(await page.$eval('#stepTitle', e => e.textContent.trim())); }
    check(G, `Next goes through all ${n} steps, each with a title`, titles.length === n && titles.every(Boolean) && new Set(titles).size === n, titles.join(' | '));
    check(G, 'Next is disabled on the last step', await page.$eval('#nextBtn', b => b.disabled), '');
    await page.click('#prevBtn'); check(G, 'Back returns to the step before', (await page.$eval('#stepTitle', e => e.textContent.trim())) === titles[n - 2], '');
    const go = async i => { await page.click(`#pips button:nth-child(${i + 1})`); await page.waitForTimeout(60); };
    const plate = () => page.$eval('#plate', e => e.innerText.replace(/\s+/g, ' '));
    const pause = async () => page.evaluate(() => { if (typeof setPlay === 'function') setPlay(false); });
    // press a step's action and wait for the plate to redraw, not a fixed time; pause first, so that a playing
    // step's own frames cannot pass for the redraw (every action pauses anyway)
    const act = async k => { await pause(); const before = await plate(); await page.click(`#stepActions [data-action="${k}"]`);
      await page.waitForFunction(b => document.querySelector('#plate').innerText.replace(/\s+/g, ' ') !== b, before, { timeout: 3000 }).catch(() => {}); };
    // Start over puts the step back
    await go(3); await pause(); await page.fill('#dateIn', '1999-01-01'); await page.dispatchEvent('#dateIn', 'change');
    const back = await page.evaluate(() => { document.getElementById('againBtn').click(); return fmtDate(state.t); });   // read at once: the step plays on
    check(G, 'Start over restores the step\'s date', back === '2026-05-01', back);
    // the seasons
    await go(4); await act('seasons'); await page.waitForFunction(() => document.querySelector('#plate').textContent.includes(L().plate.seasonsT), null, { timeout: 3000 }).catch(() => {});
    const ds = ((await plate()).match(/\d+[.,]\d(?!\d)/g) || []).map(x => +x.replace(',', '.'));
    check(G, `Measure the seasons: the plate gives ${Object.values(SEASONS_2026).join(', ')} days, each within 0.15`, ds.length >= 4 && Object.values(SEASONS_2026).every((v, i) => near(ds[i], v, .15)), ds.join(' '));
    // the eccentric step slides 0 → 100% over 1.6 s; a step left for mid-slide keeps its own value
    await go(2); await page.waitForTimeout(300); await go(1); await page.waitForTimeout(2000);
    const ecc = await page.evaluate(() => state.escale);
    check(G, 'Leaving the eccentric step mid-slide: the concentric step stays at 0%', ecc === 0, String(ecc));
    // stations: the plate's daily motion reads zero, retrograde and direct in turn
    await go(7); const kinds = [];
    for (let k = 0; k < 2; k++) { await act('station');
      const v = (await plate()).match(/[+−-]\d+[.,]\d{3}°/); const r = await page.evaluate(() => { const o = { equant: state.layers.equant, epicycle: state.layers.epicycle }; return [dLon(state.planet, state.t - 3, o), dLon(state.planet, state.t + 3, o)]; });
      kinds.push(r[0] > 0 && r[1] < 0 ? 'R' : r[0] < 0 && r[1] > 0 ? 'D' : '?');
      check(G, `Jump to the next station (${k + 1}): the plate's daily motion reads ±0.000°`, !!v && Math.abs(parseFloat(v[0].replace('−', '-').replace(',', '.'))) < .0005, v && v[0]); }
    check(G, 'the two stations are retrograde, then direct', kinds.join('') === 'RD', kinds.join(''));
    // conjunctions: the separations the plate gives
    await go(10);
    await act('meanconj'); let sep = ((await plate()).match(/\d+[.,]\d{2}°/g) || []).map(x => +x.replace(',', '.').replace('°', ''));
    check(G, 'Next mean conjunction: mean separation 0.00°, the true planets still apart', sep.length >= 2 && sep[1] === 0 && sep[0] > 1, sep.join(' / '));
    await act('trueconj'); sep = ((await plate()).match(/\d+[.,]\d{2}°/g) || []).map(x => +x.replace(',', '.').replace('°', ''));
    check(G, 'Next true conjunction: true separation 0.00°', sep.length >= 2 && sep[0] === 0, sep.join(' / '));
    // the Moon: a typed birth date gives the verdict
    await go(13); await pause();
    for (const [d, want, other] of [['2024-01-15', 'conjunctional', 'preventional'], ['2024-01-29', 'preventional', 'conjunctional']]) {
      await page.fill('#dateIn', d); await page.dispatchEvent('#dateIn', 'change'); await page.waitForTimeout(100);
      const [txt, word, not] = await page.evaluate(([w, o]) => [document.querySelector('#plate').textContent, L().plate[w], L().plate[o]], [want, other]);
      check(G, `a birth date of ${d}: ${want}`, txt.includes(word) && !txt.includes(not), txt.replace(/\s+/g, ' ').slice(0, 160)); }
    await page.click('#stepActions [data-action="today"]'); await page.waitForTimeout(60);
    check(G, 'Set the date to today', (await page.$eval('#dateIn', e => e.value)) === new Date().toISOString().slice(0, 10), await page.$eval('#dateIn', e => e.value));
  });

  // ---------- every language ----------
  await group('languages', async () => {
    // the tables as written: the page fills what a language leaves out from English as it loads, so read them from a copy without that line
    const FILL = "for (const l in I18N) if (l !== 'en') merge(I18N[l], I18N.en);", html = fs.readFileSync(PAGE, 'utf8');
    check(G, 'the page\'s fill-from-English line is where the suite expects it (if not, update FILL here)', html.includes(FILL), '');
    const rc = await browser.newContext(), rp = await rc.newPage(); await rp.setContent(html.replace(FILL, ''), { waitUntil: 'load' });
    const t = await rp.evaluate(langs => { const out = {};
      const walk = (o, pre) => Array.isArray(o) ? o.flatMap((v, i) => walk(v, `${pre}[${i}]`)) : o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => walk(v, pre ? pre + '.' + k : k)) : [[pre, typeof o, o]];
      const en = walk(I18N.en, ''), enKeys = new Set(en.map(e => e[0])), enVal = new Map(en.map(e => [e[0], e[2]]));
      for (const l of langs) { if (!I18N[l]) { out[l] = { table: false }; continue; } const m = new Map(walk(I18N[l], '').map(([k, ty, v]) => [k, [ty, v]]));
        out[l] = { table: true, tag: LANG_TAGS[l] || '', missing: en.filter(([k]) => !m.has(k)).map(e => e[0]), kind: en.filter(([k, ty]) => m.has(k) && m.get(k)[0] !== ty).map(e => e[0]),
          empty: [...m].filter(([k, [ty, v]]) => ty === 'string' && !v.trim() && !(enVal.has(k) && !String(enVal.get(k)).trim())).map(e => e[0]),   // empty where the English is not
          unknown: [...m.keys()].filter(k => !enKeys.has(k)) }; }
      return out; }, LANGS); await rc.close();
    for (const l of LANGS) { const x = t[l];
      check(G, `${l}: a language table and a language tag`, x.table && !!x.tag, JSON.stringify({ table: x.table, tag: x.tag }));
      if (!x.table) continue;
      check(G, `${l}: every English string has a translation`, x.missing.length === 0, x.missing.join(', '));
      check(G, `${l}: each entry the same kind as the English one (text or function)`, x.kind.length === 0, x.kind.join(', '));
      check(G, `${l}: no empty strings`, x.empty.length === 0, x.empty.join(', '));
      check(G, `${l}: no entries the English table lacks (a misspelt key?)`, x.unknown.length === 0, x.unknown.join(', ')); }
    for (const l of LANGS) {
      const bad = await page.evaluate(l => { applyLang(l); const hits = new Set(); const scan = () => {
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => /SCRIPT|STYLE/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
        while (w.nextNode()) { const s = w.currentNode.nodeValue; if (/\bundefined\b|\bNaN\b|\[object |=>|function\s*\(/.test(s)) hits.add(s.trim().slice(0, 50)); }
        document.querySelectorAll('[aria-label],[title]').forEach(e => ['aria-label', 'title'].forEach(a => { const v = e.getAttribute(a); if (v && /\bundefined\b|\bNaN\b/.test(v)) hits.add(a + ': ' + v.slice(0, 50)); })); };
        for (let i = 0; i < WALK.length; i++) { showWalk(i); scan(); }
        for (const tab of ['tabLayers', 'tabNotes']) { selectTab(tab); scan(); } selectTab('tabWalk'); showWalk(0);
        return { hits: [...hits], tag: document.documentElement.lang, title: document.title }; }, l);
      check(G, `${l}: every step, the Layers and the Notes show no "undefined", "NaN" or code`, bad.hits.length === 0, bad.hits.join(' | '));
      check(G, `${l}: the page's language tag and title are set`, !!bad.tag && bad.tag !== 'undefined' && !!bad.title && bad.title !== 'undefined', `${bad.tag} ${bad.title}`); }
    await page.evaluate(() => applyLang('en'));
  });

  // ---------- phone and desktop layouts ----------
  await group('layout', async () => {
    for (const [w, h] of [[320, 568], [390, 844], [1280, 800]]) { const bad = [];
      for (const l of LANGS) { const { ctx: c, page: p } = await open({ width: w, height: h }, l);
        const b = await p.evaluate(() => { const out = []; const hidden = e => { const cs = getComputedStyle(e); return cs.clip !== 'auto' || cs.clipPath !== 'none' || e.getBoundingClientRect().width <= 1; };
          for (let i = 0; i < WALK.length; i++) { showWalk(i);
            const de = document.documentElement; if (de.scrollWidth > innerWidth + 1) out.push(`step ${i + 1}: page ${de.scrollWidth - innerWidth}px too wide`);
            document.querySelectorAll('#stepTitle, #stepBody p, #stepTry, #plate, #plate *, #stepActions button, .btn, [role=tab], select').forEach(e => { if (!e.offsetParent || hidden(e)) return;
              if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== 'visible') out.push(`step ${i + 1}: ${e.id || e.className || e.tagName} clipped ("${e.textContent.trim().slice(0, 24)}")`);
              const r = e.getBoundingClientRect(); if (r.right > innerWidth + 1 || r.left < -1) out.push(`step ${i + 1}: ${e.id || e.className || e.tagName} off the side`); }); }
          return [...new Set(out)]; });
        b.forEach(x => bad.push(`${l} ${x}`)); await c.close(); }
      check(G, `${w}×${h}: every step in ${LANGS.length} languages stays on the page, nothing clipped`, bad.length === 0, bad.slice(0, 8).join('; ') + (bad.length > 8 ? ` … ${bad.length}` : '')); }
  });

  check('page', 'no requests beyond the page itself', outside.length === 0, [...new Set(outside)].slice(0, 5).join(', '));
  check('page', 'no page or console errors', errs.length === 0, [...new Set(errs)].slice(0, 5).join(' | '));
  await ctx.close(); await browser.close();
  console.log(`${pass} passed, ${fail} failed`); failures.forEach(f => console.log('  ✗ ' + f));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('The suite could not finish:', e); process.exit(2); });
