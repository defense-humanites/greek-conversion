---
title: "Getting started"
description: "Install greek-conversion and convert a first text."
---

greek-conversion converts Ancient and Modern Greek between Unicode Greek, Beta
Code, and Latin transliteration, in any direction, and implements published
conventions as presets. This page installs the package and converts a first
text.

## Installation

The package is published as `@humanities/greek-conversion` on
[JSR](https://jsr.io/@humanities/greek-conversion) and
[npm](https://www.npmjs.com/package/@humanities/greek-conversion), with the same
named exports in both. It is ESM-only and ships its own type declarations.

```sh
# npm
npm install @humanities/greek-conversion

# JSR, whose package page gives the command for each runtime
npx jsr add @humanities/greek-conversion
```

The [playground](/playground/) needs no
installation. It is built from the `main` branch, so it may be ahead of the
latest published release.

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

const thucydides = "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων";

convertDetailed(thucydides, "greek", "transliteration").lossy; // → false

const plain = convertDetailed(thucydides, "greek", "transliteration", {
  diacritics: { all: "remove", roughBreathing: "preserve" },
});
plain.lossy; // → true
plain.losses[0].code; // → removed-diacritic
plain.losses[0].diacritic; // → acute
```

## Next steps

- [How it works](/guide/how-it-works/): the three formats, the canonical
  document, the option groups, and which function to use.
- [Presets](/guide/presets/): the published conventions the library
  implements.
- The recipes, for the common tasks, starting with
  [removing diacritics](/guide/recipes/diacritics-and-unicode/#remove-all-or-some-diacritics).
- [Guarantees and limits](/reference/guarantees/): what every conversion keeps,
  and what the library leaves to you.
