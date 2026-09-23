# greek-conversion

This library supports bidirectional conversion between Greek, Beta Code,
and scientific transliteration. It provides predictable output, named
standards-oriented presets, and diagnostics when a conversion loses
information. Unknown characters are preserved instead of being silently
discarded.

## Summary

1. [Installation](#installation)
2. [Quick start](#quick-start)
3. [Choose the right API](#choose-the-right-api)
4. [Use a preset](#use-a-preset)
   1. [Inspect effective defaults](#inspect-effective-defaults)
5. [Common recipes](#common-recipes)
   1. [Produce monotonic Greek](#produce-monotonic-greek)
   2. [Remove all or selected diacritics](#remove-all-or-selected-diacritics)
   3. [Fold Greek letter variants](#fold-greek-letter-variants)
   4. [Normalize case and whitespace](#normalize-case-and-whitespace)
   5. [Select transliteration spellings](#select-transliteration-spellings)
   6. [Control Greek Unicode output](#control-greek-unicode-output)
6. [Detect information loss](#detect-information-loss)
7. [Extend or restrict the character inventory](#extend-or-restrict-the-character-inventory)
8. [Guarantees and scope](#guarantees-and-scope)
9. [Advanced API](#advanced-api)
10. [Documentation](#documentation)
11. [Development](#development)
12. [License](#license)

## Installation

The `1.0.0-beta.5` prerelease is ESM-only and targets JSR and npm:

```sh
deno add jsr:@humanities/greek-conversion@1.0.0-beta.5
npm install @humanities/greek-conversion@beta
```

Import the public module from JSR:

```ts
import {
  betaCodeToGreek,
  convert,
  convertDetailed,
} from "@humanities/greek-conversion";
```

The same package name and named exports are available from npm.

## Quick start

Use `convert()` for any pair of supported formats:

```ts
convert("a)/nqrwpos", "beta-code", "greek");
// ἄνθρωπος

convert("ἄνθρωπος", "greek", "transliteration");
// ánthrōpos

convert("ánthrōpos", "transliteration", "beta-code");
// a)/nqrwpos
```

Directional helpers are also available when they make application code easier
to read:

```ts
betaCodeToGreek("a)/nqrwpos"); // ἄνθρωπος
```

The supported format names are `"greek"`, `"beta-code"`, and
`"transliteration"`.

### Beta Code spelling

ASCII letter case has no semantic value in Beta Code input. Only `*` marks a
Greek capital, so `A)/NQRWPOS` and `a)/nqrwpos` both convert to `ἄνθρωπος`,
whereas `*)/ANQRWPOS` converts to `Ἄνθρωπος`. Marking every letter, as in
`*)/A*N*Q*R*W*P*O*S`, produces `ἌΝΘΡΩΠΟΣ`.

Canonical output follows the
[TLG placement and order rules](https://stephanus.tlg.uci.edu/encoding.php):

- lowercase: letter, breathing, accent, iota subscript — `w(=|`;
- uppercase: asterisk, breathing, accent, letter, iota subscript — `*(=w|`.

`orthography.betaCodeCase` selects `"lowercase"` or `"uppercase"` ASCII output
without changing the represented Greek letter case. The default and Perseus
preset use lowercase ASCII; `tlg-core` uses uppercase ASCII.

The engine-default yot spelling is `j`. Set `orthography.yotBetaCode` to
`"#401"`, or use `tlg-core`, for the TLG character code.

## Choose the right API

| Need | API |
| --- | --- |
| Convert one string | `convert()` or a directional helper |
| Canonicalize or transform a string without changing its format | `reencode()` |
| Display a warning when information is lost | `convertDetailed()` |
| Reuse or inspect one parsed source | `parse()` and `encode()` |

All of these APIs use the same parser, canonical Greek document, conversion
options, and encoders.

For a same-format conversion, `reencode()` avoids repeating the format:

```ts
reencode("λόγος", "greek", {
  orthography: { finalSigma: "medial" },
});
// λόγοσ
```

## Use a preset

Presets collect coherent options for a published convention or a practical
interchange profile:

```ts
convert("Βίος Μπάλα", "greek", "transliteration", {
  preset: "ala-lc-modern",
});
// Vios Bala
```

Available presets:

| Preset | Target format | Intended use |
| --- | --- | --- |
| `ala-lc-ancient` | `transliteration` | Library romanization of Ancient and pre-1454 Medieval Greek |
| `ala-lc-modern` | `transliteration` | Library romanization of post-1453 Modern Greek, including supported contextual digraphs |
| `bnf-core` | `transliteration` | BnF/ISO-based romanization core for Ancient Greek cataloguing |
| `iso-843-type-1` | `transliteration` | ISO 843 Type 1 character transliteration for Ancient and Modern Greek |
| `perseus` | `beta-code` | Lowercase-ASCII subset for Perseus and Morpheus interchange |
| `sbl-academic` | `transliteration` | Scholarly Biblical-studies output retaining scientific diacritics |
| `sbl-general` | `transliteration` | Reader-facing Biblical-studies output omitting most scholarly diacritics |
| `tlg-core` | `beta-code` | Uppercase-ASCII TLG core for polytonic Greek interchange |

Custom options override only the corresponding fields of a preset:

```ts
convert("Βίος Μπάλα", "greek", "transliteration", {
  preset: "ala-lc-modern",
  orthography: { beta: "b" },
});
// Bios Bala
```

The priority is: library defaults, then preset options, then custom options.
See the complete [preset configuration table](https://github.com/defense-humanites/greek-conversion/blob/main/docs/presets.md), including the
precise scope and known limitations of each preset.

For repeated conversion with scope enforcement, bind the preset to a
converter:

```ts
const perseus = createConverter({ preset: "perseus" });
const result = perseus.convertDetailed("ἄνθρωπος ϝ", "greek", "beta-code");

result.output; // a)/nqrwpos ϝ
result.diagnostics[0].code; // out-of-scope-character
```

Out-of-scope characters are preserved rather than silently converted. The
dedicated [character-extension documentation](https://github.com/defense-humanites/greek-conversion/blob/main/docs/character-extensions.md)
explains contextual ALA-LC numerals, custom extensions, and further
restrictions.

### Inspect effective defaults

Every effective default is available as an immutable, IDE-friendly object:

```ts
import {
  DEFAULT_CONVERSION_OPTIONS,
  resolveConversionOptions,
} from "@humanities/greek-conversion";

DEFAULT_CONVERSION_OPTIONS.orthography.longVowels; // "macron"
DEFAULT_CONVERSION_OPTIONS.unicode.composition; // "composed"

resolveConversionOptions({ preset: "sbl-general" });
// A complete ResolvedConversionOptions object
```

`ConversionOptions` remains the partial input type. `ResolvedConversionOptions`
contains every effective field after applying defaults, a preset, and custom
overrides.

## Common recipes

### Produce monotonic Greek

```ts
convert("Ἄνθρωπὸς ᾆ", "greek", "greek", {
  orthography: { accentuation: "monotonic" },
});
// Άνθρωπός ά
```

The transformation is mechanical: it does not use a lexicon or infer missing
breathings. Polytonic Greek remains the default.

### Remove all or selected diacritics

Use the shortcut to remove marks. In transliteration, it retains the `h` of a
rough breathing (`ὁδός → hodos`); in Greek and Beta Code, it removes the
breathing. To suppress the transliterated `h` explicitly, set
`diacritics: { roughBreathing: "remove" }`.

```ts
convert("ἄνθρωπος ᾆ ῑ", "greek", "transliteration", {
  removeDiacritics: true,
});
// anthrōpos a i
```

Or select semantic classes independently:

```ts
convert("ἄνθρωπος ἅγιος κἀγώ", "greek", "transliteration", {
  diacritics: {
    accents: "remove",
    smoothBreathing: "remove",
    roughBreathing: "preserve",
    coronis: "remove",
  },
});
// anthrōpos hagios kagō
```

`removeDiacritics()` exposes the same operation as a standalone helper.
Structural distinctions such as `η → ē` and `ω → ō` are retained.
Transliteration uses ASCII `-` by default; set
`orthography: { hyphen: "typographic" }` to output `‐` instead.

### Fold Greek letter variants

Use `foldGreekVariants()` to obtain a uniform Greek spelling for comparison:

```ts
import { foldGreekVariants } from "@humanities/greek-conversion";

foldGreekVariants("ϐίος λόγος ϲῶμα");
// βίοσ λόγοσ σῶμα
```

The helper maps medial beta `ϐ` to `β`, lunate sigma `ϲ` to `σ`, and final
sigma `ς` to medial `σ`. It parses and re-encodes Greek rather than relying on
`NFKC`, so the same semantic rules and numeral exceptions apply as during a
conversion. Diacritics and case are preserved unless their independent options
are supplied:

```ts
foldGreekVariants("ϐΊΟΣ", {
  orthography: { letterCase: "lowercase" },
  removeDiacritics: true,
});
// βιοσ
```

### Normalize case and whitespace

```ts
convert("  ΦΙΛΗΒΟΣ\nΗΔΟΝΗ  ", "greek", "transliteration", {
  orthography: {
    letterCase: "lowercase",
    whitespace: "collapse",
  },
});
// philēbos ēdonē
```

Case values are `"preserve"`, `"lowercase"`, `"uppercase"`, and `"title"`.
Whitespace can be `"preserve"` or `"collapse"`; the latter trims the output
and replaces each Unicode whitespace run with one ASCII space.

### Select transliteration spellings

```ts
convert("βηξφχυ", "greek", "transliteration", {
  orthography: {
    beta: "v",
    eta: "ī",
    xi: "ks",
    phi: "f",
    chi: "kh",
    upsilon: "y",
  },
});
// vīksfkhy
```

Other policies cover long-vowel spelling, nasal gamma, modern digraphs,
systematic `rh`, double rho, medial beta, sigma style, contextual or uniform
final sigma, coronis, and alphabetic numerals. The selected spellings are
recognized on transliteration input when the same options are supplied.

Lunate sigma has two independent controls. `sigma: "standard" | "lunate" |
"preserve"` selects its Greek and Beta Code glyph; `"preserve"` is useful for
mixed texts because the parsers remember whether each source sigma was lunate.
`lunateSigma: "s" | "c"` selects the transliteration of only those provenanced
lunate sigma graphemes:

```ts
const options = {
  orthography: { sigma: "preserve", lunateSigma: "c" },
} as const;

convert("σϲς", "greek", "transliteration", options); // "scs"
convert("scs", "transliteration", "greek", options); // "σϲς"
```

A global `sigma: "lunate"` policy remains stylistic: it does not make every
transliterated `s` become `c`. The `bnf-core` preset does not select this option.

`longVowels` accepts `"macron"` (the default) or `"circumflex"`. It controls
only the structural representation of inherently long eta and omega. An
explicit macron alongside a circumflex, such as in `ê̄`, is treated separately
as a philological mark and is reproduced without changing the identified
letter.

`archaicKoppa` selects `"k-dot-below"` (the default, rendered `ḳ`) or `"q"`
for transliteration. The `bnf-core` preset uses `"q"` for both koppa forms, so
that distinction is intentionally lost on reverse conversion.

### Control Greek Unicode output

```ts
import {
  formatGreekUnicode,
  toUnicodeCodePoints,
} from "@humanities/greek-conversion";

formatGreekUnicode("ά;·", {
  acute: "oxia",
  questionMark: "greek",
  anoTeleia: "greek",
});
// ά;·

toUnicodeCodePoints("ά;😀");
// ["U+1F71", "U+037E", "U+1F600"]
```

Greek output supports composed or decomposed text, tonos or oxia, and explicit
Greek punctuation scalars. These are representation choices, not linguistic
transformations. See [Greek accentuation and Unicode output](https://github.com/defense-humanites/greek-conversion/blob/main/docs/greek-unicode.md).

## Detect information loss

Some conversions necessarily merge distinctions. `convertDetailed()` returns
the output and diagnostics from the same conversion request:

```ts
const result = convertDetailed("ἄνθρωπος", "greek", "greek", {
  orthography: { accentuation: "monotonic" },
});

result.output; // άνθρωπος
result.lossy; // true
result.losses;
// [{ code: "removed-diacritic", ... }]
```

Loss is evaluated on the canonical document. Unicode composition and
tonos/oxia are therefore not reported as destructive. Lunate-sigma provenance
is the exception among glyph distinctions: removing a known lunate form
reports `removed-glyph-variant`. Examples of other actual loss include removing
diacritics, decimalizing alphabetic numerals, and using context-dependent
spellings that merge distinct source sequences.

See the [conversion-analysis contract](https://github.com/defense-humanites/greek-conversion/blob/main/docs/conversion-analysis.md) and the
[information-loss matrix](https://github.com/defense-humanites/greek-conversion/blob/main/docs/information-loss.md).

## Extend or restrict the character inventory

Create an isolated `Converter` when an application needs additional spellings,
opaque custom characters, or a restricted repertoire:

```ts
import { createConverter } from "@humanities/greek-conversion";

const converter = createConverter({
  aliases: [{
    letter: "theta",
    format: "transliteration",
    spellings: ["þ"],
  }],
  exclude: ["stigma", "koppa", "sampi"],
});

converter.convert("þeos", "transliteration", "greek"); // θεος
```

Aliases inherit every rule of their built-in letter. New character definitions
only guarantee direct format mapping and case; they do not silently join Greek
diphthong, contraction, numeral, or diacritic rules. Excluded characters become
source-format literals, and `converter.convertDetailed()`
reports them separately from information loss. See [character extensions and
repertoires](https://github.com/defense-humanites/greek-conversion/blob/main/docs/character-extensions.md).

## Guarantees and scope

- Every format pair is supported in both directions.
- For fixed formats and options, canonical output is stable and idempotent.
- Unknown literals are preserved.
- Greek punctuation and contextual Greek rules are handled semantically where
  the canonical document contains enough information.
- The engine does not infer a missing rough breathing and does not perform
  transformations that intrinsically require lexical or morphological
  knowledge.
- A reverse conversion is not necessarily lossless; use `convertDetailed()`
  when that distinction matters.

The engine currently covers polytonic and monotonic accentuation, contextual
diphthongs and breathings, crasis and coronis provenance, elision aspiration,
sigma and beta variants, archaic letters, Greek punctuation, and marked
alphabetic numerals. Presets are limited to the rules and characters implemented
by the engine today.

## Advanced API

Applications can work directly with the experimental canonical representation:

```ts
import {
  encode,
  parse,
  validateDocument,
} from "@humanities/greek-conversion/document";

const document = parse("a)/nqrwpos", "beta-code");
const diagnostics = validateDocument(document);
const output = encode(document, "greek");
```

Validation deliberately remains a separate diagnostic step instead of changing
the contract of `convert()`. The `./document` entry point may still evolve
during the `1.0.0` prerelease series. See [validation](https://github.com/defense-humanites/greek-conversion/blob/main/docs/validation.md).

## Documentation

| Topic | Document |
| --- | --- |
| Presets and exact option values | [Presets](https://github.com/defense-humanites/greek-conversion/blob/main/docs/presets.md) |
| Greek orthography and Unicode | [Greek Unicode](https://github.com/defense-humanites/greek-conversion/blob/main/docs/greek-unicode.md) |
| Detailed conversion results | [Conversion analysis](https://github.com/defense-humanites/greek-conversion/blob/main/docs/conversion-analysis.md) |
| Loss by format pair | [Information loss](https://github.com/defense-humanites/greek-conversion/blob/main/docs/information-loss.md) |
| Canonical document validation | [Validation](https://github.com/defense-humanites/greek-conversion/blob/main/docs/validation.md) |
| Character extensions and repertoires | [Character extensions](https://github.com/defense-humanites/greek-conversion/blob/main/docs/character-extensions.md) |
| Preset character repertoire audit | [Preset repertoire audit](https://github.com/defense-humanites/greek-conversion/blob/main/docs/preset-repertoire-audit.md) |

## Development

```sh
deno task check
deno task test
```

## License

Copyright (C) 2021-2026  Antoine Boquet

`greek-conversion` is licensed under the
[GNU Affero General Public License v3.0 or later](https://github.com/defense-humanites/greek-conversion/blob/main/LICENSE).
