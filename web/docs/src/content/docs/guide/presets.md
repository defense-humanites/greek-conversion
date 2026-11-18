---
title: "Choosing a preset"
description: "The presets that implement published conventions, what each one loses, and how to refine them."
---

A preset bundles the options that implement one published convention, so that
a single name selects a romanization standard or a Beta Code dialect. This
page lists the nine presets, compares how each one writes Greek and what it
loses, and shows how your own options refine one; each preset states its references and what it leaves
out.

## The presets

Nine presets cover the common library, scholarly, and interchange conventions:

| Preset           | Target          | Greek           | For                                                                         |
| ---------------- | --------------- | --------------- | --------------------------------------------------------------------------- |
| `ala-lc-ancient` | transliteration | Ancient         | Library romanization, Medieval Greek included (before 1454)                 |
| `ala-lc-modern`  | transliteration | Modern          | Library romanization after 1453, with its contextual digraphs               |
| `bnf-core`       | transliteration | Ancient         | BnF/ISO-based romanization for cataloguing                                  |
| `iso-843-type-1` | transliteration | Ancient, Modern | Strict transliteration, reversible for monotonic text; also ELOT 743        |
| `iso-843-type-2` | transliteration | Modern          | Transcription by pronunciation, as ELOT 743: passports, road signs, maps    |
| `sbl-academic`   | transliteration | Ancient         | Biblical studies, keeping scholarly diacritics; the default transliteration |
| `sbl-general`    | transliteration | Ancient         | Biblical studies for general readers, without most diacritics               |
| `tlg-core`       | Beta Code       | Ancient         | Uppercase-ASCII TLG Beta Code for polytonic interchange                     |
| `perseus`        | Beta Code       | Ancient         | Lowercase-ASCII Beta Code for Perseus and Morpheus                          |

Select one with `preset`:

```ts
import { convert } from "@humanities/greek-conversion";

convert("Φίληβος ἢ Περὶ ἡδονῆς", "greek", "transliteration", {
  preset: "ala-lc-ancient",
});
// → Philēbos ē Peri hēdonēs

convert("Βίος Μπάλα", "greek", "transliteration", {
  preset: "ala-lc-modern",
});
// → Vios Bala

convert("Εύβοια, Ευρώπη, αυτός", "greek", "transliteration", {
  preset: "iso-843-type-2",
});
// → Évvoia, Evrópi, aftós
```

Type 2 follows pronunciation and is not reversible: `convertDetailed()` reports
what it loses, such as eta written `i` or the upsilon of `ευ` written `v`.
[What each preset loses](#what-each-preset-loses) compares the nine on a
monotonic and a polytonic text, and the pages on
[Ancient](/guide/ancient-greek/),
[Byzantine and Medieval](/guide/byzantine-greek/), and
[Modern Greek](/guide/modern-greek/) say which ones apply to each.

## How each preset writes Greek

The conventions differ on a few letters, on the vowel pairs with upsilon, on
the digraphs of Modern Greek, and on the marks they keep. These tables give
what each transliteration preset returns; the two Beta Code presets write the
same codes, `tlg-core` in capitals and `perseus` in lowercase, but for yot
(`#401` and `j`).

<!-- BEGIN GENERATED PRESET COMPARISON -->
<!-- This section is generated. Do not edit it directly. -->

**Letters**

| Preset | `β` | `η` | `υ` | `φ` | `χ` | `ω` |
| --- | --- | --- | --- | --- | --- | --- |
| `ala-lc-ancient` | `b` | `ē` | `y` | `ph` | `ch` | `ō` |
| `ala-lc-modern` | `v` | `ē` | `y` | `ph` | `ch` | `ō` |
| `bnf-core` | `b` | `ē` | `y` | `ph` | `ch` | `ō` |
| `iso-843-type-1` | `v` | `ī` | `y` | `f` | `ch` | `ō` |
| `iso-843-type-2` | `v` | `i` | `y` | `f` | `ch` | `o` |
| `sbl-academic`, the default | `b` | `ē` | `y` | `ph` | `ch` | `ō` |
| `sbl-general` | `b` | `ē` | `y` | `ph` | `ch` | `ō` |

**Vowel pairs with upsilon**

| Preset | `αυτός` | `ευχή` | `ούτε` |
| --- | --- | --- | --- |
| `ala-lc-ancient` | `autos` | `euchē` | `oute` |
| `ala-lc-modern` | `autos` | `euchē` | `oute` |
| `bnf-core` | `autós` | `euchḗ` | `oúte` |
| `iso-843-type-1` | `autós` | `euchī́` | `oúte` |
| `iso-843-type-2` | `aftós` | `efchí` | `oúte` |
| `sbl-academic`, the default | `autós` | `euchḗ` | `oúte` |
| `sbl-general` | `autos` | `euchē` | `oute` |

**Gamma before a velar, and the digraphs of Modern Greek**

| Preset | `άγγελος` | `αγκαλιά` | `μπαμπάς` | `ντομάτα` |
| --- | --- | --- | --- | --- |
| `ala-lc-ancient` | `angelos` | `ankalia` | `mpampas` | `ntomata` |
| `ala-lc-modern` | `angelos` | `ankalia` | `bampas` | `d̲omata` |
| `bnf-core` | `ángelos` | `ankaliá` | `mpampás` | `ntomáta` |
| `iso-843-type-1` | `ággelos` | `agkaliá` | `mpampás` | `ntomáta` |
| `iso-843-type-2` | `ángelos` | `agkaliá` | `bampás` | `ntomáta` |
| `sbl-academic`, the default | `ángelos` | `ankaliá` | `mpampás` | `ntomáta` |
| `sbl-general` | `angelos` | `ankalia` | `mpampas` | `ntomata` |

**Breathings, iota subscript, and accents**

| Preset | `ἁ` | `ἀ` | `ᾳ` | `ά` | `ῶ` |
| --- | --- | --- | --- | --- | --- |
| `ala-lc-ancient` | `ha` | `a` | `a` | `a` | `ō` |
| `ala-lc-modern` | `ha` | `a` | `a` | `a` | `ō` |
| `bnf-core` | `ha` | `a̓` | `a̧` | `á` | `ō̂` |
| `iso-843-type-1` | `ha` | `’a` | `a̧` | `á` | `ō̂` |
| `iso-843-type-2` | `ha` | `’a` | `a̧` | `á` | `ô` |
| `sbl-academic`, the default | `ha` | `a` | `a̧` | `á` | `ō̃` |
| `sbl-general` | `ha` | `a` | `a` | `a` | `ō` |

<!-- END GENERATED PRESET COMPARISON -->

Every key behind these spellings, with its values and the presets that select
each, is in the [option reference](/reference/options/).

## What each preset loses

A convention that drops marks or merges letters does not convert back to the
Greek it was given. The table says what `convertDetailed()` reports as lost
when each preset writes two reference texts, one monotonic and one polytonic.
It is computed from the library, and covers these two texts only: a letter
form such as `ϐ`, or a hiatus marked by a breathing alone, adds losses of its
own (see [Knowing what a conversion loses](/guide/losses/)).

<!-- BEGIN GENERATED LOSS PROFILE -->
<!-- This section is generated. Do not edit it directly. -->

- Monotonic: Η Αθήνα είναι η πρωτεύουσα της Ελλάδας· ο Ταΰγετος, το προϊόν, ευχαριστώ, αυτός, άγγελος, μπαμπάς.
- Polytonic: Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν· Ῥόδος, ᾠδή, εὖ, ἄϋλος, κἀγώ.

| Preset | Lost from the monotonic text | Lost from the polytonic text |
| --- | --- | --- |
| `ala-lc-ancient` | Accents; diaeresis | Accents; smooth breathing; iota subscript; coronis |
| `ala-lc-modern` | Accents; diaeresis | Accents; smooth breathing; iota subscript; coronis |
| `bnf-core` | Nothing | Nothing |
| `iso-843-type-1` | Nothing | Smooth breathing; coronis |
| `iso-843-type-2` | The letters eta, omega, upsilon | The letters eta, omega; smooth breathing; coronis |
| `perseus` | Nothing | Nothing |
| `sbl-academic`, the default | The absence of a breathing | Coronis |
| `sbl-general` | Accents | Accents; smooth breathing; iota subscript; coronis |
| `tlg-core` | Nothing | Nothing |

<!-- END GENERATED LOSS PROFILE -->

"Nothing" means that the output converts back to the same text under the same
preset. Among the transliterations, `bnf-core` converts both texts back, and
`iso-843-type-1` the monotonic one: on polytonic text, it writes the smooth
breathing as an apostrophe, which does not read back as a breathing.

## Refine a preset

Your own options override only the fields they name; the rest of the preset
stays in force. Defaults apply first, then the preset, then your options:

```ts
import { convert } from "@humanities/greek-conversion";

convert("Βίος Μπάλα", "greek", "transliteration", {
  preset: "ala-lc-modern",
  transliteration: { beta: "b" },
});
// → Bios Bala
```

## References and limits

Each preset documents its references, its coverage, and what it does not
implement, both in the
[preset reference](/reference/presets/)
and at run time:

```ts
import {
  DEFAULT_CONVERSION_OPTIONS,
  getPresetMetadata,
  resolveConversionOptions,
} from "@humanities/greek-conversion";

getPresetMetadata("bnf-core").coverage; // → partial
DEFAULT_CONVERSION_OPTIONS.transliteration.longVowels; // → macron
resolveConversionOptions({ preset: "sbl-general" }).diacritics.accents;
// → remove
```

A preset implements what can be done mechanically from the text. It does not
supply a rough breathing missing from the source, or anything else that needs a
dictionary; the
[preset behavior audit](/reference/preset-behavior-audit/)
lists those limits for each standard.
