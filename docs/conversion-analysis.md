# Conversion-loss analysis

`convertDetailed()` returns the converted text together with an analysis of the
information retained by the target representation:

```ts
const result = convertDetailed("ἄνθρωπος", "greek", "greek", {
  orthography: { accentuation: "monotonic" },
});

// {
//   output: "άνθρωπος",
//   lossy: true,
//   losses: [{
//     code: "removed-diacritic",
//     index: 0,
//     offset: 0,
//     length: 1,
//     diacritic: "smooth",
//     message: "The target representation does not retain the smooth breathing."
//   }],
//   spans: [
//     { inputStart: 0, inputEnd: 1, outputStart: 0, outputEnd: 1 },
//     { inputStart: 1, inputEnd: 2, outputStart: 1, outputEnd: 2 },
//     // ... one per source token
//   ]
// }
```

`convert()` continues to return only a string. Both functions share the same
parse-and-encode execution; detailed conversion additionally parses the target
output once to compare its canonical document with the source document. It does
not encode the conversion a second time.

## Definition of loss

A conversion is lossy when the canonical target document does not retain all
information present in the canonical source document. The comparison is about
letters, case, diacritics, known glyph variants, punctuation meaning, and
literal tokens—not byte or code-point identity.

Consequently:

- NFC/NFD and tonos/oxia changes are not losses;
- selected beta and Greek punctuation glyphs are not losses;
- removing known lunate-sigma provenance is a loss, while adding a
  deterministic lunate style is not;
- deterministic marks added by an output policy are not losses;
- removed diacritics, monotonic simplification, numeral conversion, dental
  assimilation, consonant changes, and unrepresented source tokens are losses
  when they occur in the actual input.

`lossy` is equivalent to `losses.length > 0` and is included as a convenience
for callers that only need to display a warning.

## Diagnostics

`ConversionLoss.index` is the token index in the parsed source `Document`.
`offset` and `length` locate that token in the input string, in UTF-16 code
units (see [Positions](#positions)); `input.slice(offset, offset + length)` is
the text the loss is about.

| Code | Meaning |
| --- | --- |
| `changed-case` | A source letter is retained but its uppercase/lowercase distinction is not |
| `removed-glyph-variant` | A known source glyph variant, currently lunate sigma, is absent from the reparsed target |
| `removed-diacritic` | A source diacritic is absent from the reparsed target; `diacritic` identifies it |
| `displaced-diacritic` | A source breathing is absent from its vowel but reappears on the following vowel of the reparsed target: a hiatus marked only by that breathing is read as a diphthong; `diacritic` identifies it |
| `inferred-breathing` | The target does not distinguish an unmarked initial vowel from one with a smooth breathing, so the reparsed target carries a smooth breathing the source did not have; `index` is the vowel that acquires it (the second element of an initial diphthong), and `diacritic` is `"smooth"` |
| `unrepresented-grapheme` | A source letter or its position cannot be recovered from the target document |
| `unrepresented-literal` | A source literal token cannot be recovered from the target document |

The codes describe observable information loss rather than the implementation
rule that caused it. A dental assimilation and an elision-induced consonant
change can therefore both report `unrepresented-grapheme`.

## Positions

`spans` has one entry per token of the parsed source, in token order: where
the token was read in the input (`inputStart`, `inputEnd`) and where its
output was written (`outputStart`, `outputEnd`). All four are offsets in
UTF-16 code units, the unit of `String.length`, `slice()`, and editor
selections, in the input exactly as supplied and in the output exactly as
returned. The readers and writers normalize the text (NFD on input, NFC or
NFD on output), but the positions are mapped back to the caller's strings, so
a precomposed `ἄ` is one unit and the same letter written as `α` plus two
combining marks is three. A character outside the Basic Multilingual Plane
is two units. Ends are exclusive.

Input spans are in increasing order and cover the input without gaps. Tokens
read from one character of the input share its span: the three jamo of a
Hangul syllable, which the reader keeps as literals, or the two letters read
from a modern-digraph `b` under ISO 843 Type 2.

Output spans are in increasing order of start and cover the output. Several
tokens written as one share a span: the letters and numeral sign of a Greek
numeral written as a decimal number, a whitespace run collapsed to one space,
the two letters of `μπ` written as `b`, a dental and the sigma it is
assimilated to. A token the output has nothing for (a leading or trailing
whitespace run under `whitespace: "collapse"`) has an empty span where the
output of the next token starts, or at the end of the output. A combining
mark that stands alone in the input, kept as a literal, is written after the
previous token's output and joins its last character: its span is that
character's, inside the previous token's.

These positions describe one conversion. The loss analysis compares
documents, not positions, so `spans` is also returned when `lossy` is
`false`.

A bound converter (`createConverter()`) reports the same positions. Its input
spans are in the input as supplied, before the converter substitutes its own
spellings: the span of a token read from an alias or a custom character is
that of the spelling written in the input (`#711` for a custom character
spelled so in Beta Code), and the literals that preserve an out-of-scope
character share the span of its spelling. Its output spans are in the output
as returned, after the custom characters' forms are written. The converter's
`diagnostics` carry the `offset` and `length` of the character they report,
in the same input, both in `convertDetailed()` and in a `CharacterScopeError`;
their `index`, like the losses', is in the prepared document, so
`spans[diagnostic.index]` is where the character was read.

## Static and dynamic questions

The result describes the supplied input. It does not claim that the format pair
is universally lossless. Greek to transliteration, for example, can be lossless
for one document and lossy for another containing a coronis.

The pairwise risks and option-induced loss mechanisms are documented separately
in [the information-loss contract](information-loss.md).
