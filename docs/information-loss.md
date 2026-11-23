# Information-loss contract

Conversion is defined as parsing a source string into the canonical `Document`
model, applying target orthography, and encoding one canonical spelling. The
engine preserves unknown characters and the letter forms it knows (the lunate,
final, and medial sigma, and the symbol forms such as `ϐ`; see
[Letter forms](#letter-forms)), but it does not otherwise preserve spelling or
Unicode provenance.

This document distinguishes three effects:

- **canonicalization** changes spelling without changing the represented
  document (for example NFD to NFC or punctuation aliases to one canonical
  glyph);
- **representation loss** occurs when a target format cannot express a
  distinction in the canonical document;
- **policy loss** is requested by an option such as decimal numerals or
  diacritic removal.

## Pairwise matrix with default options

The entries describe the information that can be lost after converting from
the row format to the column format and parsing the result again.

| From \ To | Greek | Beta Code | Transliteration |
| --- | --- | --- | --- |
| **Greek** | Selected glyph, accent, punctuation, and composition policies | Canonical spelling and mark order; symbol forms other than the lunate sigma | Symbol forms; the lunate sigma unless `lunateSigma: "c"`; a sigma whose shape contradicts its place; coronis; explicitly marked double rho; smooth breathing on an initial quantity-marked vowel; a hiatus marked only by a smooth breathing on its first vowel; the absence of a breathing on an initial vowel (monotonic or uncial text), which reads back as a smooth breathing; `ν` before a velar under nasal-gamma inference; `τ`, `π`, or `ρ` before a rough breathing inside a word, which merges with its `h` |
| **Beta Code** | Canonical Greek glyphs | Canonical ASCII case, asterisk placement, mark order, aliases, and punctuation | Same transliteration losses as Greek, including the lunate sigma unless `lunateSigma: "c"`, a sigma whose shape contradicts its place (`s1`, `s2`), coronis, and marked double rho |
| **Transliteration** | Initial smooth breathing is inferred where quantity is not explicit; under `elidedStop: "aspirate"`, an elided mute is aspirated before a rough breathing | Initial smooth breathing is inferred where quantity is not explicit; accepted aliases converge to canonical Beta Code | Accepted aliases, punctuation, combining-mark order, NFC, and orthographic spelling converge |

“Canonical documents” excludes invalid or ambiguous combinations. Use
`validateDocument()` when that distinction matters.

## Loss mechanisms

### Canonical spelling and Unicode

All recognized output has a selected spelling. Transliteration is NFC. Greek is
composed by default. Output that carries a polytonic mark writes its acutes with
oxia and is therefore not necessarily NFC; output that carries none is NFC (see
[Tonos and oxia](greek-unicode.md#tonos-and-oxia)). Accepted aliases do not
round-trip byte for byte:

- letter forms follow the Greek options, which keep those of the source by
  default, and are lost where the target cannot write them (see
  [Letter forms](#letter-forms));
- Unicode punctuation aliases become the canonical punctuation for the target;
- equivalent combining-mark order and duplicate recognized marks converge;
  Greek and transliteration write the marks of one vowel in the order
  quantity, breathing, diaeresis, accent, so that the macron sits on the
  vowel (`ᾱ́`), and in transliteration an explicit macron is spelled like the
  structural macron of eta and omega (`ā́` like `ḗ`);
- Beta Code aliases, case placement, and mark order converge, and a sigma
  code that the place makes redundant is dropped (`s1a` → `sa`).

ASCII letter case in Beta Code is presentation only and does not enter the
canonical document. An asterisk is the sole uppercase marker. Consequently,
`A` and `a` both represent lowercase alpha, while `*A` and `*a` both represent
uppercase alpha.

Beta Code writes parentheses as the TLG bracket codes `[1` and `]1`, since `(`
and `)` are breathings, and other signs with their TLG codes too, those that
it would read as something else and many that are not ASCII (see
[Signs with a TLG code](punctuation-and-numerals.md#signs-with-a-tlg-code)).
As in the TLG, the number of a bracket, `#`, or `%` code is every digit after
it: `[10` is another bracket code, `#12` is not koppa followed by `2`, and
`%265` is no macron. The reader keeps a code it does not know as text, a `#`
or `%` code whole: `#1522` gives `#1522`. Since a digit after a code would
extend it, a sign before a digit is written as itself where it reads back as
itself: a sign outside ASCII (`αʹ1` gives `aʹ1`), or a parenthesis or a
solidus that no letter precedes (`(1)` gives `(1]1`). Otherwise it does not
read back: `α(1)` is written `a[11]1`, which reads as `α[11)`, `[1]` reads as
`(]`, `ϟ2` is written `#12`, and `ᾱ5` `a%265`. `convertDetailed()` reports
the loss. Where the code and the digit make a code that the reader reads, the
output reads back as that sign, and may convert otherwise again: `ϛ2` is
written `#22`, the lower numeral sign, so that `ϛ2ϛ`, written `#22#2`, reads
back as the numeral `͵ϛ`, which decimal numerals then write `6000`. Such a
letter before a digit is the one case where converting the output again may
change it.
A Latin letter, which Beta Code would read as the Greek letter it spells, is
written in the case of the letters of the output, so that it reads back and
converts to itself: `H`, kept from a transliteration, gives `h`, and `H`
under `betaCode.case: "uppercase"`.

As in the TLG, `'` is the apostrophe (U+2019): `ἀλλ’` gives `a)ll'`. The font
shifts `&` (Latin) and `$` (Greek) are not interpreted: they are kept as text,
and the letters after them are still read as Beta Code, so `&x` gives `&χ`.
Before anything but a letter, `*` is an asterisk, which is written `%2`, and
what follows it is read as if it were not there: `*(` gives `*(`, and
converted to itself, `%2[1`.

Unrecognized characters, including unrecognized combining marks, remain
literals and are preserved. A middle dot is one in Beta Code and
transliteration, but Greek reads it as the ano teleia: Greek output copies
it, and `convertDetailed()` reports the loss (see
[Punctuation and numerals](punctuation-and-numerals.md#consequences)).

### Transliteration

Default transliteration has these intrinsic ambiguities:

- a coronis is omitted, so crasis remains spelled but is no longer explicitly
  marked;
- the conventional `rrh` spelling does not retain whether double rho was
  explicitly marked smooth–rough in Greek or Beta Code;
- an initial vowel with explicit quantity has no inferred smooth breathing, so
  an explicitly smooth quantity-marked source converges to the unmarked form;
- a smooth breathing written on the first vowel of a pair that could form a
  diphthong marks a hiatus or an iota adscript (`Ἀίδης`), but the omitted
  breathing leaves `Aídēs`, which parses back as a diphthong;
  `convertDetailed()` reports `displaced-diacritic`. The engine does not add
  a diaeresis to compensate, because the same spelling also marks an iota
  adscript (`Ἅιδης`, `τῆι` in editions that write the adscript), which is not
  a hiatus. `smoothBreathing: "greek"` or `"apostrophe"` writes the breathing
  in place and keeps the distinction; an accent on the first vowel
  (`Ἅιδῃ → Háidȩ̄`) keeps it as well;
- under the contextual upsilon rules (the default `"y-with-diphthong-u"`,
  ISO 843, BnF), the `y` of a pair with upsilon says it is not a diphthong:
  `ἀυτμή` → `aytmḗ`, which reads back with its breathing at the start of a
  word. Where the breathing would not read back on the first vowel (inside a
  word, or in a numeral, which takes no breathing), the `y` carries a
  diaeresis, which reads back too: `ἀἑυ` → `aheÿ` → `ἀἑϋ`, and
  `convertDetailed()` reports `added-diacritic`;
- with the default `nasalGamma: "nasal"`, Greek gamma and nu before a velar can
  both be read as nasal gamma after transliteration;
- the `h` of a rough breathing precedes its vowel or diphthong inside a word as
  at its start (`χοἱ` → `chhoi`, like `οἱ` → `hoi`). After `t`, `p` (except
  under `phi: "f"`, where `ph` reads as pi and a rough breathing), or `r`, it
  forms `th`, `ph`, or `rh`, which read back as theta, phi, or a rough rho:
  `τἡ` → `thē` → `θη`, `ποὑ` → `phou` → `φου`, `ἀροἱ` → `arhoi` → `ἀῥοι`, and
  `convertDetailed()` reports the loss. The same holds after `k` under
  `chi: "kh"`, and after a lunate `c` under `lunateSigma: "c"` with the default
  `chi`. Such forms are rare (crasis in some editions and inscriptions), and no
  cited standard separates the consonant from the `h`;
- for the same reason, an `h` before two vowels that can form a diphthong
  gives the breathing to the diphthong, inside a word as at its start. A rough
  breathing on the first vowel, marking a hiatus or an iota adscript without an
  accent or a diaeresis to show it, reads back on the second:
  `μἁιδης` → `mhaidēs` → `μαἱδης`, like `ἁι` → `hai` → `αἱ`, and
  `convertDetailed()` reports `displaced-diacritic`. An accent on the first
  vowel or a diaeresis on the second keeps the hiatus (`μἅιδης` → `mháidēs`,
  `μἁΐδης` → `mhaḯdēs`);
- a macron or breve on epsilon or omicron is omitted, because `ē` and `ō`
  denote eta and omega; such a document is already invalid for
  `validateDocument()`, and `convertDetailed()` reports the removed mark.

The `coronis: "apostrophe"` policy makes the mark visible for readers, but
U+2019 remains punctuation and does not retain semantic provenance. By
contrast, `coronis: "greek"` emits U+1FBD immediately after the affected vowel;
the transliteration parser recognizes that scalar as a coronis in precisely
that position. This provides a lossless interchange spelling for implemented
coronis contexts without guessing from ordinary apostrophes.

### Letter forms

The Greek reader remembers the form of a letter as its `glyphVariant`: the
lunate sigma `ϲ` (`Ϲ`), a final `ς` or medial `σ`, the symbol forms `ϐ`,
`ϑ`, `ϴ`, `ϕ`, `ϖ`, `ϰ`, `ϱ`, `ϵ`, and `ϒ`, and the `ς` that writes a stigma
as the units of a numeral (`ιςʹ`). Beta Code notes the lunate sigma
(`s3`), and the medial and final sigma (`s1`, `s2`), which it writes only
where the shape contradicts the place, under `finalSigma: "preserve"`, or
before a digit from 1 to 3; transliteration notes the lunate sigma as `c`
under `lunateSigma: "c"`. The TLG defines no code for a capital sigma, so a
capital sigma before `3` is written `*s3` and reads back as a lunate sigma
(`Σ3` → `*s3` → `Ϲ`), which `convertDetailed()` reports as
`added-glyph-variant`. The
options `greek.sigma`, `greek.finalSigma`, `greek.medialBeta`,
`greek.symbolForms`, and `greek.ligatures` decide how Greek output writes them;
by default, it keeps the forms the source writes. The signs that stand for
several letters (`ϗ`, `ȣ`) are noted on the first of them (see
[Signs for several letters](greek-unicode.md#signs-for-several-letters)).

A form is lost when the source format, under the options of the conversion
(or of its `source` profile), writes the letter differently from the source
and from the text read back, both taken in the case of the source. For a
Greek source, that is how Greek output writes the letter; Beta Code notes
only the sigma codes, and transliteration only the `c` of the lunate sigma.
`convertDetailed()` then reports `removed-glyph-variant`, with the source form
in `glyphVariant`. The rule follows from the guarantee: the text read back
must give the same canonical text, that is, the source written under the same
options. Consequently, for a Greek source:

- an option that folds a form is not a loss, since the canonical text has
  none: `sigma: "standard"` writes `ϲ` as `σ` from the source and from the
  text read back alike;
- a form that an option writes again from its position is kept: under
  `medialBeta: "symbol"`, transliteration writes `ἅϐα` as `hába`, which reads
  back as `ἅϐα`. French typography writes `ϐ` this way, and under this option
  a text that does gives no loss when it is transliterated;
- a form the target cannot write is lost: under the default
  `medialBeta: "preserve"`, `ϐίος` is written `bíos`, which reads back as
  `βίος`. So is a sigma whose shape contradicts its place, as in an
  abbreviation, in transliteration (`λόγοσ` → `lógos`), and a symbol form in
  Beta Code;
- a form that exists in one case only is lost when the case changes, unless
  the options write it again: `ϑ` in capitals is `Θ`, as `toUpperCase()`
  writes it, and `ϴ` in lowercase is `θ`. So is the shape a small sigma
  notes against its place: `λόγοσ` in capitals is `ΛΌΓΟΣ`, which reads back
  as `λόγος` in lowercase. Only the lunate sigma has both a capital and a
  small form. `changed-case` reports the case itself.

A conversion can also write a form the source did not have: under
`greek.sigma: "lunate"`, a sigma read from `s` is written `ϲ`, which converts
back to `c` under `lunateSigma: "c"`. Transliteration, the source format,
writes `s` from the source and `c` from the text read back, so
`convertDetailed()` reports `added-glyph-variant`, with the form written
(`lunate-sigma`) in `glyphVariant`.

### Canonical Greek orthography

Greek output keeps a labial or a velar before sigma as written: Greek has
these pairs where a prefix meets a stem (`ἔκστασις`, `ἐκσῴζω`), so they are
never contracted to `ψ` or `ξ`. Psi and xi are read from their own spellings
(`y` and `c` in Beta Code, `ps` and `x` in transliteration); a transliterated
`ks` is two letters unless `transliteration.xi` is `"ks"`. Only the opt-in
`dentalSigma: "assimilate"` merges a consonant with the following sigma.

Greek output keeps a final `π`, `τ`, or `κ` whose vowel is elided before a
rough breathing as the source writes it: `ἀπ’ οὗ`, as Ionic prose and many
editions have it, stays, and so does `ἀφ’ οὗ`. The opt-in
`elidedStop: "aspirate"` writes the aspirate that Attic spelling requires
(`ἀπ’ οὗ` → `ἀφ’ οὗ`, `κατ’ ἡμέραν` → `καθ’ ἡμέραν`). The output then
records the aspirated consonant, not the spelling of the source, and
`convertDetailed()` reports the consonant it replaced
(`unrepresented-grapheme`).

### Inference from transliteration

Transliteration does not normally write smooth breathing. When an initial vowel
group has neither rough breathing, explicit quantity, nor a diaeresis, parsing
infers smooth breathing. Explicit `ā/ă`, `ī/ĭ`, and `ū/ŭ` remain
breathing-neutral, and an initial `ï` or `ü` stays without a breathing, as
Greek writes `ϊ` and `ϋ`.

The inference belongs to the polytonic frame. It is not applied when the
selected orthography does not write smooth breathings: `accentuation:
"monotonic"`, `diacritics.all: "remove"`, `diacritics.smoothBreathing:
"remove"`, or an explicit `smoothBreathing: "greek"` or `"apostrophe"`
spelling. The canonical document then matches what the options describe, and
monotonic text converts back and forth under those options without loss.

In the default polytonic frame, the inference means that transliteration
cannot distinguish an unmarked initial vowel from one with a smooth breathing.
Monotonic or uncial Greek (`άνθρωπος`, `ΑΙΔΗΣ`) therefore reads back with a
smooth breathing, and `convertDetailed()` reports `inferred-breathing` on the
vowel that acquires it.

With default nasal-gamma inference, `n` before gamma, kappa, xi, or chi becomes
gamma in the canonical document. Set `nasalGamma: "literal"` to keep `n` as
nu; this changes the accepted spelling contract for transliteration input.

## Option-induced loss

Some options ask for an output that says less than the source. The tables
below take them group by group; the last column opens with whether the
source can be reconstructed from the output: yes, no, or partly.

### `transliteration`

| Option | Effect | Reconstructible from output? |
| --- | --- | --- |
| `archaicKoppa: "q"` | Uses the same transliteration for both koppa forms | No: `q` parses as modern koppa |
| `lunateSigma: "s"` (default) | Transliterates every sigma as `s` | No, when the source sigma was known to be lunate |
| `lunateSigma: "c"` | Transliterates only a provenanced lunate sigma as `c` and recognizes `c/C` on input | Yes: marked `c̄/ĉ` remains stigma |
| `nasalGamma: "nasal"` (default) | Converges nasal gamma and nu-before-velar transliteration spellings | No |
| `nasalGamma: "nasal-except-kappa"` | As `"nasal"`, but writes `γκ` as `gk` (ISO 843 Type 2) | Partly: yes for `γκ`; as `"nasal"` otherwise |
| `nasalGamma: "nasal-medial-kappa"` | Writes `γκ` as `nk` inside a word and `gk` at its edges (ALA-LC) | Yes |
| `coronis: "omit"` (default) | Omits coronis from transliteration | No |
| `coronis: "apostrophe"` | Emits U+2019 as display punctuation; a letter right after it, as in `τοὔμπαλιν`, still counts as inside the word for the `μπ`, `ντ`, and `γκ` rules | No |
| `coronis: "greek"` | Emits semantic U+1FBD after the affected vowel | Yes, in the implemented coronis contexts |
| `muPi: "b-initial"` or `"b-initial-final"` | Writes `μπ` as `b` at the beginning of a word, or at either end (ISO 843 Type 2) | Partly: yes with `beta: "v"`; otherwise `b` is also beta |
| `nuTau: "d-initial"` | Writes word-initial `ντ` as `d` | No: `d` is also delta |
| `nuTau: "d-underline-initial"` | Writes word-initial `ντ` as `d̲` (ALA-LC) | Yes: `d̲` remains distinct from delta |
| `upsilon: "y-with-ou-v-f"` | Writes the upsilon of `αυ/ευ/ηυ` as `v` or `f` and moves its accent to the vowel (ISO 843 Type 2) | Partly: yes alone; no with `beta: "v"` or `phi: "f"`, as in ISO 843 Type 2, under which `v` and `f` read back as beta and phi, and the accent stays on the vowel. A circumflex moved to epsilon is written as a tilde where `ê` is eta (`εὖ` → `’ẽf` under ISO 843 Type 1), and a `v` or `f` after an eta written `i` without a length mark reads back as the upsilon of `ηυ`. Under `longVowels: "omit"`, `ωυ` is written letter by letter (`oy`) and reads back as omega and upsilon, except in a numeral, written as it reads back (`ωυʹ` → `ouʹ`) |
| `longVowels: "omit"` | Writes eta and omega without a length mark (ISO 843 Type 2); a vowel pair is written as it reads back, so `ωυ` is written like `ου` (but `oy` under `upsilon: "y-with-ou-v-f"`, outside a numeral), and `ηἱ` like `εἱ` (or like `ιἱ` under `eta: "i"`) | No: they read back as epsilon (or iota) and omicron, except where a circumflex or an iota subscript only fits the long vowel, and a bare `o` before `y` under `upsilon: "y-with-ou-v-f"` |
| `rho: "systematic"` | Adds one final `h` to every contiguous rho group | Partly: the rho letters are recoverable; an explicit rough breathing is not |
| Letter spellings (`beta`, `eta`, …), `upsilon`, `longVowels` | Selects a canonical output spelling | Partly: the canonical letters normally remain recoverable, but `eta: "i"` with `longVowels: "macron"` writes eta like iota with a macron |

### `greek`

| Option | Effect | Reconstructible from output? |
| --- | --- | --- |
| `finalSigma: "preserve"` (default) | Writes the sigma shape the source notes in lowercase Greek output, and places any other sigma by its position; Beta Code writes a shape that contradicts its place as `s1` or `s2` | Partly: yes in Greek and Beta Code; a shape that contradicts its place is lost in transliteration |
| `finalSigma: "contextual"` | Places every sigma by its position in lowercase Greek output | No, but the canonical text has no other shape, so the change is not reported |
| `finalSigma: "medial"` | Uses `σ` instead of contextual `ς` in lowercase Greek output | Yes: both are the same canonical sigma letter |
| `sigma: "preserve"` (default) | Uses lunate Greek or Beta Code glyphs only where the source notes a lunate sigma, numerals included | Partly: yes in Greek and Beta Code, and in transliteration with `lunateSigma: "c"` |
| `sigma: "standard"` | Replaces a lunate sigma with the standard Greek or Beta Code glyph | No, but the canonical text has no lunate sigma, so the change is not reported |
| `sigma: "lunate"` | Uses lunate glyphs for all non-numeral sigma in Greek or Beta Code output | Yes: the source letters remain recoverable; the added lunate sigma is not a loss, unless it reads back as another spelling (`c` under `lunateSigma: "c"`) |
| `medialBeta: "preserve"` (default) | Writes `ϐ` where the source notes it, and `β` elsewhere | Partly: yes in Greek; no in Beta Code and transliteration, which report `removed-glyph-variant` |
| `medialBeta: "standard"` | Writes `β` everywhere | No, but the canonical text has no `ϐ`, so the change is not reported |
| `medialBeta: "symbol"` | Writes `ϐ` inside a word and `β` at its start, whatever the source has | Yes from every format, since the position decides the form |
| `symbolForms: "preserve"` (default) | Writes the symbol forms `ϑ ϴ ϕ ϖ ϰ ϱ ϵ ϒ` the source notes | Partly: yes in Greek; no in Beta Code and transliteration, which report `removed-glyph-variant` |
| `symbolForms: "standard"` | Writes the ordinary letters | No, but the canonical text has no symbol form, so the change is not reported |
| `ligatures: "preserve"` (default) | Writes `ϗ`, `ȣ`, and the `ϛ` that `stigma: "ligature"` reads where the source has them | Partly: yes in Greek, and in Beta Code for `ϗ`, `Ϗ`, and `Ȣ`; otherwise the target writes the letters and reports `removed-glyph-variant` |
| `ligatures: "standard"` | Writes the letters `και`, `ου`, `στ` | No, but the canonical text has no sign, so the change is not reported |
| `stigma: "ligature"` | Reads a stigma between two letters as `στ`, in every format | Reading only; a stigma letter between two letters is read as the ligature |
| `kaiAccent: "byzantine"` or `"modern"` | Writes the accent of `καί` where the output writes `ϗ` as letters: the grave, or the accent of modern editions | No: the accent reads back as the source's, and `convertDetailed()` reports `added-diacritic` |
| `iotaSubscript: "capital-adscript"` or `"adscript"` | Writes a kept iota subscript on the line, after a capital or after every vowel | No: the iota reads back as a letter, and the subscript is reported as removed (`removed-diacritic`) |
| `dentalSigma: "assimilate"` | Deletes `τ`, `δ`, or `θ` before sigma in Greek output | No |
| `elidedStop: "aspirate"` | Writes an elided final `π`, `τ`, or `κ` as `φ`, `θ`, or `χ` before a rough breathing in Greek output | No: the aspirate reads back as itself |
| `accentuation: "monotonic"` | Keeps diaeresis, maps every accent to acute, removes other polytonic marks, and unaccents monosyllables except `ή`, `πού`, `πώς`, and abbreviations (`κ.ά.`) | No |
| `composition: "decomposed"` | Emits Greek letters and marks as canonical decomposed sequences | Yes, unless combined with another lossy policy |
| `acute: "tonos"` or `"oxia"` | Selects an eligible composed acute scalar | Partly: the accent is recoverable; its scalar preference is not |
| `questionMark: "greek"`, `anoTeleia: "greek"` | Selects a canonically unstable punctuation scalar | Partly: the punctuation meaning is recoverable; its scalar preference is not |
| `doubleRho` | Selects a canonical output spelling | Yes: the canonical letters remain recoverable |

### `betaCode`

| Option | Effect | Reconstructible from output? |
| --- | --- | --- |
| `case: "lowercase"` or `"uppercase"` | Selects the insignificant ASCII case of Beta Code letters without changing `*` markers | Yes: the canonical graphemes are unchanged |
| `yot: "#401"` | Uses the TLG character code instead of `j` for yot | Yes: both spellings parse as yot |

### `text`

| Option | Effect | Reconstructible from output? |
| --- | --- | --- |
| `letterCase: "lowercase"`, `"uppercase"`, or `"title"` | Applies deterministic case to recognized Greek graphemes; under `"title"`, an apostrophe between two letters does not start a word | No, when source case changes; unknown literals are untouched |
| `numerals: "decimal"` | Replaces a valid marked alphabetic numeral group with decimal digits | No |

### `diacritics`

| Option | Effect | Reconstructible from output? |
| --- | --- | --- |
| `all: "remove"` | Removes every semantic class, breathings included; a class named alongside is the exception, so `{ all: "remove", roughBreathing: "preserve" }` keeps the rough breathing and its `h` in transliteration | No |
| `<class>: "remove"` | Removes only the selected semantic class during rendering | No, when that class occurs; unselected classes remain recoverable |

`longVowels` chooses either a macron or a circumflex for structural eta and
omega length, on the letter that `eta` selects (`ē`/`ê` or `ī`/`î`). A
separately encoded macron remains a philological diacritic: it is retained
beside a structural circumflex and follows the ordinary quantity diacritic
policy. Under `eta: "i"`, the macron therefore distinguishes `ῑ` from eta only
when the length mark is the circumflex. `longVowels: "circumflex"` cannot be
combined with `circumflexAccent: "circumflex"`: `ῆ` would be written `ê̂` and
read back without its accent, so `resolveConversionOptions()` rejects the pair.

The `diacritics` policy is applied during encoding, after contextual
analysis. It therefore cannot manufacture a diphthong or enable a dental
assimilation by first deleting a blocking mark. `all` sets every class and a
class named alongside it is the exception; the rough breathing goes with its
class in every format, as a mark in Greek and Beta Code and as the letter `h`
(including in `rh`) in transliteration. Structural
marks used to distinguish letters remain: `ē/ō`, `c̄/s̄`, and `ḳ` are not
removable diacritics.

## Idempotence

For canonical output and one fixed, resolved option set without `source`,
every format is idempotent:

```ts
import {
  type ConversionOptions,
  convert,
  type Format,
} from "@humanities/greek-conversion";

function isStable(
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions,
): boolean {
  const once = convert(input, from, to, options);
  const twice = convert(once, to, to, options);

  return once === twice;
}

isStable("Ἡ τοῦ Ὁμήρου Ἰλιάς", "greek", "transliteration", {
  preset: "ala-lc-ancient",
});
// → true
```

The first conversion may canonicalize aliases, mark order, punctuation, case,
spacing, or a deliberately lossy option. Reapplying the same options to that
canonical target does not change it again. Options that give a `source` describe
another input: the output is converted again without it. This fixed-point
guarantee is not a reverse-round-trip guarantee and does not imply that the
original source can be reconstructed. The differential corpus and explicit loss
cases live in `tests/fixtures.ts`; pairwise stability and isolated non-default
option values are exercised by `tests/stability_test.ts`.

Three properties are checked for every preset and every format pair over a
deterministic corpus of difficult forms in `tests/invariants_corpus_test.ts`:
idempotence of canonical output; validity of the reparsed output, except at
the documented boundaries listed in that file, which the producing conversion
must report as lossy; and, when `convertDetailed()` reports no loss, exact
reconstruction of the canonical source. A conversion reported as lossless is
therefore reversible under the same options, or, after a restyle that gives a
`source`, with `source` and the other options swapped.

For an actual input, `convertDetailed()` returns the output, a `lossy` status,
and token-indexed diagnostics. Its comparison treats canonical Unicode and
deterministic additions as information-preserving. See the
[conversion-analysis contract](conversion-analysis.md).
