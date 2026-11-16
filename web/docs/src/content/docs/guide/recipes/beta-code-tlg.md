---
title: "Write Beta Code the TLG way"
description: "Read and write Beta Code by the conventions of the TLG."
sidebar:
  order: 8
---
ASCII letter case carries no meaning in Beta Code input: only `*` marks a
capital. Output follows the
[TLG placement rules](https://stephanus.tlg.uci.edu/encoding.php): breathing,
accent, then iota subscript, with the asterisk and marks before an uppercase
letter. Vowel quantity takes the TLG percent codes, `%26` for the macron and
`%27` for the breve, after the accent. As in the TLG, `'` is the apostrophe,
`[1` and `]1` are the parentheses (`(` and `)` being the breathings), and `&`, a
shift to the Latin font, is kept as text.

```ts
import { convert } from "@humanities/greek-conversion";

convert("A)/NQRWPOS", "beta-code", "greek"); // → ἄνθρωπος
convert("*)/ANQRWPOS", "beta-code", "greek"); // → Ἄνθρωπος
convert("ᾯ", "greek", "beta-code"); // → *(=w|
convert("ᾱ ᾰ", "greek", "beta-code"); // → a%26 a%27
convert("δῆσε(ν)", "greek", "beta-code"); // → dh=se[1n]1
convert("ἄνθρωπος", "greek", "beta-code", { preset: "tlg-core" }); // → A)/NQRWPOS
```

`betaCode.case` selects lowercase or uppercase ASCII, and `betaCode.yot: "#401"`
writes yot with its TLG code instead of `j`.
