# Migrating from 0.14.x

The `1.0.0` release is a rewrite. It does not provide compatibility aliases for
the `0.14.x` API.

## Installation

The release candidate `1.0.0-rc.12` is published on JSR, and on npm under the
`next` distribution tag; the stable `1.0.0` will follow with the same content
unless a problem is found:

```sh
npm install @humanities/greek-conversion@next
npx jsr add @humanities/greek-conversion@1.0.0-rc.12
```

The package is ESM-only.

## Updating from `1.0.0-rc.12`

`greek.accentuation: "monotonic"` applies to every format: Beta Code and
transliteration output are monotonic too, where they kept the polytonic marks:
`ὁ ἄνθρωπος` gives `o a/nqrwpos` and `o ánthrōpos` (rc.12: `o( a)/nqrwpos`
and `ho ánthrōpos`). To keep the polytonic marks in these formats, leave the
option out of their conversions. It keeps the accent of a weak pronoun
written with an acute and of a word that elision made a monosyllable
(`ο πατέρας μού είπε`, `δείξ’ το`; rc.12: `μου`, `δειξ’`), and removes the
second accent of a word accented on its last two syllables (`τὸ σῶμά μου`
gives `το σώμα μου`; rc.12: `σώμά`).

Greek output writes words in capitals without accents or breathings, as
Greek usage sets them: `Μάιος` in capitals gives `ΜΑΪΟΣ` (rc.12: `ΜΆΙΟΣ`).
To keep every mark, as rc.12 did, set
`greek: { capitalMarks: "preserve" }`.

A spacing tonos `΄` (U+0384) after the letters of a numeral is read as its
keraia: `Β΄` gives `*b#` in Beta Code and `2` under the ALA-LC presets
(rc.12: `*b΄`, `V΄`). Before a capital vowel, it is the capital's tonos:
`΄Ελληνας` gives `Έλληνας` (rc.12: `΄Ελληνας`).

Under the ISO 843 presets, an apostrophe before the vowel group of a word, or
between a vowel and a letter after a consonant, reads back as a smooth
breathing or a coronis. A text written by rc.12 kept an apostrophe of the
source there as U+2019 (`’Αθήνα` gave `’Athī́na`), which now reads back as
`Ἀθήνα`: convert such a text from its source again, which writes the
apostrophe U+02BC (`ʼAthī́na`), or replace it with U+02BC before reading it.

## Updating from `1.0.0-rc.11`

Nothing changes for code that uses rc.11: the API and the output stay the
same, losses and positions included. The new entry points, `/core`, the
reader and the writer of each format (`/greek`, `/beta-code`,
`/transliteration`), and the presets as prepared options (`/presets`), are
for a web page that bundles a few formats and presets; the guide's page on
smaller bundles says when they are worth it.

## Updating from `1.0.0-rc.10`

The `sbl-academic` preset is removed: the SBL Handbook of Style defines no
academic transliteration of Greek. The defaults write what it wrote, so
remove `preset: "sbl-academic"`, and write `source: {}` for
`source: { preset: "sbl-academic" }`; the old name throws an `OptionError`,
and is no longer a `Preset`.

`sbl-general` writes no diaeresis, as the Handbook provides for none:
`ἀΐδιος` gives `aidios` (rc.10: `aïdios`). Add
`diacritics: { diaeresis: "preserve" }` to keep it.

Beta Code writes many signs with the TLG's codes, which it reads back:
`/` is `%3`, `*` `%2`, `:` `%10`, `†` `%`, `⟨` `[2` (see the reference on
punctuation for the others). Text that rc.10 wrote reads as it did, except
where it has `%` or `_`, which are now the dagger and the dash, or one of
the inputs below that read differently: a `#` code followed by a digit,
`<` and `>` around letters, a TLG bracket code such as `[2`, or a spacing
breathing.

Six kinds of input read differently:

- In Beta Code, every digit after `#` is the number of one TLG code, as
  after `%`: `#12` is kept as text (rc.10: koppa followed by `2`). The codes
  `#`, `#1`, `#2`, `#3`, `#5`, `#22`, and `#401` read as before; the codes
  of signs give the signs (`#532` gives `⸒`, `%` `†`, `_` `—`).
- In Beta Code, `*` before anything but a letter is an asterisk, and what
  follows it is read without it: `*(` is an asterisk and a parenthesis
  (rc.10: one piece of text).
- `ϗ` and `ȣ`, which rc.10 copied, are read as `και` and `ου`, and Beta Code
  `#1532`, `#1531`, and `#1521` as `ϗ`, `Ϗ`, and `Ȣ`. Greek output writes the
  signs again; `greek.ligatures: "standard"` writes the letters. Code that
  reads `glyphVariant` gets their values, `kai-symbol` and `ou-ligature`, and
  `stigma-ligature` under `greek.stigma: "ligature"`: a `switch` over
  `GlyphVariant` needs a case for them, or a default.
- The overline U+0305 is a mark, `overline`: Beta Code reads `<` and `>`
  around letters as one (`<qs>`), and writes `<` and `>` signs `#18` and
  `#15`. A `switch` over `Diacritic` needs a case for it, or a default, and
  `diacritics.overline: "remove"` removes it. The presets that remove every
  mark remove it too: `getPresetOptions()` gives `overline: "remove"` for
  `ala-lc-ancient`, `ala-lc-modern`, and `sbl-general`.
- In every format, a spacing breathing at the start of a word, before a
  capital vowel or rho, is the capital's (`῾Ρωμαῖοι` gives `Ῥωμαῖοι`), as far
  as the capital can carry it (`῾Ἀ` keeps its sign, and output writes a
  zero-width non-joiner after the sign), and a psili after a letter is an
  apostrophe (`τ᾿` gives `τ’`); rc.10 kept both as signs of their own.
- Every reader takes `〈` and `〉` (U+2329 and U+232A, U+3008 and U+3009) for
  `⟨` and `⟩`: Greek output writes `⟨α⟩` for `〈α〉`.

`createConverter()` throws a `TypeError` for an alias or a custom character
spelled as something that now has a meaning, unless it sets
`override: true`: in Greek, `ϗ`, `Ϗ`, `ȣ`, `Ȣ`, `〈`, or `〉`; in Beta Code, a
code or a sign that is now read, such as `%`, `_`, `%3`, `[2`, or `#532`.

## Updating from `1.0.0-rc.9`

Six kinds of input convert differently. The first two concern every
conversion to Greek:

- Greek output that carries no polytonic mark writes its acutes with tonos:
  `λόγος` converted alone gives `ό` as U+03CC (rc.9: U+1F79, oxia), so that
  monotonic Greek converts back to itself. Output with a breathing, a grave,
  a circumflex, an iota subscript, a coronis, or a quantity mark is
  unchanged. The two forms are canonically equivalent; if you compare
  strings scalar for scalar, or convert polytonic text one word at a time,
  set `greek: { acute: "oxia" }` to keep the output of rc.9.
- Greek output keeps an elided `π`, `τ`, or `κ` before a rough breathing as
  the source writes it: `ἀπ’ οὗ` stays (rc.9: `ἀφ’ οὗ`, with a loss
  reported), and the transliteration `ap’ hēmō̃n` reads as `ἀπ’ ἡμῶν` (rc.9:
  `ἀφ’ ἡμῶν`). The new `greek: { elidedStop: "aspirate" }` gives the output
  of rc.9.
- A final sigma before the keraia, as the units of a numeral, is a stigma:
  `ιςʹ` is 16, and converts to `i#2#` and `ic̄ʹ` (rc.9: `is#` and `isʹ`, as
  `ισʹ`). Code that reads `glyphVariant` gets a new value,
  `final-sigma-stigma`. To write 200, write `σʹ`.
- Under ISO 843 Type 2, `ωυ` is written letter by letter, as the standard
  requires: `ἑωυτοῦ` gives `heoytoû` (rc.9: `heoutoû`), and `oy` without
  marks reads back as `ωυ`.
- Under `greek: { accentuation: "monotonic" }`, `ό,τι`, an abbreviation such
  as `κ.ά.`, and the ending of an ordinal such as `20ός` keep their accent
  (rc.9: `ο,τι`, `κ.α.`, `20ος`).
- Under `text: { numerals: "decimal" }`, and so under the ALA-LC presets, a
  numeral whose letters carry only marks that the output removes is written
  as a number: `ἰβʹ` gives `12` under `ala-lc-modern` (rc.9: `ιβʹ`).

`createConverter()` rejects an unknown key of its configuration with an
`OptionError`, as conversion options do; rc.9 ignored it, so that a
misspelled `exclude` excluded nothing. An invalid `outOfScopeBehavior`, or an
identifier of `repertoire` or `exclude` that names no character, now throws
an `OptionError` too, a `RangeError`, where rc.9 threw a `TypeError`: code
that tells a misconfigured converter by `instanceof TypeError` should test
`instanceof OptionError`.

## Updating from `1.0.0-rc.8`

Greek output keeps the letter forms the source writes, by default: the lunate
sigma `ϲ`, a sigma whose shape contradicts its place (`λόγοσ`), `ϐ`, and the
symbol forms such as `ϑ`. The defaults of `greek.sigma`, `greek.finalSigma`,
and `greek.medialBeta` become `"preserve"`, and the new `greek.symbolForms`
decides the symbol forms. These options give the output of rc.8:

```ts
const rc8 = {
  greek: {
    sigma: "standard",
    finalSigma: "contextual",
    medialBeta: "standard",
    symbolForms: "standard",
  },
} as const;
```

Without them:

- `ϲῶμα`, `λόγοσ`, `ϐίος`, and `ϑεός` stay as written in Greek output (rc.8:
  `σῶμα`, `λόγος`, `βίος`, `θεός`). The Beta Code `s3` and the `c` of
  `bnf-core` give `ϲ`, and Beta Code output writes `ϲ` as `s3` (rc.8: `σ` or
  `ς`, and `s`). Beta Code reads and writes the TLG's `s1` and `s2` for a
  sigma whose shape contradicts its place: `λόγοσ` gives `lo/gos1`, and
  `lo/gos1` gives `λόγοσ` (rc.8: `lo/gos`, and `λόγος1`). To compare texts
  regardless of these forms, fold them (see
  [Keep or fold letter forms](https://greek-conversion.humanites.fr/guide/recipes/letters-and-text/#keep-or-fold-letter-forms)).
- `convertDetailed()` reports a form the target cannot write, so that a
  conversion without loss still converts back to the same text: `ϐίος` gives
  `bíos` in transliteration, which reads back as `βίος`, with a
  `removed-glyph-variant` loss whose new `glyphVariant` field is
  `"beta-symbol"` (rc.8: no loss). Under `medialBeta: "symbol"`, which writes
  `ϐ` inside a word as French typography does, a text written that way gives
  no loss. A form the options fold is no longer reported: `ϲῶμα` under
  `sigma: "standard"` gives `σῶμα`, as the same options write the source
  (rc.8: `removed-glyph-variant`).
- `GlyphVariant` has nine more values, one per symbol form, and
  `ConversionLossCode` two more, `added-glyph-variant` and `added-diacritic`,
  which code that switches over them must handle. A symbol form belongs to
  one case: `validateDocument()` reports it on a grapheme of the other case,
  and a case policy writes the ordinary letter (`ϑ` in capitals is `Θ`).

The API also gains two options, which change nothing by default:
`greek.iotaSubscript`, which writes the iota subscript on the line (see
[Write the iota on the line](https://greek-conversion.humanites.fr/guide/recipes/letters-and-text/#write-the-iota-on-the-line)), and
`source`, which describes how the input is written when it is not written as
the output, to restyle a transliteration
([Restyle a transliteration](https://greek-conversion.humanites.fr/guide/recipes/transliteration-and-beta-code/#restyle-a-transliteration)). A restyle that went through
Greek in two calls can take one,
`reencode(text, "transliteration", { ...target, source })`, which also keeps
what the Greek step dropped, such as a lunate sigma that the source writes
`c`. Seven kinds of input convert differently:

- Where the position decides the shape of a sigma in Greek output, a sigma
  before an elision apostrophe is medial: the Beta Code `a)gge/llous'` gives
  `ἀγγέλλουσ’`, and under `finalSigma: "contextual"`, `ἔχουσ’ ἐγώ` and
  `σ’ αγαπώ` keep their `σ` (rc.8: `ἀγγέλλους’`, `ἔχους’`, `ς’ αγαπώ`).
  Before an apostrophe that closes a quotation opened by `‘`, the sigma stays
  final (‘λόγος’). Under `"contextual"`, a Greek word in straight quotation
  marks, `'λόγος'`, now gives `’λόγοσ’`: use `‘` and `’` to quote, or keep
  the source shapes with the default `finalSigma: "preserve"`.
- Under `greek.finalSigma: "preserve"`, a lunate sigma written as a standard
  sigma takes `ς` at the end of a word, as any sigma whose shape the source
  does not note already did: with `sigma: "standard"`, `ϲῶμαϲ` gives `σῶμας`
  and the Beta Code `lo/gos3` gives `λόγος` (rc.8: `σῶμασ`, `λόγοσ`).
- Under `text.numerals: "decimal"`, as in the ALA-LC presets, `στʹ` is the
  units of a longer numeral too: `ΙΣΤʹ` gives `16` (rc.8: `ISTʹ`).
- A converter (`createConverter()`) writes a letter it keeps out of its scope
  as the source writes it in its word, without the options of the converted
  text: with sigma excluded, `λόγος σῶμα` gives `λόγος σῶμα` in Greek (rc.8:
  `λόγος ςῶμα`), and with omega excluded, `τῷ` gives `tῷ` in transliteration
  with `diacritics: { all: "remove" }` (rc.8: `tω`). A Beta Code letter is
  written in canonical Beta Code, whatever the `betaCode` options, and a
  transliterated letter is copied from the source. The transformations of
  the whole text (`text`) still apply, in context: under title case,
  `σῶμα λόγος` gives `Σῶμα Λόγος` (rc.8: `ΣΩ͂μα ΛόγοΣ`), and under
  `numerals: "decimal"`, `ιϛʹ` with stigma excluded gives `16` (rc.8: `iϛʹ`).
  The letters around a kept letter stay in its word: `σο`, with omicron
  excluded, keeps its `σ` (rc.8: `ςο`), and monotonic accentuation keeps the
  accent of such a word, whose syllables it cannot count. In
  `convertDetailed()`, a kept letter is one literal, so the `spans` of a
  converter that keeps letters can be fewer (`a#2b`, stigma excluded, had 4
  and has 3).
- Two transliteration options read back what they write. Under
  `upsilon: "y-with-ou-v-f"` without `beta: "v"` or `phi: "f"`, `aftós` gives
  `αὐτός` (rc.8: `ἀfτός`). Under `keraia: "bnf"`, as in `bnf-core`, an acute
  after a consonant is the right keraia (`c̄́` gives `ϛʹ`; rc.8: `ϛ́`), and a
  comma before `c̄` or `s̄` the left one (`,c̄` gives `͵ϛ`; rc.8: `,ϛ`); with
  the accents removed, the right keraia is written `ʹ` (`αʹ` gives `aʹ`;
  rc.8: `á`).
- Under `text.letterCase: "title"`, an apostrophe between two letters, with
  no space, does not start a word: `δ’ἐγώ` gives `Δ’ἐγώ` (rc.8: `Δ’Ἐγώ`), as a
  coronis written as an apostrophe does (`Ka’gṓ`). With a space, `δ’ ἐγώ`
  still gives `Δ’ Ἐγώ`.
- A few rare spellings are written so that they read back as written. In
  Beta Code, a keraia before a digit is written `ʹ`, since `#` and a digit
  are a TLG character code: `αʹ1` gives `aʹ1` (rc.8: `a#1`, read back as
  `αϟ`), and a small sigma before a digit from 1 to 3 takes its code
  (`λόγος2` gives `lo/gos22`). In transliteration, the contextual `y` of a
  numeral takes a diaeresis (`ὀυʹ` gives `oÿʹ`; rc.8: `oyʹ`), and under
  `upsilon: "y-with-ou-v-f"`, a circumflex moved to an epsilon is written as
  a tilde where `ê` is eta (`εὖ` gives `’ẽf` under ISO 843 Type 1; rc.8:
  `’êf`).

## Updating from `1.0.0-rc.7`

The API does not change. Two kinds of input convert differently, and the
document of a capital sigma changes:

- A capital consonant that stands alone is written in full capitals in
  transliteration, as a letter name, a numeral, or a siglum: `Θ` gives `TH`
  and `ΘΕΟΣ Θ` gives `THEOS TH` (rc.7: `Th`, `THEOS Th`). Followed by a
  period, it is an initial and keeps its first letter only (`Θ.` gives
  `Th.`, as before); so does a vowel with a rough breathing (`Ὁ δὲ` gives
  `Ho dè`), and every lone letter under `letterCase: "title"`. Both spellings
  read back as the same capital.
- The symbol forms `ϑ`, `ϕ`, `ϖ`, `ϰ`, `ϱ`, `ϵ`, and the capital `ϒ`, with its
  accented forms `ϓ` and `ϔ`, are read as their letters, as `ϐ` already was.
  rc.7 kept them as text: `ϑεός` gave `ϑeós` in transliteration and kept its
  `ϑ` in Greek; it now gives `theós`, and `θεός` in Greek.
- In the document that `parse()` returns, a capital `Σ` no longer has
  `glyphVariant: "medial-sigma"`: a capital has no final or medial shape. The
  capital lunate `Ϲ` keeps `"lunate-sigma"`. Under
  `greek.finalSigma: "preserve"`, a word in capitals lowercased by
  `text.letterCase` now ends with `ς`.

## Updating from `1.0.0-rc.6`

The API does not change. Some output and some readings do: text that rc.6
wrote and stored may convert differently, and a few conversions that were
reported lossless now report a loss, or the reverse. The
[changelog](CHANGELOG.md) gives every case with its before and after.

### Transliteration output

- The `h` of a rough breathing on the second vowel of a diphthong goes before
  the whole diphthong inside a word too: `χοἱ` gives `chhoi` (rc.6: `chohi`).
  After `t`, `p`, or `r`, it now forms `th`, `ph`, or `rh`, a reported loss:
  `τοὑ` gives `thou`, which reads back as `θου` (rc.6: `tohu`, lossless).
- Under `iso-843-type-2`, Ionic `ωυ` is written like `ου`: `ἑωυτοῦ` gives
  `heoutoû` (rc.6: `heoytoû`).
- Where a hiatus is marked by an accent that the options remove, the diaeresis
  that `y` already implies is written: `Θύιλλος` gives `Thyïllos` under
  `sbl-general` (rc.6: `Thyillos`). Such a diaeresis now precedes the accent
  (`ÿ́`, rc.6: `ý̈`).

Transliteration that rc.6 wrote still reads back as it did, except as below.

### Reading transliteration

- An `h` inside a word before two vowels that can form a diphthong gives the
  breathing to the diphthong, as at the start of a word: `chhoi` reads as
  `χοἱ` (rc.6: `χὁι`), and `mhaidēs` as `μαἱδης` (rc.6: `μἁιδης`).
- A reader no longer accepts a spelling of another convention that its own
  output uses with another meaning. Under `phi: "f"`, as in both ISO 843
  presets, `ph` is pi followed by a rough breathing: `philosophía` reads as
  `πἱλοσοπἵα` (rc.6: `φιλοσοφία`). Under `chi: "kh"` with `lunateSigma: "c"`,
  `ch` is a lunate sigma and a rough breathing; under `chi: "kh"` with a
  `nasalGamma` value ending in `-kappa`, `gkh` before a vowel is gamma, kappa,
  and a rough breathing. Text that mixes conventions should be rewritten in the
  convention of its options before it is read.

### Losses

`convertDetailed()` locates each loss at the token that lost something, and
some codes are more precise: under the ISO 843 presets, `ἄλφα` reports a
removed smooth breathing (`removed-diacritic`) where rc.6 reported an
unrepresented `ἄ`. Code that reads `losses` by position or by code may see
different values for the same input.

### Beta Code parentheses

Beta Code writes and reads parentheses with the TLG codes `[1` and `]1`:
`δῆσε(ν)` gives `dh=se[1n]1`, where it gave `dh=se(n)`. Earlier releases wrote
`(` and `)`, which Beta Code reads as breathings after a letter, so such text
does not read back as it was written. In Beta Code that these releases wrote, a
`(` or `)` that stands for a parenthesis cannot be told apart from a breathing
by the text alone; convert the Greek again where it is available. As in the
TLG, the number after a bracket is read whole, so a parenthesis or square
bracket followed by a digit does not read back (`(1)` is written `[11]1`,
which reads as `[11)`); the loss is reported.

## Updating from `1.0.0-rc.5`

`1.0.0-rc.6` settles the public API for `1.0.0`. It removes the convenience
functions, regroups the options by what they describe, replaces the
`removeDiacritics` flag, aligns the default transliteration on the SBL academic
style, and types option errors. Every old key, value, and flag throws an
`OptionError` whose message and `replacement` name the new form. It also writes
Beta Code quantity marks with the TLG codes.

### Convenience functions

Ten functions are removed; each was one call to `convert()` or `reencode()` with
fixed arguments. `convert`, `convertDetailed`, `reencode`, and `createConverter`
remain.

| Before                                                         | After                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `greekToBetaCode(input, options)`                              | `convert(input, "greek", "beta-code", options)`                                                                                                  |
| `greekToTransliteration(input, options)`                       | `convert(input, "greek", "transliteration", options)`                                                                                            |
| `betaCodeToGreek(input, options)`                              | `convert(input, "beta-code", "greek", options)`                                                                                                  |
| `betaCodeToTransliteration(input, options)`                    | `convert(input, "beta-code", "transliteration", options)`                                                                                        |
| `transliterationToGreek(input, options)`                       | `convert(input, "transliteration", "greek", options)`                                                                                            |
| `transliterationToBetaCode(input, options)`                    | `convert(input, "transliteration", "beta-code", options)`                                                                                        |
| `removeDiacritics(input, "transliteration", options)`          | `reencode(input, "transliteration", { ...options, diacritics: { all: "remove", roughBreathing: "preserve" } })` (exact form below)               |
| `removeDiacritics(input, format, options)`, Greek or Beta Code | `reencode(input, format, { ...options, diacritics: { all: "remove" }, greek: { sigma: "preserve", finalSigma: "preserve", ...options.greek } })` |
| `foldGreekVariants(input, options)`                            | `reencode(input, "greek", { ...options, greek: { ...options.greek, medialBeta: "standard", sigma: "standard", finalSigma: "medial" } })`         |
| `formatGreekUnicode(input, unicode)`                           | `reencode(input, "greek", { greek: unicode })`                                                                                                   |
| `toUnicodeCodePoints(input)`                                   | `Array.from(input, (c) => "U+" + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"))`                                                 |

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

const roughBreathing =
  options.diacritics?.roughBreathing === "remove" ? "remove" : "preserve";
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

### Beta Code quantity marks

Beta Code writes and reads the macron and breve with the TLG percent codes:

| Before                                       | After            |
| -------------------------------------------- | ---------------- |
| `&` (macron): `a&`, `a)/&`                   | `a%26`, `a)/%26` |
| `'` after `a`, `i`, `u` (breve): `a'`, `*'a` | `a%27`, `*%27a`  |

In TLG Beta Code, `&` shifts to the Latin font and `'` is the apostrophe, and
they are now read that way: `a&` gives `α&`, the `&` kept as text, and `a'`
gives `α’`. Beta Code that a 1.0 prerelease wrote with quantity marks therefore
reads differently. In such text, every `&` is a macron, and a `'` after `a`,
`i`, or `u` and their marks, or between `*` and one of these capitals, is a
breve; replace them with `%26` and `%27`, or convert the Greek again.

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

The separate [playground](https://greek-conversion.humanites.fr/playground/)
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
