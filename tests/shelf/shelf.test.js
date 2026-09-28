// The shelf (index.html): its languages, how it picks one, and its layout.
// Run: NODE_PATH=$(npm root -g) node shelf.test.js [page.html]   (default: the repo's index.html; VERBOSE=1 prints every check)
// Exit status: 0 when every check passed, 1 when any failed or a group threw, 2 when the page or Playwright is missing.
const path = require('path'), fs = require('fs');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is not available: ' + String(e.message).split('\n')[0]); process.exit(2); }
const ROOT = path.join(__dirname, '..', '..');
const PAGE = path.resolve(process.argv[2] || path.join(ROOT, 'index.html'));
if (!fs.existsSync(PAGE)) { console.error('page not found: ' + PAGE); process.exit(2); }
const URL = 'file://' + PAGE, HTML = fs.readFileSync(PAGE, 'utf8');

let pass = 0, fail = 0; const failures = [];
function check(group, name, ok, detail) {
  if (ok) pass++; else { fail++; failures.push(`[${group}] ${name}\n      ${String(detail === undefined ? '' : detail).slice(0, 600)}`); }
  if (process.env.VERBOSE) console.log([ok ? 'ok  ' : 'FAIL', group, name].join('\t'));
}
async function group(name, fn) { try { await fn(name); } catch (e) { check(name, 'the group ran to the end', false, e.stack || e); } }

// the pieces the shelf lists: their own titles are what the shelf must show
const PIECES = ['sayyids-sphere', 'sayyids-orrery', 'reckoner', 'takht', 'between-the-lines'];
const tagsOf = s => (s.match(/<\/?[a-z][^>]*>/gi) || []).map(t => t.replace(/\s.*?(\/?)>$/, '$1>')).sort().join('');

(async () => {
  const browser = await chromium.launch();
  const LANGS = (HTML.match(/<option value="([a-z]+)"/g) || []).map(x => x.slice(15, -1));
  // the English is the page itself, as it stands before any script runs
  const EN = {}, ORDER = [];
  { const c = await browser.newContext({ javaScriptEnabled: false }), p = await c.newPage(); await p.goto(URL, { waitUntil: 'load' });
    for (const [k, v] of await p.evaluate(() => [...document.querySelectorAll('[data-i18n],[data-i18n-html]')].map(e => { const h = e.hasAttribute('data-i18n-html');
      return [e.getAttribute(h ? 'data-i18n-html' : 'data-i18n'), h ? e.innerHTML.trim() : e.textContent.trim()]; }))) { EN[k] = v; ORDER.push(k); }
    await c.close(); }
  const m = HTML.match(/var I18N = (\{[\s\S]*?\});\n\s*var TAGS/);
  const I18N = m ? new Function('return ' + m[1])() : null;

  await group('table', async G => {
    check(G, 'the language table is where the suite expects it', !!I18N, 'var I18N = {…}; var TAGS');
    check(G, `the menu offers ${LANGS.length} languages, English first`, LANGS.length >= 7 && LANGS[0] === 'en', LANGS.join(' '));
    for (const l of LANGS.slice(1)) {
      const T = (I18N || {})[l] || {}, keys = Object.keys(EN);
      const missing = keys.filter(k => !T[k] || !String(T[k]).trim()), extra = Object.keys(T).filter(k => !(k in EN));
      const same = keys.filter(k => T[k] === EN[k]);
      const html = keys.filter(k => T[k] && tagsOf(T[k]) !== tagsOf(EN[k]));
      const code = keys.filter(k => /undefined|NaN|\$\{|&[a-z]+;/.test(T[k] || ''));
      check(G, `${l}: every string translated, none empty, none unknown`, !missing.length && !extra.length, `missing ${missing} extra ${extra}`);
      check(G, `${l}: no string left in English`, !same.length, same.join(', '));
      check(G, `${l}: the same markup as the English`, !html.length, html.join(', '));
      check(G, `${l}: no code or stray entities`, !code.length, code.join(', '));
    }
  });

  // a page in a context: locale sets navigator.language(s); langs overrides the whole list; store presets storage
  async function open({ locale = 'en-US', langs, store, blockStorage, js = true, w = 1280, h = 800 } = {}) {
    const ctx = await browser.newContext({ locale, javaScriptEnabled: js, viewport: { width: w, height: h } });
    await ctx.addInitScript(([langs, store, block]) => {
      if (langs) Object.defineProperty(navigator, 'languages', { get: () => langs });
      if (block) Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
      else if (store) { for (const k in store) localStorage.setItem(k, store[k]); }
    }, [langs || null, store || null, !!blockStorage]);
    const page = await ctx.newPage(); const errs = [], outside = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
    page.on('request', r => { if (r.url() !== URL && !r.url().startsWith('data:')) outside.push(r.url()); });
    await page.goto(URL, { waitUntil: 'load' });
    const state = () => page.evaluate(() => ({ lang: document.documentElement.lang, h1: document.querySelector('h1').textContent, sel: document.getElementById('langSel').value,
      saved: (() => { try { return localStorage.getItem('dah.lang'); } catch (e) { return 'blocked'; } })() }));
    return { ctx, page, errs, outside, state };
  }

  await group('choosing', async G => {
    const T = I18N || {}, h1 = l => l === 'en' ? EN.h1 : (T[l] || {}).h1;
    const cases = [['en-US', 'en'], ['en-GB', 'en'], ['nb-NO', 'nb'], ['no', 'nb'], ['nn-NO', 'nb'], ['es-MX', 'es'], ['fr-CA', 'fr'], ['de-AT', 'de'], ['zh-CN', 'zh'], ['zh-TW', 'zh'], ['ja-JP', 'ja'], ['it-IT', 'en'], ['ar', 'en']];
    for (const [locale, want] of cases) { const p = await open({ locale }); const s = await p.state();
      check(G, `browser ${locale} → ${want}`, s.lang.split('-')[0] === want && s.h1 === h1(want) && s.sel === want, JSON.stringify(s));
      check(G, `browser ${locale}: nothing saved until the reader chooses`, s.saved === null, s.saved); await p.ctx.close(); }
    let p = await open({ langs: ['it-IT', 'de-DE', 'fr-FR'] }); let s = await p.state();
    check(G, 'the first of the browser\'s languages the shelf has wins (it, de, fr → de)', s.sel === 'de', JSON.stringify(s)); await p.ctx.close();
    p = await open({ locale: 'de-DE', store: { 'dah.lang': 'ja' } }); s = await p.state();
    check(G, 'a language chosen in any piece (dah.lang) beats the browser\'s', s.sel === 'ja' && s.lang === 'ja', JSON.stringify(s)); await p.ctx.close();
    p = await open({ locale: 'de-DE', store: { 'sayyid.lang': 'fr' } }); s = await p.state();
    check(G, 'the older sayyid.lang is honoured as the pieces honour it', s.sel === 'fr', JSON.stringify(s)); await p.ctx.close();
    p = await open({ locale: 'es-ES', store: { 'dah.lang': 'xx' } }); s = await p.state();
    check(G, 'an unknown saved language is ignored', s.sel === 'es', JSON.stringify(s)); await p.ctx.close();
    p = await open({ locale: 'fr-FR', blockStorage: true }); s = await p.state();
    check(G, 'with storage blocked the browser\'s language still applies, without errors', s.sel === 'fr' && !p.errs.length, JSON.stringify(s) + p.errs); await p.ctx.close();
  });

  await group('menu', async G => {
    const p = await open({ locale: 'en-US' });
    for (const l of LANGS) { await p.page.selectOption('#langSel', l); const s = await p.state();
      const cjk = await p.page.evaluate(() => document.body.classList.contains('cjk'));
      check(G, `choosing ${l} shows it, tags the page and saves the choice for every piece`, s.lang.split('-')[0] === l && s.saved === l && cjk === (l === 'zh' || l === 'ja'), JSON.stringify(s)); }
    await p.page.selectOption('#langSel', 'nb'); await p.page.reload({ waitUntil: 'load' }); const s = await p.state();
    check(G, 'the choice holds across a reload', s.sel === 'nb' && s.lang === 'nb', JSON.stringify(s));
    await p.page.selectOption('#langSel', 'en'); const back = await p.page.evaluate(() => [...document.querySelectorAll('[data-i18n],[data-i18n-html]')].map(e => e.hasAttribute('data-i18n-html') ? e.innerHTML.trim() : e.textContent.trim()));
    const want = ORDER.map(k => EN[k]);
    check(G, 'back to English restores the page exactly', JSON.stringify(back) === JSON.stringify(want), '');
    check(G, 'no page or console errors', !p.errs.length, p.errs.join(' | '));
    check(G, 'no requests beyond the page itself', !p.outside.length, p.outside.slice(0, 5).join(', ')); await p.ctx.close();
  });

  await group('pieces', async G => {
    // the name on the shelf is the piece's own title in that language (the Takht's Arabic aside)
    for (const l of LANGS) { const p = await open({ store: { 'dah.lang': l } }); const bad = [];
      const names = await p.page.evaluate(() => [...document.querySelectorAll('.piece h3')].map(e => { const c = e.cloneNode(true); c.querySelectorAll('[lang=ar]').forEach(a => a.remove()); return c.textContent.replace(/\s*[、,]\s*(?=[)）]\s*$)/, '').replace(/\s*[(（]\s*[)）]\s*$/, '').trim(); }));
      for (let i = 0; i < PIECES.length; i++) { const q = await p.ctx.newPage(); await q.goto('file://' + path.join(ROOT, PIECES[i], 'index.html'), { waitUntil: 'load' }); await q.waitForTimeout(150);
        const title = (await q.title()).split(/\s[—–-]\s/)[0].trim(), h = await q.evaluate(() => (document.querySelector('h1') || {}).textContent || '');
        if (!(names[i] && (h.includes(names[i]) || title.includes(names[i])))) bad.push(`${PIECES[i]}: shelf "${names[i]}", page "${h.trim() || title}"`); await q.close(); }
      check(G, `${l}: each piece is named as its page names itself`, !bad.length, bad.join('; ')); await p.ctx.close(); }
  });

  await group('no script', async G => {
    const p = await open({ locale: 'ja-JP', js: false }); const t = await p.page.evaluate(() => document.body.innerText);
    check(G, 'without scripts the page is whole, in English', t.includes(EN.h1) && t.includes(EN['footer.built']) && (t.match(/\n/g) || []).length > 20, '');
    await p.ctx.close();
  });

  await group('layout', async G => {
    for (const [w, h] of [[320, 568], [390, 844], [1280, 800]]) { const bad = [];
      for (const l of LANGS) { const p = await open({ store: { 'dah.lang': l }, w, h });
        const b = await p.page.evaluate(() => { const out = []; if (document.documentElement.scrollWidth > innerWidth + 1) out.push('page scrolls sideways');
          document.querySelectorAll('h1,h2,h3,p,.tag,select,footer,footer a').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.left < -1)) out.push((e.className || e.tagName) + ' off the side'); });
          document.querySelectorAll('.piece').forEach(pc => { const pr = pc.getBoundingClientRect(); pc.querySelectorAll('.tag,h3,p').forEach(e => { const r = e.getBoundingClientRect(); if (r.right > pr.right + 1) out.push((e.className || e.tagName) + ' past its card'); }); });
          const t = document.body.innerText; if (/undefined|NaN|\$\{/.test(t)) out.push('code on the page');
          return [...new Set(out)]; });
        b.forEach(x => bad.push(`${l} ${x}`)); await p.ctx.close(); }
      check(G, `${w}×${h}: every language stays on the page, nothing past its card`, !bad.length, bad.slice(0, 8).join('; ')); }
  });

  await browser.close();
  console.log(`${pass} passed, ${fail} failed`); failures.forEach(f => console.log('  ✗ ' + f));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('The suite could not finish:', e); process.exit(2); });
