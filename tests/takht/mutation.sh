#!/bin/sh
# Does the suite notice when a number rule breaks? Each mutation below changes one line of a copy of the page; the suite
# must fail on every copy. Exits 1 if any mutation survives (the suite stays green with it), 2 if a line is not found.
# Usage: tests/takht/mutation.sh   (NODE_PATH=$(npm root -g) if playwright is global; takes four suite runs)
cd "$(dirname "$0")" || exit 2
unset TAKHT   # each copy of the suite tests the copy of the page beside it
HERE=$(pwd); PAGE=$(cd ../../takht && pwd)/index.html; TMP=$(mktemp -d); survived=0
mutate() {   # name, line as it is in the page, line it becomes
  mkdir -p "$TMP/$1/takht" "$TMP/$1/tests" && cp "$(dirname "$PAGE")"/* "$TMP/$1/takht/" && cp -r "$HERE" "$TMP/$1/tests/takht" && rm -f "$TMP/$1/tests/takht/out-"*.txt
  node -e 'const fs = require("fs"), [p, a, b] = process.argv.slice(1), s = fs.readFileSync(p, "utf8");
    if (s.split(a).length !== 2) { console.error("not found once: " + a); process.exit(2); } fs.writeFileSync(p, s.replace(a, () => b));' "$TMP/$1/takht/index.html" "$2" "$3" || exit 2
  printf '\n===== mutation %s\n' "$1"
  if "$TMP/$1/tests/takht/run-all.sh" > "$TMP/$1.txt" 2>&1; then echo "SURVIVED: the suite stays green"; survived=1
  else grep -h -E '^FAIL' "$TMP/$1/tests/takht/out-"*.txt | head -5; tail -1 "$TMP/$1.txt"; fi
}
mutate no-half-rule \
  "const snapHalf = x => { const a = Math.abs(x), h = Math.floor(a) + 0.5; return (a < h && +truncFixed(a, 2) === h) ? (x < 0 ? -h : h) : x; };" \
  "const snapHalf = x => x;"
mutate no-truncation-guard \
  "const t = Math.trunc(v*f*(1 + 4*Number.EPSILON))/f;" \
  "const t = Math.trunc(v*f)/f;"
mutate no-cut-mark \
  "const cutMark = (shown, x) => Math.abs(+shown - x) > Math.max(Math.abs(x), 1)*1e-12 ? '…' : '';" \
  "const cutMark = (shown, x) => '';"
mutate no-d15-note \
  "    if (v.sec % 15) notes.push(M().rounded(fmtScaledExact(v.sec, dec(15, null, '15'), true, TIME, exact)));   // the exact quotient, not a double's digits" \
  ""
rm -rf "$TMP"
printf '\n===== mutations: %s\n' "$([ $survived = 0 ] && echo 'every one caught' || echo 'one or more survived')"
exit $survived
