// Random key presses. Invariants: no page error; the display and the last history line never show NaN, Infinity, undefined or null;
// seconds stay integers; numbers stay finite; a sign-form entry never carries a minus; the display is never empty.
const H = require('./h'); const { press, check, summary } = H;
const KEYS = ['0','1','2','3','4','5','6','7','8','9','.','unit','+','−','×','÷','=','C','AC','bs','neg','dec','sign','sto','reg:LST','reg:RAMC','reg:OE','reg:φ','reg:ratio','reg:x','store:x','store:ratio','mode:arc','mode:time','sin','cos','tan','asin','acos','atan','x15','d15','p180','accel'];
const N = +(process.env.FUZZ || 10000);
(async () => {
  const { browser, page, errs } = await H.open();
  const bad = await page.evaluate(({ KEYS, N }) => { const t = window.takht, S = t.state, out = []; let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; const hist = [];
    for (let i = 0; i < N; i++) {
      if (i % 2500 === 0) t.applyLang(Object.keys(t.I18N)[Math.floor(rnd() * Object.keys(t.I18N).length)]);
      if (i % 1700 === 0) document.querySelector('#wrapChip').click();
      const pool = rnd() < 0.45 ? ['0','1','2','3','4','5','6','7','8','9','unit','=','+','−','×','÷'] : KEYS; const k = pool[Math.floor(rnd() * pool.length)]; hist.push(k); if (hist.length > 15) hist.shift();
      try { t.press(k); } catch (e) { out.push('throw ' + e + ' after ' + hist.join(' ')); break; }
      const val = document.querySelector('#val').textContent, last = S.tape[S.tape.length - 1]; const tl = last ? last.text + ' ' + last.note : '';
      const vv = S.val.k === 'sex' ? S.val.sec : S.val.v; const p = [];
      if (/NaN|Infinity|undefined|null/.test(val + tl)) p.push('display/tape ' + val + ' | ' + tl);
      if (!val.trim()) p.push('empty display');
      if (S.val.k === 'sex' && !Number.isInteger(vv)) p.push('non-integer seconds ' + vv);
      if (S.val.k === 'dec' && !isFinite(vv)) p.push('non-finite number');
      if (S.entry && S.entry.k === 'sex' && S.entry.sign && S.entry.neg) p.push('negative sign-form entry');
      if (p.length) { out.push(p.join('; ') + ' after ' + hist.join(' ')); if (out.length > 10) break; } }
    t.applyLang('en'); return out; }, { KEYS, N });
  check(`${N} random presses: invariants hold`, bad.join('\n'), '');
  check('no page errors', errs.join('|'), ''); summary(); await browser.close();
})();
