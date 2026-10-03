# Embedded fonts

Every page here embeds its typefaces as base64 `woff2` inside the HTML, so a
saved copy renders correctly with no network. The faces are subset to Latin
plus Arabic transliteration; CJK is left to system fonts.

All six families are licensed under the **SIL Open Font License, Version 1.1**,
which permits embedding in a document. Full text: <https://openfontlicense.org>

| Family | Copyright |
|---|---|
| EB Garamond | Copyright 2017 The EB Garamond Project Authors — <https://github.com/octaviopardo/EBGaramond12> |
| IBM Plex Mono | Copyright 2017 IBM Corp. — <https://github.com/IBM/plex> |
| IBM Plex Sans Condensed | Copyright 2019 IBM Corp. — <https://github.com/IBM/plex> |
| Noto Naskh Arabic | Copyright 2022 The Noto Project Authors — <https://github.com/notofonts/arabic> (version 2.021: the title in Arabic script, in The Jadāwil only) |
| Noto Sans Symbols | Copyright 2016 Google LLC — <https://github.com/notofonts/noto-fonts> (the planet glyphs, in The Jadāwil only, embedded with the Noto Sans Symbols 2 subset under the local name *Takht Signs*) |
| Noto Sans Symbols 2 | Copyright 2022 The Noto Project Authors — <https://github.com/notofonts/symbols> (the twelve zodiac signs, in The Takht and The Jadāwil, under the local name *Takht Signs*; the Sun in The Jadāwil, Copyright 2017 Google Inc.) |

## Regenerating

Subsets are built with `pyftsubset` from the upstream TTFs, over the union of
Google's `latin` unicode-range, an Arabic-transliteration set, and the
characters each page actually contains. Nine faces come to ~190 KB, versus
~709 KB for Google's stock `latin` + `latin-ext` slices.
