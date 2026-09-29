# Sayyid's Sphere tests

The suite for `sayyids-sphere/index.html`, from its review rounds: finding checks, each targeting one fix, and guards for what must not change. Expected values come from Lessons 4 and 5, from a J2000 star catalogue written in the suite, and from an independent mpmath model (`ref.py`, through `expect.py`); none is read from the page.

GitHub runs it on every pull request that touches the Sphere or its tests; run it by hand before changing the page. A full run takes about 20–25 minutes on four cores; R5, the label-overlap scan over 7,920 states, is most of it.

## Running

    NODE_PATH=$(npm root -g) node tests/sayyids-sphere/sphere.test.js                   # the repo's page
    SPHERE=/path/to/index.html node tests/sayyids-sphere/sphere.test.js                 # another copy
    ONLY=F1,TX node tests/sayyids-sphere/sphere.test.js                                 # some groups only

It needs Node, Playwright with Chromium, and Python 3 with `mpmath` (`pip install mpmath`). WebGL runs headless through SwiftShader, as `harness.js` sets up. Results go to `out-<TAG>/` beside it (`TAG` defaults to `build`). Exit status: 0 when every check passed, 1 when any failed or a group threw, 2 when the page is not found or `ONLY` names a group that did not run.

The languages are read from the page's own menu, so a new language is tested with the rest. `cuspstates.json` holds the cusp states the formatting checks visit; `python3 cuspstates.py > cuspstates.json` regenerates it.
