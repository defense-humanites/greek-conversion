---
title: "What formats and options lose"
description: "Which distinctions each format and each option can lose, which changes are not losses, and where the contract states them."
---

A conversion loses information when its output, converted back with the same
options, does not give the text it was given. Some losses come from the
target format, which has no way to write a distinction; others are asked for,
by an option that removes marks or merges letters. This page says which, in
general. [Knowing what a conversion loses](/guide/losses/) shows how
`convertDetailed()` finds them in a given text, and the
[information-loss contract](/reference/information-loss/) states each case
precisely.

## Between Greek and Beta Code

Beta Code notes every letter and mark of polytonic Greek, the lunate sigma and
a sigma whose shape contradicts its place included. Between the two formats,
only the symbol forms are lost, such as `ϐ` and `ϑ`, which Beta Code writes as
the ordinary letters, and a parenthesis followed by a digit, which Beta Code
cannot tell from its bracket codes:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

convertDetailed("κἀγὼ ᾠδῇ, Ἀίδης, ϲῶμα", "greek", "beta-code").lossy;
// → false

const symbols = convertDetailed("ϐίος ϑεός", "greek", "beta-code");
symbols.output; // → bi/os qeo/s
symbols.losses.map((loss) => loss.glyphVariant);
// → ["beta-symbol","theta-symbol"]
```

## In Latin script

A transliteration writes Greek with fewer signs than Greek has. The default
transliteration keeps the accents, breathings, iota subscript, diaeresis, and
quantity marks, but not:

- the coronis of a crasis (`κἀγώ` gives `kagṓ`), unless
  `transliteration.coronis: "greek"`;
- the symbol forms, the lunate sigma unless `transliteration.lunateSigma: "c"`,
  and a sigma whose shape contradicts its place;
- a hiatus marked only by a breathing on its first vowel: `Ἀίδης` gives
  `Aídēs`, which reads back as `Αἴδης`;
- the absence of a breathing on an initial vowel, in monotonic or uncial text:
  `άνθρωπος` gives `ánthrōpos`, which reads back with a smooth breathing;
- a few rarer distinctions, such as a nu before a velar, written `n` like the
  gamma of `ἄγγελος`.

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const latin = convertDetailed(
  "κἀγὼ Ἀίδης ϐίος ϲῶμα",
  "greek",
  "transliteration",
);
latin.output; // → kagṑ Aídēs bíos sō̃ma
latin.losses.map((loss) => loss.diacritic ?? loss.glyphVariant);
// → ["coronis","smooth","beta-symbol","lunate-sigma"]
```

The other conventions keep more or less: `bnf-ancient` writes the smooth
breathing and the coronis as marks of their own, and the presets for Modern
Greek read no breathing back. See [Each preset](#each-preset).

## Options that remove information

Some options ask for an output that says less than the source. It cannot be
converted back to the source, and `convertDetailed()` reports what went:

| Option                                                                               | What the output no longer says                                                                                        |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `diacritics`, for any class it removes                                               | The marks of that class                                                                                               |
| `greek.accentuation: "monotonic"`                                                    | Breathings, coronis, quantity marks, the iota subscript, which of the three accents, the accent of most monosyllables |
| `greek.iotaSubscript: "capital-adscript"` or `"adscript"`                            | That an iota written on the line was subscript                                                                        |
| `greek.capitalMarks: "omit"`, the default                                            | The accents, breathings, coronis, and quantity marks of words in capitals, and whether a diaeresis was written        |
| `greek.elidedStop: "aspirate"`                                                       | The consonant the source writes before an elision                                                                     |
| `greek.dentalSigma: "assimilate"`                                                    | A dental before sigma                                                                                                 |
| `text.numerals: "decimal"`                                                           | The letters of a numeral                                                                                              |
| `text.letterCase`                                                                    | The case of the source                                                                                                |
| `transliteration.smoothBreathing` or `transliteration.coronis` set to `"apostrophe"` | The mark, written as an apostrophe that reads back as punctuation                                                     |
| The spellings of ISO 843 Type 2                                                      | Eta and omega, written `i` and `o`; the upsilon of `αυ`, `ευ`, and `ηυ`, written `v` or `f`                           |

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const monotonic = convertDetailed("ἐν ἀρχῇ ἦν ὁ λόγος", "greek", "greek", {
  greek: { accentuation: "monotonic" },
});
monotonic.output; // → εν αρχή ην ο λόγος
[...new Set(monotonic.losses.map((loss) => loss.diacritic))];
// → ["smooth","circumflex","iota-subscript","rough"]
```

The [option-induced loss](/reference/information-loss/#option-induced-loss)
tables of the contract take every option, and say whether the source can be
reconstructed from the output.

## Changes that are not losses

Some changes leave the text the same, and are not reported:

- the Unicode form of Greek: composed or decomposed letters, an acute written
  with tonos or oxia, the Greek question mark and ano teleia written as
  Unicode normalization gives them or as the Greek characters;
- the spelling the output settles on: the order of the marks, a `?` typed in
  Greek and written as the Greek question mark `;`, the ASCII case of Beta
  Code;
- an option that folds letter forms, such as `greek.sigma: "standard"`: the
  forms are gone, but the options write none, from the source or from the
  text read back.

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const decomposed = convertDetailed("ἄνθρωπος", "greek", "greek", {
  greek: { composition: "decomposed" },
});
decomposed.lossy; // → false

const typed = convertDetailed("τί? ναί·", "greek", "greek");
typed.output; // → τί; ναί·
typed.lossy; // → false
```

[Greek output](/reference/greek-unicode/) describes these choices.

## Each preset

A preset combines options, and loses what they lose.
[What each preset loses](/guide/presets/#what-each-preset-loses) compares the
eight presets, and the default, on a monotonic and a polytonic text: the two Beta Code presets
and `bnf-ancient` keep both texts, `iso-843-type-1` keeps the monotonic one, and
`sbl-general` and the ALA-LC presets drop the accents.
