# Takht tests

Checks for `takht/index.html`. They started as the independent reviewer's suite and are meant to be run on every change. Every expected value comes from the lesson (pp. 6–7, 30–40), exact rationals, an atan2 formula written here, or Dykes' table on p. 34; none is read from the page.

GitHub runs them on every pull request and push that touches `takht/` or `tests/takht/` (the **Takht tests** check).

## Running

    npm install --no-save playwright && npx playwright install chromium   # once, inside tests/takht; or use a global install with NODE_PATH=$(npm root -g)
    tests/takht/run-all.sh                   # every suite; exits non-zero on a failure
    node tests/takht/i18n.js                 # one suite on its own
    TAKHT=/path/to/index.html tests/takht/run-all.sh   # another copy of the page

Each suite's output goes to `out-<suite>.txt` beside it. `FUZZ=40000 node fuzz.js` lengthens the fuzz.

## Adding or changing a translation

A new language needs three things in `takht/index.html`: its table (`I18N.xx`), its name in `LANG_NAMES` and its tag in `LANG_TAGS`. The suites read the list of languages from the page, so a new one is tested with the rest. Start with:

    node tests/takht/i18n.js      # every string translated, nothing empty or misspelt, the menu, no "undefined" on screen
    node tests/takht/layout.js    # every message and the longest values at six phone sizes, in every language
    node tests/takht/width.js     # the value line at narrow widths

Key labels (`keys.*`) may be left out; the English label is then used, as it is for sin, cos and tan in most languages. `persist.js` also holds the page to the 450 KiB size ceiling, which new languages count toward.

## Files

| File | What it holds |
|---|---|
| `h.js` | Harness: opens a page, presses keys, reads the state; `fresh()` pins the state a test assumes (AC, arc, sign off, wrap on); independent formatting and astronomy (`mcSec`, `ascSec` by atan2); `check`/`summary`. |
| `i18n.js` | Every language complete against English (key labels excepted), each entry the same kind, no empty or unknown keys; the language menu; no "undefined", "NaN" or code on the page or in Help in any language; the language tag; the ecliptic longitude in Signed values, apart from the LST recipe's geographic one. |
| `lesson.js` | Lesson rows 8–47, p. 31, §2; the Help recipes exactly as printed; §11.2 signed entry. |
| `astro.js` | MC at 25 RAMCs against atan2; direct ASC at 150 RAMC/latitude pairs below the polar circles; Dykes' table (14 ASCs, 2 MCs); the southern-birth method against a direct calculation; the polar circles and the Help text for them. |
| `recipes.js` | UT across midnight with and without DST; LST east and west past 24 h and below 0; ST ratio on a column and straddling 24:00; planets direct and retrograde across 0° Aries at three ratios, and at a station; the latitude-ratio note for a southern birth; the UT note's DST and the cusp note's polar circles; `accel` edges; computed ratios exact under × and ÷ (half seconds, both signs, a sweep of birth ratios against exact rationals) beside typed controls. |
| `numbers.js` | Exact typed `+ − ×`; `×` and `÷` of exact numbers kept as fractions (values just below a half-second at any size); the one-ulp half rule for binary values (sin 30° at 1″ and at 2000°); display forms (12+ digits, exponents, the cut mark, tiny values), trig ranges, decimal conversion with the 60″ carry, the 10,000,000° limit on every path, overflow. |
| `state.js` | Operator changes, C and AC in each slot, refused `=` keeping the operation, `±` and `dec` at each stage, the unit key and °/h after each operator, recall into the right slot, sign entry, wrap and language mid-entry, keyboard shortcuts. |
| `fuzz.js` | Random presses with language and wrap changes; invariants on display, history, seconds, numbers and sign entry. |
| `persist.js` | Registers, wrap and language across a reload; an exact ratio across a reload; blocked and corrupt storage; stored numbers whose forms disagree, and seconds past the limit, dropped; every kind of register kept; saved languages that are not the page's own (`__proto__`, `toString`); network (the page and its own install files only); the 450 KiB size ceiling. |
| `focus.js` | Help and the phone history sheet: focus in, Tab trapped, Escape and focus return; the sheet across a turn to landscape; Enter/Space on focused keys; the live region, including the field and sign being typed (English and German); hold C and hold a register; 300 history lines at three desktop sizes. |
| `layout.js` | Six phone viewports × every language: the longest value of each form, every message, a long history line, the sheet; the 42 px key floor and the 34 px value floor (documented exceptions: German sign entry at 320–325 px, wrap-off values of 10,000° and more); the tablet and desktop breakpoints. |
| `width.js` | The sign placeholder at 1 px steps 320–360 in German and at key widths in the other languages. |
| `display.js` | Displays that cut digits never show less than the value held; exact typed sums and the decimal view of arc and time. |
| `offline.js` | Served over http, then cut off: the page reopens from its own address and its start_url and still calculates; the manifest and icons load; nothing outside the Takht is requested; the worker clears only older Takht caches, not another page's. |

## Key language

Space-separated tokens: digits and `.` press one key each; `u` the unit key; `+ - * /` `=`; `n` for `±`; `C AC bs dec sign sto x15 d15 p180 accel sin cos tan asin acos atan`; `@LST` recalls a register, `>LST` stores into it (as a hold); `M:arc` / `M:time` the °/h control. Example: `AC M:time 15 u 55 / 24 u =` forms the birth-time ratio.
