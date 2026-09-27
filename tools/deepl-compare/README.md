# DeepL comparison

A second, independent machine translation of every string on the shelf, set beside the
pieces' own translations so the two can be compared. It reads the language tables and
never changes a piece.

```
node tools/deepl-compare/deepl-compare.js --dry-run              # count characters; no key needed
DEEPL_API_KEY=… node tools/deepl-compare/deepl-compare.js --langs=ja --limit=10   # small test
DEEPL_API_KEY=… node tools/deepl-compare/deepl-compare.js        # nb, es, fr, de, zh, ja
```

- In a cloud session, store the key as the environment's API credential for
  `api-free.deepl.com` (header `Authorization`, prefix `DeepL-Auth-Key`) and leave
  `DEEPL_API_KEY` unset: the proxy adds the key, and the session never sees it.
- A full run is about 412,000 billable characters (≈ 68,700 per language). The script
  checks the account's remaining characters first and stops if they would not cover it.
- Every result is cached in `out/deepl.<lang>.json`; a rerun only sends strings it has
  not translated yet. Keep `out/` — the cache is what the characters paid for.
- Placeholders (`«A»`, `%1`) travel inside `translate="no"` spans, so DeepL keeps them
  whole and places them in the sentence; tags themselves are not billed.
  Template strings are rendered once with named stand-ins, so both sides show the same
  branch.
- Output: `out/compare.<lang>.txt` (to read) and `out/compare.<lang>.json` (to process),
  one row per string: English | the piece's translation | DeepL.

This is tooling, not part of the site: keep it off `main`.
