# Jadāwil tests

Checks for `jadawil/`. The Jadāwil is built in its own repository (`dar-al-hikma/dar-al-hikma-pages-dev`, `jadawil/`) and
arrives here as the build gives it, so these suites do not rebuild it: they hold the shipped file to its hash and walk
it in a browser, served over http at `/jadawil/` as the site serves it. Every expected value in `lesson.js` comes from
the lesson (`lesson-values.json`, transcribed from Lesson 5) or an atan2 written in `h.js`; none is read from the page.

GitHub runs them on every pull request and push that touches `jadawil/` or `tests/jadawil/` (the **Jadāwil tests** check).

## Running

    npm install --no-save playwright@1.56.1 pdf-lib@1.17.1 && npx playwright install chromium   # once, inside tests/jadawil; or global installs with NODE_PATH=$(npm root -g)
    tests/jadawil/run-all.sh                   # every suite; exits non-zero on a failure
    node tests/jadawil/lesson.js               # one suite on its own
    JADAWIL=/path/to/index.html tests/jadawil/run-all.sh   # another copy of the page, its six install files beside it

Each suite's output goes to `out-<suite>.txt` beside it.

## Shipping a new build

Copy the build's seven files over `jadawil/` (nothing else goes in the folder), write the new page's sha256 into
`SHA256` (`sha256sum jadawil/index.html | cut -d' ' -f1 > tests/jadawil/SHA256`), and check that it is the sha256 the
build's record names. Then run `run-all.sh`.

## Files

| File | What it holds |
|---|---|
| `SHA256` | The shipped page's sha256, one line; rewritten by every shipment. |
| `hash.sh` | The page's sha256 against `SHA256`: a page edited in place fails. |
| `h.js` | Harness: the page under test, a server for its folder at `/jadawil/` that logs every request and can switch to another folder (a next build), `check`/`summary`, angles in seconds, and MC and ASC by atan2. |
| `ui.js` | The walker from the Jadāwil's review harness, trimmed: touchscreen taps on a phone, mouse clicks on a desktop, keys typed one at a time. |
| `lesson-values.json` | Lesson 5's native (p. 30) and its rows, and the lesson's own table of houses (p. 34), trimmed from the review's copy. |
| `files.js` | Exactly the seven files; the manifest's `id` `/jadawil/`, `start_url` and `scope` `./`, its icons present at the sizes it names; the home-screen icon at 180×180; the worker's list all present; the worker installing; nothing requested from outside `/jadawil/` while the page loads. |
| `i18n.js` | The seven tables in the page; the menu, English first; choosing a language writes `dah.lang` (for the shelf and the other pieces) and holds across a reload; with `dah.lang` preset to each language, whatever the browser's, the page and `<html lang>` follow, and the first screen of each of the four books shows no `undefined`, `NaN` or `${`, on a phone and on a desktop. |
| `lesson.js` | The lesson's chart by real input on a phone: Minneapolis found, its latitude and row 12; the offset suggested as `−06:00`; the sheet at row 8's UT; the pocket table from the worksheet's link at row 13's LST, bracketing 44° and 45° N, its MC and ASC to atan2 at row 15's obliquity within 1″ and to the lesson's printed table within 5″ and 30″ (the table is at 23°26′, the page at the birth's true obliquity); rows 17, 20, 21 and 25–27 filled from it; the print button, and the sheet on Letter and A4. In English, and in German with `dah.lang` preset, whose numbers must be the English ones. |
| `round2.js` | What the round-2 survey found a student would meet, walked again by real input on a phone (the development repo's `jadawil-round2/` and its fixes-3 record): the UTC offset before standard time, Monrovia 1971 the zone's −00:44:30, Poznań 1800 its own longitude in time from the longitude the atlas prints, Lyon 1900 nothing filled and both its own offset and Paris Mean Time named, Gather asking for the offset (J2-1); the same place chosen twice leaving a typed offset and the sheet (J2-3); a refused pocket table leaving the next day's rows blank, in German too (J2-4); a pocket table at 44.98° and obliquity 24 coming back after a reload with its direct ASC at atan2's, its rows blank for Baghdad (J2-8, J2-9). |
| `offline.js` | Served over http, then cut off: the page reopens from its own address, from `index.html` and from its `start_url`, and still searches the atlas and gathers the lesson's sheet; the manifest and icons load; its worker keeps seven files under one `jadawil-` cache and clears only older `jadawil-` caches, not another page's or the Takht's; a next build served on the same address replaces the older copy; nothing outside the Jadāwil is requested. |
