#!/bin/sh
# The shipped page is the build its record names, byte for byte: its sha256 against SHA256 beside this file, which
# every shipment rewrites. A page edited in place fails. Usage: tests/jadawil/hash.sh   (JADAWIL=/path/to/index.html)
cd "$(dirname "$0")" || exit 2
page=${JADAWIL:-../../jadawil/index.html}
[ -f "$page" ] || { echo "page not found: $page"; exit 2; }
want=$(cat SHA256); got=$(sha256sum "$page" | cut -d' ' -f1)
if [ "$got" = "$want" ]; then echo "ok   the page's sha256 is the one SHA256 names ($want)"; echo; echo "1 passed, 0 failed"; exit 0; fi
printf 'FAIL the page'"'"'s sha256 is the one SHA256 names\n      got:  %s\n      want: %s\n\n0 passed, 1 failed\n' "$got" "$want"; exit 1
