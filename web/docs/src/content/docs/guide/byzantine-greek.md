---
title: "Byzantine and Medieval Greek"
description: "Convert Byzantine texts: the conventions that cover the period, breathings written before a capital, the lunate sigma, numerals, uncial-style output, signs for several letters, the overline, and punctuation."
---

Byzantine texts are written in polytonic Greek, and convert as Ancient Greek
does: the same reading, the same presets. This page says which conventions
cover the period, and shows what matters most for it: breathings written
before a capital, the lunate sigma, numerals, uncial-style output, signs for
several letters, the overline, and punctuation.

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

Byzantinists write names and terms either strictly, as the _Oxford
Dictionary of Byzantium_ (1991) does, or in a Latinized form, as the _Oxford
Classical Dictionary_ does, and the Dumbarton Oaks style guide asks for one
or the other, not a mix. The dictionary publishes no table: its preface says
that Greek terms and most names are strictly transliterated, but keeps a
traditional Latinized or anglicized form for many (Homer, Thebes, Nicaea),
and the anglicized form of first names common in English (John, Nicholas,
Peter). The strict forms that the dictionary is cited for (Alexios
Komnenos, Niketas Choniates) are those of the ALA-LC table without its
length marks, which `longVowels: "omit"` leaves out. The traditional forms
are a matter of usage, which no option supplies: the options write `Ioannes` and `Theodoros`
where the dictionary has John and Theodore. No preset gives the Latinized
forms of the _Oxford Classical Dictionary_.

```ts
import { convert } from "@humanities/greek-conversion";

const strict = {
  preset: "ala-lc-ancient",
  transliteration: { longVowels: "omit" },
} as const;

const names = "Ἀλέξιος Κομνηνός, Νικήτας Χωνιάτης";

convert(names, "greek", "transliteration", strict);
// → Alexios Komnenos, Niketas Choniates
convert("λογοθέτης τοῦ δρόμου", "greek", "transliteration", strict);
// → logothetes tou dromou
```

A diaeresis on an initial vowel, as manuscripts and their editions write it,
is kept in every format: `ϊδεῖν` gives `ïdeĩn`, and reads back.

## Breathings before a capital

Older printed editions, and their digitizations, write the breathing of a
capital before it, as a sign of its own (U+1FBF, U+1FFE, or one of their
compounds with an accent). At the start of a word, before a capital vowel or
rho, the library reads such a breathing, and its accent, as the capital's:
`῾Ρωμαῖοι` gives `Rhōmaĩoi`, and Greek output writes `Ῥωμαῖοι`. Elsewhere the
sign is kept as it is, except a psili after a letter, which is the apostrophe
of an elision: `τ᾿ ἐστί` gives `t’ estí`.

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
included (see
[Punctuation and numerals](/reference/punctuation-and-numerals/#alphabetic-numerals)).
The ALA-LC presets write them as numbers, and `text.numerals: "decimal"` does
so under any convention:

```ts
import { convert } from "@humanities/greek-conversion";

const date = "ἔτους ͵ϛφιϛʹ, ἰνδικτιῶνος ιεʹ";

convert(date, "greek", "transliteration", { preset: "ala-lc-ancient" });
// → etous 6516, indiktiōnos 15
```

## Uncial-style output

Capitals, the lunate sigma, the iota written on the line (see
[Write the iota on the line](/guide/recipes/letters-and-text/#write-the-iota-on-the-line)),
and no other mark give Greek in the style of the uncial manuscripts. The
shapes of the letters are a matter of font, and removing the spaces between
words is left to the caller:

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("ἐν ἀρχῇ ἦν ὁ λόγος", "greek", {
  text: { letterCase: "uppercase" },
  diacritics: { all: "remove", iotaSubscript: "preserve" },
  greek: { sigma: "lunate", iotaSubscript: "adscript" },
});
// → ΕΝ ΑΡΧΗΙ ΗΝ Ο ΛΟΓΟϹ
```

## Signs for several letters

Manuscripts and older printing write some words and pairs of letters with one
sign. The library reads them as the letters they stand for, and Greek output
writes the sign again:

- the καί symbol `ϗ`, read `και`: `ϗ σύ` gives `kai sý`;
- the ου ligature `ȣ`, a Latin letter that editions use for it, read `ου`:
  `ȣ̓κ` gives `ouk`;
- under `greek.stigma: "ligature"`, a stigma between two letters, read `στ`:
  `ἐϛὶ` gives `estì`, where it is otherwise the letter stigma, the numeral
  six (`ec̄ì`).

`greek.ligatures: "standard"` writes the letters in Greek. Beta Code writes the
TLG's codes for `ϗ`, `Ϗ`, and `Ȣ` (`#1532`, `#1531`, `#1521`), and the
letters for the others.

`ϗ` marks no accent, so `και` has none by default. Where the output writes
the letters, `greek.kaiAccent` writes the accent of `καί`: `"byzantine"` the
grave everywhere, as the manuscripts do even before punctuation, and
`"modern"` the acute before punctuation and before an enclitic, as modern
editions do (`καί τινες`, `καὶ τοῦ`). The rules and the cases they leave open
are set out under
[The accent of `καί`](/reference/greek-unicode/#the-accent-of-καί).

```ts
import { convert, reencode } from "@humanities/greek-conversion";

convert("ϗ ȣ̓κ", "greek", "beta-code"); // → #1532 ou)k
reencode("ϗ ȣ̓κ", "greek", { greek: { ligatures: "standard" } });
// → και οὐκ
convert("ἐϛὶ", "greek", "greek", {
  greek: { stigma: "ligature", ligatures: "standard" },
});
// → ἐστὶ
convert("ϗ τινες ϗ τοῦ", "greek", "transliteration", {
  greek: { kaiAccent: "modern" },
});
// → kaí tines kaì toũ
```

## The overline

The line drawn over abbreviations and numerals, as over the nomina sacra, is a
mark of its letters, which every format keeps: `θ̅ς̅` gives `th̅s̅`, and Beta
Code writes it as the TLG does, `<qs>`. Abbreviations are not expanded, and an
overlined numeral is read as its letters. `diacritics.overline: "remove"`
removes the line.

```ts
import { convert } from "@humanities/greek-conversion";

convert("θ̅ς̅ κ̅ς̅", "greek", "beta-code"); // → <qs> <ks>
convert("θ̅ς̅", "greek", "greek", { diacritics: { overline: "remove" } });
// → θς
```

## Punctuation and what is outside the library

Byzantine punctuation, such as the hypodiastole `⸒` and the four dots `⁘`, is
copied in Greek and transliteration, and Beta Code writes it with the TLG's
codes, `#532` and `#544`, which it reads back. Musical notation and the
conventions of diplomatic editions are outside the scope of the library.
