#!/bin/sh
# Runs every suite against one build. Usage: tests/takht/run-all.sh   (TAKHT=/path/to/index.html to test another copy)
# Needs: node, playwright with Chromium (NODE_PATH=$(npm root -g) if playwright is global). FUZZ=40000 lengthens the fuzz.
cd "$(dirname "$0")" || exit 2
fail=0
for s in i18n lesson astro recipes numbers sweep state fuzz persist focus layout width display offline; do
  printf '\n===== %s\n' "$s"
  node "$s.js" > "out-$s.txt" 2>&1; rc=$?
  grep -E '^FAIL' -A3 "out-$s.txt"; tail -1 "out-$s.txt"
  [ $rc -ne 0 ] && fail=1
done
printf '\n===== totals\n'; grep -h -E '^[0-9]+ passed' out-*.txt | awk '{p+=$1; f+=$3} END {print p " passed, " f " failed"}'
exit $fail
