# Guarantees and limits

This document states what every conversion guarantees, what the library
deliberately leaves to the caller, and where each behavior is specified in
detail. The [stability policy](stability.md) states how the version number
protects these behaviors.

## What every conversion guarantees

- **Every format pair converts in both directions.** Greek (`"greek"`), Beta
  Code (`"beta-code"`), and transliteration (`"transliteration"`) are read into
  the same canonical document, letters, case, and diacritics independent of
  any spelling, and written from it. The same rules therefore apply to every
  pair, in either direction.
- **Output is canonical and idempotent.** For fixed formats and options,
  converting the output again with the same options, without `source`,
  changes nothing.
- **A lossless conversion is reversible.** When `convertDetailed()` reports
  `lossy: false`, converting the output back with the same options gives the
  same canonical text. After a restyle, swap `source` and the other options.
  The [information-loss contract](information-loss.md) lists what each format
  pair and option loses, and the
  [conversion-analysis contract](conversion-analysis.md) describes the report.
- **Unknown characters are preserved.** A character the library does not
  recognize, an unrecognized combining mark included, is copied through as a
  literal, never dropped.
- **The default transliteration is the SBL academic style.** The
  `sbl-academic` preset and the defaults write the same text, and change
  together.
- **Options are checked.** A misspelled option never falls back to a default.
  An unknown option key, value, or preset, or two values that cannot be
  combined, throws an `OptionError`. It is a `RangeError` that names the option
  (`path`), what it received (`received`), what it accepts (`accepted`), and,
  for a key or value that an earlier release knew, its current spelling
  (`replacement`). An unknown format throws a plain `RangeError`, an option
  group of the wrong type or an input that is not a string a `TypeError`.
  `FORMATS` and `CONVERSION_OPTION_VALUES` list everything that is accepted.
  Every option value is plain ASCII. The configuration of `createConverter()`
  is checked the same way: an unknown key, of the configuration, of an alias,
  or of a custom character, throws an `OptionError`.

The first three properties are checked for every preset and every format pair
on each change, over a corpus of difficult forms
(`tests/invariants_corpus_test.ts`).

## Text that mixes Greek with another language

The library converts the whole string it is given. In a text that mixes Greek
with another language, the punctuation shared by both is converted as Greek
(`;` becomes `?` in transliteration). The letters of the other language are
kept as they are, but reported as `unrepresented-literal` losses when the
target format would read them as Greek:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const mixed = convertDetailed(
  "Voir λόγος ; cf. ψυχή.",
  "greek",
  "transliteration",
);

mixed.output; // → Voir lógos ? cf. psychḗ.
mixed.lossy; // → true
[...new Set(mixed.losses.map((loss) => loss.code))];
// → ["unrepresented-literal"]
```

Filter the losses by `code` to keep those about the Greek, or extract the Greek
before converting when the punctuation matters. The same code reports the few
literals of the Greek itself that a target cannot keep, such as a parenthesis
before a digit in Beta Code (see
[Information loss](information-loss.md#canonical-spelling-and-unicode)).

## What the library does not do

- **It does not infer what the text does not write.** A missing rough
  breathing, an iota adscript, or anything else that requires a dictionary or
  knowledge of the language is not supplied. The
  [preset behavior audit](preset-behavior-audit.md) lists, for each standard,
  the rules that depend on such knowledge.
- **It does not claim complete conformance to a standard.** Each preset states
  its references, its coverage (`complete`, `partial`, `adapted`, or
  `planned`), and what it does not implement, in the
  [preset reference](presets.md) and at run time (`getPresetMetadata()`).
- **It does not separate languages**, as described above.
- **It does not lay out text.** Letter shapes, uncial ones included, are a
  matter of font, and removing the spaces between words is left to the
  caller.

## What the engine covers

Polytonic and monotonic accentuation, diphthongs, hiatus, breathings in
context, crasis and coronis, elision, letter forms (sigma, beta, and the symbol
forms), archaic letters, Greek punctuation, and marked alphabetic numerals.

## Where each behavior is specified

| Topic                                              | Document                                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Options, functions, and types                      | The API documentation (TSDoc of the exported declarations)                                            |
| Options, their values, defaults, and presets       | [Options](options.md)                                                                                 |
| Presets and their exact options                    | [Presets](presets.md)                                                                                 |
| Loss by format pair and option                     | [Information loss](information-loss.md)                                                               |
| Detailed results, positions, and spans             | [Conversion analysis](conversion-analysis.md)                                                         |
| Accentuation, letter forms, and Unicode output     | [Greek output](greek-unicode.md)                                                                      |
| Punctuation and alphabetic numerals                | [Punctuation and numerals](punctuation-and-numerals.md)                                               |
| Custom characters and repertoires                  | [Character extensions](character-extensions.md)                                                       |
| The canonical document and its validation          | [Document API](document-api.md) and [Validation](validation.md)                                       |
| What the version number protects, and reading rules | [Stability policy](stability.md)                                                                      |
