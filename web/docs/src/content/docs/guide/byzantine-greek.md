---
title: "Byzantine and Medieval Greek"
description: "Convert Byzantine texts: the conventions that cover the period, breathings written before a capital, the lunate sigma, numerals, uncial-style output, signs for several letters, the overline and the expansion of abbreviations, and punctuation."
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
are a matter of usage, which no option supplies: the options write
`Ioannes` and `Theodoros` where the dictionary has John and Theodore. The
_Oxford Classical Dictionary_ does not set out its transliteration either:
its Latinized forms are the traditional English spellings of Greek names
(Aeschylus, Thucydides), and no preset gives them.

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
`῾Ρωμαῖοι` gives `Rhōmaĩoi`, and Greek output writes `Ῥωμαῖοι`. A capital
takes only the marks it can carry: a second breathing or accent, an accent
on a rho, or a circumflex on a short vowel stays a sign (`῾Ἀ`). Elsewhere the
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
Code writes it as the TLG does, `<qs>`. Abbreviations are not expanded (see
[Expanding abbreviations](#expanding-abbreviations)), and an overlined
numeral is read as its letters. `diacritics.overline: "remove"`
removes the line.

```ts
import { convert } from "@humanities/greek-conversion";

convert("θ̅ς̅ κ̅ς̅", "greek", "beta-code"); // → <qs> <ks>
convert("θ̅ς̅", "greek", "greek", { diacritics: { overline: "remove" } });
// → θς
```

### Expanding abbreviations

Expanding a nomen sacrum is an editor's choice rather than a conversion. The
contracted forms are declined (`θ̅ς̅`, `θ̅υ̅`, `θ̅ν̅`) and vary from one
manuscript to another (`ι̅ς̅` or `ι̅η̅ς̅`, `χ̅ς̅` or `χ̅ρ̅ς̅`). Whether the word
takes a capital (`Θεός` or `θεός`) is a choice of the edition. A critical
edition marks the letters it supplies, `θ(εό)ς`, where a normalized text does
not. Some forms are also numerals: `π̅ν̅α̅` is `πνεῦμα`, and the numeral 131.

The [document API](/guide/document/) lets a text be expanded with a table of
the forms it uses. Read the text, replace each overlined run that the table
has with the word, and write the result in any format. A run that the table
does not have, such as the numeral `ι̅β̅`, is kept as it is:

```ts
import {
  type Document,
  encode,
  parse,
  type Token,
} from "@humanities/greek-conversion/document";

// The contracted forms to expand, as the edition writes them in full.
const NOMINA_SACRA = new Map([
  ["θυ", "θεοῦ"],
  ["κυ", "κυρίου"],
  ["ιυ", "Ἰησοῦ"],
  ["χυ", "Χριστοῦ"],
  ["πνα", "πνεῦμα"],
]);

const overlined = (token: Token | undefined) =>
  token?.kind === "grapheme" && token.diacritics.has("overline");

function expand(document: Document): Token[] {
  const expanded: Token[] = [];
  for (let index = 0; index < document.length;) {
    let end = index;
    while (overlined(document[end])) end++;
    if (end === index) {
      expanded.push(document[index++]);
      continue;
    }
    const run = document.slice(index, end);
    const letters = encode(run, "greek", {
      diacritics: { overline: "remove" },
    });
    const word = NOMINA_SACRA.get(letters);
    expanded.push(...(word === undefined ? run : parse(word, "greek")));
    index = end;
  }
  return expanded;
}

const text = "τοῦ κ̅υ̅ ι̅υ̅ χ̅υ̅ καὶ τὸ π̅ν̅α̅ ι̅β̅";
encode(expand(parse(text, "greek")), "transliteration");
// → toũ kyríou Iēsoũ Christoũ kaì tò pneũma i̅b̅
```

A form with an acute on its last syllable, such as `θεός`, takes the grave
before another word, which a table of forms cannot know: write it as the
edition does in running text, or leave the accent to be checked.

## Punctuation and what is outside the library

Byzantine punctuation, such as the hypodiastole `⸒` and the four dots `⁘`, is
copied in Greek and transliteration, and Beta Code writes it with the TLG's
codes, `#532` and `#544`, which it reads back. Musical notation and the
conventions of diplomatic editions are outside the scope of the library.
