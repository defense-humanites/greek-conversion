# Conversion options

Every conversion function takes the same `ConversionOptions`. This document
lists each option with its values, its default, an example of what each
value writes, and the presets that select it.

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
API documentation, and each example is the first word of a probe text that the
value writes otherwise than the default does. The head of each table names the
conversion its examples go through; the default writes the words that the other
values change, and two writings that look alike are told apart by the scalars
that differ. A preset is listed under the value it selects, not under a default
it leaves as it is, which may concern what its standard does not cover;
[Presets](presets.md) gives the options of each. Run `npm run docs:options`
after changing an option, its documentation, or a preset. A value with no
example writes the probe text as the default does, or changes only its spacing.

<!-- BEGIN GENERATED OPTION REFERENCE -->
<!-- This section is generated. Do not edit it directly. -->

## `transliteration`

How the Latin writing system spells Greek: the spelling of each letter and mark, and what a Latin spelling is read back as. These options act when transliteration is written and when it is read.

### `transliteration.beta`

Beta transliteration. Defaults to `"b"`.

Selects `b` or modern `v` for beta in transliteration.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"b"` (default) | <span class="conversion"><span lang="el">βαρβάρων</span> <span class="to">→</span> barbárōn</span> |  |
| `"v"` | <span class="conversion"><span lang="el">βαρβάρων</span> <span class="to">→</span> varvárōn</span> | `ala-lc-modern`, `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.eta`

Latin letter for eta, which carries the `longVowels` mark: `"e"` (`ē`) or `"i"` (`ī`). Defaults to `"e"`.

Selects the Latin letter for eta in transliteration: `e` or `i`. The letter carries the length mark selected by `transliteration.longVowels`: `ē` or `ī` by default, `ê` or `î` under `longVowels: "circumflex"`.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"e"` (default) | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> Héllēsin</span> |  |
| `"i"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> Héllīsin</span> | `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.xi`

Xi transliteration. Defaults to `"x"`.

Selects `x` or `ks` for xi in transliteration.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"x"` (default) | <span class="conversion"><span lang="el">σφίγξ</span> <span class="to">→</span> sphínx</span> |  |
| `"ks"` | <span class="conversion"><span lang="el">σφίγξ</span> <span class="to">→</span> sphínks</span> |  |

### `transliteration.phi`

Phi transliteration. Defaults to `"ph"`.

Selects `ph` or `f` for phi in transliteration.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"ph"` (default) | <span class="conversion"><span lang="el">σφίγξ</span> <span class="to">→</span> sphínx</span> |  |
| `"f"` | <span class="conversion"><span lang="el">σφίγξ</span> <span class="to">→</span> sfínx</span> | `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.chi`

Chi transliteration. Defaults to `"ch"`.

Selects `ch` or `kh` for chi in transliteration.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"ch"` (default) | <span class="conversion"><span lang="el">ἔλεγχος</span> <span class="to">→</span> élenchos</span> |  |
| `"kh"` | <span class="conversion"><span lang="el">ἔλεγχος</span> <span class="to">→</span> élenkhos</span> |  |

### `transliteration.upsilon`

Upsilon transliteration. Defaults to `"y-with-diphthong-u"`, the spelling of the SBL Handbook; `"y-with-au-eu-ou"` uses `u` only in the three cited pairs.

Selects the transliterated spelling of upsilon.

`"y-with-ou-v-f"` follows ISO 843 Type 2: `y`, but `u` in the diphthong `ου`, and in the diphthongs `αυ`, `ευ`, `ηυ` a `v` before a voiced consonant (β, γ, δ, ζ, λ, μ, ν, ρ) or a vowel and an `f` before a voiceless consonant (θ, κ, ξ, π, σ, τ, φ, χ, ψ) or at the end of a word; an accent on that upsilon moves to the preceding vowel (`Εύβοια` → `Évvoia`). The `v` and `f` are read back as beta and phi under `beta: "v"` and `phi: "f"`, as in the `iso-843-type-2` preset, where the spelling is not reversible. Otherwise they read back as that upsilon, with its accent.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"u"` | <span class="conversion"><span lang="el">ὑπὲρ</span> <span class="to">→</span> hupèr</span> |  |
| `"y"` | <span class="conversion"><span lang="el">εὐθύς</span> <span class="to">→</span> eythýs</span> |  |
| `"y-with-diphthong-u"` (default) | <span class="conversion"><span lang="el">ὑπὲρ</span> <span class="to">→</span> hypèr</span><br><span class="conversion"><span lang="el">εὐθύς</span> <span class="to">→</span> euthýs</span><br><span class="conversion"><span lang="el">ηὑρέθη</span> <span class="to">→</span> hēuréthē</span> | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |
| `"y-with-au-eu-ou"` | <span class="conversion"><span lang="el">ηὑρέθη</span> <span class="to">→</span> hēyréthē</span> | `bnf-core`, `iso-843-type-1` |
| `"y-with-ou-v-f"` | <span class="conversion"><span lang="el">εὐθύς</span> <span class="to">→</span> efthýs</span> | `iso-843-type-2` |

### `transliteration.muPi`

Transliteration of `μπ`. Defaults to `"mp"`.

Selects the transliteration of `μπ`: `mp` letter by letter, or `b` at the beginning of a word (`"b-initial"`, ALA-LC) or at either end of it (`"b-initial-final"`, ISO 843 Type 2), `mp` elsewhere. `b` is read back as `μπ` only under `beta: "v"`; otherwise it is also the spelling of beta.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"mp"` (default) | <span class="conversion"><span lang="el">μπαμπάς</span> <span class="to">→</span> mpampás</span> |  |
| `"b-initial"` | <span class="conversion"><span lang="el">μπαμπάς</span> <span class="to">→</span> bampás</span> | `ala-lc-modern` |
| `"b-initial-final"` | <span class="conversion"><span lang="el">μπαμπάς</span> <span class="to">→</span> bampás</span> | `iso-843-type-2` |

### `transliteration.nuTau`

Transliteration of `ντ`. Defaults to `"nt"`.

Selects the transliteration of `ντ`: `nt` letter by letter, or, at the beginning of a word, `d` (`"d-initial"`) or `d̲` (`"d-underline-initial"`, ALA-LC). Only `d̲` is read back as `ντ`, since `d` is also delta.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"nt"` (default) | <span class="conversion"><span lang="el">ντομάτα</span> <span class="to">→</span> ntomáta</span> |  |
| `"d-initial"` | <span class="conversion"><span lang="el">ντομάτα</span> <span class="to">→</span> domáta</span> |  |
| `"d-underline-initial"` | <span class="conversion"><span lang="el">ντομάτα</span> <span class="to">→</span> d̲omáta</span> | `ala-lc-modern` |

### `transliteration.rho`

Rho transliteration. Defaults to `"contextual"`.

Selects contextual rho spelling or one final `h` per contiguous rho group.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"contextual"` (default) | <span class="conversion"><span lang="el">μέρει</span> <span class="to">→</span> mérei</span> |  |
| `"systematic"` | <span class="conversion"><span lang="el">μέρει</span> <span class="to">→</span> mérhei</span> |  |

### `transliteration.nasalGamma`

Nasal gamma spelling. Defaults to `"nasal"`.

Selects contextual nasal gamma (`n`) or literal gamma (`g`).

`"nasal"` writes `n` for gamma before gamma, kappa, xi, and chi (`γγ` → `ng`, `γκ` → `nk`); `"nasal-except-kappa"` does so except before kappa (`γκ` → `gk`), as ISO 843 Type 2 does; `"nasal-medial-kappa"` writes `γκ` as `nk` inside a word and `gk` at its beginning or end, as ALA-LC does for Modern Greek; `"literal"` always writes `g`.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"nasal"` (default) | <span class="conversion"><span lang="el">ἀνάγκη</span> <span class="to">→</span> anánkē</span><br><span class="conversion"><span lang="el">γκρι</span> <span class="to">→</span> nkri</span><br><span class="conversion"><span lang="el">ἄγγελος</span> <span class="to">→</span> ángelos</span> |  |
| `"nasal-except-kappa"` | <span class="conversion"><span lang="el">ἀνάγκη</span> <span class="to">→</span> anágkē</span> | `iso-843-type-2` |
| `"nasal-medial-kappa"` | <span class="conversion"><span lang="el">γκρι</span> <span class="to">→</span> gkri</span> | `ala-lc-modern` |
| `"literal"` | <span class="conversion"><span lang="el">ἄγγελος</span> <span class="to">→</span> ággelos</span> | `iso-843-type-1` |

### `transliteration.longVowels`

Length mark of eta and omega in transliteration: `"macron"`, `"circumflex"`, or `"omit"`. Defaults to `"macron"`; `"circumflex"` cannot be combined with `circumflexAccent: "circumflex"`.

Selects the mark that shows the length of eta and omega in transliteration: a macron (`ē`, `ō`), a circumflex (`ê`, `ô`), or none (`e`, `o`, as in ISO 843 Type 2). The letter that carries it on eta is chosen by `transliteration.eta`. The same mark distinguishes stigma and sampi from `c` and `s` (`c̄`, `ĉ`); under `"omit"`, they keep the macron. Explicit philological macrons remain independent semantic marks.

`"omit"` writes eta and omega like epsilon (or iota) and omicron, so they are read back as those letters. `"circumflex"` cannot be combined with `circumflexAccent: "circumflex"`, which would write the length mark and the accent alike.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"macron"` (default) | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> Héllēsin</span> |  |
| `"circumflex"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> Héllêsin</span> |  |
| `"omit"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> Héllesin</span> | `iso-843-type-2` |

### `transliteration.circumflexAccent`

Circumflex accent in transliteration. Defaults to `"tilde"` (U+0303); `"circumflex"` cannot be combined with `longVowels: "circumflex"`.

Selects the combining mark used for a transliterated circumflex accent.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"tilde"` (default) | <span class="conversion"><span lang="el">τῶν</span> <span class="to">→</span> tō̃n</span> |  |
| `"circumflex"` | <span class="conversion"><span lang="el">τῶν</span> <span class="to">→</span> tō̂n</span> | `bnf-core`, `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.quantity`

Explicit macron/breve in transliteration. Defaults to `"preserve"`.

Selects whether explicit source quantity marks appear in Latin output.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ᾱ̓́</span> <span class="to">→</span> ā́</span> |  |
| `"omit"` | <span class="conversion"><span lang="el">ᾱ̓́</span> <span class="to">→</span> á</span> | `bnf-core` |

### `transliteration.smoothBreathing`

Smooth breathing in transliteration; `"apostrophe"` prefixes the vowel group of a word, and reads back before it. Defaults to `"omit"`.

Selects whether a known smooth breathing is rendered on a Latin letter.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"omit"` (default) | <span class="conversion"><span lang="el">ἐγένετο</span> <span class="to">→</span> egéneto</span> |  |
| `"greek"` | <span class="conversion"><span lang="el">ἐγένετο</span> <span class="to">→</span> e̓géneto</span> | `bnf-core` |
| `"apostrophe"` | <span class="conversion"><span lang="el">ἐγένετο</span> <span class="to">→</span> ’egéneto</span> | `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.coronis`

Coronis representation in transliteration. Defaults to `"omit"`.

Selects how a semantic coronis is represented in transliteration.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"omit"` (default) | <span class="conversion"><span lang="el">κἀγώ</span> <span class="to">→</span> kagṓ</span> |  |
| `"apostrophe"` | <span class="conversion"><span lang="el">κἀγώ</span> <span class="to">→</span> ka’gṓ</span> | `iso-843-type-1`, `iso-843-type-2` |
| `"greek"` | <span class="conversion"><span lang="el">κἀγώ</span> <span class="to">→</span> ka᾽gṓ</span> | `bnf-core` |

### `transliteration.hyphen`

Transliteration hyphen. Defaults to `"ascii"`.

Selects ASCII or typographic hyphen in transliteration output.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"ascii"` (default) | <span class="conversion"><span lang="el">πολυ-λογία</span> <span class="to">→</span> poly-logía</span> |  |
| `"typographic"` | <span class="conversion"><span lang="el">πολυ-λογία</span> <span class="to">→</span> poly‐logía</span> | `bnf-core` |

### `transliteration.keraia`

Keraia marks in transliteration. Defaults to `"greek"`; `"bnf"` is not always reversible.

Selects Greek keraia marks or the BnF comma and combining acute in Latin output. Under `"bnf"`, an acute after a consonant reads back as the right keraia, which a consonant cannot bear as an accent, and a comma before `c̄` or `s̄`, the stigma and sampi of numerals, as the left keraia; after a vowel, the acute reads back as an accent (`αʹ` and `ά` are both `á`). When the acute accents are removed, the right keraia is written `ʹ`, which an acute would not survive.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"greek"` (default) | <span class="conversion"><span lang="el">ϛʹ</span> <span class="to">→</span> c̄ʹ</span> |  |
| `"bnf"` | <span class="conversion"><span lang="el">ϛʹ</span> <span class="to">→</span> c̄́</span> | `bnf-core` |

### `transliteration.enotikon`

Transliteration of Greek enotikon (U+203F). Defaults to `"preserve"`.

Preserves the enotikon or renders it as an ambiguous Latin hyphen.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">πολυ‿λογία</span> <span class="to">→</span> poly‿logía</span> |  |
| `"hyphen"` | <span class="conversion"><span lang="el">πολυ‿λογία</span> <span class="to">→</span> poly-logía</span> | `iso-843-type-1`, `iso-843-type-2` |

### `transliteration.lunateSigma`

Provenanced lunate sigma transliteration. Defaults to `"s"`.

Selects `s` or `c` for a provenanced lunate sigma in transliteration.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"s"` (default) | <span class="conversion"><span lang="el">ϲοφία</span> <span class="to">→</span> sophía</span> |  |
| `"c"` | <span class="conversion"><span lang="el">ϲοφία</span> <span class="to">→</span> cophía</span> | `bnf-core` |

### `transliteration.archaicKoppa`

Archaic-koppa transliteration. Defaults to `"k-dot-below"`; BnF uses `"q"`.

Selects the transliteration emitted for archaic koppa.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"k-dot-below"` (default) | <span class="conversion"><span lang="el">ϙ</span> <span class="to">→</span> ḳ</span> |  |
| `"q"` | <span class="conversion"><span lang="el">ϙ</span> <span class="to">→</span> q</span> | `bnf-core` |

## `greek`

How Greek is written: letter shapes, accentuation, assimilation, and the Unicode form of the output. `sigma`, `finalSigma`, and `doubleRho` also shape Beta Code, which writes Greek in ASCII. `accentuation` shapes every format, since Beta Code and transliteration spell the accents of Greek: monotonic accentuation writes the monotonic text in each, and reading transliteration then infers no smooth breathing, which monotonic Greek has not.

### `greek.sigma`

Sigma glyph policy. Defaults to `"preserve"`, which keeps a lunate sigma the source notes.

Selects the sigma glyph of Greek and Beta Code output. `"preserve"` writes a lunate sigma where the source notes one (`ϲ`, Beta Code `s3`), numerals included, and a standard sigma elsewhere; `"standard"` writes every sigma as `σ` or `ς`; `"lunate"` writes every sigma as `ϲ`, except in numerals.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ϲοφία</span> <span class="to">→</span> <span lang="el">ϲοφία</span></span><br><span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Ἕλλησιν</span></span> |  |
| `"standard"` | <span class="conversion"><span lang="el">ϲοφία</span> <span class="to">→</span> <span lang="el">σοφία</span></span> |  |
| `"lunate"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Ἕλληϲιν</span></span> |  |

### `greek.finalSigma`

Lowercase final sigma policy in Greek output. Defaults to `"preserve"`, which retains the sigma shapes the source notes (Greek `σ` and `ς`, Beta Code `s1` and `s2`) and places any other sigma by its position, such as a sigma read from Beta Code `s` or a lunate sigma written as a standard sigma; `"contextual"` places every sigma by its position, correcting a shape the source notes. A sigma before an elision apostrophe is not at the end of its word.

Selects the shape of a standard sigma in lowercase Greek output. `"preserve"` writes the shape the source notes, and places by its position a sigma whose shape the source does not note; `"contextual"` places every sigma by its position (`ς` at the end of a word, `σ` elsewhere); `"medial"` writes `σ` everywhere. Under `"preserve"`, Beta Code writes a noted shape that contradicts the place as `s1` (`σ`) or `s2` (`ς`), as the TLG defines them; otherwise it writes `s`, whose shape the place decides.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">λόγοσ</span> <span class="to">→</span> <span lang="el">λόγοσ</span></span><br><span class="conversion"><span lang="el">λέγεις</span> <span class="to">→</span> <span lang="el">λέγεις</span></span> |  |
| `"contextual"` | <span class="conversion"><span lang="el">λόγοσ</span> <span class="to">→</span> <span lang="el">λόγος</span></span> |  |
| `"medial"` | <span class="conversion"><span lang="el">λέγεις</span> <span class="to">→</span> <span lang="el">λέγεισ</span></span> |  |

### `greek.medialBeta`

Beta glyph. Defaults to `"preserve"`, which keeps a `ϐ` the source notes.

Selects the beta of Greek output. `"preserve"` writes `ϐ` where the source notes it and `β` elsewhere; `"symbol"` writes `ϐ` inside a word and `β` at its start, as French typography does, whatever the source; `"standard"` writes `β` everywhere.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ϐίος</span> <span class="to">→</span> <span lang="el">ϐίος</span></span><br><span class="conversion"><span lang="el">βαρβάρων</span> <span class="to">→</span> <span lang="el">βαρβάρων</span></span> |  |
| `"standard"` | <span class="conversion"><span lang="el">ϐίος</span> <span class="to">→</span> <span lang="el">βίος</span></span> |  |
| `"symbol"` | <span class="conversion"><span lang="el">βαρβάρων</span> <span class="to">→</span> <span lang="el">βαρϐάρων</span></span> |  |

### `greek.symbolForms`

Symbol forms of letters, such as `ϑ`. Defaults to `"preserve"`.

Selects the symbol forms of letters in Greek output: `ϑ`, `ϴ`, `ϕ`, `ϖ`, `ϰ`, `ϱ`, `ϵ`, and `ϒ` with its accented forms `ϓ` and `ϔ`, and the final sigma `ς` written for a stigma as the units of a numeral (`ιςʹ`, 16). `"preserve"` writes those the source notes, and `"standard"` the ordinary letters (`ιϛʹ`). No value writes a symbol form where the source has an ordinary letter, which Unicode reserves them for mathematics. The beta symbol `ϐ` follows `medialBeta`, and the lunate sigma `ϲ` follows `sigma`.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ϑεός</span> <span class="to">→</span> <span lang="el">ϑεός</span></span> |  |
| `"standard"` | <span class="conversion"><span lang="el">ϑεός</span> <span class="to">→</span> <span lang="el">θεός</span></span> |  |

### `greek.ligatures`

Signs that stand for several letters, such as `ϗ` for `και`. Defaults to `"preserve"`.

Selects how Greek output writes the signs that stand for several letters, which reading the source gives as those letters: the καί symbol `ϗ` (`και`), the ου ligature `ȣ` (`ου`), and the στ ligature `ϛ` that `stigma: "ligature"` reads. `"preserve"` writes the signs the source has, and `"standard"` the letters. No value writes a sign where the source has the letters. Beta Code writes the TLG codes of `ϗ` and `Ϗ` (`#1532`, `#1531`) and of the capital `Ȣ` (`#1521`) under `"preserve"`, and transliteration always writes the letters.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ϗ</span> <span class="to">→</span> <span lang="el">ϗ</span></span> |  |
| `"standard"` | <span class="conversion"><span lang="el">ϗ</span> <span class="to">→</span> <span lang="el">και</span></span> |  |

### `greek.stigma`

How a stigma between two letters is read, in every format. Defaults to `"letter"`; `"ligature"` reads `σ` and `τ`.

Selects how a stigma between two letters is read, in every format (`ϛ`, Beta Code `#2`, transliteration `c̄`). `"letter"` reads it as the letter stigma, the numeral six (`ἐϛὶ` gives `ec̄ì`); `"ligature"` as `σ` and `τ`, which older printing joined in that sign (`ἐϛὶ` gives `estì`). A stigma after a letter but before none (`ιϛ`), or before a keraia, is read as the letter either way. This option bears on reading only: Greek output writes `ϛ` for `στ` only where the source has it, under `ligatures: "preserve"`.

| Value | Greek → Beta Code | Presets |
| --- | --- | --- |
| `"letter"` (default) | <span class="conversion"><span lang="el">ἐϛὶ</span> <span class="to">→</span> <code>e)#2i\</code></span> |  |
| `"ligature"` | <span class="conversion"><span lang="el">ἐϛὶ</span> <span class="to">→</span> <code>e)sti\</code></span> |  |

### `greek.kaiAccent`

The accent of `καί` written for `ϗ` as letters. Defaults to `"none"`; `"byzantine"` writes the grave, `"modern"` follows modern editions.

Selects the accent written on `καί` where the καί symbol `ϗ`, which marks none, is written as letters: in transliteration, and in Greek and Beta Code under `ligatures: "standard"`. `"none"` writes no accent (`και`, `kai`). `"byzantine"` writes the grave, as Byzantine manuscripts do even before punctuation (`καὶ`). `"modern"` follows modern editions: the acute before punctuation, at the end of the text, and before an enclitic (`καί τινες`, `καί μ’`), and the grave elsewhere (`καὶ ὁ`, `καὶ ἔστι`, `καὶ τίς`). Where the form alone does not decide, it writes the grave before `οἱ` and before an accented enclitic, and the acute before a comma and `σ’`. No accent is written on a sign that has one, in capitals, or in a text with no polytonic mark (a breathing, a grave, a circumflex, an iota subscript, a coronis, or a quantity mark), which may be monotonic or unaccented. Each accent written is reported as an added diacritic.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"none"` (default) | <span class="conversion"><span lang="el">ϗ</span> <span class="to">→</span> kai</span> |  |
| `"byzantine"` | <span class="conversion"><span lang="el">ϗ</span> <span class="to">→</span> kaì</span> |  |
| `"modern"` | <span class="conversion"><span lang="el">ϗ</span> <span class="to">→</span> kaì</span> |  |

### `greek.iotaSubscript`

Where a kept iota subscript is written. Defaults to `"subscript"`; whether it is kept is `diacritics.iotaSubscript`.

Selects where Greek output writes a kept iota subscript.

`"subscript"` writes it below the line, and after a capital as the prosgegrammeni (`ᾳ`, `ᾼ`). `"capital-adscript"` writes it on the line after a capital, as Smyth (§ 5) describes and as Unicode's uppercase mapping does (`ᾨδῇ` → `Ὠιδῇ`, `ΤΗΙ ΩΙΔΗΙ`), and below the line elsewhere; `"adscript"` writes it on the line after every vowel (`τῶι`), as some editions and papyrological transcriptions do. An iota written on the line reads back as the letter iota, so a conversion that writes one reports the loss of the subscript.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"subscript"` (default) | <span class="conversion"><span lang="el">ᾨδῇ</span> <span class="to">→</span> <span lang="el">ᾨδῇ</span></span><br><span class="conversion"><span lang="el">ᾠδῇ</span> <span class="to">→</span> <span lang="el">ᾠδῇ</span></span> |  |
| `"capital-adscript"` | <span class="conversion"><span lang="el">ᾨδῇ</span> <span class="to">→</span> <span lang="el">Ὠιδῇ</span></span> |  |
| `"adscript"` | <span class="conversion"><span lang="el">ᾠδῇ</span> <span class="to">→</span> <span lang="el">ὠιδῆι</span></span> |  |

### `greek.capitalMarks`

The marks of a word in capitals in Greek output. Defaults to `"omit"`, which writes words in capitals without accents or breathings, as Greek usage does; `"preserve"` writes them.

Selects the marks of a word in capitals in Greek output. `"omit"`, the default, follows Greek usage, which writes words in capitals without accents: a word in capitals takes no accent, breathing, coronis, or quantity mark, keeps its diaeresis, and takes one on the second of two vowels where a mark on the first showed their hiatus (`Μάιος` → `ΜΑΪΟΣ`, `ἀίδηλος` → `ΑΪΔΗΛΟΣ`), or an iota adscript, which it cannot tell from a hiatus (`Ἅιδης` → `ΑΪΔΗΣ`); the disjunctive `ή` keeps its accent, which tells it from the article (`Ή`, from `ή`, `ἤ`, or `ἢ`). A word is in capitals when all its letters are, and a word of one letter when the nearest word on either side, words of one letter and numerals aside, is in capitals and neither is in small letters (`Ο ΛΟΓΟΣ`, `Η Δ’ ΟΣ`), or the text is set in capitals (`text.letterCase: "uppercase"`); a capital that begins a word in small letters keeps its marks (`Έλληνας`). The iota subscript follows `iotaSubscript`, whose `"capital-adscript"` writes it as a letter after a capital (`ΤΗΙ ΩΙΔΗΙ`). Each mark removed and each diaeresis written is reported. `"preserve"` writes every mark the document has (`ΜΆΙΟΣ`, `ἈΘΗ͂ΝΑΙ`), as an edition that prints them does. Beta Code and transliteration keep the marks, which they write on capitals.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"omit"` (default) | <span class="conversion"><span lang="el">ΜΆΙΟΣ</span> <span class="to">→</span> <span lang="el">ΜΑΪΟΣ</span></span> |  |
| `"preserve"` | <span class="conversion"><span lang="el">ΜΆΙΟΣ</span> <span class="to">→</span> <span lang="el">ΜΆΙΟΣ</span></span> |  |

### `greek.doubleRho`

Double-rho marks in Greek output. Defaults to `"unmarked"`.

Controls marks added to a pair of consecutive rho in Greek output.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"unmarked"` (default) | <span class="conversion"><span lang="el">ἄρρητος</span> <span class="to">→</span> <span lang="el">ἄρρητος</span></span> |  |
| `"smooth-rough"` | <span class="conversion"><span lang="el">ἄρρητος</span> <span class="to">→</span> <span lang="el">ἄῤῥητος</span></span> |  |

### `greek.dentalSigma`

Dental assimilation before sigma. Defaults to `"preserve"`.

Preserves a dental before sigma or applies the lossy assimilation.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ἐλπίδσι</span> <span class="to">→</span> <span lang="el">ἐλπίδσι</span></span> |  |
| `"assimilate"` | <span class="conversion"><span lang="el">ἐλπίδσι</span> <span class="to">→</span> <span lang="el">ἐλπίσι</span></span> |  |

### `greek.elidedStop`

An elided `π`, `τ`, or `κ` before a rough breathing. Defaults to `"preserve"`, which keeps the consonant the source writes; `"aspirate"` writes `φ`, `θ`, or `χ`.

Selects how Greek output writes a final `π`, `τ`, or `κ` whose vowel is elided before a word with a rough breathing. `"preserve"` keeps the consonant the source writes: `ἀπ’ οὗ`, as Ionic prose and many editions have it, stays, and so does `ἀφ’ οὗ`. `"aspirate"` writes the aspirated consonant that Attic spelling requires (`ἀπ’ οὗ` → `ἀφ’ οὗ`, `κατ’ ἡμέραν` → `καθ’ ἡμέραν`); the conversion then reports the consonant it replaced as lost. Beta Code and transliteration write the consonant of the source in either case.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ἀπ’</span> <span class="to">→</span> <span lang="el">ἀπ’</span></span> |  |
| `"aspirate"` | <span class="conversion"><span lang="el">ἀπ’</span> <span class="to">→</span> <span lang="el">ἀφ’</span></span> |  |

### `greek.accentuation`

Greek accentuation system, in every format. Defaults to `"polytonic"`; `"monotonic"` follows the monotonic rules, monosyllables included, as far as the written text allows, and Beta Code and transliteration spell the result as Greek output writes it.

Selects polytonic output or a mechanical, lossy monotonic transformation, in every format.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"polytonic"` (default) | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Ἕλλησιν</span></span> |  |
| `"monotonic"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Έλλησιν</span></span> |  |

### `greek.composition`

Composed or decomposed output. Defaults to `"composed"`.

Selects composed or canonically decomposed Greek Unicode output.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"composed"` (default) | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Ἕλλησιν</span></span> (U+1F1D) |  |
| `"decomposed"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Ἕλλησιν</span></span> (U+0395 U+0314 U+0301) |  |

### `greek.acute`

Tonos/oxia preference for eligible acute vowels. Defaults to `"system"`: oxia in output that carries a polytonic mark, tonos otherwise.

Selects the composed Unicode form of an acute where Unicode has two: the tonos (`ά`, U+03AC), which is also what NFC gives, or the oxia (`ά`, U+1F71). `"system"` writes the oxia when the Greek output carries a polytonic mark (a breathing, a grave, a circumflex, an iota subscript, a coronis, or a quantity mark) and the tonos when it carries none, as monotonic text is written and as `accentuation: "monotonic"` writes it. The choice is made for the whole output of one conversion: a polytonic text converted word by word needs `"oxia"` to write every acute alike.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"system"` (default) | <span class="conversion"><span lang="el">ἐγένετο</span> <span class="to">→</span> <span lang="el">ἐγένετο</span></span> (U+1F73)<br><span class="conversion"><span lang="el">ϲοφία</span> <span class="to">→</span> <span lang="el">ϲοφία</span></span> (U+03AF) |  |
| `"tonos"` | <span class="conversion"><span lang="el">ἐγένετο</span> <span class="to">→</span> <span lang="el">ἐγένετο</span></span> (U+03AD) |  |
| `"oxia"` | <span class="conversion"><span lang="el">ϲοφία</span> <span class="to">→</span> <span lang="el">ϲοφία</span></span> (U+1F77) |  |

### `greek.questionMark`

Greek question-mark scalar. Defaults to `"canonical"`.

Selects the Unicode scalar used for Greek question marks.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"canonical"` (default) | <span class="conversion"><span lang="el">λέγεις;</span> <span class="to">→</span> <span lang="el">λέγεις;</span></span> (U+003B) |  |
| `"semicolon"` |  |  |
| `"greek"` | <span class="conversion"><span lang="el">λέγεις;</span> <span class="to">→</span> <span lang="el">λέγεις;</span></span> (U+037E) | `bnf-core` |

### `greek.anoTeleia`

Greek ano-teleia scalar. Defaults to `"canonical"`.

Selects the Unicode scalar used for Greek ano teleia.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"canonical"` (default) | <span class="conversion"><span lang="el">βαρβάρων·</span> <span class="to">→</span> <span lang="el">βαρβάρων·</span></span> (U+00B7) |  |
| `"middle-dot"` |  |  |
| `"greek"` | <span class="conversion"><span lang="el">βαρβάρων·</span> <span class="to">→</span> <span lang="el">βαρβάρων·</span></span> (U+0387) |  |

## `betaCode`

How Beta Code is written.

### `betaCode.case`

Insignificant ASCII letter case of Beta Code output. Defaults to `"lowercase"`.

Selects the insignificant ASCII letter case used in Beta Code output.

| Value | Greek → Beta Code | Presets |
| --- | --- | --- |
| `"lowercase"` (default) | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <code>*(/ellhsin</code></span> | `perseus` |
| `"uppercase"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <code>*(/ELLHSIN</code></span> | `tlg-core` |

### `betaCode.yot`

Beta Code spelling of yot. Defaults to `"j"`; TLG uses `"#401"`.

Selects the Beta Code spelling emitted for yot.

| Value | Greek → Beta Code | Presets |
| --- | --- | --- |
| `"j"` (default) | <span class="conversion"><span lang="el">ϳ</span> <span class="to">→</span> <code>j</code></span> |  |
| `"#401"` | <span class="conversion"><span lang="el">ϳ</span> <span class="to">→</span> <code>#401</code></span> | `tlg-core` |

## `text`

Transformations of the text as a whole, in every output format.

### `text.letterCase`

Semantic letter case applied to recognized graphemes. Defaults to `"preserve"`.

Selects the mechanical case transformation applied during rendering.

`"preserve"` keeps the case of the source. In transliteration, a capital spelled with several Latin letters (`TH`, `CH`, `PS`, and the `H` of a rough breathing or of rho) is written in full capitals among capitals, and with its first letter only before lowercase text, which ISO 843 allows (note 11): `ΘΑΛΑΣΣΑ` → `THALASSA`, `Θάλασσα` → `Thálassa`. A capital consonant on its own, such as a letter name, a numeral, or a siglum, is written in full capitals (`Θ` → `TH`), except before a period, where it is an abbreviated initial (`Θ.` → `Th.`). A vowel with a rough breathing on its own, such as the article at the head of a sentence, keeps its first letter only (`Ὁ` → `Ho`).

`"title"` capitalizes the first letter of each word; an apostrophe between two letters, as a coronis written so (`Ka’gṓ`), does not start a word.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> Héllēsin</span><br><span class="conversion"><span lang="el">ἐγένετο</span> <span class="to">→</span> egéneto</span> |  |
| `"lowercase"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> héllēsin</span> |  |
| `"uppercase"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> HÉLLĒSIN</span> |  |
| `"title"` | <span class="conversion"><span lang="el">ἐγένετο</span> <span class="to">→</span> Egéneto</span> |  |

### `text.whitespace`

Whitespace rendering. Defaults to `"preserve"`.

Preserves whitespace, or collapses it: `"collapse"` trims the text and reduces each run of Unicode whitespace to one space.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"preserve"` (default) |  |  |
| `"collapse"` |  |  |

### `text.numerals`

Alphabetic or decimal numeral output. Defaults to `"alphabetic"`.

Preserves marked alphabetic numerals or renders valid groups as decimals.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"alphabetic"` (default) | <span class="conversion"><span lang="el">ϛʹ</span> <span class="to">→</span> c̄ʹ</span> |  |
| `"decimal"` | <span class="conversion"><span lang="el">ϛʹ</span> <span class="to">→</span> 6</span> | `ala-lc-ancient`, `ala-lc-modern` |

### `text.scope`

What is converted: the whole text, or only its Greek passages. Defaults to `"all"`; `"greek"` copies the rest of the text as it is, and reads Greek only.

What a conversion converts: the whole text (`"all"`), or only its Greek passages (`"greek"`), for Greek quoted in a text in another language. A Greek passage is a run of Greek letters with their combining marks, and of the signs that only Greek uses, by their code points: the Greek question mark (U+037E), the ano teleia (U+0387), the koronis (U+1FBD), the spacing breathings and accents, and the keraiai (U+0374, which normalization makes U+02B9, and U+0375). Everything else, the punctuation that Greek shares with other scripts included (`;`, `?`, `·`, `'`, `’`, `-`), is copied as it is, code unit by code unit, and the options apply to the passages only. The rules of the conversion see the whole text: before `.`, `Θ` is an initial (`Th.`). `"greek"` reads Greek only, and does not apply to `encode()`, which writes a document.

| Value | Greek → transliteration | Presets |
| --- | --- | --- |
| `"all"` (default) | <span class="conversion"><span lang="el">βαρβάρων·</span> <span class="to">→</span> barbárōn;</span> |  |
| `"greek"` | <span class="conversion"><span lang="el">βαρβάρων·</span> <span class="to">→</span> barbárōn·</span> |  |

## `diacritics`

Which semantic diacritics are kept. `all` sets every class at once; a class named alongside it is the exception: `{ all: "remove", roughBreathing: "preserve" }`. The shorthand is expanded where it is written, so `all` in the caller's options overrides every class a preset set.

Removing a class removes its marks from the output in every format. In transliteration the rough breathing is a letter, `h`: it goes with its class, so `{ all: "remove", roughBreathing: "preserve" }` keeps it. The letters stay as they are spelled: in transliteration, eta and omega keep the length mark that `longVowels` selects (`η` → `ē`, `ω` → `ō` by default), which spells the letter and is not a diacritic.

### `diacritics.all`

Disposition of every class not named alongside.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` |  |  |
| `"remove"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Ελλησιν</span></span> |  |

### `diacritics.accents`

Accent marks: acute, grave, and circumflex. Defaults to `"preserve"`.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Ἕλλησιν</span></span> |  |
| `"remove"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Ἑλλησιν</span></span> | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

### `diacritics.smoothBreathing`

Initial smooth breathing marks. Defaults to `"preserve"`.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ἐγένετο</span> <span class="to">→</span> <span lang="el">ἐγένετο</span></span> |  |
| `"remove"` | <span class="conversion"><span lang="el">ἐγένετο</span> <span class="to">→</span> <span lang="el">εγένετο</span></span> | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

### `diacritics.roughBreathing`

Initial rough breathing marks. Defaults to `"preserve"`.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Ἕλλησιν</span></span> | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |
| `"remove"` | <span class="conversion"><span lang="el">Ἕλλησιν</span> <span class="to">→</span> <span lang="el">Έλλησιν</span></span> |  |

### `diacritics.coronis`

Internal coronides marking crasis. Defaults to `"preserve"`.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">κἀγώ</span> <span class="to">→</span> <span lang="el">κἀγώ</span></span> |  |
| `"remove"` | <span class="conversion"><span lang="el">κἀγώ</span> <span class="to">→</span> <span lang="el">καγώ</span></span> | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

### `diacritics.diaeresis`

Diaeresis marks. Defaults to `"preserve"`.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ὑϊός</span> <span class="to">→</span> <span lang="el">ὑϊός</span></span> |  |
| `"remove"` | <span class="conversion"><span lang="el">ὑϊός</span> <span class="to">→</span> <span lang="el">ὑιός</span></span> | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

### `diacritics.iotaSubscript`

Iota subscripts. Defaults to `"preserve"`.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ᾠδῇ</span> <span class="to">→</span> <span lang="el">ᾠδῇ</span></span> |  |
| `"remove"` | <span class="conversion"><span lang="el">ᾠδῇ</span> <span class="to">→</span> <span lang="el">ὠδῆ</span></span> | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

### `diacritics.quantity`

Explicit macron and breve quantity marks. Defaults to `"preserve"`.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">ᾱ̓́</span> <span class="to">→</span> <span lang="el">ᾱ̓́</span></span> |  |
| `"remove"` | <span class="conversion"><span lang="el">ᾱ̓́</span> <span class="to">→</span> <span lang="el">ἄ</span></span> | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

### `diacritics.overline`

The overline of abbreviations and numerals, such as the nomina sacra (`θ̅ς̅`). Defaults to `"preserve"`.

| Value | Greek → Greek | Presets |
| --- | --- | --- |
| `"preserve"` (default) | <span class="conversion"><span lang="el">θ̅ς̅</span> <span class="to">→</span> <span lang="el">θ̅ς̅</span></span> |  |
| `"remove"` | <span class="conversion"><span lang="el">θ̅ς̅</span> <span class="to">→</span> <span lang="el">θς</span></span> | `ala-lc-ancient`, `ala-lc-modern`, `sbl-general` |

<!-- END GENERATED OPTION REFERENCE -->
