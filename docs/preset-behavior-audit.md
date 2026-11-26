# Preset behavior audit

This is a targeted audit of diacritics, punctuation, and numerals beyond the
[character repertoire audit](preset-repertoire-audit.md). The cited examples
check specific rules; passing them is not a certification of a complete
standard. The precise current options and limitations are listed in the
[preset reference](presets.md). The
[source-traceable BnF, ISO, and BGN/PCGN corpus](preset-conformance-corpus.md)
records executable examples and rules that remain open. The
[ALA-LC corpus](ala-lc-conformance-corpus.md) does the same for the ancient and
modern Greek tables.

| Preset | Rules checked in the test suite | Remaining boundary |
| --- | --- | --- |
| `ala-lc-ancient` | Published text examples; rough breathing when present; contextual `y/u`; nasal gamma; archaic koppa; marked numerals, including `στʹ` and prefix-only thousands, as decimal | Missing breathings and editorial capitalization cannot be inferred from spelling alone; an iota adscript after a marked capital is kept rather than omitted. |
| `ala-lc-modern` | Published letter/notes rows for `μπ/ντ/γκ`, explicitly marked rho, omitted marks, and documented numeral variants | Supplying absent rough breathings or identifying uncertain polytonic/monotonic sources requires lexical or bibliographic context. |
| `bnf-ancient` | Ancient-Greek variant letters; `αυ/ευ/ου`; known smooth breathing, circumflex, keraiai, and marked archaic numerals in Latin output; omission of explicit macron/breve | The upper Cypriot syndyazomeno shares U+0306 with breve; cataloguing variants and the Iliad/Odyssey numeral exception require external context. |
| `iso-843-type-1` | Type 1 letter choices; `αυ/ευ/ου`; capitals of multi-letter spellings; initial smooth breathing; perispomeni as circumflex; question mark, ano teleia, and enotikon; undefined and unresolved archaic mappings | Some reference provisions remain unimplemented; a Latin apostrophe or hyphen cannot by itself establish a smooth breathing or enotikon, and `s` before a hyphen is read as final sigma (note 2). |
| `iso-843-type-2` | Table 2 transcription: `αυ/ευ/ηυ` as `v` or `f` by the next sound, accent moved to the vowel, nasal gamma except before kappa, `μπ` as `b` at word edges, unmarked eta and omega; Table 3 marks and punctuation as for Type 1; undefined and unresolved archaic mappings; every example of the BGN/PCGN table of the ELOT 743 transcription | Not reversible by design; before an archaic letter, upsilon follows that letter's sound; the same apostrophe, hyphen, and note 2 limits as Type 1. The stress that BGN/PCGN marks in unaccented capitals needs a dictionary. |
| `perseus` | Lowercase ASCII Beta Code, letters, and supported diacritics | TLG escapes are outside the cited Perseus subset. |
| `sbl-general` | The table of the SBL Handbook (§5.3): `ē` and `ō`, nasal gamma, `rh` for a rho with a rough breathing and the second of a medial `ρρ`, `y` or `u` by the diphthong, `h` for the rough breathing; no accent, smooth breathing, iota subscript, diaeresis, or coronis | The Handbook asks for Greek characters where the marks it leaves out matter, and for the archaic letters: a converter bound to the preset keeps those letters in Greek. |
| `tlg-core` | Uppercase ASCII Beta Code, additional letters including `#401`, and canonical diacritics | The larger TLG character and escape inventory remains outside the core implementation. |

## Output versus inverse parsing

BnF specifies the right keraia as an acute, the left keraia as a comma, a
combining smooth breathing on the Latin letter, and a combining circumflex
accent. The acute can coincide with a vowel's ordinary accent (`αʹ` and `ά`
both render as `á` under `bnf-ancient`), so the inverse parser does not invent
numeral provenance there, and `convertDetailed()` reports the loss. A
consonant bears no accent: its acute reads back as the keraia (`c̄́` → `ϛʹ`),
as does a comma before `c̄` or `s̄`, the stigma and sampi of numerals
(`,c̄` → `͵ϛ`). When the accents are removed, the right keraia is written `ʹ`,
since an acute would read back as an accent and be removed, and so it is
after a letter with an accent, where an acute would be a second one (`ίʹ` →
`íʹ`), after anything but a letter, and, under monotonic accentuation, after
the vowel of a numeral of one syllable, which would read back as a
monosyllable and lose its accent (`καʹ` → `kaʹ`); the reader takes `ʹ` for
the keraia. The BnF table
also uses both koppa forms with Latin `q`, which likewise cannot be inverted
without source provenance.
Marked uppercase stigma and sampi numerals render with lowercase Latin `c̄`
and `s̄` under BnF; `convertDetailed()` reports the changed case.

ISO 843 transliterates the Greek question mark as `?` and ano teleia as `;`.
The initial smooth breathing is rendered as an apostrophe; an apostrophe in
Latin input is not sufficient evidence for reconstructing that mark.
The enotikon renders as `-` under both ISO 843 types. The inverse parser reads
that glyph as an ordinary hyphen and reports the lost distinction.

The bound converter's `outOfScopeBehavior: "reject"` rejects **recognized**
source characters outside the audited repertoire and known missing ISO 843
letter mappings. It does not reject arbitrary unknown literals, all
information loss, or every unimplemented contextual rule. Inspect
`convertDetailed().losses` separately when preservation of distinctions is
required. Ordinary `convert(..., { preset })` retains the documented
`engine-default` behavior outside the audited boundary.

## Sources

- [ALA-LC Ancient and Medieval Greek](https://www.loc.gov/catdir/cpso/romanization/greeka.pdf)
- [ALA-LC Modern Greek](https://www.loc.gov/catdir/cpso/romanization/greekm.pdf)
- [BGN/PCGN, Romanization of Greek: ELOT 743 System, 1996 Agreement](https://assets.publishing.service.gov.uk/media/5ab4df04e5274a1aa2d41460/ROMANIZATION_OF_GREEK.pdf)
- [BnF transliteration of Greek](https://kitcat.bnf.fr/consignes-catalogage/translitteration-du-grec)
- [ISO 843:1997](https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf)
- [Perseus Morpheus documentation](https://github.com/PerseusDL/morpheus/blob/master/doc/morpheus.html)
- [Perseids Beta Code mappings](https://github.com/perseids-tools/beta-code-json)
- [SBL Handbook of Style](https://archive.org/details/sblhandbookofsty0000unse_g7i4/)
- [TLG Beta Code Quick Reference Guide](https://stephanus.tlg.uci.edu/encoding/quickbeta.pdf)
- [UNGEGN report on United Nations romanization systems: Greek](https://unstats.un.org/unsd/ungegn/working_groups/wg5/documents/wgrr4greek.pdf)
