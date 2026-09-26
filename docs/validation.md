# Validation contract

## Decision

`validateDocument()` remains explicitly separate from `parse()`, `encode()`,
and `convert()`. Validation is not an `encode` or `convert` option.

The conversion pipeline is intentionally permissive:

- parsers preserve unknown input as literal tokens;
- the document model can represent unusual or invalid combinations so they can
  be inspected and, where possible, encoded deterministically;
- conversion returns a string and does not hide a second diagnostics or
  exception channel;
- validation can return every structured diagnostic instead of stopping at the
  first error.

Making validation implicit would require either throwing from otherwise
permissive APIs or changing their return types. An option would also make it
unclear whether the source document or the orthographically transformed target
document is being validated.

## Strict workflow

Applications that require valid canonical Greek should make the stages
explicit:

```ts
import {
  encode,
  parse,
  validateDocument,
} from "@humanities/greek-conversion/document";

const document = parse(input, sourceFormat, options);
const diagnostics = validateDocument(document);

if (diagnostics.length > 0) {
  // Report diagnostics or reject the input.
}

const output = encode(document, targetFormat, options);
```

Diagnostics contain a stable code, a token index in the canonical `Document`,
and a human-readable message. The index is deliberately not a source-code-unit
offset: a parser can normalize combining sequences or map several source
characters to one grapheme.

Validation is pure and does not mutate the document. It currently checks
conflicting accents, breathings and quantities, plus whether accents,
breathings, coronis, circumflex, diaeresis, iota subscript, and explicit
quantity are valid for their grapheme and context. It also reports unknown
letters or diacritics and glyph variants that do not fit their letter and case
on manually modified graphemes. The [document API contract](document-api.md)
explains ownership and copying of mutable tokens.

## Validation boundary

The normal strict boundary is the document immediately returned by `parse()`.
This answers whether the interpreted source is valid before any requested
lossy target policy is applied.

Callers that directly construct or transform a `Document` should validate the
exact document they intend to encode. Orthography helpers are immutable, so an
application may also validate their returned document when it needs to audit a
custom pipeline.

If demand emerges for a convenience strict API, it should be a separate helper
such as `convertValidated()` or `assertValidDocument()`, with an explicit return
or error contract. It should not add mode-dependent behavior to `convert()`.
