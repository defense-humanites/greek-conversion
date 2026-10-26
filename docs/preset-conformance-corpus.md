# BnF and ISO 843 Type 1 conformance corpus

The spellings in the executable cases in
[`tests/preset_conformance_test.ts`](../tests/preset_conformance_test.ts)
come from the cited tables and examples. Each case records its section, Greek
input, expected Latin output, and an expected `lossy` flag derived from what
the inverse parser can recover. The test also checks that re-encoding the
Latin result is stable. NFC comparison
allows equivalent precomposed and combining Latin accents; it does not replace
the reference's choice of letters or punctuation.

This is a **selected, source-traceable corpus**, not a claim that either preset
implements every rule. The BnF source describes both its main ISO-based
transliteration (`β → v`, `η → ī`, `φ → f`) and optional ancient-Greek
variants (`b`, `ē`, `ph`). `bnf-core` selects the latter. It cannot decide
whether a catalogue record also needs the main form or an access-point
variant. `iso-843-type-1` selects the main ISO forms.

| Reference | Covered cases | Inverse assessment |
| --- | --- | --- |
| [BnF, §§ 2.1–2.3](https://kitcat.bnf.fr/consignes-catalogage/translitteration-du-grec) | Ancient variants `βηφ → bēph`, `αυ/ευ/ου`, and examples `Θάλασσα → Thálassa`, `Χαρά → Chará`, `Ψάρι → Psári` | The covered letters reparse without reported loss; `ch` is parsed before the standalone Byzantine-sigma `c`. |
| BnF, §§ 4.1–4.3, 7.2 | Initial rough breathing, coronis, smooth breathing, circumflex, U+2010 hyphen, quantity marks, both keraiai, and marked uppercase archaic numerals | Explicit macron/breve are omitted. Numeral keraiai can collide with ordinary comma/accent; the lowercase Latin spellings for uppercase stigma/sampi also lose case. These cases report loss. |
| [ISO 843:1997, Table 1 and note 1](https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf) | `βηφ → vīf`, `αυ/ευ/ου → au/eu/ou` | The selected letter forms reparse without reported loss. |
| ISO 843:1997, Table 1 and note 11 | Capitals `TH`, `CH`, `PS` among capitals (`ΘΑΛΑΣΣΑ → THALASSA`), `Th` before lowercase text, for every preset (`tests/orthography_test.ts`) | Full capitals reparse to the same capitals. |
| ISO 843:1997, Tables 3–4 | Smooth and rough breathings, perispomeni as circumflex (`τοῦ → toû`), question mark versus ano teleia, iota subscript, enotikon, digamma and yot; missing archaic mappings in a bound strict converter | An apostrophe for smooth breathing and a hyphen for enotikon are insufficient to reconstruct those distinctions: both cases report loss. |

## Rules still open

| Source rule | Reference expectation | Current boundary |
| --- | --- | --- |
| BnF, § 4.1.2: Cypriot syndyazomeno | Upper U+0306 and lower U+032E are retained | U+0306 is also the ordinary breve that BnF omits; the source character alone cannot identify which meaning applies. U+032E is not modelled as a semantic mark. |
| ISO 843:1997, note 2: reading `s` back | A Latin `s` followed by a letter or a hyphen is read as medial `σ` | The parser treats a hyphen as a word boundary and reads final `ς` (`as-ta → ας‐τα`). The note concerns a word divided at the end of a line; a hyphen in running text more often joins two words. |
| BnF, §§ 2.1–2.2 and 9.4: catalogue variants and Homeric numerals | Additional forms depend on the record and work | Neither the source text nor a preset identifier provides the required cataloguing context. |

The `outOfScopeBehavior: "reject"` policy checks recognized characters and
known undefined preset mappings. It is not a validator for these contextual
rules and does not imply that all accepted conversions are reversible. Consult
`convertDetailed().losses` for represented distinctions that disappear and the
[behavior audit](preset-behavior-audit.md) for the broader preset boundaries.
