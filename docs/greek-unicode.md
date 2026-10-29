# Greek accentuation and Unicode output

Greek accentuation and Unicode representation are independent stages. The
accentuation system changes the canonical document; Unicode options select how
the resulting Greek text is encoded.

## Accentuation systems

Greek output is polytonic by default. Request the mechanical monotonic profile
with `greek.accentuation`:

```ts
convert("Ποῦ εἶσαι; Ἢ ἐδῶ ἢ ἐκεῖ, καὶ ὄχι ἀλλοῦ.", "greek", "greek", {
  greek: { accentuation: "monotonic" },
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
in another order is accepted and converges to this one. Beta Code writes the
breathing, diaeresis, and accent first and the iota subscript last, as the TLG
does, with the quantity between them as a TLG percent code, `%26` for the
macron and `%27` for the breve (`a)/%26`); transliteration uses the same
quantity-first order as Greek (`ā́`).

## Composed and decomposed output

Greek output is composed by default. Set `greek.composition` to
`"decomposed"` to emit canonical base letters and combining marks:

```ts
convert("ἄ", "greek", "greek", {
  greek: { composition: "decomposed" },
}); // U+03B1 U+0313 U+0301
```

`"composed"` describes the intended structure, not a guarantee that the final
string is NFC. Oxia and explicitly requested Greek punctuation have canonical
singleton decompositions and are therefore not stable under NFC.

## Tonos and oxia

`greek.acute` accepts `"system"`, `"tonos"`, and `"oxia"`. The default
`"system"` policy selects oxia for polytonic output and tonos for monotonic
output:

```ts
convert("ά", "greek", "greek");
// ά — U+1F71 GREEK SMALL LETTER ALPHA WITH OXIA

convert("ά", "greek", "greek", {
  greek: { accentuation: "monotonic" },
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
reencode("ά;·", "greek", {
  greek: { acute: "oxia", questionMark: "greek", anoTeleia: "greek" },
}); // ά;·
```

The alternatives are `"semicolon"` and `"middle-dot"`; `"canonical"` is the
default for both punctuation policies.

These preferences belong to the `greek` option group and are applied by the
Greek encoder itself, after the semantic punctuation rules, not by blind
character replacement: `reencode(input, "greek", options)` is how a Greek
string is restyled.
