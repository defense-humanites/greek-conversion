# Conversion-loss analysis

`convertDetailed()` returns the converted text together with an analysis of the
information retained by the target representation:

```ts
const result = convertDetailed("ἄνθρωπος", "greek", "greek", {
  orthography: { accentuation: "monotonic" },
});

// {
//   output: "Άνθρωπος",
//   lossy: true,
//   losses: [{
//     code: "removed-diacritic",
//     index: 0,
//     diacritic: "smooth",
//     message: "The target representation does not retain smooth."
//   }]
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
- removed diacritics, monotonic simplification, numeral conversion,
  contractions, consonant changes, and unrepresented source tokens are losses
  when they occur in the actual input.

`lossy` is equivalent to `losses.length > 0` and is included as a convenience
for callers that only need to display a warning.

## Diagnostics

`ConversionLoss.index` is the token index in the parsed source `Document`, not
a UTF-16 offset or a code-point index in the input string.

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
rule that caused it. A contraction and an elision-induced consonant change can
therefore both report `unrepresented-grapheme`.

## Static and dynamic questions

The result describes the supplied input. It does not claim that the format pair
is universally lossless. Greek to transliteration, for example, can be lossless
for one document and lossy for another containing a coronis.

The pairwise risks and option-induced loss mechanisms are documented separately
in [the information-loss contract](information-loss.md).
