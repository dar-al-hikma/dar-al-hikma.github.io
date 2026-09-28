# Shelf tests

Checks for the shelf, `index.html`: its languages, how it picks one, and its layout. About 80 checks; about a minute.

## Running

    NODE_PATH=$(npm root -g) node tests/shelf/shelf.test.js              # the repo's page
    NODE_PATH=$(npm root -g) node tests/shelf/shelf.test.js other.html
    VERBOSE=1 node tests/shelf/shelf.test.js                             # every check, not just failures

It needs Node and Playwright with Chromium. Exit status: 0 when every check passed, 1 when any failed or a group threw, 2 when the page or Playwright is missing.

## What it checks

| Group | |
|---|---|
| table | Every language in the menu translates every string, none empty or left in English, with the English markup and no code. |
| choosing | A language chosen in any piece (`dah.lang`, or the older `sayyid.lang`) first, then the browser's languages in order, then English; `no` and `nn` read as Norwegian; nothing saved until the reader chooses; blocked storage. |
| menu | Each language shows, sets `<html lang>` and is saved for every piece; the choice survives a reload; English restores the page exactly; no errors, no requests beyond the page. |
| pieces | Each piece is named as its own page names itself, in every language. |
| no script | Without scripts the page is whole, in English. |
| layout | Every language at 320 × 568, 390 × 844 and 1280 × 800: nothing off the side or past its card. |

The English is the page itself; the other languages are the `I18N` table at the foot of the page. A new language needs its table, an `<option>` in the menu and its tag in `TAGS`.
