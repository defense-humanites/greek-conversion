# Conversion presets

A preset is a named, coherent set of ordinary `ConversionOptions`. Presets do
not introduce a separate conversion path: they are resolved before parsing and
encoding, and `convertDetailed()` observes the same information loss as if the
resolved options had been supplied individually.

```ts
convert(input, from, to, { preset: "ala-lc-modern" });
```

Custom options can refine or override a preset. Resolution is recursive for
the `orthography`, `diacritics`, and `unicode` groups:

```ts
convert(input, from, to, {
  preset: "ala-lc-modern",
  diacritics: { accents: "preserve" },
  orthography: { letterCase: "uppercase" },
});
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
runtime configurations. Run `deno task docs:presets` after changing preset
metadata or options.

<!-- BEGIN GENERATED PRESET REFERENCE -->
<!-- This section is generated. Do not edit it directly. -->

| Preset | Description | Scope | Coverage | Out of scope | Reference |
| --- | --- | --- | --- | --- | --- |
| `ala-lc-ancient` | Romanization profile for Ancient and Medieval Greek before 1454. | Ancient Greek; Medieval Greek before 1454 | partial | engine-default | [ALA-LC Romanization Tables: Greek (Ancient and Medieval)](https://www.loc.gov/catdir/cpso/romanization/greeka.pdf) |
| `ala-lc-modern` | Romanization profile for Modern Greek after 1453. | Modern Greek after 1453 | partial | engine-default | [ALA-LC Romanization Tables: Greek (Modern)](https://www.loc.gov/catdir/cpso/romanization/greekm.pdf) |
| `bnf-core` | Core mechanically expressible profile for the BnF adaptation of ISO 843 for Ancient Greek. | Ancient Greek; French library cataloguing | partial | engine-default | [Translittération du grec — Kitcat BnF](https://kitcat.bnf.fr/consignes-catalogage/translitteration-du-grec) |
| `iso-843-type-1` | Type 1 transliteration of Greek characters into Latin characters. | Ancient Greek; Modern Greek | partial | engine-default | [ISO 843:1997](https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf) |
| `perseus` | Lowercase-ASCII subset of TLG Beta Code used by the Perseus Digital Library project. | Polytonic Greek; Perseus and Morpheus interchange | complete | engine-default | [The Care and Feeding of Morpheus](https://github.com/PerseusDL/morpheus/blob/master/doc/morpheus.html); [Perseids Tools Beta Code JSON mappings](https://github.com/perseids-tools/beta-code-json); [TLG Beta Code Quick Reference Guide](https://stephanus.tlg.uci.edu/encoding/quickbeta.pdf) |
| `sbl-academic` | Academic transliteration retaining the engine's scientific diacritics. | Ancient Greek; Biblical studies | adapted | engine-default | [The SBL Handbook of Style, second edition](https://archive.org/details/sblhandbookofsty0000unse_g7i4/) |
| `sbl-general` | Readable transliteration omitting most scholarly diacritics while retaining rough breathing and diaeresis. | Ancient Greek; Biblical studies; General readers | adapted | engine-default | [The SBL Handbook of Style, second edition](https://archive.org/details/sblhandbookofsty0000unse_g7i4/) |
| `tlg-core` | Canonical Beta Code together with the TLG characters implemented by the engine. | Polytonic Greek; Beta Code interchange | partial | engine-default | [TLG Beta Code Quick Reference Guide](https://stephanus.tlg.uci.edu/encoding/quickbeta.pdf) |

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
  "orthography": {
    "numerals": "decimal",
    "upsilon": "y-with-diphthong-u"
  },
  "diacritics": {
    "accents": "remove",
    "smoothBreathing": "remove",
    "roughBreathing": "preserve",
    "coronis": "remove",
    "diaeresis": "remove",
    "iotaSubscript": "remove",
    "quantity": "remove"
  }
}
```

**Known limitations:**

- Missing rough breathings are not inferred from lexical knowledge or capitalization.
- Iota adscript cannot be distinguished mechanically from an ordinary iota.
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
  "orthography": {
    "beta": "v",
    "modernDigraphs": "ala-lc",
    "numerals": "decimal",
    "upsilon": "y-with-diphthong-u"
  },
  "diacritics": {
    "accents": "remove",
    "smoothBreathing": "remove",
    "roughBreathing": "preserve",
    "coronis": "remove",
    "diaeresis": "remove",
    "iotaSubscript": "remove",
    "quantity": "remove"
  }
}
```

**Known limitations:**

- Missing rough breathings are not inferred from lexical knowledge or capitalization.
- Iota adscript cannot be distinguished mechanically from an ordinary iota.
- Only the documented contextual mu-pi, nu-tau, and gamma-kappa rules are implemented.
- Digamma, stigma, both koppa forms, and sampi are documented only as marked numerals; their unmarked engine defaults are outside the ALA-LC table.
- Yot is not part of the cited ALA-LC inventory.

### `bnf-core` — BnF — Ancient Greek core

- **Authority:** Bibliothèque nationale de France
- **Scope:** Ancient Greek; French library cataloguing
- **Coverage:** `partial`
- **Out-of-scope behavior:** `engine-default`

Core mechanically expressible profile for the BnF adaptation of ISO 843 for Ancient Greek.

**References:**

- [Translittération du grec — Kitcat BnF](https://kitcat.bnf.fr/consignes-catalogage/translitteration-du-grec)

**Contributed options:**

```json
{
  "orthography": {
    "archaicKoppa": "q",
    "coronis": "greek",
    "circumflexAccent": "circumflex",
    "hyphen": "typographic",
    "keraia": "bnf",
    "lunateSigma": "c",
    "quantityTransliteration": "omit",
    "smoothBreathing": "greek",
    "upsilon": "y-with-au-eu-ou"
  },
  "unicode": {
    "questionMark": "greek"
  }
}
```

**Known limitations:**

- Context-dependent access-point variants such as kappa → c and chi → kh are not selected automatically.
- BnF keraiai are rendered as a comma and acute in transliteration, but reverse conversion cannot always distinguish the resulting accent from a letter accent.
- Upper Cypriot syndyazomeno shares U+0306 with the ordinary breve and cannot be distinguished mechanically; lower syndyazomeno is not interpreted as a semantic mark.
- The Iliad/Odyssey numeral exception is not selected without the relevant cataloguing context.
- Iota adscript cannot be distinguished mechanically from an ordinary iota.
- The BnF circumflex and smooth breathing marks and omission of explicit quantity marks apply only to transliteration; missing breathings are never inferred from Greek source text.
- Both documented koppa forms collapse to q in BnF transliteration and therefore cannot be distinguished on reverse conversion.

### `iso-843-type-1` — ISO 843:1997 — Type 1

- **Authority:** International Organization for Standardization
- **Scope:** Ancient Greek; Modern Greek
- **Coverage:** `partial`
- **Out-of-scope behavior:** `engine-default`

Type 1 transliteration of Greek characters into Latin characters.

**References:**

- [ISO 843:1997](https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf)

**Contributed options:**

```json
{
  "orthography": {
    "beta": "v",
    "coronis": "apostrophe",
    "enotikon": "hyphen",
    "eta": "ī",
    "nasalGamma": "literal",
    "phi": "f",
    "smoothBreathing": "apostrophe",
    "upsilon": "y-with-au-eu-ou"
  }
}
```

**Known limitations:**

- The preset implements mechanically expressible Type 1 mappings, not every contextual provision of the standard.
- An apostrophe for initial smooth breathing can also represent punctuation; reverse parsing does not infer it as a distinct breathing mark.
- ISO 843 names stigma, koppa, and sampi in its Greek repertoire but does not assign them Type 1 conversions; bound converters preserve or reject them for transliteration, while ordinary preset use retains engine defaults.
- The standard's single named koppa cannot be identified unambiguously with the engine's separate archaic-koppa entry; bound transliteration reports this unresolved mapping.

### `perseus` — Perseus Beta Code — Core subset

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
  "orthography": {
    "betaCodeCase": "lowercase"
  }
}
```

**Known limitations:**

- The Perseus subset covers letters, accents, breathings, diaeresis, and iota subscript; TLG markup escapes are outside its scope.
- The cited Perseids mapping contains the standard alphabet and lunate sigma, but none of the engine's six additional letter entries (digamma, yot, stigma, either koppa, or sampi).

### `sbl-academic` — SBL — Academic style

- **Authority:** Society of Biblical Literature
- **Scope:** Ancient Greek; Biblical studies
- **Coverage:** `adapted`
- **Out-of-scope behavior:** `engine-default`

Academic transliteration retaining the engine's scientific diacritics.

**References:**

- [The SBL Handbook of Style, second edition](https://archive.org/details/sblhandbookofsty0000unse_g7i4/)

**Contributed options:**

```json
{
  "orthography": {
    "upsilon": "y-with-diphthong-u"
  }
}
```

**Known limitations:**

- The SBL handbook defines one general-purpose Greek transliteration style; this academic profile is an engine adaptation and not a separate official SBL table.
- The cited Greek table does not provide conversions for the engine's additional archaic letters.

### `sbl-general` — SBL — General-purpose style

- **Authority:** Society of Biblical Literature
- **Scope:** Ancient Greek; Biblical studies; General readers
- **Coverage:** `adapted`
- **Out-of-scope behavior:** `engine-default`

Readable transliteration omitting most scholarly diacritics while retaining rough breathing and diaeresis.

**References:**

- [The SBL Handbook of Style, second edition](https://archive.org/details/sblhandbookofsty0000unse_g7i4/)

**Contributed options:**

```json
{
  "orthography": {
    "upsilon": "y-with-diphthong-u"
  },
  "diacritics": {
    "accents": "remove",
    "smoothBreathing": "remove",
    "roughBreathing": "preserve",
    "coronis": "remove",
    "diaeresis": "preserve",
    "iotaSubscript": "remove",
    "quantity": "remove"
  }
}
```

**Known limitations:**

- The SBL handbook defines one general-purpose Greek transliteration style; the academic/general preset pair should not be read as two official SBL tables.
- The cited Greek table does not provide conversions for the engine's additional archaic letters.

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
  "orthography": {
    "betaCodeCase": "uppercase",
    "yotBetaCode": "#401"
  }
}
```

**Known limitations:**

- The TLG character inventory contains more than one thousand assignments; only the Greek alphabet and the documented additional characters and punctuation are implemented.

<!-- END GENERATED PRESET REFERENCE -->

## Inspection

Descriptive metadata, sparse preset definitions, immutable defaults, and fully
resolved option objects are public:

```ts
listPresetMetadata();
getPresetMetadata("ala-lc-modern");

DEFAULT_CONVERSION_OPTIONS;
getPresetOptions("ala-lc-modern");
resolveConversionOptions({
  preset: "ala-lc-modern",
  orthography: { beta: "b" },
});
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

The ALA-LC policy omits diaeresis visually. Under contextual `y/u`, the parser
nevertheless preserves its deterministic provenance: `y` is interpreted as a
separated upsilon where `u` would form a diphthong. This keeps preset output
idempotent without lexical inference.

The ISO Type 1 and BnF presets use the narrower
`orthography.upsilon: "y-with-au-eu-ou"` rule: `αυ`, `ευ`, and `ου` produce
`au`, `eu`, and `ou`; isolated upsilon and other vowel pairs use `y`. A
diaeresis prevents the three combinations. When reading unmarked `ay`, `ey`,
or `oy`, the parser infers a separated upsilon so a second conversion cannot
silently turn it into `au`, `eu`, or `ou`.

`bnf-core` also selects `orthography.keraia: "bnf"` for transliteration: the
right numeral mark becomes an acute accent and the left numeral mark becomes
a comma. This matches BnF spelling, but a vowel with an acute accent can be
indistinguishable from a vowel followed by the right keraia. Forward
conversion therefore reports information loss through `convertDetailed()`;
the transliteration parser does not guess which character was intended.
Canonical NFC output may compose the acute with a preceding Latin vowel.
Set `orthography.keraia: "greek"` to keep the original numeral marks.
