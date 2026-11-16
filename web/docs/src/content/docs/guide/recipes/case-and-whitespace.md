---
title: "Normalize case and whitespace"
description: "Change the letter case and collapse whitespace."
sidebar:
  order: 7
---
```ts
import { convert } from "@humanities/greek-conversion";

convert("  ΦΙΛΗΒΟΣ\nΗΔΟΝΗ  ", "greek", "transliteration", {
  text: { letterCase: "lowercase", whitespace: "collapse" },
});
// → philēbos ēdonē
```

`letterCase` accepts `"preserve"`, `"lowercase"`, `"uppercase"`, and `"title"`,
under which an apostrophe between two letters, as a coronis written so
(`Ka’gṓ`), does not start a word; `whitespace: "collapse"` trims the text and
reduces every run of whitespace to one space.

Under `"preserve"`, a capital spelled with several Latin letters is written in
full capitals among capitals, and with its first letter only before lowercase
text, which ISO 843 allows (note 11). The same holds for the `h` of a rough
breathing or of rho. A capital consonant on its own, such as a letter name, a
numeral, or a siglum, is written in full capitals too, except before a period,
where it is an abbreviated initial. A vowel with a rough breathing can be a word
on its own, such as the article at the head of a sentence, and keeps its first
letter only:

```ts
import { convert } from "@humanities/greek-conversion";

convert("ΘΑΛΑΣΣΑ ἙΛΛΑΣ ΠΥΡΡΟΣ", "greek", "transliteration");
// → THALASSA HELLAS PYRRHOS
convert("Θάλασσα Ἑλλάς Θ.", "greek", "transliteration");
// → Thálassa Hellás Th.
convert("Θ, θ (θῆτα). Ὁ δὲ", "greek", "transliteration");
// → TH, th (thē̃ta). Ho dè
```
