---
title: "Transliteration and Beta Code"
description: "Choose transliteration spellings, restyle a transliteration, and write Beta Code the TLG way."
sidebar:
  order: 2
---

Transliteration and Beta Code write Greek with Latin letters, by conventions
that differ from one tradition to the next. The `transliteration` options
spell each letter and mark; `source` rewrites a transliteration from one
convention into another; and Beta Code follows the TLG, which the `betaCode`
options refine.

## Choose transliteration spellings

Each key of `transliteration` chooses the Latin spelling of a letter or a
mark:

```ts
import { convert } from "@humanities/greek-conversion";

convert("βηξφχυ", "greek", "transliteration", {
  transliteration: {
    beta: "v",
    eta: "i",
    xi: "ks",
    phi: "f",
    chi: "kh",
    upsilon: "y",
  },
});
// → vīksfkhy

convert("τέχνη", "greek", "transliteration", {
  transliteration: { longVowels: "circumflex", chi: "kh" },
});
// → tékhnê
```

`eta` chooses the letter (`e` or `i`) and `longVowels` the mark it shares with
omega (`ē`, `ī`, `ō` or `ê`, `î`, `ô`). The circumflex cannot mark both length
and accent: `longVowels: "circumflex"` with `circumflexAccent: "circumflex"`
throws a `RangeError`, since `ῆ` would be written like `η`.

Further options cover nasal gamma, Modern Greek digraphs, systematic `rh`,
double rho, the coronis, numerals, and more; every key and its accepted values
are listed in the [option reference](/reference/options/#transliteration).
Supply the same options when reading transliteration back, and the chosen
spellings are recognized.

A reader follows the convention of its options and does not guess another one:
under `phi: "f"`, `ph` is pi followed by a rough breathing, which is how `πἡ` is
written (`phē`), so that the output reads back as itself. The
[stability policy](/reference/stability/#reading) states which spellings each
reader accepts.

## Restyle a transliteration

In a conversion that keeps the format, the options describe the input as well
as the output: `reencode()` normalizes a text in its own style. Reading
transliteration depends on its options, so to change the style of a
transliteration, say how it is written with `source`:

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("tōn barbarōn", "transliteration", {
  preset: "ala-lc-modern",
  source: { preset: "sbl-general" },
});
// → tōn varvarōn

reencode("phílos", "transliteration", {
  transliteration: { phi: "f" },
  source: {},
});
// → fílos
```

`source: {}` is the default style. Without `source`, the first call reads `b`
as μπ, as ALA-LC Modern does, and gives `tōn barmparōn`, and the second reads
`ph` as pi and a rough breathing, and changes nothing. `source` takes the
options of a conversion and replaces them all for reading: the other options,
`greek.accentuation` and `diacritics` included, only write the output. It works
with every function that reads text: `convertDetailed()` reports what the new
style loses, and between two formats, `source` describes the input apart from
the output. A restyle cannot restore what the source style does not note: the
default style writes no coronis.

## Write Beta Code the TLG way

ASCII letter case carries no meaning in Beta Code input: only `*` marks a
capital. Output follows the
[TLG placement rules](https://stephanus.tlg.uci.edu/encoding.php): breathing,
accent, then iota subscript, with the asterisk and marks before an uppercase
letter. Vowel quantity takes the TLG percent codes, `%26` for the macron and
`%27` for the breve, after the accent. As in the TLG, `'` is the apostrophe,
`[1` and `]1` are the parentheses (`(` and `)` being the breathings), and `&`, a
shift to the Latin font, is kept as text.

```ts
import { convert } from "@humanities/greek-conversion";

convert("A)/NQRWPOS", "beta-code", "greek"); // → ἄνθρωπος
convert("*)/ANQRWPOS", "beta-code", "greek"); // → Ἄνθρωπος
convert("ᾯ", "greek", "beta-code"); // → *(=w|
convert("ᾱ ᾰ", "greek", "beta-code"); // → a%26 a%27
convert("δῆσε(ν)", "greek", "beta-code"); // → dh=se[1n]1
convert("ἄνθρωπος", "greek", "beta-code", { preset: "tlg-core" });
// → A)/NQRWPOS
```

`betaCode.case` selects lowercase or uppercase ASCII, and `betaCode.yot: "#401"`
writes yot with its TLG code instead of `j`.
