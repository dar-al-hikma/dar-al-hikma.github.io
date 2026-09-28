# Dār al-Ḥikma — دار الحكمة

Small self-contained pieces, published at **<https://dar-al-hikma.github.io>**.

Each piece is one HTML file, with its fonts, styles and code inside it. No build
step, no bundler, no framework, no tracking. Save one to disk and it still works.

Every piece speaks seven languages: English, Norsk bokmål, Español, Français,
Deutsch, 简体中文 and 日本語.

## The shelf

| Piece | What it is |
|---|---|
| [Sayyid's Sphere](https://dar-al-hikma.github.io/sayyids-sphere/) | Three reference frames, one turning sky |
| [Sayyid's Orrery](https://dar-al-hikma.github.io/sayyids-orrery/) | Ptolemy's models, seen from the pole of the ecliptic |
| [The Reckoner](https://dar-al-hikma.github.io/reckoner/) | Arithmetic in sixties |
| [The Takht](https://dar-al-hikma.github.io/takht/) (تخت) | The calculator beside the three books |
| [Between the Lines](https://dar-al-hikma.github.io/between-the-lines/) | Interpolation in a table of houses |

## Layout

```
.
├── index.html          the shelf
├── feed.xml            RSS: one item per piece, newest first
├── FONT-LICENSES.md    the embedded typefaces and their licences
├── GLOSSARY.md         the shelf's terms, and how each language renders them
├── .nojekyll           serve files as-is, no Jekyll pass
├── <piece>/
│   ├── index.html      the piece, complete in itself
│   └── …               optional: manifest, icons, offline worker
└── tests/<piece>/      a piece's tests, where it has them
```

## Tests

The Takht has a test suite in [`tests/takht/`](tests/takht/). GitHub runs it on every pull
request that touches the Takht, and `tests/takht/run-all.sh` runs it locally (Node and
Playwright with Chromium). Its README says how to check a new or changed translation.

The Reckoner, Between the Lines and Sayyid's Sphere have suites in
[`tests/reckoner/`](tests/reckoner/), [`tests/between-the-lines/`](tests/between-the-lines/)
and [`tests/sayyids-sphere/`](tests/sayyids-sphere/), run by hand (about 20 seconds,
40 minutes and 20 minutes); each README says how.

## Adding a piece

1. `mkdir <piece-slug>` and drop the file in as `index.html`.
2. Add a `<li>` to the shelf in the root `index.html`.
3. Add a row to the table above.
4. Add an `<item>` at the top of `feed.xml` (title, link, guid, date,
   description) and update its `<lastBuildDate>`. Feed readers and the
   Discord bot announce whatever appears there with a new `<guid>`.
5. If it embeds a typeface not yet listed, add it to
   [FONT-LICENSES.md](FONT-LICENSES.md).
6. Translate with the renderings in [GLOSSARY.md](GLOSSARY.md), and add any new
   term it brings.
7. Commit and push. GitHub Pages redeploys from `main` within a minute.

Slugs are lowercase and hyphenated; the folder name is the URL.

## Conventions

- **One file per piece, and no network at all.** Fonts are embedded as base64
  `woff2`. Save a page to disk and it renders exactly the same with the network
  off.
- **Installing is extra.** A piece may keep a manifest, home-screen icons and an
  offline worker beside its `index.html`, as the Takht does. The worker caches
  only the piece's own files, from where it was served, and the page works
  without any of them. A piece that gains a file adds it to its worker's list.
- **Transliteration goes in the display face.** IBM Plex has no `Ḥ ḥ ṣ ʿ ʾ`;
  EB Garamond does. Set any transliterated name in `var(--f-display)` so the
  whole phrase comes from one font.
- **Seven languages, one file.** Every string a piece shows lives in its language
  table (`TX` in Sayyid's Sphere, `I18N` in the others); a missing key falls back
  to English. The choice is shared across the shelf under `localStorage["dah.lang"]`.
  A term reads the same in every piece: [GLOSSARY.md](GLOSSARY.md) gives each
  language's rendering, following the English of Dykes's course.
- **Dark palette**, shared across the shelf and the pieces:
  `--void:#070A12` · `--vellum:#EAE3D2` · `--brass:#E3AA3E` · `--steel:#7FB6E0`
- **No build tooling.** If a piece ever needs a build, it belongs in its own repo.
