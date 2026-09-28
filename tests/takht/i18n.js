// The language tables: every language the page carries is complete, listed in the menu, and renders cleanly.
// A new language needs three things in takht/index.html: its table (I18N.xx), its name in LANG_NAMES and its tag in LANG_TAGS.
// Key labels (keys.*) may be left out; the English label is then used, as sin, cos and tan are in most languages.
const H = require('./h'); const { check, summary } = H;
(async () => {
  const browser = await H.chromium.launch(); const { page, errs } = await H.open({ browser });
  const langs = await page.evaluate(() => Object.keys(window.takht.I18N));
  const gaps = await page.evaluate(() => { const I = window.takht.I18N;
    const walk = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => v && typeof v === 'object' && !Array.isArray(v) ? walk(v, pre + k + '.') : [[pre + k, typeof v, v]]);
    const en = walk(I.en), enKeys = new Set(en.map(e => e[0])), out = {};
    for (const l of Object.keys(I)) { if (l === 'en') continue; const m = new Map(walk(I[l]).map(([k, t, v]) => [k, [t, v]]));
      out[l] = { missing: en.filter(([k]) => !m.has(k) && !k.startsWith('keys.')).map(e => e[0]),
                 kind: en.filter(([k, t]) => m.has(k) && m.get(k)[0] !== t).map(e => e[0]),
                 empty: [...m].filter(([, [t, v]]) => t === 'string' && !v.trim()).map(e => e[0]),
                 unknown: [...m.keys()].filter(k => !enKeys.has(k)) }; }
    return out; });
  for (const l of langs) if (l !== 'en') { const g = gaps[l];
    check(`${l}: every English string has a translation (key labels may stay English)`, g.missing.join(', '), '');
    check(`${l}: each entry is the same kind as the English one (text or function)`, g.kind.join(', '), '');
    check(`${l}: no empty strings`, g.empty.join(', '), '');
    check(`${l}: no entries the English table lacks (a misspelt key?)`, g.unknown.join(', '), ''); }
  const menu = await page.$$eval('#langTop option', os => os.map(o => ({ v: o.value, tag: o.getAttribute('lang'), name: o.textContent.trim() })));
  check('the language menu lists every language once', menu.map(o => o.v).sort().join(' '), [...langs].sort().join(' '));
  check('every menu entry has a name and a language tag', menu.filter(o => !o.name || !o.tag || o.tag === 'undefined').map(o => o.v).join(', '), '');
  for (const l of langs) {
    let r; try { r = await page.evaluate(l => { const t = window.takht; t.applyLang(l); t.press('help');
      const texts = [document.title], skip = new Set(['SCRIPT', 'STYLE']);
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => skip.has(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      while (w.nextNode()) texts.push(w.currentNode.nodeValue);
      document.querySelectorAll('[aria-label], [title], [placeholder]').forEach(e => ['aria-label', 'title', 'placeholder'].forEach(a => { if (e.hasAttribute(a)) texts.push(e.getAttribute(a)); }));
      const hits = texts.filter(s => /\bundefined\b|\bNaN\b|\[object |=>|function\s*\(/.test(s)).map(s => s.trim().slice(0, 60));
      return { tag: document.documentElement.lang, hits: [...new Set(hits)] }; }, l); }
    catch (e) { check(`${l}: switching to it throws no error`, e.message.split('\n')[0].replace(/^page\.evaluate: /, ''), ''); continue; }
    await page.keyboard.press('Escape');
    check(`${l}: the page and its help show no "undefined", "NaN" or code`, r.hits.join(' | '), '');
    check(`${l}: the page's language tag is set`, !!r.tag && r.tag !== 'undefined', true, r.tag);
  }
  await page.evaluate(() => window.takht.applyLang('en'));
  check('no page errors', errs.join(' | '), '');
  summary(); await browser.close();
})();
