# Dār al-Ḥikma — دار الحكمة

Small self-contained pieces, published at **<https://dar-al-hikma.github.io>**.

Each piece is a single HTML file. No build step, no bundler, no framework, no
tracking. Save one to disk and it still works.

## The shelf

| Piece | | |
|---|---|---|
| [Sayyid's Sphere](https://dar-al-hikma.github.io/sayyids-sphere/) | Three reference frames, one turning sky | 7 languages |
| [Sayyid's Orrery](https://dar-al-hikma.github.io/sayyids-orrery/) | Ptolemy's models, seen from the pole of the ecliptic | 7 languages |
| [The Reckoner](https://dar-al-hikma.github.io/reckoner/) | Arithmetic in sixties | 7 languages |
| [Between the Lines](https://dar-al-hikma.github.io/between-the-lines/) | Interpolation in a table of houses | 7 languages |
| [The Takht](https://dar-al-hikma.github.io/takht/) | A dust board for chart calculation | 7 languages |

## Layout

```
.
├── index.html          the shelf
├── feed.xml            RSS: one item per piece, newest first
├── .nojekyll           serve files as-is, no Jekyll pass
└── <piece>/index.html  one folder per piece
```

A piece that is meant to be added to a phone's home screen (so far only the
Takht) also keeps a `manifest.webmanifest` and its PNG icons in its folder.
The page never depends on them: a saved `index.html` still works without them
and just has no home-screen icon.

## Adding a piece

1. `mkdir <piece-slug>` and drop the file in as `index.html`.
2. Add a `<li>` to the shelf in the root `index.html`.
3. Add a row to the table above.
4. Add an `<item>` at the top of `feed.xml` (title, link, guid, date,
   description) and update its `<lastBuildDate>`. Feed readers and the
   Discord bot announce whatever appears there with a new `<guid>`.
5. Commit and push. GitHub Pages redeploys from `main` within a minute.

Slugs are lowercase and hyphenated; the folder name is the URL.

## Conventions

- **One file per piece, and no network at all.** Fonts are embedded as base64
  `woff2`; see [FONT-LICENSES.md](FONT-LICENSES.md). Save a page to disk and it
  renders exactly the same with the network off.
- **Transliteration goes in the display face.** IBM Plex has no `Ḥ ḥ ṣ ʿ ʾ`;
  EB Garamond does. Set any transliterated name in `var(--f-display)` so the
  whole phrase comes from one font.
- **Seven languages, one file.** Every string a piece shows lives in its language
  table (`TX` in Sayyid's Sphere, `I18N` in the others); a missing key falls back
  to English. The choice is shared across the shelf under `localStorage["dah.lang"]`.
- **Dark palette**, shared across the shelf and the pieces:
  `--void:#070A12` · `--vellum:#EAE3D2` · `--brass:#E3AA3E` · `--steel:#7FB6E0`
- **No build tooling.** If a piece ever needs a build, it belongs in its own repo.
