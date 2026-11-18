---
title: "Presets"
description: "The presets that implement published conventions, and how to refine them."
---

A preset bundles the options that implement one published convention, so that
a single name selects a romanization standard or a Beta Code dialect. Your own
options refine it, and each preset states its references and what it leaves
out.

## The presets

Nine presets cover the common library, scholarly, and interchange conventions:

| Preset           | Target          | For                                                                          |
| ---------------- | --------------- | ---------------------------------------------------------------------------- |
| `ala-lc-ancient` | transliteration | Library romanization of Ancient and pre-1454 Medieval Greek                  |
| `ala-lc-modern`  | transliteration | Library romanization of post-1453 Modern Greek, with its contextual digraphs |
| `bnf-core`       | transliteration | BnF/ISO-based romanization for Ancient Greek cataloguing                     |
| `iso-843-type-1` | transliteration | ISO 843 Type 1 transliteration for Ancient and Modern Greek                  |
| `iso-843-type-2` | transliteration | ISO 843 Type 2 transcription, by pronunciation (passports, road signs, maps) |
| `sbl-academic`   | transliteration | Biblical studies, keeping scholarly diacritics; the default transliteration  |
| `sbl-general`    | transliteration | Biblical studies for general readers, without most diacritics                |
| `tlg-core`       | Beta Code       | Uppercase-ASCII TLG Beta Code for polytonic interchange                      |
| `perseus`        | Beta Code       | Lowercase-ASCII Beta Code for Perseus and Morpheus                           |

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
