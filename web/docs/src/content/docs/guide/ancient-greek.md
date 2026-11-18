---
title: "Ancient Greek"
description: "Convert polytonic Greek to and from Beta Code and the scholarly and library romanizations, and know which of them convert back."
---

greek-conversion was first written for Ancient Greek. It reads polytonic
Greek with its accents, breathings, iota subscripts, coronides, and quantity
marks, and writes it in Beta Code or after the romanizations that classicists
and libraries use. This page helps you choose a convention, says which ones
convert back, and gathers the tasks proper to ancient texts.

## What is read

Polytonic Greek is read from Unicode, composed or decomposed, and from Beta
Code as the TLG and Perseus write it. Besides the twenty-four letters, the
library knows digamma, yot, stigma, the two koppas, and sampi; the lunate
sigma and the symbol forms such as `ϐ` and `ϑ`, which it reads as their
letters; Greek punctuation; and the alphabetic numerals that a keraia marks.

```ts
import { convert } from "@humanities/greek-conversion";

convert("mh=nin a)/eide qea/", "beta-code", "greek"); // → μῆνιν ἄειδε θεά
convert("ϝάναξ ϙόρινθος", "greek", "transliteration"); // → wánax ḳórinthos
```

## Choose a convention

| To write                                                 | Preset                      | `εὐχῇ`     |
| -------------------------------------------------------- | --------------------------- | ---------- |
| A scholarly transliteration, with accents and length     | `sbl-academic`, the default | `euchȩ̄̃`    |
| A transliteration for general readers, without accents   | `sbl-general`               | `euchē`    |
| Library catalogue records, after the Library of Congress | `ala-lc-ancient`            | `euchē`    |
| Catalogue records of French libraries, after the BnF     | `bnf-core`                  | `eu̓chȩ̄̂`    |
| The international transliteration, ISO 843               | `iso-843-type-1`            | `’euchī̧̂`   |
| Beta Code as the TLG writes it                           | `tlg-core`                  | `EU)XH=\|` |
| Beta Code for Perseus and Morpheus                       | `perseus`                   | `eu)xh=\|` |

```ts
import { convert } from "@humanities/greek-conversion";

const iliad = "μῆνιν ἄειδε θεὰ Πηληϊάδεω Ἀχιλῆος";

convert(iliad, "greek", "transliteration");
// → mē̃nin áeide theà Pēlēïádeō Achilē̃os

convert(iliad, "greek", "transliteration", { preset: "ala-lc-ancient" });
// → mēnin aeide thea Pēlēiadeō Achilēos

convert(iliad, "greek", "beta-code", { preset: "tlg-core" });
// → MH=NIN A)/EIDE QEA\ *PHLHI+A/DEW *)AXILH=OS
```

Every convention is read as it is written: give the same preset to convert
its output back to Greek. Each preset states its references and what it does
not implement in the [preset reference](/reference/presets/).

## What converts back

Beta Code notes every mark of polytonic Greek: its output converts back to
the same text, the symbol forms apart. The transliterations differ:

- the default, `sbl-academic`, writes no smooth breathing and reads one back
  on an initial vowel, so that it converts back but for the coronis and the
  few spellings listed under [Limits](#limits);
- `bnf-core` writes the smooth breathing and the coronis as marks of their
  own, which read back;
- `iso-843-type-1` writes the smooth breathing as an apostrophe, which does
  not read back as a breathing;
- `sbl-general` and `ala-lc-ancient` drop the accents and most other marks,
  as their conventions ask.

[What each preset loses](/guide/presets/#what-each-preset-loses) compares
them on a reference text, and `convertDetailed()` reports the losses of your
own. A crasis, for example, loses its coronis by default, and keeps it under
`coronis: "greek"`:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const crasis = "κἀγὼ τοὔνομα";

const plain = convertDetailed(crasis, "greek", "transliteration");
plain.output; // → kagṑ toúnoma
plain.losses.map((loss) => loss.diacritic); // → ["coronis","coronis"]

const marked = convertDetailed(crasis, "greek", "transliteration", {
  transliteration: { coronis: "greek" },
});
marked.output; // → ka᾽gṑ toú᾽noma
marked.lossy; // → false
```

## Tasks proper to ancient texts

- **Elision.** Greek output keeps an elided consonant as the source writes
  it (`ἀπ’ οὗ`), and aspirates it on demand: see
  [Aspirate an elided consonant](/guide/recipes/letters-and-text/#aspirate-an-elided-consonant).
- **Iota adscript.** To write `τῶι` for `τῷ`, or `Ὠιδῇ` after a capital, see
  [Write the iota on the line](/guide/recipes/letters-and-text/#write-the-iota-on-the-line).
- **Letter forms.** The lunate sigma, `ϐ`, and `ϑ` are kept in Greek output
  and can be folded: see
  [Keep or fold letter variants](/guide/recipes/letters-and-text/#keep-or-fold-letter-variants).
- **Beta Code.** For capitals, quantity, and the TLG's codes, see
  [Write Beta Code the TLG way](/guide/recipes/transliteration-and-beta-code/#write-beta-code-the-tlg-way).
- **Numerals.** `text.numerals: "decimal"` writes a marked alphabetic numeral
  as a number, as the ALA-LC presets do;
  [Punctuation and numerals](/reference/punctuation-and-numerals/#alphabetic-numerals)
  says what is read as one:

```ts
import { convert } from "@humanities/greek-conversion";

convert("βιβλίον γʹ, ἔτος ͵αωκαʹ", "greek", "transliteration", {
  text: { numerals: "decimal" },
});
// → biblíon 3, étos 1821
```

## Limits

- **What the text does not write.** A breathing left out, as in capitals, is
  not supplied: under `ala-lc-ancient`, `ΗΣΙΟΔΟΥ` gives `ĒSIODOU`, where the
  table expects `Hēsiodou`.
- **A hiatus marked by a breathing alone.** `Ἀίδης` is transliterated
  `Aídēs`, which reads back as the diphthong of `Αἴδης`; the loss is reported
  (`displaced-diacritic`), and `bnf-core` keeps the distinction.
- **Symbol forms in Beta Code.** Beta Code notes the lunate sigma, but not
  `ϐ` or `ϑ`, which convert back as `β` and `θ`.
- **Greek mixed with another language.** The whole text is converted: see
  [Text in another language](/guide/losses/#text-in-another-language).
