# Canonical document API

The `@humanities/greek-conversion/document` entry point is for applications
that need to inspect, validate, or transform one parsed Greek representation.
The ordinary conversion functions remain the simpler interface for converting
strings. This is a supported advanced entry point with the ownership and
validation boundaries described below.

## Model and ownership

`Document` is a readonly sequence of `Token` values. A token is either a
`Grapheme` (semantic letter, case, diacritics, and optional source glyph
variant) or a `Literal` (unknown text or canonical punctuation). The sequence
is readonly at the type level, but a token's fields are mutable so callers can
make controlled transformations. This is **not** a frozen value.

A grapheme's `diacritics` is a `ReadonlySet<Diacritic>`. The sets built by the
library are shared: every grapheme with the same marks holds the same set,
which avoids one allocation per letter. They are ordinary `Set` objects, so
structural equality with a `new Set(...)` holds, but their `add`, `delete`,
and `clear` throw a `TypeError`. To change the marks of a grapheme, assign it a
new set; any `Set` is accepted. They iterate in canonical mark order.

The guard stops ordinary calls, not a deliberate bypass: calling
`Set.prototype.add.call(set, ...)` (or `Reflect.apply`) on a library-built set
modifies it for every grapheme that shares it, including those of later
parses in the same process. Do not mutate a set you did not create.

The optional `glyphVariant` records a sigma shape from the source. It remains
valid provenance if an orthographic policy changes the grapheme's current case.

`parse()` allocates new tokens on each call. `grapheme()` reads the supplied
diacritics into the shared set for those marks, so a later change to the
caller's iterable does not reach the grapheme. `encode()`,
`validateDocument()`, and `applyGreekOrthography()` do not modify their input
document. The public helper returns an independent document, with new token
objects even if no orthographic change was needed. Like `parse()` and `encode()`,
it resolves a supplied preset before applying its options.

`encode(document, "greek", options)` already applies Greek-output orthography.
Use `applyGreekOrthography()` when the transformed tokens themselves must be
inspected or edited. A monotonic or decimal-numeral view can discard source
distinctions: keep the original parsed document for other output formats.

When deriving two independent versions from one parse, copy the tokens and
assign new diacritic sets where the marks change:

```ts
import { encode, parse, validateDocument } from "@humanities/greek-conversion/document";

const source = parse("ἄνθρωπος", "greek");
const edited = source.map((token) => ({ ...token }));

if (edited[0].kind === "grapheme") {
  edited[0].diacritics = new Set(
    [...edited[0].diacritics].filter((mark) => mark !== "acute"),
  );
}

const diagnostics = validateDocument(edited);
if (diagnostics.length === 0) {
  encode(edited, "greek"); // ἀνθρωπος
}
encode(source, "greek"); // ἄνθρωπος
```

A shallow copy of a grapheme shares its diacritic set. That is safe for a set
built by the library, which cannot be modified in place; a `Set` you assigned
yourself stays mutable and is shared by the copies, so replace it rather than
modify it if the copies must differ. Unknown literal text is passed through;
recognized punctuation and numeral signs stored as literals may have
format-specific output. Validation
checks the structure and Greek marks of graphemes, not arbitrary literal text
or conformity to a preset.

## Parse, validate, encode

`parse(input, format, options)` interprets a representation into semantic
tokens; some transliteration spellings depend on the selected options. The
options are validated for every format, but only the `transliteration` group,
`greek.accentuation`, and the disposition of the smooth breathing
(`diacritics.smoothBreathing`, or `diacritics.all`) change how text is read:
reading Greek or Beta Code depends on no option. It does not perform the target's orthographic
transformations. Use the same preset and parsing options when encoding the
result, unless a deliberate change of policy is intended:

```ts
const options = { preset: "bnf-core" } as const;
const document = parse("Chará", "transliteration", options);
const output = encode(document, "greek", options); // Χαρά
```

For multiple target formats, encode each from that same original document.
Encoding a lossy orthographic view into a second format cannot restore the
source distinctions removed by the view.

`parseDetailed(input, format, options)` returns the same document together
with `spans`, the range of each token in the input, as offsets in UTF-16 code
units in the input exactly as supplied (the reader normalizes the text, but
the spans are mapped back to the caller's string). Spans are in order of
start and cover the input; tokens read from one character share its span,
and a token read from part of a character that the previous token also draws
on lies inside that token's span (see
[the positions contract](conversion-analysis.md#positions)). The ranges let
an application relate tokens to a selection or an editor position, or slice
the input text of a token:

```ts
import { parseDetailed } from "@humanities/greek-conversion/document";

const input = "ἄνθρωπος";
const { document, spans } = parseDetailed(input, "greek");
input.slice(spans[2].start, spans[2].end); // θ
document[2]; // { kind: "grapheme", letter: "theta", ... }
```

`convertDetailed()` in the main entry point reports the same input spans
together with the output span of each token.

`validateDocument()` reports structural problems and invalid values on a
typed or manually modified document. Its indices refer to token
positions, not offsets into the source string. Validation is an explicit step:
`encode()` does not call it, and even a valid document can encode lossily under
an output policy. Correct structural diagnostics before relying on contextual
ones. A clean result does not certify the syntax of the source string: malformed
sequences such as an incomplete Beta Code `*(` may be preserved as literals.
Use `convertDetailed()` when information loss matters.

The main `createConverter()` API has a separate registry for aliases, custom
characters, and repertoire checks. `parse()` and `encode()` here operate on
the built-in semantic alphabet; they do not inherit a converter instance's
custom characters or exclusions.
