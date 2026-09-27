#!/usr/bin/env node
// Second-opinion translations from DeepL, set beside the shelf's own.
//
//   node tools/deepl-compare/deepl-compare.js --dry-run          count only, no key needed
//   node tools/deepl-compare/deepl-compare.js --langs=ja --limit=10   small paid test
//   node tools/deepl-compare/deepl-compare.js                    all six languages
//
// Reads every piece's language table, sends each unique English string to DeepL once per
// language (the key comes from DEEPL_API_KEY, or from a cloud environment's API credential),
// and writes out/compare.<lang>.{json,txt}:
// English | the piece's own translation | DeepL. Results are cached in out/deepl.<lang>.json,
// so a rerun only pays for strings not yet translated. Nothing here touches the pieces.

'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Node's fetch ignores HTTPS_PROXY unless told otherwise; rerun with it on when a proxy is set.
if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
  const r = require('child_process').spawnSync(process.execPath, process.argv.slice(1),
    { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } });
  process.exit(r.status == null ? 1 : r.status);
}

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');
const LANGS = { nb: 'NB', es: 'ES', fr: 'FR', de: 'DE', zh: 'ZH-HANS', ja: 'JA' };
const PIECES = {
  'sayyids-sphere': "Sayyid's Sphere: an interactive celestial sphere showing three reference frames (horizon, equator, ecliptic)",
  'sayyids-orrery': "Sayyid's Orrery: Ptolemy's planetary models (deferent, epicycle, equant) seen from the pole of the ecliptic",
  'reckoner': 'The Reckoner: a tutor for sexagesimal arithmetic (degrees, minutes, seconds; carrying and borrowing in sixties)',
  'takht': 'The Takht: a calculator for casting a horoscope chart by hand (sidereal time, RAMC, table of houses)',
  'between-the-lines': 'Between the Lines: a lesson on interpolating a table of houses and an ephemeris',
};
const CONTEXT = 'User-interface and lesson text from an interactive web page teaching traditional (Hellenistic/medieval) astrology and naked-eye astronomy. ';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const DRY = !!args['dry-run'];
const LIMIT = args.limit ? +args.limit : Infinity;
const langs = args.langs ? String(args.langs).split(',') : Object.keys(LANGS);
for (const l of langs) if (!LANGS[l]) die(`Unknown language "${l}". Use: ${Object.keys(LANGS).join(', ')}`);

function die(msg) { console.error(msg); process.exit(1); }

// ---------- extraction ----------
// End of the balanced {...} or [...] that opens at s[i], skipping strings, template literals and comments.
function matchEnd(s, i) {
  const stack = []; let j = i;
  while (j < s.length) {
    const c = s[j], top = stack[stack.length - 1];
    if (top === '`') {
      if (c === '\\') { j += 2; continue; }
      if (c === '`') { stack.pop(); j++; continue; }
      if (c === '$' && s[j + 1] === '{') { stack.push('${'); j += 2; continue; }
      j++; continue;
    }
    if (c === '"' || c === "'") { j++; while (s[j] !== c) { if (s[j] === '\\') j++; j++; } j++; continue; }
    if (c === '`') { stack.push('`'); j++; continue; }
    if (c === '/' && s[j + 1] === '/') { while (s[j] !== '\n') j++; continue; }
    if (c === '/' && s[j + 1] === '*') { j = s.indexOf('*/', j) + 2; continue; }
    if (c === '{' || c === '[') { stack.push(c); j++; continue; }
    if (c === '}' || c === ']') { stack.pop(); j++; if (!stack.length) return j; continue; }
    j++;
  }
  throw new Error('unbalanced bracket');
}
function grab(src, re) {
  const m = re.exec(src); if (!m) return null;
  const i = m.index + m[0].length - 1;
  return src.slice(i, matchEnd(src, i));
}
// Globals the tables refer to.
globalThis.DAH = '<a class="dah">Dār al-Ḥikma</a>';
globalThis.ALL_ON = [];
const evalObj = t => (0, eval)('(' + t + ')');

function tables() {
  const T = {};
  for (const p of ['between-the-lines', 'reckoner', 'sayyids-orrery', 'takht']) {
    const src = fs.readFileSync(path.join(ROOT, p, 'index.html'), 'utf8');
    T[p] = {};
    for (const l of ['en', ...Object.keys(LANGS)]) T[p][l] = evalObj(grab(src, new RegExp(`I18N\\.${l}\\s*=\\s*\\{`)));
  }
  const src = fs.readFileSync(path.join(ROOT, 'sayyids-sphere', 'index.html'), 'utf8');
  const sph = { en: evalObj(grab(src, /var TX\s*=\s*\{\s*en:\s*\{/)) };
  for (const l of Object.keys(LANGS)) sph[l] = evalObj(grab(src, new RegExp(`TX\\.${l}\\s*=\\s*\\{`)));
  // The guided steps live apart: STEPS (English) and STEP_TX / STEP_NB. Only their text fields matter.
  const steps = { en: evalObj(grab(src, /var STEPS\s*=\s*\[/)), nb: evalObj(grab(src, /var STEP_NB\s*=\s*\[/)) };
  for (const l of ['es', 'fr', 'de', 'zh', 'ja']) steps[l] = evalObj(grab(src, new RegExp(`STEP_TX\\.${l}\\s*=\\s*\\[`)));
  // (c is the step's frame colour, not text.)
  for (const l in steps) sph[l].steps = steps[l].map(s => { const o = {}; for (const k in s) if (typeof s[k] === 'string' && k !== 'c') o[k] = s[k]; return o; });
  T['sayyids-sphere'] = sph;
  return T;
}

// A stand-in argument for template functions: any property of it is another stand-in, and
// each prints as its own name, so `${c.EL}` becomes «c.EL» rather than "undefined".
function stand(name) {
  const fn = function () { return stand(name + '()'); };
  return new Proxy(fn, {
    get(_, k) {
      if (k === Symbol.toPrimitive) return () => `«${name}»`;
      if (k === 'toString' || k === 'valueOf') return () => `«${name}»`;
      if (typeof k === 'symbol') return undefined;
      return stand(`${name}.${k}`);
    },
    apply() { return stand(name + '()'); },
  });
}
function render(v) {
  if (typeof v === 'string') return { text: v, template: false };
  if (typeof v !== 'function') return null;
  const src = v.toString(); const m = src.match(/^\s*(?:function\s*\w*)?\s*\(?([^)=]*)\)?\s*=?>?/);
  const names = (m ? m[1] : '').split(',').map(s => s.trim()).filter(Boolean);
  const argv = (names.length ? names : Array.from({ length: v.length }, (_, i) => 'arg' + i)).map(n => stand(n.replace(/=.*/, '')));
  try { const r = v(...argv); return typeof r === 'string' ? { text: r, template: true } : null; } catch (e) { return null; }
}
function flat(o, pre, acc) {
  acc = acc || {};
  if (Array.isArray(o)) o.forEach((v, i) => flat(v, `${pre}[${i}]`, acc));
  else if (o && typeof o === 'object') for (const k in o) flat(o[k], pre ? `${pre}.${k}` : k, acc);
  else acc[pre] = o;
  return acc;
}

function units() {
  const T = tables(); const list = [];
  for (const p in T) {
    const F = {}; for (const l in T[p]) F[l] = flat(T[p][l], '');
    for (const key in F.en) {
      const en = render(F.en[key]); if (!en || !/[A-Za-z]{2}/.test(en.text)) continue;
      const u = { piece: p, key, en: en.text, template: en.template, current: {} };
      for (const l in LANGS) { const c = key in F[l] ? render(F[l][key]) : null; u.current[l] = c ? c.text : null; }
      list.push(u);
    }
  }
  return list;
}

// ---------- placeholders ----------
// «…» stand-ins and %1-style slots become empty tagged elements, which DeepL keeps and does not bill.
function protect(text) {
  const ph = [];
  const out = text.replace(/«[^»]+»|%\d/g, m => { ph.push(m); return `<span data-ph="${ph.length - 1}"></span>`; });
  return { out, ph };
}
function restore(text, ph) {
  const seen = new Set();
  const out = text.replace(/<span data-ph="(\d+)"\s*>\s*<\/span>/g, (_, i) => { seen.add(+i); return ph[+i]; });
  return { out, lost: ph.filter((_, i) => !seen.has(i)) };
}
const billable = t => t.replace(/<[^>]+>/g, '').length;

// ---------- DeepL ----------
const KEY = process.env.DEEPL_API_KEY;
// Free and Developer keys end in :fx and use api-free; paid keys use api. With no key here, a
// cloud environment's API credential supplies it on the way out, so assume a :fx key.
// DEEPL_API_URL overrides the host.
const API = process.env.DEEPL_API_URL || (!KEY || /:fx$/.test(KEY) ? 'https://api-free.deepl.com' : 'https://api.deepl.com');
async function deepl(pathname, body) {
  const res = await fetch(API + pathname, {
    method: body ? 'POST' : 'GET',
    headers: { ...(KEY ? { Authorization: `DeepL-Auth-Key ${KEY}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`DeepL ${pathname} → HTTP ${res.status}: ${txt.slice(0, 300)}`);
  return JSON.parse(txt);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function withRetry(f) {
  for (let i = 0; ; i++) {
    try { return await f(); } catch (e) {
      if (i >= 4 || !/HTTP (429|5\d\d)|fetch failed|ECONNRESET/.test(e.message)) throw e;
      await sleep(2000 * 2 ** i);
    }
  }
}
const hash = t => crypto.createHash('sha1').update(t).digest('hex').slice(0, 16);

async function main() {
  const all = units();
  // One DeepL request per unique English text; the first piece it appears in supplies the context.
  const uniq = new Map();
  for (const u of all) if (!uniq.has(u.en)) uniq.set(u.en, u.piece);
  let texts = [...uniq.keys()].slice(0, LIMIT);
  const perLang = texts.reduce((n, t) => n + billable(protect(t).out), 0);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'source.en.json'), JSON.stringify(all, null, 1));

  console.log(`${all.length} strings, ${uniq.size} unique; sending ${texts.length}.`);
  console.log(`About ${perLang.toLocaleString('en')} billable characters per language, ` +
    `${(perLang * langs.length).toLocaleString('en')} for ${langs.join(', ')} (before the cache).`);
  if (DRY) { console.log('Dry run: nothing sent.'); return; }

  const caches = {}; let need = 0;
  for (const l of langs) {
    const f = path.join(OUT, `deepl.${l}.json`);
    caches[l] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    need += texts.filter(t => !caches[l][hash(t)]).reduce((n, t) => n + billable(protect(t).out), 0);
  }
  let usage;
  try { usage = await withRetry(() => deepl('/v2/usage')); } catch (e) {
    die(`${e.message}\nNo working key: set DEEPL_API_KEY, or add the key as an API credential for ${new URL(API).host}.`);
  }
  const left = usage.character_limit - usage.character_count;
  console.log(`Account: ${usage.character_count.toLocaleString('en')} of ${usage.character_limit.toLocaleString('en')} used; ` +
    `this run needs about ${need.toLocaleString('en')}.`);
  if (need > left * 0.95 && !args.force) die('Not enough characters left for this run (add --force to try anyway).');

  for (const l of langs) {
    const cache = caches[l]; const todo = texts.filter(t => !cache[hash(t)]);
    const byPiece = {}; for (const t of todo) (byPiece[uniq.get(t)] ||= []).push(t);
    let done = 0;
    for (const p in byPiece) {
      const list = byPiece[p];
      for (let i = 0; i < list.length;) {
        // Up to 50 texts and ~60 KB per request.
        const batch = []; let size = 0;
        while (i < list.length && batch.length < 50 && size < 60000) { size += list[i].length; batch.push(list[i++]); }
        const prot = batch.map(protect);
        const r = await withRetry(() => deepl('/v2/translate', {
          text: prot.map(x => x.out), source_lang: 'EN', target_lang: LANGS[l],
          tag_handling: 'html', formality: 'prefer_more', model_type: 'prefer_quality_optimized',
          context: CONTEXT + PIECES[p],
        }));
        r.translations.forEach((tr, k) => {
          const back = restore(tr.text, prot[k].ph);
          cache[hash(batch[k])] = { text: back.out, lost: back.lost };
        });
        done += batch.length;
        fs.writeFileSync(path.join(OUT, `deepl.${l}.json`), JSON.stringify(cache, null, 1));
        process.stdout.write(`\r${l}: ${done}/${todo.length}`);
      }
    }
    console.log(`\r${l}: ${todo.length} translated, ${texts.length - todo.length} from cache.`);
  }

  for (const l of langs) {
    const cache = caches[l]; let txt = ''; const rows = []; let lost = 0;
    for (const u of all) {
      const d = cache[hash(u.en)]; if (!d) continue;
      if (d.lost.length) lost++;
      rows.push({ piece: u.piece, key: u.key, template: u.template, en: u.en, current: u.current[l], deepl: d.text, lostPlaceholders: d.lost });
      txt += `[${u.piece} :: ${u.key}]${u.template ? ' (template)' : ''}\n  EN:      ${u.en}\n  CURRENT: ${u.current[l] ?? '(missing: falls back to English)'}\n  DEEPL:   ${d.text}\n` +
        (d.lost.length ? `  !! DeepL dropped ${d.lost.join(' ')}\n` : '');
    }
    fs.writeFileSync(path.join(OUT, `compare.${l}.json`), JSON.stringify(rows, null, 1));
    fs.writeFileSync(path.join(OUT, `compare.${l}.txt`), txt);
    console.log(`out/compare.${l}.txt: ${rows.length} rows${lost ? `, ${lost} with dropped placeholders` : ''}.`);
  }
  const after = await withRetry(() => deepl('/v2/usage'));
  console.log(`Account now: ${after.character_count.toLocaleString('en')} of ${after.character_limit.toLocaleString('en')} used.`);
}
main().catch(e => die(e.stack || e.message));
