# Canonical document API

The `@humanities/greek-conversion/document` entry point is for applications
that need to inspect, validate, or transform one parsed Greek representation.
The ordinary conversion functions remain the simpler interface for converting
strings. This entry point is under review during the `1.0.0` beta series.

## Model and ownership

`Document` is a readonly sequence of `Token` values. A token is either a
`Grapheme` (semantic letter, case, diacritics, and optional source glyph
variant) or a `Literal` (uninterpreted text). The sequence is readonly at the
type level, but a grapheme's fields and its `Set` of diacritics are mutable so
callers can make controlled transformations. This is **not** a frozen value.

`parse()` allocates a new document on each call. `grapheme()` copies the
supplied diacritics into a new `Set`. `encode()`, `validateDocument()`, and
`applyGreekOrthography()` do not modify their input document. The last helper
may return the original document when no change is needed; callers should not
assume it always allocates. Like `parse()` and `encode()`, the public helper
resolves a supplied preset before applying its options.

When deriving two independent versions from one parse, copy both the tokens
and their nested diacritic sets:

```ts
import { encode, parse, validateDocument } from "@humanities/greek-conversion/document";

const source = parse("ἄνθρωπος", "greek");
const edited = source.map((token) =>
  token.kind === "grapheme"
    ? { ...token, diacritics: new Set(token.diacritics) }
    : { ...token }
);

if (edited[0].kind === "grapheme") {
  edited[0].diacritics.delete("acute");
}

const diagnostics = validateDocument(edited);
if (diagnostics.length === 0) {
  encode(edited, "greek"); // ἀνθρωπος
}
encode(source, "greek"); // ἄνθρωπος
```

A shallow copy of the sequence or of a grapheme still shares the original
`Set`. A `Literal` can contain unknown content; validation checks the
structure and Greek marks of graphemes, not arbitrary literal text or
conformity to a preset.

## Parse, validate, encode

`parse(input, format, options)` interprets a representation into semantic
tokens; some transliteration spellings depend on the selected options. It
does not perform the target's orthographic transformations. Use the same
preset and parsing options when encoding the result, unless a deliberate
change of policy is intended:

```ts
const options = { preset: "bnf-core" } as const;
const document = parse("Chará", "transliteration", options);
const output = encode(document, "greek", options); // Χαρά
```

`validateDocument()` reports structural problems and invalid values on a
typed or manually modified document. Its indices refer to token
positions, not offsets into the source string. Validation is an explicit step:
`encode()` does not call it, and even a valid document can encode lossily under
an output policy. Use `convertDetailed()` when information loss matters.

The main `createConverter()` API has a separate registry for aliases, custom
characters, and repertoire checks. `parse()` and `encode()` here operate on
the built-in semantic alphabet; they do not inherit a converter instance's
custom characters or exclusions.
