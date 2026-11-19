---
title: "Diacritics and Unicode output"
description: "Remove all or some diacritics, produce monotonic Greek, and choose how Greek is encoded."
sidebar:
  order: 1
---

Three groups of options shape the marks of a text. `diacritics` keeps or
removes each class of mark, in every format; `greek.accentuation` turns
polytonic Greek into monotonic; and the rest of `greek` chooses how Greek
output is encoded in Unicode, without changing what it says. Every option of
both groups, with its values, is in the option reference:
[`diacritics`](/reference/options/#diacritics) and
[`greek`](/reference/options/#greek).

## Remove all or some diacritics

`diacritics` takes a value for each class of mark (`accents`,
`smoothBreathing`, `roughBreathing`, `coronis`, `diaeresis`, `iotaSubscript`,
`quantity`) and `all` for every class at once:

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

In Greek, removing the marks changes nothing else: by default, Greek output
keeps the letter forms the source writes. To also place every sigma by its
position and write the lunate sigma as a standard one:

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("λόγος ϲῶμα ςόσ", "greek", { diacritics: { all: "remove" } });
// → λογος ϲωμα ςοσ
reencode("λόγος ϲῶμα ςόσ", "greek", {
  diacritics: { all: "remove" },
  greek: { sigma: "standard", finalSigma: "contextual" },
});
// → λογος σωμα σος
```

## Produce monotonic Greek

`greek.accentuation: "monotonic"` writes Greek output in the monotonic
system:

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
`ποῦ`, `πῶς`). The rules are applied mechanically from the written text: a
monosyllable by synizesis such as `γιὰ` keeps its accent, and a word of one
vowel loses it even where usage keeps it (`ό,τι`, the abbreviation `κ.ά.`). See
[Greek accentuation and Unicode](/reference/greek-unicode/#accentuation-systems).

## Control Greek Unicode output

The same Greek text can be encoded in more than one way. `greek.composition`
writes precomposed letters or letters followed by combining marks; `acute`
writes an acute as a tonos or as an oxia, where Unicode has both (by default,
an oxia in output that carries a polytonic mark, and a tonos in output that
carries none, as monotonic Greek is typed); and
`questionMark` and `anoTeleia` write the forms Unicode normalization gives
(`;` and `·`, the default) or the Greek punctuation scalars:

```ts
import { reencode } from "@humanities/greek-conversion";

const styled = reencode("ά;", "greek", {
  greek: { acute: "oxia", questionMark: "greek" },
});
[...styled].map((c) => c.codePointAt(0)!.toString(16)); // → ["1f71","37e"]
```

These are representation choices: they never change the text's meaning, and
they are not reported as loss. See
[Greek accentuation and Unicode](/reference/greek-unicode/).
