<br>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/defense-humanites/greek-conversion/main/docs/assets/greek-conversion-logo-sombre.svg">
    <img src="https://raw.githubusercontent.com/defense-humanites/greek-conversion/main/docs/assets/greek-conversion-logo-clair.svg" alt="greek conversion" width="240">
  </picture>
</p>

<p align="center">
  <b>Convert Ancient and Modern Greek between Greek script, Beta Code, and
  Latin script, with standards-based presets and information-loss
  diagnostics.</b>
</p>

<p align="center">
  <a href="https://jsr.io/@humanities/greek-conversion"><img src="https://jsr.io/badges/@humanities/greek-conversion" alt="JSR"></a>
  <a href="https://www.npmjs.com/package/@humanities/greek-conversion"><img src="https://img.shields.io/npm/v/@humanities/greek-conversion" alt="npm"></a>
  <a href="https://github.com/defense-humanites/greek-conversion/actions/workflows/ci.yml"><img src="https://github.com/defense-humanites/greek-conversion/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/defense-humanites/greek-conversion/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="https://defense-humanites.github.io/greek-conversion/"><b>Documentation</b></a> ·
  <a href="https://defense-humanites.github.io/greek-conversion/playground/"><b>Playground</b></a>
</p>

<br>

`greek-conversion` is a TypeScript library for classicists, librarians,
digital-humanities developers, and anyone who writes Greek names in Latin
script. It handles polytonic and monotonic Greek, implements published
conventions (ALA-LC, BnF, ISO 843 and ELOT 743, SBL, TLG, Perseus) as
ready-made presets, and tells you when a conversion loses information instead of
quietly guessing. It has no dependencies and uses no runtime-specific API.

## Installation

```sh
npm install @humanities/greek-conversion   # npm
npx jsr add @humanities/greek-conversion   # JSR, which gives the command for each runtime
```

The package is ESM-only and ships its own type declarations.

## Example

Ancient Greek to the SBL academic transliteration, Beta Code to Greek, and
Modern Greek to the ISO 843 transcription of passports and maps:

```ts
import { convert } from "@humanities/greek-conversion";

convert("Ἕλλησιν ἐγένετο", "greek", "transliteration"); // → Héllēsin egéneto
convert("*(/ellhsin e)ge/neto", "beta-code", "greek"); // → Ἕλλησιν ἐγένετο
convert("Η Αθήνα είναι η πρωτεύουσα", "greek", "transliteration", {
  preset: "iso-843-type-2",
});
// → I Athína eínai i protévousa
```

## Main functions

| You want to…                                                             | Use                                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Convert a string                                                         | `convert(input, from, to, options?)`                                  |
| Normalize or restyle a string without changing its format                | `reencode(input, format, options?)`                                   |
| Know whether the conversion loses information, and where each token went | `convertDetailed(input, from, to, options?)`                          |
| Reuse one configuration, add characters, or restrict the repertoire      | `createConverter(configuration)`                                      |
| Inspect or edit the parsed text itself                                   | `parse()` and `encode()` from `@humanities/greek-conversion/document` |

The [documentation](https://defense-humanites.github.io/greek-conversion/) has the guide, the recipes, the
[presets](https://defense-humanites.github.io/greek-conversion/guide/presets/), a page on
[Modern Greek](https://defense-humanites.github.io/greek-conversion/guide/modern-greek/), the reference, and the
[API](https://defense-humanites.github.io/greek-conversion/api/). What every conversion guarantees is stated in
[Guarantees and limits](https://github.com/defense-humanites/greek-conversion/blob/main/docs/guarantees.md);
to contribute, see
[CONTRIBUTING.md](https://github.com/defense-humanites/greek-conversion/blob/main/CONTRIBUTING.md).

## Citing and license

If you use `greek-conversion` in research or in a published resource, please
cite it; GitHub's “Cite this repository” button uses the metadata in
[`CITATION.cff`](https://github.com/defense-humanites/greek-conversion/blob/main/CITATION.cff).

Copyright (C) 2021–2026 Antoine Boquet. Released under the
[MIT License](https://github.com/defense-humanites/greek-conversion/blob/main/LICENSE)
since `1.0.0-beta.7`; earlier versions remain under AGPL-3.0-or-later. The
benchmark input,
[`bench/thucydides.ts`](https://github.com/defense-humanites/greek-conversion/blob/main/bench/thucydides.ts)
(Thucydides 1.1–1.10, from the Perseus Digital Library), is under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and is not part
of the published packages.

The greek-conversion logos under `docs/assets/` are not covered by these
licenses: all rights are reserved, as recorded in
[`LicenseRef-greek-conversion-marks`](https://github.com/defense-humanites/greek-conversion/blob/main/LICENSES/LicenseRef-greek-conversion-marks.txt).
