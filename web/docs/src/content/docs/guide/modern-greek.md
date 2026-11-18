---
title: "Modern Greek"
description: "Romanize Modern Greek names and texts after ISO 843, ELOT 743, or ALA-LC, read them back, and turn polytonic text into monotonic."
---

greek-conversion reads monotonic Greek, the official orthography since 1982,
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

[What each preset loses](/guide/presets/#what-each-preset-loses) compares
them, with the other presets, on a monotonic text. Without a preset, the
transliteration is the SBL academic style, made for Ancient Greek: it writes `Eleuthérios Benizélos`, with `b` for beta, and reads
a word-initial vowel back with a breathing (`Ἐλευθέριος`).

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
writes, and a monosyllable loses its accent. The count is mechanical: on text
that is already monotonic, it takes the accent of `ό,τι`, of the abbreviation
`κ.ά.`, and of `20ός`. To read Latin script back without touching its
accents, ask only for no breathing:

```ts
import { convert } from "@humanities/greek-conversion";

const latin = "ó,ti eípe ē Athēná, k.á.";

convert(latin, "transliteration", "greek", {
  greek: { accentuation: "monotonic" },
});
// → ο,τι είπε η Αθηνά, κ.α.

convert(latin, "transliteration", "greek", {
  diacritics: { smoothBreathing: "remove" },
});
// → ό,τι είπε η Αθηνά, κ.ά.
```

## From polytonic to monotonic

Greek printed before 1982 is usually polytonic, and
`greek.accentuation: "monotonic"` turns it into monotonic Greek, as
[Produce monotonic Greek](/guide/recipes/diacritics-and-unicode/#produce-monotonic-greek)
explains. Romanized as it is, a polytonic text keeps its marks, since Type 2
follows Table 3 of ISO 843 for them. The BGN/PCGN rules keep only the stress,
written as an acute; converting the text to monotonic first gives that:

```ts
import { convert, reencode } from "@humanities/greek-conversion";

const options = { preset: "iso-843-type-2" } as const;
const name = "Ἐθνικὸν Μετσόβιον Πολυτεχνεῖον";

convert(name, "greek", "transliteration", options);
// → ’Ethnikòn Metsóvion Polytechneîon

const monotonic = reencode(name, "greek", {
  greek: { accentuation: "monotonic" },
});
monotonic; // → Εθνικόν Μετσόβιον Πολυτεχνείον
convert(monotonic, "greek", "transliteration", options);
// → Ethnikón Metsóvion Polytechneíon
```

## Search keys and URL slugs

Removing every mark and setting the case gives a key that matches a name
whatever its accents and case. Through Type 2, the same options write the name
in plain Latin letters, as a URL can carry it:

```ts
import { convert, reencode } from "@humanities/greek-conversion";

const key = {
  diacritics: { all: "remove" },
  text: { letterCase: "lowercase" },
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
  reversible version, given in Annex B of ISO 843, which marks the letters
  that Type 2 merges. No preset implements it.

Each preset lists its references and its limits in the
[preset reference](/reference/presets/).
