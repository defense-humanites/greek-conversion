---
title: "Restyle a transliteration"
description: "Rewrite a transliteration from one convention into another."
sidebar:
  order: 4
---
In a conversion that keeps the format, the options describe the input as well
as the output: `reencode()` normalizes a text in its own style. Reading
transliteration depends on its options, so to change the style of a
transliteration, say how it is written with `source`:

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("tōn barbarōn", "transliteration", {
  preset: "ala-lc-modern",
  source: { preset: "sbl-academic" },
});
// → tōn varvarōn

reencode("phílos", "transliteration", {
  transliteration: { phi: "f" },
  source: {},
});
// → fílos
```

`source: {}` is the default style. Without `source`, the first call reads `b`
as μπ, as ALA-LC Modern does, and gives `tōn barmparōn`, and the second reads
`ph` as pi and a rough breathing, and changes nothing. `source` takes the
options of a conversion and replaces them all for reading: the other options,
`greek.accentuation` and `diacritics` included, only write the output. It works
with every function that reads text: `convertDetailed()` reports what the new
style loses, and between two formats, `source` describes the input apart from
the output. A restyle cannot restore what the source style does not note: the
default style writes no coronis.
