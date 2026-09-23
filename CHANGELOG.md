# Changelog

All notable changes to `greek-conversion` are documented in this file. The
project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.6...HEAD
[1.0.0-beta.6]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.5...v1.0.0-beta.6
[1.0.0-beta.5]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.4...v1.0.0-beta.5
[1.0.0-beta.4]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.3...v1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.2...v1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/defense-humanites/greek-conversion/compare/v1.0.0-beta.1...v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/defense-humanites/greek-conversion/releases/tag/v1.0.0-beta.1
