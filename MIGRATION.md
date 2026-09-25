# Migrating from 0.14.x

The `1.0.0` prerelease series is a rewrite. It does not provide compatibility
aliases for the `0.14.x` API.

## Installation

The prerelease is available from JSR and npm after publication:

```sh
deno add jsr:@humanities/greek-conversion@1.0.0-beta.7
npm install @humanities/greek-conversion@beta
```

The package is ESM-only.

## Updating from `1.0.0-beta.6`

The `1.0.0-beta.7` package uses the MIT License. Earlier published releases
retain their original AGPL-3.0-or-later license.

`bnf-core` now preserves known smooth breathings on Latin letters, uses a
combining circumflex instead of a tilde, and omits explicit macrons and
breves in transliteration. `iso-843-type-1` now prefixes an initial smooth
breathing with an apostrophe. ISO 843 retains distinct Latin punctuation:
Greek question mark becomes `?`, and ano teleia becomes `;`.

The new orthography fields `smoothBreathing`, `circumflexAccent`,
and `quantityTransliteration` can override
these behaviors. Strict bound converters still reject only recognized
out-of-scope characters and known undefined or unresolved preset mappings;
inspect `convertDetailed().losses` for in-scope distinctions lost during
conversion. See the [behavior audit](docs/preset-behavior-audit.md).

## Updating from `1.0.0-beta.4`

The optional `GreekText` facade has been removed. Use `convert()` or
`convertDetailed()` for ordinary calls. To reuse one analysis across several
representations, use `parse()` and `encode()` from the experimental
`@humanities/greek-conversion/document` entry point, as shown under
[reusable parsed documents](#reusable-parsed-documents).

## Updating from `1.0.0-beta.3`

This release is additive: the ordinary conversion functions retain their
`beta.3` behavior. Use `createConverter()` only when an application needs to
extend or restrict the recognized character inventory.

Aliases of built-in letters inherit the complete conversion behavior of the
selected letter. Truly new characters are opaque and guarantee only the direct
forms declared for Greek, Beta Code, and transliteration; they do not acquire
vowel, diacritic, contextual, or numeral rules automatically.

`repertoire` defines an exact character allow-list and `exclude` removes
characters from it. Out-of-scope characters become source-format literals
instead of being discarded. `converter.convertDetailed()` reports them through
the separate `diagnostics` array without setting `lossy` solely because of
literal preservation.

## Updating from `1.0.0-beta.2`

Beta Code ASCII letter case no longer represents Greek letter case. Only a
preceding `*` marks an uppercase Greek grapheme, so uppercase ASCII input such
as `A)/NQRWPOS` now converts to lowercase `ἄνθρωπος`. Canonical output uses
lowercase ASCII by default and places uppercase diacritics between `*` and the
letter, following TLG ordering.

Use `orthography.betaCodeCase: "uppercase"` when an integration requires
uppercase ASCII without changing the represented Greek case. The `tlg-core`
and `perseus` presets select uppercase and lowercase ASCII respectively.

## Formats and conversion functions

Replace the `KeyType` runtime enum with literal format names:

```ts
// 0.14.x
toTransliteration(input, KeyType.GREEK);

// 1.0 prerelease
convert(input, "greek", "transliteration");
// or greekToTransliteration(input)
```

| 0.14.x | 1.0 prerelease |
| --- | --- |
| `KeyType.GREEK` | `"greek"` |
| `KeyType.BETA_CODE` | `"beta-code"` |
| `KeyType.TLG_BETA_CODE` | `"beta-code"` with `preset: "tlg-core"` |
| `KeyType.TRANSLITERATION` | `"transliteration"` |
| `toGreek()` | `convert(..., ..., "greek")` or a directional helper |
| `toBetaCode()` | `convert(..., ..., "beta-code")` or a directional helper |
| `toTransliteration()` | `convert(..., ..., "transliteration")` or a directional helper |

## Presets and custom options

Preset identifiers are string literals. A preset and custom overrides now share
one options object instead of an array:

```ts
// 0.14.x
toTransliteration(input, KeyType.GREEK, [
  Preset.ALA_LC,
  { removeDiacritics: false },
]);

// 1.0 prerelease
convert(input, "greek", "transliteration", {
  preset: "ala-lc-ancient",
  removeDiacritics: false,
});
```

Custom fields override corresponding preset fields while unrelated preset
fields remain active. See [docs/presets.md](docs/presets.md) for the exact
configuration table.

## Reusable parsed documents

`GreekString` has no stateful replacement. Use the functional API for ordinary
conversions. When several representations must share one analysis, parse once
through the advanced entry point and encode the resulting document:

```ts
import { encode, parse } from "@humanities/greek-conversion/document";

const document = parse(input, "greek", options);
const betaCode = encode(document, "beta-code", options);
const transliteration = encode(document, "transliteration", options);
```

## Canonical-document API

Advanced parsing, validation, transformation, and encoding are isolated in the
experimental `./document` entry point:

```ts
import {
  encode,
  parse,
  validateDocument,
} from "@humanities/greek-conversion/document";
```

The representation may still change during the `1.0.0` prerelease series.

## Behavioral differences

- Unknown characters are preserved instead of being removed by sanitization.
- Output is canonical and idempotent for fixed formats and options.
- `convertDetailed()` reports losses from the actual input.
- Monotonic conversion is explicit and mechanical.
- Missing rough breathings and transformations requiring lexical or
  morphological knowledge are not inferred.
- TLG and BnF presets cover only the rules and characters implemented by the
  current engine.
