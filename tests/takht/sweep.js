// Node sweeps over the page's own number functions, against BigInt: every ÷15 note, every accel note, and the half rule
// (display, note and rounding agree on what is a half). The functions are cut out of the page between its markers
// (/*@core*/ … /*@endcore*/, the English table, /*@calc*/ … /*@endcalc*/), so they are the page's, not copies.
const fs = require('fs'), path = require('path'), vm = require('vm');
const PAGE = path.resolve(process.env.TAKHT || path.join(__dirname, '..', '..', 'takht', 'index.html'));
const src = fs.readFileSync(PAGE, 'utf8');
let pass = 0, fail = 0;
const check = (name, got, want, info) => { const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log('ok   ' + name); } else { fail++; console.log('FAIL ' + name + '\n      got:  ' + JSON.stringify(got) + '\n      want: ' + JSON.stringify(want) + (info ? '\n      ' + info : '')); } };
const cut = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('marker missing: ' + a); return src.slice(i + a.length, j); };
const en = src.slice(src.indexOf('I18N.en = {'), src.indexOf('\nI18N.nb = {'));
const names = ['isInt', 'truncFixed', 'cutMark', 'snapHalf', 'roundSec', 'fmtNum', 'fmtExact', 'fmtScaledExact', 'dec', 'N', 'fmtSex'];
const code = `const document = {querySelector(){ return {textContent:'', classList:{add(){},remove(){}}}; }, querySelectorAll(){ return []; }};
const localStorage = {getItem(){ return null; }, setItem(){}}; const I18N = {}; const DAH = '';
${cut('/*@core*/', '/*@endcore*/')}\n${en}\n${cut('/*@calc*/', '/*@endcalc*/')}
({${names.join(', ')}})`;
const T = vm.runInNewContext(code, {});

// ---------- the ÷15 note: U.d15 writes it from the exact quotient whenever 15 does not divide the seconds ----------
check('U.d15 writes its note with fmtScaledExact from the seconds and 15', src.includes("if (v.sec % 15) notes.push(M().rounded(fmtScaledExact(v.sec, dec(15, null, '15'), true, TIME, exact)));"), true);
function wantD15(sec){   // sec/15 as the note prints it: two places (more while they are 0), a cut mark iff digits remain
  const whole = Math.floor(sec / 15), rem = sec % 15, d = Math.floor(whole / 3600), m = Math.floor(whole % 3600 / 60), s = whole % 60;
  let r = rem, digs = ''; for (let i = 0; i < 12; i++){ r *= 10; digs += Math.floor(r / 15); r %= 15; }
  const cutm = r !== 0 || /[1-9]/.test(digs.slice(2)), f = cutm ? digs.slice(0, 2) : digs.slice(0, 2).replace(/0+$/, '');
  return `${String(d).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${f ? '.' + f : ''}${cutm ? '…' : ''}`;
}
let n1 = 0, bad1 = [];
for (let sec = 1; sec < 1296000; sec++){ if (sec % 15 === 0) continue; n1++;
  const got = T.fmtScaledExact(sec, T.dec(15, null, '15'), true, 'time', sec / 15), want = wantD15(sec); if (got !== want) bad1.push(`${sec}″: ${got} ≠ ${want}`); }
check(`÷15 note right for every arc 1″ to 359° 59′ 59″ with a remainder (${n1})`, bad1.length, 0, bad1.slice(0, 5).join(' | '));
let bad1b = 0; for (let sec = 1296001; sec < 36e9; sec += 777773){ if (sec % 15 && T.fmtScaledExact(sec, T.dec(15, null, '15'), true, 'time', sec / 15) !== wantD15(sec)) bad1b++; }
check('  and past 360° (wrap off, a sample to 10,000,000°)', bad1b, 0);

// ---------- the accel note: exact = sec × 9.86 / 3600 = sec × 493 / 180000 ----------
check('U.accel writes its note from truncFixed and cutMark', src.includes("notes: isInt(exact) ? [] : [M().rounded(N(truncFixed(exact, exact < 0.01 ? 4 : 2)) + cutMark(truncFixed(exact, exact < 0.01 ? 4 : 2), exact) + ' s')]"), true);
let bad2 = [], halves2 = 0;
for (let sec = 0; sec <= 86400; sec++){
  const num = BigInt(sec) * 493n, den = 180000n, rem = num % den, p = num * 100n < den ? 4 : 2, sc = 10n ** BigInt(p);
  let s = (num * sc / den).toString().padStart(p + 1, '0'); s = (s.slice(0, -p) + '.' + s.slice(-p)).replace(/0+$/, '').replace(/\.$/, '');
  const want = rem === 0n ? null : s + ((num * sc) % den ? '…' : '') + ' s', exact = sec / 3600 * 9.86;
  const whole = Number(num / den) + ((rem * 2n >= den) ? 1 : 0); if (rem * 2n === den) halves2++;
  const got = T.isInt(exact) ? null : T.N(T.truncFixed(exact, exact < 0.01 ? 4 : 2)) + T.cutMark(T.truncFixed(exact, exact < 0.01 ? 4 : 2), exact) + ' s';
  if (got !== want || T.roundSec(exact) !== whole) bad2.push(`${sec}: note ${got} ≠ ${want}, ${T.roundSec(exact)} ≠ ${whole}`); }
check('accel note and rounding right for every UT 00:00:00 to 24:00:00 (86,401)', bad2.length, 0, bad2.slice(0, 5).join(' | '));
check('  (no exact half among them, so the half rule never decides an accel)', halves2, 0);

// ---------- the half rule: what is shown as the half is rounded as the half, and only that ----------
// near a half: |x| < 2^50 and within 1e-9 of it; what a shown number says against the half: below it, exactly it, above it
const halfOf = x => Math.floor(Math.abs(x)) + 0.5, sgn = x => x < 0 ? -1 : 1;
const near = x => { const a = Math.abs(x), h = halfOf(x); return a > 0 && a < 2 ** 50 && Math.abs(h - a) <= 1e-9 * Math.max(h, 1); };
const reads = (v, cutm, h) => v < h ? -1 : v > h || cutm ? 1 : 0;
const roundsUp = x => Math.abs(T.roundSec(x)) === Math.ceil(halfOf(x));
const wrong = (r, up) => (r < 0 && up) || (r >= 0 && !up);
let nOp = 0, nNote = 0, badOp = [], badNote = [];
function operand(v, label){ if (!near(v)) return; const t = T.fmtNum(v); if (t.includes('×10')) return; nOp++;
  if (wrong(reads(Math.abs(parseFloat(t.replace(/−|…/g, ''))), t.includes('…'), halfOf(v)), roundsUp(v))) badOp.push(`${label}: shown ${t}, 1″ × it is ${T.roundSec(v)}″`); }
// the note as a student reads it: "d° mm′ ss.ff…″" back to seconds
function note(y, label){ if (!near(y)) return; const t = T.fmtExact(y, 'arc'), m = t.match(/(\d+)° (\d+)′ (\d+(?:\.\d+)?)(…?)″$/); if (!m) return; nNote++;
  if (wrong(reads(+m[1] * 3600 + +m[2] * 60 + +m[3], !!m[4], halfOf(y)), roundsUp(y))) badNote.push(`${label}: noted ${t}, rounded ${T.roundSec(y)}″`); }
const rad = s => s / 3600 * Math.PI / 180;
for (let s = 0; s < 1296000; s++) for (const [f, v] of [['sin', Math.sin(rad(s))], ['cos', Math.cos(rad(s))], ['tan', Math.tan(rad(s))]]){
  if (!isFinite(v)) continue; operand(v, `${f} ${s}″`); note(v, `1″ × ${f} ${s}″`); note(45 * v, `45″ × ${f} ${s}″`); }
const TR = []; for (let d = 0; d < 360; d++) for (const f of ['sin', 'cos', 'tan']){ const v = Math[f](d * Math.PI / 180); if (isFinite(v) && Math.abs(v) < 1e6) TR.push([`${f} ${d}°`, v]); }
for (let i = 0; i < TR.length; i++) for (let j = i; j < TR.length; j++){ const p = TR[i][1] * TR[j][1];
  operand(p, `${TR[i][0]} × ${TR[j][0]}`); note(p, `1″ × ${TR[i][0]} × ${TR[j][0]}`); note(45 * p, `45″ × ${TR[i][0]} × ${TR[j][0]}`);
  if (TR[j][1]){ const q = TR[i][1] / TR[j][1]; operand(q, `${TR[i][0]} ÷ ${TR[j][0]}`); note(45 * q, `45″ × ${TR[i][0]} ÷ ${TR[j][0]}`); } }
const deg = x => x * 180 / Math.PI * 3600;
for (let k = -100000; k <= 100000; k++){ note(deg(Math.asin(k / 100000)), `sin⁻¹ ${k / 100000}`); note(deg(Math.acos(k / 100000)), `cos⁻¹ ${k / 100000}`); }
for (let k = -200000; k <= 200000; k++) note(deg(Math.atan(k / 1000)), `tan⁻¹ ${k / 1000}`);
for (const [l, v] of TR){ if (Math.abs(v) <= 1){ note(deg(Math.asin(v)), `sin⁻¹(${l})`); note(deg(Math.acos(v)), `cos⁻¹(${l})`); } note(deg(Math.atan(v)), `tan⁻¹(${l})`); }
check(`half rule: an operand shown as the half is rounded as one, and only then (${nOp} trig values, products and quotients near a half)`, badOp.length, 0, badOp.slice(0, 5).join(' | '));
check(`half rule: a note that reads the half is rounded as one, and only then (${nNote} notes near a half)`, badNote.length, 0, badNote.slice(0, 5).join(' | '));
check('cos 120° × 45″ is noted 22.5″ and comes to 23″', [T.fmtExact(45 * Math.cos(rad(432000)), 'arc'), T.roundSec(45 * Math.cos(rad(432000)))], ['−0° 00′ 22.5″', -23]);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
