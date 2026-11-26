---
title: "Getting started"
description: "Install greek-conversion and convert a first text."
---

The library converts Ancient, Byzantine, and Modern Greek between Greek
script, Beta Code, and Latin script, in any direction, and implements
published conventions as presets. This page installs the package and converts a first
text.

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

Let's transliterate some Thucydides (_History_ 1.1.2), then write the same
passage without diacritics, in Beta Code, and following the ISO 843 standard:

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

convert(thucydides, "greek", "transliteration", {
  preset: "iso-843-type-1",
});
// → Héllīsin ’egéneto kaì mérei tinì tō̂n varvárōn
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
  preset: "iso-843-type-1",
  source: {},
});
// → Héllīsin ’egéneto kaì mérei tinì tō̂n varvárōn
```

The options describe the text you give as well as the one you get back.
Greek and Beta Code read the same whatever the options, but a
transliteration is read according to its style: `source` names the style it
is written in, here `{}`, the library's own, which `convert()` wrote above.
Read as ISO 843, which marks the smooth breathing, `egéneto` would have none.

## Modern Greek

Monotonic Greek converts the same way. Choose a preset made for Modern Greek,
such as the ISO 843 transcription that passports and maps use:

```ts
import { convert } from "@humanities/greek-conversion";

convert("Η Αθήνα είναι η πρωτεύουσα", "greek", "transliteration", {
  preset: "iso-843-type-2",
});
// → I Athína eínai i protévousa
```

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
- For the conventions that apply to your Greek, what each keeps, and the
  tasks proper to it, see [Ancient Greek](/guide/ancient-greek/),
  [Byzantine and Medieval Greek](/guide/byzantine-greek/), or
  [Modern Greek](/guide/modern-greek/).
- To compare the published conventions, as `iso-843-type-1` above, and to
  refine one, see [Choosing a preset](/guide/presets/).
- For a precise task, the recipes cover
  [diacritics and Unicode output](/guide/recipes/diacritics-and-unicode/),
  [transliteration and Beta Code](/guide/recipes/transliteration-and-beta-code/),
  and [letters and text](/guide/recipes/letters-and-text/).
- Before you rely on it, read
  [Guarantees and limits](/reference/guarantees/); for a word of this
  documentation, see the [Glossary](/guide/glossary/).
