---
title: "Write the iota on the line"
description: "Write the iota subscript as an adscript, and Greek in the style of the uncials."
sidebar:
  order: 6
---
`greek.iotaSubscript` decides where Greek output writes an iota subscript.
`"subscript"`, the default, writes it below the line, and as the prosgegrammeni
after a capital (`ᾼ`). `"capital-adscript"` writes it on the line after a
capital, as Smyth describes (§ 5), and `"adscript"` after every vowel, as some
editions and papyrological transcriptions do:

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("τῷ ᾠδῷ, ᾨδῇ", "greek", { greek: { iotaSubscript: "capital-adscript" } });
// → τῷ ᾠδῷ, Ὠιδῇ
reencode("τῷ ᾠδῷ, ᾨδῇ", "greek", { greek: { iotaSubscript: "adscript" } });
// → τῶι ὠιδῶι, Ὠιδῆι
```

An iota written on the line reads back as the letter iota, so
`convertDetailed()` reports the loss of the subscript (`removed-diacritic`).

Greek in the style of the uncial manuscripts combines it with capitals, the
lunate sigma, and no other mark. The shapes of the uncial letters are a matter
of font, and removing the spaces between words is left to the caller:

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("τῷ λόγῳ ἐστὶν ἀγαθός", "greek", {
  text: { letterCase: "uppercase" },
  diacritics: { all: "remove", iotaSubscript: "preserve" },
  greek: { sigma: "lunate", iotaSubscript: "adscript" },
});
// → ΤΩΙ ΛΟΓΩΙ ΕϹΤΙΝ ΑΓΑΘΟϹ
```
