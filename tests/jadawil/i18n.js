// The seven languages: the tables in the page, the menu, dah.lang shared with the shelf (read at start-up, written
// when the student chooses), <html lang>, and the first screen of each of the four books with no "undefined", "NaN"
// or "${" in any language, on a phone and on a desktop.
const H = require('./h'); const { check, LANGS, DIR, path, fs } = H;
const HTML = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const BOOKS = ['ephemeris', 'atlas', 'houses', 'worksheet'];
// the text a reader sees on the screen as it stands: visible text nodes whose box meets the viewport
const firstScreen = p => p.evaluate(() => { const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const t = n.textContent.trim(), el = n.parentElement; if (!t || !el || el.closest('script,style,[hidden]')) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (b.width && b.height && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth) out.push(t); }
  return out.join(' '); });

H.main(async () => {
  for (const l of LANGS) check(`the page carries its ${l} table`, new RegExp(`I18N\\.${l}\\s*=\\s*\\{`).test(HTML), true);
  const srv = await H.serve(), b = await H.chromium.launch();
  const open = async (o = {}) => {
    const ctx = await b.newContext({ viewport: o.vp || { width: 390, height: 844 }, isMobile: !o.vp, hasTouch: !o.vp, locale: o.locale || 'en-US', serviceWorkers: 'block' });
    if (o.lang) await ctx.addInitScript(l => { try { localStorage.setItem('dah.lang', l); } catch (e) {} }, o.lang);
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(srv.base, { waitUntil: 'load' }); await H.ready(p);
    const state = () => p.evaluate(() => ({ lang: document.documentElement.lang, menu: document.querySelector('#langTop').value, h1: document.querySelector('h1').textContent.trim(), saved: localStorage.getItem('dah.lang') }));
    return { ctx, p, errs, state };
  };

  let o = await open();
  check('the menu offers the seven, English first', await o.p.$$eval('#langTop option', os => os.map(x => x.value).join(' ')), LANGS.join(' '));
  const enH1 = (await o.state()).h1;
  // choosing on the page writes dah.lang, for the shelf and the other pieces, and the choice holds across a reload
  for (const l of [...LANGS.slice(1), 'en']) { await o.p.selectOption('#langTop', l); await o.p.waitForTimeout(150); const s = await o.state();
    check(`choosing ${l} on the page tags it and writes dah.lang`, `${s.lang.split('-')[0]} ${s.saved}`, `${l} ${l}`); }
  await o.p.selectOption('#langTop', 'fr'); await o.p.reload(); await H.ready(o.p);
  check('the choice holds across a reload', (await o.state()).menu, 'fr');
  check('no page errors while choosing', o.errs.join(' | '), ''); await o.ctx.close();

  // dah.lang preset (by the shelf, say) is what the page opens in, whatever the browser's language
  for (const l of LANGS) for (const [label, vp] of [['phone', null], ['desktop', { width: 1280, height: 800 }]]) {
    o = await open({ lang: l, locale: l === 'de' ? 'ja-JP' : 'de-DE', vp }); const s = await o.state();
    if (!vp) {
      check(`${l}: dah.lang preset opens the page in it, <html lang> following`, `${s.lang.split('-')[0]} ${s.menu}`, `${l} ${l}`);
      if (l !== 'en') check(`${l}: the title is not the English one`, s.h1 !== enH1, true, s.h1);
    }
    const bad = [];
    for (const book of BOOKS) { await o.p.locator(`[data-tab="${book}"]`).click(); await o.p.waitForTimeout(200);
      const t = await firstScreen(o.p), m = t.match(/.{0,30}(undefined|NaN|\$\{).{0,30}/);
      if (!t.length) bad.push(`${book}: nothing on screen`); if (m) bad.push(`${book}: "${m[0]}"`); }
    check(`${l}, ${label}: the first screen of each book shows no undefined, NaN or \${`, bad.join('; '), '');
    check(`${l}, ${label}: no page errors`, o.errs.join(' | '), ''); await o.ctx.close();
  }
  await b.close(); await srv.close();
});
