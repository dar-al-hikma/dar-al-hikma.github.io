# Embedded fonts

Every page here embeds its typefaces as base64 `woff2` inside the HTML, so a
saved copy renders correctly with no network. The faces are subset to Latin
plus Arabic transliteration; CJK is left to system fonts.

All three families are licensed under the **SIL Open Font License, Version 1.1**,
which permits embedding in a document. Full text: <https://openfontlicense.org>

| Family | Copyright |
|---|---|
| EB Garamond | Copyright 2017 The EB Garamond Project Authors — <https://github.com/octaviopardo/EBGaramond12> |
| IBM Plex Mono | Copyright 2017 IBM Corp. — <https://github.com/IBM/plex> |
| IBM Plex Sans Condensed | Copyright 2019 IBM Corp. — <https://github.com/IBM/plex> |
| Noto Sans Symbols (The Takht only, as *Takht Signs*) | Copyright 2022 The Noto Project Authors — <https://github.com/notofonts/symbols> |

## Regenerating

Subsets are built with `pyftsubset` from the upstream TTFs, over the union of
Google's `latin` unicode-range, an Arabic-transliteration set, and the
characters each page actually contains. Nine faces come to ~190 KB, versus
~709 KB for Google's stock `latin` + `latin-ext` slices.

The Takht also embeds the twelve zodiac signs (U+2648–2653) from Noto Sans
Symbols 2.003, so ♈…♓ look the same on every device instead of depending on
the system's symbol font. It was cut from the chart app's Noto Sans Symbols
subset with

    pyftsubset NotoSansSymbols-subset.woff2 --output-file=takht-signs.woff2 \
        --unicodes=U+2648-2653 --flavor=woff2 --no-hinting --desubroutinize \
        --layout-features= --name-IDs='*'

(1,852 bytes). The page's `@font-face` rule carries the copyright and licence
notice in a comment beside it. Noto declares no Reserved Font Name, so renaming
the family is allowed.
