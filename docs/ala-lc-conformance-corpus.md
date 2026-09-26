# ALA-LC Greek conformance corpus

The executable examples in
[`tests/ala_lc_conformance_test.ts`](../tests/ala_lc_conformance_test.ts)
are checked against the Library of Congress's published
[Ancient and Medieval Greek](https://www.loc.gov/catdir/cpso/romanization/greeka.pdf)
and [Modern Greek](https://www.loc.gov/catdir/cpso/romanization/greekm.pdf)
tables. The ancient text examples are quoted from the former table; the
short modern examples combine explicit alphabet and notes rows from the latter.
The cases check Latin output, whether `convertDetailed()` detects information
loss, and the stability of re-encoding that Latin output. They do not assert
that the original Greek can be reconstructed from a romanization that omits
marks or replaces alphabetic numerals with decimal numbers.

| Reference | Covered rules | Inverse assessment |
| --- | --- | --- |
| Ancient table, alphabet and examples | `β → b`, `η → ē`, `φ → ph`, `γγ/γκ/γξ/γχ → ng/nk/nx/nch`, archaic koppa `ϙ → ḳ`, digamma `ϝ → w`, lunate sigma `ϲ → s`, rough breathing on vowels and rho, and contextual `y/u` with omitted diaeresis | Unmarked letters and the selected consonant pairs re-encode stably. Source accents, smooth breathing, coronis, diaeresis, and iota subscript can disappear; those examples report loss. |
| Modern table, alphabet and notes | `β → v`, initial `μπ → b`, initial `ντ → d̲`, positional `γκ → gk/nk/gk`, nasal gamma, `Ῥ/ῥ → Rh/rh` only when marked, and omitted polytonic and monotonic marks | The selected consonant combinations re-encode stably. Omitted source marks report loss; unmarked rho does not acquire an inferred rough breathing. |
| Both tables, numeral lists | `ϝʹ/ϛʹ/στʹ → 6`, `ϙʹ/ϟʹ → 90`, `ϡʹ → 900`, and `͵α/͵αα/͵αβ → 1000/1001/1002` | Decimal output re-encodes stably as decimal text but does not retain the Greek numeral spelling; `convertDetailed()` reports loss. A prefixed sequence that violates the descending numeral order is left untouched. |

## Boundaries still open

| Source rule or example | Why the preset cannot determine it from the input alone |
| --- | --- |
| Ancient table, all-capitals examples such as `ΗΣΙΟΔΟΥ …` → `Hēsiodou …` | Greek capitals do not mark the missing rough breathing, and title-style Latin case requires editorial choices. A mechanical `letterCase` override does not infer either from the text. |
| Ancient example `κεῖται παρ’ Ἅιδῃ` → `keitai par’ Hadē` | The table treats the written iota in `Ἅιδῃ` as an adscript that is omitted, whereas the engine cannot distinguish it from an ordinary iota by Unicode spelling alone; the preset produces `Haidē`. |
| Modern table, missing rough breathing in monotonic or all-capitals text | Supplying `h` where historically appropriate requires language knowledge and sometimes evidence from the item. The preset uses only explicitly marked breathings. |
| Modern table, polytonic versus monotonic identification | The source asks cataloguers to inspect the item or use a publication-date fallback when orthography is unclear. A source string alone cannot supply that bibliographic context. |

The selected corpus establishes specific, traceable behavior, not exhaustive
conformance. See the [preset reference](presets.md) for the current options
and [behavior audit](preset-behavior-audit.md) for scope enforcement.
