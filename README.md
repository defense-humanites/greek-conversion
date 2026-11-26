<br>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/defense-humanites/greek-conversion/main/docs/assets/greek-conversion-logo-sombre.svg">
    <img src="https://raw.githubusercontent.com/defense-humanites/greek-conversion/main/docs/assets/greek-conversion-logo-clair.svg" alt="greek conversion" width="240">
  </picture>
</p>

<p align="center">
  <b>A TypeScript library that converts Ancient, Byzantine, and Modern Greek
  between Greek script, Beta Code, and Latin script, with standards-based
  presets and information-loss diagnostics.</b>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@humanities/greek-conversion"><img src="https://img.shields.io/npm/v/@humanities/greek-conversion" alt="npm"></a>
  <a href="https://jsr.io/@humanities/greek-conversion"><img src="https://jsr.io/badges/@humanities/greek-conversion" alt="JSR"></a>
  <a href="https://github.com/defense-humanites/greek-conversion/actions/workflows/ci.yml"><img src="https://github.com/defense-humanites/greek-conversion/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/defense-humanites/greek-conversion/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="https://greek-conversion.humanites.fr/"><b>Documentation</b></a> ·
  <a href="https://greek-conversion.humanites.fr/playground/"><b>Playground</b></a>
</p>

<br>

`greek-conversion` is a TypeScript library for everyone who moves Greek
between scripts:

- **Ancient Greek**: read polytonic Greek with its breathings, iota
  subscripts, coronides, and quantity marks, and digamma, koppa, and sampi;
  transliterate an edition with every accent and length mark, or after SBL,
  the BnF, ALA-LC, or ISO 843; read and write the Beta Code of the TLG and
  Perseus, which notes every mark; keep an elision as the edition writes it,
  and on request the iota adscript and the coronis of a crasis.
- **Byzantine Greek**, under the same conventions: read the breathings that
  older editions print before a capital, the καί symbol and the other signs
  for several letters, and alphabetic numerals; keep the lunate sigma, the
  overline of the nomina sacra, and Byzantine punctuation, in Greek and in
  the TLG's Beta Code; write in the style of the uncial manuscripts; romanize
  for a library catalogue after ALA-LC, whose table runs to 1453.
- **Modern Greek**: transcribe names as Greek passports, road signs, and
  maps write them, after ELOT 743, which the United Nations and BGN/PCGN
  adopted and ISO 843 gives as its Type 2 (`μπ` at a word's edge as `b`, `ευ`
  as `ev` or `ef`); transliterate after ISO 843 Type 1, which ELOT 743 has
  followed since 2001 and which converts back, or ALA-LC for library records;
  turn polytonic text into monotonic, after the monotonic accent rules; set
  capitals without accents, as Greek does; build search keys and URL slugs.

Each convention is a preset: a set of the library's 52 atomic options, which
states its references and how far it follows them. The options also combine
beyond the presets, among 126 values: `longVowels: "grave-circumflex"` marks
eta and omega as `è` and `ô` (`technè`), `chi: "kh"` writes chi `kh`, and
`kaiAccent: "byzantine"` gives the καί symbol the grave of the manuscripts.
The ALA-LC, BnF, and ISO 843 presets are tested against examples from their
published tables, and `iso-843-type-2` against every example of the BGN/PCGN
table. When a conversion cannot be reversed, the library says what was lost
instead of quietly guessing. It has no dependencies and uses no
runtime-specific API.

**Not a developer?** The
[playground](https://greek-conversion.humanites.fr/playground/)
converts in the browser, with every preset and option, and shows what each
conversion loses.

## Installation

```sh
npm install @humanities/greek-conversion   # npm
npx jsr add @humanities/greek-conversion   # JSR, which gives the command for each runtime
```

The package is ESM-only and ships its own type declarations.

## Main functions

| You want to…                                                             | Use                                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Convert a string                                                         | `convert(input, from, to, options?)`                                  |
| Normalize or restyle a string without changing its format                | `reencode(input, format, options?)`                                   |
| Know whether the conversion loses information, and where each token went | `convertDetailed(input, from, to, options?)`                          |
| Convert only the Greek of a text in another language                     | `convertGreekPassages(input, to, options?)`                           |
| Bind a preset, add characters, or restrict the repertoire                | `createConverter(configuration)`                                      |
| Inspect or edit the parsed text itself                                   | `parse()` and `encode()` from `@humanities/greek-conversion/document` |
| Bundle only the formats and presets a web page uses                      | `convert()` from `@humanities/greek-conversion/core`                  |

## Examples

### `convert()`

`convert()` takes a string from one format to another, after a preset or
the options it is given:

```ts
import { convert } from "@humanities/greek-conversion";

// The first words of the Odyssey, in the Beta Code of Perseus
convert("ἄνδρα μοι ἔννεπε, μοῦσα", "greek", "beta-code");
// → a)/ndra moi e)/nnepe, mou=sa

// A Byzantine manuscript's ligature for ου
convert("τȣ̃ θεȣ̃", "greek", "transliteration");
// → toũ theoũ

// A Modern Greek author, for a library record
convert("Νίκος Καζαντζάκης", "greek", "transliteration", {
  preset: "ala-lc-modern",
});
// → Nikos Kazantzakēs

// A search key, without marks or capitals
convert("Ἀριστοτέλης", "greek", "transliteration", {
  diacritics: { all: "remove" },
  transliteration: { longVowels: "omit" },
  text: { letterCase: "lowercase" },
});
// → aristoteles
```

### `convertDetailed()`

`convertDetailed()` converts as `convert()` does, and says what the output
cannot carry back, and where:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

// ISO 843 Type 2, which Greek passports use, writes eta like iota
const city = convertDetailed("Θεσσαλονίκη", "greek", "transliteration", {
  preset: "iso-843-type-2",
});
city.output; // → Thessaloníki
city.lossy; // → true
city.losses[0].message; // → The target representation does not retain eta.
city.losses[0].offset; // → 10

// SBL's general style drops smooth breathings, accents, iota subscripts
const verse = convertDetailed("ἐν ἀρχῇ ἦν", "greek", "transliteration", {
  preset: "sbl-general",
});
verse.output; // → en archē ēn
verse.losses.length; // → 6
```

### `reencode()`

`reencode()` keeps the format and changes the spelling: it normalizes a
text, or writes it after other conventions:

```ts
import { reencode } from "@humanities/greek-conversion";

// The lunate sigma of an edition, made standard
reencode("ϲοφίαϲ", "greek", { greek: { sigma: "standard" } });
// → σοφίας

// Greek numerals, in figures
reencode("ἔτει ͵αωκαʹ", "greek", { text: { numerals: "decimal" } });
// → ἔτει 1821

// The Beta Code of Perseus, in the capitals of the TLG
reencode("a)/ndra moi e)/nnepe, mou=sa", "beta-code", {
  preset: "tlg-core",
});
// → A)/NDRA MOI E)/NNEPE, MOU=SA
```

## Documentation

- [Getting started](https://greek-conversion.humanites.fr/guide/getting-started/),
  then the pages on
  [Ancient](https://greek-conversion.humanites.fr/guide/ancient-greek/),
  [Byzantine and Medieval](https://greek-conversion.humanites.fr/guide/byzantine-greek/),
  and [Modern Greek](https://greek-conversion.humanites.fr/guide/modern-greek/).
- [Choosing a preset](https://greek-conversion.humanites.fr/guide/presets/):
  what each convention writes, and what it loses.
- [Smaller bundles](https://greek-conversion.humanites.fr/guide/smaller-bundles/),
  for a web application that uses a few formats and presets, and
  [Performance](https://greek-conversion.humanites.fr/guide/performance/).
- [Guarantees and limits](https://greek-conversion.humanites.fr/reference/guarantees/),
  then the rest of the reference: the
  [options](https://greek-conversion.humanites.fr/reference/options/),
  [information loss](https://greek-conversion.humanites.fr/reference/information-loss/),
  and the [API](https://greek-conversion.humanites.fr/api/readme/).
- [Contributing](https://github.com/defense-humanites/greek-conversion/blob/main/CONTRIBUTING.md).

## Citing and license

If you use `greek-conversion` in research or in a published resource, please
cite it; GitHub's “Cite this repository” button uses the metadata in
[`CITATION.cff`](https://github.com/defense-humanites/greek-conversion/blob/main/CITATION.cff).

Copyright (C) 2021–2026 Antoine Boquet. Released under the
[MIT License](https://github.com/defense-humanites/greek-conversion/blob/main/LICENSE)
since `1.0.0-beta.7`; earlier versions remain under AGPL-3.0-or-later. The
benchmark text,
[`bench/thucydides.ts`](https://github.com/defense-humanites/greek-conversion/blob/main/bench/thucydides.ts)
(Thucydides 1.1–1.10, from the Perseus Digital Library), is under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and is not
part of the published packages. The greek-conversion logos under
`docs/assets/` are not covered by these licenses: all rights are reserved, as
recorded in
[`LicenseRef-greek-conversion-marks`](https://github.com/defense-humanites/greek-conversion/blob/main/LICENSES/LicenseRef-greek-conversion-marks.txt).
