# Between the Lines tests

The regression suite for `between-the-lines/index.html`, from its review rounds: about 1,800 checks. Expected values come from the lesson PDF (pp. 30–40; `pdf_p34.json` transcribes the table of houses on p. 34), from exact integer-second arithmetic and from a vector (atan2) calculation written in the suite; none is read from the page.

GitHub runs it on every pull request that touches the page or its tests; run it by hand before changing the page. A full run takes about 40 minutes on four cores.

## Running

    NODE_PATH=$(npm root -g) node tests/between-the-lines/btl.test.js                 # the repo's page
    NODE_PATH=$(npm root -g) node tests/between-the-lines/btl.test.js other.html out.json
    ONLY=r7Review,layout node tests/between-the-lines/btl.test.js                        # some groups only

It needs Node and Playwright with Chromium. Exit status: 0 when every check passed, 1 when a check failed or a group threw, 2 when the suite cannot run (page or a file beside it missing, no browser, `ONLY` naming no group).

The languages are read from the page's own menu, so a new language is tested with the rest. `ref-measure-original.json` holds the diagram's text sizes in the original page, measured once, so that no text is ever smaller than it was; a language the original lacked is held to the size floors only.

The review rounds also compared some layouts with two earlier builds. Those builds are not kept here (the repo publishes every file, and they carry the errors the reviews fixed), so those comparisons are dropped; the checks that the rail keeps one height and that no mode tap moves the tapped button remain.
