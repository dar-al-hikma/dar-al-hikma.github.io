# Reckoner tests

The suite for `reckoner/index.html`, from its review rounds: about 200 checks. Expected values come from Lesson 5 (pp. 4–7, 30–33) and exact arithmetic; none is read from the page.

Not run automatically: run it by hand before changing the page. It takes about 20 seconds.

## Running

    NODE_PATH=$(npm root -g) node tests/reckoner/reckoner.test.js                  # the repo's page
    NODE_PATH=$(npm root -g) node tests/reckoner/reckoner.test.js other.html
    VERBOSE=1 node tests/reckoner/reckoner.test.js                                  # every check, not just failures

It needs Node and Playwright with Chromium. Exit status: 0 when every check passed, 1 when any failed, 2 when the page is not found.

The languages are read from the page's own table, so a new language is tested with the rest: the messages added in the review rounds present and not left in English, the walkthrough on the page at phone widths, and the marking of answers. The footer check looks for Figure 3 written as `3, 4`, `3・4` or `图 3`; a language that writes it otherwise needs its form added there.
