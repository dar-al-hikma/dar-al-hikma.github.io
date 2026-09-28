// The 34 px floor across widths: the sign placeholder at 1 px steps in German (320–360) and at key widths in every other language the page carries.
const H = require('./h'); const { press, check, summary } = H;
(async () => {
  const browser = await H.chromium.launch(); const out = [];
  const widths = { de: Array.from({ length: 41 }, (_, i) => 320 + i), en: [320,325,326,340,350,359,360,375,390,420], es: [320,325,326,340,350,359,360,420], fr: [320,326,340,350,359,360,420], nb: [320,326,340,350,359,360,420], ja: [320,326,340,350,359,360,420], zh: [320,326,340,359,360,420] };
  for (const l of await H.languages(browser)) if (!widths[l]) widths[l] = [320, 326, 340, 350, 359, 360, 420]; // a new language: the key widths
  for (const [lang, ws] of Object.entries(widths)) for (const w of ws) { const ctx = await browser.newContext({ viewport: { width: w, height: 568 } }); const page = await ctx.newPage(); await page.goto(H.URL); await page.waitForFunction(() => window.takht); await page.evaluate(l => window.takht.applyLang(l), lang);
    await press(page, 'AC M:arc sign 25 u 21 u 41'); const b = await page.evaluate(() => { const e = document.querySelector('#val'); return { fs: parseFloat(getComputedStyle(e).fontSize), over: e.scrollWidth - e.clientWidth }; });
    const exempt = lang === 'de' && w <= 325; if ((b.fs < 34 && !exempt) || b.over > 1) out.push(`${lang} ${w}px: ${b.fs}px${b.over > 1 ? ' clipped' : ''}`); await ctx.close(); }
  check('sign placeholder holds 34 px and is never clipped (German 320–325 px exempt)', out.join('; '), '');
  summary(); await browser.close();
})();
