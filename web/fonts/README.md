# Playground fonts

The playground serves its typefaces itself, so that it loads nothing from
another site. Both are under the
[SIL Open Font License 1.1](../../LICENSES/OFL-1.1.txt); neither declares a
Reserved Font Name.

| File | Source | Used for |
| --- | --- | --- |
| `bricolage-grotesque.woff2` | [Bricolage Grotesque](https://github.com/ateliertriay/bricolage), variable (`opsz` 12–96, `wght` 400–800) | The interface |
| `literata-gc-regular.woff2` | [Literata](https://github.com/googlefonts/literata), static Regular at `opsz` 24, renamed Literata GC | Greek and transliteration in the text fields, examples, and loss reports |
| `noto-serif-greek-symbols.woff2` | [Noto Serif](https://github.com/notofonts/latin-greek-cyrillic), static Regular, sixteen letters | The Greek letters Literata lacks, in the same family (`unicode-range`) |

Both are subsets of the files in
[google/fonts](https://github.com/google/fonts) (`ofl/bricolagegrotesque`,
`ofl/literata`), made with [fontTools](https://github.com/fonttools/fonttools):

- **Bricolage Grotesque**: the `wdth` axis fixed at 100 and `wght` limited to
  400–800, then subset to Basic Latin, Latin-1, Latin Extended-A and general
  punctuation.
- **Literata GC**: instantiated at `opsz` 24 and `wght` 400, then subset to
  Latin (with Latin Extended-B and Extended Additional), spacing modifiers,
  combining diacritics, Greek and Coptic, Greek Extended, and general
  punctuation. Literata lacks four letters that the presets produce or
  accept; they are added as composites of its own glyphs:
  - `ϲ` (U+03F2) and `Ϲ` (U+03F9), lunate sigma: the Latin `c` and `C`.
  - `ḳ` (U+1E33) and `Ḳ` (U+1E32), ALA-LC archaic koppa: `k` and `K` with
    the dot below, at the position of Literata's own mark anchors.

  Because it is modified, the font is renamed Literata GC.

Literata also lacks the symbol forms of Greek letters (`ϐ ϑ ϒ ϓ ϔ ϕ ϖ ϰ ϱ
ϵ`) and the reversed and dotted lunate sigmas (U+037B–037D, U+03FD–03FF).
`noto-serif-greek-symbols.woff2` holds only these sixteen letters, from
Noto Serif instantiated at `wght` 400 and `wdth` 100; the style sheet loads
it under the same family name for those code points, at 95 % so that its
x-height matches Literata's.

Literata has no combining perispomeni (U+0342), combining comma above
(U+0313, U+0314) or combining low line (U+0332). Precomposed letters cover
the first three; text that uses the combining forms falls back to another
font.
