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
  changes nothing, but for the text of another format that a source may hold
  ([below](#characters-of-another-format)), a letter written as a TLG
  code before a digit in Beta Code (see
  [Information loss](information-loss.md#canonical-spelling-and-unicode)),
  and letters that a converter keeps out of its scope, in the cases that
  [Character extensions](character-extensions.md#restricting-the-repertoire)
  lists, frequent between Beta Code and transliteration.
- **A lossless conversion is reversible.** When `convertDetailed()` reports
  `lossy: false`, converting the output back with the same options gives the
  same canonical text, but for the marks of a letter that a converter keeps
  in its source format (see
  [Character extensions](character-extensions.md#restricting-the-repertoire)).
  After a restyle, swap `source` and the other options.
  The [information-loss contract](information-loss.md) lists what each format
  pair and option loses, and the
  [conversion-analysis contract](conversion-analysis.md) describes the report.
- **Unknown characters are preserved.** A character the library does not
  recognize, an unrecognized combining mark included, is copied through as a
  literal, never dropped.
- **The default transliteration is the library's own.** It uses the letters
  of the SBL Handbook of Style (§5.3), which the `sbl-general` preset writes,
  and keeps the accents, iota subscript, diaeresis, and quantity marks that
  the Handbook leaves out. No preset names it, since no published convention
  defines it.
- **Options are checked.** A misspelled option never falls back to a default.
  An unknown option key, value, or preset, or two values that cannot be
  combined, throws an `OptionError`. It is a `RangeError` that names the option
  (`path`), what it received (`received`), what it accepts (`accepted`), and,
  for a key or value that a release candidate knew, its current spelling
  (`replacement`), an aid that a minor release after `1.0.0` may stop giving
  (see the [stability policy](stability.md#diagnostics-and-errors)). An
  unknown format throws a plain `RangeError`, an option
  group of the wrong type or an input that is not a string a `TypeError`. The
  functions of the `core` entry point take readers, writers, and prepared
  options, which the presets entry point exports and `prepareOptions()`
  returns: given anything else, the name of a format or an object of options
  included, they throw a `TypeError`. The functions of the main and document
  entry points take prepared options in place of options. A copy made by
  spreading them, or prepared options given as `source`, as a group, or to a
  converter, throw a `TypeError`, which names the preset to write instead.
  `FORMATS` and `CONVERSION_OPTION_VALUES` list everything that is accepted.
  Every option value is plain ASCII. The configuration of `createConverter()`
  is checked the same way: an unknown key, of the configuration, of an alias,
  or of a custom character, throws an `OptionError`, as does a value outside a
  known set (an out-of-scope behavior, the letter of an alias, a character
  identifier).

The first three properties are checked for every preset and every format pair
on each change, over a corpus of difficult forms
(`tests/invariants_corpus_test.ts`).

## Text that mixes Greek with another language

By default, the library converts the whole string it is given. In a text
that mixes Greek with another language, the punctuation shared by both is
converted as Greek (`;` becomes `?` in transliteration). The letters of the
other language are kept as they are, but reported as `unrepresented-literal`
losses when the target format would read them as Greek, and Beta Code, whose
letters are Latin, writes them in the case of its own letters, as they read
back:

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

Filter the losses by `code` to keep those about the Greek, or convert the
Greek passages only. The same code reports the few literals of the Greek
itself that a target cannot keep, such as a parenthesis before a digit in
Beta Code (see
[Information loss](information-loss.md#canonical-spelling-and-unicode)).

A letter that a reader keeps as text next to Greek letters is a letter of
their word, as is a letter that the transliteration reader does not read: a
digitized text that writes a Latin `K` for a Greek one keeps its word whole.
A sigma before such a letter is medial, title case capitalizes the first
letter of the word only (`Kαζάρμα`), monotonic accentuation keeps the accent
of a word whose syllables it cannot count, a monosyllable included (`Kαί`),
and a breathing on a vowel after such a letter is a coronis (`Oἰκία`, with
a Latin `O`). A letter of another script, such as a Chinese character, is
no letter of the Greek word that it touches.

### The Greek passages of a text

`text.scope: "greek"` converts the Greek passages of a Greek source, and
copies the rest of the text as it is, code unit by code unit. The rules of
the conversion see the whole text, as they would in a conversion of the
whole text: before the period of `Θ.`, the capital is an initial.

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const passages = convertDetailed(
  "Voir ϐίϐλος ; cf. ψυχή.",
  "greek",
  "transliteration",
  { text: { scope: "greek" } },
);

passages.output; // → Voir bíblos ; cf. psychḗ.
passages.losses.map((loss) => loss.code);
// → ["removed-glyph-variant","removed-glyph-variant"]
```

The library does not guess what belongs to the Greek, and converts only what
does without doubt:

- **Greek letters and their marks**, and the signs that only Greek uses, by
  their code points: the Greek question mark (U+037E), the ano teleia
  (U+0387), the koronis (U+1FBD), the spacing breathings and accents, and the
  keraiai (U+0374 and U+0375), with U+02B9, which normalization makes of the
  right keraia, after Greek letters.
- **The punctuation that Greek shares** with other scripts is copied, glued
  to a Greek word or not: `;`, `?`, the middle dot `·` (U+00B7), `:`, `'`, `’`,
  and `-`. In `see λόγος; also`, `;` is English; in `λογο·τέχνης`, the
  middle dot separates the elements of a word, as the Bailly writes them. A
  Greek passage typed with the shared signs is converted as a whole, without
  the option, by the application that knows it is Greek. Normalization
  turns the Greek question mark and ano teleia into the shared signs: in a
  text normalized before the conversion, they are copied, which leaves the
  output incomplete, not wrong.
- **The options apply to the passages only**: letter case, the Unicode form
  of Greek output, its Greek punctuation scalars. `text.whitespace` has
  nothing to collapse, since whitespace is never Greek.

The passages are converted as their letters are, wherever they are: a Greek
letter in another language (`β-carotène`, `π`, a siglum) is converted too.
`convertDetailed()` reads back the Greek passages of the output, and reports
no loss for the text copied, whose spans in the output are those in the
input, moved. Only Greek is read so: in Beta Code and transliteration, Latin
letters are the Greek text, and `text.scope: "greek"` throws an
`OptionError` for another source format. A converter (`createConverter()`)
does not convert the passages of a text, and throws one too.

### Characters of another format

Each reader reads its own format, and keeps the rest as literals: Greek
characters in Beta Code or transliteration, and in Beta Code the Unicode
combining marks, which are not Beta Code. A writer copies those literals,
and a reader of the target format may then read them: `ϗ` in a Beta Code
source is a literal, which Greek output copies, and which Greek reads as
`και`, as it reads a middle dot as the ano teleia (see
[Punctuation and numerals](punctuation-and-numerals.md#consequences)). Converting such output again may change it, and `convertDetailed()`
reports the loss of the literal (`unrepresented-literal`). Type `#1532` in
Beta Code, and `kai` in transliteration, or the accent's own code (`a/`)
rather than U+0301. So may a combining mark that a reader keeps as a
literal, after a sign that it reads as a mark: in transliteration, the
acute after the coronis of `YO᾽́A` joins the omicron once the coronis is
removed, here from a word in capitals (`ΥΌΑ`, then `ΥΟΑ`). The breathings and accents that older editions print
before a capital, as signs of their own (U+1FBF, U+1FFE, and their compounds
with an accent), and the tonos that typewriters and ISO 8859-7 put before
one (U+0384), are the exception: every reader reads them, as the capital's
at the start of a word (`῾Ρωμαῖοι` is `Ῥωμαῖοι`, `΄Ελληνας` `Έλληνας`).

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
- **It does not bound normalization.** Every conversion normalizes the text
  (`String.prototype.normalize()`), whose time grows with the square of the
  number of combining marks on one letter: thousands of them, which no text
  has, take seconds. Limit the length of untrusted input accordingly.

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
