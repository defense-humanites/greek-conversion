# Preset reference

A preset is a named, coherent set of ordinary `ConversionOptions`. Presets do
not introduce a separate conversion path: they are resolved before parsing and
encoding, and `convertDetailed()` observes the same information loss as if the
resolved options had been supplied individually.

```ts
import { convert } from "@humanities/greek-conversion";

convert("Βίος Μπάλα", "greek", "transliteration", {
  preset: "ala-lc-modern",
});
// → Vios Bala
```

Custom options can refine or override a preset. Resolution is recursive for
the `transliteration`, `greek`, `betaCode`, `text`, and `diacritics` groups,
and `diacritics.all` is expanded where it is written, so the caller's `all`
overrides every class a preset set:

```ts
import { convert } from "@humanities/greek-conversion";

convert("Βίος Μπάλα", "greek", "transliteration", {
  preset: "ala-lc-modern",
  diacritics: { accents: "preserve" },
  text: { letterCase: "uppercase" },
});
// → VÍOS BÁLA
```

The precedence is always:

```text
engine defaults < preset < custom options
```

An option only acts in the phases and output formats where it normally applies.
For example, ALA-LC letter spellings affect transliteration, while its numeral
policy can affect every output. This direction-dependent behavior is identical
to activating the same options manually.

Coverage labels describe the relationship between the implementation and its
references: `complete` implements every in-scope rule expressible by the
engine, `partial` implements a documented subset, `adapted` intentionally
defines a library profile from the reference, and `planned` identifies a
profile whose implementation is not complete. None of these labels is an
independent certification of conformity. In particular, accepting characters
beyond a reference's repertoire does not make an otherwise complete preset
partial.

`outOfScopeBehavior` states what happens to recognized content beyond the
cited repertoire. `engine-default` applies the ordinary conversion rules and
therefore does not enforce the reference as a strict validator; `preserve` and
`reject` describe profiles that respectively retain or refuse such content.

These values describe presets supplied as ordinary `ConversionOptions`. A
preset bound through `createConverter({ preset })` additionally enforces every
scope boundary established by the repertoire audit. Its converter preserves
excluded characters by default and reports them through
`convertDetailed().diagnostics`. Set `outOfScopeBehavior: "reject"` on the
converter to throw `CharacterScopeError` with those diagnostics instead. A
bound ISO Type 1 converter also preserves or rejects Greek letters whose
transliteration is undefined or unresolved by the cited table, using distinct
diagnostic codes; this applies only when transliteration is the target.

## Available presets

The following reference is generated from the same typed registry as the
runtime configurations. Run `npm run docs:presets` after changing preset
metadata or options.

<!-- BEGIN GENERATED PRESET REFERENCE -->
<!-- This section is generated. Do not edit it directly. -->

| Preset | Description | Scope | Coverage |
| --- | --- | --- | --- |
| `ala-lc-ancient` | Romanization profile for Ancient and Medieval Greek before 1454. | Ancient Greek; Medieval Greek before 1454 | partial |
| `ala-lc-modern` | Romanization profile for Modern Greek after 1453. | Modern Greek after 1453 | partial |
| `bnf-ancient` | BnF adaptation of ISO 843 for Ancient Greek, with its variant letters. | Ancient Greek; French library cataloguing | partial |
| `iso-843-type-1` | Type 1 transliteration of Greek characters into Latin characters, also that of ELOT 743, the Greek national standard, since its 2001 edition. | Ancient Greek; Modern Greek | partial |
| `iso-843-type-2` | Type 2 transcription of Greek characters into Latin characters, favouring pronunciation over reversibility: the transcription of ELOT 743, the Greek national standard, for identity documents, road signs, and maps, which the United Nations and BGN/PCGN adopted for geographical names. | Modern Greek; Ancient Greek | partial |
| `perseus` | Lowercase-ASCII subset of TLG Beta Code used by the Perseus Digital Library project. | Polytonic Greek; Perseus and Morpheus interchange | complete |
| `sbl-general` | The Greek transliteration of the SBL Handbook: η and ω with a macron, h for the rough breathing, and no accent, iota subscript, or diaeresis. | Ancient Greek; Biblical studies; General readers | complete |
| `tlg-core` | Canonical Beta Code together with the TLG characters implemented by the engine. | Polytonic Greek; Beta Code interchange | partial |

### `ala-lc-ancient` — ALA-LC — Ancient and Medieval Greek

- **Authority:** American Library Association and Library of Congress
- **Scope:** Ancient Greek; Medieval Greek before 1454
- **Coverage:** `partial`
- **Out-of-scope behavior:** `engine-default`

Romanization profile for Ancient and Medieval Greek before 1454.

**References:**

- [ALA-LC Romanization Tables: Greek (Ancient and Medieval)](https://www.loc.gov/catdir/cpso/romanization/greeka.pdf)

**Contributed options:**

```json
{
  "transliteration": {
    "upsilon": "y-with-diphthong-u"
  },
  "text": {
    "numerals": "decimal"
  },
  "diacritics": {
    "accents": "remove",
    "smoothBreathing": "remove",
    "roughBreathing": "preserve",
    "coronis": "remove",
    "diaeresis": "remove",
    "iotaSubscript": "remove",
    "quantity": "remove",
    "overline": "remove"
  }
}
```

**Known limitations:**

- Missing rough breathings are not inferred from lexical knowledge or capitalization.
- An iota adscript written after a marked capital (Ἅιδῃ) is kept as a letter rather than omitted as the table prescribes.
- Omitted diaeresis is recoverable only in the deterministic contextual y/u cases implemented by the parser.
- Stigma, modern koppa, and sampi are documented only as marked numerals; their unmarked engine defaults are outside the ALA-LC table.
- Yot is not part of the cited ALA-LC inventory.

### `ala-lc-modern` — ALA-LC — Modern Greek

- **Authority:** American Library Association and Library of Congress
- **Scope:** Modern Greek after 1453
- **Coverage:** `partial`
- **Out-of-scope behavior:** `engine-default`

Romanization profile for Modern Greek after 1453.

**References:**

- [ALA-LC Romanization Tables: Greek (Modern)](https://www.loc.gov/catdir/cpso/romanization/greekm.pdf)

**Contributed options:**

```json
{
  "transliteration": {
    "beta": "v",
    "muPi": "b-initial",
    "nasalGamma": "nasal-medial-kappa",
    "nuTau": "d-underline-initial",
    "rho": "marked",
    "upsilon": "y-with-diphthong-u"
  },
  "text": {
    "numerals": "decimal"
  },
  "diacritics": {
    "accents": "remove",
    "smoothBreathing": "remove",
    "roughBreathing": "preserve",
    "coronis": "remove",
    "diaeresis": "remove",
    "iotaSubscript": "remove",
    "quantity": "remove",
    "overline": "remove"
  }
}
```

**Known limitations:**

- Missing rough breathings are not inferred from lexical knowledge or capitalization.
- An iota adscript written after a marked capital (Ἅιδῃ) is kept as a letter rather than omitted as the table prescribes.
- Only the documented contextual mu-pi, nu-tau, and gamma-kappa rules are implemented.
- Digamma, stigma, both koppa forms, and sampi are documented only as marked numerals; their unmarked engine defaults are outside the ALA-LC table.
- Yot is not part of the cited ALA-LC inventory.

### `bnf-ancient` — BnF — Ancient Greek

- **Authority:** Bibliothèque nationale de France
- **Scope:** Ancient Greek; French library cataloguing
- **Coverage:** `partial`
- **Out-of-scope behavior:** `engine-default`

BnF adaptation of ISO 843 for Ancient Greek, with its variant letters.

**References:**

- [Translittération du grec — Kitcat BnF](https://kitcat.bnf.fr/consignes-catalogage/translitteration-du-grec)

**Contributed options:**

```json
{
  "transliteration": {
    "archaicKoppa": "q",
    "coronis": "greek",
    "circumflexAccent": "circumflex",
    "hyphen": "typographic",
    "keraia": "bnf",
    "lunateSigma": "c",
    "quantity": "omit",
    "rho": "marked",
    "smoothBreathing": "greek",
    "upsilon": "y-with-au-eu-ou"
  },
  "greek": {
    "questionMark": "greek"
  }
}
```

**Known limitations:**

- Context-dependent access-point variants such as kappa → c and chi → kh are not selected automatically.
- BnF keraiai are rendered as a comma and acute in transliteration. The acute reads back as the keraia after a consonant, and the comma before c̄ or s̄, but after a vowel the acute reads back as an accent; with the accents removed, the right keraia is written ʹ.
- Upper Cypriot syndyazomeno shares U+0306 with the ordinary breve and cannot be distinguished mechanically; lower syndyazomeno is not interpreted as a semantic mark.
- The Iliad/Odyssey numeral exception is not selected without the relevant cataloguing context.
- An iota adscript written after a marked capital (Ἅιδῃ) is kept as a letter rather than omitted as the table prescribes.
- The BnF circumflex and smooth breathing marks and omission of explicit quantity marks apply only to transliteration; missing breathings are never inferred from Greek source text.
- Both documented koppa forms collapse to q in BnF transliteration and therefore cannot be distinguished on reverse conversion.

### `iso-843-type-1` — ISO 843:1997 — Type 1 (transliteration)

- **Authority:** International Organization for Standardization
- **Scope:** Ancient Greek; Modern Greek
- **Coverage:** `partial`
- **Out-of-scope behavior:** `engine-default`

Type 1 transliteration of Greek characters into Latin characters, also that of ELOT 743, the Greek national standard, since its 2001 edition.

**References:**

- [ISO 843:1997](https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf)

**Contributed options:**

```json
{
  "transliteration": {
    "beta": "v",
    "circumflexAccent": "circumflex",
    "coronis": "apostrophe",
    "enotikon": "hyphen",
    "eta": "i",
    "nasalGamma": "literal",
    "phi": "f",
    "rho": "marked",
    "smoothBreathing": "apostrophe",
    "upsilon": "y-with-au-eu-ou"
  }
}
```

**Known limitations:**

- The preset implements mechanically expressible Type 1 mappings, not every contextual provision of the standard.
- The apostrophe of the smooth breathing reads back as one before the vowel group of a word, and that of the coronis between its vowel and a letter, in a crasis; elsewhere an apostrophe is punctuation, so that a coronis at the end of a word is reported lost. As the h of a rough breathing, the apostrophe precedes the whole vowel group: a breathing on the first vowel of a pair that could form a diphthong (Ἀίδης) reads back on the second, and the detailed conversion reports it displaced.
- Note 2 reads a Latin s followed by a hyphen as medial sigma, for a word divided at the end of a line; the parser treats a hyphen as a word boundary and reads final sigma there.
- ISO 843 names stigma, koppa, and sampi in its Greek repertoire but does not assign them Type 1 conversions; bound converters preserve or reject them for transliteration, while ordinary preset use retains engine defaults.
- The standard's single named koppa cannot be identified unambiguously with the engine's separate archaic-koppa entry; bound transliteration reports this unresolved mapping.

### `iso-843-type-2` — ISO 843:1997 — Type 2 (transcription)

- **Authority:** International Organization for Standardization
- **Scope:** Modern Greek; Ancient Greek
- **Coverage:** `partial`
- **Out-of-scope behavior:** `engine-default`

Type 2 transcription of Greek characters into Latin characters, favouring pronunciation over reversibility: the transcription of ELOT 743, the Greek national standard, for identity documents, road signs, and maps, which the United Nations and BGN/PCGN adopted for geographical names.

**References:**

- [ISO 843:1997](https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf)
- [BGN/PCGN, Romanization of Greek: ELOT 743 System, 1996 Agreement](https://assets.publishing.service.gov.uk/media/5ab4df04e5274a1aa2d41460/ROMANIZATION_OF_GREEK.pdf)
- [UNGEGN, Report on the Current Status of United Nations Romanization Systems for Geographical Names: Greek](https://unstats.un.org/unsd/ungegn/working_groups/wg5/documents/wgrr4greek.pdf)

**Contributed options:**

```json
{
  "transliteration": {
    "beta": "v",
    "circumflexAccent": "circumflex",
    "coronis": "apostrophe",
    "enotikon": "hyphen",
    "eta": "i",
    "longVowels": "omit",
    "muPi": "b-initial-final",
    "nasalGamma": "nasal-except-kappa",
    "phi": "f",
    "rho": "marked",
    "smoothBreathing": "apostrophe",
    "upsilon": "y-with-ou-v-f"
  }
}
```

**Known limitations:**

- A transcription is not reversible by design: the v and f of αυ, ευ, ηυ read back as beta and phi, i and o as iota and omicron, and b at the edge of a word as μπ; the detailed conversion reports these losses. An o without marks before a y without diaeresis reads back as omega: Table 2 does not list ωυ, which note 8 writes letter by letter, while ου is written ou, or oy with an accent or a diaeresis (note 9).
- Reading back is designed for the preset's own output: an e with a circumflex is read as εῦ before v or f, where Type 2 writes it, and otherwise as epsilon with a circumflex, which document validation rejects.
- Under monotonic accentuation, í, pós, zoí (ή, πώς, ζωή) read back as monosyllables, which lose their accent: reencode() to monotonic Greek first.
- Notes 3 and 4 list the letters of the modern alphabet; before an archaic letter, the upsilon of αυ, ευ, ηυ follows that letter's sound (f before stigma, koppa, sampi; v before digamma and yot), and any non-letter after it counts as the end of the word.
- The apostrophe of the smooth breathing reads back as one before the vowel group of a word, and that of the coronis between its vowel and a letter, in a crasis; elsewhere an apostrophe is punctuation, so that a coronis at the end of a word is reported lost. As the h of a rough breathing, the apostrophe precedes the whole vowel group: a breathing on the first vowel of a pair that could form a diphthong (Ἀίδης) reads back on the second, and the detailed conversion reports it displaced.
- Note 2 reads a Latin s followed by a hyphen as medial sigma, for a word divided at the end of a line; the parser treats a hyphen as a word boundary and reads final sigma there.
- ISO 843 names stigma, koppa, and sampi in its Greek repertoire but does not assign them Type 2 conversions; bound converters preserve or reject them for transliteration, while ordinary preset use retains engine defaults.
- The standard's single named koppa cannot be identified unambiguously with the engine's separate archaic-koppa entry; bound transliteration reports this unresolved mapping.

### `perseus` — Perseus Beta Code — Letters and diacritics

- **Authority:** Perseus Digital Library
- **Scope:** Polytonic Greek; Perseus and Morpheus interchange
- **Coverage:** `complete`
- **Out-of-scope behavior:** `engine-default`

Lowercase-ASCII subset of TLG Beta Code used by the Perseus Digital Library project.

**References:**

- [The Care and Feeding of Morpheus](https://github.com/PerseusDL/morpheus/blob/master/doc/morpheus.html)
- [Perseids Tools Beta Code JSON mappings](https://github.com/perseids-tools/beta-code-json)
- [TLG Beta Code Quick Reference Guide](https://stephanus.tlg.uci.edu/encoding/quickbeta.pdf)

**Contributed options:**

```json
{
  "betaCode": {
    "case": "lowercase"
  }
}
```

**Known limitations:**

- The Perseus subset covers letters, accents, breathings, diaeresis, and iota subscript; TLG markup escapes are outside its scope.
- The cited Perseids mapping contains the standard alphabet and lunate sigma, but none of the engine's six additional letter entries (digamma, yot, stigma, either koppa, or sampi). It reads j as a final sigma, the engine as yot.
- The dot below (?) is not read.

### `sbl-general` — SBL — General-purpose style

- **Authority:** Society of Biblical Literature
- **Scope:** Ancient Greek; Biblical studies; General readers
- **Coverage:** `complete`
- **Out-of-scope behavior:** `engine-default`

The Greek transliteration of the SBL Handbook: η and ω with a macron, h for the rough breathing, and no accent, iota subscript, or diaeresis.

**References:**

- [The SBL Handbook of Style, second edition, §5.3 (Greek)](https://archive.org/details/sblhandbookofsty0000unse_g7i4/)

**Contributed options:**

```json
{
  "transliteration": {
    "upsilon": "y-with-diphthong-u"
  },
  "diacritics": {
    "accents": "remove",
    "smoothBreathing": "remove",
    "roughBreathing": "preserve",
    "coronis": "remove",
    "diaeresis": "remove",
    "iotaSubscript": "remove",
    "quantity": "remove",
    "overline": "remove"
  }
}
```

**Known limitations:**

- The Handbook gives one style for Greek, the general-purpose one: for academic readers, it asks for Greek characters.
- The Handbook makes no provision for the digamma or the other archaic letters, and asks for Greek characters where they matter: a converter bound to the preset keeps them in Greek, while convert() writes the engine's spellings.

### `tlg-core` — TLG Beta Code — Core subset

- **Authority:** Thesaurus Linguae Graecae
- **Scope:** Polytonic Greek; Beta Code interchange
- **Coverage:** `partial`
- **Out-of-scope behavior:** `engine-default`

Canonical Beta Code together with the TLG characters implemented by the engine.

**References:**

- [TLG Beta Code Quick Reference Guide](https://stephanus.tlg.uci.edu/encoding/quickbeta.pdf)

**Contributed options:**

```json
{
  "betaCode": {
    "case": "uppercase",
    "yot": "#401"
  }
}
```

**Known limitations:**

- The TLG character inventory contains more than one thousand assignments; only the Greek alphabet and the documented additional characters and punctuation are implemented.
- The dot below (?) and the en dash (%19) are not read.

<!-- END GENERATED PRESET REFERENCE -->

## Inspection

Descriptive metadata, sparse preset definitions, immutable defaults, and fully
resolved option objects are public:

```ts
import {
  DEFAULT_CONVERSION_OPTIONS,
  getPresetMetadata,
  getPresetOptions,
  listPresetMetadata,
  resolveConversionOptions,
} from "@humanities/greek-conversion";

listPresetMetadata().length; // → 8
getPresetMetadata("ala-lc-modern").coverage; // → partial

DEFAULT_CONVERSION_OPTIONS.transliteration.beta; // → b
getPresetOptions("ala-lc-modern").transliteration?.beta; // → v
resolveConversionOptions({
  preset: "ala-lc-modern",
  transliteration: { beta: "b" },
}).transliteration.beta;
// → b
```

`getPresetMetadata()` returns one preset's scope, references, coverage, and
known limitations. `listPresetMetadata()` returns the complete registry in
stable order. `getPresetOptions()` returns only fields contributed by the
selected preset. `resolveConversionOptions()` returns a complete
`ResolvedConversionOptions`, after applying engine defaults, the preset, and
custom overrides. Metadata and option helpers return detached objects; mutating
one cannot modify the immutable defaults or the preset registry.

## Scope limits

Presets never infer a missing rough breathing and do not perform transformations
that intrinsically require lexical or morphological knowledge. Consequently,
ALA-LC output can only render `h` when the source document actually carries a
rough breathing. This is a deliberate scope boundary, not an implicit fallback.
The second rho of a pair inside a word is the one convention: SBL and ALA-LC
Ancient write it `rh`, as classical studies do, while ISO 843, ALA-LC Modern,
and BnF, whose tables write `h` only for a rough breathing that Greek writes,
select `transliteration.rho: "marked"` (`Πύρρος` → `Pýrros`).

The ALA-LC policy omits diaeresis visually. Under contextual `y/u`, the parser
nevertheless preserves its deterministic provenance: `y` is interpreted as a
separated upsilon where `u` would form a diphthong. This keeps preset output
idempotent without lexical inference.

The ISO Type 1 and BnF presets use the narrower
`transliteration.upsilon: "y-with-au-eu-ou"` rule: `αυ`, `ευ`, and `ου` produce
`au`, `eu`, and `ou`; isolated upsilon and other vowel pairs use `y`. A
diaeresis prevents the three combinations. When reading `ay`, `ey`, or `oy`,
the parser keeps the upsilon separated so a second conversion cannot silently
turn it into `au`, `eu`, or `ou`: at word start the breathing on the first
vowel carries the separation, as Greek writes a hiatus (`ay → ἀυ`,
`hay → ἁυ`); elsewhere, or where no breathing is written or inferred, a
diaeresis carries it (`kay → kaÿ`), and the encoder writes that diaeresis at
once so the output is canonical.

`bnf-ancient` also selects `transliteration.keraia: "bnf"` for transliteration: the
right numeral mark becomes an acute accent and the left numeral mark becomes
a comma. This matches BnF spelling, but a vowel with an acute accent can be
indistinguishable from a vowel followed by the right keraia. Forward
conversion therefore reports information loss through `convertDetailed()`;
the transliteration parser does not guess which character was intended. A
consonant bears no accent, so its acute reads back as the keraia, and a comma
before `c̄` or `s̄`, the stigma and sampi of numerals, as the left keraia. With
the accents removed, the right keraia is written `ʹ`, and so it is under
monotonic accentuation after the vowel of a numeral of one syllable.
Canonical NFC output may compose the acute with a preceding Latin vowel.
Set `transliteration.keraia: "greek"` to keep the original numeral marks.

`bnf-ancient` writes the smooth breathing as the combining comma above on its
vowel (`Eu̓dēmeíōn`), as example 27 of the BnF page does. Its table gives the
spacing psili (U+1FBF), and most of its examples write the apostrophe of
ISO 843 (`’Alkiviádīs`), which `smoothBreathing: "apostrophe"` writes.
