// Test harness for Sayyid's Sphere. Based on the internal review's harness (sphere-review/harness.js),
// with test-side instrumentation: it wraps THREE (as the page's own bundle defines it) to see the
// scene, the camera and how often the page renders. Nothing here changes what the page does.
const { chromium } = require('playwright');
if (!process.env.SPHERE) process.env.SPHERE = require('path').join(__dirname, '..', '..', 'sayyids-sphere', 'index.html');   // default: the repo's page
if (!require('fs').existsSync(process.env.SPHERE)) { console.error('page not found: ' + process.env.SPHERE + ' (set SPHERE=/path/to/index.html)'); process.exit(2); }
const PAGE = 'file://' + require('path').resolve(process.env.SPHERE);
const GL = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const GLARGS = ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'];
async function launch(opts={}) { return chromium.launch({ args: GLARGS, ...opts }); }

function instrument() {
  window.__renders = 0; window.__raf = 0; window.__lineMats = 0;
  // every piece of text drawn on a canvas: which canvas, the font, the colour
  window.__ft = [];
  const ft = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, x, y, mw) {
    if (window.__ft.length < 20000) window.__ft.push({ id: this.canvas.id || '', text: String(t), font: this.font, fill: String(this.fillStyle), cw: this.canvas.width });
    return ft.call(this, t, x, y, mw);
  };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) { window.__raf++; return raf(cb); };
  let T;
  function patch(T) {
    if (!T || !T.WebGLRenderer || T.__patched) return; T.__patched = true;
    const R = T.WebGLRenderer;
    T.WebGLRenderer = function (p) {
      const r = new R(p); const orig = r.render;
      r.render = function (s, c) { window.__scene = s; window.__camera = c; window.__renders++; return orig.call(this, s, c); };
      window.__renderer = r; return r;
    };
    const LBM = T.LineBasicMaterial;
    T.LineBasicMaterial = function (p) { window.__lineMats++; return new LBM(p); };
    T.LineBasicMaterial.prototype = LBM.prototype;
  }
  Object.defineProperty(window, 'THREE', { configurable: true, get() { return T; }, set(v) { T = v; queueMicrotask(() => patch(v)); } });
}

async function open(browser, { width=1440, height=900, lang=null, reducedMotion=null, locale=null, hasTouch=false, isMobile=false, wait=true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reducedMotion || 'no-preference', locale: locale || 'en-US', hasTouch, isMobile });
  const page = await ctx.newPage();
  page._logs = []; page._reqs = [];
  page.on('console', m => page._logs.push(m.type()+': '+m.text()));
  page.on('pageerror', e => page._logs.push('pageerror: '+e.message));
  page.on('request', r => page._reqs.push(r.url()));
  await page.addInitScript(instrument);
  if (lang) await page.addInitScript(l => { try { localStorage.setItem('dah.lang', l); } catch(e){} }, lang);
  // generous timeouts: several SwiftShader browsers may share the machine
  try { await page.goto(PAGE, { timeout: 90000 }); } catch (e) { await page.goto(PAGE, { timeout: 90000 }); }
  if (wait) {
    await page.waitForFunction(() => document.getElementById('boot').hidden, null, { timeout: 90000 });
    await page.waitForTimeout(300);
  }
  return page;
}
async function setRange(page, id, v) {
  await page.evaluate(([id, v]) => { const r = document.getElementById(id); r.value = String(v); r.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]);
}
async function frames(page, n=3) { await page.evaluate(n => new Promise(res => { let k=0; function f(){ if(++k>=n) res(); else requestAnimationFrame(f);} requestAnimationFrame(f); }), n); }
async function setState(page, { lat, lst, obl, probe, sun }) {
  if (obl != null) await setRange(page, 'oblRange', obl);
  if (lat != null) await setRange(page, 'latRange', lat);
  if (lst != null) await setRange(page, 'lstRange', lst);
  if (sun != null) await setRange(page, 'sunRange', sun);
  if (probe != null) await page.evaluate(p => { const s = document.getElementById('probeSel'); s.value = p; s.dispatchEvent(new Event('change', { bubbles: true })); }, probe);
  await frames(page, 3);
}
// "12° ♉︎ 34′" -> absolute longitude in degrees (null for "—")
function parseZod(s) {
  const m = String(s).match(/(\d+)°\s*(\S+)\s*(\d+)′/);
  if (!m) return null;
  const g = m[2].replace('︎','');
  const i = GL.indexOf(g);
  if (i < 0) return null;
  return i*30 + (+m[1]) + (+m[3])/60;
}
async function read(page) {
  return page.evaluate(() => {
    const t = id => { const e = document.getElementById(id); return e ? e.textContent : null; };
    return { hor: t('rdHor'), equ: t('rdEqu'), ecl: t('rdEcl'), note: t('plateNote'), probe: t('probeName'),
      asc: t('axAsc'), desc: t('axDesc'), mc: t('axMc'), ic: t('axIc'), pole: t('axPole'), eq: t('axEq'), ramc: t('axRamc'), oaod: t('axOaod'),
      qAscMc: t('qAscMc'), qAscIc: t('qAscIc'), lstOut: t('lstOut'), latOut: t('latOut'), oblOut: t('oblOut'), sunOut: t('sunOut'),
      axNote: (() => { const e = document.getElementById('axNote'); return e && !e.hidden ? e.textContent : ''; })() };
  });
}
// screen boxes of the visible text labels in the 3D scene, from the captured scene and camera;
// each box is the inked part of the label's own texture, projected as three.js draws sprites
async function labelBoxes(page) {
  return page.evaluate(() => {
    const s = window.__scene, cam = window.__camera, r = window.__renderer; if (!s || !cam || !r) return null;
    const T = window.THREE; s.updateMatrixWorld(true); cam.updateMatrixWorld(true);
    const rect = r.domElement.getBoundingClientRect();
    const out = []; const v = new T.Vector3(), vc = new T.Vector3();
    const tanH = Math.tan(cam.fov * Math.PI / 360);
    s.traverseVisible(o => {
      if (!o.isSprite || !o.material.map || !o.material.map.image || !o.material.map.image.getContext) return;
      const cv = o.material.map.image; if (cv.width === 96 && cv.height === 96) return;   // glow discs, not text
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const i = (y*cv.width + x)*4; if (d[i+3] > 120 && d[i]+d[i+1]+d[i+2] > 120) { if (x<x0) x0=x; if (x>x1) x1=x; if (y<y0) y0=y; if (y>y1) y1=y; }
      }
      if (x1 < 0) return;
      o.getWorldPosition(v);
      vc.copy(v).applyMatrix4(cam.matrixWorldInverse); const depth = -vc.z; if (depth <= 0) return;
      const pxPerWorld = rect.height / (2 * depth * tanH);
      v.project(cam);
      const W = o.scale.x * pxPerWorld, H = o.scale.y * pxPerWorld;
      // a sprite's anchor (center) shifts it: three.js draws (vertex − (center − 0.5)) × scale
      const cx = rect.left + (v.x + 1) / 2 * rect.width + (0.5 - o.center.x) * W, cy = rect.top + (1 - v.y) / 2 * rect.height + (o.center.y - 0.5) * H;
      const L = cx - W/2 + x0/cv.width*W, R = cx - W/2 + (x1+1)/cv.width*W, Tp = cy - H/2 + y0/cv.height*H, B = cy - H/2 + (y1+1)/cv.height*H;
      const key = o.userData.i18n ? o.userData.i18n.key : (cv.height === 42 ? 'ra' : (cv.height === 87 ? 'glyph' : 'other'));
      out.push({ key, left: L, right: R, top: Tp, bottom: B, ndcz: v.z });
    });
    return out;
  });
}
module.exports = { launch, open, setRange, setState, frames, read, parseZod, labelBoxes, PAGE, GL };
