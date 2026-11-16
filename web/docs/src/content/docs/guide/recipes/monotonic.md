---
title: "Produce monotonic Greek"
description: "Convert polytonic Greek to the monotonic system."
sidebar:
  order: 2
---
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
[Greek accentuation and Unicode](/reference/greek-unicode/#accentuation-systems).
