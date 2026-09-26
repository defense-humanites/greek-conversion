# Preset character repertoire audit

This audit compares the semantic letters built into the engine with the
character repertoire supported by each preset's cited references. It is about
scope, not only recognition: a character may be named by a reference without
that reference assigning a conversion for it.

The engine contains the ordinary twenty-four-letter Greek alphabet plus six
additional semantic letters:

- `digamma` (`ϝ`);
- `yot` (`ϳ`);
- `stigma` (`ϛ`);
- `koppa` (`ϟ`);
- `archaic-koppa` (`ϙ`);
- `sampi` (`ϡ`).

Lunate sigma is represented as a glyph variant of semantic `sigma`, so it is
discussed separately below.

## Results

Every preset covers the ordinary twenty-four-letter alphabet. The following
matrix records only the six additional entries.

| Preset | Digamma | Yot | Stigma | Koppa | Archaic koppa | Sampi |
| --- | --- | --- | --- | --- | --- | --- |
| `ala-lc-ancient` | Exact | Outside | Numeral-only | Numeral-only | Exact | Numeral-only |
| `ala-lc-modern` | Numeral-only | Outside | Numeral-only | Numeral-only | Numeral-only | Numeral-only |
| `bnf-core` | Exact | Exact | Exact | Exact | Exact | Exact |
| `iso-843-type-1` | Exact | Exact | Undefined | Undefined | Unresolved | Undefined |
| `perseus` | Outside | Outside | Outside | Outside | Outside | Outside |
| `sbl-academic` | Outside | Outside | Outside | Outside | Outside | Outside |
| `sbl-general` | Outside | Outside | Outside | Outside | Outside | Outside |
| `tlg-core` | Exact | Exact | Exact | Exact | Exact | Exact |

The status terms mean:

- **Exact**: the reference includes the character and the preset's current
  direct mapping agrees;
- **Different**: the reference includes the character, but the engine's mapping
  does not agree;
- **Undefined**: the reference includes the character in its source repertoire
  but does not assign a conversion;
- **Numeral-only**: the character is documented only when marked as an
  alphabetic numeral, not as an independently romanized letter;
- **Outside**: an enumerated profile or mapping omits the character;
- **Unresolved**: the reference does not distinguish the engine's semantic
  entry clearly enough.

These statuses do not measure complete preset conformance. Contextual rules,
diacritics, punctuation, numeral treatment, and other limitations remain
described in [Preset reference and coverage](presets.md).

## Findings by authority

### ALA-LC

The ancient/medieval table assigns `w` to digamma and `k` with dot below to
archaic koppa. It does not assign an independent letter conversion to yot,
stigma, modern koppa, or sampi. Its numeral table nevertheless accepts
digamma, stigma, both koppa forms, and sampi when marked as alphabetic
numerals.

The modern table has no independent additional-letter rows. Its numeral table
accepts digamma, stigma, both koppa forms, and sampi; yot is absent. Both ALA-LC
presets select decimal numeral output, so those marked uses are mechanically
covered.

This boundary is contextual rather than a simple set of semantic letters. A
`Converter.repertoire` allow-list cannot permit `ϛʹ` while excluding unmarked
`ϛ`, because both parse to the same `stigma` letter and differ only by their
numeral mark.

### BnF

The BnF explicitly documents digamma, yod, Byzantine sigma, stigma, two koppa
forms, and sampi. Its table assigns `q` to both koppa code points. The preset
now selects that spelling for `archaic-koppa` (`ϙ`) as well, deliberately
collapsing the two source characters in transliteration.

### ISO 843 Type 1

ISO 843 identifies stigma, digamma, koppa, sampi, Byzantine/lunate sigma, and
yot as part of the Greek source repertoire. Its archaic-character conversion
table assigns Latin output only to digamma, yot, and Byzantine sigma. Stigma,
koppa, and sampi are consequently in scope without ISO-defined Type 1 output.

The standard predates Unicode's separate modern and archaic koppa pair used by
the engine. The audit therefore does not equate its single named koppa with
`archaic-koppa` automatically.

### Perseus

Morpheus describes Perseus Beta Code as a letters-and-diacritics subset of TLG.
The cited executable Perseids mapping makes that subset concrete: it contains
the ordinary alphabet and lunate sigma, but none of the engine's six additional
letter entries. A Perseus-specific converter may therefore use the ordinary
twenty-four letters as its exact semantic allow-list.

### SBL

The SBL handbook provides one general-purpose Greek transliteration table and
explicitly leaves distinctions such as digamma to Greek type when they matter.
The library's `sbl-academic` preset is an adapted scientific profile, not a
second official SBL table. Both presets should therefore treat the six
additional entries as outside their cited SBL scope, while retaining their
existing `adapted` coverage label.

### TLG

The TLG quick reference assigns `V`, `#2`, `#1`, `#3`, and `#5` to digamma,
stigma, koppa, archaic koppa, and sampi respectively; these agree with the
engine apart from configurable ASCII case. TLG assigns `#401` to yot. The
preset now selects that spelling, and the parser accepts it alongside the
engine-default `J` spelling.

## Lunate sigma

Lunate sigma is not an independent `Letter`; the parser records it as
`glyphVariant: "lunate-sigma"` on semantic sigma.

- ISO 843 includes Byzantine/lunate sigma and transliterates it as `s`.
- BnF deliberately distinguishes it as `c`; `bnf-core` selects that behavior.
- The Perseids mapping and TLG quick reference both encode it as `S3` (subject
  to the selected ASCII letter case).
- The ALA-LC and SBL boundaries remain governed by their ordinary sigma rules;
  their cited tables do not establish a distinct lunate-sigma conversion.

## Consequence for automatic enforcement

Presets supplied as ordinary `ConversionOptions` continue to report and use
`outOfScopeBehavior: "engine-default"`. Binding a preset through
`createConverter({ preset })` opts into the audited boundary: excluded
characters are preserved and reported separately from information loss by
default. `createConverter({ preset, outOfScopeBehavior: "reject" })` instead
throws `CharacterScopeError` with all source diagnostics attached.

The bound converter applies contextual ALA-LC rules, so it can accept a marked
alphabetic numeral while preserving the same semantic letter when unmarked.
Perseus and both SBL profiles exclude all six additional entries. BnF and TLG
accept all six. ISO 843 includes all six in its source repertoire. When the
target is transliteration, a bound ISO converter preserves and reports stigma,
koppa, and sampi as `undefined-preset-mapping`, because Table 4 assigns no
Type 1 letter mapping. It reports `archaic-koppa` separately as
`unresolved-preset-mapping`: the standard's single koppa does not resolve the
engine's two Unicode forms. Strict mode rejects these occurrences with their
distinct codes. Digamma and yot use the defined Latin mappings; marked Greek
numerals can use the standard's separate decimal correspondence if the caller
explicitly sets `orthography.numerals: "decimal"`. This rule applies only when
the target is transliteration. It does not certify the rest of ISO 843 as fully
implemented.

## Sources

- [ALA-LC Ancient and Medieval Greek](https://www.loc.gov/catdir/cpso/romanization/greeka.pdf)
- [ALA-LC Modern Greek](https://www.loc.gov/catdir/cpso/romanization/greekm.pdf)
- [Cataloging Service Bulletin 124 — published ALA-LC Greek tables](https://www.loc.gov/aba/publications/FreeCSB/CSB_124.pdf)
- [BnF transliteration of Greek](https://kitcat.bnf.fr/consignes-catalogage/translitteration-du-grec)
- [ISO 843:1997](https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf)
- [Morpheus documentation](https://github.com/PerseusDL/morpheus/blob/master/doc/morpheus.html)
- [Perseids Tools Beta Code JSON mappings](https://github.com/perseids-tools/beta-code-json)
- [SBL Handbook of Style, second edition](https://archive.org/details/sblhandbookofsty0000unse_g7i4/)
- [TLG Beta Code Quick Reference Guide](https://stephanus.tlg.uci.edu/encoding/quickbeta.pdf)
