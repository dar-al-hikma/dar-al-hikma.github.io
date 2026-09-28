// Between the Lines — independent regression tests.
// Usage: NODE_PATH=$(npm root -g) node btl.test.js [page.html] [results.json]   (default: the repo's between-the-lines/index.html)
// Reads only these, beside it: pdf_p34.json (the lesson's p. 34) and ref-measure-original.json (the diagram's text sizes
// in the original page, 20b48d2, measured once, for the round-2 size checks).
// Exit status: 0 only when every check passed; 1 when a check failed or a group threw; 2 when the suite cannot run
// or cannot finish: the page not found, a file beside it missing, Playwright or its browser not
// available, ONLY empty or naming a group that does not exist, or the runner itself failing.
// Expected values come from the lesson PDF (pp. 30–40, fixture pdf_p34.json), from exact
// integer-second arithmetic written here, and from a vector (atan2) calculation written here.
// Nothing expected is read from the page.
const path = require('path'), fs = require('fs');
// Setup: everything the suite needs is checked here, before any check is made; what is missing exits 2.
const cannotRun = msg => { console.error(`The suite cannot run: ${msg}`); process.exit(2); };
const firstLine = e => String(e && e.message || e).split('\n')[0];
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { cannotRun(`Playwright is not available (${firstLine(e)}).`); }
const PAGE_FILE = process.argv[2] || path.join(__dirname, '..', '..', 'between-the-lines', 'index.html');
if (!fs.existsSync(PAGE_FILE) || !fs.statSync(PAGE_FILE).isFile()) cannotRun(`the page ${PAGE_FILE} does not exist.`);
const PAGE = 'file://' + path.resolve(PAGE_FILE);
const OUT = process.argv[3] || null;
let P34; try { P34 = JSON.parse(fs.readFileSync(path.join(__dirname, 'pdf_p34.json'), 'utf8')); } catch (e) { cannotRun(`pdf_p34.json beside the suite cannot be read (${firstLine(e)}).`); }
let REF_SIZES; try { REF_SIZES = JSON.parse(fs.readFileSync(path.join(__dirname, 'ref-measure-original.json'), 'utf8')); } catch (e) { cannotRun(`ref-measure-original.json beside the suite cannot be read (${firstLine(e)}).`); }
let LANGS = ['en', 'nb', 'es', 'fr', 'de', 'zh', 'ja'];   // replaced at start by the page's own language menu

// ---------------------------------------------------------------- independent arithmetic
const D = Math.PI / 180, CIRC = 1296000;
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
// ecliptic longitude of an equatorial direction
const eclLon = (v, e) => { const y = v[1]*Math.cos(e) + v[2]*Math.sin(e); return ((Math.atan2(y, v[0]) / D) % 360 + 360) % 360; };
// ASC: eastern intersection of horizon and ecliptic. MC: upper-meridian intersection.
function ascV(ramc, lat, obl){ const r = ramc*D, f = lat*D, e = obl*D;
  const z = [Math.cos(f)*Math.cos(r), Math.cos(f)*Math.sin(r), Math.sin(f)], k = [0, -Math.sin(e), Math.cos(e)], east = [-Math.sin(r), Math.cos(r), 0];
  let d = cross(k, z); if (dot(d, east) < 0) d = d.map(x => -x); return eclLon(d, e); }
function mcV(ramc, obl){ const r = ramc*D, e = obl*D; const k = [0, -Math.sin(e), Math.cos(e)], east = [-Math.sin(r), Math.cos(r), 0];
  let d = cross(k, east); if (dot(d, [Math.cos(r), Math.sin(r), 0]) < 0) d = d.map(x => -x); return eclLon(d, e); }
const sec = deg => Math.round((((deg % 360) + 360) % 360) * 3600) % CIRC;
const sd = (b, a) => ((b - a + CIRC/2) % CIRC + CIRC) % CIRC - CIRC/2;
const nrm = t => ((t % CIRC) + CIRC) % CIRC;
const k7 = (num, den) => Math.round(num * 1e7 / den);                   // a ratio to seven places, ×10⁷
const mulR = (diff, k) => Math.floor((2 * diff * k + 1e7) / 2e7);        // diff × ratio, nearest second, halves up
const TOBL = 23 + 26/60, OBL = 23 + 26/60 + 54/3600;
const LATS = [0, 5, 10, 15, 20].concat(Array.from({ length: 40 }, (_, i) => 21 + i));
// Table-of-houses interpolation as the lesson's worksheet does it (ratio as printed, seconds rounded).
function worksheet(lstSec, latSec, hemi, oblDeg){
  const south = hemi < 0, lstU = south ? (lstSec + 43200) % 86400 : lstSec;
  const e = Math.floor(lstU / 240) * 240, dSt = lstU - e, kSt = k7(dSt, 240);
  const cell = (st, la) => sec(ascV(st / 240, la, TOBL));
  const mcE = sec(mcV(e / 240, TOBL)), mcL = sec(mcV((e + 240) / 240, TOBL));
  const mcT = nrm(mcE + mulR(sd(mcL, mcE), kSt));
  let lo = LATS[LATS.length - 2], hi = 60; for (let i = 0; i < LATS.length - 1; i++) if (latSec >= LATS[i]*3600 && latSec < LATS[i+1]*3600){ lo = LATS[i]; hi = LATS[i+1]; }
  const ascLo = nrm(cell(e, lo) + mulR(sd(cell(e + 240, lo), cell(e, lo)), kSt));
  const ascHi = nrm(cell(e, hi) + mulR(sd(cell(e + 240, hi), cell(e, hi)), kSt));
  const kLat = k7(latSec - lo*3600, (hi - lo)*3600), dl = sd(ascHi, ascLo);
  const ascT = nrm(ascLo + Math.sign(dl) * mulR(Math.abs(dl), kLat));
  const mc = south ? nrm(mcT + 648000) : mcT, asc = south ? nrm(ascT + 648000) : ascT;
  const lat = hemi * latSec / 3600, ramc = lstSec / 240;
  return { mc, asc, mcD: sec(mcV(ramc, oblDeg)), ascD: sec(ascV(ramc, lat, oblDeg)), mcDT: sec(mcV(ramc, TOBL)), ascDT: sec(ascV(ramc, lat, TOBL)), lo, hi, kSt, kLat };
}
// ---------------------------------------------------------------- reading the page's text
const S = s => String(s).replace(/\s+/g, ' ').trim();
function dms(str){ const m = String(str).replace(/\s/g, '').match(/([−-])?(\d+)°(\d+)′(\d+)″/); if (!m) return NaN; return (m[1] ? -1 : 1) * ((+m[2]*60 + +m[3])*60 + +m[4]); }
function hms(str){ const m = String(str).match(/(\d\d):(\d\d):(\d\d)/); return m ? (+m[1]*60 + +m[2])*60 + +m[3] : NaN; }
function ratioK(str){ const m = String(str).match(/(\d*)[.,](\d+)|^\s*(\d+)\s*$/); if (!m) return NaN; if (m[3] !== undefined) return +m[3] * 1e7; return Math.round(Number((m[1] || '0') + '.' + m[2]) * 1e7); }
function gapTxt(t){ t = Math.round(t); const a = Math.abs(t), d = Math.floor(a/3600), m = Math.floor(a%3600/60), x = a%60, p = n => (n < 10 ? '0' : '') + n;
  return (t > 0 ? '+' : t < 0 ? '−' : '') + (d ? `${d}° ${p(m)}′ ${p(x)}″` : m ? `${m}′ ${p(x)}″` : `${x}″`); }
const fmt = t => { t = nrm(t); const d = Math.floor(t/3600), m = Math.floor(t%3600/60), x = t%60, p = n => (n < 10 ? '0' : '') + n; return `${d}° ${p(m)}′ ${p(x)}″`; };

// ---------------------------------------------------------------- harness
const results = []; const consoleErrors = [];
let browser;
function check(group, name, pass, detail){ results.push({ group, name, pass: !!pass, detail: pass ? '' : String(detail).slice(0, 400) }); }
async function fresh({ lang = 'en', width = 1440, height = 900, reduced = false, storage = null } = {}){
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'en-US', reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); page.setDefaultTimeout(4000);
  page.on('pageerror', e => consoleErrors.push(`${lang}@${width}: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(`${lang}@${width}: ${m.text()}`); });
  if (storage) await ctx.addInitScript(s => { for (const k in s) localStorage.setItem(k, s[k]); }, storage);
  await page.goto(PAGE); await page.waitForTimeout(150);
  if (lang && !storage) { await page.selectOption('#langSel', lang); await page.waitForTimeout(30); }
  page._ctx = ctx; return page;
}
const close = async p => { try { await p._ctx.close(); } catch (e) {} };
const tab = (p, id) => p.click('#' + id);
const walkTo = (p, i) => p.click(`#pips button:nth-child(${i + 1})`);
const mode = (p, m) => p.click(`.rail [data-mode="${m}"]`);
async function preset(p, name){ await tab(p, 'tabWs'); await p.click(`[data-preset="${name}"]`); }
// Type several fields, then commit once with Enter, as a reader who edits a row of fields and presses Enter.
async function setFields(p, obj){ await tab(p, 'tabWs'); const ids = Object.keys(obj);
  await p.evaluate(o => { for (const id in o) document.getElementById(id).value = String(o[id]); }, obj);
  await p.focus('#' + ids[ids.length - 1]); await p.press('#' + ids[ids.length - 1], 'Enter'); await p.waitForTimeout(20); }
async function all(p){ const b = await p.$('#allBtn'); if (b && !(await b.isDisabled())) await b.click(); }
async function ws(p){ return p.$$eval('#ws tr', trs => trs.filter(tr => !tr.classList.contains('hd') && tr.cells.length === 3 && !tr.closest('thead')).map(tr => {
  const v = tr.cells[2].innerText.split('\n'); return { n: tr.cells[0].innerText.trim(), label: tr.cells[1].innerText.replace(/\s+/g, ' ').trim(), value: v[0].trim(), sub: (v[1] || '').trim() }; })); }
const row = (rows, n) => rows.find(r => r.n === String(n));
const txt = (p, sel) => p.$eval(sel, e => e.textContent).catch(() => '');
const attr = (p, sel, a) => p.$eval(sel, (e, a) => e.getAttribute(a), a).catch(() => null);
async function walkText(p, i){ await walkTo(p, i); return { body: S(await txt(p, '#stepBody')), tryit: S(await txt(p, '#stepTry')) }; }

// ================================================================ G0: the harness's own arithmetic against the PDF
function g0(){
  const G = 'G0 harness vs PDF';
  let bad = [];
  for (const [lat, a, b] of P34.asc){ if (sec(ascV(264, lat, TOBL)) !== dms(a) || sec(ascV(265, lat, TOBL)) !== dms(b)) bad.push(lat); }
  check(G, 'vector ASC reproduces all 90 cells of p. 34', bad.length === 0, bad);
  check(G, 'vector MC reproduces both MCs of p. 34', sec(mcV(264, TOBL)) === dms(P34.mc1736) && sec(mcV(265, TOBL)) === dms(P34.mc1740), '');
  const w = worksheet(63587, 161928, 1, OBL);
  check(G, 'worksheet arithmetic gives the lesson values (pp. 35–37)', fmt(w.mc) === '265° 21′ 39″' && fmt(w.asc) === '350° 19′ 17″' && fmt(w.mcD) === '265° 21′ 41″' && fmt(w.ascD) === '350° 18′ 54″', JSON.stringify(w));
}

// ================================================================ G1: every value the lesson prints (guards)
async function g1(){
  const G = 'G1 lesson values';
  let p = await fresh();
  // p. 34, every latitude, through the page's own worksheet rows 26/27 (lower row) and 32/33 (upper row)
  await mode(p, 'asc'); await preset(p, 'lesson'); await all(p);
  const bad = [];
  for (const L of [0, 5, 10, 15].concat(Array.from({ length: 40 }, (_, i) => 20 + i))){
    await setFields(p, { latD: L, latM: 30, latS: 0 }); const r = await ws(p);
    const pdf = x => P34.asc.find(q => q[0] === x);
    const lo = pdf(L), hiLat = L < 20 ? L + 5 : L + 1, hi = pdf(hiLat);
    const ok = dms(row(r, 26).value) === dms(lo[2]) && dms(row(r, 27).value) === dms(lo[1]) && dms(row(r, 32).value) === dms(hi[2]) && dms(row(r, 33).value) === dms(hi[1]);
    if (!ok) bad.push(L);
  }
  check(G, 'p. 34: all 90 ASC cells appear exactly in rows 26/27/32/33', bad.length === 0, bad);
  await close(p);
  // MC, p. 33 and 35
  p = await fresh(); await mode(p, 'mc'); await preset(p, 'lesson'); await all(p);
  let r = await ws(p);
  const mcDirect = r.find(x => /^Native's MC/.test(x.label) && /direct/.test(x.label));
  const exp = { 13: '17:39:47', 17: '17:36:00', 18: '00:03:47', 20: '265° 24′ 38″', 21: '264° 29′ 30″', 22: '0° 55′ 08″', 23: '0° 52′ 09″', 24: '265° 21′ 39″', 14: '264° 56′ 45″', 15: '23° 26′ 54″' };
  const badMc = Object.keys(exp).filter(n => { const v = row(r, n); return !v || (/:/.test(exp[n]) ? hms(v.value) !== hms(exp[n]) : dms(v.value) !== dms(exp[n])); });
  check(G, 'MC rows 13–24 and 14–15 match pp. 33 and 35', badMc.length === 0, badMc);
  check(G, 'row 19 ST ratio is .9458333', ratioK(row(r, 19).value) === 9458333, row(r, 19) && row(r, 19).value);
  check(G, 'MC direct 265° 21′ 41″ (p. 33)', mcDirect && dms(mcDirect.value) === dms('265°21′41″'), mcDirect && mcDirect.value);
  check(G, 'readout MC 25° 21′ 39″ Sagittarius', /25° 21′ 39″ ♐/.test(await txt(p, '#plate')), await txt(p, '#plate'));
  await close(p);
  // ASC, pp. 36–37
  p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson'); await all(p);
  r = await ws(p);
  const ea = { 26: '350°39′41″', 27: '348°48′41″', 28: '1°51′00″', 29: '1°44′59″', 30: '350°33′40″', 32: '350°25′09″', 33: '348°31′22″', 34: '1°53′47″', 35: '1°47′37″', 36: '350°18′59″', 5: '44°58′48″', 37: '0°58′48″', 39: '0°14′41″', 40: '0°14′23″', 41: '350°19′17″' };
  const badA = Object.keys(ea).filter(n => { const v = row(r, n); return !v || dms(v.value) !== dms(ea[n]); });
  check(G, 'ASC rows 26–41 match pp. 36–37', badA.length === 0, badA);
  check(G, 'row 38 latitude ratio .98', ratioK(row(r, 38).value) === 9800000, row(r, 38) && row(r, 38).value);
  const ascDirect = r.find(x => /^Native's ASC/.test(x.label));
  check(G, 'ASC direct 350° 18′ 54″ (p. 37)', ascDirect && dms(ascDirect.value) === dms('350°18′54″'), ascDirect && ascDirect.value);
  check(G, 'readout ASC 20° 19′ 17″ Pisces', /20° 19′ 17″ ♓/.test(await txt(p, '#plate')), await txt(p, '#plate'));
  await close(p);
  // Sun and Saturn, pp. 39–40
  p = await fresh(); await mode(p, 'planet'); await preset(p, 'sun'); await all(p);
  r = await ws(p);
  const es = { 43: '300°22′55″', 44: '299°21′50″', 45: '1°01′05″', 46: '0°40′31″', 47: '300°02′21″' };
  check(G, 'Sun rows 43–47 (p. 39)', Object.keys(es).every(n => row(r, n) && dms(row(r, n).value) === dms(es[n])) && ratioK(row(r, 42).value) === 6631944 && hms(row(r, 8).value) === hms('15:55:00'), JSON.stringify(r.map(x => x.n + '=' + x.value)));
  await preset(p, 'saturn'); await all(p); r = await ws(p);
  const et = { 43: '169°00′40″', 44: '169°02′56″', 45: '0°02′16″', 46: '0°01′30″', 47: '169°01′26″' };
  check(G, 'Saturn ℞ rows 43–47 (p. 40)', Object.keys(et).every(n => row(r, n) && dms(row(r, n).value) === dms(et[n])), JSON.stringify(r.map(x => x.n + '=' + x.value)));
  await close(p);
  // southern example, p. 38
  p = await fresh(); await mode(p, 'mc'); await preset(p, 'south'); await all(p);
  const plMc = await txt(p, '#plate');
  await mode(p, 'asc'); await all(p); const plAsc = await txt(p, '#plate');
  check(G, 'southern MC 2° 05′ 18″ Sagittarius, ASC 7° 14′ 55″ Pisces (p. 38)', /2° 05′ 18″ ♐/.test(plMc) && /7° 14′ 55″ ♓/.test(plAsc), plMc + ' | ' + plAsc);
  await close(p);
}

// ================================================================ G2: the review's findings and the builder's
async function f1(){ // P1: retrograde across 0° Aries
  const G = 'F1 retrograde across 0° Aries';
  let p = await fresh();
  for (const l of LANGS){ await p.selectOption('#langSel', l); const w = await walkText(p, 10);
    check(G, `step 11 teaches the crossing (${l}): −358° example present`, /−358°/.test(w.body), w.body.slice(0, 160)); }
  await p.selectOption('#langSel', 'en'); const w = await walkText(p, 10);
  check(G, 'step 11 no longer says "whenever the next day\'s longitude is less"', !/less than the birthday/.test(w.body), w.body);
  await close(p);
  // 29° Pisces → 1° Aries at noon: forward 2°, noon at 0° Aries
  p = await fresh(); await mode(p, 'planet');
  await setFields(p, { utH: 12, utM: 0, p0D: 29, p0M: 0, p0S: 0, p1D: 1, p1M: 0, p1S: 0 });
  await p.selectOption('#p0G', '11'); await p.selectOption('#p1G', '0'); await p.press('#p1S', 'Enter'); await all(p);
  let r = await ws(p); let note = S(await txt(p, '#wsnote'));
  check(G, '359° → 1°: row 45 shows the 360° step', row(r, 45) && /360°/.test(row(r, 45).label) && dms(row(r, 45).value) === 7200, row(r, 45) && JSON.stringify(row(r, 45)));
  check(G, '359° → 1°: row 47 = 0° 00′ 00″ with "− 360°" written', row(r, 47) && dms(row(r, 47).value) === 0 && /−\s?360°/.test(row(r, 47).label), row(r, 47) && JSON.stringify(row(r, 47)));
  check(G, '359° → 1°: called direct', /direct/i.test(row(r, 45).sub + ' ' + note) && !/retrograde/i.test(note), note);
  // 1° Aries → 29° Pisces: backward 2°
  await setFields(p, { p0D: 1, p1D: 29 }); await p.selectOption('#p0G', '0'); await p.selectOption('#p1G', '11'); await p.press('#p1S', 'Enter'); await all(p);
  r = await ws(p); note = S(await txt(p, '#wsnote'));
  check(G, '1° → 359°: retrograde, 360° step in row 45, noon at 0° Aries', /retrograde/i.test(note) && /360°/.test(row(r, 45).label) && dms(row(r, 47).value) === 0, JSON.stringify(row(r, 45)) + note);
  check(G, '1° → 359°: no claim that the later position is smaller', !/later position is smaller/.test(note + (await txt(p, '#say'))), note);
  // equal positions: stationary
  await setFields(p, { p0D: 10, p1D: 10 }); await p.selectOption('#p0G', '3'); await p.selectOption('#p1G', '3'); await p.press('#p1S', 'Enter'); await all(p);
  note = S(await txt(p, '#wsnote'));
  check(G, 'zero motion: no net motion, not "direct"', /no net motion/i.test(note) && !/^Direct/.test(note), note);
  // 359°30′ → 0°30′ at 18:00: 359°30′ + 45′ = 0°15′, row 47 must say − 360°
  await setFields(p, { utH: 18, utM: 0, p0D: 29, p0M: 30, p1D: 0, p1M: 30 }); await p.selectOption('#p0G', '11'); await p.selectOption('#p1G', '0'); await p.press('#p1S', 'Enter'); await all(p);
  r = await ws(p);
  check(G, 'row 47 reproducible across 0° Aries: 359° 30′ + 0° 45′ − 360° = 0° 15′', row(r, 47) && dms(row(r, 47).value) === 900 && /−\s?360°/.test(row(r, 47).label) && dms(row(r, 46).value) === 2700, JSON.stringify([row(r, 46), row(r, 47)]));
  await close(p);
}
async function f2(){ // P2: the gap's cause
  const G = 'F2 gap explained by computation';
  let p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson'); await all(p);
  const w = worksheet(63587, 161928, 1, OBL);
  let note = S(await txt(p, '#wsnote'));
  const tot = gapTxt(sd(w.asc, w.ascD)), ob = gapTxt(sd(w.ascDT, w.ascD)), it = gapTxt(sd(w.asc, w.ascDT));
  check(G, `lesson ASC: gap ${tot} = obliquity ${ob} + interpolation ${it}, said as all from the obliquity`, ob === tot && it === '0″' && note.includes(tot) && /All of it comes from the obliquity/.test(note) && /Within 1′ is fine/.test(note), note);
  check(G, 'lesson ASC: direct value at the table obliquity is shown (= interpolated 350° 19′ 17″)', (await ws(p)).some(x => /table's obliquity/.test(x.label) && dms(x.value) === w.ascDT && w.ascDT === dms('350°19′17″')), '');
  // 17:24:01, 59° 30′ N, obliquity 23° 26′: pure interpolation, more than 1′
  await setFields(p, { lstH: 17, lstM: 24, lstS: 1, latD: 59, latM: 30, latS: 0, oblD: 23, oblM: 26, oblS: 0 }); await all(p);
  const w2 = worksheet(17*3600 + 24*60 + 1, 59.5*3600, 1, TOBL);
  note = S(await txt(p, '#wsnote'));
  check(G, `17:24:01 59°30′N: gap ${gapTxt(sd(w2.asc, w2.ascD))} is not called "within 1′"`, Math.abs(sd(w2.asc, w2.ascD)) > 60 && !/Within 1′ is fine/.test(note) && /more than 1′/.test(note), note);
  check(G, '17:24:01 59°30′N: gap written in ° ′ ″ (builder: raw seconds)', note.includes(gapTxt(sd(w2.asc, w2.ascD))) && !/\b3\d\d″/.test(note), note);
  await close(p);
  // Step 8's own exercise: obliquity 23° 26′, then ▲ to 59°–60°
  p = await fresh(); await walkTo(p, 7);
  const w8 = await walkText(p, 7);
  check(G, 'step 8 tells the student to match the obliquity (23° 26′) and gives −7″', /23° 26′/.test(w8.tryit) && /−7″/.test(w8.tryit) && !/curvature bites/.test(w8.tryit), w8.tryit);
  check(G, 'step 8 no longer says 8′ tables are "wildly wrong"', !/wildly/.test(w8.body), w8.body);
  await setFields(p, { oblD: 23, oblM: 26, oblS: 0 }); note = S(await txt(p, '#wsnote'));
  check(G, 'matched obliquity at the lesson latitude: gap 0″, the two agree', /: 0″\./.test(note) && /agree to the second/.test(note), note);
  for (let i = 0; i < 15; i++) await p.click('#rowNext');
  const w3 = worksheet(63587, (59*60 + 58)*60 + 48, 1, TOBL); note = S(await txt(p, '#wsnote'));
  check(G, `matched obliquity at 59°58′48″: gap ${gapTxt(sd(w3.asc, w3.ascD))} (interpolation alone)`, note.includes(gapTxt(sd(w3.asc, w3.ascD))) && gapTxt(sd(w3.asc, w3.ascD)) === '−7″', note);
  await setFields(p, { oblD: 23, oblM: 26, oblS: 54 });
  const w4 = worksheet(63587, (59*60 + 58)*60 + 48, 1, OBL); note = S(await txt(p, '#wsnote'));
  check(G, `lesson obliquity at 59°58′48″: +2′ 34″, mostly the obliquity`, note.includes(gapTxt(sd(w4.asc, w4.ascD))) && gapTxt(sd(w4.asc, w4.ascD)) === '+2′ 34″' && /mostly from the obliquity/.test(note) && /opposite directions/.test(note), note);
  // Notes: no claim that the page shows fractions of ST; no "always"; all languages carry the computed numbers
  for (const l of LANGS){ await p.selectOption('#langSel', l); const why1 = S(await p.$eval('[data-i18n-html="why1"]', e => e.textContent)); const why2 = S(await p.$eval('[data-i18n-html="why2"]', e => e.textContent));
    check(G, `Notes (${l}): interpolation error quantified (15″, 17′) and ST fractions presented as not shown here`, /15″/.test(why1) && /17′/.test(why1) && /(0[.,]1″)/.test(why1) && /23° 26′/.test(why2), why1.slice(0, 120) + ' | ' + why2.slice(0, 120)); }
  await p.selectOption('#langSel', 'en');
  const why1 = S(await p.$eval('[data-i18n-html="why1"]', e => e.textContent)), why2 = S(await p.$eval('[data-i18n-html="why2"]', e => e.textContent));
  check(G, 'Notes (en): no "always a little off", no "wildly", no "the last row shows ... so you can see the gap"', !/always a little off/.test(why1) && !/wildly/.test(why1) && /cannot show/.test(why2), why1 + ' | ' + why2);
  await close(p);
  // MC: the 2″ is the obliquity
  p = await fresh(); await mode(p, 'mc'); await preset(p, 'lesson'); await all(p);
  note = S(await txt(p, '#wsnote'));
  { const wm = worksheet(63587, 161928, 1, OBL); check(G, 'lesson MC: −2″, all of it from the obliquity (vector check: interpolation part 0″)', gapTxt(sd(wm.mc, wm.mcD)) === '−2″' && sd(wm.mc, wm.mcDT) === 0 && note.includes('−2″') && /All of it comes from the obliquity/.test(note), note); }
  await close(p);
}
async function f3(){ // fractional inputs
  const G = 'F3 fractional inputs';
  const p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson'); await all(p);
  await setFields(p, { lstS: '47.4' });
  await mode(p, 'asc'); for (let i = 0; i < 4; i++) await p.click('#stepBtn');   // the strip on row 19, the ST ratio
  const say19 = S(await txt(p, '#say'));
  check(G, 'the ST-ratio narration shows no floating-point junk (227 ÷ 240)', /227 ÷ 240/.test(say19) && !/\d\.\d{9,}/.test(say19), say19);
  await all(p);
  const field = await p.$eval('#lstS', e => e.value); let r = await ws(p);
  const d1 = r.find(x => /^Native's ASC/.test(x.label));
  check(G, 'LST seconds 47.4 is rounded to 47, written back, and used (direct ASC 350° 18′ 54″)', field === '47' && d1 && dms(d1.value) === dms('350°18′54″'), `field=${field} direct=${d1 && d1.value}`);
  check(G, 'a note says the value was rounded', /47[.,]4/.test(await txt(p, '#inote')), await txt(p, '#inote'));
  await p.press('#lstS', 'Enter'); r = await ws(p); const d2 = r.find(x => /^Native's ASC/.test(x.label));
  check(G, 'committing the same visible fields again changes nothing', d2 && d1 && d2.value === d1.value, `${d1 && d1.value} → ${d2 && d2.value}`);
  await setFields(p, { latM: '58.6' }); r = await ws(p);
  const f = await p.$$eval(['#latD', '#latM', '#latS'].join(','), es => es.map(e => e.value).join(' '));
  check(G, 'latitude minutes 58.6 → 59: fields and row 5 both 44° 59′ 48″', f === '44 59 48' && row(r, 5) && dms(row(r, 5).value) === dms('44°59′48″'), `fields ${f}, row5 ${row(r, 5) && row(r, 5).value}`);
  await close(p);
}
async function f4(){ // unsupported input
  const G = 'F4 unsupported input';
  let p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson');
  await setFields(p, { latD: 61 });
  check(G, 'latitude 61° → 60°, written back, with the note "The table stops at 60°."', (await p.$eval('#latD', e => e.value)) === '60' && /The table stops at 60°/.test(await txt(p, '#inote')), await txt(p, '#inote'));
  await preset(p, 'lesson'); await all(p);
  await p.fill('#oblD', ''); await p.press('#oblD', 'Enter'); await all(p);
  let r = await ws(p); const d = r.find(x => /^Native's ASC/.test(x.label));
  check(G, 'blank obliquity degrees: previous value restored, direct ASC unchanged, note shown', (await p.$eval('#oblD', e => e.value)) === '23' && d && dms(d.value) === dms('350°18′54″') && /blank/.test(await txt(p, '#inote')), `${await p.$eval('#oblD', e => e.value)} ${d && d.value} ${await txt(p, '#inote')}`);
  await setFields(p, { oblD: 30 }); await all(p); r = await ws(p);
  check(G, 'obliquity 30° refused: set to the nearer limit, 25° 00′ 00″, with a note', (await p.$$eval(['#oblD', '#oblM', '#oblS'].join(','), es => es.map(e => e.value).join(' '))) === '25 0 0' && /22°.*25°/.test(await txt(p, '#inote')), await txt(p, '#inote'));
  await close(p);
  p = await fresh(); await mode(p, 'planet'); await preset(p, 'sun');
  await setFields(p, { utH: 24 }); await all(p); r = await ws(p);
  const uf = await p.$$eval('#utH,#utM', es => es.map(e => e.value).join(':'));
  check(G, 'UT 24:00 → 23:59, shown and used (row 8 23:59:00), with a note', uf === '23:59' && row(r, 8) && hms(row(r, 8).value) === hms('23:59:00') && /23:59/.test(await txt(p, '#inote')), `${uf} row8=${row(r, 8) && row(r, 8).value} note=${await txt(p, '#inote')}`);
  await close(p);
}
async function f5(){ // reproducible increments
  const G = 'F5 increments reproducible from the display';
  const p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson');
  await setFields(p, { lstH: 17, lstM: 36, lstS: 50 }); await all(p);
  let r = await ws(p);
  check(G, 'LST 17:36:50: row 29 = 1° 51′ 00″ × 0.2083333 = 0° 23′ 07″', row(r, 29) && dms(row(r, 29).value) === mulR(6660, ratioK(row(r, 19).value)) && dms(row(r, 29).value) === 1387, row(r, 29) && row(r, 29).value);
  // a sweep: every increment row equals difference × displayed ratio, rounded
  let bad = [], seed = 7; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let i = 0; i < 24; i++){
    const lst = rnd(86400), lat = rnd(60*3600);
    await setFields(p, { lstH: Math.floor(lst/3600), lstM: Math.floor(lst%3600/60), lstS: lst%60, latD: Math.floor(lat/3600), latM: Math.floor(lat%3600/60), latS: lat%60 }); await all(p);
    r = await ws(p); const k = ratioK(row(r, 19).value), kl = ratioK(row(r, 38).value);
    const pairs = [[28, 29, k], [34, 35, k], [39, 40, kl]];
    for (const [a, b, kk] of pairs) if (mulR(Math.abs(dms(row(r, a).value)), kk) !== Math.abs(dms(row(r, b).value))) bad.push(`${lst}/${lat}: row ${b}`);
  }
  await mode(p, 'mc');
  for (const lst of [50, 110, 170, 12345, 50000, 86390]){ await setFields(p, { lstH: Math.floor(lst/3600), lstM: Math.floor(lst%3600/60), lstS: lst%60 }); await all(p); r = await ws(p);
    if (mulR(dms(row(r, 22).value), ratioK(row(r, 19).value)) !== dms(row(r, 23).value)) bad.push(`mc ${lst}`); }
  check(G, 'every increment (rows 23, 29, 35, 40) = difference × ratio as shown, over 30 cases', bad.length === 0, bad.join(', '));
  await close(p);
}
async function f6(){ // step 6
  const G = 'F6 step 6 upper edge';
  const p = await fresh(); await walkTo(p, 5);
  const w = await walkText(p, 5);
  check(G, 'step 6 tells the student to press All before the slider', /<em>All<\/em>|\bAll\b/.test(w.tryit) && /45° 00′ 00″/.test(w.tryit), w.tryit);
  await all(p);
  await p.$eval('#latRange', e => { e.value = e.max; e.dispatchEvent(new Event('input', { bubbles: true })); });
  const lat = S(await txt(p, '#latOut')); const r = await ws(p);
  check(G, 'slider top = 45° 00′ 00″ N inside the 44°–45° box', /^45° 00′ 00″/.test(lat) && /44°/.test(row(r, 25) ? row(r, 25).value : ''), lat);
  check(G, 'row 41 = the upper-edge value 350° 18′ 59″, and it is revealed', row(r, 41) && dms(row(r, 41).value) === dms('350°18′59″') && dms(row(r, 36).value) === dms('350°18′59″'), row(r, 41) && row(r, 41).value);
  await close(p);
}
async function f7(){ // step 7
  const G = 'F7 step 7 instruction';
  let p = await fresh();
  for (const l of LANGS){ await p.selectOption('#langSel', l); const w = await walkText(p, 6);
    check(G, `step 7 (${l}) no longer promises two presses to 20°–21°`, !/20°–21°/.test(w.tryit), w.tryit); }
  await p.selectOption('#langSel', 'en'); const w = await walkText(p, 6);
  check(G, 'step 7 (en) says "six times", and six presses reach row 41', /six times/.test(w.tryit), w.tryit);
  for (let i = 0; i < 6; i++) await p.click('#stepBtn');
  check(G, 'six presses from step 7 land on row 41', /row 41/.test(S(await txt(p, '#say'))), S(await txt(p, '#say')));
  await p.click('#rowPrev'); let r = await ws(p);
  check(G, '▼ moves one table row (to 43°–44°)', /43°/.test(row(r, 25).value) && /44°/.test(row(r, 31) ? row(r, 31).value : '44°'), row(r, 25) && row(r, 25).value);
  await setFields(p, { latD: 20, latM: 30, latS: 0 }); await p.click('#rowPrev'); r = await ws(p);
  check(G, 'below 20° a press moves 5° and row 38 divides by 5°', /15°/.test(row(r, 25).value) && /5°/.test(row(r, 38).label), row(r, 38) && row(r, 38).label);
  await close(p);
}
async function f8(){ // completion
  const G = 'F8 completion by Next step';
  let p = await fresh(); await walkTo(p, 10);
  await p.click('#stepBtn'); await p.click('#stepBtn');
  check(G, 'Saturn after two presses: readout shows 19° 01′ 26″ Virgo', /19° 01′ 26″ ♍/.test(await txt(p, '#plate')), await txt(p, '#plate'));
  check(G, 'Next step and All both disabled at the end', await p.$eval('#stepBtn', e => e.disabled) && await p.$eval('#allBtn', e => e.disabled), '');
  await close(p);
  p = await fresh(); await walkTo(p, 4); let n = 0;
  while (!(await p.$eval('#stepBtn', e => e.disabled)) && n < 60){ await p.click('#stepBtn'); n++; }
  check(G, 'ASC stepped to the end: readout shows 20° 19′ 17″ Pisces', /20° 19′ 17″ ♓/.test(await txt(p, '#plate')), await txt(p, '#plate'));
  await close(p);
}
async function f9(){ // hemisphere
  const G = 'F9 hemisphere kept through 0°';
  const p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson');
  await setFields(p, { latD: 0, latM: 30, latS: 0 }); await p.selectOption('#latNS', '-1');
  await p.$eval('#latRange', e => { e.value = 0; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.$eval('#latRange', e => { e.value = 0.5; e.dispatchEvent(new Event('input', { bubbles: true })); });
  const lat = S(await txt(p, '#latOut'));
  check(G, '0° 30′ S → slider 0 → slider 0.5 gives 2° 30′ 00″ S', /^2° 30′ 00″ S/.test(lat), lat);
  await close(p);
}
async function f10(){ // keyboard
  const G = 'F10 keyboard';
  let p = await fresh();
  const say0 = S(await txt(p, '#say'));
  await p.focus('#tabWs'); await p.keyboard.press('Space');
  check(G, 'Space on the focused Worksheet tab selects it and does not step', (await attr(p, '#tabWs', 'aria-selected')) === 'true' && S(await txt(p, '#say')) === say0, S(await txt(p, '#say')));
  await close(p);
  p = await fresh(); await p.focus('#nextBtn'); await p.keyboard.press('Space');
  check(G, 'Space on the focused walkthrough Next turns the page, not the worksheet', /Step 2 of 11/.test(await txt(p, '#stepCount')) && /STEP 4 OF|Step 4 of/i.test(S(await txt(p, '#say'))), (await txt(p, '#stepCount')) + ' | ' + S(await txt(p, '#say')));
  await close(p);
  p = await fresh(); await p.focus('#allBtn'); await p.keyboard.press('Space');
  check(G, 'Space on the focused All button runs All', await p.$eval('#allBtn', e => e.disabled), '');
  await close(p);
  p = await fresh(); await p.focus('#tabWalk'); await p.keyboard.press('ArrowRight');
  check(G, 'ArrowRight on a tab moves to the next tab, not the next walkthrough page', (await attr(p, '#tabWs', 'aria-selected')) === 'true' && /Step 1 of 11/.test(await txt(p, '#stepCount')), await txt(p, '#stepCount'));
  await close(p);
  p = await fresh(); await p.$eval('#stepTitle', e => { e.tabIndex = -1; e.focus(); }); await p.keyboard.press('Space');
  check(G, 'Space with no control focused is still Next step (guard)', /Step 1 of/i.test(S(await txt(p, '#say'))), S(await txt(p, '#say')));
  await close(p);
}
async function f11(){ // start over
  const G = 'F11 Start over';
  let p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson'); await tab(p, 'tabWs');
  await p.click('#colNext'); await p.click('#resetBtn');
  check(G, 'from the Worksheet tab, Start over restores LST 17:39:47 and clears the rows', /17:39:47/.test(await txt(p, '#lstOut')) && /Press|Working/i.test(S(await txt(p, '#say'))), await txt(p, '#lstOut'));
  await preset(p, 'south'); await p.click('#colNext'); await tab(p, 'tabNotes'); await p.click('#resetBtn');
  check(G, 'the last-loaded preset (southern example) is the one restored', /16:00:00/.test(await txt(p, '#lstOut')) && /45° 00′ 00″ S/.test(await txt(p, '#latOut')), await txt(p, '#lstOut'));
  await close(p);
}
async function f12(){ // row numbering
  const G = 'F12 row numbering';
  const p = await fresh();
  const cases = [['asc', 'lesson'], ['mc', 'lesson'], ['asc', 'south'], ['mc', 'south'], ['planet', 'saturn']];
  for (const [m, pr] of cases){ await mode(p, m); await preset(p, pr); await all(p); const ns = (await ws(p)).map(x => x.n).filter(n => n && n !== '—');
    const dup = ns.filter((n, i) => ns.indexOf(n) !== i);
    check(G, `${m}/${pr}: no row number twice`, dup.length === 0, `dups ${dup} in ${ns}`);
    if (pr === 'south') check(G, `${m}/${pr}: southern steps labelled S1…, not worksheet numbers`, ns.includes('S1') && ns.includes('S2') && !ns.includes('1') && !ns.includes('2'), ns.join(',')); }
  await mode(p, 'asc'); await preset(p, 'lesson'); await all(p); const ns = (await ws(p)).map(x => x.n);
  check(G, 'ASC worksheet has row 25 before 26 and row 31 (45°) before 32', ns.indexOf('25') >= 0 && ns.indexOf('25') < ns.indexOf('26') && ns.indexOf('31') >= 0 && ns.indexOf('31') < ns.indexOf('32') && /45°/.test(row(await ws(p), 31).value), ns.join(','));
  check(G, 'footer states the consolidation', /appear once/.test(await txt(p, '[data-i18n-html="wsFoot"]')), await txt(p, '[data-i18n-html="wsFoot"]'));
  await close(p);
}
async function f13(){ // accessibility structure
  const G = 'F13 accessibility';
  let p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson'); await all(p);
  check(G, 'worksheet: column headers th[scope=col] and row headers th[scope=row]', (await p.$$('#ws th[scope=col]')).length === 3 && (await p.$$('#ws th[scope=row]')).length > 10, '');
  const names = await p.$$eval('#paneWs input[type=number], #paneWs select', es => es.map(e => e.getAttribute('aria-label') || ''));
  check(G, 'inputs named with quantity and unit (e.g. "LST, seconds")', (await attr(p, '#lstS', 'aria-label')) === 'LST, seconds' && (await attr(p, '#oblM', 'aria-label')) === 'Obliquity, minutes' && names.every(n => /,/.test(n)), names.join(' | '));
  check(G, 'inputs grouped in fieldsets with legends', (await p.$$('#paneWs fieldset > legend')).length >= 6 && await p.$eval('#lstH', e => !!e.closest('fieldset')), '');
  check(G, 'SVG is role=img with <title> and <desc>', (await attr(p, '#fig', 'role')) === 'img' && !!(await p.$('#fig > title')) && !!(await p.$('#fig > desc')), '');
  const desc = S(await txt(p, '#fig > desc'));
  check(G, 'desc names the four cells and both ratios', ['348° 48′ 41″', '350° 39′ 41″', '348° 31′ 22″', '350° 25′ 09″'].every(v => desc.includes(v)) && /0\.9458333/.test(desc) && /0\.98/.test(desc), desc);
  check(G, 'steppers have word names', /column/i.test((await attr(p, '#colPrev', 'aria-label')) || '') && /row/i.test((await attr(p, '#rowNext', 'aria-label')) || ''), '');
  await close(p);
  p = await fresh(); // step 1: nothing revealed
  const hidden = await p.$$eval('#fig g.hid', gs => gs.every(g => g.getAttribute('aria-hidden') === 'true') && gs.length >= 3);
  const d1 = S(await txt(p, '#fig > desc'));
  check(G, 'step 1: unrevealed groups are aria-hidden and the result is not in the description', hidden && !/20° 19′ 17″/.test(d1), d1);
  let snap = null; try { snap = await p.locator('#fig').ariaSnapshot(); } catch (e) { snap = null; }
  check(G, 'step 1: accessibility tree does not expose the answer', snap !== null && !/20° 19′ 17″/.test(snap), String(snap).slice(0, 200));
  await all(p); check(G, 'after All the description gives the result', /20° 19′ 17″/.test(S(await txt(p, '#fig > desc'))), '');
  await close(p);
}
async function f14(){ // reduced motion
  const G = 'F14 reduced motion';
  // probe the stylesheet with a flashing rectangle, with and without the preference
  const probe = pg => pg.evaluate(() => { const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('class', 'flash go'); document.getElementById('fig').appendChild(r); const a = getComputedStyle(r).animationName; r.remove(); return a; });
  let p = await fresh({ reduced: true }); const an = await probe(p); await close(p);
  p = await fresh({ reduced: false }); const an0 = await probe(p); await close(p);
  check(G, 'flash animation is off under prefers-reduced-motion', an === 'none', an);
  check(G, 'flash animation still runs without the preference (guard)', an0 === 'flash', an0);
}
async function b1(){ // builder's display findings
  const G = 'B builder findings';
  const p = await fresh(); await mode(p, 'mc'); await preset(p, 'lesson');
  await setFields(p, { lstH: 23, lstM: 59, lstS: 30 }); await all(p);
  const figText = await p.$eval('#fig', e => e.textContent);
  check(G, 'a column at 24:00:00 is shown as 00:00:00', !/24:00:00/.test(figText) && /00:00:00/.test(figText), '');
  await setFields(p, { lstH: 20, lstM: 0, lstS: 0 }); await all(p); const r = await ws(p);
  { const i = r.findIndex(x => x.n === '16'), nx = r[i + 1];
    check(G, 'LST 20:00:00: the + 360° step is written once, in the row after 16 ("16 + 360°"), and row 16 is the arctangent alone', i >= 0 && !/\+/.test(r[i].value) && nx && /16\s*\+\s*360°\s*$/.test(nx.label), `${i >= 0 && r[i].value} | ${nx && nx.label}`); }
  const mcD = r.find(x => /^Native's MC/.test(x.label) && /direct/.test(x.label));
  check(G, 'LST 20:00:00: direct MC matches the vector calculation', mcD && dms(mcD.value) === sec(mcV(300, OBL)), mcD && mcD.value);
  await close(p);
}

// ================================================================ G3: layout matrix
async function layout(){
  const G15 = 'F15 diagram labels', G16 = 'F16 layout';
  const states = [['asc', 6, null], ['south', 8, null], ['mc', 3, null], ['saturn', 10, null]];
  for (const [width, height] of [[320, 900], [375, 900], [390, 900], [990, 700], [1024, 768], [1279, 650], [1440, 900]]) for (const lang of LANGS){
    const p = await fresh({ lang, width, height });
    for (const [name, step] of states){
      await walkTo(p, step); await all(p); await p.waitForTimeout(20);
      const res = await p.evaluate(() => {
        const fig = document.getElementById('fig'), vb = fig.viewBox.baseVal, m = fig.getScreenCTM(), el = fig.getBoundingClientRect();
        const c0 = new DOMPoint(vb.x, vb.y).matrixTransform(m), c1 = new DOMPoint(vb.x + vb.width, vb.y + vb.height).matrixTransform(m);
        const svg = { left: Math.max(el.left, c0.x), top: Math.max(el.top, c0.y), right: Math.min(el.right, c1.x), bottom: Math.min(el.bottom, c1.y) };
        const ts = Array.from(document.querySelectorAll('#fig text')).map(t => ({ s: t.textContent, r: t.getBoundingClientRect() })).filter(t => t.r.width > 0);
        const over = [], out = [];
        for (let i = 0; i < ts.length; i++){ const a = ts[i].r;
          if (a.left < svg.left - 0.5 || a.right > svg.right + 0.5 || a.top < svg.top - 0.5 || a.bottom > svg.bottom + 0.5) out.push(ts[i].s);
          for (let j = i + 1; j < ts.length; j++){ const b = ts[j].r; const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ox > 0.5 && oy > 0.5) over.push(ts[i].s + ' × ' + ts[j].s); } }
        return { over, out, n: ts.length };
      });
      check(G15, `${lang}@${width}×${height} ${name}: no two labels overlap`, res.over.length === 0, res.over.join(' ; '));
      check(G15, `${lang}@${width}×${height} ${name}: every label inside the drawing`, res.out.length === 0, res.out.join(' ; '));
    }
    // navigation row and Notes formula
    await walkTo(p, 6);
    const nav = await p.evaluate(() => { const vw = document.documentElement.clientWidth; const bs = Array.from(document.querySelectorAll('#paneWalk .stepnav .btn')); const pane = document.querySelector('#paneWalk .stepnav').getBoundingClientRect();
      return { vw, sw: document.documentElement.scrollWidth, maxRight: Math.max(...bs.map(b => b.getBoundingClientRect().right)), paneRight: pane.right }; });
    check(G16, `${lang}@${width}×${height}: walkthrough navigation fits (right ${Math.round(nav.maxRight)} ≤ ${Math.round(nav.paneRight)})`, nav.maxRight <= nav.paneRight + 0.5 && nav.sw <= nav.vw, JSON.stringify(nav));
    await tab(p, 'tabNotes');
    const nt = await p.evaluate(() => { const pane = document.getElementById('paneNotes'); const ms = Array.from(pane.querySelectorAll('.mono')).map(m => { const r = m.getBoundingClientRect(), q = m.parentElement.getBoundingClientRect(); return r.right - q.right; });
      return { sw: pane.scrollWidth, cw: pane.clientWidth, worst: Math.max(...ms) }; });
    check(G16, `${lang}@${width}×${height}: Notes formulas wrap inside their paragraph, no sideways scroll`, nt.sw <= nt.cw + 1 && nt.worst <= 0.5, JSON.stringify(nt));
    const doc = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    check(G16, `${lang}@${width}×${height}: no horizontal page scroll`, doc, '');
    await close(p);
  }
}

// ================================================================ G3b: random states through the UI, labels measured
async function randomStates(){
  const G = 'F15 diagram labels, random states';
  for (const [width, height] of [[320, 900], [375, 900], [390, 900], [1024, 768], [1180, 700], [1440, 900]]) for (const lang of LANGS){
    const p = await fresh({ lang, width, height }); await p.evaluate(() => document.fonts.ready);
    let seed = width * 7 + lang.charCodeAt(0) * 13 + lang.charCodeAt(1); const rnd = k => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % k; };
    const bad = [];
    for (let i = 0; i < 8; i++){
      const m = ['asc', 'mc', 'planet'][rnd(3)], lst = rnd(86400), lat = rnd(60*3600), ut = rnd(1440);
      await mode(p, m);
      if (m === 'planet') { await setFields(p, { utH: Math.floor(ut/60), utM: ut%60, p0D: rnd(30), p0M: rnd(60), p1D: rnd(30), p1M: rnd(60) }); await p.selectOption('#p0G', String(rnd(12))); await p.selectOption('#p1G', String(rnd(12))); }
      else { await setFields(p, { lstH: Math.floor(lst/3600), lstM: Math.floor(lst%3600/60), lstS: lst%60, latD: Math.floor(lat/3600), latM: Math.floor(lat%3600/60), latS: lat%60 }); await p.selectOption('#latNS', rnd(2) ? '1' : '-1'); }
      await all(p);
      const res = await p.evaluate(() => {
        const fig = document.getElementById('fig'), vb = fig.viewBox.baseVal, M = fig.getScreenCTM();
        const c0 = new DOMPoint(vb.x, vb.y).matrixTransform(M), c1 = new DOMPoint(vb.x + vb.width, vb.y + vb.height).matrixTransform(M), el = fig.getBoundingClientRect();
        const box = { left: Math.max(el.left, c0.x), top: Math.max(el.top, c0.y), right: Math.min(el.right, c1.x), bottom: Math.min(el.bottom, c1.y) };
        const ts = Array.from(fig.querySelectorAll('text')).map(t => ({ s: t.textContent, r: t.getBoundingClientRect() })).filter(t => t.r.width > 0); const out = [];
        for (let i = 0; i < ts.length; i++){ const a = ts[i].r; if (a.left < box.left - 0.5 || a.right > box.right + 0.5 || a.top < box.top - 0.5 || a.bottom > box.bottom + 0.5) out.push('outside: ' + ts[i].s);
          for (let j = i + 1; j < ts.length; j++){ const b = ts[j].r; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) out.push(ts[i].s + ' × ' + ts[j].s); } }
        return out; });
      if (res.length) bad.push(`${m} ${lst}/${lat}: ${res.join(' ; ')}`);
    }
    check(G, `${lang}@${width}×${height}: 8 random states, no overlaps, nothing outside`, bad.length === 0, bad.join(' | '));
    await close(p);
  }
}

// ================================================================ G4: storage and languages (guards)
async function storage(){
  const G = 'G4 languages and storage';
  let p = await fresh(); await p.selectOption('#langSel', 'de');
  check(G, 'choosing a language stores it under dah.lang', (await p.evaluate(() => localStorage.getItem('dah.lang'))) === 'de', '');
  await close(p);
  p = await fresh({ storage: { 'sayyid.lang': 'fr' } });
  check(G, 'sayyid.lang is still honoured', (await p.evaluate(() => document.documentElement.lang)) === 'fr', '');
  await close(p);
  p = await fresh({ lang: 'nb' }); await mode(p, 'asc'); await preset(p, 'lesson'); await all(p);
  check(G, 'Norwegian shows the decimal comma in row 19', /0,9458333/.test(row(await ws(p), 19).value), '');
  await close(p);
}

// ================================================================ round 2: the re-review's findings
// smallest diagram text in screen pixels: body text, and headings (classes with "hd")
function textPx(){ const svg = document.getElementById('fig'); const b = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; const sc = Math.min(b.width / vb.width, b.height / vb.height);
  let body = 99, head = 99; svg.querySelectorAll('text').forEach(t => { const c = t.getAttribute('class') || ''; if (!c) return; const px = parseFloat(getComputedStyle(t).fontSize) * sc; if (/hd/.test(c)) head = Math.min(head, px); else body = Math.min(body, px); });
  return { body: +body.toFixed(2), head: +head.toFixed(2) }; }
// every walkthrough step as it opens, and again with All pressed
async function measureStates(url, lang, w, h){
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'en-US' }); const p = await ctx.newPage(); p.setDefaultTimeout(4000);
  p.on('pageerror', e => { if (url === PAGE) consoleErrors.push(`${lang}@${w}×${h}: ${e.message}`); });
  await ctx.addInitScript(l => localStorage.setItem('dah.lang', l), lang);
  await p.goto(url); await p.evaluate(() => document.fonts.ready);
  const out = {};
  for (let i = 0; i < 11; i++){
    await p.click(`#pips button:nth-child(${i + 1})`); await p.waitForTimeout(40); out[i + 'a'] = await p.evaluate(textPx);
    const b = await p.$('#allBtn'); if (!(await b.isDisabled())) await b.click(); await p.waitForTimeout(40); out[i + 'b'] = await p.evaluate(textPx);
  }
  await ctx.close(); return out;
}
const BAND = [[981, 650], [990, 700], [1024, 768], [1024, 900], [1100, 650], [1180, 700], [1180, 820], [1279, 650], [1279, 900]];
const LAPTOP = [[1280, 720], [1366, 657], [1366, 768], [1440, 900], [1536, 730], [1920, 1080]];
const PHONE = [[320, 900], [375, 900], [390, 900]];
async function r2Sizes(){
  const G1 = 'R2-P2-1 tablet band 981–1279 px', G2 = 'R2 laptops and phones do not regress';
  const ref = REF_SIZES;
  for (const [w, h] of BAND.concat(LAPTOP, PHONE)) for (const lang of LANGS){
    const m = await measureStates(PAGE, lang, w, h), r = ref[`${w}x${h}|${lang}`]; const keys = Object.keys(m);   // r: none for a language added since
    const minB = Math.min(...keys.map(k => m[k].body)), worst = !r ? [] : keys.filter(k => m[k].body < r[k].body - 0.05).map(k => `step ${parseInt(k) + 1}${k.endsWith('b') ? ' (All)' : ''}: ${m[k].body} < ${r[k].body}`);
    const band = BAND.some(([a, b]) => a === w && b === h), phone = PHONE.some(([a]) => a === w);
    if (band) check(G1, `${lang}@${w}×${h}: smallest diagram text ≥ 9 px in all 22 states (min ${minB})`, minB >= 9, keys.map(k => k + ':' + m[k].body).join(' '));
    if (r) check(band ? G1 : G2, `${lang}@${w}×${h}: never smaller than the original, state by state`, worst.length === 0, worst.join('; '));
    if (phone){ const minH = Math.min(...keys.map(k => m[k].head)); check(G2, `${lang}@${w}×${h}: diagram headings ≥ 8 px (min ${minH})`, minH >= 8, ''); }
  }
}
async function r2Notes(){ // P3-1
  const G = 'R2-P3-1 input notes stay';
  for (const [id, v, md, pat, other, ov] of [['latD', '75', 'asc', /60°/, 'latD', '50'], ['utH', '24', 'planet', /23:59/, 'utM', '30'], ['lstS', '12.6', 'asc', /12[.,]6/, 'lstM', '38']]){
    const p = await fresh(); if (md === 'planet') await mode(p, 'planet'); await tab(p, 'tabWs');
    await p.click('#' + id, { clickCount: 3 }); await p.keyboard.press('Control+A'); await p.keyboard.type(v); await p.keyboard.press('Enter');
    const a = S(await txt(p, '#inote')); await p.click('#paneWs .foot'); await p.waitForTimeout(40); const b = S(await txt(p, '#inote'));
    check(G, `${id}=${v}: the note survives focus leaving the field`, pat.test(a) && b === a, `after Enter: ${a} | after blur: ${b}`);
    // and it goes once a value really changes
    await p.fill('#' + other, ov); await p.press('#' + other, 'Enter'); const c = S(await txt(p, '#inote'));
    check(G, `${id}=${v}: the note clears when a later commit changes the value it describes (${other} ${ov})`, c === '', c);
    await close(p);
  }
}
async function r2Gap(){ // P3-2
  const G = 'R2-P3-2 gap note coherent';
  const MOSTLY_INT = { en: ['mostly from interpolation'], nb: ['mest fra interpolasjonen', 'mest på grunn av interpolasjonen'], es: ['sobre todo por la interpolación'], fr: ["surtout à cause de l'interpolation"], de: ['vor allem wegen der Interpolation'], zh: ['主要来自插值'], ja: ['主に補間によるものです'] };
  const lst = 18*3600 + 36*60 + 7, lat = 59.5*3600, w = worksheet(lst, lat, 1, TOBL);
  for (const l of LANGS){
    const p = await fresh({ lang: l }); await mode(p, 'asc'); await preset(p, 'lesson');
    await setFields(p, { oblD: 23, oblM: 26, oblS: 0, lstH: 18, lstM: 36, lstS: 7, latD: 59, latM: 30, latS: 0 }); await all(p);
    const note = S(await txt(p, '#wsnote'));
    check(G, `${l}: 23°26′, 18:36:07, 59°30′N (gap ${gapTxt(sd(w.asc, w.ascD))}, all interpolation): no "mostly from interpolation"`, Math.abs(sd(w.asc, w.ascD)) > 60 && note.includes(gapTxt(sd(w.asc, w.ascD))) && !MOSTLY_INT[l].some(x => note.includes(x)), note);
    await close(p);
  }
  // every kind, in English, with the parts computed here
  const p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson');
  const kinds = [ // [description, fields, expectation]
    ['agree (MC at the table obliquity)', 'mc', { oblD: 23, oblM: 26, oblS: 0 }, n => /agree to the second/.test(n) && !/Within|more than/.test(n)],
    ['same obliquity, within 1′', 'asc', { oblD: 23, oblM: 26, oblS: 0, latD: 59, latM: 58, latS: 48 }, n => /all of it is interpolation/.test(n) && /Within 1′ is fine/.test(n) && !/mostly/.test(n)],
    ['all from the obliquity (lesson)', 'asc', { oblD: 23, oblM: 26, oblS: 54, latD: 44, latM: 58, latS: 48 }, n => /All of it comes from the obliquity/.test(n) && !/mostly/.test(n)],
    ['opposite parts, more than 1′', 'asc', { latD: 59, latM: 58, latS: 48 }, n => /opposite directions/.test(n) && /more than 1′, mostly from the obliquity/.test(n)],
  ];
  for (const [d, m, f, ok] of kinds){ await mode(p, m); await preset(p, 'lesson'); await setFields(p, f); await all(p); const n = S(await txt(p, '#wsnote')); check(G, `en: ${d}`, ok(n), n); }
  // a case where both parts are non-zero and pull the same way, found here by search
  let found = null;
  for (let lstS = 0; lstS < 86400 && !found; lstS += 997) for (const la of [50, 55, 58]) { const w2 = worksheet(lstS, la*3600, 1, 23.5); const ob = sd(w2.ascDT, w2.ascD), it = sd(w2.asc, w2.ascDT); if (ob && it && (ob > 0) === (it > 0)) { found = [lstS, la, ob, it]; break; } }
  if (found){ await mode(p, 'asc'); await setFields(p, { lstH: Math.floor(found[0]/3600), lstM: Math.floor(found[0]%3600/60), lstS: found[0]%60, latD: found[1], latM: 0, latS: 0, oblD: 23, oblM: 30, oblS: 0 }); await all(p);
    const n = S(await txt(p, '#wsnote')); check(G, `en: both parts the same way (${gapTxt(found[2])} and ${gapTxt(found[3])})`, n.includes(`gives ${gapTxt(found[2])} of it and interpolation ${gapTxt(found[3])}`) && !/opposite/.test(n), n); }
  else check(G, 'en: both parts the same way (search)', false, 'no case found');
  await close(p);
}
async function r2Planet(){ // P3-3, P3-4, P3-6, P3-11
  const G3 = 'R2-P3-3 no net motion', G4 = 'R2-P3-4 crossing note', G6 = 'R2-P3-6 nothing before its rows', G11 = 'R2-P3-11 implausible motion';
  const NET = { en: /no net motion/i, nb: /nettobevegelse/, es: /movimiento neto/, fr: /mouvement net/, de: /Nettobewegung/, zh: /净运行/, ja: /正味/ };
  const OVER = /did not move|no motion that day|same all day|beveget seg ikke|ingen bevegelse den dagen|samme hele dagen|no se movió|sin movimiento ese día|misma todo el día|n'a pas bougé|aucun mouvement ce jour|même toute la journée|nicht bewegt|keine Bewegung|ganzen Tag dieselbe|没有移动|当日没有运行|全天位置不变|動いていません|動いていない|一日じゅう/;
  for (const l of LANGS){
    const p = await fresh({ lang: l }); await mode(p, 'planet');
    await setFields(p, { p0D: 10, p1D: 10, p0M: 0, p1M: 0, p0S: 0, p1S: 0 }); await p.selectOption('#p0G', '3'); await p.selectOption('#p1G', '3'); await p.press('#p1S', 'Enter');
    await mode(p, 'planet'); for (let i = 0; i < 5; i++) await p.click('#stepBtn');                 // the strip on row 45
    const say = S(await txt(p, '#say')); await all(p); const note = S(await txt(p, '#wsnote')), dir = S(await txt(p, '#fig'));
    check(G3, `${l}: equal positions → "no net motion" in narration, note and drawing, nothing more`, NET[l].test(say) && NET[l].test(note) && NET[l].test(dir) && !OVER.test(say + note + dir), `${say} | ${note}`);
    // the crossing, both ways: raw difference, then the 360° step, then the sign
    for (const [a, sa, b, sb, raw, d] of [[29, '11', 1, '0', '−358° 00′ 00″', '+2° 00′ 00″'], [1, '0', 29, '11', '+358° 00′ 00″', '−2° 00′ 00″']]){
      await setFields(p, { utH: 12, utM: 0, p0D: a, p1D: b }); await p.selectOption('#p0G', sa); await p.selectOption('#p1G', sb); await p.press('#p1S', 'Enter'); await all(p);
      const n = S(await txt(p, '#wsnote'));
      check(G4, `${l}: ${a}°→${b}° note gives row 43 − row 44 = ${raw}, then ${d}`, n.includes(raw) && n.includes(d) && n.indexOf(raw) < n.indexOf(d), n);
    }
    // 0° Aries → 20° Libra: implausible, still calculated
    await setFields(p, { p0D: 0, p1D: 20, p0M: 0, p1M: 0 }); await p.selectOption('#p0G', '0'); await p.selectOption('#p1G', '6'); await p.press('#p1S', 'Enter'); await all(p);
    const inote = S(await txt(p, '#inote')), r = await ws(p);
    check(G11, `${l}: 0° ♈ → 20° ♎ brings a note about 15° a day, and the rows still fill`, /15°/.test(inote) && row(r, 47) && !isNaN(dms(row(r, 47).value)), inote);
    await close(p);
  }
  // before rows 43–45 are shown, the note and the drawing say nothing about the motion
  for (const l of LANGS){
    const p = await fresh({ lang: l }); await walkTo(p, 9);                                            // Sun, rows 8 and 42 shown
    const n0 = S(await txt(p, '#wsnote')), hid = await p.$eval('#fDir', e => !!e.closest('[aria-hidden="true"]')).catch(() => false);
    check(G6, `${l}: planet at row 42: no motion statement yet (note empty, direction label hidden)`, n0 === '' && hid, n0);
    for (let i = 0; i < 3; i++) await p.click('#stepBtn');
    check(G6, `${l}: planet at row 45: the note appears (+1° 01′ 05″)`, S(await txt(p, '#wsnote')).includes('+1° 01′ 05″'), S(await txt(p, '#wsnote')));
    await close(p);
  }
  for (const l of LANGS){
    const p = await fresh({ lang: l }); const n0 = S(await txt(p, '#wsnote'));
    check(G6, `${l}: step 1 (nothing shown): no gap statement`, !/23″/.test(n0), n0);
    await walkTo(p, 7); check(G6, `${l}: step 8 (all shown): the gap statement is there`, /\+23″/.test(S(await txt(p, '#wsnote'))), '');
    await close(p);
  }
}
async function r2Misc(){ // P3-5, P3-7, P3-8, P3-9, P3-10, P3-12
  const G5 = 'R2-P3-5 idle narration', G7 = 'R2-P3-7 no negative zero', G8 = 'R2-P3-8 phones', G9 = 'R2-P3-9 contrast', G10 = 'R2-P3-10 SVG name', G12 = 'R2-P3-12 wording';
  for (const l of LANGS){
    const p = await fresh({ lang: l }); const t = {};
    for (const m of ['asc', 'mc', 'planet']){ await mode(p, m); t[m] = S(await txt(p, '#say')); }
    check(G5, `${l}: the idle strip differs by mode (no ASC box sentence in MC or Planet)`, t.asc !== t.mc && t.asc !== t.planet && t.mc !== t.planet, JSON.stringify(t));
    if (l === 'en') check(G5, 'en: MC idle speaks of the ruler, Planet idle of the time of birth', /ruler/.test(t.mc) && /time of birth/.test(t.planet) && !/inside the box/.test(t.mc + t.planet), JSON.stringify(t));
    await close(p);
  }
  let p = await fresh(); await mode(p, 'mc'); await setFields(p, { lstH: 12, lstM: 0, lstS: 0 }); await mode(p, 'mc');
  for (let i = 0; i < 12; i++) await p.click('#stepBtn');                                                  // the strip on row 16
  const say16 = S(await txt(p, '#say')); await all(p); const r = await ws(p);
  { const i = r.findIndex(x => x.n === '16'), nx = r[i + 1];
    check(G7, 'LST 12:00:00: row 16 is "0° 00′ 00″" and the next row adds 180° ("16 + 180°"), never −0', i >= 0 && S(r[i].value) === '0° 00′ 00″' && nx && /16\s*\+\s*180°\s*$/.test(nx.label) && !/−0° 00′ 00″/.test(say16 + JSON.stringify(r)), `${i >= 0 && r[i].value} | ${nx && nx.label} | ${say16}`); }
  check(G10, 'SVG named by its title only, described by the desc', (await attr(p, '#fig', 'aria-labelledby')) === 'figTitle' && (await attr(p, '#fig', 'aria-describedby')) === 'figDesc', '');
  let snap = null; try { snap = await p.locator('#fig').ariaSnapshot(); } catch (e) {}
  check(G10, 'accessibility tree: the img name is the title, without the description', snap !== null && /img "The Midheaven between two table columns"/.test(snap) && !/img "[^"]*ruler/.test(snap), String(snap).slice(0, 200));
  await close(p);
  // contrast of the secondary text, computed here from the used colours
  p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson'); await all(p); await tab(p, 'tabWs');
  const cs = await p.evaluate(() => { const rgb = s => s.match(/[\d.]+/g).map(Number); const bgOf = el => { while (el) { const c = getComputedStyle(el).backgroundColor; const v = rgb(c); if (v.length < 4 || v[3] > 0) return v.slice(0, 3); el = el.parentElement; } return [7, 10, 18]; };
    return ['#ws thead th', 'fieldset.field legend', '#paneWs .foot p', '#ws td.n'].map(sel => { const e = document.querySelector(sel); return e ? { sel, fg: rgb(getComputedStyle(e).color).slice(0, 3), bg: bgOf(e) } : { sel, fg: null }; }); });
  const lumi = c => { const [r, g, b] = c.map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126*r + 0.7152*g + 0.0722*b; };
  for (const { sel, fg, bg } of cs){ if (!fg){ check(G9, `${sel}: contrast ≥ 4.5:1`, false, 'element missing'); continue; } const a = lumi(fg), b = lumi(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); check(G9, `${sel}: contrast ${ratio.toFixed(2)}:1 ≥ 4.5:1`, ratio >= 4.5, `${fg} on ${bg}`); }
  await close(p);
  // phones: the narration text gets the width; headings checked in the size group
  for (const l of LANGS) for (const w of [320, 375]){
    p = await fresh({ lang: l, width: w }); await mode(p, 'asc'); await preset(p, 'lesson'); await all(p);
    const g = await p.evaluate(() => { const s = document.querySelector('#say'), t = document.querySelector('#say .t'); const cs = getComputedStyle(s); return { t: t.getBoundingClientRect().width, inner: s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), lines: Math.round(t.getBoundingClientRect().height / parseFloat(getComputedStyle(t).lineHeight)) }; });
    check(G8, `${l}@${w}: the narration text has the strip's full width (${Math.round(g.t)} of ${Math.round(g.inner)} px)`, g.t >= g.inner - 1, JSON.stringify(g));
    if (l === 'en' && w === 320) check(G8, `en@320: the last ASC row in at most 8 lines (the original's count)`, g.lines <= 8, JSON.stringify(g));
    await close(p);
  }
  // wording, all languages: step 1 (reduced motion), step 7 (only row 38), step 8 (+2′ 41″ and −7″), step 10 (not "exactly half")
  const RM = { en: 'reduced motion', nb: 'redusert bevegelse', es: 'reducir el movimiento', fr: 'réduire les animations', de: 'reduzierte Bewegung', zh: '减少动态效果', ja: '動きを減らす' };
  const EXACT = /exactly half|nøyaktig halvparten|exactamente la mitad|exactement la moitié|genau die halbe|恰好|ちょうど半分/;
  const w4 = worksheet(63587, (59*60 + 58)*60 + 48, 1, OBL), ob = gapTxt(sd(w4.ascDT, w4.ascD)), it = gapTxt(sd(w4.asc, w4.ascDT)), tot = gapTxt(sd(w4.asc, w4.ascD));
  p = await fresh();
  for (const l of LANGS){ await p.selectOption('#langSel', l);
    const s1 = (await walkText(p, 0)).tryit, s7 = (await walkText(p, 6)).tryit, s8 = (await walkText(p, 7)).tryit, s10 = (await walkText(p, 9)).tryit;
    check(G12, `${l}: step 1 no longer promises a flash under reduced motion`, s1.includes(RM[l]), s1);
    check(G12, `${l}: step 7 names row 38 only`, /38/.test(s7) && !/37/.test(s7), s7);
    check(G12, `${l}: step 8 splits ${tot} into ${ob} (obliquity) and ${it} (interpolation)`, s8.includes(tot) && s8.includes(ob) && s8.includes(it) && ob === '+2′ 41″' && it === '−7″', s8);
    check(G12, `${l}: step 10 does not say "exactly half"`, !EXACT.test(s10), s10);
  }
  await close(p);
  // step 10's claim, checked: noon takes half the day's motion to the nearest second
  p = await fresh(); await mode(p, 'planet'); await preset(p, 'sun'); await setFields(p, { utH: 12, utM: 0 }); await all(p);
  const r46 = row(await ws(p), 46);
  check(G12, `noon: row 46 = 3,665″ × 0.5 to the nearest second = ${fmt(mulR(3665, 5000000))}`, r46 && dms(r46.value) === mulR(3665, 5000000) && mulR(3665, 5000000) === 1833, r46 && r46.value);
  await close(p);
}

// ================================================================ R3: round 3 — a steady layout; notes and strip details
const GRID_W = [981, 1024, 1112, 1180, 1279, 1366], GRID_H = [500, 550, 600, 650, 700, 768];
const R3_LANGS = ['en', 'de', 'ja'];
// the layout in use, read from the page's own grid (one or two columns), never from its script
const colsOf = p => p.evaluate(() => getComputedStyle(document.querySelector('.shell')).gridTemplateColumns.trim().split(/\s+/).length);
const stepNo = async p => { const m = S(await txt(p, '#say .k')).match(/\d+/); return m ? +m[0] : 0; };
// P1-1: eight clicks at one fixed point on Next step give steps 1 to 8, at every size of the grid, in every mode
async function r3Fixed(){
  const G = 'R3-P1-1 Next step stays under the pointer';
  for (const lang of R3_LANGS){
    const p = await fresh({ lang, width: 1024, height: 768 });
    for (const w of GRID_W) for (const h of GRID_H){
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(40);
      const bad = [];
      for (const m of ['asc', 'mc', 'planet']){
        await mode(p, m); await p.waitForTimeout(20);
        await p.$eval('#stepBtn', b => b.scrollIntoView({ block: 'center' })); await p.waitForTimeout(30);
        const c = await p.$eval('#stepBtn', b => { const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        const seq = []; let total = 8;
        for (let i = 1; i <= Math.min(8, total); i++){
          const under = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.closest('#stepBtn') ? 'next' : (e ? (e.id || e.className || e.tagName) : 'none'); }, [c.x, c.y]);
          await p.mouse.click(c.x, c.y); await p.waitForTimeout(15);
          const k = await stepNo(p); seq.push(k); if (i === 1){ const t = S(await txt(p, '#say .k')).match(/\d+/g); total = t && t[1] ? +t[1] : 8; }   // Planet has seven rows
          if (under !== 'next' || k !== i) bad.push(`${m} click ${i}: under ${under}, step ${k}`);
        }
      }
      check(G, `${lang}@${w}×${h} (${await colsOf(p)} col): clicks at one point give steps 1–8 in ASC and MC, 1–7 (all) in Planet`, bad.length === 0, bad.slice(0, 4).join('; '));
    }
    await close(p);
  }
}
// P1-1: in each mode the rail, Next step and the drawing keep their place and size through every step, All,
// ◀ ▶ and ▲ ▼; at every two-column size Next step is fully in view and the stage does not scroll
async function r3Steady(){
  const G = 'R3-P1-1 rail and drawing steady', G2 = 'R3-P1-1 two columns: all in view, text ≥ 9 px';
  // two columns: the rail, Next step and the drawing, on the page; one column (round 4): Next step on the screen (its
  // bar is fixed) and the drawing's size; there the strip takes its own height, so the rail below it may move
  const geo = p => p.evaluate(() => { const one = getComputedStyle(document.querySelector('.shell')).gridTemplateColumns.trim().split(/\s+/).length === 1;
    const sy = one ? 0 : scrollY, r = e => { const b = document.querySelector(e).getBoundingClientRect(); return [b.left, b.top + sy, b.width, b.height].map(v => Math.round(v * 2) / 2); };
    const f = r('#fig'); return JSON.stringify({ rail: one ? null : r('.stage > .rail'), next: r('#stepBtn'), fig: one ? f.slice(2) : f, vb: document.getElementById('fig').getAttribute('viewBox') }); });
  for (const lang of R3_LANGS){
    const p = await fresh({ lang, width: 1024, height: 768 });
    for (const w of GRID_W) for (const h of GRID_H){
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(40);
      const cols = await colsOf(p); const bad = [];
      for (const [m, pre, moves] of [['asc', 'lesson', ['#colPrev', '#colNext', '#rowPrev', '#rowNext', '#rowNext']], ['asc', 'south', ['#rowPrev', '#rowNext', '#colNext']], ['mc', 'lesson', ['#colPrev', '#colNext', '#colNext']], ['planet', 'saturn', []]]){
        await mode(p, m); await preset(p, pre); await tab(p, 'tabWalk'); await p.click('#resetBtn'); await p.waitForTimeout(20);
        const g0 = await geo(p); const seen = new Set([g0]);
        for (let i = 0; i < 30 && !(await p.$eval('#stepBtn', b => b.disabled)); i++){ await p.click('#stepBtn'); seen.add(await geo(p)); }
        await p.click('#resetBtn'); await p.click('#allBtn'); seen.add(await geo(p));
        for (const b of moves){ await p.click(b); await p.waitForTimeout(10); seen.add(await geo(p)); }
        if (seen.size > 1) bad.push(`${m}/${pre}: ${seen.size} layouts ${[...seen].slice(0, 2).join(' vs ')}`);
      }
      check(G, `${lang}@${w}×${h} (${cols} col): ${cols === 2 ? 'rail, Next step and drawing' : 'Next step on the screen and the drawing\'s size'} unchanged by Next step, All, ◀ ▶, ▲ ▼`, bad.length === 0, bad.join('; '));
      { await p.evaluate(() => scrollTo(0, 0));
        const r = await p.evaluate(() => { const b = document.querySelector('#stepBtn').getBoundingClientRect(), rail = document.querySelector('.stage > .rail').getBoundingClientRect(), st = document.querySelector('.stage'), s = document.querySelector('#say');
          return { inView: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth, rail: rail.bottom <= innerHeight + 0.5, stage: st.scrollHeight - st.clientHeight, say: s.scrollHeight - s.clientHeight, page: document.documentElement.scrollHeight - innerHeight }; });
        // two columns: everything in view, nothing scrolls but the strip; one column: the page scrolls, nothing inside the stage does
        check(G2, `${lang}@${w}×${h} (${cols} col): ${cols === 2 ? 'Next step fully in view, rail whole, stage and page not scrolling' : 'Next step in view on opening; the page scrolls, the stage and the strip do not'}`, cols === 2 ? (r.inView && r.rail && r.stage <= 0 && r.page <= 0) : (r.inView && r.stage <= 0 && r.say <= 0), JSON.stringify(r));
      }
    }
    await close(p);
  }
  // at the smallest two-column height of each width band, every language, every walkthrough state: text ≥ 9 px
  for (const [w, h] of [[981, 640], [1024, 640], [1179, 640], [1180, 620], [1279, 620], [1280, 540], [1366, 540], [1440, 540]]) for (const lang of LANGS){
    const m = await measureStates(PAGE, lang, w, h); const keys = Object.keys(m); const minB = Math.min(...keys.map(k => m[k].body));
    const p = await fresh({ lang, width: w, height: h }); const cols = await colsOf(p); await close(p);
    check(G2, `${lang}@${w}×${h} (${cols} col): smallest diagram text ≥ 9 px in all 22 walkthrough states (min ${minB})`, cols === 2 && minB >= 9, keys.map(k => k + ':' + m[k].body).join(' '));
  }
  // one pixel shorter: one column
  for (const [w, h] of [[981, 639], [1179, 639], [1180, 619], [1279, 619], [1280, 539], [1920, 539]]){
    const p = await fresh({ width: w, height: h }); const cols = await colsOf(p);
    const r = await p.evaluate(() => { const st = document.querySelector('.stage'), s = document.querySelector('#say'); return { stage: st.scrollHeight - st.clientHeight, say: s.scrollHeight - s.clientHeight, sayOv: getComputedStyle(s).overflowY }; });
    check(G2, `${w}×${h}: one column below the two-column height, nothing scrolls inside the stage`, cols === 1 && r.stage <= 0 && r.say <= 0, JSON.stringify(r));
    await close(p);
  }
}
// P2-1: every action paints at most one drawing (the viewBox changes in the action's frame only)
async function r3OnePaint(){
  const G = 'R3-P2-1 one drawing per action';
  const INIT = () => { window.__frame = 0; window.__log = []; const tick = () => { window.__frame++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    document.addEventListener('DOMContentLoaded', () => { const f = document.getElementById('fig'); new MutationObserver(ms => { for (const m of ms) if (m.attributeName === 'viewBox') window.__log.push([window.__frame, f.getAttribute('viewBox')]); }).observe(f, { attributes: true }); }); };
  for (const [w, h] of [[985, 768], [1024, 768], [1180, 820], [1366, 768], [1920, 1080], [1024, 600], [390, 844]]) for (const lang of ['en', 'ja']){
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'en-US' }); const p = await ctx.newPage(); p.setDefaultTimeout(4000);
    p.on('pageerror', e => consoleErrors.push(`${lang}@${w}: ${e.message}`));
    await ctx.addInitScript(l => localStorage.setItem('dah.lang', l), lang); await ctx.addInitScript(INIT);
    await p.goto(PAGE); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    const acts = [];
    for (let i = 0; i < 10; i++) acts.push(['#nextBtn', 'walk next']); for (let i = 0; i < 10; i++) acts.push(['#prevBtn', 'walk back']);
    acts.push(['.rail [data-mode="asc"]', 'mode']); for (let i = 0; i < 24; i++) acts.push(['#stepBtn', 'step']);
    acts.push(['#resetBtn', 'start over'], ['#allBtn', 'all'], ['#colPrev', '◀'], ['#colNext', '▶'], ['#rowPrev', '▼'], ['#rowNext', '▲'], ['.rail [data-mode="mc"]', 'mode'], ['.rail [data-mode="planet"]', 'mode'], ['#allBtn', 'all']);
    let n = 0; const bad = [];
    for (const [sel, label] of acts){
      if (await p.$eval(sel, b => b.disabled || !!b.closest('[hidden]'))) continue;
      await p.evaluate(() => { window.__log.length = 0; window.__f0 = window.__frame; });
      await p.click(sel); await p.waitForTimeout(110); n++;
      const log = await p.evaluate(() => window.__log.map(x => [x[0] - window.__f0, x[1]]));
      const frames = new Set(log.map(x => x[0]));
      if (frames.size > 1) bad.push(`${label}: ${JSON.stringify(log)}`);
    }
    for (const l of ['de', 'zh', lang]){ await p.evaluate(() => { window.__log.length = 0; window.__f0 = window.__frame; }); await p.selectOption('#langSel', l); await p.waitForTimeout(110); n++;
      const log = await p.evaluate(() => window.__log.map(x => [x[0] - window.__f0, x[1]])); if (new Set(log.map(x => x[0])).size > 1) bad.push(`language ${l}: ${JSON.stringify(log)}`); }
    check(G, `${lang}@${w}×${h}: ${n} actions, each sets the drawing's size in one frame only`, bad.length === 0, bad.slice(0, 3).join(' | '));
    await ctx.close();
  }
}
// the strip, measured here: is any of its words or its value below the visible part?
const stripState = p => p.evaluate(() => { const s = document.querySelector('#say'), tv = s.querySelector('.tv') || s;
  const b = s.getBoundingClientRect(), vis = b.top + s.clientTop + s.clientHeight; let low = 0;
  const walk = document.createTreeWalker(tv, NodeFilter.SHOW_TEXT); let n; const range = document.createRange();
  while ((n = walk.nextNode())) for (let i = 0; i < n.length; i++){ range.setStart(n, i); range.setEnd(n, i + 1); const r = range.getBoundingClientRect(); if (r.height) low = Math.max(low, r.bottom); }
  return { hiddenNow: low > vis + 0.5, hiddenAtTop: low + s.scrollTop > vis + 0.5, tab: s.tabIndex, more: s.classList.contains('more'), top: s.scrollTop }; });
// P2-2 and P3-1: the strip's focus and cue follow a resize and the idle text
async function r3Strip(){
  const G2 = 'R3-P2-2 strip after a resize', G3 = 'R3-P2-3 visible cue', G31 = 'R3-P3-1 idle text reachable', G24 = 'R3-P2-4 no nested scrolling';
  const agrees = s => s.tab === (s.hiddenAtTop ? 0 : -1) && s.more === s.hiddenNow;
  let p = await fresh({ width: 1000, height: 800 }); await walkTo(p, 7);
  const seq = [];
  for (const [w, h] of [[1000, 800], [1920, 1080], [800, 1000], [1920, 1080], [1000, 800], [1180, 700], [1024, 768]]){ await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); const s = await stripState(p); seq.push([w, h, s]); }
  check(G2, 'step 8 through seven resizes: focusable exactly when words are hidden, cue exactly while they are', seq.every(([, , s]) => agrees(s)) && seq[0][2].hiddenAtTop && !seq[1][2].hiddenAtTop, JSON.stringify(seq.map(([w, h, s]) => `${w}x${h} ${JSON.stringify(s)}`)));
  const reach = async () => { await p.focus('#langSel'); for (let i = 0; i < 8; i++){ await p.keyboard.press('Tab'); if (await p.evaluate(() => document.activeElement.id === 'say')) return true; } return false; };
  await p.setViewportSize({ width: 1000, height: 800 }); await p.waitForTimeout(250); const t1 = await reach();
  await p.setViewportSize({ width: 1920, height: 1080 }); await p.waitForTimeout(250); const t2 = await reach();
  check(G2, 'Tab reaches the strip at 1000×800 (words hidden), not at 1920×1080 (all shown)', t1 && !t2, `${t1} ${t2}`);
  await close(p);
  // every step, several sizes and languages: focus and cue agree with what is hidden; text that fits shows no cue
  for (const [w, h] of [[981, 700], [1024, 768], [1180, 700], [1280, 720], [1366, 768]]) for (const lang of LANGS){
    p = await fresh({ lang, width: w, height: h }); const bad = []; let n = 0, over = 0;
    for (const [m, pre] of [['asc', 'lesson'], ['asc', 'south'], ['mc', 'lesson'], ['planet', 'saturn']]){
      await mode(p, m); await preset(p, pre); await tab(p, 'tabWalk'); await p.click('#resetBtn');
      for (let i = 0; i < 30; i++){ const s = await stripState(p); n++; if (s.hiddenAtTop) over++; if (!agrees(s) || s.top !== 0) bad.push(`${m}/${pre} ${i}: ${JSON.stringify(s)}`); if (await p.$eval('#stepBtn', b => b.disabled)) break; await p.click('#stepBtn'); }
    }
    check(G3, `${lang}@${w}×${h}: ${n} strip states, ${over} with more to read; focus and cue exactly on those`, bad.length === 0, bad.slice(0, 3).join(' | '));
    await close(p);
  }
  // the cue itself: a ▾ at ≥ 3:1 and a fade, gone at the end of the text
  p = await fresh({ width: 1024, height: 768 }); await walkTo(p, 7);
  const cue = await p.evaluate(() => { const s = document.querySelector('#say'), c = s.querySelector('.cue'); if (!c) return null; const a = getComputedStyle(c, '::after'), b = getComputedStyle(c, '::before');
    const bg = (el => { while (el){ const v = getComputedStyle(el).backgroundColor.match(/[\d.]+/g).map(Number); if (v.length < 4 || v[3] > 0) return v.slice(0, 3); el = el.parentElement; } return [0, 0, 0]; })(s);
    return { mark: a.content, color: a.color.match(/[\d.]+/g).map(Number).slice(0, 3), bg, op: +a.opacity, fade: b.backgroundImage, fop: +b.opacity, more: s.classList.contains('more') }; });
  const lum = c => { const [r, g, b] = c.map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126*r + 0.7152*g + 0.0722*b; };
  const ratio = cue ? (Math.max(lum(cue.color), lum(cue.bg)) + 0.05) / (Math.min(lum(cue.color), lum(cue.bg)) + 0.05) : 0;
  check(G3, `step 8 at 1024×768: a ▾ marker at ${ratio.toFixed(1)}:1 (≥ 3:1) and a fade of the last line, both shown`, cue && /▾/.test(cue.mark) && ratio >= 3 && cue.op === 1 && /gradient/.test(cue.fade) && cue.fop === 1 && cue.more, JSON.stringify(cue));
  const shot = async () => { const b = await p.$eval('#say', e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.right - 34), y: Math.round(r.bottom - 34), width: 32, height: 32 }; }); return (await p.screenshot({ clip: b })).toString('base64'); };
  const withCue = await shot(); await p.$eval('#say', s => { s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(80);
  const endS = await stripState(p); const endCue = await p.evaluate(() => { const c = document.querySelector('#say .cue'); return c ? +getComputedStyle(c, '::after').opacity : null; }); const atEnd = await shot();
  check(G3, 'scrolled to the end: every word visible, cue gone (its corner repainted)', !endS.hiddenNow && !endS.more && endCue === 0 && withCue !== atEnd, JSON.stringify(endS));
  // the step label stays in view while the strip scrolls
  const kv = await p.evaluate(() => { const s = document.querySelector('#say'), k = s.querySelector('.k'); const b = s.getBoundingClientRect(), r = k.getBoundingClientRect(); const e = document.elementFromPoint(r.left + 5, (r.top + r.bottom) / 2); return { inside: r.top >= b.top && r.bottom <= b.bottom, own: !!(e && e.closest('.k')) }; });
  check(G24, 'step 8 scrolled to its end: the step label is still shown, on top', kv.inside && kv.own, JSON.stringify(kv));
  await close(p);
  // idle text: where it is longer than the strip, it can be scrolled and reached by keyboard (P3-1)
  for (const lang of ['ja', 'zh', 'de', 'fr']){
    p = await fresh({ lang, width: 1024, height: 800 }); const bad = []; let over = 0, n = 0;
    for (let w = 981; w <= 1280; w += 11){ await p.setViewportSize({ width: w, height: 800 }); await p.waitForTimeout(30);
      for (const m of ['asc', 'mc', 'planet']){ await mode(p, m); const s = await stripState(p); n++; if (s.hiddenAtTop) over++; if (!agrees(s)) bad.push(`${w} ${m}: ${JSON.stringify(s)}`); } }
    check(G31, `${lang}, 981–1280 px: ${n} idle strips, ${over} longer than the strip; each of those focusable with a cue`, bad.length === 0, bad.slice(0, 3).join(' | '));
    await close(p);
  }
  p = await fresh({ lang: 'ja', width: 981, height: 800 }); await mode(p, 'mc'); await p.focus('.rail [data-mode="planet"]');
  const stops = []; for (let i = 0; i < 4; i++){ await p.keyboard.press('Shift+Tab'); stops.push(await p.evaluate(() => document.activeElement.id)); }
  const s0 = await stripState(p);
  check(G31, 'ja@981 MC idle: Shift+Tab from Planet reaches the strip, which scrolls to show the rest', stops.includes('say') && s0.hiddenAtTop, JSON.stringify({ stops, s0 }));
  await close(p);
  // P2-4: short screens: no scrolling area inside another; the page scrolls instead
  const b2 = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  for (const [w, h] of [[1024, 600], [1024, 500], [1280, 600], [1180, 610], [1366, 530]]){
    const ctx = await b2.newContext({ viewport: { width: w, height: h } }); const q = await ctx.newPage(); await q.goto(PAGE); await q.waitForTimeout(150);
    await q.click('#pips button:nth-child(8)'); await q.waitForTimeout(80);
    const r = await q.evaluate(() => { const ov = e => e.scrollHeight - e.clientHeight; const st = document.querySelector('.stage'), s = document.querySelector('#say'), p = document.querySelector('#paneWalk');
      return { cols: getComputedStyle(document.querySelector('.shell')).gridTemplateColumns.trim().split(/\s+/).length, stage: ov(st), say: ov(s), sayCan: getComputedStyle(s).overflowY, pane: ov(p), page: document.documentElement.scrollHeight - innerHeight }; });
    const ok = r.cols === 1 ? (r.stage <= 0 && r.say <= 0 && r.pane <= 0) : (r.stage <= 0 && r.page <= 0);
    check(G24, `${w}×${h} (${r.cols} col): nothing scrolls inside something else that scrolls`, ok, JSON.stringify(r));
    await ctx.close();
  }
  await b2.close();
}
// P3-2: a note goes when the value it describes changes, by any route, and speaks the new language
async function r3Notes(){
  const G = 'R3-P3-2 notes follow their values';
  const typeIn = async (p, id, v) => { await p.click('#' + id, { clickCount: 3 }); await p.keyboard.press('Control+A'); await p.keyboard.type(v); await p.keyboard.press('Enter'); await p.waitForTimeout(20); };
  const note = async p => S(await txt(p, '#inote'));
  let p = await fresh({ width: 1280, height: 800 }); await tab(p, 'tabWs');
  await typeIn(p, 'latD', '75'); const a = await note(p); await p.click('#rowPrev'); const b = await note(p);
  check(G, 'latitude 75 → note on 60°; ▼ moves the latitude → note gone', /60°/.test(a) && b === '', `${a} | ${b}`);
  await typeIn(p, 'latD', '75'); await p.$eval('#latRange', e => { e.value = 0.5; e.dispatchEvent(new Event('input', { bubbles: true })); }); const c = await note(p);
  check(G, 'latitude 75, then the latitude slider → note gone', c === '', c);
  await typeIn(p, 'latD', '75'); await p.click('#rowNext'); const c2 = await note(p);
  check(G, 'latitude 75, then ▲ at the top row (latitude unchanged) → note stays', /60°/.test(c2), c2);
  await typeIn(p, 'lstS', '12.6'); const d = await note(p); await p.click('#colPrev'); const e = await note(p);
  check(G, 'LST seconds 12.6 → rounding note beside the latitude note; ◀ changes the LST → the rounding note goes, the latitude note stays', /12[.,]6/.test(d) && /60°/.test(d) && !/12[.,]6/.test(e) && /60°/.test(e), `${d} | ${e}`);
  await typeIn(p, 'lstS', '12.6'); await p.$eval('#lstRange', el => { el.value = 3; el.dispatchEvent(new Event('input', { bubbles: true })); }); const e2 = await note(p);
  check(G, 'LST seconds 12.6, then the ST slider → the rounding note goes', !/12[.,]6/.test(e2) && /60°/.test(e2), e2);
  await typeIn(p, 'oblD', '30'); const f = await note(p); await p.click('[data-preset="south"]'); const f2 = await note(p);
  check(G, 'obliquity 30° → note; a preset (every value new) → all notes gone', /22°/.test(f) && f2 === '', `${f} | ${f2}`);
  await typeIn(p, 'latD', '75'); await mode(p, 'mc'); const g = await note(p);
  check(G, 'latitude note stays on a switch from ASC to MC (same fields, same value)', /60°/.test(g), g);
  await mode(p, 'planet'); const g2 = await note(p); await mode(p, 'asc'); const g3 = await note(p);
  check(G, 'latitude note goes when Planet puts the native\'s fields away, and does not come back', g2 === '' && g3 === '', `${g2} | ${g3}`);
  await mode(p, 'planet'); await tab(p, 'tabWs');
  await typeIn(p, 'utH', '24'); const h1 = await note(p); await p.$eval('#utRange', el => { el.value = 720; el.dispatchEvent(new Event('input', { bubbles: true })); }); const h2 = await note(p);
  check(G, 'UT 24 → note on 23:59; the UT slider to 12:00 → gone', /23:59/.test(h1) && h2 === '', `${h1} | ${h2}`);
  await typeIn(p, 'utH', '24'); await mode(p, 'mc'); const i1 = await note(p); await mode(p, 'planet'); const i2 = await note(p);
  check(G, 'UT note goes on a switch to MC and stays gone back in Planet', i1 === '' && i2 === '', `${i1} | ${i2}`);
  await setFields(p, { p0D: 0, p0M: 0, p0S: 0, p1D: 20, p1M: 0, p1S: 0 }); await p.selectOption('#p0G', '0'); await p.selectOption('#p1G', '6'); await p.press('#p1S', 'Enter');
  const j1 = await note(p); await mode(p, 'asc'); const j2 = await note(p);
  check(G, '0° ♈ → 20° ♎ → the 15°-a-day note; a switch to ASC → gone', /15°/.test(j1) && j2 === '', `${j1} | ${j2}`);
  await close(p);
  // the language: the note is said again, not dropped
  p = await fresh({ width: 1280, height: 800 }); await tab(p, 'tabWs');
  await typeIn(p, 'latD', '75'); const en = await note(p); await p.selectOption('#langSel', 'de'); await p.waitForTimeout(30); const de = await note(p);
  await p.selectOption('#langSel', 'ja'); await p.waitForTimeout(30); const ja = await note(p);
  check(G, 'latitude note re-said in German and Japanese, not cleared', /60°/.test(de) && /60°/.test(ja) && de !== en && ja !== de && /[぀-ヿ一-鿿]/.test(ja), `${en} | ${de} | ${ja}`);
  await p.click('#rowPrev'); const gone = await note(p);
  check(G, '… and still goes when ▼ moves the latitude', gone === '', gone);
  await p.selectOption('#langSel', 'en'); await typeIn(p, 'lstS', '12.6'); const r1 = await note(p); await p.selectOption('#langSel', 'fr'); await p.waitForTimeout(30); const r2 = await note(p);
  check(G, 'rounding note: 12.6 in English becomes 12,6 in French, the field named in French', /12\.6/.test(r1) && /12,6/.test(r2) && !/12\.6/.test(r2) && r2 !== r1, `${r1} | ${r2}`);
  await close(p);
}
// P3-3: a formula waits for its row: before a row is shown its label has no "= …"
async function r3Formulas(){
  const G = 'R3-P3-3 formulas wait for their rows';
  const lab = (r, n) => (row(r, n) || { label: '(no row ' + n + ')' }).label;
  for (const l of LANGS){
    const p = await fresh({ lang: l }); await mode(p, 'planet'); await preset(p, 'saturn'); await p.click('#resetBtn');
    let r = await ws(p); const hidden = r.filter(x => /^·$/.test(x.value));
    check(G, `${l}: Saturn after Start over: no hidden row shows a formula (${hidden.length} rows)`, hidden.length >= 5 && hidden.every(x => !/=/.test(x.label) && !/\b4[3-7]\b/.test(x.label)), hidden.map(x => x.n + ':' + x.label).join(' | '));
    await all(p); r = await ws(p);
    check(G, `${l}: Saturn with every row shown: row 45 = 44 − 43, row 47 = 44 − 46 (retrograde)`, /=\s*44 − 43/.test(lab(r, 45)) && /=\s*44 − 46/.test(lab(r, 47)), lab(r, 45) + ' | ' + lab(r, 47));
    // step by step: each label's formula appears with its value, never before
    await mode(p, 'asc'); await preset(p, 'south'); await p.click('#resetBtn'); const bad = [];
    for (let i = 0; i < 30; i++){ r = await ws(p); for (const x of r) if (x.value === '·' && /=/.test(x.label)) bad.push(`${i}: row ${x.n} ${x.label}`); if (await p.$eval('#stepBtn', b => b.disabled)) break; await p.click('#stepBtn'); }
    await all(p); r = await ws(p);
    check(G, `${l}: southern ASC, every step: no formula on a hidden row; at the end rows 39, 41 and S5 have theirs`, bad.length === 0 && /=/.test(lab(r, 39)) && /=/.test(lab(r, 41)) && /=/.test(lab(r, 'S5')), bad.slice(0, 3).join(' | ') || [39, 41, 'S5'].map(n => lab(r, n)).join(' | '));
    await close(p);
  }
  // the lesson's own rows: ASC falls from 44° (row 30, 350° 33′ 40″) to 45° (row 36, 350° 18′ 59″), so rows 39 and 41 subtract
  const p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson'); await p.click('#resetBtn');
  let r = await ws(p); const pre = [39, 41].map(n => lab(r, n));
  await all(p); r = await ws(p);
  check(G, 'lesson ASC: rows 39 and 41 read "Difference" and "Natal ASC" before, "= 30 − 36" and "= 30 − 40" after', pre[0] === 'Difference' && pre[1] === 'Natal ASC' && /= 30 − 36/.test(lab(r, 39)) && /= 30 − 40/.test(lab(r, 41)), pre.join(' | ') + ' → ' + lab(r, 39) + ' | ' + lab(r, 41));
  await close(p);
}
// P3-4: printed, the strip shows every line; nothing is cut or left scrolled
async function r3Print(){
  const G = 'R3-P3-4 printing';
  for (const [lang, w, h] of [['ja', 1024, 768], ['de', 1024, 768], ['ja', 1440, 900], ['fr', 1180, 700]]){
    const p = await fresh({ lang, width: w, height: h }); await walkTo(p, 7);
    const scr = await stripState(p);
    await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(50);
    const r = await p.evaluate(() => { const ov = e => e.scrollHeight - e.clientHeight; const s = document.querySelector('#say'), cs = getComputedStyle(s);
      return { say: ov(s), sayOv: cs.overflowY, h: cs.height, stage: ov(document.querySelector('.stage')), pane: ov(document.querySelector('#paneWalk')), cue: s.querySelector('.cue') ? getComputedStyle(s.querySelector('.cue')).display : 'none' }; });
    const pr = await stripState(p);
    check(G, `${lang}@${w}×${h} step 8 in print: the strip shows every line (on screen ${scr.hiddenAtTop ? 'it scrolls' : 'it fits'}), no cue, stage and pane uncut`, !pr.hiddenNow && r.say <= 0 && r.sayOv === 'visible' && r.stage <= 0 && r.pane <= 0 && r.cue === 'none', JSON.stringify(r));
    await p.pdf({ path: path.join(__dirname, 'r3', `print-${lang}-${w}.pdf`), format: 'A4', landscape: true, printBackground: true });
    await close(p);
  }
}
// P3-5: with the strip focused, Space and the arrows scroll it; they are not page shortcuts there
async function r3Keys(){
  const G = 'R3-P3-5 keys in the strip';
  const p = await fresh({ width: 1024, height: 768 }); await walkTo(p, 7);
  await p.focus('#langSel'); let found = false; for (let i = 0; i < 8; i++){ await p.keyboard.press('Tab'); if (await p.evaluate(() => document.activeElement.id === 'say')) { found = true; break; } }
  // keyboard scrolling can be animated: read the position once it has settled
  // (under load the animation can start late: wait up to 1.5 s for the position to change, then for it to settle)
  const top = () => p.$eval('#say', s => s.scrollTop);
  const settled = async from => { let a = await top(); for (let i = 0; i < 30 && a === from; i++){ await p.waitForTimeout(50); a = await top(); } for (let i = 0; i < 25; i++){ await p.waitForTimeout(60); const b = await top(); if (b === a) return b; a = b; } return a; };
  const k0 = S(await txt(p, '#say .k')), w0 = await txt(p, '#stepCount'), t0 = await top();
  await p.keyboard.press('ArrowDown'); const t1 = await settled(t0);
  await p.keyboard.press('ArrowUp'); const t2 = await settled(t1);
  await p.keyboard.press('Space'); const t3 = await settled(t2);
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(100);
  const k1 = S(await txt(p, '#say .k')), w1 = await txt(p, '#stepCount');
  check(G, 'Tab reaches the scrollable strip; ↓ scrolls it, ↑ back, Space scrolls it; the step and the walkthrough page stay', found && t1 > t0 && t2 < t1 && t3 > t2 && k1 === k0 && w1 === w0, JSON.stringify({ found, t0, t1, t2, t3, k0, k1, w0, w1 }));
  await p.$eval('#stepTitle', e => { e.tabIndex = -1; e.focus(); }); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(80);
  check(G, 'with the focus elsewhere, ← still turns the walkthrough page (guard)', /Step 7 of 11/.test(await txt(p, '#stepCount')), await txt(p, '#stepCount'));
  await close(p);
}
// P3-6: the drawing's description has no placeholder and no doubled stop, in every language
async function r3Desc(){
  const G = 'R3-P3-6 drawing description';
  for (const l of LANGS){
    const p = await fresh({ lang: l }); await mode(p, 'planet'); await preset(p, 'sun'); await p.click('#resetBtn');
    const d0 = S(await txt(p, '#figDesc')); await all(p); const d1 = S(await txt(p, '#figDesc'));
    await preset(p, 'saturn'); await p.click('#resetBtn'); const d2 = S(await txt(p, '#figDesc')); await all(p); const d3 = S(await txt(p, '#figDesc'));
    const badP = d => /…|\.\s*\.|。\s*。|;\s*\.|；。|\s[.。]/.test(d);
    check(G, `${l}: Sun and Saturn, before and after: no "…", no doubled stop; the motion named only once shown`, ![d0, d1, d2, d3].some(badP) && d1.length > d0.length && d3.length > d2.length && !/℞/.test(d2) && /℞/.test(d3), [d0, d3].join(' || '));
    await close(p);
  }
}

// ================================================================ R4: round 4 — one column keeps its controls still
const oneColOf = async p => (await colsOf(p)) === 1;
// a real pointer click at a fixed point; what was under it
const underAt = (p, x, y) => p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); const c = e && e.closest('button,input,select,a,[role=tab]'); return c ? (c.id || c.dataset.mode || c.dataset.preset || c.tagName) : (e ? e.tagName + '.' + e.className : 'none'); }, [x, y]);
const center = (p, sel) => p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
// P1-a: the Worksheet tab open in one column: clicks at Next step's place stay on Next step; the page never scrolls
async function r4Worksheet(){
  const G = 'R4-P1-a worksheet open, one column';
  for (const [w, h] of [[320, 568], [390, 844], [414, 896], [740, 360], [844, 390], [768, 1024], [1024, 600], [1180, 600], [1366, 530], [1920, 500]]) for (const lang of ['en', 'ja']){
    const p = await fresh({ lang, width: w, height: h }); const one = await oneColOf(p);
    await mode(p, 'asc'); await preset(p, 'lesson'); await p.click('#resetBtn'); await p.waitForTimeout(20);   // Worksheet tab open, nothing shown
    await p.evaluate(() => { const r = document.querySelector('.stage > .rail').getBoundingClientRect(); scrollTo(0, Math.max(0, scrollY + r.bottom - innerHeight)); });
    await p.waitForTimeout(40);
    const c = await center(p, '#stepBtn'); const bad = [];
    // round 5: the page may move, but only to bring the row just filled above the bar (Next step is in the fixed bar)
    const rowSeen = () => p.evaluate(() => { const a = document.querySelector('#ws tr.act'); if (!a) return true; const r = a.getBoundingClientRect(), bt = document.querySelector('#stepBtn').closest('.grp').getBoundingClientRect().top; return r.top >= -0.5 && r.bottom <= bt + 0.5; });
    for (let i = 1; i <= 10; i++){ const u = await underAt(p, c.x, c.y); await p.mouse.click(c.x, c.y); await p.waitForTimeout(15); const k = await stepNo(p); const seen = await rowSeen(); if (u !== 'stepBtn' || k !== i || !seen) bad.push(`click ${i}: ${u}, step ${k}, row seen ${seen}`); }
    check(G, `${lang}@${w}×${h} (${one ? 1 : 2} col): 10 clicks at Next step's place give steps 1–10, each new row in view above the bar`, one && bad.length === 0, bad.slice(0, 3).join('; '));
    // the ST slider dragged with the worksheet open: the value moves, the page does not
    const s0 = await p.evaluate(() => { const r = document.querySelector('#lstRange'); r.scrollIntoView({ block: 'center' }); const b = r.getBoundingClientRect(), v = +r.value; return { x: b.left + 6 + (b.width - 12) * v / 239, y: b.top + b.height / 2, sy: scrollY, lst: document.querySelector('#lstOut').textContent }; });
    await p.mouse.move(s0.x, s0.y); await p.mouse.down(); await p.mouse.move(s0.x - 20, s0.y, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(40);
    const s1 = await p.evaluate(() => ({ sy: scrollY, lst: document.querySelector('#lstOut').textContent, mid: (r => r.top + r.height / 2)(document.querySelector('#lstRange').getBoundingClientRect()) }));
    check(G, `${lang}@${w}×${h}: dragging the ST slider with the worksheet open moves the time; the slider stays under the pointer`, s1.lst !== s0.lst && Math.abs(s1.mid - s0.y) < 1, JSON.stringify({ s0, s1 }));
    await close(p);
  }
  // the walkthrough's own flow: step 5, "Open worksheet", then Next step ten times
  for (const [w, h] of [[1366, 530], [1024, 600], [1180, 600], [390, 844]]){
    const p = await fresh({ width: w, height: h }); await walkTo(p, 4); await p.click('#toWsBtn'); await p.waitForTimeout(30);
    const c = await center(p, '#stepBtn'); const hits = [];
    for (let i = 0; i < 10; i++){ hits.push(await underAt(p, c.x, c.y)); await p.mouse.click(c.x, c.y); await p.waitForTimeout(15); }
    const k = await stepNo(p);
    check(G, `${w}×${h}: step 5, Open worksheet, ten clicks at Next step: all on Next step, step 10 reached`, hits.every(x => x === 'stepBtn') && k === 10, hits.join(',') + ' → ' + k);
    await close(p);
  }
}
// P2-a: the strip holds its height within a step; the rail's controls stay under the pointer
async function r4Hold(){
  const G = 'R4-P2-a controls still in one column';
  // the rail's foot just above the bar (round 5: no blank band under the rail any more)
  const railFoot = p => p.evaluate(() => { const r = document.querySelector('.stage > .rail').getBoundingClientRect(), bt = document.querySelector('#stepBtn').closest('.grp').getBoundingClientRect().top; scrollTo(0, Math.max(0, scrollY + r.bottom - bt)); });
  // the southern example (walkthrough step 9): two nudges of the ST slider at the same point
  for (const lang of LANGS) for (const [w, h] of [[320, 568], [375, 667], [390, 844], [414, 896]]){
    const p = await fresh({ lang, width: w, height: h }); await walkTo(p, 8); await railFoot(p); await p.waitForTimeout(30);
    const s0 = await p.evaluate(() => { const r = document.querySelector('#lstRange').getBoundingClientRect(), v = +document.querySelector('#lstRange').value; return { x: r.left + 6 + (r.width - 12) * v / 239, y: r.top + r.height / 2 }; });
    const st = () => p.evaluate(() => ({ lst: document.querySelector('#lstOut').textContent, k: document.querySelector('#say .k').textContent, pressed: document.querySelector('.rail [aria-pressed="true"]').dataset.mode, walk: document.querySelector('#stepCount').textContent, rail: Math.round(document.querySelector('#lstRange').getBoundingClientRect().top * 2) / 2 }));
    const a = await st();
    await p.mouse.move(s0.x, s0.y); await p.mouse.down(); await p.mouse.move(s0.x + 3, s0.y, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(30);
    const b = await st(); const u = await underAt(p, s0.x + 3, s0.y);
    await p.mouse.move(s0.x + 3, s0.y); await p.mouse.down(); await p.mouse.move(s0.x + 6, s0.y, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(30);
    const c = await st();
    check(G, `${lang}@${w}×${h} step 9: two slider nudges at one point move the time twice; the slider, the step and the mode stay`, u === 'lstRange' && a.lst !== b.lst && b.lst !== c.lst && a.k === c.k && a.walk === c.walk && c.pressed === 'asc' && a.rail === b.rail && b.rail === c.rail, JSON.stringify({ a, b, c, u }));
    await close(p);
  }
  // Japanese ▶ thirty times, and the other steppers, at one point each
  for (const [lang, sizes] of [['ja', [[320, 568], [375, 667], [390, 844], [414, 896], [740, 360], [1024, 600]]], ['en', [[320, 568], [390, 844]]], ['de', [[375, 667], [414, 896]]]]) for (const [w, h] of sizes){
    const p = await fresh({ lang, width: w, height: h }); const bad = [];
    for (const [pre, rv, ctl, n] of [['lesson', 99, '#colNext', 30], ['lesson', 99, '#colPrev', 20], ['lesson', 22, '#rowNext', 12], ['lesson', 22, '#rowPrev', 20], ['south', 99, '#colNext', 20]]){
      await walkTo(p, pre === 'south' ? 8 : 7); if (rv === 22){ await p.click('#resetBtn'); for (let i = 0; i < 22; i++) await p.click('#stepBtn'); } else await all(p);
      await railFoot(p); await p.waitForTimeout(20);
      const c = await center(p, ctl); let prev = await p.evaluate(() => document.querySelector('#lstOut').textContent + '|' + document.querySelector('#latOut').textContent);
      for (let i = 1; i <= n; i++){ const u = await underAt(p, c.x, c.y); await p.mouse.click(c.x, c.y); await p.waitForTimeout(10);
        const now = await p.evaluate(() => document.querySelector('#lstOut').textContent + '|' + document.querySelector('#latOut').textContent);
        if (u !== ctl.slice(1)){ bad.push(`${pre} ${ctl} tap ${i}: hit ${u}`); break; }
        if (now === prev && !/rowNext/.test(ctl)) { bad.push(`${pre} ${ctl} tap ${i}: nothing moved`); break; } prev = now; }
    }
    check(G, `${lang}@${w}×${h}: ▶ ×30, ◀ ×20, ▲ ×12, ▼ ×20, south ▶ ×20, each at one point, every tap on its button`, bad.length === 0, bad.join('; '));
    await close(p);
  }
  // no hidden copies of the strip are made on a render (a slider drag was 1.8× slower with them)
  const p = await fresh({ width: 375, height: 667 });
  const added = await p.evaluate(() => { let n = 0; const mo = new MutationObserver(ms => { for (const m of ms) for (const x of m.addedNodes) if (x.nodeType === 1 && (x.matches('.say') || x.querySelector && x.querySelector('.say'))) n++; }); mo.observe(document.body, { childList: true, subtree: true });
    const r = document.querySelector('#lstRange'); for (let i = 0; i < 60; i++){ r.value = String(i * 3 % 240); r.dispatchEvent(new Event('input', { bubbles: true })); } mo.disconnect(); return n; });
  check(G, '375×667: 60 slider moves render no hidden copy of the strip', added === 0, added);
  await close(p);
}
// P2-b: the value slots are as wide as their content; one rail height in every mode; Next step at one place in every mode
async function r4Rail(){
  const G = 'R4-P2-b rail across modes';
  for (const lang of ['en', 'de', 'fr', 'ja']){
    const p = await fresh({ lang, width: 1024, height: 768 });
    for (const [w, h] of [[1024, 768], [1180, 820], [1280, 720], [1280, 800], [1366, 768], [1440, 900], [1536, 864], [1920, 1080]]){
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(30);
      const nexts = [], rails = [];
      for (const m of ['mc', 'asc', 'planet']){
        await mode(p, m);
        nexts.push(await p.$eval('#stepBtn', b => { const r = b.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top); }));
        rails.push(await p.$eval('.stage > .rail', r => Math.round(r.getBoundingClientRect().height)));
      }
      // round 5: the rail keeps its tallest mode's height in every mode (railFit)
      check(G, `${lang}@${w}×${h}: Next step at one place in MC, ASC and Planet (${nexts[0]}); one rail height (${rails.join('/')})`, new Set(nexts).size === 1 && new Set(rails).size === 1, `Next ${nexts.join(' | ')}; rail ${rails.join('/')}`);
    }
    // the slots: the times exactly their text; the latitude as wide as 00° 00′ 00″ N, measured here in the same font
    const sl = await p.evaluate(() => { const tw = el => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
      const lat = document.querySelector('#latOut'), probe = lat.cloneNode(false); probe.removeAttribute('id'); probe.style.cssText = 'position:absolute;visibility:hidden;min-width:0'; probe.textContent = '00° 00′ 00″ N'; lat.parentNode.appendChild(probe); const widest = probe.getBoundingClientRect().width; probe.remove();
      state.mode = 'asc'; render(); const lst = document.querySelector('#lstOut');
      return { lst: [lst.getBoundingClientRect().width, tw(lst)], lat: [lat.getBoundingClientRect().width, widest, tw(lat)] }; });
    check(G, `${lang}: the LST slot is its text's width, the latitude slot the widest latitude's`, Math.abs(sl.lst[0] - sl.lst[1]) < 1 && Math.abs(sl.lat[0] - Math.max(sl.lat[1], sl.lat[2])) < 1, JSON.stringify(sl));
    // ▲ ▼ through one- and two-digit latitudes: the rail keeps its height
    await p.setViewportSize({ width: 1280, height: 720 }); await mode(p, 'asc'); await setFields(p, { latD: 3, latM: 0, latS: 0 }); await tab(p, 'tabWalk');
    const hs = new Set(); for (let i = 0; i < 12; i++){ hs.add(await p.$eval('.stage > .rail', r => Math.round(r.getBoundingClientRect().height))); await p.click('#rowNext'); }
    check(G, `${lang}@1280×720: ▲ from 3° to 60°: one rail height`, hs.size === 1, [...hs].join('/'));
    await close(p);
  }
}
// the bar: fixed, covering nothing that cannot be scrolled out from under it, never over a focused control
async function r4Bar(){
  const G = 'R4 the step bar';
  for (const [w, h] of [[320, 568], [390, 844], [740, 360], [1024, 600], [1366, 530], [1920, 400]]) for (const lang of ['en', 'es', 'ja']){
    const p = await fresh({ lang, width: w, height: h }); await walkTo(p, 7);
    const r = await p.evaluate(async () => { const raf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const bar = document.querySelector('#stepBtn').closest('[role=group]'), nb = () => { const b = document.querySelector('#stepBtn').getBoundingClientRect(); return Math.round(b.top) + ',' + Math.round(b.left); };
      const out = { fixed: getComputedStyle(bar).position, spots: new Set(), inView: [] };
      for (const y of [0, 0.5, 1]){ scrollTo(0, y * (document.documentElement.scrollHeight - innerHeight)); await raf(); out.spots.add(nb()); const b = document.querySelector('#stepBtn').getBoundingClientRect(); out.inView.push(b.top >= 0 && b.bottom <= innerHeight); }
      const bt = bar.getBoundingClientRect(); out.barH = Math.round(bt.height); out.oneLine = Math.max(...Array.from(bar.children).map(c => c.getBoundingClientRect().top)) - Math.min(...Array.from(bar.children).map(c => c.getBoundingClientRect().top)) < 1;
      out.fits = Array.from(bar.children).every(c => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; });
      // at the end of the page the last content is above the bar
      const last = Array.from(document.querySelectorAll('.side .pane:not([hidden]) *')).filter(e => e.getBoundingClientRect().height > 0).map(e => e.getBoundingClientRect().bottom); out.lastAbove = Math.max(...last) <= bt.top + 0.5;
      // the rail can be scrolled whole above the bar: its foot at the bar's top, every rail control above the bar
      const rail = document.querySelector('.stage > .rail'); scrollTo(0, scrollY + rail.getBoundingClientRect().bottom - bar.getBoundingClientRect().top); await raf();
      const tb = bar.getBoundingClientRect().top; out.railClear = Array.from(rail.querySelectorAll('button,input')).filter(e => !bar.contains(e) && e.getBoundingClientRect().height > 0 && !e.closest('[hidden]')).every(e => e.getBoundingClientRect().bottom <= tb + 0.5);
      out.anim = getComputedStyle(bar).animationName + '/' + getComputedStyle(bar).transitionDuration;
      out.spots = out.spots.size; return out; });
    check(G, `${lang}@${w}×${h}: Next step fixed and in view at top, middle and end of the page; bar on one line, ${r.barH} px; the page ends above it; the rail scrolls whole above it`, r.fixed === 'fixed' && r.spots === 1 && r.inView.every(Boolean) && r.oneLine && r.fits && r.barH <= 60 && r.lastAbove && r.railClear, JSON.stringify(r));
    await close(p);
  }
  // keyboard: a focused control is never left under the bar (a region taller than the space excepted)
  for (const [w, h] of [[390, 844], [320, 568], [1024, 600]]) for (const dir of ['Tab', 'Shift+Tab']){
    const p = await fresh({ width: w, height: h }); await tab(p, 'tabWs'); if (dir === 'Shift+Tab') await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const bad = []; let n = 0;
    for (let i = 0; i < 80; i++){ await p.keyboard.press(dir); await p.waitForTimeout(15);
      const r = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const bar = document.querySelector('#stepBtn').closest('[role=group]'); const bt = bar.getBoundingClientRect().top, rr = e.getBoundingClientRect();
        return { id: e.id || e.tagName, inBar: bar.contains(e), top: rr.top, bottom: rr.bottom, bt, h: rr.height, room: bt }; });
      if (!r || !r.h) continue; n++; if (!r.inBar && r.h < r.room && (r.bottom > r.bt + 0.5 || r.top < -0.5)) bad.push(`${r.id} ${Math.round(r.top)}–${Math.round(r.bottom)} (bar at ${Math.round(r.bt)})`); }
    check(G, `${w}×${h} ${dir}: ${n} focus stops, none under the bar`, n > 40 && bad.length === 0, bad.slice(0, 4).join(' | '));
    await close(p);
  }
  // two columns: no bar, the steps stay in the rail
  const p = await fresh({ width: 1440, height: 900 });
  const r = await p.evaluate(() => ({ pos: getComputedStyle(document.querySelector('#stepBtn').closest('[role=group]')).position, inRail: !!document.querySelector('#stepBtn').closest('.rail'), pad: getComputedStyle(document.body).paddingBottom }));
  check(G, '1440×900 (two columns): Start over, Next step and All in the rail as before, no bar, no padding', r.pos === 'static' && r.inRail && r.pad === '0px', JSON.stringify(r));
  await close(p);
}
// print from one column: no reserved height, no bar, no padding
async function r4Print(){
  const G = 'R4 print from one column';
  for (const [w, h, lang] of [[375, 667, 'en'], [390, 844, 'de'], [320, 568, 'ja'], [1024, 600, 'en']]){
    const p = await fresh({ lang, width: w, height: h }); await walkTo(p, 7);
    await p.evaluate(() => { const r = document.querySelector('#lstRange'); for (const d of [-1, -2, -3]){ r.value = String(+r.value + d); r.dispatchEvent(new Event('input', { bubbles: true })); } });
    await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(40);
    const r = await p.evaluate(() => { const s = document.querySelector('#say'), cs = getComputedStyle(s), t = (s.querySelector('.tv') || s.querySelector('.t') || s).getBoundingClientRect(), b = s.getBoundingClientRect();
      return { minH: cs.minHeight, blank: Math.round(b.bottom - t.bottom - parseFloat(cs.paddingBottom)), bar: getComputedStyle(document.querySelector('#stepBtn').closest('[role=group]')).position, pad: getComputedStyle(document.body).paddingBottom }; });
    check(G, `${lang}@${w}×${h}, walkthrough step 8 after three slider moves: printed strip without a blank box, bar and padding gone`, r.minH === '0px' && r.blank <= 2 && r.bar === 'static' && r.pad === '0px', JSON.stringify(r));
    await p.pdf({ path: path.join(__dirname, 'r4', `print-${lang}-${w}x${h}.pdf`), format: 'Letter', printBackground: true });
    await close(p);
  }
}
// notes: a typed change leaves the other fields' notes standing
async function r4Notes(){
  const G = 'R4 notes stand until their own value changes';
  const typeIn = async (p, id, v) => { await p.click('#' + id, { clickCount: 3 }); await p.keyboard.press('Control+A'); await p.keyboard.type(v); await p.keyboard.press('Enter'); await p.waitForTimeout(20); };
  const note = async p => S(await txt(p, '#inote'));
  const p = await fresh({ width: 1280, height: 800 }); await tab(p, 'tabWs');
  await typeIn(p, 'latD', '75'); const a = await note(p);
  await typeIn(p, 'lstM', '12.5'); const b = await note(p);
  check(G, 'latitude 75, then LST minutes 12.5: both notes, the latitude still 60°', /60°/.test(a) && /60°/.test(b) && /12\.5/.test(b), `${a} | ${b}`);
  await p.selectOption('#langSel', 'de'); await p.waitForTimeout(30); const c = await note(p);
  check(G, '… both said again in German', /60°/.test(c) && /12,5/.test(c) && c !== b, c);
  await p.click('#rowPrev'); const d = await note(p);
  check(G, '▼ moves the latitude: its note goes, the LST note stays', !/60°/.test(d) && /12,5/.test(d), d);
  await typeIn(p, 'lstM', '14.5'); const e = await note(p);
  check(G, 'LST minutes typed again as 14.5: one LST note, the new one', /14,5/.test(e) && !/12,5/.test(e), e);
  await typeIn(p, 'oblD', '30'); const f = await note(p);
  check(G, 'obliquity 30: its note joins; the LST note (LST unchanged) stays', /22°/.test(f) && /14,5/.test(f), f);
  await typeIn(p, 'latD', '50'); const g = await note(p);
  check(G, 'latitude 50 (no problem): the two standing notes stay, their values unchanged', /22°/.test(g) && /14,5/.test(g), g);
  await mode(p, 'planet'); const h = await note(p);
  check(G, 'Planet puts the native\'s fields away: their notes go', h === '', h);
  await p.selectOption('#langSel', 'ja'); await mode(p, 'asc'); await tab(p, 'tabWs'); await typeIn(p, 'latD', '75'); await typeIn(p, 'lstM', '12.5'); const j = await note(p);
  check(G, 'Japanese: two notes joined without a space between them', /。「/.test(j) || /。[^ ]/.test(j), j);
  await close(p);
}

// ================================================================ R5: round 5 — presets and mode buttons stay under the finger
// P2-1: controls in the side panel (presets, the walkthrough's Back and Next) stay under the finger in one column
async function r5Side(){
  const G = 'R5-P2-1 side-panel controls still';
  for (const lang of ['en', 'de', 'ja']){
    const p = await fresh({ lang, width: 390, height: 844 });
    for (const [w, h] of [[360, 640], [390, 844], [414, 896], [768, 1024], [810, 1080]]){
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(40);
      let taps = 0, moved = 0; const lost = {}, where = [];
      const tapAt = async (tab, setup, sel) => {
        await p.evaluate(([tab, setup, sel]) => { document.getElementById(tab).click(); if (setup.walk !== undefined) showWalk(setup.walk); else { state.mode = setup.mode; PRESETS[setup.mode === 'planet' ? 'sun' : 'lesson'](); state.reveal = setup.reveal; setNote(); render(); }
          const r = document.querySelector(sel).getBoundingClientRect(); scrollTo(0, scrollY + r.top - innerHeight * 0.55); }, [tab, setup, sel]);
        await p.waitForTimeout(30);
        const b = await p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top }; });
        await p.mouse.click(b.x, b.y); await p.waitForTimeout(30);
        const a = await p.evaluate(([sel, x, y]) => { const e = document.elementFromPoint(x, y), k = e && e.closest('button,input,select,[role=tab]'); return { top: document.querySelector(sel).getBoundingClientRect().top, same: !!k && k === document.querySelector(sel), under: k ? (k.id || k.dataset.preset || k.tagName) : 'none', tab: !!(k && k.getAttribute('role') === 'tab') }; }, [sel, b.x, b.y]);
        taps++; if (Math.abs(a.top - b.top) > 0.5) moved++; if (!a.same) lost[a.under] = (lost[a.under] || 0) + 1;
        if (Math.abs(a.top - b.top) > 0.5 || !a.same) where.push(`${sel} ${JSON.stringify(setup)} ${(a.top - b.top).toFixed(1)}px`);
      };
      for (const [m, rv] of [['asc', 0], ['asc', 4], ['mc', 0], ['mc', 6], ['planet', 0], ['planet', 3]]) for (const pr of (m === 'planet' ? ['sun', 'saturn'] : ['lesson', 'south'])) await tapAt('tabWs', { mode: m, reveal: rv }, `[data-preset=${pr}]`);
      for (let i = 0; i < 10; i++){ await tapAt('tabWalk', { walk: i }, '#nextBtn'); await tapAt('tabWalk', { walk: i + 1 }, '#prevBtn'); }
      check(G, `${lang}@${w}×${h}: ${taps} taps on presets and on Back/Next: none moves its control, a second tap lands on it`, moved === 0 && Object.keys(lost).length === 0, `moved ${moved}; ${JSON.stringify(lost)}; ${where.join('; ')}`);
    }
    await close(p);
  }
  // typing a value and pressing Enter keeps the field under the finger (the strip above grows or shrinks)
  const p = await fresh({ width: 390, height: 844 }); await tab(p, 'tabWs'); await all(p);
  const f = await p.evaluate(() => { const e = document.getElementById('latD'); e.scrollIntoView({ block: 'center' }); return e.getBoundingClientRect().top; });
  await p.click('#latD', { clickCount: 3 }); await p.keyboard.press('Control+A'); await p.keyboard.type('59'); await p.keyboard.press('Enter'); await p.waitForTimeout(30);
  const f2 = await p.$eval('#latD', e => e.getBoundingClientRect().top);
  check(G, '390×844: latitude typed and Enter: the field stays where it was', Math.abs(f2 - f) <= 0.5, `${f} → ${f2}`);
  await close(p);
}
// P2-2: one column: a mode change moves no mode button, at every scroll position where it can be tapped
async function r5Modes(){
  const G = 'R5-P2-2 mode buttons still in one column';
  for (const lang of ['en', 'ja', 'de']) for (const [w, h] of [[360, 640], [390, 844], [430, 932], [768, 1024], [810, 1080], [820, 1180], [1024, 600], [740, 360]]) for (const tabId of ['tabWalk', 'tabWs']){
    const p = await fresh({ lang, width: w, height: h }); await tab(p, tabId);
    const r = await p.evaluate(() => { let n = 0, moved = 0, mx = 0; const ex = [];
      for (const [from, to] of [['asc', 'mc'], ['asc', 'planet'], ['mc', 'asc'], ['planet', 'asc'], ['mc', 'planet'], ['planet', 'mc']]){
        const setup = () => { state.mode = from; PRESETS[from === 'planet' ? 'sun' : 'lesson'](); state.reveal = 0; setNote(); render(); };
        setup(); const e = document.querySelector(`.rail [data-mode=${to}]`); const r0 = e.getBoundingClientRect(), bt = document.querySelector('#stepBtn').closest('.grp').getBoundingClientRect().top;
        const lo = Math.max(0, scrollY + r0.bottom - bt + 2), hi = Math.min(document.documentElement.scrollHeight - innerHeight, scrollY + r0.top - 2);
        for (let y = lo; y <= hi + 0.1; y += 10){ setup(); scrollTo(0, y); const t0 = e.getBoundingClientRect().top; e.click(); const d = e.getBoundingClientRect().top - t0; n++; if (Math.abs(d) > 0.5){ moved++; mx = Math.max(mx, Math.abs(d)); if (ex.length < 3) ex.push(`${from}→${to} at ${Math.round(y)}: ${d.toFixed(1)}`); } }
      }
      return { n, moved, mx, ex }; });
    check(G, `${lang}@${w}×${h} ${tabId === 'tabWs' ? 'Worksheet' : 'Walkthrough'} open: ${r.n} mode taps over every scroll position: the tapped button never moves`, r.n > 20 && r.moved === 0, `${r.moved} moved, max ${r.mx.toFixed(1)} px: ${r.ex.join('; ')}`);
    await close(p);
  }
  // a real finger: tap Midheaven, then again at the same point, near the top of the page
  for (const [w, h] of [[390, 844], [810, 1080]]){
    const p = await fresh({ width: w, height: h }); const bad = [];
    for (const y of [0, 60, 120]){
      await p.evaluate(y => { state.mode = 'asc'; PRESETS.lesson(); state.reveal = 0; render(); scrollTo(0, y); }, y); await p.waitForTimeout(30);
      const c = await center(p, '.rail [data-mode="mc"]'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(30);
      const u = await underAt(p, c.x, c.y); if (u !== 'mc') bad.push(`from ${y}: then under the finger ${u}`);
    }
    check(G, `${w}×${h}: Ascendant → Midheaven from the page's top: the finger is still on Midheaven`, bad.length === 0, bad.join('; '));
    await close(p);
  }
}
// P3-1: a large default font: the bar wraps, every button on screen, the page's end room follows the bar's height
async function r5Font(){
  const G = 'R5-P3-1 large default font, narrow screens';
  for (const [lang, std, w, h] of [['es', 24, 320, 568], ['es', 20, 320, 568], ['fr', 24, 320, 568], ['en', 24, 320, 568], ['es', 24, 390, 844], ['es', 16, 260, 568], ['en', 16, 260, 568], ['de', 16, 260, 568], ['ja', 24, 320, 568]]){
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'en-US', isMobile: true, hasTouch: true }); const p = await ctx.newPage();
    await ctx.addInitScript(l => localStorage.setItem('dah.lang', l), lang);
    const cdp = await ctx.newCDPSession(p); await cdp.send('Page.setFontSizes', { fontSizes: { standard: std, fixed: Math.round(std * 13 / 16) } });
    await p.goto(PAGE); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    const r = await p.evaluate(() => { const g = document.querySelector('#stepBtn').closest('.grp'), bh = g.getBoundingClientRect().height, vw = document.documentElement.clientWidth;
      const btns = Array.from(g.querySelectorAll('.btn')).map(b => { const r = b.getBoundingClientRect(); return r.left >= -0.5 && r.right <= vw + 0.5 && r.top >= 0 && r.bottom <= innerHeight + 0.5; });
      return { btns, bh: +bh.toFixed(1), pad: parseFloat(getComputedStyle(document.body).paddingBottom), sp: parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom), vw, sw: document.documentElement.scrollWidth, iw: innerWidth }; });
    check(G, `${lang}, default font ${std} px, ${w}×${h}: all three bar buttons whole on screen; page end room and focus margin = bar height (${r.bh} px); no sideways page`, r.btns.every(Boolean) && Math.abs(r.pad - r.bh) < 0.6 && Math.abs(r.sp - r.bh) < 0.6 && r.sw <= r.vw && r.iw === w, JSON.stringify(r));
    await ctx.close();
  }
}
// P3-2: one column, Worksheet open: each row Next step fills comes into view above the bar
async function r5Follow(){
  const G = 'R5-P3-2 the row being filled in view';
  for (const [w, h] of [[390, 844], [375, 667], [768, 1024], [740, 360], [1366, 530]]) for (const [m, pr] of [['asc', 'lesson'], ['mc', 'south'], ['planet', 'saturn']]){
    const p = await fresh({ width: w, height: h }); await tab(p, 'tabWs'); await mode(p, m); await preset(p, pr); await p.click('#resetBtn');
    await p.evaluate(() => { const t = document.querySelector('#ws').getBoundingClientRect(); scrollTo(0, scrollY + t.top - 60); }); await p.waitForTimeout(30);
    const c = await center(p, '#stepBtn'); let n = 0; const bad = [];
    for (let i = 0; i < 30 && !(await p.$eval('#stepBtn', b => b.disabled)); i++){
      await p.mouse.click(c.x, c.y); await p.waitForTimeout(15); n++;
      const r = await p.evaluate(() => { const a = document.querySelector('#ws tr.act'); if (!a) return null; const r = a.getBoundingClientRect(), bt = document.querySelector('#stepBtn').closest('.grp').getBoundingClientRect().top; return { top: r.top, bottom: r.bottom, bt, n: a.querySelector('td.n').textContent }; });
      if (r && (r.top < -0.5 || r.bottom > r.bt + 0.5)) bad.push(`row ${r.n}: ${Math.round(r.top)}–${Math.round(r.bottom)}, bar ${Math.round(r.bt)}`);
    }
    const c2 = await center(p, '#stepBtn');
    check(G, `${w}×${h} ${m}/${pr}: ${n} presses, every new row whole above the bar; Next step never moved`, n > 5 && bad.length === 0 && c2.x === c.x && c2.y === c.y, bad.slice(0, 3).join('; '));
    await close(p);
  }
}
// P3-3: the value slots hold their widest text: crossing 10° or changing N/S never re-wraps the rail
async function r5Slots(){
  const G = 'R5-P3-3 value slots';
  for (const [lang, ws] of [['en', [1145, 1841, 1024, 1440]], ['ja', [379, 1180]], ['de', [700, 1280]], ['fr', [1366]]]){
    const p = await fresh({ lang, width: 1440, height: 900 });
    for (const w of ws){
      await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(30);
      const r = await p.evaluate(() => { state.mode = 'asc'; PRESETS.lesson(); state.reveal = 0; render(); const out = [];
        for (const [lat, hemi] of [[9*3600 + 59*60 + 59, 1], [10*3600, 1], [44*3600 + 58*60 + 48, 1], [44*3600 + 58*60 + 48, -1], [60*3600, 1], [5*3600, -1]]){ state.latSec = lat; state.hemi = hemi; state.loHint = null; render();
          out.push([document.getElementById('latOut').getBoundingClientRect().width.toFixed(2), document.querySelector('.stage > .rail').getBoundingClientRect().height.toFixed(1)].join('/')); }
        for (const lst of [0, 11*3600 + 11*60 + 11, 23*3600 + 59*60 + 59, 10*3600 + 8*60]){ state.lst = lst; render(); out.push(document.getElementById('lstOut').getBoundingClientRect().width.toFixed(2) + '/' + document.querySelector('.stage > .rail').getBoundingClientRect().height.toFixed(1)); }
        return out; });
      const lat = new Set(r.slice(0, 6)), lst = new Set(r.slice(6));
      check(G, `${lang}@${w}: the latitude slot and the rail keep one size from 5° S to 60° N; the LST slot one size from 00:00:00 to 23:59:59`, lat.size === 1 && lst.size === 1, r.join(' | '));
    }
    await close(p);
  }
}
// P3-4: two columns: a mode switch never moves the tapped button
async function r5TwoModes(){
  const G = 'R5-P3-4 two columns, mode taps';
  const moves = async url => { const out = new Set(); let n = 0;
    for (const lang of LANGS){
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await ctx.addInitScript(l => localStorage.setItem('dah.lang', l), lang); await p.goto(url); await p.evaluate(() => document.fonts.ready);
      for (const [w, h] of [[981, 640], [1024, 768], [1180, 620], [1180, 820], [1280, 540], [1280, 720], [1280, 800], [1366, 768], [1440, 900], [1536, 864], [1680, 1050], [1920, 1080]]){
        await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(20);
        const r = await p.evaluate(() => { const o = []; for (const from of ['asc', 'mc', 'planet']) for (const to of ['asc', 'mc', 'planet']){ if (from === to) continue; state.mode = from; state.reveal = 0; render(); const b = document.querySelector(`.rail [data-mode=${to}]`); const t0 = b.getBoundingClientRect().top; b.click(); o.push(Math.abs(b.getBoundingClientRect().top - t0) > 0.5 ? `${from}>${to}` : ''); } return o; });
        r.forEach(x => { n++; if (x) out.add(`${lang} ${w}x${h} ${x}`); });
      }
      await ctx.close();
    }
    return { out, n }; };
  const cur = await moves(PAGE);
  check(G, `${cur.n} mode taps in two columns: none moves the tapped button by more than 0.5 px`, cur.out.size === 0, [...cur.out].slice(0, 6).join('; '));
}
// P3-5: a mode tap during a smooth scroll lets the scroll finish, then moves on by the tap's shift
async function r5Smooth(){
  const G = 'R5-P3-5 smooth scroll kept';
  for (const [sel, label] of [['.rail [data-mode="asc"]', 'Ascendant (content above changes)'], ['#colNext', '▶ (nothing above changes)']]){
    const p = await fresh({ width: 390, height: 844 });
    const r = await p.evaluate(async sel => { state.mode = 'mc'; PRESETS.lesson(); state.reveal = 0; render(); scrollTo(0, 100);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      // tap once the smooth scroll is under way (under load its first frame can come late)
      const b = document.querySelector(sel); scrollTo({ top: 600, behavior: 'smooth' }); for (let i = 0; i < 100 && scrollY < 130; i++) await new Promise(r => requestAnimationFrame(r));
      const t0 = b.getBoundingClientRect().top; b.click(); const d = b.getBoundingClientRect().top - t0;
      await new Promise(r => setTimeout(r, 1200)); return { d, final: scrollY, max: document.documentElement.scrollHeight - innerHeight }; }, sel);
    const want = Math.min(r.max, 600 + r.d);
    check(G, `390×844, ${label} tapped mid-scroll: the scroll reaches its target (600) moved on by the tap's shift (${r.d.toFixed(1)})`, Math.abs(r.final - want) <= 1, JSON.stringify(r));
    await close(p);
  }
}
// P3-6, P3-7, P3-8: no band under the rail; a valid value clears its field's note; print arranges the rail as two columns do
async function r5Misc(){
  const G6 = 'R5-P3-6 no band under the rail', G7 = 'R5-P3-7 a field\'s note', G8 = 'R5-P3-8 printed rail';
  for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1366, 530]]){
    const p = await fresh({ width: w, height: h });
    const band = await p.evaluate(() => Math.round(document.querySelector('.tabs').getBoundingClientRect().top - Math.max(...Array.from(document.querySelectorAll('.stage > .rail .grp:not(.steps)')).filter(e => e.offsetParent).map(e => e.getBoundingClientRect().bottom))));
    check(G6, `${w}×${h}: from the rail's last control to the tabs ${band} px (the rail's own padding, no band)`, band <= 16, band);
    await close(p);
  }
  const typeIn = async (p, id, v) => { await p.click('#' + id, { clickCount: 3 }); await p.keyboard.press('Control+A'); await p.keyboard.type(v); await p.keyboard.press('Enter'); await p.waitForTimeout(20); };
  const p = await fresh({ width: 390, height: 844 }); await tab(p, 'tabWs');
  await typeIn(p, 'lstH', '30'); const a = S(await txt(p, '#inote')); await typeIn(p, 'lstH', '17'); const b = S(await txt(p, '#inote'));
  await typeIn(p, 'latD', '75'); await typeIn(p, 'lstM', '39.4'); const c = S(await txt(p, '#inote')); await typeIn(p, 'lstM', '39'); const d = S(await txt(p, '#inote'));
  check(G7, 'LST hours 30 → note; 17 typed (the value kept) → the note goes', /23/.test(a) && b === '', `${a} | ${b}`);
  check(G7, 'LST minutes 39.4 → rounding note beside the latitude note; 39 typed → only that note goes', /39[.,]4/.test(c) && /60°/.test(c) && !/39[.,]4/.test(d) && /60°/.test(d), `${c} | ${d}`);
  await close(p);
  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]){
    const q = await fresh({ width: w, height: h }); await q.emulateMedia({ media: 'print' }); await q.waitForTimeout(40);
    const r = await q.evaluate(() => { const rail = document.querySelector('.stage > .rail').getBoundingClientRect(), g = document.querySelector('#stepBtn').closest('.grp').getBoundingClientRect(), pad = parseFloat(getComputedStyle(document.querySelector('.stage > .rail')).paddingRight);
      return { gap: Math.round(rail.right - pad - g.right), spacer: getComputedStyle(document.querySelector('.rail .spacer')).display, pos: getComputedStyle(document.querySelector('#stepBtn').closest('.grp')).position }; });
    check(G8, `${w}×${h} printed: Start over, Next step and All at the rail's right end after its spacer, not in a bar`, r.gap <= 1 && r.spacer !== 'none' && r.pos === 'static', JSON.stringify(r));
    await close(q);
  }
}

// ================================================================ R6: the hostile review of e082ded
async function r6Review(){
  const G3 = 'R6-H3 a warning on values in force', G4 = 'R6-H4 obliquity typed field by field', G5 = 'R6-H5 a saved language', G6 = 'R6 a mode tap after a resize';
  const typeIn = async (p, id, v, key) => { await p.click('#' + id, { clickCount: 3 }); await p.keyboard.press('Control+A'); await p.keyboard.type(v); await p.keyboard.press(key); await p.waitForTimeout(30); };
  const note = async p => S(await txt(p, '#inote'));
  // H3: 0° Aries at the first midnight, 0° Taurus at the next: the warning stays through Planet → Ascendant → Planet
  const FAST = { en: /at most about 15°/, ja: /15° ほど/ };
  for (const lang of ['en', 'ja']){
    const p = await fresh({ lang });
    await mode(p, 'planet'); await setFields(p, { p0G: 0, p0D: 0, p0M: 0, p0S: 0, p1G: 1, p1D: 0, p1M: 0, p1S: 0 });
    const a = await note(p); await mode(p, 'asc'); const b = await note(p); await mode(p, 'planet'); const c = await note(p);
    const vals = await p.evaluate(() => ['p0G', 'p0D', 'p1G', 'p1D'].map(id => document.getElementById(id).value).join(' '));
    check(G3, `${lang}: 0° ♈ → 0° ♉ warns; Ascendant hides the warning with the planet's fields; back in Planet it is said again, the positions unchanged`, FAST[lang].test(a) && !FAST[lang].test(b) && FAST[lang].test(c) && vals === '0 0 1 0', `${a} | ${b} | ${c} | ${vals}`);
    await all(p); const d = await note(p);
    await setFields(p, { p1G: 0, p1D: 1 }); const e = await note(p); await setFields(p, { p1G: 1, p1D: 0 }); const f = await note(p);
    check(G3, `${lang}: All keeps it; a plausible pair (1°) clears it; the implausible pair again brings it back`, FAST[lang].test(d) && !FAST[lang].test(e) && FAST[lang].test(f), `${d} | ${e} | ${f}`);
    await close(p);
  }
  // H4: from the lesson's 23° 26′ 54″, the fields typed in their order, each committed on its own (Tab, then Enter)
  for (const key of ['Tab', 'Enter']) for (const [want, seq] of [['25 0 0', [['oblD', '25'], ['oblM', '0'], ['oblS', '0']]], ['22 0 0', [['oblD', '22'], ['oblM', '0'], ['oblS', '0']]], ['24 30 0', [['oblD', '24'], ['oblM', '30'], ['oblS', '0']]]]){
    const p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson');
    for (const [id, v] of seq) await typeIn(p, id, v, key);
    const got = await p.$$eval('#oblD,#oblM,#oblS', es => es.map(e => e.value).join(' ')), used = await p.evaluate(() => state.oblSec);
    const [d, m, s] = want.split(' ').map(Number);
    check(G4, `23° 26′ 54″ → ${want.replace(/ /g, '/')} typed degrees first, each field committed by ${key}: the fields and the value used both read ${d}° ${m}′ ${s}″`, got === want && used === (d * 60 + m) * 60 + s, `${got} | ${used}`);
    await close(p);
  }
  { const p = await fresh(); await mode(p, 'asc'); await preset(p, 'lesson'); await typeIn(p, 'oblD', '21', 'Enter');
    const got = await p.$$eval('#oblD,#oblM,#oblS', es => es.map(e => e.value).join(' ')), n = await note(p);
    check(G4, '21° typed: set to the nearer limit, 22° 00′ 00″, and the note says the range', got === '22 0 0' && /22°.*25°/.test(n), `${got} | ${n}`); await close(p); }
  // H5: a saved preference that is not one of the page's languages, even a name every object inherits, falls back
  for (const [key, v] of [['dah.lang', 'constructor'], ['dah.lang', 'toString'], ['dah.lang', '__proto__'], ['dah.lang', 'hasOwnProperty'], ['sayyid.lang', 'valueOf'], ['dah.lang', 'xx']]){
    const before = consoleErrors.length; const p = await fresh({ lang: null, storage: { [key]: v } });
    const r = await p.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, sel: document.querySelector('#langSel').value, rows: document.querySelectorAll('#ws tr').length }));
    const errs = consoleErrors.slice(before);
    check(G5, `${key} = "${v}": the page starts in English, with no error`, r.lang === 'en' && r.sel === 'en' && r.title === 'Between the Lines' && r.rows > 0 && errs.length === 0, JSON.stringify(r) + ' ' + errs.join(' | '));
    consoleErrors.length = before;   // counted here, not again under G5 console
    await close(p);
  }
  // the resize risk: the first mode tap after a resize, in two columns, moves no mode button
  const moved = [];
  for (const lang of ['en', 'de', 'ja']) for (const [[w0, h0], [w1, h1]] of [[[1440, 900], [981, 640]], [[1440, 900], [1180, 820]], [[1024, 768], [1366, 768]], [[1920, 1080], [1280, 720]], [[1280, 800], [1536, 864]]]){
    for (const to of ['mc', 'planet']){
      const p = await fresh({ lang, width: w0, height: h0 }); await mode(p, 'asc');
      await p.setViewportSize({ width: w1, height: h1 }); await p.waitForTimeout(250);
      const d = await p.evaluate(to => { const b = document.querySelector(`.rail [data-mode=${to}]`); const t0 = b.getBoundingClientRect().top; b.click(); return b.getBoundingClientRect().top - t0; }, to);
      if (Math.abs(d) > 0.5) moved.push(`${lang} ${w0}×${h0}→${w1}×${h1} asc>${to} ${d.toFixed(1)}`);
      await close(p);
    }
  }
  check(G6, '30 first taps after a resize (3 languages × 5 resizes × 2 modes, two columns): no mode button moves by more than 0.5 px', moved.length === 0, moved.slice(0, 6).join('; '));
}

// ================================================================ R7: the review of b8fe9bb
// BTL-1: the direct MC's working must evaluate to its own result: row 16 is arctan(tan RAMC ÷ cos OE) as a calculator gives
// it, and the next row adds the quadrant correction once. Expected values: the arctangent computed here, from the LST and
// obliquity typed in; nothing is read from the page but the rows themselves.
async function r7Review(){
  const G = 'R7-BTL-1 direct MC working';
  const arctanSec = (lstSec, oblSec) => { const r = lstSec / 240 * D, e = oblSec / 3600 * D; return Math.round(Math.atan(Math.tan(r) / Math.cos(e)) / D * 3600); };
  const cases = [['the lesson (LST 17:39:47, correction 180°)', null, 63587, 180, LANGS],
                 ['LST 03:00:00 (correction 0)', { lstH: 3, lstM: 0, lstS: 0 }, 10800, 0, ['en', 'ja']],
                 ['LST 11:00:00 (correction 180°)', { lstH: 11, lstM: 0, lstS: 0 }, 39600, 180, ['en', 'ja']],
                 ['LST 21:00:00 (correction 360°)', { lstH: 21, lstM: 0, lstS: 0 }, 75600, 360, ['en', 'ja']]];
  for (const [label, fields, lst, corr, langs] of cases){
    const bad = [];
    for (const lang of langs){
      const p = await fresh({ lang }); await mode(p, 'mc'); await preset(p, 'lesson');
      if (fields) { await setFields(p, fields); await all(p); }
      const r = await ws(p), i = r.findIndex(x => x.n === '16'), r16 = r[i], next = r[i + 1];
      const v16 = dms(r16.value), m = next && next.label.match(/16(?:\s*\+\s*(\d+)°)?\s*$/), shown = m ? +(m[1] || 0) : NaN, vD = next ? dms(next.value) : NaN;
      const want16 = arctanSec(lst, 84414);
      if (!(v16 === want16 && !/\+/.test(r16.value) && shown === corr && v16 + corr * 3600 === vD))
        bad.push(`${lang}: row 16 "${r16.value}" (want ${want16 >= 0 ? '' : '−'}${fmt(Math.abs(want16))}), next "${next && next.label}" = "${next && next.value}"`);
      await close(p);
    }
    check(G, `${label}, ${langs.length === LANGS.length ? `all ${LANGS.length} languages` : langs.join(' and ')}: row 16 is the arctangent alone (independently computed), and the next row adds the correction once, giving its own value`, bad.length === 0, bad.join(' | '));
  }
}

(async () => {
  const GROUPS = [g1, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12, f13, f14, b1, storage, layout, randomStates, r2Notes, r2Gap, r2Planet, r2Misc, r2Sizes, r3Fixed, r3Steady, r3OnePaint, r3Strip, r3Notes, r3Formulas, r3Print, r3Keys, r3Desc, r4Worksheet, r4Hold, r4Rail, r4Bar, r4Print, r4Notes, r5Side, r5Modes, r5Font, r5Follow, r5Slots, r5TwoModes, r5Smooth, r5Misc, r6Review, r7Review];
  // run a subset while working, e.g. ONLY=r2Sizes; set but empty, it names no group
  const ONLY = 'ONLY' in process.env ? process.env.ONLY.split(',').map(n => n.trim()).filter(Boolean) : null;
  const run = GROUPS.filter(f => !ONLY || ONLY.includes(f.name));
  if (ONLY && (!run.length || ONLY.some(n => !GROUPS.some(f => f.name === n)))) cannotRun(`ONLY="${process.env.ONLY}" names no group, or a group that does not exist.`);
  try { browser = await chromium.launch(); } catch (e) { cannotRun(`the browser cannot be launched (${firstLine(e)}).`); }
  try { const c = await browser.newContext(); const q = await c.newPage(); await q.goto(PAGE); LANGS = await q.$$eval('#langSel option', os => os.map(o => o.value)); await c.close(); }
  catch (e) { cannotRun(`the page's language menu cannot be read (${firstLine(e)}).`); }
  if (!LANGS.length) cannotRun('the page lists no languages in #langSel.');
  try {
    if (!ONLY) g0();
    for (const f of run){
      try { await f(); } catch (e) { check(f.name, 'group ran to the end', false, e.message); }
    }
    check('G5 console', 'no console errors or page errors', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));
  } finally { await browser.close().catch(() => {}); }
  const pass = results.filter(r => r.pass).length;
  console.log(`${PAGE}\n${pass} passed, ${results.length - pass} failed, ${results.length} checks`);
  const byGroup = {}; for (const r of results){ const g = byGroup[r.group] = byGroup[r.group] || [0, 0]; g[r.pass ? 0 : 1]++; }
  for (const g in byGroup) console.log(`  ${g}: ${byGroup[g][0]} passed, ${byGroup[g][1]} failed`);
  for (const r of results) if (!r.pass) console.log(`  FAIL [${r.group}] ${r.name} — ${r.detail}`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  process.exitCode = results.length > 0 && pass === results.length ? 0 : 1;   // a failed check or a group that threw fails the run
})().catch(e => { console.error('The suite could not finish:', e); process.exitCode = 2; });   // the runner itself, not a check
