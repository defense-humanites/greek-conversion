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
- validation can return multiple structured diagnostics instead of stopping at
  the first error.

Making validation implicit would require either throwing from otherwise
permissive APIs or changing their return types. An option would also make it
unclear whether the source document or the orthographically transformed target
document is being validated.

## Canonical-document check

Applications that need to inspect the interpreted document before encoding
should make the stages explicit:

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

This checks the structure and Greek graphemes of the parsed document. It does
not certify that the source string follows the syntax of its declared format.
For example, `parse("*(", "beta-code")` retains the incomplete uppercase
prefix as literal text, and `validateDocument()` returns no diagnostics for
that structurally valid document. Unknown input can likewise remain literal.
There is currently no separate source-syntax diagnostic API.

Diagnostics contain a stable code, a token index in the canonical `Document`,
and a human-readable message. The index is deliberately not a source-code-unit
offset: a parser can normalize combining sequences or map several source
characters to one grapheme.

Validation is pure and does not mutate the document. It currently checks
conflicting accents, breathings and quantities, plus whether accents,
breathings, coronis, circumflex, diaeresis, iota subscript, and explicit
quantity are valid for their grapheme and context. It also reports unknown
letters or diacritics and glyph variants that do not fit their letter
on manually modified graphemes. The [document API contract](document-api.md)
explains ownership and copying of mutable tokens.

Malformed token kinds, non-text literals, non-boolean case flags, and non-`Set`
diacritics also receive diagnostics. Structural checks run over the whole
document first; if any fail, contextual and combinatorial checks are deferred
until those structural problems are corrected. This avoids interpreting the
neighbors of an ill-formed token as valid Greek context.

## Validation boundary

The normal validation boundary is the document immediately returned by
`parse()`. This answers whether its interpreted Greek structure is valid before
any requested lossy target policy is applied.

Callers that directly construct or transform a `Document` should validate the
exact document they intend to encode. Orthography helpers are immutable, so an
application may also validate their returned document when it needs to audit a
custom pipeline.

Any future source-syntax diagnostics would need source positions and a separate
contract from `validateDocument()`'s token indices. A convenience strict API,
if needed, should likewise define its return or error behavior explicitly
without making `convert()` mode-dependent.
