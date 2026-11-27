---
title: "Getting started"
description: "Install greek-conversion, convert a first text, and set a conversion with options and presets."
---

The library converts Ancient, Byzantine, and Modern Greek between Greek
script, Beta Code, and Latin script, in any direction, with atomic options
composed into presets that follow published conventions. This page installs
the package and converts a first text, then presents the options and the
presets, the conventions of each period, normalizing a text within its
format, and what counts for the size of a bundle and the speed of a call.

## Installation

The package is published as `@humanities/greek-conversion` on
[npm](https://www.npmjs.com/package/@humanities/greek-conversion) and
[JSR](https://jsr.io/@humanities/greek-conversion), with the same named
exports in both. It is ESM-only and ships its own type declarations. It
has no dependencies and uses no runtime-specific API: it runs in Node.js,
from version 24, and in browsers, as the playground does.

```sh
# npm
npm install @humanities/greek-conversion

# JSR, whose package page gives the command for each runtime
npx jsr add @humanities/greek-conversion
```

The [playground](/playground/) needs no installation. It runs the version
this documentation describes, which the header names: `next`, from the `main`
branch, until 1.0.0 is released; from then on, the latest release, with the
next one under `/next/`.

## A first conversion

To begin, transliterate a passage of Thucydides (_History_ 1.1.2), then
write it without diacritics and in Beta Code:

```ts
import { convert } from "@humanities/greek-conversion";

const thucydides = "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων";

convert(thucydides, "greek", "transliteration");
// → Héllēsin egéneto kaì mérei tinì tō̃n barbárōn

convert(thucydides, "greek", "transliteration", {
  diacritics: { all: "remove", roughBreathing: "preserve" },
});
// → Hellēsin egeneto kai merei tini tōn barbarōn

convert(thucydides, "greek", "beta-code");
// → *(/ellhsin e)ge/neto kai\ me/rei tini\ tw=n barba/rwn
```

Without a preset, the transliteration is the library's own: the letters of the
SBL Handbook, with the accents, iota subscript, diaeresis, and quantity marks
that the Handbook leaves out. Removing the diacritics but keeping the rough
breathing keeps its `h`: in Latin script it is a letter. Every conversion also
works in reverse, and when it matters whether you can get back to where you
started, `convertDetailed()` tells you:

```ts
import { convert, convertDetailed } from "@humanities/greek-conversion";

convert(
  "*(/ellhsin e)ge/neto kai\\ me/rei tini\\ tw=n barba/rwn",
  "beta-code",
  "greek",
);
// → Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων

const thucydides = "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων";

convertDetailed(thucydides, "greek", "transliteration").lossy; // → false

const plain = convertDetailed(thucydides, "greek", "transliteration", {
  diacritics: { all: "remove", roughBreathing: "preserve" },
});
plain.lossy; // → true
plain.losses[0].code; // → removed-diacritic
plain.losses[0].diacritic; // → acute
```

## Options and presets

Every conversion is set by options. An option sets one thing, such as
whether the accents are kept (`diacritics.accents`) or how eta is written
(`transliteration.eta`), and has a default. There are 52 of them, in five
groups named after what they describe: `transliteration`, `greek`,
`betaCode`, `text`, and `diacritics`. They combine freely: here chi is
written `kh` and upsilon `u`, and the accents are left out:

```ts
import { convert } from "@humanities/greek-conversion";

convert("ψυχὴ καὶ σῶμα", "greek", "transliteration", {
  transliteration: { chi: "kh", upsilon: "u" },
  diacritics: { accents: "remove" },
});
// → psukhē kai sōma
```

A preset is a set of these options that follows a published convention:
`iso-843-type-1`, the transliteration of the ISO 843 standard, sets ten of
them. The defaults apply first, then the preset, then the options given
with it, so that a preset can be adjusted, here to leave out the apostrophe
that marks the smooth breathing:

```ts
import { convert } from "@humanities/greek-conversion";

const thucydides = "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων";

convert(thucydides, "greek", "transliteration", {
  preset: "iso-843-type-1",
});
// → Héllīsin ’egéneto kaì mérei tinì tō̂n varvárōn

convert(thucydides, "greek", "transliteration", {
  preset: "iso-843-type-1",
  transliteration: { smoothBreathing: "omit" },
});
// → Héllīsin egéneto kaì mérei tinì tō̂n varvárōn
```

[Conversion options](/reference/options/) gives each option with its values
and what each writes, and [Choosing a preset](/guide/presets/) compares the
conventions.

## Your Greek

Byzantine and Modern Greek convert the same way, with the options and the
presets of their period: the καί symbol takes the accent that manuscripts
give it, and Modern Greek the ISO 843 transcription that passports and maps
use:

```ts
import { convert } from "@humanities/greek-conversion";

convert("ϗ τὰ λοιπά", "greek", "transliteration", {
  greek: { kaiAccent: "byzantine" },
});
// → kaì tà loipá

convert("Η Αθήνα είναι η πρωτεύουσα", "greek", "transliteration", {
  preset: "iso-843-type-2",
});
// → I Athína eínai i protévousa
```

[Ancient Greek](/guide/ancient-greek/),
[Byzantine and Medieval Greek](/guide/byzantine-greek/), and
[Modern Greek](/guide/modern-greek/) give the conventions that apply to each
period, what each keeps, and the tasks proper to it.

## Normalizing a text

To normalize or restyle a text without changing its format, `reencode()`
reads it and writes it back in the same format, with the options you give:
polytonic Greek made monotonic, Beta Code typed in capitals, as in TLG
files, brought back to the library's form, or a transliteration rewritten
following a preset:

```ts
import { reencode } from "@humanities/greek-conversion";

const thucydides = "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων";

reencode(thucydides, "greek", { greek: { accentuation: "monotonic" } });
// → Έλλησιν εγένετο και μέρει τινί των βαρβάρων

reencode("*(/ELLHSIN E)GE/NETO KAI\\ ME/REI", "beta-code");
// → *(/ellhsin e)ge/neto kai\ me/rei

const transliterated = "Héllēsin egéneto kaì mérei tinì tō̃n barbárōn";

reencode(transliterated, "transliteration", {
  preset: "bnf-ancient",
  source: {},
});
// → Héllēsin e̓géneto kaì mérei tinì tō̂n barbárōn
```

The options describe the text you give as well as the one you get back.
Greek and Beta Code read the same whatever the options, but a
transliteration is read according to its style: `source` names the style it
is written in, here `{}`, the library's own, which `convert()` wrote above.
Read as the BnF's, which marks the smooth breathing, `egéneto` would have
none.

## Size and speed

The examples of this documentation import everything from the main entry
point: it is the simplest way, and fast enough for most uses, as a text of
10,000 characters converts in 1 to 2 ms. Two refinements count in some
cases. A web page that converts in one direction can import its conversion
from the `core` entry point, with only the formats and presets it uses, and
ship a bundle up to half as heavy, as
[Smaller bundles](/guide/smaller-bundles/) explains. An application that
converts many short strings under options of its own can prepare them once
with `prepareOptions()`, which makes each call about twice as fast, as
[Converters, options, and errors](/guide/converters/#prepare-options-once)
shows. [Performance](/guide/performance/) gives what each call costs:
`convertDetailed()`, for one, costs two to three times what `convert()`
does.

## Next steps

- To see why every format converts to every other with the same rules,
  read [How it works](/guide/how-it-works/).
- To find out what a conversion cannot keep, see
  [What formats and options lose](/guide/format-and-option-losses/); to find
  where a given text loses it, as `lossy` hinted above, see
  [Knowing what a conversion loses](/guide/losses/).
- For a precise task, the recipes cover
  [diacritics and Unicode output](/guide/recipes/diacritics-and-unicode/),
  [transliteration and Beta Code](/guide/recipes/transliteration-and-beta-code/),
  and [letters and text](/guide/recipes/letters-and-text/).
- Before you rely on it, read
  [Guarantees and limits](/reference/guarantees/); for a word of this
  documentation, see the [Glossary](/guide/glossary/).
