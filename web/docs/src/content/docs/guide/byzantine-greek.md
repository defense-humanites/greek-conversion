---
title: "Byzantine and Medieval Greek"
description: "Convert Byzantine texts: the convention that covers the period, the lunate sigma, numerals, uncial-style output, and what is not read yet."
---

Byzantine texts are written in polytonic Greek, and convert as Ancient Greek
does: the same reading, the same presets. This page says which convention
covers the period, shows what matters most for it (the lunate sigma,
numerals, and uncial-style output), and states what the library does not
read yet.

## Choose a convention

The ALA-LC table for Ancient Greek is also that of Medieval Greek, up to 1453:
`ala-lc-ancient` romanizes a Byzantine text for a library catalogue, and
`ala-lc-modern` a text written after that date. The other presets apply as
they do to [Ancient Greek](/guide/ancient-greek/#choose-a-convention); none
is specific to Byzantine studies.

```ts
import { convert } from "@humanities/greek-conversion";

const title = "Ἰωάννης ὁ Χρυσόστομος, Περὶ ἱερωσύνης";

convert(title, "greek", "transliteration", { preset: "ala-lc-ancient" });
// → Iōannēs ho Chrysostomos, Peri hierōsynēs
```

A diaeresis on an initial vowel, as manuscripts and their editions write it,
is kept in every format: `ϊδεῖν` gives `ïdeĩn`, and reads back.

## The lunate sigma

Editions of Byzantine texts and of papyri often print the lunate sigma.
Greek output keeps it where the source has it, Beta Code writes it `s3`, and
`bnf-core` writes it `c`, which reads back. The other transliterations write
`s`, and `convertDetailed()` reports the form as lost
(`removed-glyph-variant`). `greek.sigma` folds it, or writes every sigma
lunate:

```ts
import { convert, reencode } from "@humanities/greek-conversion";

reencode("Χριϲτόϲ", "greek"); // → Χριϲτόϲ
reencode("Χριϲτόϲ", "greek", { greek: { sigma: "standard" } }); // → Χριστός
reencode("Χριστός", "greek", { greek: { sigma: "lunate" } }); // → Χριϲτόϲ

convert("Χριϲτόϲ", "greek", "beta-code"); // → *xris3to/s3
convert("Χριϲτόϲ", "greek", "transliteration", { preset: "bnf-core" });
// → Chrictóc
```

## Numerals and dates

Alphabetic numerals are read with their keraia, stigma, koppa, and sampi
included. The ALA-LC presets write them as numbers, and
`text.numerals: "decimal"` does so under any convention:

```ts
import { convert } from "@humanities/greek-conversion";

const date = "ἔτους ͵ϛφιϛʹ, ἰνδικτιῶνος ιεʹ";

convert(date, "greek", "transliteration", { preset: "ala-lc-ancient" });
// → etous 6516, indiktiōnos 15
```

## Uncial-style output

Capitals, the lunate sigma, the iota written on the line, and no other mark
give Greek in the style of the uncial manuscripts. The shapes of the letters
are a matter of font, and removing the spaces between words is left to the
caller:

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("ἐν ἀρχῇ ἦν ὁ λόγος", "greek", {
  text: { letterCase: "uppercase" },
  diacritics: { all: "remove", iotaSubscript: "preserve" },
  greek: { sigma: "lunate", iotaSubscript: "adscript" },
});
// → ΕΝ ΑΡΧΗΙ ΗΝ Ο ΛΟΓΟϹ
```

## What is not read yet

Some signs of Byzantine manuscripts and of their digitizations are kept but
not interpreted. None is ever dropped: each is copied to the output as it
is, in every format, Beta Code included.

| In the text                                            | Today                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `ϗ`, the abbreviation of καί                           | Copied as it is, not read as the word                                                |
| `ȣ`, the ligature of ου                                | Copied as it is                                                                      |
| `ϛ` inside a word, as the ligature of στ               | Read as the letter stigma: `ἐϛὶ` gives `ec̄ì`                                         |
| A spacing breathing before a capital, as in `῾Ρωμαῖοι` | Copied as a sign of its own; the capital is read without it: `῾Rōmaĩoi`, with no `h` |
| The overline of nomina sacra, as in `θ̅ς̅`               | Copied on the letters as an unknown mark: `th̅s̅`; abbreviations are not expanded      |
| Byzantine punctuation, such as `⸒` and `⁘`             | Copied as it is                                                                      |

A text that writes the breathing before its capital converts as intended
once the two are joined (`Ῥωμαῖοι` gives `Rhōmaĩoi`). Musical notation and
the conventions of diplomatic editions are outside the scope of the library.
