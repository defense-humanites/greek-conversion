# Migrating from 0.14.x

The `1.0.0` release is a rewrite. It does not provide compatibility aliases for
the `0.14.x` API.

## Installation

The release candidate `1.0.0-rc.6` is published on JSR, and on npm under the
`next` distribution tag; the stable `1.0.0` will follow with the same content
unless a problem is found:

```sh
deno add jsr:@humanities/greek-conversion@1.0.0-rc.6
npm install @humanities/greek-conversion@next
```

The package is ESM-only.

## Updating from `1.0.0-rc.5`

`1.0.0-rc.6` settles the public API for `1.0.0`. It removes the convenience
functions, regroups the options by what they describe, replaces the
`removeDiacritics` flag, aligns the default transliteration on the SBL academic
style, and types option errors. Every old key, value, and flag throws an
`OptionError` whose message and `replacement` name the new form.

### Convenience functions

Ten functions are removed; each was one call to `convert()` or `reencode()` with
fixed arguments. `convert`, `convertDetailed`, `reencode`, and `createConverter`
remain.

| Before                                                         | After                                                                                                                                               |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `greekToBetaCode(input, options)`                              | `convert(input, "greek", "beta-code", options)`                                                                                                     |
| `greekToTransliteration(input, options)`                       | `convert(input, "greek", "transliteration", options)`                                                                                               |
| `betaCodeToGreek(input, options)`                              | `convert(input, "beta-code", "greek", options)`                                                                                                     |
| `betaCodeToTransliteration(input, options)`                    | `convert(input, "beta-code", "transliteration", options)`                                                                                           |
| `transliterationToGreek(input, options)`                       | `convert(input, "transliteration", "greek", options)`                                                                                               |
| `transliterationToBetaCode(input, options)`                    | `convert(input, "transliteration", "beta-code", options)`                                                                                           |
| `removeDiacritics(input, "transliteration", options)`          | `reencode(input, "transliteration", { ...options, diacritics: { all: "remove", roughBreathing: "preserve" } })` (exact form below)                  |
| `removeDiacritics(input, format, options)`, Greek or Beta Code | `reencode(input, format, { ...options, diacritics: { all: "remove" }, greek: { sigma: "preserve", finalSigma: "preserve", ...options.greek } })`    |
| `foldGreekVariants(input, options)`                            | `reencode(input, "greek", { ...options, greek: { ...options.greek, medialBeta: "standard", sigma: "standard", finalSigma: "medial" } })`            |
| `formatGreekUnicode(input, unicode)`                           | `reencode(input, "greek", { greek: unicode })`                                                                                                      |
| `toUnicodeCodePoints(input)`                                   | `Array.from(input, (c) => "U+" + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"))`                                                    |

### Option groups

The `orthography` and `unicode` groups are replaced by four groups named after
what they describe; `diacritics` is unchanged. Each key keeps its name and
values, except the two Beta Code keys, which lose their prefix.

| Before                                                                                                                                                                                                                                    | After                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `orthography.beta`, `eta`, `xi`, `phi`, `chi`, `upsilon`, `muPi`, `nuTau`, `rho`, `nasalGamma`, `longVowels`, `circumflexAccent`, `quantity`, `smoothBreathing`, `coronis`, `hyphen`, `keraia`, `enotikon`, `lunateSigma`, `archaicKoppa` | `transliteration.<same key>` |
| `orthography.sigma`, `finalSigma`, `medialBeta`, `doubleRho`, `dentalSigma`, `accentuation`                                                                                                                                               | `greek.<same key>`           |
| `unicode.composition`, `acute`, `questionMark`, `anoTeleia`                                                                                                                                                                               | `greek.<same key>`           |
| `orthography.betaCodeCase`                                                                                                                                                                                                                | `betaCode.case`              |
| `orthography.betaCodeYot`                                                                                                                                                                                                                 | `betaCode.yot`               |
| `orthography.letterCase`, `whitespace`, `numerals`                                                                                                                                                                                        | `text.<same key>`            |

`ResolvedConversionOptions`, `DEFAULT_CONVERSION_OPTIONS`, and
`CONVERSION_OPTION_VALUES` have the same five groups (`transliteration`,
`greek`, `betaCode`, `text`, `diacritics`). The types `OrthographyOptions` and
`GreekUnicodeOptions` are replaced by `TransliterationOptions`, `GreekOptions`,
`BetaCodeOptions`, and `TextOptions`. Output is unchanged for every regrouped
option.

### `removeDiacritics`

The flag is replaced by `diacritics.all`, which sets every class and yields to a
class named alongside it. The flag did three things at once; the new form does
one, and the other two are options you set when you want them:

| What the flag did                                                  | After                                                                                                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Removed every class                                                | `diacritics: { all: "remove" }`                                                                                                           |
| Kept the rough breathing's `h` in transliteration                  | `diacritics: { all: "remove", roughBreathing: "preserve" }` — the class is now kept in every format, as a mark in Greek and Beta Code too |
| Forced `sigma: "preserve"` and `finalSigma: "preserve"` unless set | `greek: { sigma: "preserve", finalSigma: "preserve" }`, to change nothing but the marks in Greek                                          |

The helper `removeDiacritics(input, format, options)` read the input with
`options` and wrote it with the flag. It kept the `h` only in transliteration,
so its recipe depends on the format, and it removed every class whatever
`options.diacritics` said, the `h` too when `roughBreathing` was `"remove"`; the
sigma policies it forced yield to the ones in `options.greek`, hence the spread
after them. In transliteration, the exact equivalent reads and writes in two
steps, as the helper did:

```ts
import { encode, parse } from "@humanities/greek-conversion/document";

const roughBreathing = options.diacritics?.roughBreathing === "remove"
  ? "remove"
  : "preserve";
encode(parse(input, "transliteration", options), "transliteration", {
  ...options,
  diacritics: { all: "remove", roughBreathing },
});
```

The one-call recipe in the table reads with `all: "remove"` as well: it keeps
the `h` even when `options` removed the rough breathing, and infers no smooth
breathing while reading, which in rare texts changes how a `y` after a vowel is
read.

`diacritics.all` is expanded where it is written: in the caller's options it
overrides every class a preset set, and a class named with it is the exception.
So `removeDiacritics: false` is migrated by dropping the key, not by writing
`all: "preserve"`, which would also cancel the classes a preset removes. The
`removeDiacritics` field of `ResolvedConversionOptions` is gone.

### Default transliteration

Without a preset, transliteration now follows the SBL academic style: the
default of `transliteration.upsilon` is `"y-with-diphthong-u"` (`y`, but `u` in
a diphthong) instead of `"u"`, so `ψυχή` is written `psychḗ` rather than
`psuchḗ`, `ὑΐδιον` `hyḯdion`, and `ῠ` `y̆`. The `sbl-academic` preset writes
exactly what the defaults write; `perseus` and `tlg-core`, which set no
transliteration option, follow the new default. Reading follows: `u` and `y` are
both read as upsilon, and a text written with the old default reads back as
before, but a `y` after a vowel is now read as a hiatus, as under `sbl-academic`
(`ay` → `ἀυ` rather than `αὐ`). To keep the old spelling and reading, set
`transliteration: { upsilon: "u" }`.

### Errors

Option errors are instances of `OptionError`, a `RangeError` with `path`,
`received`, `accepted`, and, for a key or value of an earlier release candidate,
`replacement`. Code that caught `RangeError` keeps working; an unknown format
still throws a plain `RangeError`, and an option group of the wrong type a
`TypeError`.

### Types and classes

| Before                                                   | After                                                                                                                 |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `Converter` (class)                                      | `Converter` is exported as a type; create one with `createConverter()`. `instanceof Converter` is no longer available |
| `OutOfScopeBehavior` (preset metadata)                   | `PresetOutOfScopeBehavior`                                                                                            |
| `CharacterScopeDiagnostic.index` in the document as read | in the document as the conversion prepared it, like `losses.index` and `spans` (below)                                |

`CharacterScopeDiagnostic.index`, in a converter's `convertDetailed()` result
and in `CharacterScopeError`, now indexes the source document as the conversion
prepared it (the document that `losses.index` and the new `spans` index), where
an out-of-scope character preserved literally may occupy several tokens; it
indexed the document as read, where every character was one token. The two
differ only after a preserved character whose spelling has several characters
(`a)` in Beta Code, `th` in transliteration, a custom form): such a character is
reported at its first literal, and the indices of the diagnostics that follow it
grow by the number of extra literals. Use the new `offset` and `length` to
locate a diagnostic in the input.

## Updating from `1.0.0-rc.4`

The sections from here to
[Formats and conversion functions](#formats-and-conversion-functions) name
options as they were at the time: `1.0.0-rc.6` moved the `orthography` and
`unicode` keys to the groups listed under [Option groups](#option-groups), so
`orthography.eta` below is `transliteration.eta` today.

`orthography.eta` now names only the Latin letter of eta; the mark comes from
`orthography.longVowels`, as it does for omega:

| Before                        | After                  |
| ----------------------------- | ---------------------- |
| `orthography.eta: "e-macron"` | `orthography.eta: "e"` |
| `orthography.eta: "i-macron"` | `orthography.eta: "i"` |

Output is unchanged, with one exception: `eta: "i"` with
`longVowels: "circumflex"` writes `î`, where `"i-macron"` kept `ī`. The old
values throw a `RangeError` that names the new one.

`longVowels: "circumflex"` can no longer be combined with
`circumflexAccent: "circumflex"`, whether set directly or by a preset
(`bnf-core`, `iso-843-type-1`): `ῆ` was written `ê̂` and read back as `η` without
its accent. The combination throws a `RangeError`; keep one of the two
circumflexes, for instance `circumflexAccent: "tilde"`.

`orthography.modernDigraphs`, whose values each bundled several rules, is
replaced by one option per letter pair: `muPi`, `nuTau`, and a new value of
`nasalGamma`. The `ala-lc-modern` preset is unchanged in output. Without a
preset:

| Before                       | After                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| `modernDigraphs: "preserve"` | (default: `muPi: "mp"`, `nuTau: "nt"`)                                                  |
| `modernDigraphs: "phonetic"` | `muPi: "b-initial"`, `nuTau: "d-initial"`                                               |
| `modernDigraphs: "ala-lc"`   | `muPi: "b-initial"`, `nuTau: "d-underline-initial"`, `nasalGamma: "nasal-medial-kappa"` |

The old key throws a `RangeError` that names its replacements. One behavior
changes: `γκ` under `ala-lc-modern` follows `nasalGamma`, so overriding
`nasalGamma` with `"literal"` now writes `γκ` as `gk` everywhere, where
`modernDigraphs: "ala-lc"` kept its own rule.

## Updating from `1.0.0-rc.1`

`Grapheme.diacritics` in the `./document` entry point is now a
`ReadonlySet<Diacritic>`, shared between graphemes and read-only at run time.
Code that modified it in place now fails to type-check and throws a `TypeError`;
assign a new set instead:

```ts
// Before
grapheme.diacritics.delete("acute");

// After
grapheme.diacritics = new Set(
  [...grapheme.diacritics].filter((mark) => mark !== "acute"),
);
```

Copying the sets when deriving two versions of one document is no longer
necessary. Code that only reads the sets, or that only uses the string
conversion functions, is unaffected.

## Updating from `1.0.0-beta.9`

Three option identifiers and seven exported type names change in `1.0.0-rc.1`,
and therefore in `1.0.0`; the behavior behind them does not:

| Before                                | After                                        |
| ------------------------------------- | -------------------------------------------- |
| `orthography.quantityTransliteration` | `orthography.quantity`                       |
| `orthography.yotBetaCode`             | `orthography.betaCodeYot`                    |
| `orthography.eta: "ē"` / `"ī"`        | `orthography.eta: "e-macron"` / `"i-macron"` |
| `TransliterationHyphen`               | `HyphenTransliteration`                      |
| `CoronisOrthography`                  | `CoronisTransliteration`                     |
| `UpsilonOrthography`                  | `UpsilonTransliteration`                     |
| `LongVowelOrthography`                | `LongVowelTransliteration`                   |
| `NasalGammaOrthography`               | `NasalGammaTransliteration`                  |
| `ModernDigraphOrthography`            | `ModernDigraphTransliteration`               |
| `YotBetaCode`                         | `BetaCodeYot`                                |

Options are now validated strictly, so an old identifier throws a `RangeError`
naming it instead of being ignored.

Apart from the renames above, update the dependency version. The release
candidate uses the npm `next` distribution tag; the stable release will use
`latest`. Conversion output changes are listed in the changelog under _Fixed_
and _Changed_. The published preset scopes and the documented limits of the
advanced `./document` API still apply.

## Updating from `1.0.0-beta.8`

No API rename is required. The `./document` entry point now has a documented
supported contract for ownership, validation, and option reuse. Keep the
original parsed document when deriving a lossy orthographic view, and copy
nested diacritic sets when making independent edits.

`applyGreekOrthography()` now honors preset options and returns detached tokens.
`validateDocument()` reports malformed manually modified tokens rather than
throwing during contextual checks. An incomplete uppercase Beta Code prefix is
preserved as literal input instead of disappearing. If an application depended
on any of those earlier behaviors, review its output.

The separate [playground](https://defense-humanites.github.io/greek-conversion/)
can be used to inspect presets, conversion losses, scope diagnostics, and
canonical documents in a browser. Its site files are not part of either
published package.

## Updating from `1.0.0-beta.7`

Both ALA-LC presets now render the documented `στʹ` as decimal `6` and
prefix-marked thousands such as `͵α` and `͵αα` as `1000` and `1001`. This
extends the existing decimal numeral policy, which also applies to Greek and
Beta Code output when either preset is selected. To keep alphabetic numeral
marks, override `orthography.numerals` with `"alphabetic"`.

`bnf-core` now uses lowercase Latin `c̄` and `s̄` for marked uppercase stigma and
sampi numerals, preserves its U+2010 hyphen in transliteration, and parses `ch`
as chi ahead of standalone `c` as Byzantine sigma. The ISO 843 Type 1 preset
transliterates the enotikon `‿` as `-`; the new
`orthography.enotikon: "preserve"` override retains the Greek sign in Latin
output. That `-` cannot unambiguously recover the enotikon, and
`convertDetailed()` reports the loss.

The [ALA-LC corpus](docs/ala-lc-conformance-corpus.md) and
[BnF/ISO corpus](docs/preset-conformance-corpus.md) describe the covered
examples and remaining limits.

## Updating from `1.0.0-beta.6`

The `1.0.0-beta.7` package uses the MIT License. Earlier published releases
retain their original AGPL-3.0-or-later license.

`bnf-core` now preserves known smooth breathings on Latin letters, uses a
combining circumflex instead of a tilde, and omits explicit macrons and breves
in transliteration. `iso-843-type-1` now prefixes an initial smooth breathing
with an apostrophe. ISO 843 retains distinct Latin punctuation: Greek question
mark becomes `?`, and ano teleia becomes `;`.

The new orthography fields `smoothBreathing`, `circumflexAccent`, and
`quantityTransliteration` (now `quantity`) can override these behaviors. Strict
bound converters still reject only recognized out-of-scope characters and known
undefined or unresolved preset mappings; inspect `convertDetailed().losses` for
in-scope distinctions lost during conversion. See the
[behavior audit](docs/preset-behavior-audit.md).

## Updating from `1.0.0-beta.4`

The optional `GreekText` facade has been removed. Use `convert()` or
`convertDetailed()` for ordinary calls. To reuse one analysis across several
representations, use `parse()` and `encode()` from the advanced
`@humanities/greek-conversion/document` entry point, as shown under
[reusable parsed documents](#reusable-parsed-documents).

## Updating from `1.0.0-beta.3`

This release is additive: the ordinary conversion functions retain their
`beta.3` behavior. Use `createConverter()` only when an application needs to
extend or restrict the recognized character inventory.

Aliases of built-in letters inherit the complete conversion behavior of the
selected letter. Truly new characters are opaque and guarantee only the direct
forms declared for Greek, Beta Code, and transliteration; they do not acquire
vowel, diacritic, contextual, or numeral rules automatically.

`repertoire` defines an exact character allow-list and `exclude` removes
characters from it. Out-of-scope characters become source-format literals
instead of being discarded. `converter.convertDetailed()` reports them through
the separate `diagnostics` array without setting `lossy` solely because of
literal preservation.

## Updating from `1.0.0-beta.2`

Beta Code ASCII letter case no longer represents Greek letter case. Only a
preceding `*` marks an uppercase Greek grapheme, so uppercase ASCII input such
as `A)/NQRWPOS` now converts to lowercase `ἄνθρωπος`. Canonical output uses
lowercase ASCII by default and places uppercase diacritics between `*` and the
letter, following TLG ordering.

Use `orthography.betaCodeCase: "uppercase"` when an integration requires
uppercase ASCII without changing the represented Greek case. The `tlg-core` and
`perseus` presets select uppercase and lowercase ASCII respectively.

## Formats and conversion functions

Replace the `KeyType` runtime enum with literal format names:

```ts
// 0.14.x
toTransliteration(input, KeyType.GREEK);

// 1.0
convert(input, "greek", "transliteration");
```

| 0.14.x                    | 1.0                                     |
| ------------------------- | --------------------------------------- |
| `KeyType.GREEK`           | `"greek"`                               |
| `KeyType.BETA_CODE`       | `"beta-code"`                           |
| `KeyType.TLG_BETA_CODE`   | `"beta-code"` with `preset: "tlg-core"` |
| `KeyType.TRANSLITERATION` | `"transliteration"`                     |
| `toGreek()`               | `convert(..., ..., "greek")`            |
| `toBetaCode()`            | `convert(..., ..., "beta-code")`        |
| `toTransliteration()`     | `convert(..., ..., "transliteration")`  |

## Presets and custom options

Preset identifiers are string literals. A preset and custom overrides now share
one options object instead of an array:

```ts
// 0.14.x
toTransliteration(input, KeyType.GREEK, [
  Preset.ALA_LC,
  { removeDiacritics: false },
]);

// 1.0
convert(input, "greek", "transliteration", {
  preset: "ala-lc-ancient",
  diacritics: { all: "preserve" },
});
```

Custom fields override corresponding preset fields while unrelated preset fields
remain active: here `diacritics.all` keeps every class the preset removes, while
its other options (upsilon, decimal numerals) still apply. See
[docs/presets.md](docs/presets.md) for the exact configuration table.

## Reusable parsed documents

`GreekString` has no stateful replacement. Use the functional API for ordinary
conversions. When several representations must share one analysis, parse once
through the advanced entry point and encode the resulting document:

```ts
import { encode, parse } from "@humanities/greek-conversion/document";

const document = parse(input, "greek", options);
const betaCode = encode(document, "beta-code", options);
const transliteration = encode(document, "transliteration", options);
```

## Canonical-document API

Advanced parsing, validation, transformation, and encoding are isolated in the
supported `./document` entry point:

```ts
import {
  encode,
  parse,
  validateDocument,
} from "@humanities/greek-conversion/document";
```

Its ownership, validation, and option boundaries are documented in
[docs/document-api.md](docs/document-api.md).

## Behavioral differences

- Unknown characters are preserved instead of being removed by sanitization.
- Output is canonical and idempotent for fixed formats and options.
- `convertDetailed()` reports losses from the actual input.
- Monotonic conversion is explicit and mechanical.
- Missing rough breathings and transformations requiring lexical or
  morphological knowledge are not inferred.
- TLG and BnF presets cover only the rules and characters implemented by the
  current engine.
