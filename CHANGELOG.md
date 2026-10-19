# Changelog

All notable changes to `greek-conversion` are documented in this file. The
project follows [Semantic Versioning](https://semver.org/); the
[stability policy](docs/stability.md) states what each kind of release may
change.

## [Unreleased]

### Added

- The README is reorganized around tasks, opens with a Thucydides quick
  start, and documents the option groups, the loss codes, and the error
  behavior. Every TypeScript example in it is type-checked and executed by
  `deno task check`, and its output must match the `// →` comment beside it.
- `CITATION.cff` describes how to cite the library; GitHub offers it as
  "Cite this repository".
- `deno task bench` measures conversion throughput as a baseline for future
  changes.
- A [stability policy](docs/stability.md) states what the version number
  covers from `1.0.0` on: the documented contract rather than the bytes of a
  release, with corrections of output toward the documentation or a preset's
  reference classified as patches, additions of codes, options, and presets as
  minor releases, and open diagnostic unions.
- A property-based invariant suite (`tests/invariants_corpus_test.ts`)
  checks, for every preset and every format pair over a deterministic corpus
  of difficult forms, that canonical output is idempotent, that reparsed
  output is a valid document outside the documented boundaries, and that a
  conversion reported as lossless converts back to the same canonical source.
- `FORMATS` lists the supported format identifiers, and
  `CONVERSION_OPTION_VALUES` lists every option key with its accepted values;
  the playground's option suggestions are derived from that table.
- `convertDetailed()` reports `inferred-breathing` when transliteration of
  an unmarked initial vowel (monotonic or uncial Greek such as `άνθρωπος` or
  `ΑΙΔΗΣ`) reads back with a smooth breathing the source did not have. Such a
  conversion was previously reported as lossless although the round trip
  changed the text.
- `convertDetailed()` reports `displaced-diacritic` when a source breathing is
  reread on the following vowel of the target, instead of the misleading
  `removed-diacritic`. The breathing is retained; the hiatus it marked is not.

### Changed

- The npm package requires Node.js 24 or later (`engines.node: ">=24"`),
  declares `sideEffects: false` so that bundlers can drop unused exports, and
  carries an up-to-date description. `RELEASING.md`, a maintainer procedure,
  is no longer included in the JSR and npm packages.
- Option identifiers follow one naming rule: `diacritics.X` asks whether a
  mark class is kept, `orthography.X` how X is written in the target format,
  `unicode.X` which scalar represents it; and every accepted value is ASCII.
  Accordingly `orthography.quantityTransliteration` is now
  `orthography.quantity`, `orthography.yotBetaCode` is `orthography.betaCodeYot`,
  and `orthography.eta` takes `"e-macron"` or `"i-macron"` instead of `"ē"`
  or `"ī"`. The value types `TransliterationHyphen`, `CoronisOrthography`,
  `UpsilonOrthography`, `LongVowelOrthography`, `NasalGammaOrthography`,
  `ModernDigraphOrthography`, and `YotBetaCode` are renamed
  `HyphenTransliteration`, `CoronisTransliteration`, `UpsilonTransliteration`,
  `LongVowelTransliteration`, `NasalGammaTransliteration`,
  `ModernDigraphTransliteration`, and `BetaCodeYot`, so that the suffix names
  the format a policy applies to. See the migration guide.
- Conversion options are validated strictly. An unknown option key, an
  unknown option value, or an option of the wrong type now throws
  (`RangeError` for unknown identifiers and values, `TypeError` for wrong
  types) instead of being silently replaced by the engine default. A field set
  to `undefined` is still treated as absent.
- The transliteration parser infers a smooth breathing only when the selected
  orthography writes smooth breathings. Under `accentuation: "monotonic"`,
  `removeDiacritics: true`, or `diacritics.smoothBreathing: "remove"` (as in
  the ALA-LC and SBL general presets), an unmarked initial vowel stays
  unmarked in the canonical document. As a consequence, a preset that removes
  the smooth breathing now reports that removal for polytonic sources instead
  of hiding it behind the reparse.
- An unknown format identifier throws `RangeError("Unknown format: …")` from
  `convert()`, `convertDetailed()`, `parse()`, `encode()`, and the
  `Converter` methods; `convert()` with an unknown target format previously
  returned `undefined`. Non-string input throws a `TypeError` with a clear
  message.

### Fixed

- A breathing or accent written on the first vowel of a pair that could form
  a diphthong is now read as the hiatus or iota-adscript signal it is
  (`Ἅιδῃ`, `Ἀίδης`, `ἀίδηλος`, `ἄυλος`), instead of being moved onto the second
  vowel. Previously `Ἅιδῃ` became the invalid `Άἱδῃ` and the change was not
  reported as a loss. Greek and Beta Code conversions now preserve these forms;
  transliteration keeps a first-vowel accent, and `convertDetailed()` reports
  the loss when a hiatus is marked only by a breathing.
- A hiatus marked only by a breathing on its first vowel is not compensated
  with an inferred diaeresis in transliteration, because the same spelling also
  marks an iota adscript; `smoothBreathing: "greek"` or `"apostrophe"` keeps
  it reversible.
- Removing a diaeresis or an iota subscript no longer turns `ἄϋλος` or `ᾄυ`
  into a diphthong while the first vowel still carries its marks.
- Under the contextual upsilon rules (`y-with-au-eu-ou`, `y-with-diphthong-u`),
  a `y` read after a vowel that could form a diphthong no longer always
  receives a diaeresis. At word start the separation is carried by the
  breathing on the first vowel, as Greek writes it (`ay → ἀυ`, `hay → ἁυ`),
  so `ἀυτμή` and `ἁυ` convert back and forth exactly under `bnf-core` and
  `ay` is canonical. Where no breathing is written or inferred, the encoder
  writes the diaeresis at once (`ἄυλος → aÿlos` under `sbl-general`,
  `ἀυτμή → ’aÿtmī́` under `iso-843-type-1`) instead of producing text that a
  second conversion changed.
- Transliteration no longer infers a smooth breathing on an initial vowel
  that carries a diaeresis (`ḯ`, `ü`, `Ï`). The result was a document that
  `validateDocument()` rejects as `incompatible-diaeresis-breathing`, and
  `ΐδιος` did not survive a round trip.
- Transliteration writes the combining marks of one vowel in a single
  canonical order: quantity, breathing, diaeresis, accent. An explicit macron
  is now spelled like the structural macron of eta and omega (`ā́` like `ḗ`).
  Previously `ῑ́` rendered as `í̄`, which `iso-843-type-1` reread and rewrote
  as `ī́`, breaking idempotence. Output changes only where an explicit macron
  or breve meets another mark (`á̄` → `ā́`, `ã̄` → `ā̃`); input in either
  order is still accepted.
- A macron or breve on epsilon or omicron is omitted from transliteration,
  because `ē` and `ō` denote eta and omega, and `convertDetailed()` reports
  the removed mark instead of producing text that reparses as another letter.

## [1.0.0] - 2026-09-30

The first stable release of the rewritten library. There are no API or
conversion behavior changes from `1.0.0-beta.9`; see the beta changelog and
[migration guide](MIGRATION.md) for the changes from `0.14.x`.

## [1.0.0-beta.9] - 2026-09-30

### Added

- Documented ownership, mutation, copying, option reuse, and converter
  boundaries for the supported `./document` entry point, including the fact
  that document validation does not certify source syntax and that lossy
  orthographic views must not replace the reusable parsed source.
- The npm package check now type-checks a separate consumer of the packed
  `./document` entry point and its generated declarations.
- `validateDocument()` reports unknown letters and diacritics and invalid
  glyph variants on manually modified documents before encoding.

### Changed

- The audited `./document` entry point is now documented as a supported
  advanced API, with explicit ownership and validation boundaries.

### Fixed

- The public `applyGreekOrthography()` helper now resolves preset options like
  `parse()` and `encode()` instead of silently ignoring them, and returns an
  independent document whose tokens and diacritic sets can be edited without
  changing the source.
- `validateDocument()` now diagnoses malformed document tokens instead of
  throwing during contextual validation of neighboring graphemes, including
  missing entries in a sparse document.
- Incomplete uppercase Beta Code prefixes retain their marks as literal text
  instead of silently dropping them during parsing.
- `validateDocument()` accepts a final-sigma source variant after a case policy
  changes the grapheme to uppercase; the variant remains source provenance.

### Companion website (not included in JSR or npm)

- Added a browser playground for the three formats, presets, conversion
  options, character repertoires, and loss and scope diagnostics, hosted on
  GitHub Pages and built from the current `main` branch.
- Presented the controls and diagnostics in English, and added contextual JSON
  suggestions for conversion options and custom character inventories.
- Kept the canonical document visible after strict scope rejection and fixed
  placeholder visibility and stale example selection.

## [1.0.0-beta.8] - 2026-09-26

### Added

- A source-traceable conformance corpus for the published ALA-LC Ancient and
  Modern Greek tables, with inverse stability and information-loss checks.
- A source-traceable BnF and ISO 843 Type 1 conformance corpus with forward
  output, inverse stability, loss expectations, and documented open rules.

### Fixed

- Both ALA-LC presets convert the documented `στʹ` form of six and thousands
  marked only by the leading sign (`͵α`, `͵αα`) to decimal numbers. The ancient
  preset reference now points to the published Ancient Greek table.
- `iso-843-type-1` renders the enotikon as a Latin hyphen and reports its
  ambiguous inverse; the new `orthography.enotikon` option controls this
  target-specific rendering.
- `bnf-core` renders marked uppercase stigma and sampi numerals with lowercase
  Latin letters, while leaving unmarked archaic capitals uppercase; detailed
  conversion reports the case lost in marked numerals.
- `bnf-core` parses the `ch` digram as chi before considering standalone `c`
  as Byzantine sigma, so its `Chará` and `téchnē` transliterations can be read
  back correctly.
- `bnf-core` preserves the BnF's typographic U+2010 hyphen in Latin output.

## [1.0.0-beta.7] - 2026-09-25

### Changed

- Starting with this release, the project is distributed under the MIT License
  instead of AGPL-3.0-or-later. Earlier published releases retain their
  original license.

### Added

- `createConverter({ outOfScopeBehavior: "reject" })` rejects recognized
  characters outside the preset or custom repertoire and exposes all source
  diagnostics through the public `CharacterScopeError`.
- Bound ISO 843 Type 1 converters now report undefined transliterations for
  stigma, koppa, and sampi, and the unresolved identification of archaic koppa.
  Preservation retains the source glyph; strict mode rejects it. Decimal
  conversion of marked numerals remains available explicitly.
- Audited each bundled preset's diacritics, punctuation, and numerals against
  its cited references; documented reversibility and remaining contextual
  boundaries in `docs/preset-behavior-audit.md`.
- Target-specific orthography choices for smooth breathing, circumflex,
  and explicit quantity marks in transliteration.

### Fixed

- `bnf-core` and `iso-843-type-1` transliterate `αυ`, `ευ`, and `ου` as
  `au`, `eu`, and `ou` while retaining `y` for other upsilons. The new
  `orthography.upsilon: "y-with-au-eu-ou"` setting also preserves those
  distinctions when parsing transliteration.
- `bnf-core` renders the right keraia as an acute and the left keraia as a
  comma in transliteration through `orthography.keraia: "bnf"`. The inverse
  is ambiguous for some accented vowels; `convertDetailed()` reports the
  information loss.
- `bnf-core` preserves the smooth breathing on the Latin letter, emits a
  combining circumflex (U+0302), and omits explicit macrons and breves in
  transliteration, in line with its reference.
- `iso-843-type-1` prefixes an initial smooth breathing with an apostrophe.
  The Greek question mark and ano teleia retain their distinct `?` and `;`
  transliterations.
- Transliteration with either of those presets no longer invents a smooth
  breathing from unmarked Latin input.

## [1.0.0-beta.6] - 2026-09-23

### Fixed

- `removeDiacritics` retains Greek sigma glyphs by default, including
  noncontextual `σ` and `ς` and lunate `ϲ`. Explicit orthographic policies
  still control sigma output. `finalSigma: "preserve"` is available for
  same-format conversions that need the same behavior.

### Added

- `createConverter({ preset })` binds preset options and enforces audited
  built-in character boundaries while preserving and reporting out-of-scope
  input.

## [1.0.0-beta.5] - 2026-09-23

### Changed

- `removeDiacritics` preserves the Latin `h` of rough breathing in
  transliteration, including `rh`. Greek and Beta Code still remove the mark;
  explicit `diacritics.roughBreathing: "remove"` suppresses the `h`.
- Transliteration emits ASCII `-` by default. Set
  `orthography.hyphen: "typographic"` to request U+2010.
- Audited the built-in character inventory against every preset reference and
  documented exact matches, known mapping differences, undefined conversions,
  numeral-only characters, and repertoire boundaries.

### Fixed

- `bnf-core` now transliterates both koppa forms as `q`, as prescribed by the
  BnF table.
- `tlg-core` now emits and recognizes `#401` for yot while the default Beta
  Code spelling remains `j`.

### Removed

- The optional `GreekText` facade. Use the functional conversion API for
  ordinary calls or `parse()` and `encode()` to reuse one canonical document.

## [1.0.0-beta.4] - 2026-08-29

### Added

- `createConverter()` and immutable `Converter` instances for registering
  built-in-letter aliases, opaque custom characters, exact character
  allow-lists, and semantic exclusions.
- Separate `out-of-scope-character` diagnostics for characters preserved by a
  restricted converter repertoire.

### Fixed

- JSR receives the explicit `AGPL-3.0-or-later` SPDX identifier instead of
  inferring `AGPL-3.0-only` from the license text.

## [1.0.0-beta.3] - 2026-08-26

### Added

- `betaCodeCase` separates lowercase/uppercase ASCII presentation from the
  semantic letter case represented by `*`.

### Changed

- The README now identifies the target format and intended use of every
  bundled preset.
- The README introduction and Beta Code guidance now describe the current
  conversion engine and canonical spelling rules directly.

### Fixed

- Beta Code ASCII letter case is ignored on input; only a preceding asterisk
  produces an uppercase Greek grapheme.
- Canonical Beta Code places ordered diacritics after lowercase letters and
  before uppercase letters, except for the trailing iota subscript.
- The Perseus and TLG presets select lowercase and uppercase ASCII output
  respectively without changing the represented Greek letter case.

## [1.0.0-beta.2] - 2026-08-26

### Added

- `foldGreekVariants()` for normalizing medial beta, lunate sigma, and final
  sigma glyphs without relying on Unicode compatibility normalization.
- `reencode()` as a same-format conversion shorthand.
- Public immutable defaults and resolved-option inspection through
  `DEFAULT_CONVERSION_OPTIONS`, `ResolvedConversionOptions`, and
  `resolveConversionOptions()`.
- Typed preset metadata, references, coverage, out-of-scope behavior, option
  inspection, and generated preset documentation.
- A lowercase Perseus Beta Code preset, with Morpheus, Perseids Tools, and TLG
  references.
- Source provenance for lunate sigma, source-preserving sigma output, uniform
  medial-sigma output, `c` transliteration for provenanced lunate forms, and
  the `removed-glyph-variant` loss diagnostic.

### Changed

- The npm package is now published as `@humanities/greek-conversion`, matching
  its JSR name. The historical unscoped package remains on the `0.x` series.
- The TLG core preset now always emits uppercase Beta Code.
- The BnF core preset now contributes its mechanically expressible options and
  documents the remaining contextual or unsupported rules.
- `longVowels` now selects either `"macron"` or `"circumflex"`; the combined
  `"circumflex-macron"` rendering introduced in the first beta was removed.
- Preset scope, implementation coverage, references, and limitations are now
  documented from the same typed registry used at runtime.
- The README was reorganized to restore the presentation style of the legacy
  package while documenting the rewritten API.

### Fixed

- Package documentation links now resolve correctly on registry pages.
- Lunate sigma can round-trip across Greek, Beta Code, and transliteration
  without losing a known source glyph variant when preservation is requested.

### Removed

- The public `PRESETS` registry from the first beta; use `getPresetOptions()`,
  `getPresetMetadata()`, and `listPresetMetadata()` instead.

## [1.0.0-beta.1] - 2026-08-25

This prerelease is a complete rewrite of the `0.14.x` conversion engine.

### Added

- Bidirectional conversion between Greek, Beta Code, and scientific
  transliteration through one canonical document model.
- Structured information-loss diagnostics with `convertDetailed()`.
- Immutable, reusable `GreekText` representations.
- Standards-oriented presets for ISO 843 Type 1, ancient and modern ALA-LC,
  academic and general SBL, TLG core, and BnF core policies.
- Polytonic and mechanical monotonic Greek output.
- Granular diacritic, case, whitespace, Unicode, transliteration, and
  contextual orthography policies.
- Semantic Greek punctuation, archaic letters, and marked alphabetic numerals.
- Experimental canonical-document API at the `./document` entry point.

### Changed

- The public API is incompatible with `greek-conversion` `0.14.x`; see
  [MIGRATION.md](MIGRATION.md).
- The package is ESM-only. CommonJS and the historical browser bundle are not
  produced.

### Removed

- The `KeyType`, `Preset`, and `GreekString` runtime enums/classes from the
  legacy API.
- Parcel, Jest, and the legacy prebuilt distribution pipeline.

[Unreleased]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.9...v1.0.0
[1.0.0-beta.9]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.8...v1.0.0-beta.9
[1.0.0-beta.8]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.7...v1.0.0-beta.8
[1.0.0-beta.7]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.6...v1.0.0-beta.7
[1.0.0-beta.6]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.5...v1.0.0-beta.6
[1.0.0-beta.5]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.4...v1.0.0-beta.5
[1.0.0-beta.4]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.3...v1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.2...v1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.1...v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/defense-humanites/greek-conversion/releases/tag/v1.0.0-beta.1
