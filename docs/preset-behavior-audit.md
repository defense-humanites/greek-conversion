# Preset behavior audit

This is a targeted audit of diacritics, punctuation, and numerals beyond the
[character repertoire audit](preset-repertoire-audit.md). The cited examples
check specific rules; passing them is not a certification of a complete
standard. The precise current options and limitations are listed in the
[generated preset reference](presets.md).
The [source-traceable BnF and ISO corpus](preset-conformance-corpus.md) records
executable examples and rules that remain open.

| Preset | Rules checked in the test suite | Remaining boundary |
| --- | --- | --- |
| `ala-lc-ancient` | Rough breathing when present; contextual `y/u`; marked numerals as decimal | Missing breathings and iota adscript cannot be inferred from spelling alone. |
| `ala-lc-modern` | Supported `μπ/ντ/γκ` contexts; marked numerals as decimal | Other language-dependent romanization choices require further fixtures or lexical input. |
| `bnf-core` | Ancient-Greek variant letters; `αυ/ευ/ου`; known smooth breathing, circumflex, and keraiai in Latin output; omission of explicit macron/breve | The upper Cypriot syndyazomeno shares U+0306 with breve; cataloguing variants and the Iliad/Odyssey numeral exception require external context. |
| `iso-843-type-1` | Type 1 letter choices; `αυ/ευ/ου`; initial smooth breathing; question mark and ano teleia; undefined and unresolved archaic mappings | Some reference provisions remain unimplemented; an apostrophe in Latin text cannot by itself establish a smooth breathing. |
| `perseus` | Lowercase ASCII Beta Code, letters, and supported diacritics | TLG escapes are outside the cited Perseus subset. |
| `sbl-academic` | The library's academic diacritic profile | This is an adaptation, not a separate SBL table. |
| `sbl-general` | The library's general-purpose removal and retention of diacritics | The profile covers an engine adaptation of SBL's single general-purpose table. |
| `tlg-core` | Uppercase ASCII Beta Code, additional letters including `#401`, and canonical diacritics | The larger TLG character and escape inventory remains outside the core implementation. |

## Output versus inverse parsing

BnF specifies the right keraia as an acute, the left keraia as a comma, a
combining smooth breathing on the Latin letter, and a combining circumflex
accent. The acute can coincide with a vowel's ordinary accent (`αʹ` and `ά`
both render as `á` under `bnf-core`), so the inverse parser does not invent
numeral provenance. `convertDetailed()` reports the loss. The BnF table also
uses both koppa forms with Latin `q`, which likewise cannot be inverted
without source provenance.

ISO 843 transliterates the Greek question mark as `?` and ano teleia as `;`.
The initial smooth breathing is rendered as an apostrophe; an apostrophe in
Latin input is not sufficient evidence for reconstructing that mark.

The bound converter's `outOfScopeBehavior: "reject"` rejects **recognized**
source characters outside the audited repertoire and known missing ISO Type 1
letter mappings. It does not reject arbitrary unknown literals, all
information loss, or every unimplemented contextual rule. Inspect
`convertDetailed().losses` separately when preservation of distinctions is
required. Ordinary `convert(..., { preset })` retains the documented
`engine-default` behavior outside the audited boundary.

## Sources

- [ALA-LC Ancient and Medieval Greek](https://www.loc.gov/catdir/cpso/romanization/greek.pdf)
- [ALA-LC Modern Greek](https://www.loc.gov/catdir/cpso/romanization/greekm.pdf)
- [BnF transliteration of Greek](https://kitcat.bnf.fr/consignes-catalogage/translitteration-du-grec)
- [ISO 843:1997](https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf)
- [Perseus Morpheus documentation](https://github.com/PerseusDL/morpheus/blob/master/doc/morpheus.html)
- [Perseids Beta Code mappings](https://github.com/perseids-tools/beta-code-json)
- [SBL Handbook of Style](https://archive.org/details/sblhandbookofsty0000unse_g7i4/)
- [TLG Beta Code Quick Reference Guide](https://stephanus.tlg.uci.edu/encoding/quickbeta.pdf)
