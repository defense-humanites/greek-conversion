---
title: "Modern Greek"
description: "Romanize Modern Greek names and texts after ISO 843, ELOT 743, or ALA-LC, read them back, and turn polytonic text into monotonic."
---

The library reads monotonic Greek, the official orthography since 1982,
as it reads polytonic: the tonos is an acute accent, the dialytika a
diaeresis. Three presets romanize Modern Greek after the conventions in use
today: for identity documents and maps, for a strict transliteration, and for
library catalogues. This page helps you choose one, and shows the options that
complete them.

## Choose a convention

| To write                                                 | Preset           | `Ευρώπη` |
| -------------------------------------------------------- | ---------------- | -------- |
| Names as passports, road signs, and maps write them      | `iso-843-type-2` | `Evrópi` |
| A transliteration that converts back without loss        | `iso-843-type-1` | `Eurṓpī` |
| Library catalogue records, after the Library of Congress | `ala-lc-modern`  | `Eurōpē` |

```ts
import { convert } from "@humanities/greek-conversion";

convert("Ελευθέριος Βενιζέλος", "greek", "transliteration", {
  preset: "iso-843-type-2",
});
// → Elefthérios Venizélos
```

[What each preset loses](/guide/presets/#what-each-preset-loses) compares them,
with the other presets, on a monotonic text. Without a preset, the
transliteration is the library's own, made for Ancient Greek: it writes
`Eleuthérios Benizélos`, with `b` for beta, and reads a word-initial vowel back
with a breathing (`Ἐλευθέριος`).

## Names, passports, and maps

ISO 843 Type 2 transcribes Greek as it is pronounced. It writes eta `i` and
omega `o`; the upsilon of `αυ`, `ευ`, and `ηυ` `v` or `f`, after the sound that
follows; `μπ` `b` at either end of a word; and `γγ` `ng`. The accent stays, on
the vowel before a `v` or `f`:

```ts
import { convert } from "@humanities/greek-conversion";

const places = "Ναύπλιο, Χαραυγή, Μπέχρος, Λαγκάδα, Ταΰγετος";

convert(places, "greek", "transliteration", { preset: "iso-843-type-2" });
// → Náfplio, Charavgí, Béchros, Lagkáda, Taÿ́getos

convert("Ελευθέριος Βενιζέλος", "greek", "transliteration", {
  preset: "iso-843-type-2",
  diacritics: { all: "remove" },
  text: { letterCase: "uppercase" },
});
// → ELEFTHERIOS VENIZELOS
```

The second call writes the name as a passport does, in capitals and without
accents. This transcription is that of ELOT 743, the Greek national standard,
in force in Greece and Cyprus. The United Nations adopted it for geographical
names in 1987, and so did BGN/PCGN, the boards that set the spelling of
foreign place names in the United States and the United Kingdom, in 1996. The
preset gives the romanization of every example of the BGN/PCGN table, as the
[conformance corpus](/reference/preset-conformance-corpus/) checks.

A transcription cannot be reversed: eta, iota, and the pairs `ει` and `οι`
sound alike, and `Thessaloníki` does not say which one it was.
`convertDetailed()` reports what is lost:

```ts
import { convert, convertDetailed } from "@humanities/greek-conversion";

const options = { preset: "iso-843-type-2" } as const;
const city = convertDetailed(
  "Θεσσαλονίκη",
  "greek",
  "transliteration",
  options,
);

city.output; // → Thessaloníki
city.lossy; // → true
city.losses[0].message; // → The target representation does not retain eta.
convert(city.output, "transliteration", "greek", options); // → Θεσσαλονίκι
```

## A reversible transliteration

ISO 843 Type 1 gives each letter and mark a spelling of its own, such as `ī`
for eta, `ō` for omega, and `au` for `αυ`, so that its output converts back to
the same Greek. It is also the transliteration of ELOT 743 since its 2001
edition.

```ts
import { convert } from "@humanities/greek-conversion";

const options = { preset: "iso-843-type-1" } as const;
const latin = convert(
  "Η Αθήνα είναι η πρωτεύουσα",
  "greek",
  "transliteration",
  options,
);

latin; // → Ī Athī́na eínai ī prōteúousa
convert(latin, "transliteration", "greek", options);
// → Η Αθήνα είναι η πρωτεύουσα
```

## Read Latin script back as monotonic Greek

Reading transliteration infers a smooth breathing on a word-initial vowel that
has no `h`, as polytonic Greek writes it. `greek.accentuation: "monotonic"`
reads and writes monotonic Greek, which has no breathings:

```ts
import { convert } from "@humanities/greek-conversion";

convert("Ē Athḗna eínai ē prōteúousa", "transliteration", "greek");
// → Ἠ Ἀθήνα εἴναι ἠ πρωτεύουσα

convert("Ē Athḗna eínai ē prōteúousa", "transliteration", "greek", {
  greek: { accentuation: "monotonic" },
});
// → Η Αθήνα είναι η πρωτεύουσα
```

The three Modern Greek presets need no option: they infer no breathing.
Greek output that carries no polytonic mark is written with the tonos, as
monotonic Greek is typed, so that a text converts back to itself code point
for code point.

`accentuation: "monotonic"` also applies the monotonic rules to what it
writes: a monosyllable loses its accent, except `ή`, `πού`, and `πώς`, a
weak pronoun that an author accents to avoid ambiguity (`μού`), a word that
elision made a monosyllable (`δείξ’ το`), and those that abbreviate a longer
word (`ό,τι`, `κ.ά.`, `20ός`). Monotonic Latin script therefore reads back
with its accents:

```ts
import { convert } from "@humanities/greek-conversion";

convert("o patéras moú eípe ó,ti xérei", "transliteration", "greek", {
  greek: { accentuation: "monotonic" },
});
// → ο πατέρας μού είπε ό,τι ξέρει
```

## From polytonic to monotonic

Greek printed before 1982 is usually polytonic, and
`greek.accentuation: "monotonic"` turns it into monotonic Greek, as
[Produce monotonic Greek](/guide/recipes/diacritics-and-unicode/#produce-monotonic-greek)
explains. Romanized as it is, a polytonic text keeps its marks, since Type 2
follows Table 3 of ISO 843 for them. The BGN/PCGN rules keep only the stress,
written as an acute, which monotonic accentuation gives in every format:

```ts
import { convert } from "@humanities/greek-conversion";

const name = "Ἐθνικὸν Μετσόβιον Πολυτεχνεῖον";

convert(name, "greek", "transliteration", { preset: "iso-843-type-2" });
// → ’Ethnikòn Metsóvion Polytechneîon

convert(name, "greek", "transliteration", {
  preset: "iso-843-type-2",
  greek: { accentuation: "monotonic" },
});
// → Ethnikón Metsóvion Polytechneíon
```

A polytonic transliteration converts the same way, in the style it is
written in. ISO 843 writes the smooth breathing as an apostrophe before the
vowel group of a word, which reads back as the breathing:

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("’Ethnikòn Metsóvion Polytechneîon", "transliteration", {
  preset: "iso-843-type-2",
  greek: { accentuation: "monotonic" },
});
// → Ethnikón Metsóvion Polytechneíon
```

## Text in capitals

Greek sets words in capitals without accents, but for the disjunctive `ή`,
and writes a diaeresis where the accent showed a hiatus. Greek output does
so by default, as `toLocaleUpperCase("el")` does:

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("Αθήνα ή Πάτρα, Μάιος", "greek", {
  text: { letterCase: "uppercase" },
});
// → ΑΘΗΝΑ Ή ΠΑΤΡΑ, ΜΑΪΟΣ
```

A capital that begins a word in small letters keeps its accent (`Έλληνας`),
and Beta Code and transliteration keep the marks of capitals.
`greek.capitalMarks: "preserve"` writes the marks of words in capitals as
well. See
[Marks in capitals](/reference/greek-unicode/#marks-in-capitals).

## Search keys and URL slugs

A search key matches a name whatever its accents, its case, and the forms of
its letters, as
[Build a search key](/guide/recipes/letters-and-text/#build-a-search-key)
explains. Through Type 2, the same options write the name in plain Latin
letters, as a URL can carry it:

```ts
import { convert, reencode } from "@humanities/greek-conversion";

const key = {
  diacritics: { all: "remove" },
  text: { letterCase: "lowercase" },
  greek: {
    sigma: "standard",
    finalSigma: "medial",
    medialBeta: "standard",
    symbolForms: "standard",
  },
} as const;

reencode("ΘΕΣΣΑΛΟΝΙΚΗ", "greek", key); // → θεσσαλονικη
reencode("Θεσσαλονίκη", "greek", key); // → θεσσαλονικη

convert("Άγιος Νικόλαος, Κρήτη", "greek", "transliteration", {
  preset: "iso-843-type-2",
  ...key,
}).replace(/[^a-z0-9]+/g, "-");
// → agios-nikolaos-kriti
```

## Limits

A preset applies its rules to the text it is given, and some rules need more:

- **Punctuation and numerals.** The Greek question mark `;` is written `?`
  in Latin script, and a `?` typed in Greek text is read as one. A numeral
  is read with a keraia, or with the tonos that the Greek keyboard types for
  it (`Β΄ Παγκόσμιος` gives `2 Pankosmios`), which Greek output keeps. The
  same sign typed for an apostrophe after a consonant alone stays one
  (`σ΄ αγαπώ`), and so does a numeral of one such letter before a word with
  a vowel (`Θ΄ αιώνας`), which the keraia `ʹ` writes. See
  [Punctuation and numerals](/reference/punctuation-and-numerals/).
- **Stress in capitals.** Monotonic Greek writes no accent on capitals, and
  the preset cannot tell where the stress falls: `ΑΘΗΝΑ` gives `ATHINA`.
  BGN/PCGN asks for the stress all the same (`ATHÍNA`), which takes a
  dictionary.
- **Rough breathing.** Monotonic Greek has no rough breathing, and ALA-LC
  supplies none: `Ελληνική` gives `Ellēnikē`, as the table asks. In a
  polytonic text, the table has the `h` supplied where the breathing is left
  out, as in capitals; that takes knowledge of the word, and the preset
  writes an `h` only where the source marks the breathing. See the
  [ALA-LC corpus](/reference/ala-lc-conformance-corpus/).
- **The reversible UN system.** The United Nations system also has a
  reversible version, given in Annex B of ISO 843, which marks with a macron
  below the letters that Type 2 merges: eta `i̠`, omega `o̠`, and the `v` or
  `f` of `αυ`, `ευ`, and `ηυ` (`av̠`, `ef̠`). No preset implements it.

Each preset lists its references and its limits in the
[preset reference](/reference/presets/).
