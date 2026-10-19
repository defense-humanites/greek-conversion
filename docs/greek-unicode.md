# Greek accentuation and Unicode output

Greek accentuation and Unicode representation are independent stages. The
accentuation system changes the canonical document; Unicode options select how
the resulting Greek text is encoded.

## Accentuation systems

Greek output is polytonic by default. Request the mechanical monotonic profile
with `orthography.accentuation`:

```ts
convert("Ποῦ εἶσαι; Ἢ ἐδῶ ἢ ἐκεῖ, καὶ ὄχι ἀλλοῦ.", "greek", "greek", {
  orthography: { accentuation: "monotonic" },
}); // Πού είσαι; Ή εδώ ή εκεί, και όχι αλλού.
```

The monotonic transform:

- preserves diaeresis;
- maps acute, grave, and circumflex to acute, keeping the second accent that
  a word receives from a following enclitic (`ἄνθρωπός τις → άνθρωπός τις`);
- removes smooth and rough breathings, coronis, iota subscript, macron, and
  breve;
- leaves monosyllables unaccented (`καὶ → και`, `τῶν → των`, `κἂν → καν`),
  except the three the monotonic system distinguishes, which the polytonic
  marks identify: disjunctive `ή` from `ἤ` or `ἢ` (not the article `ἡ`, nor
  `ἦ` or `ἥ`), and interrogative `πού` and `πώς` from `ποῦ` and `πῶς` (not the
  relative or indefinite `ποὺ`, `που`, `πὼς`, `πως`).

Syllables are counted on the written vowels: a diphthong is one syllable,
and a diaeresis or an accent on the first of two vowels marks two. An acute
on `πού` or `πώς` is kept, because that is how monotonic text writes the
interrogative, so monotonic input is already canonical. Two cases need
knowledge of the word and are left as written: a monosyllable by synizesis
(`γιὰ`, `μιὰ`, `δυὸ`, `πιὰ` keep their accent, since `Διός` and `κιών`, with
the same vowels, are disyllables), and the optional accent that monotonic
authors put on a weak pronoun to avoid ambiguity (`μού`), which is removed.

It is applied only when the target format is Greek. Beta Code and
transliteration retain the source document's polytonic distinctions. The
transform is intentionally lossy and cannot reconstruct the source
accentuation.

## Order of marks

Greek output writes the marks of one vowel in the order quantity, breathing,
diaeresis, accent, iota subscript. Marks of the same combining class stack
outward from the letter in that order, so the macron or breve sits on the
vowel with the breathing and accent above it, as Greek is typeset. Composed
output therefore keeps the precomposed long or short vowel and adds the
other marks: `ᾱ́` is U+1FB1 U+0301, and `ᾱ̓́` is U+1FB1 U+0313 U+0301. Input
in another order is accepted and converges to this one. Beta Code keeps the
TLG order (`a)/&`), and transliteration uses the same quantity-first order as
Greek (`ā́`).

## Composed and decomposed output

Greek output is composed by default. Set `unicode.composition` to
`"decomposed"` to emit canonical base letters and combining marks:

```ts
convert("ἄ", "greek", "greek", {
  unicode: { composition: "decomposed" },
}); // U+03B1 U+0313 U+0301
```

`"composed"` describes the intended structure, not a guarantee that the final
string is NFC. Oxia and explicitly requested Greek punctuation have canonical
singleton decompositions and are therefore not stable under NFC.

## Tonos and oxia

`unicode.acute` accepts `"system"`, `"tonos"`, and `"oxia"`. The default
`"system"` policy selects oxia for polytonic output and tonos for monotonic
output:

```ts
convert("ά", "greek", "greek");
// ά — U+1F71 GREEK SMALL LETTER ALPHA WITH OXIA

convert("ά", "greek", "greek", {
  orthography: { accentuation: "monotonic" },
});
// ά — U+03AC GREEK SMALL LETTER ALPHA WITH TONOS
```

An explicit value overrides the system preference. It applies only where
Unicode provides alternative composed scalars. Polytonic combinations such as
`ἄ` have no corresponding precomposed “with tonos” character and remain
unchanged. In decomposed output both preferences converge to U+0301 COMBINING
ACUTE ACCENT.

## Greek punctuation scalars

Unicode normalization maps U+037E GREEK QUESTION MARK to U+003B SEMICOLON and
U+0387 GREEK ANO TELEIA to U+00B7 MIDDLE DOT. The canonical forms remain the
default. Exact Greek scalars can be requested after composition:

```ts
formatGreekUnicode("ά;·", {
  acute: "oxia",
  questionMark: "greek",
  anoTeleia: "greek",
}); // ά;·
```

The alternatives are `"semicolon"` and `"middle-dot"`; `"canonical"` is the
default for both punctuation policies.

`formatGreekUnicode()` parses its input as Greek and delegates to the same
encoder as `convert()`. It therefore applies semantic Greek punctuation rules
instead of blind character replacement.

## Code-point inspection

`toUnicodeCodePoints()` reports Unicode scalar values without modifying or
normalizing its input:

```ts
toUnicodeCodePoints("ά;😀");
// ["U+1F71", "U+037E", "U+1F600"]
```

Supplementary characters are returned as one code point, not as two UTF-16
code units.
