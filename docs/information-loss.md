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
| **Transliteration** | Initial smooth breathing is inferred where quantity is not explicit; an elided mute may be aspirated before rough breathing | Initial smooth breathing is inferred where quantity is not explicit; accepted aliases converge to canonical Beta Code | Accepted aliases, punctuation, combining-mark order, NFC, and orthographic spelling converge |

“Canonical documents” excludes invalid or ambiguous combinations. Use
`validateDocument()` when that distinction matters.

## Loss mechanisms

### Canonical spelling and Unicode

All recognized output has a selected spelling. Transliteration is NFC. Greek is
composed by default, but the system polytonic acute prefers oxia and is therefore
not necessarily NFC. Accepted aliases do not round-trip byte for byte:

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
and `)` are breathings, and reads the number after a bracket whole: `[10` is
another bracket code. A parenthesis or square bracket followed by a digit
therefore does not read back: `(1)` is written `[11]1`, which reads as `[11)`,
and `[1]` reads as `(]`. `convertDetailed()` reports the loss.

Unrecognized characters, including unrecognized combining marks, remain
literals and are preserved.

### Transliteration

Default transliteration has these intrinsic ambiguities:

- a coronis is omitted, so crasis remains spelled but is no longer explicitly
  marked;
- the conventional `rrh` spelling does not retain whether double rho was
  explicitly marked smooth–rough in Greek or Beta Code;
- an initial vowel with explicit quantity has no inferred smooth breathing, so
  an explicitly smooth quantity-marked source converges to the unmarked form;
- a smooth breathing written on the first vowel of a pair that could form a
  diphthong marks a hiatus or an iota adscript (`Ἀίδης`, `ἀυτμή`), but the
  omitted breathing leaves `Aídēs`, `autmḗ`, which parse back as diphthongs;
  `convertDetailed()` reports `displaced-diacritic`. The engine does not add
  a diaeresis to compensate, because the same spelling also marks an iota
  adscript (`Ἅιδης`, `τῆι` in editions that write the adscript), which is not
  a hiatus. `smoothBreathing: "greek"` or `"apostrophe"` writes the breathing
  in place and keeps the distinction; an accent on the first vowel
  (`Ἅιδῃ → Háidȩ̄`) keeps it as well;
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
lunate sigma `ϲ` (`Ϲ`), a final `ς` or medial `σ`, and the symbol forms `ϐ`,
`ϑ`, `ϴ`, `ϕ`, `ϖ`, `ϰ`, `ϱ`, `ϵ`, and `ϒ`. Beta Code notes the lunate sigma
(`s3`), and the medial and final sigma (`s1`, `s2`), which it writes only
where the shape contradicts the place, under `finalSigma: "preserve"`, or
before a digit from 1 to 3; transliteration notes the lunate sigma as `c`
under `lunateSigma: "c"`. The TLG defines no code for a capital sigma, so a
capital sigma before `3` is written `*s3` and reads back as a lunate sigma
(`Σ3` → `*s3` → `Ϲ`), which `convertDetailed()` reports as
`added-glyph-variant`. The
options `greek.sigma`, `greek.finalSigma`, `greek.medialBeta`, and
`greek.symbolForms` decide how Greek output writes them; by default, it keeps
the forms the source writes.

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

Greek output also applies the regular aspiration of an elided final `π`, `τ`,
or `κ` before a rough breathing. The output records the aspirated consonant, not
the pre-transform spelling.

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

| Option | Effect | Reconstructible from output? |
| --- | --- | --- |
| `diacritics.all: "remove"` | Removes every semantic class, breathings included; a class named alongside is the exception, so `{ all: "remove", roughBreathing: "preserve" }` keeps the rough breathing and its `h` in transliteration | No |
| `diacritics.<class>: "remove"` | Removes only the selected semantic class during rendering | No when that class occurs; unselected classes remain recoverable |
| `letterCase: "lowercase"`, `"uppercase"`, or `"title"` | Applies deterministic case to recognized Greek graphemes | No when source case changes; unknown literals are untouched |
| `betaCode.case: "lowercase"` or `"uppercase"` | Selects the insignificant ASCII case of Beta Code letters without changing `*` markers | Yes; the canonical graphemes are unchanged |
| `betaCode.yot: "#401"` | Uses the TLG character code instead of `j` for yot | Yes; both spellings parse as yot |
| `archaicKoppa: "q"` | Uses the same transliteration for both koppa forms | No; `q` parses as modern koppa |
| `finalSigma: "preserve"` (default) | Writes the sigma shape the source notes in lowercase Greek output, and places any other sigma by its position; Beta Code writes a shape that contradicts its place as `s1` or `s2` | Yes in Greek and Beta Code; a shape that contradicts its place is lost in transliteration |
| `finalSigma: "contextual"` | Places every sigma by its position in lowercase Greek output | No, but the canonical text has no other shape, so the change is not reported |
| `finalSigma: "medial"` | Uses `σ` instead of contextual `ς` in lowercase Greek output | Yes; both are the same canonical sigma letter |
| `sigma: "preserve"` (default) | Uses lunate Greek or Beta Code glyphs only where the source notes a lunate sigma, numerals included | Yes in Greek and Beta Code; in transliteration with `lunateSigma: "c"` |
| `sigma: "standard"` | Replaces a lunate sigma with the standard Greek or Beta Code glyph | No, but the canonical text has no lunate sigma, so the change is not reported |
| `sigma: "lunate"` | Uses lunate glyphs for all non-numeral sigma in Greek or Beta Code output | Source letters remain recoverable; the added lunate sigma is not a loss, unless it reads back as another spelling (`c` under `lunateSigma: "c"`) |
| `medialBeta: "preserve"` (default) | Writes `ϐ` where the source notes it, and `β` elsewhere | Yes in Greek; no in Beta Code and transliteration, which report `removed-glyph-variant` |
| `medialBeta: "standard"` | Writes `β` everywhere | No, but the canonical text has no `ϐ`, so the change is not reported |
| `medialBeta: "symbol"` | Writes `ϐ` inside a word and `β` at its start, whatever the source has | Yes from every format, since the position decides the form |
| `symbolForms: "preserve"` (default) | Writes the symbol forms `ϑ ϴ ϕ ϖ ϰ ϱ ϵ ϒ` the source notes | Yes in Greek; no in Beta Code and transliteration, which report `removed-glyph-variant` |
| `symbolForms: "standard"` | Writes the ordinary letters | No, but the canonical text has no symbol form, so the change is not reported |
| `lunateSigma: "s"` (default) | Transliterates every sigma as `s` | No when the source sigma was known to be lunate |
| `lunateSigma: "c"` | Transliterates only a provenanced lunate sigma as `c` and recognizes `c/C` on input | Yes; marked `c̄/ĉ` remains stigma |
| `numerals: "decimal"` | Replaces a valid marked alphabetic numeral group with decimal digits | No |
| `dentalSigma: "assimilate"` | Deletes `τ`, `δ`, or `θ` before sigma in Greek output | No |
| `nasalGamma: "nasal"` (default) | Converges nasal gamma and nu-before-velar transliteration spellings | No |
| `nasalGamma: "nasal-except-kappa"` | As `"nasal"`, but writes `γκ` as `gk` (ISO 843 Type 2) | Yes for `γκ`; as `"nasal"` otherwise |
| `coronis: "omit"` (default) | Omits coronis from transliteration | No |
| `coronis: "apostrophe"` | Emits U+2019 as display punctuation; a letter right after it, as in `τοὔμπαλιν`, still counts as inside the word for the `μπ`, `ντ`, and `γκ` rules | No |
| `coronis: "greek"` | Emits semantic U+1FBD after the affected vowel | Yes for implemented coronis contexts |
| `accentuation: "monotonic"` | Keeps diaeresis, maps every accent to acute, removes other polytonic marks, and unaccents monosyllables except `ή`, `πού`, `πώς` | No |
| `muPi: "b-initial"` or `"b-initial-final"` | Writes `μπ` as `b` at the beginning of a word, or at either end (ISO 843 Type 2) | Yes with `beta: "v"`; otherwise `b` is also beta |
| `nuTau: "d-initial"` | Writes word-initial `ντ` as `d` | No; `d` is also delta |
| `nuTau: "d-underline-initial"` | Writes word-initial `ντ` as `d̲` (ALA-LC) | Yes; `d̲` remains distinct from delta |
| `nasalGamma: "nasal-medial-kappa"` | Writes `γκ` as `nk` inside a word and `gk` at its edges (ALA-LC) | Yes |
| `upsilon: "y-with-ou-v-f"` | Writes the upsilon of `αυ/ευ/ηυ` as `v` or `f` and moves its accent to the vowel (ISO 843 Type 2) | Yes alone; no with `beta: "v"` or `phi: "f"`, as in ISO 843 Type 2, under which `v` and `f` read back as beta and phi, and the accent stays on the vowel |
| `longVowels: "omit"` | Writes eta and omega without a length mark (ISO 843 Type 2); a vowel pair is written as it reads back, so `ωυ` is written like `ου`, and `ηἱ` like `εἱ` (or like `ιἱ` under `eta: "i"`) | No: they read back as epsilon (or iota) and omicron, except where a circumflex or an iota subscript only fits the long vowel |
| `rho: "systematic"` | Adds one final `h` to every contiguous rho group | The rho letters are recoverable; an explicit rough breathing is not |
| `composition: "decomposed"` | Emits Greek letters and marks as canonical decomposed sequences | Yes, unless combined with another lossy policy |
| `acute: "tonos"` or `"oxia"` | Selects an eligible composed acute scalar | The accent is recoverable; its scalar preference is not |
| Greek question-mark or ano-teleia scalar | Selects a canonically unstable punctuation scalar | The punctuation meaning is recoverable; its scalar preference is not |
| `iotaSubscript: "capital-adscript"` or `"adscript"` | Writes a kept iota subscript on the line, after a capital or after every vowel | No: the iota reads back as a letter, and the subscript is reported as removed (`removed-diacritic`) |
| `doubleRho`, letter variants, `upsilon`, `longVowels` | Selects a canonical output spelling | The canonical letters normally remain recoverable, but `eta: "i"` with `longVowels: "macron"` writes eta like iota with a macron |

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

## Stability guarantee

For canonical output and one fixed, resolved option set without `source`,
every format is idempotent:

```ts
const once = convert(input, from, to, options);
const twice = convert(once, to, to, options);

once === twice;
```

The first conversion may canonicalize aliases, mark order, punctuation, case,
spacing, or a deliberately lossy option. Reapplying the same options to that
canonical target does not change it again. Options that give a `source`
describe another input: the output is converted again without it. This
fixed-point guarantee is not a reverse-round-trip guarantee and does not imply
that the original source can be reconstructed. The differential corpus and explicit loss cases live in
`tests/fixtures.ts`; pairwise stability and isolated non-default option values
are exercised by `tests/stability_test.ts`.

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
