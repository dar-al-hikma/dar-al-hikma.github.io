#!/bin/sh
# Runs every suite against the shipped page. Usage: tests/jadawil/run-all.sh   (JADAWIL=/path/to/index.html to test another copy)
# Needs: node, playwright with Chromium and pdf-lib (NODE_PATH=$(npm root -g) if they are global), sha256sum.
cd "$(dirname "$0")" || exit 2
fail=0
for s in hash files i18n lesson offline; do
  printf '\n===== %s\n' "$s"
  if [ "$s" = hash ]; then ./hash.sh > "out-$s.txt" 2>&1; else node "$s.js" > "out-$s.txt" 2>&1; fi; rc=$?
  grep -E '^FAIL' -A3 "out-$s.txt"; tail -1 "out-$s.txt"
  [ $rc -ne 0 ] && fail=1
done
printf '\n===== totals\n'; grep -h -E '^[0-9]+ passed' out-*.txt | awk '{p+=$1; f+=$3} END {print p " passed, " f " failed"}'
exit $fail
