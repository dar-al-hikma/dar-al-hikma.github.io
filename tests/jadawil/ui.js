// The walker from the Jadāwil's review harness (its ui.js), trimmed to what lesson.js needs: real input only, touchscreen
// taps on a phone and mouse clicks on a desktop, keys typed one at a time. open() takes the page's address from the
// caller's server instead of a fixed port.
const { chromium, ready } = require('./h');
const VIEWPORTS = {
  p390: { width: 390, height: 844, mobile: true },
  tab: { width: 1024, height: 768, mobile: false },
};
async function open(url, opts = {}) {
  const vp = VIEWPORTS[opts.vp || 'p390'];
  const browser = opts.browser || await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile,
    deviceScaleFactor: vp.mobile ? 3 : 2, locale: opts.locale || 'en-US', colorScheme: 'dark', serviceWorkers: 'block',
  });
  if (opts.lang) await ctx.addInitScript(l => { try { localStorage.setItem('dah.lang', l); } catch (e) {} }, opts.lang);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await ready(page);
  return { browser, ctx, page, errs, vp, W: walker(page, vp) };
}
function walker(page, vp) {
  const W = { taps: 0 };
  W.pause = ms => page.waitForTimeout(ms);
  W.tap = async (sel, o = {}) => {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded().catch(() => {});
    const box = await el.boundingBox();
    if (!box) throw new Error('no box for ' + sel);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    W.taps++;
    if (vp.mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await page.waitForTimeout(o.wait == null ? 120 : o.wait);
  };
  // type into a field by real keys: one tap to focus, select-all, then the keys
  W.type = async (sel, text) => {
    await W.tap(sel);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
    await page.keyboard.type(text, { delay: 20 });
    await page.waitForTimeout(100);
  };
  // the native date and time controls are filled, as a phone's wheel would set them, and told they changed
  W.fill = async (sel, value) => { await page.locator(sel).first().fill(value); await page.dispatchEvent(sel, 'change'); W.taps++; await page.waitForTimeout(100); };
  // an element's text as written, its parts joined by a space (innerText would carry the CSS's capitals)
  W.text = sel => page.evaluate(s => { const e = document.querySelector(s); return e ? [...e.childNodes].map(n => n.textContent.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ') : null; }, sel);
  W.view = () => page.evaluate(() => [...document.querySelectorAll('.book-view')].find(v => !v.hidden)?.id);
  return W;
}
module.exports = { open, VIEWPORTS };
