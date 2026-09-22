# Dār al-Ḥikma — دار الحكمة

Small self-contained pieces, published at **<https://dar-al-hikma.github.io>**.

Each piece is a single HTML file. No build step, no bundler, no framework, no
tracking. Save one to disk and it still works.

## The shelf

| Piece | | |
|---|---|---|
| [Sayyid's Sphere](https://dar-al-hikma.github.io/sayyids-sphere/) | Three reference frames, one turning sky | 7 languages |

## Layout

```
.
├── index.html          the shelf
├── .nojekyll           serve files as-is, no Jekyll pass
└── <piece>/index.html  one folder per piece
```

## Adding a piece

1. `mkdir <piece-slug>` and drop the file in as `index.html`.
2. Add a `<li>` to the shelf in the root `index.html`.
3. Add a row to the table above.
4. Commit and push. GitHub Pages redeploys from `main` within a minute.

Slugs are lowercase and hyphenated; the folder name is the URL.

## Conventions

- **One file per piece.** External requests are limited to web fonts. If a piece
  needs to survive offline in perpetuity, inline the fonts as data URIs.
- **Dark palette**, shared across the shelf and the pieces:
  `--void:#070A12` · `--vellum:#EAE3D2` · `--brass:#E3AA3E` · `--steel:#7FB6E0`
- **No build tooling.** If a piece ever needs a build, it belongs in its own repo.
