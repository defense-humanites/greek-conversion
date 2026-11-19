# Conversion options

Every conversion function takes the same `ConversionOptions`. This document
lists each option with its values, its default, an example of what each
other value changes, and the presets that select it.

Options come in five groups, named after what they describe: `transliteration`
is the Latin writing system, `greek` the Greek one, `betaCode` the Beta Code
conventions, `text` the transformations of the whole text, and `diacritics`
which classes of marks are kept. Two more keys stand beside the groups:

- `preset` names a [preset](presets.md), a set of these same options. The
  defaults apply first, then the preset, then the options given with it.
- `source` gives the options the input is written with, when they are not
  those of the output (see [Reading](stability.md#reading)).

An option acts where what it describes is written or read: the options of
`transliteration` when transliteration is written or read, those of `greek`
when Greek is written (a few of them reach Beta Code), and those of `text` and
`diacritics` in every format. A key or a value that is not listed here throws
an `OptionError`; `CONVERSION_OPTION_VALUES` and `DEFAULT_CONVERSION_OPTIONS`
give the same lists at run time:

```ts
import {
  CONVERSION_OPTION_VALUES,
  DEFAULT_CONVERSION_OPTIONS,
} from "@humanities/greek-conversion";

CONVERSION_OPTION_VALUES.transliteration.beta; // → ["b","v"]
DEFAULT_CONVERSION_OPTIONS.transliteration.beta; // → b
```

The reference below is generated from the library: the texts are those of its
API documentation, and each example is the first word of a probe text that
the value writes otherwise than the default does. Run `npm run docs:options`
after changing an option, its documentation, or a preset. A value with no
example writes the probe text as the default does, or changes only its
spacing.

<!-- BEGIN GENERATED OPTION REFERENCE -->
<!-- This section is generated. Do not edit it directly. -->

## `transliteration`

How the Latin writing system spells Greek: the spelling of each letter and mark, and what a Latin spelling is read back as. These options act when transliteration is written and when it is read.

### `transliteration.beta`

Beta transliteration. Defaults to `"b"`.

Selects `b` or modern `v` for beta in transliteration.

| Value | Example | Presets |
| --- | --- | --- |
| `"b"`, the default |  |  |
| `"v"` | Greek to transliteration: `βαρβάρων` gives `varvárōn` instead of `barbárōn` | `ala-lc-modern`, `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.eta`

Latin letter for eta, which carries the `longVowels` mark: `"e"` (`ē`) or `"i"` (`ī`). Defaults to `"e"`.

Selects the Latin letter for eta in transliteration: `e` or `i`. The letter carries the length mark selected by `transliteration.longVowels`: `ē` or `ī` by default, `ê` or `î` under `longVowels: "circumflex"`.

| Value | Example | Presets |
| --- | --- | --- |
| `"e"`, the default |  |  |
| `"i"` | Greek to transliteration: `Ἕλλησιν` gives `Héllīsin` instead of `Héllēsin` | `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.xi`

Xi transliteration. Defaults to `"x"`.

Selects `x` or `ks` for xi in transliteration.

| Value | Example | Presets |
| --- | --- | --- |
| `"x"`, the default |  |  |
| `"ks"` | Greek to transliteration: `σφίγξ` gives `sphínks` instead of `sphínx` |  |

### `transliteration.phi`

Phi transliteration. Defaults to `"ph"`.

Selects `ph` or `f` for phi in transliteration.

| Value | Example | Presets |
| --- | --- | --- |
| `"ph"`, the default |  |  |
| `"f"` | Greek to transliteration: `σφίγξ` gives `sfínx` instead of `sphínx` | `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.chi`

Chi transliteration. Defaults to `"ch"`.

Selects `ch` or `kh` for chi in transliteration.

| Value | Example | Presets |
| --- | --- | --- |
| `"ch"`, the default |  |  |
| `"kh"` | Greek to transliteration: `ἔλεγχος` gives `élenkhos` instead of `élenchos` |  |

### `transliteration.upsilon`

Upsilon transliteration. Defaults to `"y-with-diphthong-u"`, the SBL academic spelling; `"y-with-au-eu-ou"` uses `u` only in the three cited pairs.

Selects the transliterated spelling of upsilon.

`"y-with-ou-v-f"` follows ISO 843 Type 2: `y`, but `u` in the diphthong `ου`, and in the diphthongs `αυ`, `ευ`, `ηυ` a `v` before a voiced consonant (β, γ, δ, ζ, λ, μ, ν, ρ) or a vowel and an `f` before a voiceless consonant (θ, κ, ξ, π, σ, τ, φ, χ, ψ) or at the end of a word; an accent on that upsilon moves to the preceding vowel (`Εύβοια` → `Évvoia`). The `v` and `f` are read back as beta and phi under `beta: "v"` and `phi: "f"`, as in the `iso-843-type-2` preset, where the spelling is not reversible. Otherwise they read back as that upsilon, with its accent.

| Value | Example | Presets |
| --- | --- | --- |
| `"u"` | Greek to transliteration: `ὑπὲρ` gives `hupèr` instead of `hypèr` |  |
| `"y"` | Greek to transliteration: `εὐθύς` gives `eythýs` instead of `euthýs` |  |
| `"y-with-diphthong-u"`, the default |  | `ala-lc-ancient`, `ala-lc-modern`, `sbl-academic`, `sbl-general` |
| `"y-with-au-eu-ou"` | Greek to transliteration: `ηὑρέθη` gives `hēyréthē` instead of `hēuréthē` | `bnf-core`, `iso-843-type-1` |
| `"y-with-ou-v-f"` | Greek to transliteration: `εὐθύς` gives `efthýs` instead of `euthýs` | `iso-843-type-2` |

### `transliteration.muPi`

Transliteration of `μπ`. Defaults to `"mp"`.

Selects the transliteration of `μπ`: `mp` letter by letter, or `b` at the beginning of a word (`"b-initial"`, ALA-LC) or at either end of it (`"b-initial-final"`, ISO 843 Type 2), `mp` elsewhere. `b` is read back as `μπ` only under `beta: "v"`; otherwise it is also the spelling of beta.

| Value | Example | Presets |
| --- | --- | --- |
| `"mp"`, the default |  |  |
| `"b-initial"` | Greek to transliteration: `μπαμπάς` gives `bampás` instead of `mpampás` | `ala-lc-modern` |
| `"b-initial-final"` | Greek to transliteration: `μπαμπάς` gives `bampás` instead of `mpampás` | `iso-843-type-2` |

### `transliteration.nuTau`

Transliteration of `ντ`. Defaults to `"nt"`.

Selects the transliteration of `ντ`: `nt` letter by letter, or, at the beginning of a word, `d` (`"d-initial"`) or `d̲` (`"d-underline-initial"`, ALA-LC). Only `d̲` is read back as `ντ`, since `d` is also delta.

| Value | Example | Presets |
| --- | --- | --- |
| `"nt"`, the default |  |  |
| `"d-initial"` | Greek to transliteration: `ντομάτα` gives `domáta` instead of `ntomáta` |  |
| `"d-underline-initial"` | Greek to transliteration: `ντομάτα` gives `d̲omáta` instead of `ntomáta` | `ala-lc-modern` |

### `transliteration.rho`

Rho transliteration. Defaults to `"contextual"`.

Selects contextual rho spelling or one final `h` per contiguous rho group.

| Value | Example | Presets |
| --- | --- | --- |
| `"contextual"`, the default |  |  |
| `"systematic"` | Greek to transliteration: `μέρει` gives `mérhei` instead of `mérei` |  |

### `transliteration.nasalGamma`

Nasal gamma spelling. Defaults to `"nasal"`.

Selects contextual nasal gamma (`n`) or literal gamma (`g`).

`"nasal"` writes `n` for gamma before gamma, kappa, xi, and chi (`γγ` → `ng`, `γκ` → `nk`); `"nasal-except-kappa"` does so except before kappa (`γκ` → `gk`), as ISO 843 Type 2 does; `"nasal-medial-kappa"` writes `γκ` as `nk` inside a word and `gk` at its beginning or end, as ALA-LC does for Modern Greek; `"literal"` always writes `g`.

| Value | Example | Presets |
| --- | --- | --- |
| `"nasal"`, the default |  |  |
| `"nasal-except-kappa"` | Greek to transliteration: `ἀνάγκη` gives `anágkē` instead of `anánkē` | `iso-843-type-2` |
| `"nasal-medial-kappa"` | Greek to transliteration: `γκρι` gives `gkri` instead of `nkri` | `ala-lc-modern` |
| `"literal"` | Greek to transliteration: `ἄγγελος` gives `ággelos` instead of `ángelos` | `iso-843-type-1` |

### `transliteration.longVowels`

Length mark of eta and omega in transliteration: `"macron"`, `"circumflex"`, or `"omit"`. Defaults to `"macron"`; `"circumflex"` cannot be combined with `circumflexAccent: "circumflex"`.

Selects the mark that shows the length of eta and omega in transliteration: a macron (`ē`, `ō`), a circumflex (`ê`, `ô`), or none (`e`, `o`, as in ISO 843 Type 2). The letter that carries it on eta is chosen by `transliteration.eta`. The same mark distinguishes stigma and sampi from `c` and `s` (`c̄`, `ĉ`); under `"omit"`, they keep the macron. Explicit philological macrons remain independent semantic marks.

`"omit"` writes eta and omega like epsilon (or iota) and omicron, so they are read back as those letters. `"circumflex"` cannot be combined with `circumflexAccent: "circumflex"`, which would write the length mark and the accent alike.

| Value | Example | Presets |
| --- | --- | --- |
| `"macron"`, the default |  |  |
| `"circumflex"` | Greek to transliteration: `Ἕλλησιν` gives `Héllêsin` instead of `Héllēsin` |  |
| `"omit"` | Greek to transliteration: `Ἕλλησιν` gives `Héllesin` instead of `Héllēsin` | `iso-843-type-2` |

### `transliteration.circumflexAccent`

Circumflex accent in transliteration. Defaults to `"tilde"` (U+0303); `"circumflex"` cannot be combined with `longVowels: "circumflex"`.

Selects the combining mark used for a transliterated circumflex accent.

| Value | Example | Presets |
| --- | --- | --- |
| `"tilde"`, the default |  |  |
| `"circumflex"` | Greek to transliteration: `τῶν` gives `tō̂n` instead of `tō̃n` | `bnf-core`, `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.quantity`

Explicit macron/breve in transliteration. Defaults to `"preserve"`.

Selects whether explicit source quantity marks appear in Latin output.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"omit"` | Greek to transliteration: `ᾱ̓́` gives `á` instead of `ā́` | `bnf-core` |

### `transliteration.smoothBreathing`

Smooth breathing in transliteration; `"apostrophe"` prefixes an initial vowel. Defaults to `"omit"`.

Selects whether a known smooth breathing is rendered on a Latin letter.

| Value | Example | Presets |
| --- | --- | --- |
| `"omit"`, the default |  |  |
| `"greek"` | Greek to transliteration: `ἐγένετο` gives `e̓géneto` instead of `egéneto` | `bnf-core` |
| `"apostrophe"` | Greek to transliteration: `ἐγένετο` gives `’egéneto` instead of `egéneto` | `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.coronis`

Coronis representation in transliteration. Defaults to `"omit"`.

Selects how a semantic coronis is represented in transliteration.

| Value | Example | Presets |
| --- | --- | --- |
| `"omit"`, the default |  |  |
| `"apostrophe"` | Greek to transliteration: `κἀγώ` gives `ka’gṓ` instead of `kagṓ` | `iso-843-type-1`, `iso-843-type-2` |
| `"greek"` | Greek to transliteration: `κἀγώ` gives `ka᾽gṓ` instead of `kagṓ` | `bnf-core` |

### `transliteration.hyphen`

Transliteration hyphen. Defaults to `"ascii"`.

Selects ASCII or typographic hyphen in transliteration output.

| Value | Example | Presets |
| --- | --- | --- |
| `"ascii"`, the default |  |  |
| `"typographic"` | Greek to transliteration: `πολυ-λογία` gives `poly‐logía` instead of `poly-logía` | `bnf-core` |

### `transliteration.keraia`

Keraia marks in transliteration. Defaults to `"greek"`; `"bnf"` is not always reversible.

Selects Greek keraia marks or the BnF comma and combining acute in Latin output. Under `"bnf"`, an acute after a consonant reads back as the right keraia, which a consonant cannot bear as an accent, and a comma before `c̄` or `s̄`, the stigma and sampi of numerals, as the left keraia; after a vowel, the acute reads back as an accent (`αʹ` and `ά` are both `á`). When the acute accents are removed, the right keraia is written `ʹ`, which an acute would not survive.

| Value | Example | Presets |
| --- | --- | --- |
| `"greek"`, the default |  |  |
| `"bnf"` | Greek to transliteration: `ϛʹ` gives `c̄́` instead of `c̄ʹ` | `bnf-core` |

### `transliteration.enotikon`

Transliteration of Greek enotikon (U+203F). Defaults to `"preserve"`.

Preserves the enotikon or renders it as an ambiguous Latin hyphen.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"hyphen"` | Greek to transliteration: `πολυ‿λογία` gives `poly-logía` instead of `poly‿logía` | `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.lunateSigma`

Provenanced lunate sigma transliteration. Defaults to `"s"`.

Selects `s` or `c` for a provenanced lunate sigma in transliteration.

| Value | Example | Presets |
| --- | --- | --- |
| `"s"`, the default |  |  |
| `"c"` | Greek to transliteration: `ϲοφία` gives `cophía` instead of `sophía` | `bnf-core` |

### `transliteration.archaicKoppa`

Archaic-koppa transliteration. Defaults to `"k-dot-below"`; BnF uses `"q"`.

Selects the transliteration emitted for archaic koppa.

| Value | Example | Presets |
| --- | --- | --- |
| `"k-dot-below"`, the default |  |  |
| `"q"` | Greek to transliteration: `ϙ` gives `q` instead of `ḳ` | `bnf-core` |

## `greek`

How Greek is written: letter shapes, accentuation, assimilation, and the Unicode form of the output. `sigma`, `finalSigma`, and `doubleRho` also shape Beta Code, which writes Greek in ASCII; `accentuation` also decides whether reading transliteration infers a smooth breathing, which monotonic Greek has not.

### `greek.sigma`

Sigma glyph policy. Defaults to `"preserve"`, which keeps a lunate sigma the source notes.

Selects the sigma glyph of Greek and Beta Code output. `"preserve"` writes a lunate sigma where the source notes one (`ϲ`, Beta Code `s3`), numerals included, and a standard sigma elsewhere; `"standard"` writes every sigma as `σ` or `ς`; `"lunate"` writes every sigma as `ϲ`, except in numerals.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"standard"` | Greek to Greek: `ϲοφία` gives `σοφία` instead of `ϲοφία` |  |
| `"lunate"` | Greek to Greek: `Ἕλλησιν` gives `Ἕλληϲιν` instead of `Ἕλλησιν` |  |

### `greek.finalSigma`

Lowercase final sigma policy in Greek output. Defaults to `"preserve"`, which retains the sigma shapes the source notes (Greek `σ` and `ς`, Beta Code `s1` and `s2`) and places any other sigma by its position, such as a sigma read from Beta Code `s` or a lunate sigma written as a standard sigma; `"contextual"` places every sigma by its position, correcting a shape the source notes. A sigma before an elision apostrophe is not at the end of its word.

Selects the shape of a standard sigma in lowercase Greek output. `"preserve"` writes the shape the source notes, and places by its position a sigma whose shape the source does not note; `"contextual"` places every sigma by its position (`ς` at the end of a word, `σ` elsewhere); `"medial"` writes `σ` everywhere. Under `"preserve"`, Beta Code writes a noted shape that contradicts the place as `s1` (`σ`) or `s2` (`ς`), as the TLG defines them; otherwise it writes `s`, whose shape the place decides.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"contextual"` | Greek to Greek: `λόγοσ` gives `λόγος` instead of `λόγοσ` |  |
| `"medial"` | Greek to Greek: `λέγεις` gives `λέγεισ` instead of `λέγεις` |  |

### `greek.medialBeta`

Beta glyph. Defaults to `"preserve"`, which keeps a `ϐ` the source notes.

Selects the beta of Greek output. `"preserve"` writes `ϐ` where the source notes it and `β` elsewhere; `"symbol"` writes `ϐ` inside a word and `β` at its start, as French typography does, whatever the source; `"standard"` writes `β` everywhere.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"standard"` | Greek to Greek: `ϐίος` gives `βίος` instead of `ϐίος` |  |
| `"symbol"` | Greek to Greek: `βαρβάρων` gives `βαρϐάρων` instead of `βαρβάρων` |  |

### `greek.symbolForms`

Symbol forms of letters, such as `ϑ`. Defaults to `"preserve"`.

Selects the symbol forms of letters in Greek output: `ϑ`, `ϴ`, `ϕ`, `ϖ`, `ϰ`, `ϱ`, `ϵ`, and `ϒ` with its accented forms `ϓ` and `ϔ`, and the final sigma `ς` written for a stigma as the units of a numeral (`ιςʹ`, 16). `"preserve"` writes those the source notes, and `"standard"` the ordinary letters (`ιϛʹ`). No value writes a symbol form where the source has an ordinary letter, which Unicode reserves them for mathematics. The beta symbol `ϐ` follows `medialBeta`, and the lunate sigma `ϲ` follows `sigma`.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"standard"` | Greek to Greek: `ϑεός` gives `θεός` instead of `ϑεός` |  |

### `greek.iotaSubscript`

Where a kept iota subscript is written. Defaults to `"subscript"`; whether it is kept is `diacritics.iotaSubscript`.

Selects where Greek output writes a kept iota subscript.

`"subscript"` writes it below the line, and after a capital as the prosgegrammeni (`ᾳ`, `ᾼ`). `"capital-adscript"` writes it on the line after a capital, as Smyth (§ 5) describes and as Unicode's uppercase mapping does (`ᾨδῇ` → `Ὠιδῇ`, `ΤΗΙ ΩΙΔΗΙ`), and below the line elsewhere; `"adscript"` writes it on the line after every vowel (`τῶι`), as some editions and papyrological transcriptions do. An iota written on the line reads back as the letter iota, so a conversion that writes one reports the loss of the subscript.

| Value | Example | Presets |
| --- | --- | --- |
| `"subscript"`, the default |  |  |
| `"capital-adscript"` | Greek to Greek: `ᾨδῇ` gives `Ὠιδῇ` instead of `ᾨδῇ` |  |
| `"adscript"` | Greek to Greek: `ᾠδῇ` gives `ὠιδῆι` instead of `ᾠδῇ` |  |

### `greek.doubleRho`

Double-rho marks in Greek output. Defaults to `"unmarked"`.

Controls marks added to a pair of consecutive rho in Greek output.

| Value | Example | Presets |
| --- | --- | --- |
| `"unmarked"`, the default |  |  |
| `"smooth-rough"` | Greek to Greek: `ἄρρητος` gives `ἄῤῥητος` instead of `ἄρρητος` |  |

### `greek.dentalSigma`

Dental assimilation before sigma. Defaults to `"preserve"`.

Preserves a dental before sigma or applies the lossy assimilation.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"assimilate"` | Greek to Greek: `ἐλπίδσι` gives `ἐλπίσι` instead of `ἐλπίδσι` |  |

### `greek.elidedStop`

An elided `π`, `τ`, or `κ` before a rough breathing. Defaults to `"preserve"`, which keeps the consonant the source writes; `"aspirate"` writes `φ`, `θ`, or `χ`.

Selects how Greek output writes a final `π`, `τ`, or `κ` whose vowel is elided before a word with a rough breathing. `"preserve"` keeps the consonant the source writes: `ἀπ’ οὗ`, as Ionic prose and many editions have it, stays, and so does `ἀφ’ οὗ`. `"aspirate"` writes the aspirated consonant that Attic spelling requires (`ἀπ’ οὗ` → `ἀφ’ οὗ`, `κατ’ ἡμέραν` → `καθ’ ἡμέραν`); the conversion then reports the consonant it replaced as lost. Beta Code and transliteration write the consonant of the source in either case.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"aspirate"` | Greek to Greek: `ἀπ’` gives `ἀφ’` instead of `ἀπ’` |  |

### `greek.accentuation`

Greek accentuation system. Defaults to `"polytonic"`; `"monotonic"` follows the monotonic rules, monosyllables included, as far as the written text allows.

Selects polytonic output or a mechanical, lossy monotonic transformation.

| Value | Example | Presets |
| --- | --- | --- |
| `"polytonic"`, the default |  |  |
| `"monotonic"` | Greek to Greek: `Ἕλλησιν` gives `Έλλησιν` instead of `Ἕλλησιν` |  |

### `greek.composition`

Composed or decomposed output. Defaults to `"composed"`.

Selects composed or canonically decomposed Greek Unicode output.

| Value | Example | Presets |
| --- | --- | --- |
| `"composed"`, the default |  |  |
| `"decomposed"` | Greek to Greek: U+0395 U+0314 U+0301 instead of U+1F1D in `Ἕλλησιν` |  |

### `greek.acute`

Tonos/oxia preference for eligible acute vowels. Defaults to `"system"`: oxia in output that carries a polytonic mark, tonos otherwise.

Selects the composed Unicode form of an acute where Unicode has two: the tonos (`ά`, U+03AC), which is also what NFC gives, or the oxia (`ά`, U+1F71). `"system"` writes the oxia when the Greek output carries a polytonic mark (a breathing, a grave, a circumflex, an iota subscript, a coronis, or a quantity mark) and the tonos when it carries none, as monotonic text is written and as `accentuation: "monotonic"` writes it. The choice is made for the whole output of one conversion: a polytonic text converted word by word needs `"oxia"` to write every acute alike.

| Value | Example | Presets |
| --- | --- | --- |
| `"system"`, the default |  |  |
| `"tonos"` | Greek to Greek: U+03AD instead of U+1F73 in `ἐγένετο` |  |
| `"oxia"` | Greek to Greek: U+1F77 instead of U+03AF in `ϲοφία` |  |

### `greek.questionMark`

Greek question-mark scalar. Defaults to `"canonical"`.

Selects the Unicode scalar used for Greek question marks.

| Value | Example | Presets |
| --- | --- | --- |
| `"canonical"`, the default |  |  |
| `"semicolon"` |  |  |
| `"greek"` | Greek to Greek: U+037E instead of U+003B in `λέγεις;` | `bnf-core` |

### `greek.anoTeleia`

Greek ano-teleia scalar. Defaults to `"canonical"`.

Selects the Unicode scalar used for Greek ano teleia.

| Value | Example | Presets |
| --- | --- | --- |
| `"canonical"`, the default |  |  |
| `"middle-dot"` |  |  |
| `"greek"` | Greek to Greek: U+0387 instead of U+00B7 in `βαρβάρων·` |  |

## `betaCode`

How Beta Code is written.

### `betaCode.case`

Insignificant ASCII letter case of Beta Code output. Defaults to `"lowercase"`.

Selects the insignificant ASCII letter case used in Beta Code output.

| Value | Example | Presets |
| --- | --- | --- |
| `"lowercase"`, the default |  | `perseus` |
| `"uppercase"` | Greek to Beta Code: `Ἕλλησιν` gives `*(/ELLHSIN` instead of `*(/ellhsin` | `tlg-core` |

### `betaCode.yot`

Beta Code spelling of yot. Defaults to `"j"`; TLG uses `"#401"`.

Selects the Beta Code spelling emitted for yot.

| Value | Example | Presets |
| --- | --- | --- |
| `"j"`, the default |  |  |
| `"#401"` | Greek to Beta Code: `ϳ` gives `#401` instead of `j` | `tlg-core` |

## `text`

Transformations of the text as a whole, in every output format.

### `text.letterCase`

Semantic letter case applied to recognized graphemes. Defaults to `"preserve"`.

Selects the mechanical case transformation applied during rendering.

`"preserve"` keeps the case of the source. In transliteration, a capital spelled with several Latin letters (`TH`, `CH`, `PS`, and the `H` of a rough breathing or of rho) is written in full capitals among capitals, and with its first letter only before lowercase text, which ISO 843 allows (note 11): `ΘΑΛΑΣΣΑ` → `THALASSA`, `Θάλασσα` → `Thálassa`. A capital consonant on its own, such as a letter name, a numeral, or a siglum, is written in full capitals (`Θ` → `TH`), except before a period, where it is an abbreviated initial (`Θ.` → `Th.`). A vowel with a rough breathing on its own, such as the article at the head of a sentence, keeps its first letter only (`Ὁ` → `Ho`).

`"title"` capitalizes the first letter of each word; an apostrophe between two letters, as a coronis written so (`Ka’gṓ`), does not start a word.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"lowercase"` | Greek to transliteration: `Ἕλλησιν` gives `héllēsin` instead of `Héllēsin` |  |
| `"uppercase"` | Greek to transliteration: `Ἕλλησιν` gives `HÉLLĒSIN` instead of `Héllēsin` |  |
| `"title"` | Greek to transliteration: `ἐγένετο` gives `Egéneto` instead of `egéneto` |  |

### `text.whitespace`

Whitespace rendering. Defaults to `"preserve"`.

Preserves whitespace, or collapses it: `"collapse"` trims the text and reduces each run of Unicode whitespace to one space.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"collapse"` |  |  |

### `text.numerals`

Alphabetic or decimal numeral output. Defaults to `"alphabetic"`.

Preserves marked alphabetic numerals or renders valid groups as decimals.

| Value | Example | Presets |
| --- | --- | --- |
| `"alphabetic"`, the default |  |  |
| `"decimal"` | Greek to transliteration: `ϛʹ` gives `6` instead of `c̄ʹ` | `ala-lc-ancient`, `ala-lc-modern` |

## `diacritics`

Which semantic diacritics are kept. `all` sets every class at once; a class named alongside it is the exception: `{ all: "remove", roughBreathing: "preserve" }`. The shorthand is expanded where it is written, so `all` in the caller's options overrides every class a preset set.

Removing a class removes its marks from the output in every format. In transliteration the rough breathing is a letter, `h`: it goes with its class, so `{ all: "remove", roughBreathing: "preserve" }` keeps it. The letters stay as they are spelled: in transliteration, eta and omega keep the length mark that `longVowels` selects (`η` → `ē`, `ω` → `ō` by default), which spells the letter and is not a diacritic.

### `diacritics.all`

Disposition of every class not named alongside.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"` |  |  |
| `"remove"` | Greek to Greek: `Ἕλλησιν` gives `Ελλησιν` instead of `Ἕλλησιν` |  |

### `diacritics.accents`

Accent marks: acute, grave, and circumflex. Defaults to `"preserve"`.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"remove"` | Greek to Greek: `Ἕλλησιν` gives `Ἑλλησιν` instead of `Ἕλλησιν` | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

### `diacritics.smoothBreathing`

Initial smooth breathing marks. Defaults to `"preserve"`.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"remove"` | Greek to Greek: `ἐγένετο` gives `εγένετο` instead of `ἐγένετο` | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

### `diacritics.roughBreathing`

Initial rough breathing marks. Defaults to `"preserve"`.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |
| `"remove"` | Greek to Greek: `Ἕλλησιν` gives `Έλλησιν` instead of `Ἕλλησιν` |  |

### `diacritics.coronis`

Internal coronides marking crasis. Defaults to `"preserve"`.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"remove"` | Greek to Greek: `κἀγώ` gives `καγώ` instead of `κἀγώ` | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

### `diacritics.diaeresis`

Diaeresis marks. Defaults to `"preserve"`.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  | `sbl-general` |
| `"remove"` | Greek to Greek: `ὑϊός` gives `ὑιός` instead of `ὑϊός` | `ala-lc-ancient`, `ala-lc-modern` |

### `diacritics.iotaSubscript`

Iota subscripts. Defaults to `"preserve"`.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"remove"` | Greek to Greek: `ᾠδῇ` gives `ὠδῆ` instead of `ᾠδῇ` | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

### `diacritics.quantity`

Explicit macron and breve quantity marks. Defaults to `"preserve"`.

| Value | Example | Presets |
| --- | --- | --- |
| `"preserve"`, the default |  |  |
| `"remove"` | Greek to Greek: `ᾱ̓́` gives `ἄ` instead of `ᾱ̓́` | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

<!-- END GENERATED OPTION REFERENCE -->
