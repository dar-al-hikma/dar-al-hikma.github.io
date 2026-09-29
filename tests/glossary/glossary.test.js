// The glossary's forbidden forms: every form set as `code` in a *Not* line of GLOSSARY.md, looked for in
// that language's text on the shelf and in every piece. English glosses and markup are left out of the search.
// Run: node glossary.test.js   (Node only; VERBOSE=1 prints every check)
// Exit status: 0 when nothing forbidden appears, 1 when something does, 2 when a file or table cannot be found.
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const read = f => { const p = path.join(ROOT, f); if (!fs.existsSync(p)) { console.error('not found: ' + p); process.exit(2); } return fs.readFileSync(p, 'utf8'); };

let pass = 0, fail = 0; const failures = [];
function check(name, ok, detail) {
  if (ok) pass++; else { fail++; failures.push(`${name}\n      ${String(detail === undefined ? '' : detail).slice(0, 600)}`); }
  if (process.env.VERBOSE) console.log([ok ? 'ok  ' : 'FAIL', name].join('\t'));
}

// forbidden forms, by language
const NOT = {};
for (const line of read('GLOSSARY.md').split('\n')) {
  const m = line.match(/^\s+\*Not:\*\s*(.*)$/); if (!m) continue;
  for (const part of m[1].split(/;\s*/)) { const p = part.match(/^([a-z]{2}):\s*(.*)$/); if (!p) continue;
    for (const f of p[2].matchAll(/`([^`]+)`/g)) (NOT[p[1]] ||= []).push(f[1]); }
}
const LANGS = ['nb', 'es', 'fr', 'de', 'zh', 'ja'];

// the end of the bracketed block that opens at s[i], skipping strings, template literals and comments
function blockEnd(s, i) {
  const st = []; let j = i;
  while (j < s.length) { const c = s[j], t = st[st.length - 1];
    if (t === '`') { if (c === '\\') { j += 2; continue; } if (c === '`') { st.pop(); j++; continue; } if (c === '$' && s[j + 1] === '{') { st.push('${'); j += 2; continue; } j++; continue; }
    if (c === '"' || c === "'") { j++; while (s[j] !== c) { if (s[j] === '\\') j++; j++; } j++; continue; }
    if (c === '`') { st.push('`'); j++; continue; }
    if (c === '/' && s[j + 1] === '/') { while (s[j] !== '\n') j++; continue; }
    if (c === '/' && s[j + 1] === '*') { j = s.indexOf('*/', j) + 2; continue; }
    if (c === '{' || c === '[') { st.push(c); j++; continue; }
    if (c === '}' || c === ']') { st.pop(); j++; if (!st.length) return j; continue; }
    j++; }
  return -1;
}
function block(src, re) { const m = re.exec(src); if (!m) return null; const i = m.index + m[0].length - 1, e = blockEnd(src, i); return e < 0 ? null : src.slice(i, e); }

// each page's text in each language
const PAGES = {
  'shelf': ['index.html', l => [new RegExp(`\\n\\s+${l}: \\{`)]],
  'between-the-lines': ['between-the-lines/index.html', l => [new RegExp(`I18N\\.${l}\\s*=\\s*\\{`)]],
  'reckoner': ['reckoner/index.html', l => [new RegExp(`I18N\\.${l}\\s*=\\s*\\{`)]],
  'sayyids-orrery': ['sayyids-orrery/index.html', l => [new RegExp(`I18N\\.${l}\\s*=\\s*\\{`)]],
  'takht': ['takht/index.html', l => [new RegExp(`I18N\\.${l}\\s*=\\s*\\{`)]],
  'sayyids-sphere': ['sayyids-sphere/index.html', l => [new RegExp(`TX\\.${l}\\s*=\\s*\\{`), l === 'nb' ? /var STEP_NB\s*=\s*\[/ : new RegExp(`STEP_TX\\.${l}\\s*=\\s*\\[`)]],
};
const clean = s => s.replace(/<span class=\\?["']gloss\\?["'][^>]*>[\s\S]*?<\/span>/g, ' ').replace(/<[^>]+>/g, ' ');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cjk = s => /[　-鿿＀-￯]/.test(s);

check('GLOSSARY.md lists forbidden forms for every language', LANGS.every(l => (NOT[l] || []).length), LANGS.filter(l => !(NOT[l] || []).length).join(' '));
for (const [name, [file, res]] of Object.entries(PAGES)) {
  const src = read(file);
  for (const l of LANGS) {
    const blocks = res(l).map(re => block(src, re));
    if (blocks.some(b => b === null)) { check(`${name} ${l}: its language table is found`, false, 'table not found'); continue; }
    const text = clean(blocks.join('\n')), hits = [];
    for (const f of NOT[l] || []) {
      const re = cjk(f) ? new RegExp(esc(f), 'g') : new RegExp(`(?<![\\p{L}\\p{N}])${esc(f)}(?![\\p{L}\\p{N}])`, 'gu');
      for (const m of text.matchAll(re)) hits.push(`\`${f}\` in “…${text.slice(Math.max(0, m.index - 30), m.index + f.length + 30).replace(/\s+/g, ' ')}…”`);
    }
    check(`${name} ${l}: none of the glossary's forbidden forms`, !hits.length, hits.slice(0, 6).join('; ') + (hits.length > 6 ? ` … ${hits.length}` : ''));
  }
}
console.log(`${pass} passed, ${fail} failed`); failures.forEach(f => console.log('  ✗ ' + f));
process.exit(fail ? 1 : 0);
