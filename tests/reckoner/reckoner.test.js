// Tests for the Reckoner. Expected values come from Lesson 5 (pp. 4–7, 30–33) and exact arithmetic, never from the page.
// Run: NODE_PATH=$(npm root -g) node reckoner.test.js [page.html]   (default: the repo's reckoner/index.html; VERBOSE=1 prints every check)
const { chromium } = require('playwright'); const path = require('path');
const PAGE = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'reckoner', 'index.html'));
if (!require('fs').existsSync(PAGE)) { console.error('page not found: ' + PAGE); process.exit(2); }
const FILE = 'file://' + PAGE;
let pass = 0, fail = 0; const failures = [];
function check(sec, name, ok, detail){
  if (ok) pass++; else { fail++; failures.push(`[${sec}] ${name}\n      ${detail}`); }
  if (process.env.VERBOSE) console.log(['CHECK', sec, name, ok ? 'PASS' : 'FAIL', ok ? '' : String(detail).replace(/\s+/g, ' ')].join('\t'));
}
const clean = s => String(s).replace(/︎/g, '').replace(/\s+/g, ' ').trim();
const dms = sec => { const d = Math.floor(sec/3600), m = Math.floor(sec%3600/60), s = sec%60; return `${d}° ${String(m).padStart(2,'0')}′ ${String(s).padStart(2,'0')}″`; };

(async () => {
  const browser = await chromium.launch(); const errs = [];
  const open = async (vp) => { const ctx = await browser.newContext({viewport: vp || {width: 1280, height: 900}}); const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(FILE); await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} }); await page.reload(); await page.waitForTimeout(100); return {ctx, page}; };
  const { page } = await open();
  // pin: English, a fresh walkthrough, practice counters at zero
  const fresh = async () => page.evaluate(() => { applyLang('en'); stats.right = stats.streak = stats.best = 0; paintStats(); selectTab('tabWalk'); showWalk(0); });
  const walk = async (i) => page.evaluate(i => { selectTab('tabWalk'); showWalk(i); $('#allBtn').click(); const tmp = document.createElement('div'); tmp.innerHTML = state.sol.steps.map(x => x.note).join(' '); return {ans: document.querySelector('.answer span')?.textContent || '', slate: document.querySelector('#slate').textContent + ' ' + tmp.textContent, text: document.querySelector('#stepBody').textContent}; }, i);
  // your own numbers: set the mode, open practice, fill the fields, work it
  const own = async (mode, fields, kind) => page.evaluate(({mode, fields, kind}) => {
    selectTab('tabPractice'); document.querySelector(`.modes .btn[data-mode="${mode}"]`).click();
    if (kind) $('#okind').value = kind;
    for (const [id, v] of Object.entries(fields)) document.getElementById(id).value = v;
    $('#ownBtn').click(); return {fb: $('#ownFb').textContent, q: $('#qline').textContent};
  }, {mode, fields, kind});
  const answer = async (fields) => page.evaluate(fields => { for (const [id, v] of Object.entries(fields)) document.getElementById(id).value = v; $('#checkBtn').click();
    return {fb: $('#fb').textContent, cls: $('#fb').className, right: +$('#stRight').textContent, streak: +$('#stStreak').textContent, best: +$('#stBest').textContent}; }, fields);
  const all = async () => page.evaluate(() => { $('#allBtn').click(); const tmp = document.createElement('div'); tmp.innerHTML = state.sol.steps.map(x => x.note).join(' '); return {ans: document.querySelector('.answer span')?.textContent || '', slate: document.querySelector('#slate').textContent + ' ' + tmp.textContent}; });

  const gen = async (p) => page.evaluate(p => { selectTab('tabPractice'); newProblem(p.mode); load(p, 0, true); $('#qline').innerHTML = question(p); buildAnswer(p.ask); }, p);
  const FIG1 = {mode: 'add', a: {d: 23, m: 26, s: 12}, b: {d: 48, m: 13, s: 56}, ask: 'dms'};
  // ---------- the lesson's examples, as printed ----------
  await fresh(); let S = 'lesson', r;
  r = await walk(1); check(S, 'Fig. 1: 23° 26′ 12″ + 48° 13′ 56″ = 71° 40′ 08″', clean(r.ans) === '71° 40′ 08″', r.ans);
  r = await walk(2); check(S, 'step 3: 340° + 31° = 371° → 11°, as the text says', clean(r.ans) === '11° 00′ 00″' && r.text.includes('371°') && r.slate.includes('371° − 360° = 11°'), clean(r.ans) + ' | ' + r.slate.slice(0, 200));
  r = await walk(3); check(S, 'Fig. 1: 48° 26′ 12″ − 23° 13′ 56″ = 25° 12′ 16″', clean(r.ans) === '25° 12′ 16″', r.ans);
  r = await walk(4); check(S, 'p. 4: 16° − 279° = 97°', clean(r.ans) === '97° 00′ 00″', r.ans);
  r = await walk(5); check(S, 'Fig. 4: 23° 26′ 12″ = 23.43666°', clean(r.ans) === '23.43666°', r.ans);
  r = await walk(6); check(S, 'Fig. 5: 23.43666° = 23° 26′ 12″, worked as printed', clean(r.ans) === '23° 26′ 12″' && r.slate.includes('.43666 × 60 = 26.1996′') && r.slate.includes('.1996 × 60 = 11.976″') && r.slate.includes('11.976″ → 12″'), r.slate.slice(0, 300));
  r = await walk(7); check(S, 'worksheet: 25° 21′ 41″ ♐ = 265° 21′ 41″', clean(r.ans) === '265° 21′ 41″', r.ans);
  r = await walk(8); check(S, 'Fig. 3: 17° 13′ 56″ ♒ to 23° 26′ 12″ ♈ = 66° 12′ 16″', clean(r.ans) === '66° 12′ 16″' && r.slate.includes('17° 13′ 56″'), clean(r.ans) + ' | ' + r.slate.slice(0, 120));
  r = await walk(9); check(S, 'worksheet: 17:39:47 × 15 = 264° 56′ 45″', clean(r.ans) === '264° 56′ 45″', r.ans);
  r = await walk(10); check(S, 'worksheet: 93° 15′ 48″ ÷ 15 = 06:13:03', clean(r.ans) === '06:13:03' && r.slate.includes('48″ ÷ 15 = 3.2s'), clean(r.ans) + ' | ' + r.slate.slice(0, 300));
  check(S, 'step 11 works one equation per statement', r.slate.includes('195′; 195′ ÷ 15 = 13m') && !r.slate.includes('= 195′ ÷ 15'), r.slate.slice(0, 300));

  // ---------- Astra 1 (P1): the correctly rounded second, nothing either side ----------
  S = 'A1';
  await fresh(); await own('todms', {odec: '23.43666'});
  r = await answer({ad: '23', am: '26', as: '11'}); check(S, 'own 23.43666: 23° 26′ 11″ is wrong', r.cls.includes('no') && r.right === 0, JSON.stringify(r));
  check(S, '…with the round-up hint (11.976″ rounds up)', r.fb.includes('round up'), r.fb);
  r = await answer({ad: '23', am: '26', as: '13'}); check(S, '…23° 26′ 13″ is wrong', r.cls.includes('no') && r.right === 0, JSON.stringify(r));
  r = await answer({ad: '23', am: '26', as: '12'}); check(S, '…23° 26′ 12″ is right', r.cls.includes('ok'), JSON.stringify(r));
  await own('time', {o2d: '93', o2m: '15', o2s: '48'}, 'toTime');
  r = await answer({ad: '6', am: '13', as: '4'}); check(S, 'own 93° 15′ 48″ ÷ 15: 06:13:04 is wrong', r.cls.includes('no'), JSON.stringify(r));
  r = await answer({ad: '6', am: '13', as: '3'}); check(S, '…06:13:03 is right', r.cls.includes('ok'), JSON.stringify(r));

  // ---------- Astra 2 (P1): an answer is written with its carries done ----------
  S = 'A2';
  const addFig1 = async () => { await fresh(); await own('add', {o1d: '23', o1m: '26', o1s: '12', o2d: '48', o2m: '13', o2s: '56'}); };
  for (const [a, why] of [[['71','39','68'], 'over60'], [['70','100','8'], 'over60'], [['72','-20','8'], 'form'], [['71.5','10','8'], 'form'], [['0','0','258008'], 'over60']]){
    await addFig1(); r = await answer({ad: a[0], am: a[1], as: a[2]});
    const hintOK = why === 'over60' ? r.fb.includes('60 or more') : r.fb.includes('whole numbers');
    check(S, `Fig. 1 answered ${a.join(' ')}: wrong, with the ${why} hint`, r.cls.includes('no') && r.right === 0 && hintOK, JSON.stringify(r));
  }
  await addFig1(); r = await answer({ad: '71', am: '40', as: '8'}); check(S, 'Fig. 1 answered 71 40 08: right', r.cls.includes('ok'), JSON.stringify(r));
  await fresh(); await own('signs', {o1d: '29', o1m: '59', o1s: '59'}, 'toSign');
  r = await answer({ad: '30', am: '0', as: '-1'}); check(S, 'sign answer 30° 0′ −1″ ♈ for 29° 59′ 59″ ♈: wrong', r.cls.includes('no'), JSON.stringify(r));
  r = await answer({ad: '29', am: '59', as: '59'}); check(S, '…29° 59′ 59″ ♈: right', r.cls.includes('ok'), JSON.stringify(r));

  // ---------- Astra 3 (P1): step 3's text and slate agree ----------
  S = 'A3'; r = await walk(2);
  check(S, 'step 3: the slate computes the 371° the text names, then 11°', r.slate.includes('371°') && r.slate.includes('= 11°') && !r.slate.includes('372°'), r.slate.slice(0, 250));

  // ---------- Astra 4 (P2): exact half-seconds round up, on every tie ----------
  S = 'A4';
  await fresh(); await own('todms', {odec: '0.00375'}); r = await all();
  check(S, '0.00375° = 0° 00′ 14″, narrated 13.5″ → 14″', clean(r.ans) === '0° 00′ 14″' && r.slate.includes('13.5″ → 14″'), clean(r.ans) + ' | ' + r.slate.slice(0, 300));
  await own('todms', {odec: '1.00125'}); r = await all(); check(S, '1.00125° = 1° 00′ 05″', clean(r.ans) === '1° 00′ 05″', r.ans);
  const ties = await page.evaluate(() => { let bad = 0, first = null;
    for (let n = 1; n < 288000; n += 2){ const str = (BigInt(n) * 125n).toString().padStart(6, '0'); const dstr = str.slice(0, -5).replace(/^0+(?=\d)/, '') + '.' + str.slice(-5);
      const got = toSec(toDMSSteps(dstr.startsWith('.') ? '0' + dstr : dstr).result), want = (9*n + 1)/2;
      if (got !== want){ bad++; if (!first) first = `${dstr}: ${got} ≠ ${want}`; } }
    return {bad, first}; });
  check(S, 'all 144,000 exact half-second ties n/800° round up', ties.bad === 0, JSON.stringify(ties));

  // ---------- Astra 5 (P2): the walkthrough leads into "your own numbers" ----------
  S = 'A5';
  await page.reload(); await page.waitForTimeout(100);   // a fresh load: the own-numbers form is the one the page starts with
  const a5 = await page.evaluate(() => { selectTab('tabWalk'); showWalk(6); $('#toPracticeBtn').click(); document.querySelector('details').open = true;
    const hasDec = !!$('#odec'); let err = null; try { $('#odec').value = '0.5'; $('#ownBtn').click(); } catch (e) { err = String(e); }
    return {hasDec, err, q: $('#qline').textContent}; });
  check(S, 'step 7 → Practise this → Work it: a decimal field, and it works', a5.hasDec && !a5.err && a5.q.includes('0.5'), JSON.stringify(a5));
  await page.reload(); await page.waitForTimeout(100);
  const a5b = await page.evaluate(() => { selectTab('tabWalk'); showWalk(8); $('#toPracticeBtn').click(); let err = null; try { $('#ownBtn').click(); } catch (e) { err = String(e); } return {okind: !!$('#okind'), err}; });
  check(S, 'step 9 → Practise this → Work it: the signs task selector is there', a5b.okind && !a5b.err, JSON.stringify(a5b));

  // ---------- Astra 6 (P2): every line of the decimal working can be followed by hand ----------
  S = 'A6';
  await fresh(); await own('todms', {odec: '0.000139'}); r = await all();
  check(S, '0.000139° keeps its digits: .000139 × 60 = 0.00834′, .00834 × 60 = 0.5004″ → 1″',
    r.slate.includes('0.000139°') && r.slate.includes('.000139 × 60 = 0.00834′') && r.slate.includes('.00834 × 60 = 0.5004″') && clean(r.ans) === '0° 00′ 01″', r.slate.slice(0, 400));
  await own('todms', {odec: '100.00375'}); r = await all();
  check(S, '100.00375°: .00375 × 60 = 0.225′, .225 × 60 = 13.5″', r.slate.includes('.00375 × 60 = 0.225′') && r.slate.includes('.225 × 60 = 13.5″') && clean(r.ans) === '100° 00′ 14″', r.slate.slice(0, 300));

  // ---------- Astra 7 (P2): one problem, one point ----------
  S = 'A7';
  await fresh(); await gen(FIG1); r = await answer({ad: '71', am: '40', as: '8'}); r = await answer({}); r = await answer({});
  check(S, 'three Checks on one right answer: Right 1, Streak 1, Best 1', r.right === 1 && r.streak === 1 && r.best === 1 && r.fb.includes('Already counted'), JSON.stringify(r));
  const best = await page.evaluate(() => localStorage.getItem('reckoner.best'));
  check(S, 'the stored best is one, not a count of presses', best === '1', best);
  await fresh(); await gen(FIG1); await page.evaluate(() => $('#showBtn').click()); r = await answer({ad: '71', am: '40', as: '8'});
  check(S, 'Show the working, then the right answer: no point', r.right === 0 && r.fb.includes('does not count'), JSON.stringify(r));

  // ---------- Astra 8 (P2): the comparison names whole positions ----------
  S = 'A8';
  await fresh(); await own('sub', {o1d: '10', o1m: '0', o1s: '0', o2d: '10', o2m: '1', o2s: '0'});
  r = await page.evaluate(() => { $('#stepBtn').click(); return document.querySelector('.say').textContent; });
  check(S, '10° 00′ 00″ − 10° 01′ 00″: "10° 00′ 00″ is smaller than 10° 01′ 00″"', r.includes('10° 00′ 00″ is smaller than 10° 01′ 00″') && !r.includes('10° is smaller than 10°'), r);
  r = await all(); check(S, '…= 359° 59′ 00″', clean(r.ans) === '359° 59′ 00″', r.ans);

  // ---------- Astra 9 (P2): a sign-start hint only where a sign was used ----------
  S = 'A9';
  await addFig1(); r = await answer({ad: '101', am: '40', as: '8'});
  check(S, 'Fig. 1 answered 101° 40′ 08″: no "sign\'s starting degree" hint', !r.fb.includes('starting degree') && r.cls.includes('no'), r.fb);
  await fresh(); await own('signs', {o1d: '5', o1m: '0', o1s: '0', o1sign: '8'}, 'toAbs');
  r = await answer({ad: '275', am: '0', as: '0'}); check(S, 'in Signs, off by 30°: the sign hint stays', r.fb.includes('starting degree'), r.fb);

  // ---------- Astra 10 (P3): a focused control keeps Space ----------
  S = 'A10';
  await fresh();
  const a10 = await page.evaluate(() => { selectTab('tabPractice'); const d = document.querySelector('details'); d.open = false; const sum = d.querySelector('summary'); sum.focus(); return state.reveal; });
  await page.keyboard.press('Space');
  const a10b = await page.evaluate(() => ({open: document.querySelector('details').open, reveal: state.reveal}));
  check(S, 'Space on the focused "Work a problem of mine": it opens, the slate does not advance', a10b.open && a10b.reveal === a10, JSON.stringify({before: a10, ...a10b}));
  await page.evaluate(() => { document.activeElement.blur(); state.reveal = 0; render(); });
  await page.keyboard.press('Space');
  check(S, 'Space from the page body still reveals a step', (await page.evaluate(() => state.reveal)) === 1, '');
  await page.evaluate(() => { $('#allBtn').focus(); }); await page.keyboard.press('Enter');
  check(S, 'All disables itself and hands focus to Reset', await page.evaluate(() => document.activeElement === $('#resetBtn')), await page.evaluate(() => document.activeElement.id));

  // ---------- Astra 11 (P3): feedback announced, task selector named ----------
  S = 'A11';
  const a11 = await page.evaluate(() => { selectTab('tabPractice'); document.querySelector('.modes .btn[data-mode="signs"]').click();
    return {fb: $('#fb').getAttribute('role') + '/' + $('#fb').getAttribute('aria-live'), own: $('#ownFb').getAttribute('role'), task: $('#okind').getAttribute('aria-label')}; });
  check(S, 'feedback lines are status regions; the task selector is named', a11.fb === 'status/polite' && a11.own === 'status' && a11.task === 'Task', JSON.stringify(a11));

  // ---------- Astra 12 (P3): what is the lesson's, and what is not ----------
  S = 'A12';
  const a12 = await page.evaluate(() => ({foot: document.querySelector('[data-i18n-html="foot1"]').textContent, s11: L().walk[10].body, s9: L().walk[8].body}));
  check(S, 'the footer names Figures 1, 3, 4 and 5 and marks step 3\'s numbers as ours', a12.foot.includes('Figures 1, 3, 4 and 5') && a12.foot.includes('are ours'), a12.foot);
  check(S, 'step 11 no longer claims every calculation of the worksheet', !a12.s11.includes('every calculation') && a12.s11.includes('9.86'), a12.s11.slice(-300));
  check(S, 'step 9 is the lesson\'s Figure 3', a12.s9.includes('Figure 3'), a12.s9.slice(0, 300));

  // ---------- the builder's own findings ----------
  S = 'B';
  await fresh(); await own('sub', {o1d: '16', o1m: '0', o1s: '0', o2d: '279', o2m: '0', o2s: '0'});
  r = await answer({ad: '-263', am: '10', as: '0'}); check(S, '16° − 279° answered (−263, 10, 0): the back-past-0° hint', r.fb.includes('backward past 0° Aries'), r.fb);
  await own('todms', {odec: '359.99999'}); r = await all();
  check(S, '359.99999° = 0° 00′ 00″, and the carry through 360° is said', clean(r.ans) === '0° 00′ 00″' && r.slate.includes('whole circle'), clean(r.ans) + ' | ' + r.slate.slice(-300));
  await own('todec', {o1d: '256', o1m: '1', o1s: '21'}); r = await all();
  check(S, '256° 01′ 21″ = 256.0225°, not 256.02249°', clean(r.ans) === '256.0225°', r.ans);
  const sweep = await page.evaluate(() => { let bad = 0, first = null;   // every whole second: five places, cut, against integer long division
    for (let sec = 0; sec < 1296000; sec += 7){ const x = fromSec(sec); const got = toDecSteps(x).decs;
      const w = Math.floor(sec/3600), f = String(Math.floor((sec % 3600) * 100000 / 3600)).padStart(5, '0').replace(/0+$/, '');
      const want = f ? `${w}.${f}` : String(w); if (got !== want){ bad++; if (!first) first = `${sec}: ${got} ≠ ${want}`; } }
    return {bad, first}; });
  check(S, 'decimal of 185,143 whole-second arcs, cut to five places', sweep.bad === 0, JSON.stringify(sweep));
  await own('todms', {odec: '0.0000001'}); r = await page.evaluate(() => $('#qline').textContent);
  check(S, 'a typed 0.0000001 shows as 0.0000001°, not 1e-7°', r.includes('0.0000001°') && !r.includes('e-'), r);
  await own('signs', {o1d: '17', o1m: '13', o1s: '56', o1sign: '10', o2d: '23', o2m: '26', o2s: '12', o2sign: '0'}, 'dist'); r = await all();
  check(S, 'distance answer box: 66.2044° of arc (cut, like the others)', r.slate.includes('66.2044° of arc'), r.slate.slice(-200));
  await own('signs', {o1d: '100', o1m: '0', o1s: '0'}, 'toSign');
  const ring = await page.evaluate(() => { const before = document.querySelectorAll('#slate .ring .pt').length; $('#allBtn').click(); return {before, after: document.querySelectorAll('#slate .ring .pt').length}; });
  check(S, 'Absolute → sign: the ring shows no point until the working does', ring.before === 0 && ring.after === 1, JSON.stringify(ring));
  await fresh(); await own('todec', {o1d: '23', o1m: '26', o1s: '12'});
  for (const [v, ok] of [['23.43666', true], ['23.43667', true], ['23,43666', true], ['23.43665', false], ['23.4367', false]]){
    await own('todec', {o1d: '23', o1m: '26', o1s: '12'}); r = await answer({adec: v}); check(S, `23° 26′ 12″ answered ${v}: ${ok ? 'right' : 'wrong'}`, r.cls.includes(ok ? 'ok' : 'no'), JSON.stringify(r));
  }
  const levels = await page.evaluate(() => { const out = {g1time: 0, a1wrap: 0, a3nowrap: 0, s1wrap: 0, s3nowrap: 0, d3nocross: 0, t3far: 0};
    for (let i = 0; i < 600; i++){
      let p = makeProblem('time', 1); if (p.kind === 'toTime' && solve(p).result.s !== 0) out.g1time++;
      p = makeProblem('add', 1); if (toSec(p.a) + toSec(p.b) >= CIRC) out.a1wrap++;
      p = makeProblem('add', 3); if (toSec(p.a) + toSec(p.b) < CIRC) out.a3nowrap++;
      p = makeProblem('sub', 1); if (toSec(p.a) < toSec(p.b)) out.s1wrap++;
      p = makeProblem('sub', 3); if (!(toSec(p.a) < toSec(p.b))) out.s3nowrap++;
      p = makeProblem('signs', 3); if (p.kind === 'dist' && !(toSec(p.B) < toSec(p.A))) out.d3nocross++;
      p = makeProblem('time', 3); if (p.kind === 'toTime' && p.x.d >= 180) out.t3far++;   // a longitude: 180° at most
    } return out; });
  check(S, 'levels keep their word over 600 problems each; longitudes stay within 180°', levels.g1time === 0 && levels.a1wrap === 0 && levels.a3nowrap === 0 && levels.s1wrap === 0 && levels.s3nowrap === 0 && levels.d3nocross === 0 && levels.t3far === 0, JSON.stringify(levels));
  const round = await page.evaluate(() => { let bad = 0, first = null; for (let i = 0; i < 50000; i++){ const x = fromSec(Math.floor(Math.random()*1296000));
      const sec = toSec(x), f = String(Math.floor(sec % 3600 * 100000 / 3600)).padStart(5, '0'); const back = toDMSSteps(`${Math.floor(sec/3600)}.${f}`).result; if (toSec(back) !== toSec(x)){ bad++; if (!first) first = JSON.stringify([x, back]); } } return {bad, first}; });
  check(S, '50,000 random arcs: to five places and back gives the same arc', round.bad === 0, JSON.stringify(round));

  // ---------- internal re-review of 33f9c0e ----------
  const FIG1F = {o1d: '23', o1m: '26', o1s: '12', o2d: '48', o2m: '13', o2s: '56'};
  const FIG3F = {o1d: '17', o1m: '13', o1s: '56', o1sign: '10', o2d: '23', o2m: '26', o2s: '12', o2sign: '0'};
  const hintCase = async (desc, setup, ans, needle, not) => { await fresh(); await setup(); r = await answer(ans);
    check(S, `${desc}: "${needle}"${not ? `, not "${not}"` : ''}`, r.cls.includes('no') && r.fb.includes(needle) && !(not && r.fb.includes(not)), r.fb); };

  S = 'R1';   // P1: a decimal answer is the true value cut or rounded, nothing else
  for (const [x, cases] of [[[93,15,48], [['93.26333', true], ['93.26334', false]]],
                            [[23,26,54], [['23.44833', true], ['23.44834', false]]],
                            [[44,58,48], [['44.98', true], ['44.98000', true], ['44.97999', false], ['44.98001', false]]],
                            [[0,1,21], [['0.0225', true], ['0.02249', false], ['0.02251', false]]],
                            [[0,0,4], [['0.00111', true], ['0.00112', false]]]]){
    for (const [v, ok] of cases){ await fresh(); await own('todec', {o1d: String(x[0]), o1m: String(x[1]), o1s: String(x[2])}); r = await answer({adec: v});
      check(S, `${x[0]}° ${x[1]}′ ${x[2]}″ answered ${v}: ${ok ? 'right' : 'wrong'}`, r.cls.includes(ok ? 'ok' : 'no'), JSON.stringify(r)); }
  }
  const decSample = await page.evaluate(() => { let bad = 0, n = 0, first = null;
    const str = v => { const t = v.toString().padStart(6, '0'); return t.slice(0, -5) + '.' + t.slice(-5); };
    for (let i = 0; i < 300; i++){ const sec = Math.floor(Math.random() * 1296000), x = fromSec(sec), N = BigInt(sec) * 100000n;
      const c = N / 3600n, rd = (2n * N + 3600n) / 7200n;
      for (const [v, ok] of [[c, true], [rd, true], [c - 1n, false], [rd + 1n, false]]){ if (v < 0n) continue;
        selectTab('tabPractice'); newProblem('todec'); load({mode: 'todec', x, ask: 'dec'}, 0, true); buildAnswer('dec'); state.credit = 'own';
        $('#adec').value = str(v); check(); n++;
        const got = $('#fb').className.includes('ok'); if (got !== ok){ bad++; if (!first) first = `${sec}s answered ${str(v)}: marked ${got ? 'right' : 'wrong'}`; } } }
    return {bad, n, first}; });
  check(S, `${decSample.n} answers to 300 random arcs, through the checker: only the cut or rounded value is right`, decSample.bad === 0, JSON.stringify(decSample));
  const decAll = await page.evaluate(() => { if (typeof decRight !== 'function') return {missing: 'decRight'}; let bad = 0, first = null;
    for (let sec = 0; sec < 1296000; sec++){ const N = BigInt(sec) * 100000n, c = N / 3600n, rd = (2n * N + 3600n) / 7200n;
      for (const [v, ok] of [[c, true], [rd, true], [rd + 1n, false], [c - 1n, false]]){ if (v < 0n) continue;
        const t = v.toString().padStart(6, '0'), s = t.slice(0, -5) + '.' + t.slice(-5);
        if (decRight(s, sec) !== ok){ bad++; if (!first) first = `${sec}: ${s} → ${!ok}`; } } }
    return {bad, first}; });
  check(S, 'every whole second (1,296,000): cut and rounded right, one unit either side wrong', decAll.bad === 0, JSON.stringify(decAll));

  S = 'R2';   // P2: the whole-number check no longer hides the diagnoses
  await hintCase('340° + 31° answered 371 00 00', () => own('add', {o1d: '340', o1m: '0', o1s: '0', o2d: '31', o2m: '0', o2s: '0'}), {ad: '371', am: '0', as: '0'}, 'full circle', 'whole numbers');
  await hintCase('Fig. 3 answered 426 12 16', () => own('signs', FIG3F, 'dist'), {ad: '426', am: '12', as: '16'}, 'full circle', 'whole numbers');
  await hintCase('Fig. 3 answered −293 47 44', () => own('signs', FIG3F, 'dist'), {ad: '-293', am: '47', as: '44'}, 'end point', 'whole numbers');
  await hintCase('16° − 279° answered 457 00 00', () => own('sub', {o1d: '16', o1m: '0', o1s: '0', o2d: '279', o2m: '0', o2s: '0'}), {ad: '457', am: '0', as: '0'}, 'full circle', 'whole numbers');
  await hintCase('359.99999° answered 360 00 00', () => own('todms', {odec: '359.99999'}), {ad: '360', am: '0', as: '0'}, 'full circle', 'whole numbers');
  await hintCase('265° 21′ 41″ into a sign, answered 265 21 41', () => own('signs', {o1d: '265', o1m: '21', o1s: '41'}, 'toSign'), {ad: '265', am: '21', as: '41'}, 'Divide the degrees by 30', 'whole numbers');
  await hintCase('Fig. 1 answered 400 00 00', () => own('add', FIG1F), {ad: '400', am: '0', as: '0'}, 'from 0 to 359', 'whole numbers');

  S = 'R3';   // P2: the rounding hint says which way
  await hintCase('Fig. 5 (23.43666°) answered 23 26 11', () => own('todms', {odec: '23.43666'}), {ad: '23', am: '26', as: '11'}, 'round up');
  await hintCase('Fig. 5 answered 23 26 13', () => own('todms', {odec: '23.43666'}), {ad: '23', am: '26', as: '13'}, 'Only the seconds', 'round');
  await hintCase('93° 15′ 48″ ÷ 15 answered 06:13:04', () => own('time', {o2d: '93', o2m: '15', o2s: '48'}, 'toTime'), {ad: '6', am: '13', as: '4'}, 'round down');
  await hintCase('93° 15′ 48″ ÷ 15 answered 06:13:02', () => own('time', {o2d: '93', o2m: '15', o2s: '48'}, 'toTime'), {ad: '6', am: '13', as: '2'}, 'seconds are off', 'round');
  await hintCase('0.5° answered 0 30 01', () => own('todms', {odec: '0.5'}), {ad: '0', am: '30', as: '1'}, 'Only the seconds', 'round');
  await hintCase('15° ÷ 15 answered 01:00:01', () => own('time', {o2d: '15', o2m: '0', o2s: '0'}, 'toTime'), {ad: '1', am: '0', as: '1'}, 'seconds are off', 'round');
  await hintCase('359.99989° (359° 59′ 59.604″) answered 359 59 59', () => own('todms', {odec: '359.99989'}), {ad: '359', am: '59', as: '59'}, 'round up');

  S = 'R4';   // P2: "back past 0° Aries" only where the subtraction wraps
  await hintCase('Fig. 1 subtraction answered −25 12 16', () => own('sub', {o1d: '48', o1m: '26', o1s: '12', o2d: '23', o2m: '13', o2s: '56'}), {ad: '-25', am: '12', as: '16'}, 'wrong way', 'backward past');

  S = 'R5';   // P2: a point only for a problem answered without help
  for (const [how, act] of [['Next step', () => page.evaluate(() => $('#stepBtn').click())], ['All', () => page.evaluate(() => $('#allBtn').click())],
                            ['Space', async () => { await page.evaluate(() => document.activeElement.blur()); await page.keyboard.press('Space'); }]]){
    await fresh(); await gen(FIG1); await act(); r = await answer({ad: '71', am: '40', as: '8'});
    check(S, `${how} on the slate, then the right answer: no point`, r.right === 0 && r.streak === 0 && r.fb.includes('does not count'), JSON.stringify(r));
  }
  await fresh(); await gen(FIG1); r = await answer({ad: '71', am: '40', as: '8'});
  check(S, 'no help: the right answer scores', r.right === 1 && r.streak === 1, JSON.stringify(r));
  await fresh(); await own('add', FIG1F); r = await answer({ad: '71', am: '40', as: '8'});
  check(S, 'your own numbers: the right answer is marked right but not scored', r.cls.includes('ok') && r.right === 0 && r.best === 0, JSON.stringify(r));
  await page.evaluate(() => $('#ownBtn').click()); r = await answer({ad: '71', am: '40', as: '8'});
  check(S, '…Work it again with the same numbers: still not scored', r.cls.includes('ok') && r.right === 0, JSON.stringify(r));
  await fresh(); await own('add', {o1d: '', o1m: '', o1s: '', o2d: '', o2m: '', o2s: ''}); r = await answer({});
  check(S, 'blank own numbers and a blank answer: nothing scored', r.right === 0 && r.best === 0 && !r.cls.includes('ok'), JSON.stringify(r));

  S = 'R6';   // P2: the practice problem survives a visit to the walkthrough
  await fresh(); await gen(FIG1);
  await page.click('#tabWalk'); await page.click('#nextBtn'); await page.click('#tabPractice');
  const q6 = await page.evaluate(() => $('#qline').textContent); r = await answer({ad: '71', am: '40', as: '8'});
  check(S, 'practice → walkthrough → Next → practice: the problem is back, and Check works', q6.includes('23° 26′ 12″') && r.cls.includes('ok') && r.right === 1, q6 + ' | ' + JSON.stringify(r));

  S = 'R7';   // P2: "Press N for another" works from the answer box
  await fresh(); await gen(FIG1);
  await page.fill('#ad', '71'); await page.fill('#am', '40'); await page.fill('#as', '8'); await page.focus('#as'); await page.keyboard.press('Enter');
  const q7 = await page.evaluate(() => ({q: $('#qline').textContent, fb: $('#fb').textContent}));
  await page.keyboard.press('n');
  const q7b = await page.evaluate(() => ({q: $('#qline').textContent, fb: $('#fb').textContent}));
  check(S, 'Enter checks a right answer; N from the answer box then gives a new problem', q7.fb.includes('Press N') && q7b.q !== q7.q && q7b.fb === '', JSON.stringify({q7, q7b}));
  await page.focus('#ad'); await page.keyboard.press('n');
  check(S, 'N in the answer box of an unanswered problem does nothing', (await page.evaluate(() => $('#qline').textContent)) === q7b.q, '');

  S = 'R8';   // P3
  await fresh(); await gen(FIG1); await page.evaluate(() => $('#showBtn').click()); await answer({ad: '71', am: '40', as: '8'}); r = await answer({});
  check(S, 'after "right, but the working was showing", Check again does not say "Already counted"', r.fb.includes('does not count') && !r.fb.includes('Already'), r.fb);
  const XX = {o1d: '10', o1m: '0', o1s: '0', o2d: '10', o2m: '0', o2s: '0'};
  await fresh(); await own('sub', XX); r = await answer({});
  check(S, 'x − x with a blank answer: asked for an answer, not marked right', !r.cls.includes('ok') && r.fb.includes('Write your answer'), JSON.stringify(r));
  for (const typed of ['-', 'e', '1-']){
    await fresh(); await own('sub', XX); await page.focus('#ad'); await page.keyboard.type(typed); r = await answer({});
    check(S, `x − x answered "${typed}" in the degrees box: wrong`, r.cls.includes('no'), JSON.stringify(r));
  }
  await fresh(); await own('add', FIG1F); r = await answer({ad: '7.1e1', am: '40', as: '8'});
  check(S, 'Fig. 1 answered 7.1e1 40 08: wrong', r.cls.includes('no'), JSON.stringify(r));
  const im = await page.evaluate(() => $('#as').getAttribute('inputmode'));
  check(S, 'the seconds box opens a numeric keypad, which has no comma', im === 'numeric', im);
  await fresh(); await own('todec', {o1d: '0', o1m: '0', o1s: '4'}); r = await answer({});
  check(S, '0° 00′ 04″ with a blank decimal: asked for an answer, not "Very close"', !r.fb.includes('close') && r.fb.includes('Write your answer'), r.fb);
  await fresh(); await own('todec', {o1d: '23', o1m: '0', o1s: '30'}); r = await answer({adec: '23.0030'});
  check(S, '23° 00′ 30″ answered 23.0030: the minutes-after-a-point hint', r.fb.includes('after a point'), r.fb);
  await fresh(); await page.click('#nextBtn'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  const wi = await page.evaluate(() => walkIdx); check(S, 'Next, then → → with the button focused: step 4', wi === 3, wi);
  await fresh(); await own('todms', {odec: '0.99999'}); r = await all();
  check(S, '0.99999° = 1° 00′ 00″, and both carries are said', clean(r.ans) === '1° 00′ 00″' && r.slate.includes('full minute') && r.slate.includes('full degree'), r.slate.slice(-300));
  await own('todms', {odec: '359.99999'}); r = await all();
  check(S, '359.99999°: both carries, then the circle', r.slate.includes('full degree') && r.slate.includes('whole circle'), r.slate.slice(-300));
  for (const [t, want] of [['23.', '23° 00′ 00″'], ['0.', '0° 00′ 00″'], ['359.99999999999999999', '0° 00′ 00″']]){
    await fresh(); await gen(FIG1); const o = await own('todms', {odec: t}); r = await all();
    check(S, `your own decimal "${t}" is taken: ${want}`, !o.fb.includes('between') && clean(r.ans) === want, o.fb + ' | ' + clean(r.ans));
  }
  { const { ctx, page: p3 } = await open({width: 320, height: 568}); const pos = await p3.evaluate(() => getComputedStyle(document.querySelector('.rail')).position);
    check(S, '320×568: the control rail does not stick over the page', pos === 'static', pos); await ctx.close(); }

  // ---------- second internal re-review, of 2935afa ----------
  S = 'T1';   // P2: arc into time says its carries
  await fresh(); await own('time', {o2d: '14', o2m: '44', o2s: '59'}, 'toTime'); r = await all();
  check(S, '14° 44′ 59″ ÷ 15 = 00:59:00 (58m 59.93s), and the carry into the minutes is said', clean(r.ans) === '00:59:00' && r.slate.includes('full minute') && !r.slate.includes('full hour'), clean(r.ans) + ' | ' + r.slate.slice(-300));
  await own('time', {o2d: '14', o2m: '59', o2s: '59'}, 'toTime'); r = await all();
  check(S, '14° 59′ 59″ ÷ 15 = 01:00:00 (59m 59.93s), and both carries are said', clean(r.ans) === '01:00:00' && r.slate.includes('full minute') && r.slate.includes('full hour'), clean(r.ans) + ' | ' + r.slate.slice(-300));
  await own('time', {o2d: '179', o2m: '59', o2s: '59'}, 'toTime'); r = await all();
  check(S, '179° 59′ 59″ ÷ 15 = 12:00:00, and both carries are said', clean(r.ans) === '12:00:00' && r.slate.includes('full minute') && r.slate.includes('full hour'), clean(r.ans) + ' | ' + r.slate.slice(-300));
  await own('time', {o2d: '93', o2m: '15', o2s: '48'}, 'toTime'); r = await all();
  check(S, 'guard: Minneapolis (06:13:03) says no carry', clean(r.ans) === '06:13:03' && !r.slate.includes('full minute'), r.slate.slice(-200));

  S = 'T2';   // P2: a point only at the first try
  await fresh(); await gen(FIG1); await answer({ad: '71', am: '39', as: '8'}); r = await answer({ad: '71', am: '40', as: '8'});
  check(S, 'Fig. 1 answered 71 39 08, then 71 40 08: right, but no point and no streak', r.cls.includes('ok') && r.right === 0 && r.streak === 0 && r.fb.includes('first try'), JSON.stringify(r));
  const TOSIGN = {mode: 'signs', kind: 'toSign', x: {d: 265, m: 21, s: 41}, ask: 'signpos'};
  await fresh(); await gen(TOSIGN); await answer({ad: '25', am: '21', as: '41', asign: '0'}); r = await answer({asign: '8'});
  check(S, '265° 21′ 41″ as 25° 21′ 41″ ♈, then ♐: no point', r.cls.includes('ok') && r.right === 0 && r.fb.includes('first try'), JSON.stringify(r));
  await fresh(); await gen(FIG1); await answer({}); r = await answer({ad: '71', am: '40', as: '8'});
  check(S, 'guard: a blank Check first is not a try, so the right answer scores', r.right === 1, JSON.stringify(r));

  S = 'T3';   // P2: the Walkthrough tab takes the slate back
  await fresh(); await gen(FIG1); await answer({ad: '71', am: '40', as: '8'}); await gen(FIG1);
  await page.click('#tabWalk');
  const t3 = await page.evaluate(() => ({practising: state.practising, head: $('#slate .slate-head em').textContent, q: $('#slate .prob').textContent}));
  check(S, 'practice → Walkthrough tab: the slate shows the step\'s own example', !t3.practising && t3.head.toLowerCase() === 'example' && t3.q.includes('23° 26′ 12″ and 48° 13′ 56″'), JSON.stringify(t3));
  await page.click('#stepBtn'); r = await page.evaluate(() => ({streak: +$('#stStreak').textContent}));
  check(S, '…and Next step there, as the step says, keeps the streak', r.streak === 1, JSON.stringify(r));
  await page.click('#tabPractice'); r = await answer({ad: '71', am: '40', as: '8'});
  check(S, '…back to Practice: the same problem, still worth its point', r.right === 2 && r.streak === 2, JSON.stringify(r));

  S = 'T4';   // P3: hints true for the answer given
  await hintCase('16° − 279° answered 263 00 00', () => own('sub', {o1d: '16', o1m: '0', o1s: '0', o2d: '279', o2m: '0', o2s: '0'}), {ad: '263', am: '0', as: '0'}, 'wrong way', 'carry');
  await hintCase('23.43666° answered 22 26 12', () => own('todms', {odec: '23.43666'}), {ad: '22', am: '26', as: '12'}, 'Only the degrees', 'carry');
  await hintCase('25° 21′ 41″ ♐ answered 266 21 41', () => own('signs', {o1d: '25', o1m: '21', o1s: '41', o1sign: '8'}, 'toAbs'), {ad: '266', am: '21', as: '41'}, 'Only the degrees', 'carry');
  await hintCase('25° 21′ 41″ ♐ answered 265 22 41', () => own('signs', {o1d: '25', o1m: '21', o1s: '41', o1sign: '8'}, 'toAbs'), {ad: '265', am: '22', as: '41'}, 'Only the minutes', 'carry');
  await hintCase('180° + 180° answered 360 00 00', () => own('add', {o1d: '180', o1m: '0', o1s: '0', o2d: '180', o2m: '0', o2s: '0'}), {ad: '360', am: '0', as: '0'}, 'reach 360', 'pass 360');
  await fresh(); await own('add', {o1d: '180', o1m: '0', o1s: '0', o2d: '180', o2m: '0', o2s: '0'}); r = await all();
  check(S, '180° + 180°: the slate calls 360° the whole circle, not past its end', r.slate.includes('360° is the whole circle') && !r.slate.includes('360° is past'), r.slate.slice(-300));
  for (const [v, ok, needle] of [['+23.43666', true], ['２３．４３６６６', true], ['2.343666e1', false, 'digits and one point'], ['23.43666e0', false, 'digits and one point']]){
    await fresh(); await own('todec', {o1d: '23', o1m: '26', o1s: '12'}); r = await answer({adec: v});
    check(S, `23° 26′ 12″ answered ${v}: ${ok ? 'right' : `"${needle}"`}`, ok ? r.cls.includes('ok') : r.fb.includes(needle), JSON.stringify(r));
  }
  await fresh(); await own('todec', {o1d: '0', o1m: '0', o1s: '0'}); r = await answer({adec: '-0'});
  check(S, '0° 00′ 00″ answered -0: not the minutes-after-a-point hint', !r.fb.includes('after a point') && r.fb.includes('digits and one point'), r.fb);
  await fresh(); await gen({mode: 'signs', kind: 'toSign', x: {d: 45, m: 0, s: 0}, ask: 'signpos'}); r = await answer({ad: '15', am: '0', as: '0', asign: '0'});
  check(S, 'one sign passed: "one has passed"', r.fb.includes('one has passed') && !r.fb.includes('1 have'), r.fb);
  const es1 = await page.evaluate(() => I18N.es.hint.wrongSign(1) + ' | ' + I18N.es.hint.wrongSign(3));
  check(S, 'Spanish: "ha pasado 1", "han pasado 3"', es1.includes('ha pasado 1') && es1.includes('han pasado 3') && !es1.includes('han pasado 1'), es1);

  S = 'T5';   // P3: keys, focus and state
  await fresh(); await gen(TOSIGN); await page.evaluate(() => { $('#ad').value = '25'; $('#am').value = '21'; $('#as').value = '41'; $('#asign').value = '8'; });
  await page.focus('#asign'); await page.keyboard.press('Enter');
  check(S, 'Enter on the sign list checks', (await page.evaluate(() => $('#fb').className)).includes('ok'), await page.evaluate(() => $('#fb').textContent));
  await fresh(); await gen(FIG1); await answer({ad: '71', am: '40', as: '8'}); await page.evaluate(() => applyLang('de'));
  const border = await page.evaluate(() => $('#ansWrap').className); await page.evaluate(() => applyLang('en'));
  check(S, 'a language switch keeps the answer\'s green border', border.includes('good'), border);
  await fresh(); await page.evaluate(() => { showWalk(10); $('#stepBtn').click(); $('#stepBtn').click(); document.activeElement.blur(); });
  await page.keyboard.press('ArrowRight');
  const t5 = await page.evaluate(() => ({i: walkIdx, reveal: state.reveal}));
  check(S, '→ at the last step leaves its revealed working alone', t5.i === 10 && t5.reveal === 2, JSON.stringify(t5));
  await fresh(); await page.evaluate(() => showWalk(9)); await page.focus('#nextBtn'); await page.keyboard.press('Enter');
  const f5 = await page.evaluate(() => ({i: walkIdx, focus: document.activeElement.id}));
  check(S, 'Next onto the last step hands focus to Back', f5.i === 10 && f5.focus === 'prevBtn', JSON.stringify(f5));
  await fresh(); await gen(FIG1); await answer({ad: '71', am: '40', as: '8'});
  const ime = await page.evaluate(() => { const q = $('#qline').textContent; $('#as').dispatchEvent(new KeyboardEvent('keydown', {key: 'n', isComposing: true, bubbles: true})); return q === $('#qline').textContent; });
  check(S, 'an n typed during an IME composition does not start a new problem', ime, '');
  await fresh(); await gen(FIG1); await answer({ad: '71', am: '40', as: '8'});
  await page.click('#newBtn'); await page.click('#newBtn'); r = await page.evaluate(() => ({streak: +$('#stStreak').textContent, right: +$('#stRight').textContent}));
  check(S, 'skipping an unanswered problem ends the streak', r.streak === 0 && r.right === 1, JSON.stringify(r));

  S = 'T6';   // P3: smaller things
  const gentle = await page.evaluate(() => { let carry = 0, secs = 0; for (let i = 0; i < 2000; i++){ const p = makeProblem('todms', 1), s = toDMSSteps(p.decStr); if (s.s === 60) carry++; if (s.result.s !== 0) secs++; } return {carry, secs}; });
  check(S, 'Gentle To degrees: no 59.9″ → 60″ carry, no seconds (2,000 problems)', gentle.carry === 0 && gentle.secs === 0, JSON.stringify(gentle));
  const ja = await page.evaluate(() => I18N.ja.note.addSecCarry('30″ + 30″', '60″', true, '0″', '60″', '1′'));
  check(S, 'Japanese: "ちょうど 60 なので"', ja.includes('ちょうど 60 なので') && !ja.includes('ちょうどので'), ja);
  const zh = await page.evaluate(() => { applyLang('zh'); const n = toDMSSteps('359.99999').steps[4].note; applyLang('en'); return n; });
  check(S, 'Chinese: no space after 。 before the wrap sentence', !/。 /.test(zh), zh);
  const bestTampered = [];
  for (const v of ['-5', '2.5', 'Infinity']){ await page.evaluate(v => localStorage.setItem('reckoner.best', v), v); await page.reload(); await page.waitForTimeout(80); bestTampered.push(await page.evaluate(() => $('#stBest').textContent)); }
  await page.evaluate(() => localStorage.removeItem('reckoner.best')); await page.reload(); await page.waitForTimeout(80);
  check(S, 'a stored best of -5, 2.5 or Infinity shows as 0', bestTampered.every(x => x === '0'), bestTampered.join(', '));

  // ---------- third internal re-review, of a7aa97c ----------
  S = 'U1';   // P2: the Practice tab always brings its problem back
  await fresh(); await page.click('#pips button:nth-child(11)'); await page.click('#tabPractice');
  await page.click('.modes .btn[data-mode="add"]'); await page.fill('#ad', '71');
  const u1q = await page.evaluate(() => $('#qline').textContent);
  await page.click('#tabWalk'); await page.click('#tabPractice');
  const u1 = await page.evaluate(() => ({mode: state.mode, practising: state.practising, ad: $('#ad').value, q: $('#qline').textContent}));
  check(S, 'step 11 → Practice → Add, 71 typed → Walkthrough → Practice: the same problem, 71 still typed', u1.mode === 'add' && u1.practising && u1.ad === '71' && u1.q === u1q, JSON.stringify({u1q, ...u1}));
  await fresh(); await gen(FIG1); await page.click('#tabWalk'); await page.click('#pips button:nth-child(5)'); await page.click('#tabPractice');
  const u1b = await page.evaluate(() => ({mode: state.mode, q: $('#qline').textContent, own: $('#ownWrap').textContent}));
  check(S, 'step 5 → Practice: the practice problem is back, and "your own numbers" is the subtraction form step 5 asks for', u1b.mode === 'add' && u1b.q.includes('23° 26′ 12″') && u1b.own.includes('Subtract'), JSON.stringify(u1b));
  await page.evaluate(() => { document.querySelector('details').open = true; $('#o1d').value = '279'; $('#o2d').value = '16'; }); await page.click('#ownBtn');
  const u1c = await page.evaluate(() => ({mode: state.mode, q: $('#qline').textContent}));
  check(S, '…and Work it there subtracts', u1c.mode === 'sub' && /Subtract 16° 00′ 00″ from 279° 00′ 00″/.test(u1c.q), JSON.stringify(u1c));

  S = 'U2';   // P2: leaving an unanswered problem ends the run, whatever replaces it
  const streakAfter = async (act) => { await fresh(); await gen(FIG1); await answer({ad: '71', am: '40', as: '8'}); await gen(FIG1); await act(); return page.evaluate(() => +$('#stStreak').textContent); };
  let u2 = await streakAfter(async () => { await page.click('#tabWalk'); await page.click('#pips button:nth-child(11)'); await page.click('#tabPractice'); });
  const u2q = await page.evaluate(() => ({q: $('#qline').textContent, practising: state.practising}));
  check(S, 'a visit to the walkthrough is not a skip: the same problem, and the streak stays', u2 === 1 && u2q.practising && u2q.q.includes('23° 26′ 12″ and 48° 13′ 56″'), JSON.stringify({u2, ...u2q}));
  u2 = await streakAfter(async () => { await page.click('#tabWalk'); await page.click('#toPracticeBtn'); });
  check(S, 'Practise this, leaving the problem unanswered: the streak ends', u2 === 0, u2);
  u2 = await streakAfter(async () => { await page.click('#tabWalk'); await page.click('#tabNotes'); await page.click('.modes .btn[data-mode="sub"]'); });
  check(S, 'Notes, then a mode button: the streak ends', u2 === 0, u2);
  u2 = await streakAfter(async () => { await page.evaluate(() => { document.querySelector('details').open = true; for (const id of ['o1d','o2d']) $('#' + id).value = '10'; }); await page.click('#ownBtn'); });
  check(S, 'Work it with your own numbers: the streak ends', u2 === 0, u2);
  u2 = await streakAfter(async () => { await answer({ad: '71', am: '40', as: '8'}); await page.click('#newBtn'); });
  check(S, 'guard: New problem after a right answer keeps the streak', u2 === 2, u2);

  S = 'U3';   // P3: hints
  await hintCase('23.01666° (a 59.976″ → 60″ carry) answered 23 00 00', () => own('todms', {odec: '23.01666'}), {ad: '23', am: '0', as: '0'}, 'carry', 'Only the');
  await hintCase('62° 29′ 58″ ÷ 15 (04:10:00) answered 04:09:00', () => own('time', {o2d: '62', o2m: '29', o2s: '58'}, 'toTime'), {ad: '4', am: '9', as: '0'}, 'carry', 'The minutes are off');
  await hintCase('14° 59′ 53″ ÷ 15 (01:00:00) answered 00:59:00', () => own('time', {o2d: '14', o2m: '59', o2s: '53'}, 'toTime'), {ad: '0', am: '59', as: '0'}, 'carry', 'The hours are off');
  await fresh(); await gen({mode: 'signs', kind: 'toSign', x: {d: 15, m: 0, s: 0}, ask: 'signpos'}); r = await answer({ad: '15', am: '0', as: '0', asign: '1'});
  check(S, 'no sign passed: "none has passed"', r.fb.includes('none has passed'), r.fb);
  const zero = await page.evaluate(() => Object.keys(I18N).filter(l => /(^|[^\d°])0([^\d°]|$)/.test(I18N[l].hint.wrongSign(0))));
  check(S, 'no language says "0 have passed"', zero.length === 0, zero.join(', '));

  S = 'U4';   // P3: Enter, IME, the level, the stored best
  await fresh(); await gen({mode: 'todec', x: {d: 23, m: 26, s: 12}, ask: 'dec'}); await page.fill('#adec', '23.43666');
  const u4 = await page.evaluate(() => { $('#adec').dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', keyCode: 229, isComposing: true, bubbles: true})); return {fb: $('#fb').textContent, credit: state.credit}; });
  check(S, 'Enter confirming an IME conversion in the decimal box does not check', u4.fb === '' && u4.credit === 'open', JSON.stringify(u4));
  await own('todms', {odec: ''}); const q4 = await page.evaluate(() => $('#qline').textContent);
  await page.evaluate(() => { $('#odec').value = '12.5'; $('#odec').dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', keyCode: 229, isComposing: true, bubbles: true})); });
  check(S, '…nor in your own decimal box', (await page.evaluate(() => $('#qline').textContent)) === q4, '');
  await fresh(); await own('signs', {o1d: '1', o1m: '0', o1s: '0'}, 'toAbs');
  await page.evaluate(() => { $('#okind').value = 'toAbs'; $('#o1d').value = '5'; $('#o1m').value = '0'; $('#o1s').value = '0'; $('#o1sign').value = '8'; });
  await page.focus('#o1sign'); await page.keyboard.press('Enter');
  check(S, 'Enter on your own sign list works the problem', (await page.evaluate(() => $('#qline').textContent)).includes('5° 00′ 00″'), await page.evaluate(() => $('#qline').textContent));
  const whole = await page.evaluate(() => { let n = 0; for (let i = 0; i < 2000; i++) if (!/\.\d/.test(makeProblem('todms', 1).decStr)) n++; return n; });
  check(S, 'Gentle To degrees never asks for a bare whole number (2,000 problems)', whole === 0, whole);
  await page.evaluate(() => localStorage.setItem('reckoner.best', '1e3')); await page.reload(); await page.waitForTimeout(80);
  const b4 = await page.evaluate(() => $('#stBest').textContent); await page.evaluate(() => localStorage.removeItem('reckoner.best')); await page.reload(); await page.waitForTimeout(80);
  check(S, 'a stored best of 1e3 shows as 0', b4 === '0', b4);

  // ---------- Astra's review of v3 (6a15494) ----------
  S = 'V1';   // P1: Check reads the answer as it is now, even after a right one
  const editWrong = async (label, setup, right, wrong, expectR) => {
    await fresh(); await setup(); await answer(right); const before = await answer({});
    r = await answer(wrong); const cls = await page.evaluate(() => $('#ansWrap').className);
    check(S, `${label}: right, then edited to wrong: marked wrong, score unchanged`, r.cls.includes('no') && cls.includes('bad') && !cls.includes('good') && r.right === expectR && r.right === before.right && r.streak === before.streak, JSON.stringify({before, r, cls}));
    r = await answer(right); const cls2 = await page.evaluate(() => $('#ansWrap').className);
    check(S, `${label}: …and back to right: right again (or "Already counted"), score still unchanged`, (r.cls.includes('ok') || r.fb.includes('Already counted')) && cls2.includes('good') && r.right === expectR, JSON.stringify({r, cls2}));
  };
  await editWrong('own numbers, Fig. 1', () => own('add', FIG1F), {ad: '71', am: '40', as: '8'}, {ad: '99'}, 0);
  await editWrong('generated problem', () => gen(FIG1), {ad: '71', am: '40', as: '8'}, {ad: '99'}, 1);
  await editWrong('after Show the working', async () => { await gen(FIG1); await page.evaluate(() => $('#showBtn').click()); }, {ad: '71', am: '40', as: '8'}, {ad: '99'}, 0);
  await editWrong('after a wrong first try', async () => { await gen(FIG1); await answer({ad: '70', am: '40', as: '8'}); }, {ad: '71', am: '40', as: '8'}, {ad: '99'}, 0);
  const v1 = await page.evaluate(async () => { const out = [];
    for (const l of Object.keys(I18N)){ applyLang(l); selectTab('tabPractice'); newProblem('todms'); load({mode: 'todms', decStr: '0.00375', ask: 'dms'}, 0, true); buildAnswer('dms'); state.credit = 'own';
      $('#ad').value = '0'; $('#am').value = '0'; $('#as').value = '14'; check(); const a = $('#fb').className;
      $('#as').value = '13'; check(); const b = $('#fb').className, w = $('#ansWrap').className;
      if (!(a.includes('ok') && b.includes('no') && w.includes('bad'))) out.push(`${l}: ${a} / ${b} / ${w}`); }
    applyLang('en'); return out; });
  check(S, '0.00375° answered 0° 00′ 14″, then 13″: wrong, in all seven languages', v1.length === 0, v1.join('; '));
  await fresh(); await gen(FIG1); await answer({ad: '71', am: '40', as: '8'}); await page.fill('#ad', '72');
  const v1c = await page.evaluate(() => ({fb: $('#fb').textContent, w: $('#ansWrap').className}));
  check(S, 'editing a checked answer clears its verdict at once', v1c.fb === '' && !/good|bad/.test(v1c.w), JSON.stringify(v1c));

  S = 'V2';   // P2: carry and borrow hints only where the working has one
  await hintCase('10° 20′ 20″ + 20° 39′ 30″ (no carry) answered 31 00 50', () => own('add', {o1d: '10', o1m: '20', o1s: '20', o2d: '20', o2m: '39', o2s: '30'}), {ad: '31', am: '0', as: '50'}, 'one minute', 'carry');
  await hintCase('…answered 30 58 50', () => own('add', {o1d: '10', o1m: '20', o1s: '20', o2d: '20', o2m: '39', o2s: '30'}), {ad: '30', am: '58', as: '50'}, 'Only the minutes', 'carry');
  await hintCase('48° 30′ 40″ − 23° 10′ 20″ (no borrow) answered 26 20 20', () => own('sub', {o1d: '48', o1m: '30', o1s: '40', o2d: '23', o2m: '10', o2s: '20'}), {ad: '26', am: '20', as: '20'}, 'Only the degrees', 'borrow');
  await hintCase('…answered 25 21 20', () => own('sub', {o1d: '48', o1m: '30', o1s: '40', o2d: '23', o2m: '10', o2s: '20'}), {ad: '25', am: '21', as: '20'}, 'Only the minutes', 'borrow');
  await hintCase('guard: Fig. 1 (12″ + 56″ carries) answered 71 39 08', () => own('add', FIG1F), {ad: '71', am: '39', as: '8'}, 'carry');
  await hintCase('guard: Fig. 1 subtraction (12″ − 56″ borrows) answered 25 13 16', () => own('sub', {o1d: '48', o1m: '26', o1s: '12', o2d: '23', o2m: '13', o2s: '56'}), {ad: '25', am: '13', as: '16'}, 'borrow');
  await hintCase('guard: 23.01666° (its 60″ carry dropped) answered 23 00 00', () => own('todms', {odec: '23.01666'}), {ad: '23', am: '0', as: '0'}, 'carry');

  S = 'V3';   // P2: a fraction too small for a float is still a fraction
  for (const [a, why] of [[{ad: '71.00000000000000001', am: '40', as: '8'}, 'degrees 71.00000000000000001'], [{ad: '71', am: '40', as: '7.9999999999999999'}, 'seconds 7.9999999999999999'], [{ad: '71', am: '39.99999999999999999', as: '8'}, 'minutes 39.99999999999999999']]){
    await fresh(); await own('add', FIG1F); r = await answer(a);
    check(S, `Fig. 1 with ${why}: "Write whole numbers"`, r.cls.includes('no') && r.fb.includes('whole numbers'), JSON.stringify(r));
  }
  await fresh(); await own('add', FIG1F); r = await answer({ad: '71.000', am: '40', as: '8'});
  check(S, 'guard: 71.000 is a whole number written with zeros, and is right', r.cls.includes('ok'), JSON.stringify(r));
  await fresh(); await own('add', {o1d: '23.00000000000000001', o1m: '26', o1s: '12', o2d: '48', o2m: '13', o2s: '56'});
  const v3 = await page.evaluate(() => $('#ownFb').className);
  check(S, 'your own numbers: 23.00000000000000001 is refused', v3.includes('no'), v3);

  // ---------- languages: every language has every key ----------
  S = 'lang';
  const keys = await page.evaluate(() => { const out = []; const src = {}; for (const l of Object.keys(I18N)) src[l] = I18N[l];
    for (const k of ['form','roundUp','roundDown','already','okShown','okRetry','empty','swapped','distCross','range','decPlain','minsOnly','degsOnly','offMin','offDeg']) for (const l of Object.keys(I18N)) if (typeof I18N[l].hint[k] !== 'string') out.push(l + '.hint.' + k);
    for (const l of Object.keys(I18N)) if (typeof I18N[l].note.dmsWrap !== 'string') out.push(l + '.note.dmsWrap');
    return out; });
  check(S, 'new strings present in all seven languages', keys.length === 0, keys.join(', '));
  const texts = await page.evaluate(() => { const out = []; for (const l of Object.keys(I18N)){ const I = I18N[l];
    if (I.hint.form === I18N.en.hint.form && l !== 'en') out.push(l + ' form untranslated');
    if (!I.ui.foot1.includes('3, 4') && !I.ui.foot1.includes('3・4') && !I.ui.foot1.includes('图 3')) out.push(l + ' foot1'); } return out; });
  check(S, 'translations are not English copies; every footer names Figure 3', texts.length === 0, texts.join(', '));

  // ---------- layout: nothing pushed off the page, in any language, at phone widths ----------
  S = 'layout';
  for (const [w, h] of [[320, 900], [375, 800], [390, 844]]){
    const { ctx, page: p2 } = await open({width: w, height: h});
    const bad = await p2.evaluate(() => { const out = [];
      for (const l of Object.keys(I18N)){ applyLang(l);
        for (let i = 0; i < WALK.length; i++){ selectTab('tabWalk'); showWalk(i); $('#allBtn').click();
          const de = document.documentElement; if (de.scrollWidth > de.clientWidth + 1) out.push(`${l} step ${i+1}: page scrolls sideways by ${de.scrollWidth - de.clientWidth}px`);
          document.querySelectorAll('#slate .work > *').forEach(el => { const r = el.getBoundingClientRect(); if (r.left < -1 || r.right > innerWidth + 1) out.push(`${l} step ${i+1}: ${el.className} spans ${Math.round(r.left)}–${Math.round(r.right)}`); });
          document.querySelectorAll('#slate .stair, #slate .cols').forEach(el => { if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible') out.push(`${l} step ${i+1}: ${el.className} overflows without scrolling`); });
        } }
      return out; });
    check(S, `${w}×${h}: every walkthrough step in seven languages stays on the page`, bad.length === 0, bad.slice(0, 6).join('; ') + (bad.length > 6 ? ` … ${bad.length}` : ''));
    await ctx.close();
  }

  check('errors', 'no page or console errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close();
  console.log(`${pass} passed, ${fail} failed`); failures.forEach(f => console.log('  ✗ ' + f));
  process.exit(fail ? 1 : 0);
})();
