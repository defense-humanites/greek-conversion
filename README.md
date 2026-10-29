# greek-conversion

[![JSR](https://jsr.io/badges/@humanities/greek-conversion)](https://jsr.io/@humanities/greek-conversion)
[![npm](https://img.shields.io/npm/v/@humanities/greek-conversion)](https://www.npmjs.com/package/@humanities/greek-conversion)
[![CI](https://github.com/defense-humanites/greek-conversion/actions/workflows/ci.yml/badge.svg)](https://github.com/defense-humanites/greek-conversion/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/defense-humanites/greek-conversion/blob/main/LICENSE)

**Convert Greek text between Unicode Greek, Beta Code, and scientific
transliteration, in every direction, and know exactly what each conversion
keeps.**

`greek-conversion` is a TypeScript library for classicists, librarians, and
digital-humanities developers. It handles polytonic and monotonic Greek,
implements published conventions (ALA-LC, BnF, ISO 843, SBL, TLG, Perseus) as
ready-made presets, and tells you when a conversion loses information instead of
quietly guessing. It has no dependencies and runs on Deno, Node.js, and in
bundled browser code.

[**Try it in the playground →**](https://defense-humanites.github.io/greek-conversion/)

## Contents

1. [Quick start](#quick-start)
2. [Installation](#installation)
3. [How it works](#how-it-works)
4. [Which function to use](#which-function-to-use)
5. [Presets](#presets)
6. [Recipes](#recipes)
7. [Knowing what a conversion loses](#knowing-what-a-conversion-loses)
8. [Custom characters and strict repertoires](#custom-characters-and-strict-repertoires)
9. [Options are checked, errors are explicit](#options-are-checked-errors-are-explicit)
10. [Working with the canonical document](#working-with-the-canonical-document)
11. [Guarantees and limits](#guarantees-and-limits)
12. [Documentation](#documentation)
13. [Development](#development)
14. [Citing and license](#citing-and-license)

## Quick start

Let's transliterate some Thucydides (_History_ 1.1.2), then write the same
passage without diacritics, in Beta Code, and following the ISO 843 standard:

```ts
import { convert } from "@humanities/greek-conversion";

const thucydides =
  "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων.";

convert(thucydides, "greek", "transliteration");
// → Héllēsin egéneto kaì mérei tinì tō̃n barbárōn, hōs dè eipeĩn kaì epì pleĩston anthrṓpōn.

convert(thucydides, "greek", "transliteration", {
  diacritics: { all: "remove", roughBreathing: "preserve" },
});
// → Hellēsin egeneto kai merei tini tōn barbarōn, hōs de eipein kai epi pleiston anthrōpōn.

convert(thucydides, "greek", "beta-code");
// → *(/ellhsin e)ge/neto kai\ me/rei tini\ tw=n barba/rwn, w(s de\ ei)pei=n kai\ e)pi\ plei=ston a)nqrw/pwn.

convert(thucydides, "greek", "transliteration", { preset: "iso-843-type-1" });
// → Héllīsin ’egéneto kaì mérei tinì tō̂n varvárōn, hōs dè ’eipeîn kaì ’epì pleîston ’anthrṓpōn.
```

Without a preset, the transliteration is the SBL academic style. Removing the
diacritics but keeping the rough breathing keeps its `h`: in Latin script it is
a letter. Every conversion also works in reverse, and when it matters whether
you can get back to where you started, `convertDetailed()` tells you:

```ts
import { convert, convertDetailed } from "@humanities/greek-conversion";

convert(
  "*(/ellhsin e)ge/neto kai\\ me/rei tini\\ tw=n barba/rwn",
  "beta-code",
  "greek",
);
// → Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων

const thucydides =
  "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων.";

convertDetailed(thucydides, "greek", "transliteration").lossy; // → false

const plain = convertDetailed(thucydides, "greek", "transliteration", {
  diacritics: { all: "remove", roughBreathing: "preserve" },
});
plain.lossy; // → true
plain.losses[0].code; // → removed-diacritic
plain.losses[0].diacritic; // → acute
```

## Installation

The package is published as `@humanities/greek-conversion` on
[JSR](https://jsr.io/@humanities/greek-conversion) and
[npm](https://www.npmjs.com/package/@humanities/greek-conversion), with the same
named exports in both. It is ESM-only and ships its own type declarations.

```sh
# Deno 2 or later
deno add jsr:@humanities/greek-conversion

# Node.js 24 or later
npm install @humanities/greek-conversion
```

The [playground](https://defense-humanites.github.io/greek-conversion/) needs no
installation. It is built from the `main` branch, so it may be ahead of the
latest published release.

The unscoped npm package `greek-conversion` is the deprecated `0.14.x` series,
whose source is on the
[`legacy`](https://github.com/defense-humanites/greek-conversion/tree/legacy)
branch. To upgrade, follow the
[migration guide](https://github.com/defense-humanites/greek-conversion/blob/main/MIGRATION.md#from-014x).

## How it works

Three text formats are supported, each in both directions:

| Format                                                                                 | Identifier          | `ἄνθρωπος` is written |
| -------------------------------------------------------------------------------------- | ------------------- | --------------------- |
| Unicode Greek, polytonic or monotonic                                                  | `"greek"`           | `ἄνθρωπος`            |
| [Beta Code](https://stephanus.tlg.uci.edu/encoding.php), the ASCII encoding of the TLG | `"beta-code"`       | `a)/nqrwpos`          |
| Scientific transliteration in Latin script                                             | `"transliteration"` | `ánthrōpos`           |

A conversion reads the source into a **canonical document** (letters, case, and
diacritics, independent of any spelling), applies your options, and writes the
target format. Because every format goes through the same document, any pair
converts in either direction with the same rules, and the library can compare
what went in with what came out.

Options come in five groups, named after what they describe. That is why a name
such as `coronis` can appear in two of them: `diacritics.coronis` asks whether
the coronis is kept, `transliteration.coronis` how it is written in Latin.

| Group             | What it describes                                                                                                              | Examples                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `transliteration` | The Latin writing system: how each letter and mark is spelled, when transliteration is written and when it is read             | `beta: "v"`, `upsilon: "y"`, `longVowels: "circumflex"`, `coronis: "apostrophe"` |
| `greek`           | The Greek writing system: letter shapes, accentuation, assimilation, Unicode form. `sigma` and `doubleRho` reach Beta Code too | `finalSigma: "medial"`, `accentuation: "monotonic"`, `composition: "decomposed"` |
| `betaCode`        | Beta Code conventions                                                                                                          | `case: "uppercase"`, `yot: "#401"`                                               |
| `text`            | Transformations of the whole text, in every format                                                                             | `letterCase: "lowercase"`, `whitespace: "collapse"`, `numerals: "decimal"`       |
| `diacritics`      | Which classes of marks are kept at all; `all` sets every class, a class named with it is the exception                         | `accents: "remove"`, `all: "remove"`                                             |

Every option value is plain ASCII, so it can be typed on any keyboard. Unknown
characters are never discarded: anything the library does not recognize is
copied through unchanged.

## Which function to use

| You want to…                                                             | Use                                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Convert a string                                                         | `convert(input, from, to, options?)`                                  |
| Normalize or restyle a string without changing its format                | `reencode(input, format, options?)`                                   |
| Know whether the conversion loses information, and where each token went | `convertDetailed(input, from, to, options?)`                          |
| Reuse one configuration, add characters, or restrict the repertoire      | `createConverter(configuration)`                                      |
| Inspect or edit the parsed text itself                                   | `parse()` and `encode()` from `@humanities/greek-conversion/document` |

```ts
import { convert, reencode } from "@humanities/greek-conversion";

convert("a)/nqrwpos", "beta-code", "greek"); // → ἄνθρωπος
convert("ánthrōpos", "transliteration", "beta-code"); // → a)/nqrwpos
reencode("λόγος", "greek", { greek: { finalSigma: "medial" } }); // → λόγοσ
```

All of these share the same parser, document, options, and encoders, so they
always agree with one another. The recipes below show the option forms of the
common tasks: removing diacritics, folding letter variants, choosing a Unicode
form.

## Presets

A preset bundles the options that implement one published convention:

| Preset           | Target          | For                                                                          |
| ---------------- | --------------- | ---------------------------------------------------------------------------- |
| `ala-lc-ancient` | transliteration | Library romanization of Ancient and pre-1454 Medieval Greek                  |
| `ala-lc-modern`  | transliteration | Library romanization of post-1453 Modern Greek, with its contextual digraphs |
| `bnf-core`       | transliteration | BnF/ISO-based romanization for Ancient Greek cataloguing                     |
| `iso-843-type-1` | transliteration | ISO 843 Type 1 transliteration for Ancient and Modern Greek                  |
| `iso-843-type-2` | transliteration | ISO 843 Type 2 transcription, by pronunciation (passports, road signs, maps) |
| `sbl-academic`   | transliteration | Biblical studies, keeping scholarly diacritics; the default transliteration  |
| `sbl-general`    | transliteration | Biblical studies for general readers, without most diacritics                |
| `tlg-core`       | Beta Code       | Uppercase-ASCII TLG Beta Code for polytonic interchange                      |
| `perseus`        | Beta Code       | Lowercase-ASCII Beta Code for Perseus and Morpheus                           |

```ts
import { convert } from "@humanities/greek-conversion";

convert("Φίληβος ἢ Περὶ ἡδονῆς", "greek", "transliteration", {
  preset: "ala-lc-ancient",
});
// → Philēbos ē Peri hēdonēs

convert("Βίος Μπάλα", "greek", "transliteration", { preset: "ala-lc-modern" });
// → Vios Bala

convert("Εύβοια, Ευρώπη, αυτός", "greek", "transliteration", {
  preset: "iso-843-type-2",
});
// → Évvoia, Evrópi, aftós
```

Type 2 follows pronunciation and is not reversible: `convertDetailed()` reports
what it loses, such as eta written `i` or the upsilon of `ευ` written `v`.

Your own options override only the fields they name; the rest of the preset
stays in force. Defaults apply first, then the preset, then your options:

```ts
import { convert } from "@humanities/greek-conversion";

convert("Βίος Μπάλα", "greek", "transliteration", {
  preset: "ala-lc-modern",
  transliteration: { beta: "b" },
});
// → Bios Bala
```

Each preset documents its references, its coverage, and what it does not
implement, both in the
[preset reference](https://github.com/defense-humanites/greek-conversion/blob/main/docs/presets.md)
and at run time:

```ts
import {
  DEFAULT_CONVERSION_OPTIONS,
  getPresetMetadata,
  resolveConversionOptions,
} from "@humanities/greek-conversion";

getPresetMetadata("bnf-core").coverage; // → partial
DEFAULT_CONVERSION_OPTIONS.transliteration.longVowels; // → macron
resolveConversionOptions({ preset: "sbl-general" }).diacritics.accents; // → remove
```

A preset implements what can be done mechanically from the text. It does not
supply a rough breathing missing from the source, or anything else that needs a
dictionary; the
[preset behavior audit](https://github.com/defense-humanites/greek-conversion/blob/main/docs/preset-behavior-audit.md)
lists those limits for each standard.

## Recipes

### Remove all or some diacritics

```ts
import { convert } from "@humanities/greek-conversion";

convert("ἄνθρωπος ᾆ ῑ", "greek", "transliteration", {
  diacritics: { all: "remove" },
});
// → anthrōpos a i

convert("ἄνθρωπος ἅγιος κἀγώ", "greek", "transliteration", {
  diacritics: { all: "remove", roughBreathing: "preserve" },
});
// → anthrōpos hagios kagō

convert("ἄνθρωπος ἅγιος κἀγώ", "greek", "transliteration", {
  diacritics: {
    accents: "remove",
    smoothBreathing: "remove",
    coronis: "remove",
  },
});
// → anthrōpos hagios kagō
```

`all` sets every class; a class named with it is the exception. Structural
letters stay distinct (`η → ē`, `ω → ō`). The rough breathing goes with its
class in every format: removed, it disappears from Greek and Beta Code and its
`h` from transliteration; kept, it stays everywhere.

In Greek, removing the marks still applies the sigma policies, so a source `σ`
at the end of a word becomes `ς` and a lunate `ϲ` becomes `σ`. To change nothing
but the marks, keep the source shapes:

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("λόγος ϲῶμα ςόσ", "greek", { diacritics: { all: "remove" } });
// → λογος σωμα σος
reencode("λόγος ϲῶμα ςόσ", "greek", {
  diacritics: { all: "remove" },
  greek: { sigma: "preserve", finalSigma: "preserve" },
});
// → λογος ϲωμα ςοσ
```

### Produce monotonic Greek

```ts
import { convert } from "@humanities/greek-conversion";

convert("Ποῦ εἶσαι; Ἢ ἐδῶ ἢ ἐκεῖ, καὶ ὄχι ἀλλοῦ.", "greek", "greek", {
  greek: { accentuation: "monotonic" },
});
// → Πού είσαι; Ή εδώ ή εκεί, και όχι αλλού.
```

Every accent becomes a tonos, breathings and other polytonic marks are removed,
and the diaeresis is kept. Monosyllables lose their accent, except disjunctive
`ή` and interrogative `πού` and `πώς`, which the polytonic marks identify (`ἢ`,
`ποῦ`, `πῶς`). The rules are applied mechanically from the written text; a
monosyllable by synizesis such as `γιὰ` keeps its accent. See
[Greek accentuation and Unicode](https://github.com/defense-humanites/greek-conversion/blob/main/docs/greek-unicode.md#accentuation-systems).

### Choose transliteration spellings

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
are listed in `CONVERSION_OPTION_VALUES`. Supply the same options when reading
transliteration back, and the chosen spellings are recognized.

### Keep or fold letter variants

Lunate sigma has two independent controls: `sigma` picks the Greek and Beta Code
glyph (`"preserve"` remembers which source sigmas were lunate), and
`lunateSigma` picks their transliteration:

```ts
import { convert } from "@humanities/greek-conversion";

const options = {
  transliteration: { lunateSigma: "c" },
  greek: { sigma: "preserve" },
} as const;

convert("σϲς", "greek", "transliteration", options); // → scs
convert("scs", "transliteration", "greek", options); // → σϲς
```

To compare texts regardless of glyph variants, fold them to one spelling:
standard beta and sigma, and a medial sigma everywhere:

```ts
import { reencode } from "@humanities/greek-conversion";

const fold = {
  greek: { medialBeta: "standard", sigma: "standard", finalSigma: "medial" },
} as const;

reencode("ϐίος λόγος ϲῶμα", "greek", fold); // → βίοσ λόγοσ σῶμα
reencode("ϐΊΟΣ", "greek", {
  ...fold,
  text: { letterCase: "lowercase" },
  diacritics: { all: "remove" },
});
// → βιοσ
```

### Normalize case and whitespace

```ts
import { convert } from "@humanities/greek-conversion";

convert("  ΦΙΛΗΒΟΣ\nΗΔΟΝΗ  ", "greek", "transliteration", {
  text: { letterCase: "lowercase", whitespace: "collapse" },
});
// → philēbos ēdonē
```

`letterCase` accepts `"preserve"`, `"lowercase"`, `"uppercase"`, and `"title"`;
`whitespace: "collapse"` trims the text and reduces every run of whitespace to
one space.

Under `"preserve"`, a capital spelled with several Latin letters is written in
full capitals among capitals, and with its first letter only before lowercase
text or on its own, as ISO 843 (Table 1, note 11) prescribes. The same holds for
the `h` of a rough breathing or of rho:

```ts
import { convert } from "@humanities/greek-conversion";

convert("ΘΑΛΑΣΣΑ ἙΛΛΑΣ ΠΥΡΡΟΣ", "greek", "transliteration");
// → THALASSA HELLAS PYRRHOS
convert("Θάλασσα Ἑλλάς Θ.", "greek", "transliteration");
// → Thálassa Hellás Th.
```

### Write Beta Code the TLG way

ASCII letter case carries no meaning in Beta Code input: only `*` marks a
capital. Output follows the
[TLG placement rules](https://stephanus.tlg.uci.edu/encoding.php): breathing,
accent, then iota subscript, with the asterisk and marks before an uppercase
letter. Vowel quantity takes the TLG percent codes, `%26` for the macron and
`%27` for the breve, after the accent. As in the TLG, `'` is the apostrophe;
`&`, a shift to the Latin font, is kept as text.

```ts
import { convert } from "@humanities/greek-conversion";

convert("A)/NQRWPOS", "beta-code", "greek"); // → ἄνθρωπος
convert("*)/ANQRWPOS", "beta-code", "greek"); // → Ἄνθρωπος
convert("ᾯ", "greek", "beta-code"); // → *(=w|
convert("ᾱ ᾰ", "greek", "beta-code"); // → a%26 a%27
convert("ἄνθρωπος", "greek", "beta-code", { preset: "tlg-core" }); // → A)/NQRWPOS
```

`betaCode.case` selects lowercase or uppercase ASCII, and `betaCode.yot: "#401"`
writes yot with its TLG code instead of `j`.

### Control Greek Unicode output

```ts
import { reencode } from "@humanities/greek-conversion";

const styled = reencode("ά;", "greek", {
  greek: { acute: "oxia", questionMark: "greek" },
});
[...styled].map((c) => c.codePointAt(0)!.toString(16)); // → ["1f71","37e"]
```

Composed or decomposed output, tonos or oxia, and the Greek punctuation scalars
are representation choices: they never change the text's meaning, and they are
not reported as loss. See
[Greek accentuation and Unicode](https://github.com/defense-humanites/greek-conversion/blob/main/docs/greek-unicode.md).

## Knowing what a conversion loses

Some conversions necessarily merge distinctions. `convertDetailed()` runs the
conversion once and reports, token by token, what the target cannot express:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const monotonic = convertDetailed("ἄνθρωπος", "greek", "greek", {
  greek: { accentuation: "monotonic" },
});
monotonic.output; // → άνθρωπος
monotonic.lossy; // → true
monotonic.losses[0].code; // → removed-diacritic
monotonic.losses[0].diacritic; // → smooth
monotonic.losses[0].offset; // → 0

// Monotonic or uncial Greek has no breathings; transliteration cannot tell
// "no breathing" from "smooth breathing", so reading it back adds one.
convertDetailed("άνθρωπος", "greek", "transliteration").losses[0].code;
// → inferred-breathing
```

Each loss locates its token in the input (`offset`, `length`, in UTF-16 code
units), and `spans` gives, for every token of the source, where it was read and
where its output was written, so an application can highlight a loss or map a
selection from one text to the other:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const detailed = convertDetailed("ἄνθρωπος", "greek", "transliteration");
const { inputStart, inputEnd, outputStart, outputEnd } = detailed.spans[2];
"ἄνθρωπος".slice(inputStart, inputEnd); // → θ
detailed.output.slice(outputStart, outputEnd); // → th
```

A text mixed with another language reports losses for the letters of that
language, since the library converts the whole string and the target would read
some of them as Greek. Filter the losses by `code` to keep the ones about the
Greek:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const mixed = convertDetailed(
  "Voir λόγος ; cf. ψυχή.",
  "greek",
  "transliteration",
);
mixed.output; // → Voir lógos ? cf. psychḗ.
mixed.lossy; // → true
mixed.losses.filter((loss) => loss.code !== "unrepresented-literal").length; // → 0
```

When `lossy` is `false`, converting the output back with the same options gives
the same canonical text. The loss codes are:

| Code                     | What the target cannot keep                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `removed-diacritic`      | A diacritic of the source                                                                                      |
| `displaced-diacritic`    | The position of a breathing: a hiatus marked only by a breathing (`Ἀίδης`) reads back as a diphthong (`Αἴδης`) |
| `inferred-breathing`     | The absence of a breathing on an initial vowel, which reads back as a smooth breathing                         |
| `changed-case`           | The letter case                                                                                                |
| `removed-glyph-variant`  | A known lunate sigma                                                                                           |
| `unrepresented-grapheme` | A letter, or its position                                                                                      |
| `unrepresented-literal`  | A literal token                                                                                                |

See the
[information-loss matrix](https://github.com/defense-humanites/greek-conversion/blob/main/docs/information-loss.md)
for each format pair and option, and the
[conversion-analysis contract](https://github.com/defense-humanites/greek-conversion/blob/main/docs/conversion-analysis.md)
for the result format.

## Custom characters and strict repertoires

A converter created with `createConverter()` binds a preset and can extend or
restrict the character inventory:

```ts
import { createConverter } from "@humanities/greek-conversion";

const converter = createConverter({
  aliases: [{ letter: "theta", format: "transliteration", spellings: ["þ"] }],
  exclude: ["stigma", "koppa", "sampi"],
});

converter.convert("þeos", "transliteration", "greek"); // → θεος
```

An alias inherits every rule of its built-in letter. A new character definition
maps directly between formats and keeps its case, but does not join the
contextual rules for diphthongs, breathings, or numerals. Excluded characters
are copied through as text.

A converter bound to a preset also enforces the preset's character scope.
Characters outside it are preserved and reported; with
`outOfScopeBehavior: "reject"`, the conversion throws instead:

```ts
import { createConverter } from "@humanities/greek-conversion";

const perseus = createConverter({ preset: "perseus" });
const result = perseus.convertDetailed("ἄνθρωπος ϝ", "greek", "beta-code");
result.output; // → a)/nqrwpos ϝ
result.diagnostics[0].code; // → out-of-scope-character
result.diagnostics[0].offset; // → 9

const iso = createConverter({
  preset: "iso-843-type-1",
  outOfScopeBehavior: "reject",
});
iso.convert("ϟ", "greek", "transliteration");
// throws CharacterScopeError: Conversion rejected: 1 unsupported character.
```

The error's `diagnostics` list each rejected occurrence; here, koppa, for which
ISO 843 defines no transliteration. See
[character extensions and repertoires](https://github.com/defense-humanites/greek-conversion/blob/main/docs/character-extensions.md)
and the
[preset repertoire audit](https://github.com/defense-humanites/greek-conversion/blob/main/docs/preset-repertoire-audit.md).

## Options are checked, errors are explicit

A misspelled option never falls back silently to a default. An unknown key,
value, or preset throws an `OptionError`, a `RangeError` that names the option
(`path`), what it received, what it accepts, and the current spelling of a key
or value an earlier release knew; an unknown format throws a plain `RangeError`,
and an option group of the wrong type a `TypeError`. This matters most when
options come from a configuration file or a form:

```ts
import { convert, OptionError } from "@humanities/greek-conversion";

const options = JSON.parse('{ "transliteration": { "eta": "ē" } }');
try {
  convert("λόγος", "greek", "transliteration", options);
} catch (error) {
  if (error instanceof OptionError) {
    error.message; // → Invalid value for transliteration.eta: "ē"; expected one of "e", "i".
    error.path; // → transliteration.eta
    error.accepted; // → ["e","i"]
  }
}
```

`FORMATS` and `CONVERSION_OPTION_VALUES` list everything that is accepted, which
is convenient for building a user interface:

```ts
import {
  CONVERSION_OPTION_VALUES,
  FORMATS,
} from "@humanities/greek-conversion";

FORMATS; // → ["greek","beta-code","transliteration"]
CONVERSION_OPTION_VALUES.transliteration.eta; // → ["e","i"]
```

## Working with the canonical document

The `@humanities/greek-conversion/document` entry point exposes the parsed text,
for validation, analysis, or controlled edits:

```ts
import {
  encode,
  parse,
  validateDocument,
} from "@humanities/greek-conversion/document";

const document = parse("a)/nqrwpos", "beta-code");
validateDocument(document); // → []
encode(document, "greek"); // → ἄνθρωπος
encode(document, "transliteration"); // → ánthrōpos
```

Parse once and encode as many times as you need. `parseDetailed()` also returns
the position of each token in the input, as `spans`. Validation checks the
document, not the original spelling: a malformed source sequence can survive as
a literal. The
[document API contract](https://github.com/defense-humanites/greek-conversion/blob/main/docs/document-api.md)
describes ownership and editing rules, and
[validation](https://github.com/defense-humanites/greek-conversion/blob/main/docs/validation.md)
lists the diagnostic codes.

## Guarantees and limits

What you can rely on:

- Every format pair converts in both directions.
- For fixed formats and options, output is canonical and idempotent: converting
  it again changes nothing.
- A conversion that `convertDetailed()` reports as lossless converts back to the
  same canonical text.
- Unknown characters are preserved, never dropped.
- Without a preset, transliteration is the SBL academic style, and the
  `sbl-academic` preset writes exactly what the defaults write.
- These properties are checked for every preset and format pair on each change.

The library converts the whole string it is given. In a text that mixes Greek
with another language, the punctuation shared by both is converted as Greek (`;`
becomes `?` in transliteration), and the letters of the other language are kept
as they are but reported as `unrepresented-literal` losses when the target
format would read them as Greek. Extract the Greek before converting when that
matters.

What the library deliberately does not do:

- infer a rough breathing, an iota adscript, or anything else that requires a
  dictionary or knowledge of the language;
- claim complete conformance to a standard: each preset documents what it
  implements and what it leaves out.

The engine covers polytonic and monotonic accentuation, diphthongs, hiatus, and
breathings in context, crasis and coronis, elision, sigma and beta variants,
archaic letters, Greek punctuation, and marked alphabetic numerals.

From version 1.0.0, the version number protects the documented behavior.
Corrections that bring output closer to the documentation or to a preset's
reference are released as patches; see the
[stability policy](https://github.com/defense-humanites/greek-conversion/blob/main/docs/stability.md).

## Documentation

| Topic                               | Document                                                                                                                                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presets and their exact options     | [Presets](https://github.com/defense-humanites/greek-conversion/blob/main/docs/presets.md)                                                                                                                                       |
| What the version number promises    | [Stability policy](https://github.com/defense-humanites/greek-conversion/blob/main/docs/stability.md)                                                                                                                            |
| Loss by format pair and option      | [Information loss](https://github.com/defense-humanites/greek-conversion/blob/main/docs/information-loss.md)                                                                                                                     |
| Detailed conversion results         | [Conversion analysis](https://github.com/defense-humanites/greek-conversion/blob/main/docs/conversion-analysis.md)                                                                                                               |
| Greek accentuation and Unicode      | [Greek Unicode](https://github.com/defense-humanites/greek-conversion/blob/main/docs/greek-unicode.md)                                                                                                                           |
| Custom characters and repertoires   | [Character extensions](https://github.com/defense-humanites/greek-conversion/blob/main/docs/character-extensions.md)                                                                                                             |
| The canonical document              | [Document API](https://github.com/defense-humanites/greek-conversion/blob/main/docs/document-api.md) and [Validation](https://github.com/defense-humanites/greek-conversion/blob/main/docs/validation.md)                        |
| Preset audits                       | [Repertoire](https://github.com/defense-humanites/greek-conversion/blob/main/docs/preset-repertoire-audit.md) and [behavior](https://github.com/defense-humanites/greek-conversion/blob/main/docs/preset-behavior-audit.md)      |
| Conformance corpora                 | [BnF and ISO](https://github.com/defense-humanites/greek-conversion/blob/main/docs/preset-conformance-corpus.md) and [ALA-LC](https://github.com/defense-humanites/greek-conversion/blob/main/docs/ala-lc-conformance-corpus.md) |
| Upgrading from 0.14.x or a 1.0 beta | [Migration guide](https://github.com/defense-humanites/greek-conversion/blob/main/MIGRATION.md)                                                                                                                                  |
| Release history                     | [Changelog](https://github.com/defense-humanites/greek-conversion/blob/main/CHANGELOG.md)                                                                                                                                        |

## Development

The library is developed with [Deno](https://deno.com/) 2:

```sh
deno task check      # formatting, lint, types, docs, README examples
deno task test       # unit, conformance, and property tests
deno task bench      # throughput baseline
deno task site:build # builds the playground into _site/
```

Every TypeScript example in this README is executed by `deno task check`, and
its output must match the `// →` comment. Bug reports and suggestions are
welcome in the
[issue tracker](https://github.com/defense-humanites/greek-conversion/issues).

## Citing and license

If you use `greek-conversion` in research or in a published resource, please
cite it; GitHub's "Cite this repository" button uses the metadata in
[`CITATION.cff`](https://github.com/defense-humanites/greek-conversion/blob/main/CITATION.cff).

Copyright © 2021–2026 Antoine Boquet. Released under the
[MIT License](https://github.com/defense-humanites/greek-conversion/blob/main/LICENSE)
since `1.0.0-beta.7`; earlier versions remain under AGPL-3.0-or-later. The
benchmark input,
[`bench/thucydides.ts`](https://github.com/defense-humanites/greek-conversion/blob/main/bench/thucydides.ts)
(Thucydides 1.1–1.10, from the Perseus Digital Library), is under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and is not part
of the published packages.
