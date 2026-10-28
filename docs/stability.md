# Stability policy

`greek-conversion` follows [Semantic Versioning](https://semver.org/). This
document states what the version number promises: which parts of the package
are covered, what counts as a breaking change, and how conversion output
itself is treated. It applies from `1.0.0`.

The short version: the **contract** is the documented behavior, not the bytes
a given version happens to produce. A change that brings output closer to the
documented contract is a correction; a change to the contract is a feature or
a break, depending on whether existing documented behavior survives.

## What the version number covers

The public API is everything exported from the two entry points:

- `@humanities/greek-conversion` (the main module);
- `@humanities/greek-conversion/document` (the advanced canonical-document
  API).

This includes runtime values, classes and their public members, types,
option keys and values, preset identifiers, diagnostic codes, the error
classes thrown for documented conditions, and the behaviors documented in the
`README` and in `docs/`.

Not covered, and free to change in any release:

- direct imports of `src/*.ts` modules, which are implementation details even
  though JSR serves them;
- the playground website, the build scripts, the test suite and its fixtures;
- the English text of diagnostic and error messages (see below);
- the exact `limitations`, `description`, and `coverage` texts of preset
  metadata, which are descriptive;
- the `npm` package layout beyond its declared `exports`.

## Change classes

### Breaking (major)

- Removing or renaming an export, a class member, an option key, an option
  value, a preset identifier, a format identifier, or a diagnostic code.
- Changing the type of a public field, parameter, or return value in a way
  that rejects previously valid input or previously valid reads.
- Changing the error class thrown for a documented condition, or throwing
  where the documentation said a value is returned.
- Changing the default value of an option.
- Changing the canonical output of a conversion for valid, in-scope input
  under fixed options, **except** as described under *Corrections* and
  *Canonical spelling* below.
- Changing the meaning of a `Document` field, or removing a field.

### Compatible additions (minor)

- New exports, option keys, option values, presets, format-independent
  helpers, and `Converter` configuration fields, provided existing calls keep
  their behavior.
- New diagnostic codes in `ConversionLossCode`, `ValidationCode`, and
  `CharacterScopeDiagnosticCode`, and new members of `Letter`, `Diacritic`,
  and `GlyphVariant`. These unions are **open**: consumers must treat an
  unknown code or member as possible and should not rely on exhaustive
  `switch` statements without a default branch.
- New optional fields on `Document` tokens, diagnostics, and results.
- Recognition of characters or spellings that were previously preserved as
  literals. Such input converts differently afterwards; the previous behavior
  (literal preservation) is the documented fallback for unrecognized input,
  not a promise that the input stays unrecognized.
- Changes to a preset's option contents that extend its coverage of the cited
  reference without changing output for input the preset already handled.
- Raising the minimum supported runtime version.

### Corrections (patch)

A patch release may change conversion output when the previous output
contradicted the documented contract. This covers:

- output that `validateDocument()` rejects, or that is not idempotent, or
  whose `convertDetailed()` report is wrong, contrary to the
  [guarantees](../README.md#guarantees-and-scope);
- output of a preset that disagrees with the preset's cited reference for a
  rule the preset documents as implemented;
- a parser reading a documented spelling as the wrong canonical document.

The rationale is that a preset's contract is its reference, and the engine's
contract is its documentation; the version number protects those, not the
defects. Every such correction is listed in the changelog under *Fixed* with a
before-and-after example. Applications that need byte-for-byte stability
across releases should pin an exact version and rely on the differential
corpus in `tests/fixtures.ts` and the conformance corpora in `docs/` to review
upgrades.

A correction never changes output that the documentation presents as a
deliberate choice; changing such a choice is a *canonical spelling* change or
a break.

### Canonical spelling (minor)

The engine selects one canonical spelling for each format (combining-mark
order, composed scalars, Beta Code mark order, alias resolution). Changing that
selection is a minor change when all of the following hold:

- the canonical document is unchanged, so the change is representational;
- the previous spelling remains accepted as input and parses to the same
  document;
- the change is listed in the changelog under *Changed* with examples.

Otherwise it is a break.

## Diagnostics and errors

Diagnostic `code` values, their `index` semantics, and the fields that
accompany them are part of the contract. Their `message` text is for humans
and may change in any release; do not match on it.

Positions (`ConversionLoss.offset` and `length`,
`CharacterScopeDiagnostic.offset` and `length`, `ConversionResult.spans`,
`ParseResult.spans`) are offsets in UTF-16 code units in the input as
supplied and in the output as returned, ends exclusive, with the ordering and
sharing rules of the [conversion-analysis contract](conversion-analysis.md).
A change of unit or of those rules is a break; a position that moves because
a conversion's output changed follows the rules of that output change.

For errors, the class (`RangeError`, `TypeError`, `OptionError`,
`CharacterScopeError`) and the documented condition are the contract; the
message is not. The `diagnostics` of a `CharacterScopeError` follow the
diagnostic rules above; the `path`, `received`, `accepted`, and `replacement`
of an `OptionError` are part of the contract, and `replacement` is set only
for keys and values that a `1.0.0` release candidate accepted.

## Options

`ConversionOptions` is the input type: every field optional, unknown keys and
values rejected at runtime. Adding a key or a value is a minor change; the
default behavior of an existing call never changes in a minor release. The
default transliteration is the SBL academic style: `sbl-academic` and the
defaults write the same text, and both move together.

`ResolvedConversionOptions` is an **output** type describing the effective
configuration returned by `resolveConversionOptions()`. New fields appear in
minor releases. Constructing one by hand is unsupported; pass partial
`ConversionOptions` to the public functions instead.

`DEFAULT_CONVERSION_OPTIONS` and `CONVERSION_OPTION_VALUES` are frozen
reference objects; their shape follows the rules above.

## Canonical document

`Document`, `Token`, `Grapheme`, and `Literal` are public, with the ownership
rules in the [document API contract](document-api.md). Field additions are
minor; field removals and meaning changes are major. A document produced by
`parse()` on one version is valid input to `encode()` and `validateDocument()`
on any later version of the same major.

## Presets

A preset identifier is stable. Its `coverage` may move between `partial`,
`adapted`, and `complete` as implementation progresses; such a move is
descriptive and accompanies the underlying change, which is classified by the
rules above. A preset is never removed in a minor release; one that becomes
obsolete is deprecated first.

## Deprecation

A deprecated export, option, value, preset, or code is marked `@deprecated` in
its documentation, keeps working for at least the remainder of the current
major, and is listed in the changelog. Removal happens in the next major
release with a migration note.

## Runtimes and Unicode

Supported runtimes are those declared in the published package metadata
(Deno 2 and the Node.js versions in the npm `engines` field). The library
relies on the runtime's `String.prototype.normalize`, so recognition of
characters introduced by a newer Unicode version depends on the runtime.

## Pre-releases

Versions with a pre-release tag (`1.0.0-rc.1`, `1.1.0-beta.1`) may contain
any change, including breaks, relative to the previous pre-release. The rules
above apply between stable releases.
