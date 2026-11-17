# Fonts of the playground and the documentation site

The playground and the documentation site serve their typefaces themselves,
so that they load nothing from another site. `web/shared/tokens.css` declares
them. All are under the
[SIL Open Font License 1.1](../../../LICENSES/OFL-1.1.txt); none declares a
Reserved Font Name.

| File | Source | Used for |
| --- | --- | --- |
| `bricolage-grotesque.woff2` | [Bricolage Grotesque](https://github.com/ateliertriay/bricolage), variable (`opsz` 12–96, `wght` 400–800) | The interface |
| `literata-gc-light.woff2` | [Literata](https://github.com/googlefonts/literata), static Light (`wght` 300) at `opsz` 24, renamed Literata GC | The texts in all three formats: the fields, examples, and loss reports |
| `noto-serif-greek-symbols.woff2` | [Noto Serif](https://github.com/notofonts/latin-greek-cyrillic), static Light, sixteen letters | The Greek letters Literata lacks, in the same family (`unicode-range`) |
| `noto-sans-mono.woff2` | [Noto Sans Mono](https://github.com/notofonts/latin-greek-cyrillic), variable (`wght` 400–700) | The code, in all three formats |
| `fira-mono-greek-symbols.woff2` | [Fira Mono](https://github.com/mozilla/Fira), Regular, nineteen letters | The Greek letter forms Noto Sans Mono draws as the ordinary letters, in the same family (`unicode-range`) |

All are subsets of fonts of
[google/fonts](https://github.com/google/fonts) (`ofl/bricolagegrotesque`,
`ofl/literata`, `ofl/notoserif`, `ofl/notosansmono`, `ofl/firamono`), made
with
[fontTools](https://github.com/fonttools/fonttools) 4.67.0 by
[`scripts/build_fonts.py`](../../../scripts/build_fonts.py):

```sh
pip install "fonttools[woff]==4.67.0"
python3 scripts/build_fonts.py
```

The script downloads the sources and checks them against the SHA-256 of the
versions the fonts were built from (`--sources` reads them from a folder
instead, `--any-version` accepts another release). Each font keeps the date of
its source, so the build gives the same bytes every time. The subsets keep
every name, the licence's included, and the layout features the texts need
(`ccmp`, `locl`, `mark`, `mkmk`, `kern`, `liga`).

- **Bricolage Grotesque**: the `wdth` axis fixed at 100 and `wght` limited to
  400–800, then subset to Basic Latin, Latin-1, Latin Extended-A, the
  combining acute and macron, and general punctuation.
- **Literata GC**: instantiated at `opsz` 24 and `wght` 300, one step
  lighter than Regular, then subset to
  Latin (with Latin Extended-B and Extended Additional), spacing modifiers,
  combining diacritics, Greek and Coptic, Greek Extended, and general
  punctuation. Both subsets also keep the euro, the trade mark, the arrows ←
  and →, and the minus. Literata lacks four letters that the presets produce or
  accept; they are added as composites of its own glyphs:
  - `ϲ` (U+03F2) and `Ϲ` (U+03F9), lunate sigma: the Latin `c` and `C`.
  - `ḳ` (U+1E33) and `Ḳ` (U+1E32), ALA-LC archaic koppa: `k` and `K` with
    the dot below, at the position of Literata's own mark anchors.

  Because it is modified, the font is renamed Literata GC.

Literata also lacks the symbol forms of Greek letters (`ϐ ϑ ϒ ϓ ϔ ϕ ϖ ϰ ϱ
ϵ`) and the reversed and dotted lunate sigmas (U+037B–037D, U+03FD–03FF).
`noto-serif-greek-symbols.woff2` holds only these sixteen letters, from
Noto Serif instantiated at `wght` 300 and `wdth` 100; the style sheet loads
it under the same family name for those code points, at 95 % so that its
x-height matches Literata's.

Literata has no combining perispomeni (U+0342), combining comma above
(U+0313, U+0314) or combining low line (U+0332). Precomposed letters cover
the first three; text that uses the combining forms falls back to another
font.

- **Noto Sans Mono**: the `wdth` axis fixed at 100 and `wght` limited to
  400–700, for the bold of keywords and functions, then subset as Literata
  GC. It is the one monospace font of google/fonts that covers polytonic
  Greek, Greek Extended and every combining diacritic, and stacks them with
  its mark anchors; the code no longer depends on the system's monospace
  font, which on some systems lacks Greek Extended or stacks two diacritics
  on top of each other.
- **Fira Mono**: Noto Sans Mono draws the symbol forms (`ϐ ϑ ϒ ϓ ϔ ϕ ϖ ϰ ϱ
  ϵ ϴ`) as the ordinary letters, and the lunate sigmas `ϲ Ϲ` and the
  reversed and dotted ones (U+037B–037D, U+03FD–03FF) as `σ` and `Σ`. These
  nineteen letters are left out of its subset and taken from Fira Mono
  Regular, which draws them apart at the same advance (600 units), loaded
  under the same family name for those code points.
