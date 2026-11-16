---
title: "Remove all or some diacritics"
description: "Remove every diacritic, or only some classes, in any format."
sidebar:
  order: 1
---
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
