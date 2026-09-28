// Sayyid's Sphere: tests for the round-1 fixes (brief items 1–17) and guards for what must not break.
//   NODE_PATH=$(npm root -g) node sphere.test.js   (SPHERE=<page> to test another copy; TAG=<name> names its output folder)
// Exit status: 0 only when every check passed; 1 when any failed or a group threw; 2 when ONLY names a group
// that did not run; 2 also when the page is not found. It reads only harness.js, expect.py, ref.py and cuspstates.json
// beside it, and the page SPHERE names; it needs Python 3 with mpmath.
// Expected values come from Lessons 4 and 5, from an independent J2000 catalogue written out below,
// from an independent mpmath model (ref.py beside this file, through expect.py), or from
// arithmetic done here. None is read from the page.
const H = require('./harness');
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { chromium } = require('playwright');
const TAG = process.env.TAG || 'build';
const OUT = process.env.OUT || path.join(__dirname, 'out-' + TAG);
fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
let LANGS = ['en','nb','es','fr','de','zh','ja'];   // replaced at start by the page's own language menu
const OBL = 23.4392911;                       // J2000 mean obliquity, 23° 26′ 21.4″
const D = Math.PI/180;
const GL = H.GL;

// ---------------------------------------------------------------------------------------------
const results = [];
function check(group, kind, name, ok, detail) {
  results.push({ group, kind, name, ok: !!ok, detail: ok ? '' : String(detail === undefined ? '' : detail).slice(0, 500) });
}
const ran = new Set();
async function group(id, kind, title, fn) {
  if (ONLY && !ONLY.includes(id)) return;
  ran.add(id);
  const t0 = Date.now();
  try { await fn(); }
  catch (e) { check(id, kind, `${title}: group ran to the end`, false, e.stack || e.message); }
  process.stderr.write(`[${TAG}] ${id} ${title} ${((Date.now()-t0)/1000).toFixed(0)}s\n`);
}
function expect(states) {
  return JSON.parse(cp.execFileSync('python3', [path.join(__dirname, 'expect.py')], { input: JSON.stringify(states), maxBuffer: 64 << 20 }).toString());
}
const n360 = x => ((x % 360) + 360) % 360;
const dd = (a, b) => ((a - b + 540) % 360 + 360) % 360 - 180;          // signed difference of two angles
const pad2 = n => String(n).padStart(2, '0');
const strip = s => String(s == null ? '' : s).replace(/︎/g, '');
// the display a correct formatter gives: round to the minute first, then take sign and degree
function zodStr(lon) { const m = Math.round(n360(lon) * 60) % 21600; return `${pad2(Math.floor((m % 1800) / 60))}° ${GL[Math.floor(m / 1800)]} ${pad2(m % 60)}′`; }
function dmStr(x) { const m = Math.round(n360(x) * 60) % 21600; return `${Math.floor(m / 60)}° ${pad2(m % 60)}′`; }
function dmsStr(x) { const s = Math.round(x * 3600); return `${Math.floor(s / 3600)}° ${pad2(Math.floor((s % 3600) / 60))}′ ${pad2(s % 60)}″`; }
function hmStr(deg) { const m = Math.round(n360(deg) / 15 * 60) % 1440; return `${pad2(Math.floor(m / 60))}h ${pad2(m % 60)}m`; }
function num(s) { return parseFloat(String(s).replace('−', '-').replace(',', '.').trim()); }

// Independent J2000 positions (SIMBAD), sexagesimal as published.
const CAT_HMS = {
  Sirius: ['06 45 08.9', '-16 42 58'], Canopus: ['06 23 57.1', '-52 41 44'], Arcturus: ['14 15 39.7', '+19 10 57'],
  Vega: ['18 36 56.3', '+38 47 01'], Capella: ['05 16 41.4', '+45 59 53'], Rigel: ['05 14 32.3', '-08 12 06'],
  Procyon: ['07 39 18.1', '+05 13 30'], Achernar: ['01 37 42.8', '-57 14 12'], Betelgeuse: ['05 55 10.3', '+07 24 25'],
  Altair: ['19 50 47.0', '+08 52 06'], Aldebaran: ['04 35 55.2', '+16 30 33'], Antares: ['16 29 24.5', '-26 25 55'],
  Spica: ['13 25 11.6', '-11 09 41'], Pollux: ['07 45 18.9', '+28 01 34'], Fomalhaut: ['22 57 39.0', '-29 37 20'],
  Deneb: ['20 41 25.9', '+45 16 49'], Regulus: ['10 08 22.3', '+11 58 02'], Polaris: ['02 31 49.1', '+89 15 51'],
  Bellatrix: ['05 25 07.9', '+06 20 59'], Alphard: ['09 27 35.2', '-08 39 31'], Castor: ['07 34 36.0', '+31 53 18'],
  Denebola: ['11 49 03.6', '+14 34 19'], Alpheratz: ['00 08 23.3', '+29 05 26'], Algol: ['03 08 10.1', '+40 57 20'],
};
const CAT = {};
for (const [k, [ra, de]] of Object.entries(CAT_HMS)) {
  const [h, m, s] = ra.split(' ').map(Number); const sg = de[0] === '-' ? -1 : 1; const [dg, dm, ds] = de.slice(1).split(' ').map(Number);
  CAT[k] = { ra: (h + m / 60 + s / 3600) * 15, dec: sg * (dg + dm / 60 + ds / 3600) };
}
const STARNAMES = Object.keys(CAT);

// ---------------------------------------------------------------------------------------------
async function evalClick(page, sel) { await page.evaluate(s => document.querySelector(s).click(), sel); }
async function pip(page, i) { await page.evaluate(i => document.querySelectorAll('#pips button')[i - 1].click(), i); await H.frames(page, 2); }
async function tab(page, t) { await evalClick(page, '#tab' + t); await H.frames(page, 2); }
async function lang(page, l) { await page.selectOption('#langSel', l); await H.frames(page, 2); }
async function probe(page, name) { await H.setState(page, { probe: name }); }
async function camPos(page) { return page.evaluate(() => { const c = window.__camera; return c ? [c.position.x, c.position.y, c.position.z] : null; }); }
async function settle(page, ms = 12000) {          // wait until the camera stops easing (still for three polls running)
  const t0 = Date.now(); let prev = await camPos(page), still = 0;
  while (Date.now() - t0 < ms) {
    await page.waitForTimeout(200); const p = await camPos(page);
    if (p && prev && Math.hypot(p[0]-prev[0], p[1]-prev[1], p[2]-prev[2]) < 1e-5) { if (++still >= 3) return; } else still = 0;
    prev = p;
  }
}
const camDist = p => Math.hypot(p[0], p[1], p[2]);
function overlap(a, b, m = 0) { return Math.min(a.right, b.right) - Math.max(a.left, b.left) + m > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) + m > 0; }
function inter(a, b) { if (!a || !b) return 0; const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return w > 0 && h > 0 ? w * h : 0; }
async function rect(page, sel) { return page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; }, sel); }
async function inkOf(page, sel) {
  return page.evaluate(s => { const c = document.querySelector(s); if (!c || !c.getContext) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; }, sel);
}
async function stepTexts(page, i) {
  await pip(page, i);
  return page.evaluate(() => ({ title: document.getElementById('stepTitle').textContent, body: document.getElementById('stepBody').textContent, tryit: document.getElementById('stepTry').textContent }));
}
async function chartTexts(page) {
  return page.evaluate(() => ({ measure: document.getElementById('measureP').textContent, foot: document.getElementById('chartFoot').textContent }));
}

// =============================================================================================
(async () => {
  const b = await H.launch();
  const T0 = Date.now();
  { const c = await b.newContext(); const q = await c.newPage(); await q.goto('file://' + path.resolve(process.env.SPHERE));
    await q.waitForFunction(() => document.querySelectorAll('#langSel option').length > 0);
    LANGS = await q.$$eval('#langSel option', os => os.map(o => o.value)); await c.close(); }

  // ---------------------------------------------------------------- 1. cusp formatting
  await group('F1', 'finding', 'Cusp formatting (Astra P1; internal P3-14)', async () => {
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    await tab(page, 'Layers'); await probe(page, 'Sun');
    const bad = [], badOut = [];
    for (let k = 0; k < 12; k++) {
      await H.setState(page, { sun: 30 * k });
      const r = await H.read(page); const want = zodStr(30 * k);
      if (!strip(r.ecl).startsWith(want)) bad.push(`${30*k}°: plate "${strip(r.ecl)}"`);
      if (strip(r.sunOut) !== want) badOut.push(`${30*k}°: slider "${strip(r.sunOut)}"`);
    }
    check('F1', 'finding', 'plate, Sun probe at each of the 12 cusps reads 00° of the new sign', bad.length === 0, bad.join(' | '));
    check('F1', 'guard', "Sun's longitude slider output at each of the 12 cusps reads 00° of the new sign (its whole-degree values never hit the bug)", badOut.length === 0, badOut.join(' | '));
    // negative zero: the Sun's latitude (and declination) at every whole degree of longitude
    const neg = [];
    for (let L = 0; L < 360; L++) { await H.setRange(page, 'sunRange', L); await H.frames(page, 1); const r = await H.read(page); if (/−0[.,]0°/.test(r.ecl + r.equ)) neg.push(`${L}°: ${strip(r.ecl)} | ${r.equ}`); }
    check('F1', 'finding', 'no readout of the Sun at any whole degree of longitude shows "−0.0°"', neg.length === 0, `${neg.length} longitudes, e.g. ${neg.slice(0, 3).join(' ; ')}`);
    // chart: ASC just below each cusp (states found by cuspstates.py from ref.py), and the cardinal cusps
    await tab(page, 'Chart');
    const cs = JSON.parse(fs.readFileSync(path.join(__dirname, 'cuspstates.json')));
    const badA = [];
    for (const [c, st] of Object.entries(cs.asc)) {
      await H.setState(page, { lat: st.lat, lst: st.lst }); const r = await H.read(page);
      const wa = zodStr(+c), wd = zodStr(+c + 180);
      if (strip(r.asc) !== wa || strip(r.desc) !== wd) badA.push(`${st.lat}°/${st.lst}° (ref ASC ${st.val.toFixed(5)}): ASC "${strip(r.asc)}" DSC "${strip(r.desc)}", want ${wa} / ${wd}`);
    }
    const badC = [];
    for (const lat of [0, 40, 51.5, 64, -40, -64]) for (const lst of [0, 90, 180, 270]) {
      await H.setState(page, { lat, lst }); const r = await H.read(page);
      const w = { mc: zodStr(lst), ic: zodStr(lst + 180) };
      if (lst === 90) { w.asc = zodStr(180); w.desc = zodStr(0); }
      if (lst === 270) { w.asc = zodStr(0); w.desc = zodStr(180); }
      for (const k of Object.keys(w)) if (strip(r[k]) !== w[k]) badC.push(`${lat}°/${lst}° ${k.toUpperCase()} "${strip(r[k])}" want ${w[k]}`);
    }
    check('F1', 'finding', `chart ASC and DSC half a minute below ${Object.keys(cs.asc).length} different cusps read 00° of the next sign`, badA.length === 0, badA.slice(0, 4).join(' | '));
    check('F1', 'finding', 'chart at the cardinal cusps (MC, IC, ASC, DSC at 0°/90°/180°/270°, six latitudes) reads 00°, never 30° of the sign before', badC.length === 0, badC.slice(0, 5).join(' | '));
    // 360° wraps: azimuth and OA/OD
    await tab(page, 'Layers'); await probe(page, 'Polaris');
    await H.setState(page, { lat: 40, lst: 54 });
    const [ea] = expect([{ lat: 40, lst: 54, obl: OBL, ra: CAT.Polaris.ra, dec: CAT.Polaris.dec }]);
    let r = await H.read(page);
    const wantAz = String(Math.round(ea.az) % 360).padStart(3, '0') + '°';
    check('F1', 'finding', `Polaris at 40° N, sidereal time 03h 36m (ref az ${ea.az.toFixed(2)}°): azimuth reads ${wantAz}, not 360°`, r.hor.startsWith(wantAz) && !/^360/.test(r.hor), r.hor);
    const oa = [];
    for (const lst of [269.75, 90.25, 270, 90]) { await H.setState(page, { lst }); r = await H.read(page); if (/(^|\D)360°/.test(r.oaod)) oa.push(`${lst}: ${r.oaod}`); }
    check('F1', 'finding', 'OA · OD never reads 360° (sidereal time 17h 59m, 06h 01m, 18h, 06h)', oa.length === 0, oa.join(' | '));
    await page.context().close();
  });

  // ---------------------------------------------------------------- 2. obliquity between steps
  await group('F2', 'finding', 'Obliquity carried between steps (Astra P1; internal P2-6)', async () => {
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    const trueStr = dmsStr(OBL);
    let r = await H.read(page);
    check('F2', 'finding', `on load the obliquity readout shows the value in force to the second (${trueStr})`, String(r.oblOut).startsWith(trueStr), r.oblOut);
    const [e40] = expect([{ lat: 40, lst: 0, obl: OBL }]);
    async function ascOk(page) { await tab(page, 'Chart'); await H.setState(page, { lat: 40, lst: 0 }); const q = await H.read(page); await tab(page, 'Lesson'); return { ok: Math.abs(dd(H.parseZod(q.asc), e40.asc)) * 60 < 0.55, q }; }
    // step 9's experiment, then Next
    await pip(page, 9); await tab(page, 'Layers'); await H.setRange(page, 'oblRange', 45); await H.setRange(page, 'oblRange', 0); await H.frames(page, 2); await tab(page, 'Lesson');
    await evalClick(page, '#nextBtn'); await H.frames(page, 2);
    r = await H.read(page); let a = await ascOk(page);
    check('F2', 'finding', 'after step 9 (45° then 0°), step 10 opens at the true obliquity: readout and chart', String(r.oblOut).startsWith(trueStr) && a.ok, `obl "${r.oblOut}", ASC ${a.q.asc} (ref ${zodStr(e40.asc)})`);
    await pip(page, 10); await evalClick(page, '#nextBtn'); await H.frames(page, 2); await tab(page, 'Lesson');
    r = await H.read(page); a = await ascOk(page);
    check('F2', 'finding', 'step 11 also opens at the true obliquity', String(r.oblOut).startsWith(trueStr) && a.ok, `obl "${r.oblOut}", ASC ${a.q.asc}`);
    // every step sets its own obliquity on entry
    const bad = [];
    for (let i = 1; i <= 11; i++) {
      await tab(page, 'Layers'); await H.setRange(page, 'oblRange', 45); await H.frames(page, 1); await tab(page, 'Lesson');
      await pip(page, i); r = await H.read(page);
      if (!String(r.oblOut).startsWith(trueStr)) bad.push(`step ${i}: ${r.oblOut}`);
    }
    check('F2', 'finding', 'each of the 11 steps opens at the true obliquity after it was set to 45°', bad.length === 0, bad.join(' | '));
    // the exact way back in Layers
    await tab(page, 'Layers'); await H.setRange(page, 'oblRange', 45); await H.frames(page, 1);
    const hasBtn = await page.$('#oblTrueBtn');
    if (hasBtn) { await page.click('#oblTrueBtn'); await H.frames(page, 3); }
    r = await H.read(page);
    await tab(page, 'Chart'); await H.setState(page, { lat: 64, lst: 30 }); const q = await H.read(page);
    const [e64] = expect([{ lat: 64, lst: 30, obl: OBL }]); const [e64b] = expect([{ lat: 64, lst: 30, obl: 23.5 }]);
    const errT = Math.abs(dd(H.parseZod(q.asc), e64.asc)) * 60, errH = Math.abs(dd(H.parseZod(q.asc), e64b.asc)) * 60;
    check('F2', 'finding', 'Layers has a button that restores the exact true obliquity (readout and chart agree with 23.4392911°, not 23.5°)', !!hasBtn && String(r.oblOut).startsWith(trueStr) && errT < 0.55 && errH > 1, `button ${!!hasBtn}, obl "${r.oblOut}", ASC ${q.asc}: ${errT.toFixed(2)}′ from ref at 23.4392911°, ${errH.toFixed(2)}′ from ref at 23.5°`);
    await tab(page, 'Layers'); await H.setRange(page, 'oblRange', 23.5); await H.frames(page, 2); r = await H.read(page);
    check('F2', 'guard', 'with the slider at 23.5° the readout shows exactly that', r.oblOut === dmsStr(23.5) || r.oblOut === '23° 30′', r.oblOut);
    const flag = fs.readFileSync(process.env.SPHERE, 'utf8').match(/\bobl\s*:\s*true\b/g);
    check('F2', 'finding', 'the unused obl:true step flag is gone (used or removed)', !flag, `${flag && flag.length} left`);
    await page.context().close();
  });

  // ---------------------------------------------------------------- 3. obliquity above the colatitude; ecliptic in the horizon
  await group('F3', 'finding', 'Obliquity above the colatitude and the ecliptic in the horizon (Astra P2; internal P2-7)', async () => {
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    await tab(page, 'Chart');
    const S1 = 1 / 60 * D;               // the page treats planes within 1′ as one plane
    async function at(lat, obl, lst) { await H.setState(page, { lat, obl, lst }); await H.frames(page, 2); return H.read(page); }
    // London, 45°, 18h: the RA = RAMC degree is 0° Capricorn, below the horizon
    let r = await at(51.5, 45, 270); let [e] = expect([{ lat: 51.5, lst: 270, obl: 45 }]);
    check('F3', 'finding', `London, 45°, 18h: MC is the degree at the RAMC, ${zodStr(e.mc)} (ref), and the chart says it lies below the horizon (ref alt ${e.mcAlt.toFixed(1)}°)`,
      strip(r.mc) === zodStr(e.mc) && strip(r.ic) === zodStr(e.mc + 180) && /below the horizon/i.test(r.axNote), JSON.stringify({ mc: r.mc, ic: r.ic, note: r.axNote }));
    check('F3', 'finding', 'London, 45°, 18h: 0° Aries rises, so both quadrants read 90.0° (not 270.0°)', strip(r.asc) === zodStr(0) && r.qAscMc === '90.0°' && r.qAscIc === '90.0°', JSON.stringify({ asc: r.asc, q1: r.qAscMc, q2: r.qAscIc }));
    // exact coincidence
    for (const [lat, obl, lst] of [[40, 50, 270], [66, 24, 270], [-40, 50, 90]]) {
      r = await at(lat, obl, lst); [e] = expect([{ lat, lst, obl }]);
      check('F3', 'finding', `${lat}°, ${obl}°, LST ${lst}° (ref: planes ${e.planeSin < 1e-12 ? 'coincide' : 'apart'}): ASC and DSC undefined, with a note; quadrants blank; MC still ${zodStr(e.mc)}`,
        e.planeSin < 1e-12 && r.asc === '—' && r.desc === '—' && r.qAscMc === '—' && r.qAscIc === '—' && /undefined/i.test(r.axNote) && strip(r.mc) === zodStr(e.mc), JSON.stringify(r));
    }
    // beside the singularity: the eastern intersection, north and south
    for (const [lat, obl, lst] of [[40, 50, 269.75], [40, 50, 270.25], [-40, 50, 89.75], [-40, 50, 90.25], [66, 24, 269.75], [66, 24, 270.25]]) {
      r = await at(lat, obl, lst); [e] = expect([{ lat, lst, obl }]);
      const err = Math.abs(dd(H.parseZod(r.asc), e.asc)) * 60;
      check('F3', 'finding', `${lat}°, ${obl}°, LST ${lst}°: ASC is the eastern intersection, ${zodStr(e.asc)} (ref)`, err < 0.55 && strip(r.asc) === zodStr(e.asc), `page ${r.asc}, ${isNaN(err) ? '' : err.toFixed(1) + '′ off'}`);
    }
    // fuzz against ref.py over all obliquities, many states in the polar and near-singular regimes
    let seed = 20260926; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const OBLS = [0, 5, 10, 20, 23, 23.5, 24, 30, 40, 45, 50];
    const states = [];
    for (let i = 0; i < 260; i++) {
      let obl = OBLS[Math.floor(rnd() * OBLS.length)];
      let lat = Math.round((rnd() * 132 - 66) * 2) / 2;
      if (i % 2 === 0) {                 // near and beyond the colatitude
        obl = [24, 30, 40, 45, 50][Math.floor(rnd() * 5)];
        lat = (rnd() < 0.5 ? 1 : -1) * Math.min(66, Math.max(0, Math.round((90 - obl + (rnd() * 10 - 4)) * 2) / 2));
      }
      states.push({ lat, lst: Math.round(rnd() * 1440) / 4, obl });
    }
    const ex = expect(states);
    const bad = []; let nUndef = 0, nBelow = 0, nPolar = 0;
    for (let i = 0; i < states.length; i++) {
      const st = states[i], e = ex[i]; r = await at(st.lat, st.obl, st.lst);
      if (st.obl > 90 - Math.abs(st.lat)) nPolar++;
      const mcErr = Math.abs(dd(H.parseZod(r.mc), e.mc)) * 60, icErr = Math.abs(dd(H.parseZod(r.ic), e.mc + 180)) * 60;
      if (!(mcErr < 0.55 && icErr < 0.55)) bad.push(`${JSON.stringify(st)} MC ${r.mc}/${r.ic} ref ${zodStr(e.mc)}`);
      if (e.planeSin < Math.sin(S1 * 0.9)) { nUndef++; if (r.asc !== '—' || r.desc !== '—') bad.push(`${JSON.stringify(st)} should be undefined, ASC ${r.asc}`); }
      else if (e.planeSin > Math.sin(S1 * 1.1)) {
        const aErr = Math.abs(dd(H.parseZod(r.asc), e.asc)) * 60, dErr = Math.abs(dd(H.parseZod(r.desc), e.asc + 180)) * 60;
        if (!(aErr < 0.55 && dErr < 0.55)) bad.push(`${JSON.stringify(st)} ASC ${r.asc}/${r.desc} ref ${zodStr(e.asc)}`);
        const q1 = n360(e.asc - e.mc), q2 = 180 - q1;
        if (Math.abs(num(r.qAscMc) - q1) > 0.051 && Math.abs(num(r.qAscMc) - q1) < 359.9) bad.push(`${JSON.stringify(st)} MC→ASC ${r.qAscMc} ref ${q1.toFixed(2)}`);
        if (Math.abs(num(r.qAscIc) - q2) > 0.051) bad.push(`${JSON.stringify(st)} ASC→IC ${r.qAscIc} ref ${q2.toFixed(2)}`);
      }
      const below = /below the horizon/i.test(r.axNote);
      if (e.mcAlt < -1 / 60) { nBelow++; if (!below) bad.push(`${JSON.stringify(st)} MC ${e.mcAlt.toFixed(2)}° below, no note`); }
      if (e.mcAlt > 0 && below) bad.push(`${JSON.stringify(st)} MC above the horizon but the note says below`);
    }
    check('F3', 'finding', `${states.length} states against ref.py (${nPolar} with obliquity above the colatitude, ${nBelow} with the MC below the horizon, ${nUndef} undefined): MC, IC, ASC, DSC within 0.5′, quadrants within 0.05°, notes where due`, bad.length === 0, `${bad.length} bad: ` + bad.slice(0, 4).join(' | '));
    await page.screenshot({ path: path.join(OUT, 'F3-chart-last-fuzz-state.png') });
    await at(40, 50, 270); await page.screenshot({ path: path.join(OUT, 'F3-chart-40N-50-18h-undefined.png') });
    await at(51.5, 45, 270); await page.screenshot({ path: path.join(OUT, 'F3-chart-london-45-18h-mc-below.png') });
    // the note in every language
    const notes = [];
    for (const l of LANGS) { await lang(page, l); await at(40, 50, 270); const n1 = (await H.read(page)).axNote; await at(51.5, 45, 270); const n2 = (await H.read(page)).axNote; if (!n1 || !n2 || n1 === n2) notes.push(`${l}: "${n1}" / "${n2}"`); }
    check('F3', 'finding', 'both notes (no Ascendant; MC below the horizon) appear in all 7 languages', notes.length === 0, notes.join(' | '));
    await page.context().close();
  });

  // ---------------------------------------------------------------- 4–9. teaching text in all 7 languages
  const TEXT = {};
  await group('TX', 'finding', 'collect the texts of steps 8, 9, 11 and the Chart tab in 7 languages', async () => {
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    for (const l of LANGS) {
      await lang(page, l);
      TEXT[l] = { s6: await stepTexts(page, 6), s8: await stepTexts(page, 8), s9: await stepTexts(page, 9), s11: await stepTexts(page, 11), ...(await chartTexts(page)) };
    }
    fs.writeFileSync(path.join(OUT, 'texts.json'), JSON.stringify(TEXT, null, 1));
    await page.context().close();
  });
  const T = l => TEXT[l] || { s6: {}, s8: {}, s9: {}, s11: {} };
  function perLang(id, name, fn) {
    const bad = [];
    for (const l of LANGS) { const why = fn(l, T(l)); if (why) bad.push(`${l}: ${why}`); }
    check(id, 'finding', name, bad.length === 0, bad.join(' | '));
  }
  const has = (s, re) => re instanceof RegExp ? re.test(s || '') : String(s || '').includes(re);

  await group('F4', 'finding', "Step 9's RA/longitude example (Astra P1; internal P3-13)", async () => {
    const e = OBL * D;
    const lonAtRA30 = Math.atan2(Math.tan(30 * D), Math.cos(e)) / D;          // ecliptic degree whose RA is 30°
    const raOf30 = Math.atan2(Math.cos(e) * Math.sin(30 * D), Math.cos(30 * D)) / D;   // RA of 0° Taurus
    const s1 = dmStr(lonAtRA30), s2 = dmStr(raOf30);
    check('F4', 'guard', `independent check: 30° RA is ${s1} of longitude (Lesson 4 p. 16: 32° 10′ 51″), 0° Taurus is at ${s2} of RA`, s1 === '32° 11′' && Math.abs(lonAtRA30 - (32 + 10 / 60 + 51 / 3600)) * 3600 < 3 && s2 === '27° 55′', `${lonAtRA30} ${raOf30}`);
    const OLD = { en: 'at the start of Taurus', nb: 'ved begynnelsen av Tyren er det 32° 11′', es: 'al comienzo de Tauro son 32° 11′', fr: 'au seuil du Taureau', de: 'am Beginn des Stiers sind es 32° 11′', zh: '在金牛座起点，它是 32° 11′', ja: '牡牛座の初めでは 32° 11′' };
    perLang('F4', `step 9 in all 7 languages: the reversed "32° 11′ at the start of Taurus" is gone; it gives ${s1} for 30° of RA and ${s2} for 0° Taurus`, (l, t) =>
      has(t.s9.body, OLD[l]) ? 'old sentence still there' : (!has(t.s9.body, s1) || !has(t.s9.body, s2)) ? `missing ${s1} or ${s2}` : '');
    check('F4', 'finding', 'English step 9 says which coordinate is held at 30°: "the degree of the ecliptic at 30° of RA"', has(T('en').s9.body, 'the degree of the ecliptic at 30° of RA'), T('en').s9.body);
  });

  await group('F5', 'finding', "Chart text: the 0° Aries / 0° Libra exception (Astra P1)", async () => {
    const OLD = { en: 'The zodiac simply does not sit squarely on them.', nb: 'Dyrekretsen legger seg rett og slett ikke jevnt over dem.', es: 'El zodíaco, sencillamente, no encaja a escuadra en ellos.', fr: 'ne s\'y pose tout simplement pas d\'équerre', de: 'Der Tierkreis liegt darauf schlicht nicht im rechten Winkel.', zh: '黄道只是没有端端正正地落在上面。', ja: '黄道はその上に、まっすぐには載ってくれません。' };
    const NAMES = { en: ['Aries', 'Libra'], nb: ['Væren', 'Vekten'], es: ['Aries', 'Libra'], fr: ['Bélier', 'Balance'], de: ['Widder', 'Waage'], zh: ['白羊座', '天秤座'], ja: ['牡羊座', '天秤座'] };
    perLang('F5', 'Chart text in all 7 languages: the unqualified "does not sit squarely" is gone and the 0° Aries / 0° Libra exception is named', (l, t) =>
      has(t.measure, OLD[l]) ? 'old sentence still there' : (!has(t.measure, NAMES[l][0]) || !has(t.measure, NAMES[l][1]) || (t.measure.match(/0°/g) || []).length < 2) ? 'exception not named' : '');
    // Lesson 4 p. 21: with 0° Aries or Libra rising the zodiacal quadrants are 90°
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' }); await tab(page, 'Chart');
    const bad = [];
    for (const lat of [20, 40, 64, -40]) for (const lst of [90, 270]) { await H.setState(page, { lat, lst }); const r = await H.read(page); if (r.qAscMc !== '90.0°' || r.qAscIc !== '90.0°') bad.push(`${lat}/${lst}: ${r.qAscMc} ${r.qAscIc}`); }
    check('F5', 'guard', 'the exception holds on the page: 0° Aries or 0° Libra rising gives 90.0° and 90.0° at 20°, 40°, 64° N and 40° S', bad.length === 0, bad.join(' | '));
    await page.context().close();
  });

  await group('F6', 'finding', 'Step 11: both hemispheres; "other than the signs" (Astra; internal P3-10, P3-12)', async () => {
    const OLDN = { en: 'the further north you stand the wilder it gets', nb: 'jo lenger nord du står', es: 'cuanto más al norte se esté', fr: 'plus on monte vers le nord', de: 'je weiter nördlich man steht', zh: '你站得越靠北', ja: '北へ行くほど' };
    const NEWN = { en: 'north or south', nb: 'mot nord eller sør', es: 'al norte o al sur', fr: 'vers le nord ou vers le sud', de: 'nach Norden oder Süden', zh: '无论向北还是向南', ja: '北でも南でも' };
    const OLDP = { en: 'no scheme of twelve equal parts escapes it.', nb: 'ingen ordning med tolv like deler slipper unna det.', es: 'ningún reparto en doce partes iguales se libra de él.', fr: 'aucun découpage en douze parts égales n\'y échappe.', de: 'keine Einteilung in zwölf gleiche Teile entkommt ihr.', zh: '任何均分十二份的方案都逃不掉。', ja: '天を十二等分するどんな方式もここからは逃れられません。' };
    const NEWP = { en: 'other than the signs themselves', nb: 'bortsett fra tegnene selv', es: 'salvo el de los propios signos', fr: 'sauf celui des signes eux-mêmes', de: 'außer der durch die Zeichen selbst', zh: '唯有以星座本身为宫者例外', ja: 'サインそのものをハウスとする方式を除いて' };
    perLang('F6', 'step 11 in all 7 languages: "the further north" becomes the further from the equator, north or south', (l, t) => has(t.s11.body, OLDN[l]) ? 'old wording still there' : !has(t.s11.body, NEWN[l]) ? 'both hemispheres not named' : '');
    perLang('F6', 'step 11 in all 7 languages: twelve equal houses fail "other than the signs", as the lesson says', (l, t) => has(t.s11.body, OLDP[l]) ? 'old wording still there' : !has(t.s11.body, NEWP[l]) ? 'exception for the signs missing' : '');
  });

  await group('F7', 'finding', "Step 8's Try this: the lesson's qualifier (internal P2-5)", async () => {
    const OLD = { en: 'never a place on earth', nb: 'aldri et sted på jorden', es: 'nunca a un lugar de la tierra', fr: 'jamais un lieu terrestre', de: 'nie einen Ort auf der Erde', zh: '绝不指地球上的某处', ja: '地上の場所を指すことはありません' };
    const NEW = { en: 'unless the text is explicitly talking about a chart', nb: 'med mindre teksten uttrykkelig snakker om horoskopets sted på jorden', es: 'salvo que el texto hable expresamente del lugar de la carta', fr: 'sauf quand le texte parle expressément du lieu terrestre du thème', de: 'es sei denn, der Text spricht ausdrücklich vom Ort des Horoskops', zh: '除非文中明确在谈星盘在地球上的地点', ja: 'チャートの地上の場所をはっきり話題にしている場合は別' };
    perLang('F7', 'step 8 Try this in all 7 languages: "never a place on earth" is gone; the chart-location exception is stated', (l, t) => has(t.s8.tryit, OLD[l]) ? 'old wording still there' : !has(t.s8.tryit, NEW[l]) ? 'qualifier missing' : '');
  });

  await group('F8', 'finding', 'Step 8: the band "is understood to reach 8°" (internal P3-11)', async () => {
    const OLD = { en: 'is as far as they go', nb: 'er så langt de kommer', es: 'es hasta donde llegan', fr: 'marque leur limite', de: 'ist ihre Grenze', zh: '便是它们所能到达的极限', ja: 'その限界です' };
    const NEW = { en: 'understood to reach 8°', nb: 'regnes å nå 8°', es: 'se entiende, llega a 8°', fr: 'censée s\'étendre à 8°', de: 'nach überliefertem Verständnis 8°', zh: '按传统理解在黄道南北各延伸 8°', ja: '南北 8° まで広がるとされる' };
    const VENUS = { en: 'Venus', nb: 'Venus', es: 'Venus', fr: 'Vénus', de: 'Venus', zh: '金星', ja: '金星' };
    perLang('F8', 'step 8 in all 7 languages: "as far as they go" is gone; the band is "understood to reach 8°" and Venus can stray beyond it', (l, t) => has(t.s8.body, OLD[l]) ? 'old wording still there' : (!has(t.s8.body, NEW[l]) || !has(t.s8.body, VENUS[l])) ? 'new wording missing' : '');
  });

  await group('F9', 'finding', 'Chart footnote: the true reason OA and OD are 90° from the RAMC (internal P1-3)', async () => {
    const OLD = { en: 'the great circles are perpendicular, so their degrees must be', nb: 'storsirklene står vinkelrett på hverandre, og derfor må gradene deres gjøre det også', es: 'los círculos máximos son perpendiculares, de modo que sus grados también han de serlo', fr: 'les grands cercles sont perpendiculaires, donc leurs degrés le sont aussi', de: 'die Großkreise stehen senkrecht aufeinander, also auch ihre Grade', zh: '大圆彼此垂直，其度数自然也必须如此', ja: '大円どうしが直交する以上、その度数もそうならざるを得ません' };
    const NEW = { en: 'the poles of the meridian', nb: 'meridianens poler', es: 'los polos del meridiano', fr: 'les pôles du méridien', de: 'die Pole des Meridians', zh: '子午圈的极', ja: '子午圏の極' };
    perLang('F9', 'Chart footnote in all 7 languages: the false "perpendicular, so their degrees must be" is gone; E and W are the poles of the meridian', (l, t) => has(t.foot, OLD[l]) ? 'old reason still there' : !has(t.foot, NEW[l]) ? 'true reason missing' : '');
  });

  // ---------------------------------------------------------------- 10. step 11 shows its text and its chart together
  await group('F10', 'finding', 'Step 11 keeps its text, paints its wheel, keeps focus (internal P2-8)', async () => {
    for (const rm of ['reduce', 'no-preference']) {
      const page = await H.open(b, { width: 1440, height: 900, lang: 'en', reducedMotion: rm });
      await page.click('#pips button:nth-child(10)'); await H.frames(page, 2);
      await page.focus('#nextBtn'); await page.keyboard.press('Enter'); await H.frames(page, 3); await page.waitForTimeout(300);
      const st = await page.evaluate(() => {
        const pane = document.getElementById('paneLesson'), body = document.getElementById('stepBody');
        const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
        const wheels = [...document.querySelectorAll('canvas')].filter(c => c.width === 720 && pane.contains(c) && vis(c));
        let ink = 0; if (wheels[0]) { const d = wheels[0].getContext('2d').getImageData(0, 0, 720, 720).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) ink++; }
        const ae = document.activeElement;
        return { paneShown: !pane.hidden && vis(pane), bodyShown: vis(body) && body.textContent.length > 100, step: document.getElementById('stepCount').textContent, wheelInPane: wheels.length, ink, focus: ae ? (ae.id || ae.tagName) : null, focusInPane: !!(ae && pane.contains(ae) && ae !== document.body) };
      });
      check('F10', 'finding', `[${rm}] Next from step 10 lands on step 11 with its text still shown`, st.paneShown && st.bodyShown && /11/.test(st.step), JSON.stringify(st));
      check('F10', 'finding', `[${rm}] step 11's chart wheel is visible in the same pane and painted on arrival`, st.wheelInPane >= 1 && st.ink > 5000, JSON.stringify(st));
      check('F10', 'finding', `[${rm}] focus stays on a control in the step pane (Next disables, so Back takes it)`, st.focusInPane && st.focus === 'prevBtn', JSON.stringify(st));
      if (rm === 'reduce') await page.screenshot({ path: path.join(OUT, 'F10-step11-reduced-motion.png') });
      // the Chart tab's wheel also paints the moment it is opened under reduced motion
      if (rm === 'reduce') {
        await pip(page, 3); await page.click('#tabChart'); await H.frames(page, 2);
        const ink = await inkOf(page, '#wheel');
        check('F10', 'guard', '[reduce] the Chart tab wheel is painted as soon as the tab opens (the tab button always painted it; only step 11 did not)', ink > 5000, `ink ${ink}`);
      }
      await page.context().close();
    }
  });

  // ---------------------------------------------------------------- 11. mobile
  await group('F11', 'finding', 'Mobile: plate, title, All layers (internal P2-9; Astra P3)', async () => {
    const badPlate = [], badSE = [], badTitle = [], badAll = [];
    for (const w of [320, 375, 390]) for (const l of LANGS) {
      const page = await H.open(b, { width: w, height: 800, lang: l, reducedMotion: 'reduce' });
      await H.frames(page, 3);
      const cv = await rect(page, '#view canvas'), pl = await rect(page, '#plate'), mh = await rect(page, '.masthead');
      const cover = cv && pl ? inter(cv, pl) / (cv.width * cv.height) : 1;
      if (cover > 0.01) badPlate.push(`${w}/${l} ${(cover * 100).toFixed(0)}%`);
      const bx = (await H.labelBoxes(page)) || [];
      for (const k of ['lbl.S', 'lbl.E']) {
        const x = bx.find(o => o.key === k);
        const inside = x && cv && x.left >= cv.left - 1 && x.right <= cv.right + 1 && x.top >= cv.top - 1 && x.bottom <= cv.bottom + 1;
        const hidden = x && (inter(x, pl) > 0 || inter(x, mh) > 0);
        if (!inside || hidden) badSE.push(`${w}/${l} ${k} ${x ? (inside ? 'covered' : 'outside the view') : 'missing'}`);
      }
      const t = await page.evaluate(() => { const h = document.querySelector('.masthead h1'), s = document.getElementById('langSel'); const r = document.createRange(); r.selectNodeContents(h); const sr = s.getBoundingClientRect(); return [...r.getClientRects()].some(q => !(q.right <= sr.left || sr.right <= q.left || q.bottom <= sr.top || sr.bottom <= q.top)); });
      if (t) badTitle.push(`${w}/${l}`);
      const a = await page.evaluate(() => { const bt = document.getElementById('freeBtn'), p = document.getElementById('paneLesson'); const r = bt.getBoundingClientRect(), pr = p.getBoundingClientRect(); const cs = getComputedStyle(p); return { clipped: bt.scrollWidth > bt.clientWidth + 1, right: r.right, limit: pr.right - parseFloat(cs.paddingRight) + 1, vw: document.documentElement.clientWidth }; });
      if (a.clipped || a.right > a.limit || a.right > a.vw) badAll.push(`${w}/${l} ${JSON.stringify(a)}`);
      if (l === 'fr' || (w === 390 && l === 'ja') || (w === 320 && l === 'nb')) await page.screenshot({ path: path.join(OUT, `F11-${w}-${l}.png`), fullPage: true });
      await page.context().close();
    }
    check('F11', 'finding', 'at 320, 375 and 390 px, in all 7 languages, the plate covers none of the sphere view', badPlate.length === 0, badPlate.join(' | '));
    check('F11', 'finding', 'at 320–390 px the S and E labels are inside the view and not under the plate or title', badSE.length === 0, badSE.slice(0, 6).join(' | '));
    check('F11', 'finding', 'at 320–390 px the title never runs under the language menu (7 languages)', badTitle.length === 0, badTitle.join(' | '));
    check('F11', 'finding', 'at 320–390 px "All layers" is never clipped (7 languages)', badAll.length === 0, badAll.join(' | '));
  });

  // ---------------------------------------------------------------- 12. scrolling on narrow screens
  await group('F12', 'finding', 'No scroll trap below 980 px (internal P3-18): the page scrolls from anywhere off the sphere', async () => {
    let page = await H.open(b, { width: 768, height: 900, lang: 'en' });
    await settle(page);
    const cv = await rect(page, '#view canvas');
    const cx = cv.left + cv.width / 2, cy = cv.top + cv.height / 2;
    await page.mouse.move(cx, cy); const d0 = camDist(await camPos(page));
    await page.mouse.wheel(0, 500); await page.waitForTimeout(600);
    const y1 = await page.evaluate(() => scrollY); await settle(page); const d1 = camDist(await camPos(page));
    check('F12', 'finding', '768 px: the mouse wheel over the sphere scrolls the page and does not zoom', y1 > 100 && Math.abs(d1 - d0) < 1e-3, `scrollY ${y1}, camera ${d0.toFixed(3)} → ${d1.toFixed(3)}`);
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    await page.mouse.move(cx, cy); await page.keyboard.down('Control'); await page.mouse.wheel(0, -300); await page.keyboard.up('Control'); await page.waitForTimeout(300);
    const y2 = await page.evaluate(() => scrollY); await settle(page); const d2 = camDist(await camPos(page));
    check('F12', 'guard', '768 px: ctrl+wheel over the sphere still zooms, without scrolling', y2 < 5 && d2 < d1 - 0.1, `scrollY ${y2}, camera ${d1.toFixed(3)} → ${d2.toFixed(3)}`);
    await page.context().close();
    // touch, on a phone
    page = await H.open(b, { width: 390, height: 844, lang: 'en', hasTouch: true, isMobile: true });
    await settle(page);
    const cdp = await page.context().newCDPSession(page);
    async function drag(pts0, pts1, steps = 12) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts0.map(([x, y], i) => ({ x, y, id: i })) });
      for (let k = 1; k <= steps; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts0.map(([x, y], i) => ({ x: x + (pts1[i][0] - x) * k / steps, y: y + (pts1[i][1] - y) * k / steps, id: i })) }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(700);
    }
    const vh = await page.evaluate(() => innerHeight), c2 = await rect(page, '#view canvas');
    check('F12', 'finding', '390 px: the sphere never fills the screen, so there is always room to swipe the page', c2.height <= vh - 60, `view ${c2.height} px of ${vh}`);
    const p2 = await rect(page, '#plate');
    await drag([[p2.left + p2.width / 2, p2.top + p2.height * 0.7]], [[p2.left + p2.width / 2, p2.top - 150]]);
    const yp = await page.evaluate(() => scrollY);
    check('F12', 'finding', '390 px touch: a vertical swipe on the plate scrolls the page', yp > 60, `scrollY ${yp}`);
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300); await settle(page);
    const c3 = await rect(page, '#view canvas'); const before = await camPos(page);
    await drag([[c3.left + c3.width * 0.2, c3.top + c3.height / 2]], [[c3.left + c3.width * 0.8, c3.top + c3.height / 2]]);
    await settle(page); const after = await camPos(page); const yh = await page.evaluate(() => scrollY);
    const moved = Math.hypot(after[0] - before[0], after[2] - before[2]);
    check('F12', 'guard', '390 px touch: a sideways drag on the sphere still turns it', moved > 0.3 && yh < 5, `camera moved ${moved.toFixed(3)}, scrollY ${yh}`);
    const dA = camDist(await camPos(page)), mx = c3.left + c3.width / 2, my = c3.top + c3.height / 2;
    await drag([[mx - 30, my], [mx + 30, my]], [[mx - 120, my], [mx + 120, my]], 14);
    await settle(page); const dB = camDist(await camPos(page));
    check('F12', 'guard', '390 px touch: pinching out on the sphere zooms in', dB < dA - 0.2, `camera ${dA.toFixed(3)} → ${dB.toFixed(3)}`);
    await page.context().close();
    // desktop: the wheel still zooms
    page = await H.open(b, { width: 1440, height: 900, lang: 'en' }); await settle(page);
    const c4 = await rect(page, '#view canvas'); const e0 = camDist(await camPos(page));
    await page.mouse.move(c4.left + c4.width / 2, c4.top + c4.height / 2); await page.mouse.wheel(0, -300); await settle(page);
    const e1 = camDist(await camPos(page));
    check('F12', 'guard', '1440 px: the mouse wheel over the sphere still zooms', e1 < e0 - 0.1, `camera ${e0.toFixed(3)} → ${e1.toFixed(3)}`);
    await page.context().close();
  });

  // ---------------------------------------------------------------- 13. accessibility
  await group('F13', 'finding', 'Accessibility (Astra P3; internal P3-16)', async () => {
    let page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    await settle(page); await page.waitForTimeout(1200);
    const a = await page.evaluate(() => {
      const c = document.querySelector('#view canvas'), w = document.getElementById('wheel');
      const desc = (c.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => (document.getElementById(id) || {}).textContent || '').join(' ');
      // a live region that speaks the description (in the description itself, or beside it in the view)
      const live = (c.getAttribute('aria-describedby') || '').split(/\s+/).some(id => { const e = document.getElementById(id); return e && /polite|assertive/.test(e.getAttribute('aria-live') || ''); })
        || !!document.querySelector('#view [aria-live=polite], #view [aria-live=assertive]');
      return { role: c.getAttribute('role'), label: c.getAttribute('aria-label'), desc, live, tab: c.tabIndex, wrole: w.getAttribute('role'), wlabel: w.getAttribute('aria-label') };
    });
    check('F13', 'finding', 'the sphere canvas is an image with a name', a.role === 'img' && !!a.label, JSON.stringify(a));
    check('F13', 'finding', 'the sphere has a live description: latitude, sidereal time, the step, the probe and its quadrant', a.live && /40\.0° N/.test(a.desc) && /00h 00m/.test(a.desc) && /Step 1 of 11/.test(a.desc) && /Aldebaran/.test(a.desc) && /eastern quadrant/.test(a.desc), a.desc);
    check('F13', 'finding', 'the chart wheel is an image with a name', a.wrole === 'img' && !!a.wlabel, JSON.stringify(a));
    // the description follows the state and the language
    await H.setState(page, { lat: -33.5, lst: 150 }); await lang(page, 'fr'); await page.waitForTimeout(1200);
    const [ea] = expect([{ lat: -33.5, lst: 150, obl: OBL, ra: CAT.Aldebaran.ra, dec: CAT.Aldebaran.dec }]);
    const qfr = ea.alt >= 0 ? (ea.az < 180 ? 'oriental' : 'méridional') : (ea.az < 180 ? 'septentrional' : 'occidental');
    const d2 = await page.evaluate(() => { const c = document.querySelector('#view canvas'); return { label: c.getAttribute('aria-label'), desc: (c.getAttribute('aria-describedby') || '').split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ') }; });
    check('F13', 'finding', `after a change, in French: the description follows (33,5° S, 10h 00m, Aldébaran in the ${qfr} quadrant by ref.py) and the name is translated`, /33,5° S/.test(d2.desc) && /10h 00m/.test(d2.desc) && /Aldébaran/.test(d2.desc) && d2.desc.includes('quadrant ' + qfr) && d2.label && d2.label !== a.label, JSON.stringify(d2));
    await lang(page, 'en'); await H.setState(page, { lat: 40, lst: 0 });
    // keyboard control of the camera
    await settle(page); const p0 = await camPos(page); const y0 = await page.evaluate(() => scrollY);
    let focused = false;
    try { await page.focus('#view canvas'); focused = await page.evaluate(() => document.activeElement && document.activeElement.tagName === 'CANVAS'); } catch (e) {}
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp'); await settle(page);
    const p1 = await camPos(page);
    check('F13', 'finding', 'the view takes focus and the arrow keys turn the camera', focused && Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) > 0.3 && (await page.evaluate(() => scrollY)) === y0, `focusable ${focused}, moved ${Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).toFixed(3)}`);
    // Back hands focus to Next at step 1; Next hands it to Back at step 11
    await page.click('#pips button:nth-child(2)'); await page.focus('#prevBtn'); await page.keyboard.press('Enter'); await H.frames(page, 2);
    const f1 = await page.evaluate(() => [document.activeElement.id, document.getElementById('prevBtn').disabled]);
    check('F13', 'finding', 'Back pressed at step 2 disables itself and hands focus to Next', f1[1] && f1[0] === 'nextBtn', JSON.stringify(f1));
    // step dots: size and translated names
    const pipSz = await page.evaluate(() => [...document.querySelectorAll('#pips button')].map(p => { const r = p.getBoundingClientRect(); return [r.width, r.height]; }));
    check('F13', 'finding', 'each step dot is a target of at least 24 × 24 px', pipSz.length === 11 && pipSz.every(([w, h]) => w >= 24 && h >= 24), JSON.stringify(pipSz[0]));
    const badPip = [];
    for (const l of LANGS) {
      await lang(page, l); await pip(page, 3);
      const q = await page.evaluate(() => ({ lab: document.querySelectorAll('#pips button')[2].getAttribute('aria-label'), title: document.getElementById('stepTitle').textContent.trim(), langLbl: document.querySelector('label[for=langSel]').textContent.trim() }));
      if (!q.lab || !q.lab.includes(q.title)) badPip.push(`${l}: "${q.lab}" vs title "${q.title}"`);
      if (l !== 'en' && (/^Language$/.test(q.langLbl) || !q.langLbl)) badPip.push(`${l}: language label "${q.langLbl}"`);
    }
    check('F13', 'finding', 'step dots are named in the page language (7 languages), and so is the "Language" label', badPip.length === 0, badPip.join(' | '));
    await page.context().close();
    // Next at the last step hands focus to Back (keyboard)
    page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    await page.click('#pips button:nth-child(10)'); await page.focus('#nextBtn'); await page.keyboard.press('Enter'); await H.frames(page, 2);
    const f2 = await page.evaluate(() => [document.activeElement.id, document.getElementById('nextBtn').disabled]);
    check('F13', 'finding', 'Next pressed at step 10 disables itself at step 11 and hands focus to Back', f2[1] && f2[0] === 'prevBtn', JSON.stringify(f2));
    // contrast of every visible text, 3 tabs, English and Japanese
    const lows = [];
    for (const l of ['en', 'ja']) {
      await lang(page, l);
      for (const t of ['Lesson', 'Layers', 'Chart']) {
        await page.click('#tab' + t); await H.frames(page, 2);
        if (t === 'Lesson') { await pip(page, 2); }
        const r = await page.evaluate(() => {
          function parse(c) { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; }
          function lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
          function blend(t, u) { const a = t.a; return { r: t.r * a + u.r * (1 - a), g: t.g * a + u.g * (1 - a), b: t.b * a + u.b * (1 - a), a: 1 }; }
          function bgOf(e) { const st = []; let n = e; while (n && n.nodeType === 1) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) st.push(c); if (c && c.a >= 1) break; n = n.parentElement; } let base = { r: 15, g: 22, b: 38, a: 1 }; for (let i = st.length - 1; i >= 0; i--) base = blend(st[i], base); return base; }
          const out = []; const wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const seen = new Set();
          while (wk.nextNode()) {
            const tn = wk.currentNode; if (!tn.textContent.trim()) continue; const e = tn.parentElement; if (seen.has(e)) continue; seen.add(e);
            if (!e.getClientRects().length || e.closest('.visually-hidden') || e.closest('[hidden]') || e.closest('option')) continue;
            const cs = getComputedStyle(e); if (cs.visibility === 'hidden') continue;
            let o = 1, n = e; while (n) { o *= parseFloat(getComputedStyle(n).opacity); n = n.parentElement; }
            const bg = bgOf(e); const fg = blend({ ...parse(cs.color), a: parse(cs.color).a * o }, bg);
            const ratio = (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05);
            const px = parseFloat(cs.fontSize), large = px >= 24 || (parseInt(cs.fontWeight) >= 700 && px >= 18.66);
            if (ratio < (large ? 3 : 4.5) && !e.closest('button:disabled')) out.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className).split(' ')[0]} "${tn.textContent.trim().slice(0, 24)}" ${ratio.toFixed(2)}`);
          }
          return out;
        });
        r.forEach(x => lows.push(`${l}/${t}: ${x}`));
      }
    }
    const m2 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--muted-2').trim());
    check('F13', 'finding', `every visible text in the three tabs (en, ja) reaches 4.5:1 (3:1 when large); --muted-2 is ${m2}`, lows.length === 0, [...new Set(lows)].slice(0, 6).join(' | '));
    await page.context().close();
    // the WebGL fallback, in the reader's language
    const nb2 = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis', '--disable-gpu'] });
    for (const l of ['fr', 'ja']) {
      const ctx = await nb2.newContext({ viewport: { width: 1024, height: 768 } }); const p = await ctx.newPage();
      await p.addInitScript(l => { try { localStorage.setItem('dah.lang', l); } catch (e) {} }, l);
      await p.goto(H.PAGE); await p.waitForTimeout(800);
      const bt = await p.evaluate(() => ({ boot: document.getElementById('boot').textContent, lang: document.documentElement.lang, lbl: (document.querySelector('label[for=langSel]') || {}).textContent }));
      check('F13', 'finding', `without WebGL, the fallback message is in ${l}`, /WebGL/.test(bt.boot) && !/This browser can't draw/.test(bt.boot) && bt.lang.startsWith(l), JSON.stringify(bt));
      if (l === 'fr') await p.screenshot({ path: path.join(OUT, 'F13-no-webgl-fr.png') });
      await ctx.close();
    }
    await nb2.close();
  });

  // ---------------------------------------------------------------- 14. labels
  await group('F14', 'finding', 'Overlapping and clipped labels (internal P3-17)', async () => {
    const FRAME = /^(lbl\.|ra$)/;
    const bad = [];
    for (const [w, h] of [[1440, 900], [1024, 768]]) for (const l of LANGS) {
      const page = await H.open(b, { width: w, height: h, lang: l, reducedMotion: 'reduce' });
      for (let st = 1; st <= 11; st++) {
        await pip(page, st); await H.setState(page, { lat: 40, lst: 0, sun: 0 }); await settle(page);
        const bx = ((await H.labelBoxes(page)) || []).filter(x => FRAME.test(x.key));
        for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) if (overlap(bx[i], bx[j], 1)) bad.push(`${w}/${l}/step ${st}: ${bx[i].key} × ${bx[j].key}`);
        if ((st === 3 && l === 'en' && w === 1440) || (st === 10 && l === 'ja' && w === 1440) || (st === 3 && l === 'de' && w === 1024)) await page.screenshot({ path: path.join(OUT, `F14-step${st}-${l}-${w}.png`) });
      }
      await page.context().close();
    }
    const named = ['lbl.meridian × lbl.W', 'lbl.pv × lbl.N', 'lbl.E × ra', 'lbl.meridian × lbl.sun'];
    check('F14', 'finding', 'the reported overlaps are gone: Meridian/W and Prime vertical/N (step 3), RA 90°/東 and 子午圏/太陽 (step 10)', !bad.some(x => named.some(n => x.includes(n) || x.includes(n.split(' × ').reverse().join(' × ')))), bad.filter(x => /meridian|pv|× ra|ra ×|sun/.test(x)).slice(0, 6).join(' | '));
    check('F14', 'finding', 'no two frame labels overlap in any step at the default state (1440 and 1024 px, 7 languages)', bad.length === 0, `${bad.length}: ` + [...new Set(bad)].slice(0, 6).join(' | '));
    // the wheel's DESC (and every axis name) inside its canvas
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' }); await tab(page, 'Chart');
    const clip = [];
    for (const l of LANGS) {
      await lang(page, l);
      for (const [lat, lst] of [[40, 0], [40, 90], [51.5, 200], [-40, 300], [64, 30]]) {
        await H.setState(page, { lat, lst }); await H.frames(page, 2);
        const e = await page.evaluate(() => { const c = document.getElementById('wheel'), W = c.width, d = c.getContext('2d').getImageData(0, 0, W, W).data; let n = 0; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { if (x > 2 && x < W - 3 && y > 2 && y < W - 3) continue; if (d[(y * W + x) * 4 + 3] > 30) n++; } return n; });
        if (e > 0) clip.push(`${l} ${lat}/${lst}: ${e} px at the edge`);
      }
    }
    check('F14', 'finding', "the wheel's axis names (DESC included) stay inside the canvas (7 languages, 5 states)", clip.length === 0, clip.slice(0, 5).join(' | '));
    await page.context().close();
    // the plate's labels never wrap at phone widths
    const wrap = [];
    for (const w of [320, 375, 390]) for (const l of LANGS) {
      const p = await H.open(b, { width: w, height: 800, lang: l, reducedMotion: 'reduce' });
      const n = await p.evaluate(() => [...document.querySelectorAll('.row b')].map(e => { const r = document.createRange(); r.selectNodeContents(e); const rs = [...r.getClientRects()]; const tops = new Set(rs.map(q => Math.round(q.top))); return [e.textContent, tops.size]; }));
      n.filter(([, k]) => k > 1).forEach(([t]) => wrap.push(`${w}/${l} "${t}"`));
      await p.context().close();
    }
    check('F14', 'finding', "the plate's Az/Alt, RA/Dec and Long/Lat labels stay on one line at 320–390 px in all 7 languages", wrap.length === 0, wrap.join(' | '));
  });

  // ---------------------------------------------------------------- 15. southern hemisphere pole label
  await group('F15', 'finding', 'The raised south pole gets the bright label (internal P3-10)', async () => {
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    await pip(page, 5);
    async function bright() {
      return page.evaluate(() => {
        const out = {}; window.__scene.traverse(o => { if (o.isSprite && o.userData.i18n && /^lbl\.[ns]pole$/.test(o.userData.i18n.key)) {
          const c = o.material.map.image, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let m = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) m = Math.max(m, 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
          out[o.userData.i18n.key] = Math.round(m); } });
        return out;
      });
    }
    await H.setState(page, { lat: 40 }); const n = await bright();
    await H.setState(page, { lat: -40 }); await H.frames(page, 2); const s = await bright();
    check('F15', 'guard', 'at 40° N the raised north pole has the brighter label', n['lbl.npole'] > n['lbl.spole'], JSON.stringify(n));
    check('F15', 'finding', 'at 40° S the raised south pole has the brighter label', s['lbl.spole'] > s['lbl.npole'], JSON.stringify(s));
    await page.screenshot({ path: path.join(OUT, 'F15-step5-40S.png') });
    await page.context().close();
    // and the bright label does not print over its neighbours at 40° S (steps 5–11, 7 languages)
    const bad = [];
    for (const l of LANGS) {
      const p = await H.open(b, { width: 1440, height: 900, lang: l, reducedMotion: 'reduce' });
      for (let st = 5; st <= 11; st++) {
        await pip(p, st); await H.setState(p, { lat: -40, lst: 0, sun: 0 }); await settle(p);
        const bx = ((await H.labelBoxes(p)) || []).filter(x => /^(lbl\.|ra$)/.test(x.key)); const sp = bx.find(x => x.key === 'lbl.spole');
        if (sp) bx.filter(x => x !== sp && overlap(sp, x, 1)).forEach(x => bad.push(`${l}/step ${st}: South pole × ${x.key}`));
      }
      if (l === 'de') await p.screenshot({ path: path.join(OUT, 'F15-step11-40S-de.png') });
      await p.context().close();
    }
    check('F15', 'finding', 'at 40° S the raised south pole label overlaps no other frame label (steps 5–11, 7 languages)', bad.length === 0, bad.slice(0, 6).join(' | '));
  });

  // ---------------------------------------------------------------- 16. RAMC in degrees
  await group('F16', 'finding', 'RAMC in degrees as well as hours (internal P3-15)', async () => {
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' }); await tab(page, 'Chart');
    const bad = [];
    for (const lst of [264.75, 265, 0, 359.75, 123.5]) {
      await H.setState(page, { lst }); const r = await H.read(page);
      if (!r.ramc.includes(dmStr(lst)) || !r.ramc.includes(hmStr(lst))) bad.push(`${lst}: "${r.ramc}" want ${dmStr(lst)} and ${hmStr(lst)}`);
    }
    check('F16', 'finding', 'RAMC reads in degrees (Lesson 5: RAMC = ST × 15; e.g. 17h 40m → 265° 00′) and in hours', bad.length === 0, bad.join(' | '));
    await page.context().close();
  });

  // ---------------------------------------------------------------- 17. idle cost
  await group('F17', 'finding', 'Idle cost (internal P3-19; Astra P3)', async () => {
    let page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    await settle(page); await page.waitForTimeout(1500);
    await page.evaluate(() => { window.__m = 0; new MutationObserver(ms => { window.__m += ms.length; }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true }); window.__r0 = window.__renders; window.__f0 = window.__raf; });
    await page.waitForTimeout(2000);
    const idle = await page.evaluate(() => ({ renders: window.__renders - window.__r0, raf: window.__raf - window.__f0, mutations: window.__m }));
    check('F17', 'finding', 'at rest the page stops rendering and stops asking for frames (2 s idle)', idle.renders <= 1 && idle.raf <= 1, JSON.stringify(idle));
    check('F17', 'finding', 'at rest the page makes no DOM writes (2 s idle)', idle.mutations === 0, JSON.stringify(idle));
    // it still renders on demand
    await H.setState(page, { lat: 30 }); await H.frames(page, 3);
    const after = await page.evaluate(() => window.__renders - window.__r0);
    check('F17', 'guard', 'a change still renders at once', after > idle.renders, `renders ${after}`);
    // the azimuth arc: no new material per frame while the sphere turns
    await page.click('#pips button:nth-child(4)'); await H.frames(page, 3);
    await page.click('#playBtn'); await page.waitForTimeout(400);
    const m0 = await page.evaluate(() => [window.__lineMats, window.__renders]); await page.waitForTimeout(1500);
    const m1 = await page.evaluate(() => [window.__lineMats, window.__renders]);
    check('F17', 'finding', 'step 4 with the sphere turning: the azimuth arc creates no new material per frame', m1[1] - m0[1] > 3 && m1[0] - m0[0] === 0, `frames ${m1[1] - m0[1]}, new line materials ${m1[0] - m0[0]}`);
    await page.context().close();
    // reduced motion: camera moves are instant
    page = await H.open(b, { width: 1440, height: 900, lang: 'en', reducedMotion: 'reduce' });
    await settle(page);
    await page.click('#pips button:nth-child(9)'); await H.frames(page, 2); const q0 = await camPos(page);
    await page.waitForTimeout(1500); await settle(page); const q1 = await camPos(page);
    check('F17', 'finding', 'under reduced motion a step change moves the camera at once (no easing)', Math.hypot(q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]) < 1e-3, `still ${Math.hypot(q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]).toFixed(3)} to go after 2 frames`);
    await page.context().close();
  });

  // =========================================================================== round 2 (re-review of d9b029e)
  function hexOf(c) { const m = String(c).match(/^#([0-9a-f]{6})$/i); if (m) return '#' + m[1]; const r = String(c).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); return r ? '#' + [r[1], r[2], r[3]].map(x => (+x).toString(16).padStart(2, '0')).join('') : null; }
  function lumHex(h) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(parseInt(h.slice(1, 3), 16)) + 0.7152 * f(parseInt(h.slice(3, 5), 16)) + 0.0722 * f(parseInt(h.slice(5, 7), 16)); }
  function ratio(a, b) { const x = lumHex(a), y = lumHex(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  const GLYPHRE = /^[♈-♓]︎?$/;

  await group('R1', 'finding', 'P1-1: the chart notes follow the obliquity', async () => {
    const page = await H.open(b, { width: 1280, height: 800, lang: 'en', reducedMotion: 'reduce' });
    await tab(page, 'Chart');
    // At 6h the MC is 0° Cancer (declination +ε), at 18h 0° Capricorn (−ε), on the upper meridian (hour angle 0),
    // so its altitude is 90° − |φ − δ|; the ecliptic lies in the horizon when ε is the colatitude on that side.
    const bad = []; let n = 0;
    for (const lst of [90, 270]) for (let lat = -66; lat <= 66; lat += 2) {
      await H.setState(page, { lat, lst, obl: 23.5 });
      for (const o of [45, 20, 50, 10, 40, 49.5, 0.5, 48]) {
        await H.setRange(page, 'oblRange', o); await H.frames(page, 2);
        const r = await H.read(page); n++;
        const dec = lst === 90 ? o : -o, alt = 90 - Math.abs(lat - dec);
        const undef = Math.abs(o - (90 - Math.abs(lat))) < 1e-9 && (lst === 270 ? lat > 0 : lat < 0);
        const below = /below the horizon/.test(r.axNote), und = r.asc === '—';
        if (undef !== und) bad.push(`${lat}/${lst}/${o}: ASC ${r.asc}, undefined expected ${undef}`);
        if (!undef && Math.abs(alt) > 0.02 && below !== (alt < 0)) bad.push(`${lat}/${lst}/${o}: MC altitude ${alt.toFixed(2)}°, note says below: ${below}`);
      }
    }
    check('R1', 'finding', `${n} states at 6h and 18h, obliquity changed alone: the "below the horizon" and "undefined" notes are always right`, bad.length === 0, `${bad.length} wrong: ` + bad.slice(0, 4).join(' | '));
    // the reviewer's repro and the same in step 11's own figure
    await H.setState(page, { lat: -64, lst: 90, obl: 50 }); const r1 = await H.read(page);
    await H.setRange(page, 'oblRange', 10); await H.frames(page, 2); const r2 = await H.read(page);
    check('R1', 'finding', 'repro: −64°, 6h, obliquity 50° then 10°: the note shows, then goes (MC altitude +16°)', /below/.test(r1.axNote) && !r2.axNote, `"${r1.axNote.slice(0, 30)}" → "${r2.axNote.slice(0, 30)}"`);
    await tab(page, 'Lesson'); await pip(page, 11);
    await H.setState(page, { lat: -64, lst: 90 }); await H.setRange(page, 'oblRange', 50); await H.frames(page, 2);
    const s1 = await page.evaluate(() => { const e = document.getElementById('stepNote'); return e && !e.hidden ? e.textContent : ''; });
    await H.setRange(page, 'oblRange', 10); await H.frames(page, 2);
    const s2 = await page.evaluate(() => { const e = document.getElementById('stepNote'); return e && !e.hidden ? e.textContent : ''; });
    check('R1', 'finding', "step 11's own figure: the note follows the obliquity too", /below/.test(s1) && !s2, `"${s1.slice(0, 30)}" → "${s2.slice(0, 30)}"`);
    await page.context().close();
  });

  await group('R2', 'finding', 'P2-1: the live description names the current step, spinning or not', async () => {
    const page = await H.open(b, { width: 1280, height: 800, lang: 'en' });
    await page.evaluate(() => {
      window.__said = [];
      document.querySelectorAll('#view [aria-live], #sceneDesc[aria-live]').forEach(el => new MutationObserver(() => window.__said.push(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true }));
    });
    const bad = [];
    for (let s = 2; s <= 11; s++) {
      await page.click('#nextBtn'); await page.waitForTimeout(1500);
      const q = await page.evaluate(() => ({ desc: document.getElementById('sceneDesc').textContent, title: document.getElementById('stepTitle').textContent.trim(), playing: document.getElementById('playBtn').getAttribute('aria-pressed') }));
      if (!q.desc.includes(`Step ${s} of 11`) || !q.desc.includes(q.title)) bad.push(`step ${s} (turning ${q.playing}): "${q.desc.slice(0, 60)}"`);
    }
    check('R2', 'finding', 'after each Next (steps 2–11, four of them turning), the description names the step now shown', bad.length === 0, bad.slice(0, 4).join(' | '));
    // while turning: the text keeps up quietly, and nothing is announced over and over
    await pip(page, 6); await page.waitForTimeout(600);
    const said0 = await page.evaluate(() => window.__said.length);
    const d0 = await page.textContent('#sceneDesc'); await page.waitForTimeout(3000);
    const d1 = await page.textContent('#sceneDesc'); const said1 = await page.evaluate(() => window.__said.length);
    const livePlain = await page.evaluate(() => !!document.querySelector('#view [aria-live]:not(#sceneDesc)'));
    check('R2', 'finding', 'step 6 turning for 3 s: the description follows the sidereal time, and the live region speaks at most once', d0 !== d1 && /Step 6 of 11/.test(d1) && livePlain && said1 - said0 <= 1, `changed ${d0 !== d1}, separate live region ${livePlain}, announcements ${said1 - said0}`);
    // on focus the description is current at once
    await page.focus('#view canvas');
    const f = await page.evaluate(() => ({ desc: document.getElementById('sceneDesc').textContent, lst: document.getElementById('lstOut').textContent }));
    const m = f.desc.match(/sidereal time (\d\d)h (\d\d)m/), l = f.lst.match(/(\d\d)h (\d\d)m/);
    const gap = m && l ? Math.abs(((+m[1] * 60 + +m[2]) - (+l[1] * 60 + +l[2]) + 720 + 1440) % 1440 - 720) : 999;
    check('R2', 'finding', 'focusing the view while it turns brings the description up to date (sidereal time within 10 min of the slider)', gap <= 10, `desc ${m && m[0]}, slider ${f.lst}`);
    // stepping a slider by keyboard: the description keeps up at every press, the live region speaks once at the end
    await page.click('#playBtn'); await H.frames(page, 2); await page.waitForTimeout(1600);
    const s0 = await page.evaluate(() => window.__said.length); let lag = 0;
    await page.focus('#latRange');
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('ArrowRight'); await H.frames(page, 2);
      const q = await page.evaluate(() => [document.getElementById('sceneDesc').textContent, document.getElementById('latOut').textContent]);
      if (!q[0].includes(q[1])) lag++;
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(1600);
    const s1 = await page.evaluate(() => window.__said.length);
    check('R2', 'finding', 'six keyboard steps of the latitude slider 0.7 s apart: the description names each new latitude at once, and the live region speaks once, at the end', lag === 0 && livePlain && s1 - s0 === 1, `stale ${lag} of 6, announcements ${s1 - s0}`);
    await page.context().close();
  });

  await group('R3', 'finding', 'P2-2: phones held sideways show the whole sphere, with the plate', async () => {
    const bad = [];
    for (const [w, h] of [[568, 320], [667, 375], [740, 360], [844, 390], [896, 414]]) {
      const page = await H.open(b, { width: w, height: h, lang: 'en', hasTouch: true, isMobile: true });
      const q = await page.evaluate(() => { const g = s => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }; return { cv: g('#view canvas'), pl: g('#plate'), vw: innerWidth, vh: innerHeight, sy: scrollY }; });
      const inView = x => x.l >= -0.5 && x.t >= -0.5 && x.r <= q.vw + 0.5 && x.b <= q.vh + 0.5;
      if (!inView(q.cv) || !inView(q.pl) || q.cv.h < 0.55 * h) bad.push(`${w}×${h}: canvas [${Math.round(q.cv.t)}–${Math.round(q.cv.b)}], plate [${Math.round(q.pl.t)}–${Math.round(q.pl.b)}]`);
      if (w === 844) await page.screenshot({ path: path.join(OUT, 'R3-844x390.png') });
      await page.context().close();
    }
    check('R3', 'finding', 'at 568×320, 667×375, 740×360, 844×390 and 896×414 the whole view (so the whole sphere, centred in it) and the plate are on screen at load', bad.length === 0, bad.join(' | '));
  });

  await group('R4', 'finding', 'Touch: one finger turns and tilts the sphere, as a mouse does (the owner\'s choice, replacing the corner arrows)', async () => {
    const page = await H.open(b, { width: 390, height: 844, lang: 'en', hasTouch: true, isMobile: true });
    await settle(page);
    const cdp = await page.context().newCDPSession(page);
    const phi = async () => page.evaluate(() => { const c = window.__camera.position; return Math.acos(c.y / Math.hypot(c.x, c.y, c.z)); });
    const c = await rect(page, '#view canvas'); const x = c.left + c.width / 2;
    const p0 = await phi();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: c.top + c.height * 0.7 }] });
    for (let k = 1; k <= 20; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: c.top + c.height * 0.7 - 10 * k }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(400); await settle(page);
    const p1 = await phi(), sy = await page.evaluate(() => scrollY);
    check('R4', 'finding', '390 px touch: a vertical drag on the sphere tilts it (over 5°) and the page stays put', Math.abs(p1 - p0) / D > 5 && sy < 5, `tilt ${((p1 - p0) / D).toFixed(2)}°, scrollY ${sy}`);
    const btns = await page.evaluate(() => [...document.querySelectorAll('#view button')].length);
    check('R4', 'finding', 'no turn-and-tilt buttons remain over the sphere', btns === 0, `${btns} buttons`);
    await page.context().close();
    const DRAG = { en: 'Drag the sphere to turn it', nb: 'Dra i kulen for å dreie den', es: 'Arrastre la esfera para hacerla girar', fr: 'Faites glisser la sphère pour la tourner', de: 'Ziehen Sie die Sphäre, um sie zu drehen', zh: '拖动天球即可转动它', ja: '天球をドラッグすると回せます' };
    const ARROWS = /arrow|corner|sideways|pilene|hjørne|sidelengs|flechas|esquina|de lado|flèches|de côté|Pfeile|Ecke|seitwärts|箭头|角落|矢印|隅/i;
    const pg = await H.open(b, { width: 1280, height: 800, lang: 'en', hasTouch: true, isMobile: true });
    const miss = [];
    for (const l of LANGS) { await lang(pg, l); const t = await stepTexts(pg, 1); if (!t.tryit.includes(DRAG[l]) || ARROWS.test(t.tryit)) miss.push(`${l}: step 1 "${t.tryit.slice(0, 60)}"`); }
    check('R4', 'finding', "step 1's Try this says to drag the sphere, and mentions no arrows, in all 7 languages", miss.length === 0, miss.join(' | '));
    await pg.context().close();
  });

  await group('R5', 'finding', 'P3-2: 3D labels that turn with the sky keep clear (the reviewer\'s scan)', async () => {
    const IMP = /^(lbl\.|ra$)/;
    const counts = {}; let total = 0, states = 0;
    for (const [w, h, langs] of [[1440, 900, LANGS], [390, 844, ['en', 'de', 'ja']]]) for (const l of langs) {
      const page = await H.open(b, { width: w, height: h, lang: l, reducedMotion: 'reduce' });
      for (let st = 1; st <= 11; st++) {
        await pip(page, st);
        for (const lat of [-64, -51.5, -40, -20, 0, 20, 40, 51.5, 64]) for (const lst of [0, 45, 90, 135, 180, 225, 270, 315]) {
          await H.setState(page, { lat, lst }); states++;
          const bx = ((await H.labelBoxes(page)) || []).filter(x => IMP.test(x.key));
          for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) {
            const a = bx[i], c = bx[j];
            const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
            if (ox > 2 && oy > 2) { const k = [a.key, c.key].sort().join(' × '); counts[k] = (counts[k] || 0) + 1; total++; }
          }
        }
        if (w === 1440 && l === 'de' && st === 5) { await H.setState(page, { lat: 51.5, lst: 90 }); await page.screenshot({ path: path.join(OUT, 'R5-step5-london-6h-de.png') }); }
      }
      await page.context().close();
    }
    fs.writeFileSync(path.join(OUT, 'R5-label-overlaps.json'), JSON.stringify(counts, null, 1));
    const top = Object.entries(counts).sort((x, y) => y[1] - x[1]).slice(0, 6).map(([k, v]) => `${v} ${k}`).join('; ');
    check('R5', 'finding', `${states} states (1440 px: 7 languages; 390 px: en, de, ja) × 11 steps × 9 latitudes × 8 sidereal times: no two frame labels overlap by more than 2 px`, total === 0, `${total} overlaps: ${top}`);
  });

  await group('R6', 'finding', 'P3-3: every canvas text at least 4.5:1', async () => {
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    await evalClick(page, '#freeBtn'); await H.setState(page, { lat: -40 }); await H.setState(page, { lat: 40 });
    await tab(page, 'Chart'); await pip(page, 11); await tab(page, 'Lesson'); await H.frames(page, 3);
    const ft = await page.evaluate(() => window.__ft);
    const low = new Set();
    for (const t of ft) {
      const hx = hexOf(t.fill); if (!hx || !t.text.trim()) continue;
      const bg = t.id ? '#0D1220' : '#1A2236';            // the chart's panel; the sky under the 3D labels (at its lightest)
      const need = GLYPHRE.test(t.text) ? 3 : 4.5;       // sign glyphs are symbols drawn large
      const r = ratio(hx, bg);
      if (r < need) low.add(`${t.id || '3D label'} "${t.text}" ${hx} ${r.toFixed(2)}:1`);
    }
    check('R6', 'finding', `every text drawn on a canvas (${ft.length} draws: 3D labels in both hemispheres, the two wheels) reaches 4.5:1 on its background`, low.size === 0, [...low].slice(0, 6).join(' | '));
    await page.context().close();
  });

  await group('R7', 'finding', "P3-4: the wheels' names and numbers are at least 11 px on screen", async () => {
    const bad = [];
    for (const [w, h] of [[1440, 900], [390, 844], [320, 640]]) {
      const page = await H.open(b, { width: w, height: h, lang: 'en', reducedMotion: 'reduce' });
      await pip(page, 10); await page.evaluate(() => { window.__ft.length = 0; });
      await evalClick(page, '#nextBtn'); await H.frames(page, 3);
      let ft = await page.evaluate(() => { const vis = c => c && c.getBoundingClientRect().width > 0; return window.__ft.filter(t => t.id && vis(document.getElementById(t.id))).map(t => ({ ...t, shown: document.getElementById(t.id).getBoundingClientRect().width })); });
      await page.evaluate(() => { window.__ft.length = 0; }); await tab(page, 'Chart'); await H.frames(page, 2);
      ft = ft.concat(await page.evaluate(() => window.__ft.filter(t => t.id === 'wheel').map(t => ({ ...t, shown: document.getElementById('wheel').getBoundingClientRect().width }))));
      const sizes = ft.filter(t => !GLYPHRE.test(t.text)).map(t => ({ id: t.id, text: t.text, px: parseFloat(t.font.match(/(\d+(?:\.\d+)?)px/)[1]) * t.shown / t.cw }));
      const small = sizes.filter(x => x.px < 11);
      if (!sizes.length) bad.push(`${w}: no wheel text drawn`);
      small.slice(0, 3).forEach(x => bad.push(`${w}: ${x.id} "${x.text}" ${x.px.toFixed(1)} px`));
      await page.context().close();
    }
    check('R7', 'finding', 'at 1440, 390 and 320 px, step 11\'s wheel and the Chart tab\'s wheel draw every name and house number at ≥ 11 px', bad.length === 0, bad.join(' | '));
  });

  await group('R8', 'finding', 'P3-5: the obliquity is labelled J2000; its drift is explained', async () => {
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    const bad = [];
    for (const l of LANGS) {
      await lang(page, l); await tab(page, 'Layers');
      const q = await page.evaluate(() => ({ btn: (document.getElementById('oblTrueBtn') || {}).textContent || '', note: document.getElementById('oblNote').textContent, out: document.getElementById('oblOut').textContent }));
      const s9 = (await stepTexts(page, 9)).body;
      if (!/J2000/.test(q.btn) || !/J2000/.test(q.note) || !/J2000/.test(q.out) || !/23° 26′ 21″/.test(q.note)) bad.push(`${l}: button "${q.btn}", readout "${q.out}", note "${q.note.slice(0, 40)}"`);
      if (!s9.includes('47″')) bad.push(`${l}: step 9 has no drift sentence`);
    }
    await lang(page, 'en'); await tab(page, 'Layers'); await H.setRange(page, 'oblRange', 45); await H.frames(page, 2);
    const o45 = await page.textContent('#oblOut');
    check('R8', 'finding', 'in all 7 languages the button, the readout and the Layers note say J2000 (23° 26′ 21″), and step 9 says the obliquity drifts about 47″ a century', bad.length === 0 && !/J2000/.test(o45), bad.join(' | ') + ` | at 45°: "${o45}"`);
    // independent: IAU 2006 rate −46.836769″ per Julian century; Lesson 4 gives 23° 26′ 12″ for July 2020
    const t2020 = (2020.54 - 2000) / 100, eps2020 = 84381.406 - 46.836769 * t2020;
    check('R8', 'guard', `independent check: J2000 mean obliquity 23° 26′ 21″; mean for July 2020 ${Math.floor((eps2020 % 3600) / 60)}′ ${(eps2020 % 60).toFixed(1)}″, about 47″ a century`, dmsStr(OBL) === '23° 26′ 21″' && Math.abs(46.84 - 47) < 0.5, eps2020);
    await page.context().close();
  });

  await group('R9', 'finding', 'P3-6: Spanish step 11: "aproximadamente el doble"', async () => {
    // independent: at 40° N, AT(Aries) = ΔRA − AD, AT(Libra) = ΔRA + AD, with AD = asin(tan φ tan δ(30°))
    const e = OBL * D, dRA = Math.atan2(Math.cos(e) * Math.sin(30 * D), Math.cos(30 * D)) / D, dec30 = Math.asin(Math.sin(e) * Math.sin(30 * D));
    const AD = Math.asin(Math.tan(40 * D) * Math.tan(dec30)) / D, ratio2 = (dRA + AD) / (dRA - AD);
    const es = T('es').s11.body || '';
    check('R9', 'finding', `es step 11 no longer says "casi el doble" (the ratio at 40° N is ${ratio2.toFixed(2)}, just over two)`, !/casi el doble/.test(es) && /aproximadamente el doble/.test(es) && ratio2 > 2 && ratio2 < 2.2, es.slice(-240));
  });

  await group('R10', 'finding', 'P3-7: the zh and ja descriptions keep to their own script', async () => {
    const bad = [];
    for (const l of ['zh', 'ja']) {
      const page = await H.open(b, { width: 1280, height: 800, lang: l });
      for (const lat of [40, -33.5]) {
        await H.setState(page, { lat, lst: 150 }); await page.focus('#view canvas'); await page.waitForTimeout(1300);
        const d = await page.textContent('#sceneDesc');
        const ns = lat > 0 ? (l === 'zh' ? '北纬' : '北緯') : (l === 'zh' ? '南纬' : '南緯');
        const tm = l === 'zh' ? '10时00分' : '10時00分';
        if (!d.includes(ns) || !d.includes(tm) || /°\s*[NS]\b/.test(d) || /\d\dh \d\dm/.test(d)) bad.push(`${l} ${lat}: "${d.slice(0, 50)}"`);
      }
      await page.context().close();
    }
    check('R10', 'finding', 'zh and ja: latitude as 北纬/南纬 (北緯/南緯) and time as 时/分 (時/分), with no Latin N/S or h/m', bad.length === 0, bad.join(' | '));
  });

  await group('R11', 'finding', 'P3-8: the focus ring on the view is fully visible', async () => {
    const page = await H.open(b, { width: 1280, height: 800, lang: 'en' });
    let got = null;
    for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement && document.activeElement.tagName === 'CANVAS')) { got = true; break; } }
    const o = await page.evaluate(() => { const c = document.activeElement, cs = getComputedStyle(c); return { tag: c.tagName, style: cs.outlineStyle, w: parseFloat(cs.outlineWidth), off: parseFloat(cs.outlineOffset) }; });
    check('R11', 'finding', 'tabbing to the view draws a 2 px ring inside its own box (inset), where nothing can clip it', got && o.style !== 'none' && o.w >= 2 && o.off <= -o.w, JSON.stringify(o));
    await page.screenshot({ path: path.join(OUT, 'R11-focus.png') });
    await page.context().close();
  });

  await group('R12', 'finding', 'P3-9: with the MC below the horizon, the note says the IC is the degree on the meridian above the earth', async () => {
    const page = await H.open(b, { width: 1280, height: 800, lang: 'en' }); await tab(page, 'Chart');
    const [e] = expect([{ lat: 51.5, lst: 270, obl: 45 }]);
    // the IC (MC + 180°) is on the meridian at hour angle 180°: altitude φ + δ − 90° with δ its declination
    const icDec = Math.asin(Math.sin(45 * D) * Math.sin((e.mc + 180) * D)) / D, icAlt = 51.5 + icDec - 90;
    const IC = { en: 'shown as the IC', nb: 'vises som IC', es: 'aparece como IC', fr: 'figure comme FC', de: 'als IC angezeigte', zh: '显示为 IC', ja: 'IC として表示' };
    const bad = [];
    for (const l of LANGS) { await lang(page, l); await H.setState(page, { lat: 51.5, lst: 270, obl: 45 }); const r = await H.read(page); if (!r.axNote.includes(IC[l])) bad.push(`${l}: "${r.axNote.slice(-60)}"`); }
    check('R12', 'finding', `London, 45°, 18h (IC ${zodStr(e.mc + 180)} at altitude ${icAlt.toFixed(1)}° by independent calculation): the note says so in all 7 languages`, icAlt > 0 && bad.length === 0, bad.join(' | '));
    await page.context().close();
  });

  // =========================================================================== the review of 939d209
  await group('A1', 'finding', 'P2: a drawing context lost and restored while nothing moves is drawn again at once', async () => {
    for (const rm of ['no-preference', 'reduce']) {
      const page = await H.open(b, { width: 1280, height: 800, lang: 'en', reducedMotion: rm });
      await settle(page); await page.waitForTimeout(800);
      const r0 = await page.evaluate(() => window.__renders); await page.waitForTimeout(800);
      const idle0 = (await page.evaluate(() => window.__renders)) === r0;
      const ok = await page.evaluate(() => new Promise(res => {
        const c = document.querySelector('#view canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'), x = gl && gl.getExtension('WEBGL_lose_context');
        if (!x) return res(false);
        c.addEventListener('webglcontextrestored', () => { window.__atRestore = window.__renders; res(true); }, { once: true });
        x.loseContext(); setTimeout(() => x.restoreContext(), 500); setTimeout(() => res(false), 15000);
      }));
      await page.waitForTimeout(1500); const r1 = await page.evaluate(() => [window.__atRestore, window.__renders, document.querySelector('#view canvas').getContext('webgl2') ? 1 : 0]);
      await page.waitForTimeout(1000); const r2 = await page.evaluate(() => window.__renders);
      check('A1', 'finding', `[${rm}] idle, context lost and restored: a new frame is drawn without any input, then the page is idle again`, idle0 && ok && r1[1] > r1[0] && r2 === r1[1], JSON.stringify({ idle0, restored: ok, atRestore: r1[0], after: r1[1], later: r2 }));
      await page.context().close();
    }
  });

  await group('A2', 'finding', 'P2: at the zenith and the nadir there is no azimuth and no quadrant', async () => {
    const page = await H.open(b, { width: 1280, height: 800, lang: 'en' }); await tab(page, 'Layers'); await probe(page, 'Sun');
    const desc = () => page.evaluate(() => document.getElementById('sceneDesc').textContent);
    // straight overhead or underfoot by independent reasoning: a body on the equator is overhead at the equator when on the
    // meridian (and underfoot 12h later); with the obliquity 23.5° the Sun at 0° Cancer (dec +23.5°) is overhead at 23.5° N at
    // RA 90° = sidereal time 6h, and at 0° Capricorn (dec −23.5°) overhead at 23.5° S at sidereal time 18h
    const poles = [['0°, J2000, Sun 0°, 00h 00m: zenith', { lat: 0, lst: 0, sun: 0 }, 'zenith'],
                   ['0°, J2000, Sun 0°, 12h 00m: nadir', { lat: 0, lst: 180, sun: 0 }, 'nadir'],
                   ['+23.5°, 23.5°, Sun 90°, 06h 00m: zenith', { lat: 23.5, obl: 23.5, lst: 90, sun: 90 }, 'zenith'],
                   ['−23.5°, 23.5°, Sun 270°, 18h 00m: zenith', { lat: -23.5, obl: 23.5, lst: 270, sun: 270 }, 'zenith']];
    for (const [label, st, which] of poles) {
      await H.setState(page, st); const r = await H.read(page), d = await desc();
      const word = which === 'zenith' ? 'At the zenith' : 'At the nadir', alt = which === 'zenith' ? '90.0°' : '−90.0°';
      check('A2', 'finding', `${label}: Az/Alt reads "— / ${alt}", the note says "${word}" and names no quadrant as the body's; so does the description`,
        /^—\s+\/\s+/.test(r.hor) && r.hor.includes(alt) && r.note.startsWith(word) && !/in the \w+ quadrant/.test(r.note) && d.includes(word) && !/azimuth \d/.test(d) && !/in the \w+ quadrant/.test(d),
        `${r.hor} | ${r.note} | ${d}`);
    }
    // (the Sun at 0° of longitude has declination 0 whatever the obliquity, so the cases at the equator do not depend on it)
    // a quarter of a degree of sidereal time either side, the Sun is an ordinary body again: west of the meridian above the
    // horizon is the southern quadrant, east of it the eastern (Lesson 4, Fig. 10), at azimuth 270° and 90°
    for (const [lst, az, q] of [[0.25, '270°', 'southern'], [359.75, '090°', 'eastern']]) {
      await H.setState(page, { lat: 0, lst, sun: 0 }); const r = await H.read(page), d = await desc();
      check('A2', 'finding', `0°, Sun 0°, sidereal time ${lst}°: an ordinary azimuth (${az}) and the ${q} quadrant, in the readout and the description`,
        r.hor.startsWith(az) && r.note.includes(`${q} quadrant`) && d.includes(`${q} quadrant`), `${r.hor} | ${r.note} | ${d}`);
    }
    const W = { en: 'zenith', nb: 'senit', es: 'cenit', fr: 'zénith', de: 'Zenit', zh: '天顶', ja: '天頂' }, bad = [];
    await H.setState(page, { lat: 0, lst: 0, sun: 0 });
    for (const l of LANGS) { await lang(page, l); const r = await H.read(page), d = await desc(); if (!(r.hor.startsWith('—') && r.note.includes(W[l]) && d.includes(W[l]))) bad.push(`${l}: ${r.hor} | ${r.note}`); }
    check('A2', 'finding', 'the zenith is named, with no azimuth, in all 7 languages', bad.length === 0, bad.join(' | '));
    await page.context().close();
  });

  await group('A3', 'finding', 'P3: the wheel\'s axis names never overwrite each other near the polar boundary', async () => {
    const bad = []; let states = 0;
    for (const l of ['en', 'de', 'ja']) {
      const page = await H.open(b, { width: 1280, height: 800, lang: l }); await tab(page, 'Chart');
      // every text drawn on the Chart wheel, with its ink box from the canvas's own metrics
      await page.evaluate(() => { const ft = CanvasRenderingContext2D.prototype.fillText; window.__ink = [];
        CanvasRenderingContext2D.prototype.fillText = function (t, x, y, mw) { if (this.canvas.id === 'wheel') { const m = this.measureText(t);
          window.__ink.push({ t: String(t), l: x - m.actualBoundingBoxLeft, r: x + m.actualBoundingBoxRight, u: y - m.actualBoundingBoxAscent, d: y + m.actualBoundingBoxDescent, w: this.canvas.width }); }
          return ft.call(this, t, x, y, mw); }; });
      const runs = [[40, 50, Array.from({ length: 33 }, (_, i) => 266 + i / 4)], [51.5, 45, Array.from({ length: 180 }, (_, i) => i * 2)], [66, 24.5, Array.from({ length: 180 }, (_, i) => i * 2)]];
      for (const [lat, obl, lsts] of runs) for (const lst of lsts) {
        await page.evaluate(() => { window.__ink = []; }); await H.setState(page, { lat, obl, lst }); states++;
        const ink = await page.evaluate(() => window.__ink);
        const names = ink.slice(-4).filter(e => !/^\d+$/.test(e.t) && !/[♈-♓]/.test(e.t));   // the axis names are drawn last
        for (let i = 0; i < names.length; i++) {
          const a = names[i]; if (a.l < 0 || a.u < 0 || a.r > a.w || a.d > a.w) bad.push(`${l} ${lat}/${obl}/${lst}: ${a.t} off the canvas`);
          for (let j = i + 1; j < names.length; j++) { const c = names[j];
            if (a.l < c.r && c.l < a.r && a.u < c.d && c.u < a.d) bad.push(`${l} ${lat}/${obl}/${lst}: ${a.t} over ${c.t}`); }
        }
      }
      await page.context().close();
    }
    check('A3', 'finding', `${states} Chart-wheel states (en, de, ja; 40° with obliquity 50° at 16h 04m–18h 12m in 1-minute steps; 51.5° with 45° and 66° with 24.5° round the day in 8-minute steps): no axis name's ink touches another's, and all stay on the canvas`, bad.length === 0, `${bad.length} problems: ${bad.slice(0, 6).join('; ')}`);
  });

  await group('A4', 'finding', 'a saved language that is not one of the page\'s, even a name every object inherits, falls back', async () => {
    for (const v of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'xx']) {
      const page = await H.open(b, { width: 1280, height: 800, lang: v, wait: false }); await page.waitForTimeout(4000);
      const r = await page.evaluate(() => ({ lang: document.documentElement.lang, boot: document.getElementById('boot').hidden, title: document.title }));
      const errs = page._logs.filter(x => x.startsWith('pageerror'));
      check('A4', 'finding', `dah.lang = "${v}": the page starts in English with no error`, r.lang === 'en' && r.boot && /Sayyid/.test(r.title) && errs.length === 0, JSON.stringify(r) + ' ' + errs.join(' | '));
      await page.context().close();
    }
  });

  await group('B1', 'finding', 'the walkthrough cue in the stacked layout (the owner\'s request): seen at once, used once', async () => {
    const bad = [];
    for (const [w, h, touch] of [[806, 643, false], [390, 844, true], [844, 390, true], [320, 568, true], [768, 1024, true]]) for (const l of LANGS) {
      const page = await H.open(b, { width: w, height: h, lang: l, hasTouch: touch, isMobile: touch });
      const r = await page.evaluate(() => { const j = document.getElementById('jumpWalk'), v = document.getElementById('view').getBoundingClientRect(), q = j.getBoundingClientRect();
        return { shown: q.width > 0, inScreen: q.bottom <= innerHeight && q.top >= 0 && q.right <= innerWidth, inView: q.left >= v.left && q.right <= v.right && q.bottom <= v.bottom && q.top >= v.top,
          text: j.textContent.replace('↓', '').trim(), tab: document.getElementById('tabLesson').textContent.trim() }; });
      if (!r.shown || !r.inScreen || !r.inView || r.text !== r.tab) bad.push(`${w}x${h} ${l}: ${JSON.stringify(r)}`);
      if (l === 'en' || l === 'ja') {
        await evalClick(page, '#tabChart'); await page.evaluate(() => document.getElementById('jumpWalk').click()); await page.waitForTimeout(900);
        const a = await page.evaluate(() => ({ hidden: document.getElementById('jumpWalk').hidden, sel: document.getElementById('tabLesson').getAttribute('aria-selected'), focus: document.activeElement.id,
          tabTop: document.querySelector('.tabs').getBoundingClientRect().top, lessonShown: !document.getElementById('paneLesson').hidden }));
        if (!(a.hidden && a.sel === 'true' && a.focus === 'tabLesson' && a.lessonShown && a.tabTop >= -1 && a.tabTop < h)) bad.push(`${w}x${h} ${l} after use: ${JSON.stringify(a)}`);
      }
      await page.context().close();
    }
    check('B1', 'finding', 'at 806×643, 390×844, 844×390, 320×568 and 768×1024 in 7 languages: the cue is on the first screen, inside the view, and named as the Walkthrough tab; used (en, ja), it opens the walkthrough with focus on its tab, then goes', bad.length === 0, bad.slice(0, 6).join(' | '));
    // once used it stays gone on the next visit. Served over http, as the site is: Chromium keeps the storage of a page
    // opened from a file:// URL unreliably across reloads, which would test the browser rather than the page.
    const srv = require('http').createServer((q, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(process.env.SPHERE)); });
    await new Promise(r => srv.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${srv.address().port}/`;
    const kept = [];
    for (const [w, h] of [[390, 844], [768, 1024], [806, 643]]) for (let i = 0; i < 3; i++) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage();
      await pg.goto(url, { timeout: 90000 }); await pg.waitForFunction(() => document.getElementById('boot').hidden, null, { timeout: 90000 });
      await pg.evaluate(() => document.getElementById('jumpWalk').click()); await pg.waitForTimeout(500);
      await pg.reload(); await pg.waitForFunction(() => document.getElementById('boot').hidden, null, { timeout: 90000 });
      kept.push(await pg.evaluate(() => document.getElementById('jumpWalk').hidden)); await ctx.close();
    }
    srv.close();
    check('B1', 'finding', 'used once, the cue stays gone after a reload (9 runs at 390×844, 768×1024 and 806×643, served over http)', kept.every(Boolean), JSON.stringify(kept));
    const wide = await H.open(b, { width: 1280, height: 800, lang: 'en' });
    const hid = await wide.evaluate(() => document.getElementById('jumpWalk').getBoundingClientRect().width === 0);
    check('B1', 'guard', '1280×800: no cue, the walkthrough being beside the sphere', hid, 'the cue shows');
    await wide.context().close();
    // a phone held sideways: the sphere fills the height, and the page scrolls from the plate beside it
    const ls = await H.open(b, { width: 844, height: 390, lang: 'en', hasTouch: true, isMobile: true }); await settle(ls);
    const cdp = await ls.context().newCDPSession(ls); const pl = await rect(ls, '#plate'); const x = pl.left + pl.width / 2, y0 = pl.top + pl.height * 0.8;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
    for (let k = 1; k <= 12; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 - 18 * k }] }); await ls.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await ls.waitForTimeout(700);
    const sy = await ls.evaluate(() => scrollY);
    check('B1', 'guard', '844×390 touch: a swipe on the plate beside the sphere scrolls the page', sy > 60, `scrollY ${sy}`);
    await ls.context().close();
  });

  await group('B2', 'finding', 'the zenith and nadir notes read whole at phone and desktop sizes in 7 languages', async () => {
    const bad = [];
    for (const [w, h, touch] of [[320, 568, true], [390, 844, true], [568, 320, true], [844, 390, true], [1440, 900, false]]) for (const l of LANGS) {
      const page = await H.open(b, { width: w, height: h, lang: l, hasTouch: touch, isMobile: touch }); await tab(page, 'Layers'); await probe(page, 'Sun');
      for (const [st, which] of [[{ lat: 0, lst: 0, sun: 0 }, 'zenith'], [{ lat: 0, lst: 180, sun: 0 }, 'nadir']]) {
        await H.setState(page, st);
        const r = await page.evaluate(() => { const n = document.getElementById('plateNote'), pl = document.getElementById('plate'), q = n.getBoundingClientRect(), pb = pl.getBoundingClientRect();
          const rg = document.createRange(); rg.selectNodeContents(n); const lines = [...rg.getClientRects()];
          return { text: n.textContent, inPlate: q.left >= pb.left - 1 && q.right <= pb.right + 1 && q.bottom <= pb.bottom + 1, textInside: lines.every(x => x.right <= pb.right + 1 && x.left >= pb.left - 1),
            sideways: document.documentElement.scrollWidth > innerWidth, clipped: n.scrollHeight > n.clientHeight + 1 || pl.scrollHeight > pl.clientHeight + 1 }; });
        if (!r.inPlate || !r.textInside || r.sideways || r.clipped || r.text.length < 20) bad.push(`${w}x${h} ${l} ${which}: ${JSON.stringify({ ...r, text: r.text.slice(0, 30) })}`);
      }
      if (l === 'de' && w === 568) await page.screenshot({ path: path.join(OUT, 'B2-568x320-de-zenith.png') });
      await page.context().close();
    }
    check('B2', 'finding', 'at 320×568, 390×844, 568×320, 844×390 and 1440×900 in 7 languages, at the zenith and the nadir: the note sits whole inside the plate, nothing is clipped, and nothing scrolls sideways', bad.length === 0, bad.slice(0, 6).join(' | '));
  });

  // =========================================================================== guards
  await group('G1', 'guard', 'Probe coordinates in random states', async () => {
    const page = await H.open(b, { width: 1200, height: 800, lang: 'en' });
    let seed = 777; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const states = [];
    for (let i = 0; i < 800; i++) {
      const pr = rnd() < 0.15 ? 'Sun' : STARNAMES[Math.floor(rnd() * STARNAMES.length)];
      const st = { lat: Math.round((rnd() * 132 - 66) * 2) / 2, lst: Math.round(rnd() * 1440) / 4, obl: OBL, probe: pr };
      if (pr === 'Sun') st.sunlon = Math.floor(rnd() * 360); else { st.ra = CAT[pr].ra; st.dec = CAT[pr].dec; }
      states.push(st);
    }
    const ex = expect(states); const bad = [];
    for (let i = 0; i < states.length; i++) {
      const st = states[i], e = ex[i];
      await H.setState(page, { lat: st.lat, lst: st.lst, probe: st.probe, sun: st.probe === 'Sun' ? st.sunlon : null });
      const r = await H.read(page);
      const m = r.hor.match(/(\d+)°\s*\/\s*([−-]?[\d.,]+)°/), q = r.equ.match(/([\d.,]+)°\s*\/\s*([−-]?[\d.,]+)°/), z = strip(r.ecl).match(/\/\s*([−-]?[\d.,]+)°/);
      const errs = [Math.abs(dd(+m[1], e.az)) <= 0.56 + (Math.abs(e.alt) > 80 ? 5 : 0), Math.abs(num(m[2]) - e.alt) <= 0.07, Math.abs(dd(num(q[1]), e.ra)) <= 0.07, Math.abs(num(q[2]) - e.dec) <= 0.07,
        Math.abs(dd(H.parseZod(r.ecl), e.lon)) * 60 <= 1.2, Math.abs(num(z[1]) - e.blat) <= 0.07];
      if (errs.includes(false)) bad.push(`${JSON.stringify(st)} page ${r.hor} | ${r.equ} | ${strip(r.ecl)} ref az ${e.az.toFixed(2)} alt ${e.alt.toFixed(2)} RA ${e.ra.toFixed(2)} dec ${e.dec.toFixed(2)} lon ${e.lon.toFixed(3)} lat ${e.blat.toFixed(2)}`);
    }
    check('G1', 'guard', `${states.length} random states (24 stars from an independent J2000 table, and the Sun): Az/Alt, RA/Dec, Long/Lat agree with ref.py to display precision`, bad.length === 0, bad.slice(0, 3).join(' | '));
    // the 24 stars themselves
    const badS = [];
    for (const s of STARNAMES) { await probe(page, s); const r = await H.read(page); const q = r.equ.match(/([\d.,]+)°\s*\/\s*([−-]?[\d.,]+)°/); if (Math.abs(dd(num(q[1]), CAT[s].ra)) > 0.06 || Math.abs(num(q[2]) - CAT[s].dec) > 0.06) badS.push(`${s}: ${r.equ} vs ${CAT[s].ra.toFixed(2)} / ${CAT[s].dec.toFixed(2)}`); }
    check('G1', 'guard', 'the 24 bright stars read their J2000 RA and Dec (SIMBAD) to 0.1°', badS.length === 0, badS.join(' | '));
    await page.context().close();
  });

  await group('G2', 'guard', 'ASC, MC, DSC, IC in ordinary states; the lessons\' examples', async () => {
    const page = await H.open(b, { width: 1200, height: 800, lang: 'en' }); await tab(page, 'Chart');
    const ex0 = expect([{ lat: 40, lst: 90, obl: OBL }, { lat: -45, lst: 240, obl: 23 + 26 / 60 }]);
    // at the default (true) obliquity first: Lesson 4 Fig. 29, Lesson 5's 45° S example and table rows
    await H.setState(page, { lat: 40, lst: 90 }); let r = await H.read(page);
    check('G2', 'guard', 'Lesson 4 Fig. 29: 40° N, 6h: ASC 00° ♎ 00′, MC 00° ♋ 00′', strip(r.asc) === zodStr(180) && strip(r.mc) === zodStr(90), `${r.asc} ${r.mc}`);
    await H.setState(page, { lat: -45, lst: 240 }); r = await H.read(page);
    const l5mc = 240 + 2 + 5 / 60, l5asc = 330 + 7 + 15 / 60;
    check('G2', 'guard', "Lesson 5's 45° S, 16h example: MC 2° 05′ ♐, ASC 7° 15′ ♓ (within 1′)", Math.abs(dd(H.parseZod(r.mc), l5mc)) * 60 <= 1 && Math.abs(dd(H.parseZod(r.asc), l5asc)) * 60 <= 1, `${r.mc} ${r.asc}`);
    const TABLE = [[264, 0, 353 + 27 / 60 + 54 / 3600], [264, 20, 352 + 14 / 60 + 49 / 3600], [264, 40, 349 + 45 / 60 + 47 / 3600], [264, 50, 346 + 35 / 60 + 38 / 3600], [265, 40, 351 + 27 / 60 + 33 / 3600], [265, 53, 347 + 17 / 60 + 8 / 3600]];
    const badT = [];
    for (const [lst, lat, asc] of TABLE) { await H.setState(page, { lat, lst }); r = await H.read(page); if (Math.abs(dd(H.parseZod(r.asc), asc)) * 60 > 1) badT.push(`${lst}/${lat}: ${r.asc} vs ${asc.toFixed(3)}`); }
    await H.setState(page, { lst: 264 }); r = await H.read(page); const mcT = 264 + 29 / 60 + 30 / 3600;
    check('G2', 'guard', "Lesson 5's table of houses (ST 17:36 and 17:40; six rows): ASC and MC within 1′", badT.length === 0 && Math.abs(dd(H.parseZod(r.mc), mcT)) * 60 <= 1, badT.join(' | ') + ` MC ${r.mc}`);
    // random ordinary states: default obliquity, then slider obliquities, all below the colatitude
    let seed = 4242; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const states = [];
    for (let i = 0; i < 800; i++) {
      const obl = i < 300 ? OBL : [0, 5, 10, 20, 23, 23.5, 24, 30, 40][Math.floor(rnd() * 9)];
      const lim = Math.min(66, 90 - obl - 2);
      states.push({ lat: Math.round((rnd() * 2 * lim - lim) * 2) / 2, lst: Math.round(rnd() * 1440) / 4, obl });
    }
    const ex = expect(states); const bad = [];
    for (let i = 0; i < states.length; i++) {
      const st = states[i], e = ex[i];
      await H.setState(page, { lat: st.lat, lst: st.lst, obl: st.obl === OBL ? null : st.obl }); r = await H.read(page);
      const errs = [dd(H.parseZod(r.asc), e.asc), dd(H.parseZod(r.desc), e.asc + 180), dd(H.parseZod(r.mc), e.mc), dd(H.parseZod(r.ic), e.mc + 180)].map(x => Math.abs(x) * 60);
      if (errs.some(x => !(x <= 0.55))) bad.push(`${JSON.stringify(st)} ${r.asc} ${r.mc} ref ${zodStr(e.asc)} ${zodStr(e.mc)}`);
    }
    check('G2', 'guard', `${states.length} ordinary states (obliquity below the colatitude): ASC, DSC, MC, IC within 0.5′ of ref.py`, bad.length === 0, bad.slice(0, 3).join(' | '));
    // derived values
    const badD = [];
    for (const [lat, lst] of [[40, 0], [-45, 240], [51.5, 123.25], [64, 359.75]]) {
      await H.setState(page, { lat, lst }); r = await H.read(page);
      if (r.pole !== `${Math.floor(Math.abs(lat))}° ${pad2(Math.round((Math.abs(lat) % 1) * 60))}′`) badD.push(`pole ${r.pole} at ${lat}`);
      const eq = 90 - Math.abs(lat); if (r.eq !== `${Math.floor(eq)}° ${pad2(Math.round((eq % 1) * 60))}′`) badD.push(`equator ${r.eq} at ${lat}`);
      const oaNum = (r.oaod.match(/\d+(?:° \d+′)?/g) || []);
      const toDeg = s => { const m = s.match(/(\d+)(?:° (\d+)′)?/); return +m[1] + (m[2] ? +m[2] / 60 : 0); };
      if (oaNum.length < 2 || Math.abs(dd(toDeg(oaNum[0]), lst + 90)) > 0.51 || Math.abs(dd(toDeg(oaNum[1]), lst - 90)) > 0.51) badD.push(`OA·OD ${r.oaod} at ${lst}`);
    }
    check('G2', 'guard', 'pole altitude = latitude, equator altitude = 90° − latitude, OA/OD = RAMC ± 90°', badD.length === 0, badD.join(' | '));
    await page.context().close();
  });

  await group('G3', 'guard', 'Presets, the sidereal day, westward motion, compass, lesson terms', async () => {
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    const REAL = { 0: 0, 40: 39.9, 51.5: 51.5, 64: 64.1 };    // Equator; Menorca (Mahón 39.9° N); London 51.5° N; Reykjavík 64.1° N
    const badP = [];
    for (const btn of await page.$$('[data-lat]')) { await btn.click(); await H.frames(page, 2); const t = await page.textContent('#latOut'); const v = num(t); const k = await btn.getAttribute('data-lat'); if (!(Math.abs(v - REAL[k]) <= 0.2) || !/N$/.test(t)) badP.push(`${k}: ${t}`); }
    check('G3', 'guard', 'the four presets give the Equator, Menorca, London and Reykjavík within 0.2°', badP.length === 0 && (await page.$$('[data-lat]')).length === 4, badP.join(' | '));
    const s6 = await stepTexts(page, 6), s2 = await stepTexts(page, 2), s4 = await stepTexts(page, 4);
    check('G3', 'guard', 'Lesson 4 terms kept: sidereal day 23h 56m 04s, clockwise primary motion, "horizonal frame", azimuth counted clockwise from north',
      s6.body.includes('23h 56m 04s') && /turns, clockwise/.test(s6.body) && /horizonal frame/.test(s2.body) && /Count clockwise round the horizon from due north/.test(s4.body), '');
    // westward motion and the compass: a star east of the meridian rises, one west of it sets; south culmination at az 180, Polaris north
    await probe(page, 'Aldebaran'); await H.setState(page, { lat: 40, lst: 40 }); const a1 = await H.read(page); await H.setState(page, { lst: 41 }); const a2 = await H.read(page);
    await H.setState(page, { lst: 100 }); const b1 = await H.read(page); await H.setState(page, { lst: 101 }); const b2 = await H.read(page);
    await H.setState(page, { lst: 69 }); const c1 = await H.read(page);
    const alt = r => num(r.hor.split('/')[1]), az = r => +r.hor.match(/\d+/)[0];
    await probe(page, 'Polaris'); await H.setState(page, { lst: 38 }); const p1 = await H.read(page);
    check('G3', 'guard', 'westward motion: Aldebaran rises east of the meridian and sets west of it as sidereal time grows; it culminates due south (180°); Polaris sits due north',
      az(a1) < 180 && alt(a2) > alt(a1) && az(b1) > 180 && alt(b2) < alt(b1) && Math.abs(az(c1) - 180) <= 1 && (az(p1) <= 1 || az(p1) >= 359), `${a1.hor} → ${a2.hor}; ${b1.hor} → ${b2.hor}; ${c1.hor}; Polaris ${p1.hor}`);
    const comp = await page.evaluate(() => { const o = {}; window.__scene.traverse(s => { if (s.isSprite && s.userData.i18n && /^lbl\.[NESW]$/.test(s.userData.i18n.key)) { const v = new window.THREE.Vector3(); s.getWorldPosition(v); o[s.userData.i18n.key.slice(4)] = (Math.atan2(v.x, -v.z) * 180 / Math.PI + 360) % 360; } }); return o; });
    check('G3', 'guard', 'the N, E, S, W labels stand at azimuth 0°, 90°, 180°, 270° of the frame the plate reads', Math.abs(dd(comp.N, 0)) < 1 && Math.abs(dd(comp.E, 90)) < 1 && Math.abs(dd(comp.S, 180)) < 1 && Math.abs(dd(comp.W, 270)) < 1, JSON.stringify(comp));
    await page.context().close();
  });

  await group('G4', 'guard', 'The hotfix stays fixed (quadrants, 3D quadrant labels, steps 7 and 11)', async () => {
    const page = await H.open(b, { width: 1440, height: 900, lang: 'en' });
    await probe(page, 'Deneb'); await H.setState(page, { lat: 30, lst: 277.5 }); let r = await H.read(page);
    check('G4', 'guard', 'Lesson 4 Figs. 11–12: 30° N, 18h 30m, Deneb is in the eastern quadrant', /eastern/.test(r.note), r.note);
    let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const states = []; for (let i = 0; i < 160; i++) { const s = STARNAMES[Math.floor(rnd() * 24)]; states.push({ lat: Math.round((rnd() * 132 - 66) * 2) / 2, lst: Math.round(rnd() * 1440) / 4, obl: OBL, ra: CAT[s].ra, dec: CAT[s].dec, s }); }
    const ex = expect(states); const bad = []; let n = 0;
    for (let i = 0; i < states.length; i++) {
      const st = states[i], e = ex[i]; if (Math.abs(e.alt) < 0.3 || Math.abs(dd(e.az, 0)) < 0.5 || Math.abs(dd(e.az, 180)) < 0.5) continue;
      await probe(page, st.s); await H.setState(page, { lat: st.lat, lst: st.lst }); r = await H.read(page); n++;
      const want = e.alt > 0 ? (e.az < 180 ? /eastern/ : /southern/) : /Below the earth/;
      if (!want.test(r.note)) bad.push(`${st.s} ${st.lat}/${st.lst} ref az ${e.az.toFixed(1)} alt ${e.alt.toFixed(1)}: "${r.note}"`);
    }
    check('G4', 'guard', `${n} random states: the plate names the quadrant by the horizon and the meridian (ref.py)`, bad.length === 0, bad.slice(0, 3).join(' | '));
    const q = await page.evaluate(() => { const o = []; window.__scene.traverse(s => { if (s.isSprite && s.userData.i18n && /^lbl\.q[eswn]$/.test(s.userData.i18n.key)) { const v = new window.THREE.Vector3(); s.getWorldPosition(v); const az = (Math.atan2(v.x, -v.z) * 180 / Math.PI + 360) % 360, up = v.y > 0; o.push([s.userData.i18n.key.slice(5), up ? (az < 180 ? 'e' : 's') : (az < 180 ? 'n' : 'w')]); } }); return o; });
    check('G4', 'guard', '3D: each quadrant label sits inside its own quadrant (Lesson 4 Fig. 10)', q.length === 4 && q.every(([k, w]) => k === w), JSON.stringify(q));
    const s7 = await stepTexts(page, 7), s11 = await stepTexts(page, 11);
    check('G4', 'guard', 'step 7 gives the east and west points as the reason; step 11 speaks of opposite signs away from the equator', /east and west points/.test(s7.body) && !/right angles/.test(s7.body) && /Away from the equator/.test(s11.body) && !/will never rise in equal time/.test(s11.body), '');
    await page.context().close();
  });

  await group('G5', 'guard', 'No network, no errors, seven languages', async () => {
    const page = await H.open(b, { width: 1440, height: 900 });
    const opts = await page.$$eval('#langSel option', os => os.map(o => o.value));
    const titles = new Set();
    for (const l of LANGS) { await lang(page, l); for (const i of [1, 6, 11]) await pip(page, i); await tab(page, 'Chart'); await tab(page, 'Layers'); await tab(page, 'Lesson'); titles.add(await page.title()); }
    await page.click('#playBtn'); await page.waitForTimeout(800); await page.click('#playBtn');
    const errs = page._logs.filter(l => /error/i.test(l) && !/GPU stall|swiftshader|WebGL|GroupMarkerNotSet/i.test(l));
    const net = page._reqs.filter(u => !u.startsWith('file://') && !u.startsWith('data:') && !u.startsWith('blob:'));
    check('G5', 'guard', 'seven languages, each with its own title', opts.join(',') === LANGS.join(',') && titles.size === 7, `${opts} / ${[...titles]}`);
    check('G5', 'guard', 'no network requests and no console errors', errs.length === 0 && net.length === 0, errs.concat(net).slice(0, 5).join(' | '));
    await page.context().close();
  });

  // =========================================================================== layout matrix
  await group('L', 'finding', 'Layout at 320, 375, 390, 768, 1024, 1440 px in 7 languages', async () => {
    const issues = [];
    for (const w of [320, 375, 390, 768, 1024, 1440]) for (const l of LANGS) {
      const h = w < 800 ? 800 : 900;
      const page = await H.open(b, { width: w, height: h, lang: l, reducedMotion: 'reduce' });
      for (const [t, stp] of [['Lesson', 11], ['Lesson', 9], ['Layers', 0], ['Chart', 0]]) {
        if (stp) await pip(page, stp);
        await page.click('#tab' + t); await H.frames(page, 2);
        const r = await page.evaluate(() => {
          const iss = []; const de = document.documentElement;
          if (de.scrollWidth > de.clientWidth + 1) iss.push('sideways scroll ' + de.scrollWidth + '>' + de.clientWidth);
          const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || e.closest('[hidden]')) return false; const rc = e.getBoundingClientRect(); return rc.width > 0 && rc.height > 0; };
          document.querySelectorAll('button, label, output, h1, h2, h3, .masthead p, .stepnum, select, .row b, .row span, .axials b, .axials span').forEach(e => {
            if (!vis(e) || e.closest('.visually-hidden')) return;
            if (e.scrollWidth > e.clientWidth + 1 && e.tagName !== 'SELECT') iss.push('text overflows its box: ' + e.tagName + '#' + e.id + ' "' + e.textContent.trim().slice(0, 30) + '"');
            const rc = e.getBoundingClientRect(); if (rc.right > de.clientWidth + 1 || rc.left < -1) iss.push('off screen: ' + e.tagName + '#' + e.id + ' "' + e.textContent.trim().slice(0, 30) + '"');
          });
          const box = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
          const hit = (a, b2) => a && b2 && !(a.right <= b2.left || b2.right <= a.left || a.bottom <= b2.top || b2.bottom <= a.top);
          const h1 = document.querySelector('.masthead h1'), rg = document.createRange(); rg.selectNodeContents(h1);
          if ([...rg.getClientRects()].some(q => hit(q, box('#langSel')))) iss.push('title under the language menu');
          document.querySelectorAll('.axials div').forEach(d => { if (!vis(d)) return; const bs = d.querySelector('b').getBoundingClientRect(), ss = d.querySelector('span').getBoundingClientRect(); if (bs.right > ss.left + 1 && Math.abs(bs.top - ss.top) < 4) iss.push('axials label meets value: ' + d.textContent.trim()); });
          document.querySelectorAll('.axials span, .row span, .row b, output').forEach(e => { if (!vis(e)) return; const rg2 = document.createRange(); rg2.selectNodeContents(e); const tops = new Set([...rg2.getClientRects()].map(q => Math.round(q.top))); if (tops.size > 1) iss.push('value wraps: ' + (e.id || e.tagName) + ' "' + e.textContent.trim() + '"'); });
          return iss;
        });
        r.forEach(x => issues.push(`${w}/${l}/${t}${stp ? stp : ''}: ${x}`));
      }
      if (w <= 390) {
        const cv = await rect(page, '#view canvas'), pl = await rect(page, '#plate');
        if (inter(cv, pl) > 0.01 * cv.width * cv.height) issues.push(`${w}/${l}: plate over the sphere`);
      }
      if ((['en', 'de', 'ja'].includes(l)) || (w === 320 && ['nb', 'es', 'fr'].includes(l))) { await page.click('#tabLesson'); await pip(page, 1); await page.screenshot({ path: path.join(OUT, `L-${w}-${l}.png`), fullPage: w < 800 }); }
      await page.context().close();
    }
    const uniq = [...new Set(issues)];
    fs.writeFileSync(path.join(OUT, 'layout-issues.txt'), uniq.join('\n'));
    check('L', 'finding', '42 width × language combinations, 4 views each: no sideways scroll, nothing off screen, no text out of its box, title clear of the language menu, plate clear of the sphere', uniq.length === 0, `${uniq.length} issues: ` + uniq.slice(0, 6).join(' | '));
  });

  // ---------------------------------------------------------------------------------------------
  await b.close();
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1));
  const byKind = k => results.filter(r => r.kind === k);
  const f = byKind('finding'), g = byKind('guard');
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}\t${r.group}\t${r.kind}\t${r.name}${r.ok ? '' : '\n\t\t-> ' + r.detail}`);
  console.log(`\n[${TAG}] findings ${f.filter(r => r.ok).length}/${f.length} pass; guards ${g.filter(r => r.ok).length}/${g.length} pass; ${((Date.now() - T0) / 60000).toFixed(1)} min`);
  const missing = ONLY ? ONLY.filter(id => !ran.has(id)) : [];
  if (missing.length) { console.error(`ONLY names groups that did not run: ${missing.join(', ')}`); process.exitCode = 2; }
  else process.exitCode = results.length > 0 && results.every(r => r.ok) ? 0 : 1;   // a failed check or a group that threw fails the run
})().catch(e => { console.error(e); process.exit(1); });
