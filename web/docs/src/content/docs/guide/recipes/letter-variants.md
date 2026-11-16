---
title: "Keep or fold letter variants"
description: "Keep the lunate sigma, \u03d0, and the symbol forms, or write the ordinary letters."
sidebar:
  order: 5
---
Some letters have more than one form: the lunate sigma `ϲ`, the final and
medial sigma `ς` and `σ`, and the symbol forms `ϐ`, `ϑ`, `ϴ`, `ϕ`, `ϖ`, `ϰ`,
`ϱ`, `ϵ`, and `ϒ`. Each is read as its letter, so `ϑεός` and `θεός` have the
same letters. By default, Greek output keeps the forms the source writes, even
a sigma whose shape contradicts its place, as in an abbreviation or a stem
(`λόγοσ`). One option of `greek` decides each form:

| Option        | Forms                     | Other values                                                                                |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| `sigma`       | `ϲ`                       | `"standard"` writes `σ` or `ς`; `"lunate"` writes `ϲ` for every sigma                       |
| `finalSigma`  | `ς` and `σ`               | `"contextual"` writes `ς` at the end of a word and `σ` elsewhere; `"medial"` writes `σ`     |
| `medialBeta`  | `ϐ`                       | `"standard"` writes `β`; `"symbol"` writes `ϐ` inside a word and `β` at its start, as French typography does |
| `symbolForms` | `ϑ ϴ ϕ ϖ ϰ ϱ ϵ ϒ`         | `"standard"` writes the ordinary letters                                                    |

Beta Code writes the lunate sigma `s3`, and a sigma whose shape contradicts its
place `s1` (`σ`) or `s2` (`ς`). Transliteration writes the lunate sigma `c`
under `lunateSigma: "c"`. `convertDetailed()` reports any other form the
target cannot write (`removed-glyph-variant`):

```ts
import { convert } from "@humanities/greek-conversion";

const options = { transliteration: { lunateSigma: "c" } } as const;

convert("σϲς", "greek", "transliteration", options); // → scs
convert("scs", "transliteration", "greek", options); // → σϲς
convert("σϲς", "greek", "beta-code"); // → ss3s
convert("λόγοσ", "greek", "beta-code"); // → lo/gos1
```

To write the ordinary letters, fold the variants. A comparison key also writes
every sigma medial, and can drop the case and the marks:

```ts
import { reencode } from "@humanities/greek-conversion";

const fold = {
  greek: { sigma: "standard", medialBeta: "standard", symbolForms: "standard" },
} as const;

reencode("ϐίος λόγοσ ϲῶμα ϑεός", "greek", fold);
// → βίος λόγοσ σῶμα θεός
reencode("ϐΊΟΣ λόγος ϑεός", "greek", {
  greek: { ...fold.greek, finalSigma: "medial" },
  text: { letterCase: "lowercase" },
  diacritics: { all: "remove" },
});
// → βιοσ λογοσ θεοσ
```
