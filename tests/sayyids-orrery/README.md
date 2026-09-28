# Sayyid's Orrery tests

Checks for `sayyids-orrery/index.html`: the principles it teaches and the claims it makes, then its walkthrough, every language and phone layouts. It is not a precision test; tolerances are what the page claims (a degree or two, a day or so). Expected values come from Lesson 5 (Figures 27 and 28), from real events (published ephemerides, UT) and from the geometry itself; none is read from the page.

Not run automatically: run it by hand before changing the page. It takes about 15 seconds.

## Running

    NODE_PATH=$(npm root -g) node tests/sayyids-orrery/orrery.test.js                  # the repo's page
    NODE_PATH=$(npm root -g) node tests/sayyids-orrery/orrery.test.js other.html
    VERBOSE=1 node tests/sayyids-orrery/orrery.test.js                                  # every check, not just failures

It needs Node and Playwright with Chromium. Exit status: 0 when every check passed, 1 when any failed or a group threw, 2 when the page or Playwright is missing.

## What it checks

| Group | |
|---|---|
| parameters | Epicycles, eccentricities, rates and apogees as in Figure 27; the deferents' periods as in Figure 28. |
| geometry | The equant on the apsidal line at twice the eccentricity, with K moving evenly as seen from it; the superior planets' epicycle radius always toward the mean Sun; Venus riding with the mean Sun and never more than 44°–48° from it. |
| sun | The equation reaches about 1.9°, is zero at the apogee (early July) and the perigee (early January); the seasons' lengths within 0.1 day; summer longest, winter shortest; equal seasons when the circle is concentric. |
| planets | Mars's stations 2022–2027 within about a day of the real ones (2020's come about 3 days early); Mars at three oppositions within 1°; the 2020 great conjunction within a week and 1°, its mean conjunction in September 2020. |
| moon | Conjunctional and preventional births on either side of the 2024 lunations; the synodic and tropical months; the prevention about 194° past the meeting. |
| stars | The four royal stars; Fomalhaut's longitude in 2000; about 1° of precession in 72 years. |
| walkthrough | Every step, Back, Next and Start over; each step's buttons (the seasons, the stations, the conjunctions, today) and a typed birth date, read from the plate. |
| languages | Every language in the menu has a table and a tag; every English string translated, nothing empty or misspelt; no "undefined", "NaN" or code on any step, the Layers or the Notes. |
| layout | Every step in every language at 320 × 568, 390 × 844 and 1280 × 800: nothing off the side of the page or clipped. |

The page fills anything a language leaves out from English as it loads, so the language check reads the tables from a copy without that line (`FILL` in the suite). If that line changes, the suite says so.
