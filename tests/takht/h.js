// Review harness for the Takht. Independent of the page's own code.
// Point it at a build with TAKHT=/path/to/index.html (default: the repo's takht/index.html).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const PAGE = path.resolve(process.env.TAKHT || path.join(__dirname, '..', '..', 'takht', 'index.html'));
if (!fs.existsSync(PAGE)) { console.error('page not found: ' + PAGE + ' (set TAKHT=/path/to/index.html)'); process.exit(2); }
const URL = 'file://' + PAGE;

async function open(opts = {}) {
  const browser = opts.browser || await chromium.launch();
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 390, height: 844 }, hasTouch: !!opts.touch, locale: opts.locale || 'en-US' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.takht && window.takht.press);
  if (opts.lang) await page.evaluate(l => window.takht.applyLang(l), opts.lang);
  return { browser, ctx, page, errs };
}

// Key language: tokens separated by spaces.
//   digits and a point: each character is pressed   u = the unit key (° ′ ″ / h m s)
//   + - * / =        n = ±        C AC bs dec sign sto x15 d15 p180 accel sin cos tan asin acos atan
//   @R recall register R      >R store into register R (as a hold)      M:arc / M:time the °/h control
const MAP = { '-': '−', '*': '×', '/': '÷', 'u': 'unit', 'n': 'neg', '?': 'help' };
function tokens(seq) {
  const out = [];
  for (const t of seq.trim().split(/\s+/)) {
    if (!t) continue;
    if (/^[0-9.]+$/.test(t)) { for (const c of t) out.push(c); continue; }
    if (t[0] === '@') { out.push('reg:' + t.slice(1)); continue; }
    if (t[0] === '>') { out.push('store:' + t.slice(1)); continue; }
    if (t.startsWith('M:')) { out.push('mode:' + t.slice(2)); continue; }
    out.push(MAP[t] || t);
  }
  return out;
}
async function press(page, seq) { for (const k of tokens(seq)) await page.evaluate(k => window.takht.press(k), k); }
async function view(page) {
  return page.evaluate(() => {
    const S = window.takht.state, tape = S.tape, last = tape[tape.length - 1], msgEl = document.querySelector('#msg');
    return {
      val: document.querySelector('#val').textContent.replace(/︎/g, ''),
      pending: document.querySelector('#pending').textContent,
      msg: msgEl.classList.contains('show') ? msgEl.textContent : '',
      msgBad: msgEl.classList.contains('bad') && msgEl.classList.contains('show'),
      last: last ? last.text.replace(/︎/g, '') : null, note: last ? last.note : null, n: tape.length,
      sval: JSON.parse(JSON.stringify(S.val)), entry: JSON.parse(JSON.stringify(S.entry)),
      pend: S.pending ? JSON.parse(JSON.stringify(S.pending)) : null, right: S.right,
      view: JSON.parse(JSON.stringify(S.view)), mode: S.mode, wrap: S.wrap, regs: JSON.parse(JSON.stringify(S.regs)),
      live: document.querySelector('#live').textContent,
    };
  });
}
async function run(page, seq) { await press(page, seq); return view(page); }
// Pin the state a test assumes. Every test should start from here: the leaks between tests are where a harness lies.
async function fresh(page, mode = 'arc') {
  await page.evaluate(() => { const S = window.takht.state; if (S.view.sign) window.takht.press('sign'); });
  await press(page, 'AC M:' + mode + ' AC');
  await page.evaluate(() => { const S = window.takht.state; if (S.view.sign) window.takht.press('sign'); });
  await wrap(page, true);
}
async function wrap(page, on) { if ((await page.evaluate(() => window.takht.state.wrap)) !== on) await page.evaluate(() => document.querySelector('#wrapChip').click()); }
async function signView(page, on) { if ((await page.evaluate(() => window.takht.state.view.sign)) !== on) await press(page, 'sign'); }

// ---- independent formatting and astronomy (integer seconds) ----
const pad = n => (n < 10 ? '0' : '') + n;
function dms(sec) { const neg = sec < 0; sec = Math.abs(sec); const d = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (neg ? '−' : '') + `${d}° ${pad(m)}′ ${pad(s)}″`; }
function hms(sec) { const neg = sec < 0; sec = Math.abs(sec); const d = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (neg ? '−' : '') + `${pad(d)}:${pad(m)}:${pad(s)}`; }
const S = (d, m = 0, s = 0) => (d * 60 + m) * 60 + s;
const RAD = Math.PI / 180;
const wrap360 = x => ((x % 360) + 360) % 360;
const roundHalfAway = x => x < 0 ? -Math.round(-x) : Math.round(x);
function mcSec(ramcDeg, oeDeg) { return roundHalfAway(wrap360(Math.atan2(Math.sin(ramcDeg * RAD), Math.cos(ramcDeg * RAD) * Math.cos(oeDeg * RAD)) / RAD) * 3600) % 1296000; }
function ascSec(ramcDeg, phiDeg, oeDeg) { const R = ramcDeg * RAD, e = oeDeg * RAD, p = phiDeg * RAD; return roundHalfAway(wrap360(Math.atan2(Math.cos(R), -(Math.sin(R) * Math.cos(e) + Math.tan(p) * Math.sin(e))) / RAD) * 3600) % 1296000; }
const SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
function signForm(sec) { sec = ((sec % 1296000) + 1296000) % 1296000; const i = Math.floor(sec / 108000); return dms(sec - i * 108000) + ' ' + SIGNS[i]; }
const secToKeys = sec => { sec = Math.abs(sec); return `${Math.floor(sec / 3600)} u ${Math.floor(sec % 3600 / 60)} u ${sec % 60}`; };

// Every language the page carries, read from the page, so a newly added one is tested with the rest.
async function languages(browser) { const ctx = await browser.newContext(); const page = await ctx.newPage(); await page.goto(URL);
  await page.waitForFunction(() => window.takht && window.takht.I18N); const ls = await page.evaluate(() => Object.keys(window.takht.I18N)); await ctx.close(); return ls; }

// ---- results ----
const R = { pass: 0, fail: 0 };
function check(name, got, want, extra) {
  const ok = got === want; if (ok) R.pass++; else R.fail++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : `\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(want)}` + (extra ? `\n      ${extra}` : '')));
  return ok;
}
function summary() { console.log(`\n${R.pass} passed, ${R.fail} failed`); process.exitCode = R.fail ? 1 : 0; }
module.exports = { open, press, run, view, fresh, wrap, signView, tokens, dms, hms, S, mcSec, ascSec, signForm, secToKeys, check, summary, R, wrap360, roundHalfAway, chromium, URL, PAGE, languages };
