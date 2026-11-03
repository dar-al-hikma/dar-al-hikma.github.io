# al-Khizāna tests

Checks for `khizana/`, the collection the shelf opens by a passphrase. Its pages hold only ciphertext, and the keys are never in this repository, so the live pages are tested locked (no key, a wrong key, a wrong passphrase). Everything that opens is tested on `fixture/`: a gate and an item made by the same encryptor with the keys in `fixture-keys.json`, which are published on purpose and open nothing else. The suite first checks that the live pages and the fixture run the same code. About forty checks; under a minute.

## Running

    NODE_PATH=$(npm root -g) node tests/khizana/khizana.test.js
    VERBOSE=1 node tests/khizana/khizana.test.js        # every check, not just failures

It needs Node and Playwright with Chromium. Exit status: 0 when every check passed, 1 when any failed, 2 when Playwright is missing.

## What it checks

| | |
|---|---|
| files | Every page is marked noindex, holds one script and no page of its own, and runs the same code as the fixture. |
| locked | Without a key the gate shows only the passphrase form, and an item says where it opens from; a wrong key or passphrase fails cleanly and says so; the key leaves the address; no errors, no requests. |
| fixture | The link and the passphrase (in any case and spacing) open the gate; an item opens, replaces its shell and runs; a reload; a link pasted into an open tab; remembering on the device; *Mischief managed* forgets every key. |
| languages | The gate follows the shelf's `dah.lang`, saves a choice for every piece, and fits 320 px in each of the seven languages, locked and open. |

The pages are built, and their decryption checked against the plain pages, in the development repository, where the keys are. The fixture is rebuilt there too, whenever the decryptor changes.
