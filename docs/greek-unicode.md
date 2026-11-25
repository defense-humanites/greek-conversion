# Greek output

Greek accentuation and Unicode representation are independent stages. The
accentuation system changes the canonical document; Unicode options select how
the resulting Greek text is encoded.

## Accentuation systems

Output is polytonic by default. Request the mechanical monotonic profile with
`greek.accentuation`, which applies to every format:

```ts
import { convert } from "@humanities/greek-conversion";

convert("Ποῦ εἶσαι; Ἢ ἐδῶ ἢ ἐκεῖ, καὶ ὄχι ἀλλοῦ.", "greek", "greek", {
  greek: { accentuation: "monotonic" },
});
// → Πού είσαι; Ή εδώ ή εκεί, και όχι αλλού.
```

The monotonic transform:

- preserves diaeresis;
- maps acute, grave, and circumflex to acute, keeping the second accent that
  a proparoxytone receives from a following enclitic
  (`ἄνθρωπός τις → άνθρωπός τις`): the second accent of a word accented on
  its last two syllables, as polytonic Greek accents a paroxytone or a
  properispomenon before an enclitic, is removed (`σῶμά μου → σώμα μου`,
  `εἶναί τινα → είναι τινα`);
- removes smooth and rough breathings, coronis, iota subscript, macron, and
  breve;
- leaves monosyllables unaccented (`καὶ → και`, `τῶν → των`, `κἂν → καν`),
  except those that the monotonic system distinguishes, which the marks of
  the source identify: disjunctive `ή` from `ἤ` or `ἢ` (not the article `ἡ`,
  nor `ἦ` or `ἥ`); interrogative `πού` and `πώς` from `ποῦ` and `πῶς` (not
  the relative or indefinite `ποὺ`, `που`, `πὼς`, `πως`); and the weak forms
  of the personal pronouns that an author accents to avoid ambiguity,
  written with an acute before the word they belong to
  (`ο πατέρας μού είπε`, `δώσε μού το`; not the article `τοῦ`, `τῆς`,
  `τοὺς`, nor an oxytone before punctuation or an enclitic of ancient Greek,
  such as the possessive `σάς.` or `τούς τε`).
  A word that elision made a monosyllable, which ends in a consonant before
  an apostrophe, keeps its accent (`δεῖξ’ το → δείξ’ το`, `ὅτ’ → ότ’`), as
  does a word that abbreviates a longer one (`ὅ,τι → ό,τι`, `κ.ἄ. → κ.ά.`,
  `20ός`).

Syllables are counted on the written vowels: a diphthong is one syllable, and a
diaeresis or an accent on the first of two vowels marks two. An acute on `πού`,
`πώς`, or a weak pronoun is kept, because that is how monotonic text writes
them, so these words are already canonical in monotonic input; a polytonic
enclitic that received an acute from the next is kept as well
(`πατήρ μού ἐστιν → πατήρ μού εστιν`). A word in quotation marks is no
elision (`‘πῦρ’ → ‘πυρ’`), the closing mark being the apostrophe. Some cases
need knowledge of the word and are left as written: the last word of a
quotation of several words, which ends as an elided word does
(`‘τὸ πῦρ’ → ‘το πύρ’`), an oxytone before an elided `τε` (`τούς τ’`), a
monosyllable by synizesis (`γιὰ`, `μιὰ`, `δυὸ`, `πιὰ` keep their accent,
since `Διός` and `κιών`, with the same vowels, are disyllables), and the
accent that an imperative accented on its penult passes to the first of two
weak pronouns (`δῶσέ μου το` gives `δώσε μου το`, where monotonic writes
`δώσε μού το`).

The count takes as a word what stands between spaces and punctuation, except
where usage keeps the accent of a word of one vowel, because it abbreviates a
longer one:

- the comma of `ό,τι` (the hypodiastole), before a letter, is inside its
  word, which has two syllables;
- a word that a period joins to a letter, with no space, belongs to an
  abbreviation and keeps its accent (`κ.ά.`, `ό.π.`), as a word before a
  full stop does not (`των.`);
- the ending of an ordinal written with digits keeps its accent (`20ός`,
  `το 20ό`).

Monotonic text reads back from transliteration as written, its accents
included (`o patéras moú eípe` gives `ο πατέρας μού είπε`).

It applies to every format: Beta Code and transliteration spell the monotonic
text that Greek output writes, so that a polytonic transliteration or Beta
Code text re-encodes as a monotonic one. The transform is intentionally lossy
and cannot reconstruct the source accentuation.

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("Hē Athḗna eĩnai hē prōteúousa", "transliteration", {
  greek: { accentuation: "monotonic" },
});
// → Ē Athḗna eínai ē prōteúousa

reencode("*(h *)aqh/na ei)=nai h( prwteu/ousa", "beta-code", {
  greek: { accentuation: "monotonic" },
});
// → *h *aqh/na ei/nai h prwteu/ousa
```

## Order of marks

Greek output writes the marks of one vowel in the order quantity, breathing,
diaeresis, accent, overline, iota subscript. Marks of the same combining
class stack outward from the letter in that order, so the macron or breve
sits on the vowel with the breathing and accent above it, as Greek is
typeset. Composed output therefore keeps the precomposed long or short
vowel and adds the other marks: `ᾱ́` is U+1FB1 U+0301, and `ᾱ̓́` is U+1FB1
U+0313 U+0301. Input in another order is accepted and converges to this one.
Beta Code writes the breathing, diaeresis, and accent first and the iota
subscript last, as the TLG does, with the quantity between them as a TLG
percent code, `%26` for the macron and `%27` for the breve (`a)/%26`);
transliteration uses the same quantity-first order as Greek (`ā́`).

The Latin circumflex U+0302 and tilde U+0303, which some Greek text has for
the perispomeni, are read as the circumflex, on any letter, as
transliteration reads them, and Greek output writes U+0342: `τω̃ν` gives
`τῶν`.

A combining mark the library does not read, such as the dot below of the
Leiden conventions, stays a literal after its letter. The marks that the
Unicode canonical order puts after it, because their combining class is
higher, still belong to the letter, in whichever order they were typed:
`ἄ̣νθρωπος` is α, U+0323, U+0313, U+0301 once decomposed, and gives
`ạ́nthrōpos` in transliteration and `a)/̣nqrwpos` in Beta Code. A mark the
library reads after one of the same class, which is not reordered, stays a
literal with it.

Such a mark, like a join control (U+200C, U+200D, U+2060), stays inside its
word: a vowel after it does not start a word, and takes no smooth breathing
when transliteration is read (`kạe` gives `κα̣ε`), and the place of a sigma
before it is that of the letter after it. Two vowels on either side of it
form no diphthong: `α̣υ` is written `ạy`, whose `a` takes the breathing of
the word (`ạytos` gives `ἀ̣υτος`).

### Overline

Manuscripts and editions draw a line over abbreviations and numerals, the
nomina sacra among them (`θ̅ς̅` for θεός). The overline U+0305 is a mark of
its letter, on a consonant as on a vowel, and every format keeps it: Greek
and transliteration write it after the letter (`θ̅ς̅`, `th̅s̅`), and Beta Code
over a run of letters, between `<` and `>`, as the TLG does (`<qs>`).
`diacritics.overline: "remove"` removes it, as `diacritics.all: "remove"`
does, and monotonic accentuation keeps it. The library does not expand an
abbreviation, nor read an overlined numeral as one: `ι̅β̅` is the letters ι
and β.

```ts
import { convert } from "@humanities/greek-conversion";

convert("θ̅ς̅ Χ̅Σ̅", "greek", "beta-code"); // → <qs> <*x*s>
convert("<qs>", "beta-code", "transliteration"); // → th̅s̅
```

Before a digit, `>` would begin another TLG code, so a run of overlined
letters followed by one is written without its overline, and
`convertDetailed()` reports it.

## Composed and decomposed output

Greek output is composed by default. Set `greek.composition` to
`"decomposed"` to emit canonical base letters and combining marks:

```ts
import { convert } from "@humanities/greek-conversion";

const decomposed = convert("ἄ", "greek", "greek", {
  greek: { composition: "decomposed" },
});
[...decomposed].map((c) => c.codePointAt(0)!.toString(16));
// → ["3b1","313","301"]
```

`"composed"` describes the intended structure, not a guarantee that the final
string is NFC. Oxia and explicitly requested Greek punctuation have canonical
singleton decompositions and are therefore not stable under NFC.

## Tonos and oxia

Unicode encodes an acute on a vowel twice: with tonos (`ά`, U+03AC), the form
NFC gives, and with oxia (`ά`, U+1F71), in the polytonic block. `greek.acute`
accepts `"system"`, `"tonos"`, and `"oxia"`. The default `"system"` follows
the output: it writes oxia when the Greek output carries a polytonic mark (a
breathing, a grave, a circumflex, an iota subscript, a coronis, or a quantity
mark), and tonos when it carries none, as monotonic text is written. Monotonic
Greek therefore comes back as it was typed, and output under
`accentuation: "monotonic"` always has tonos:

```ts
import { convert, reencode } from "@humanities/greek-conversion";

const scalar = (text: string, at: number) =>
  "U+" + text.codePointAt(at)!.toString(16).toUpperCase().padStart(4, "0");

// No polytonic mark: GREEK SMALL LETTER OMICRON WITH TONOS.
scalar(reencode("λόγος", "greek"), 1); // → U+03CC

// A breathing in the output: GREEK SMALL LETTER OMICRON WITH OXIA.
scalar(reencode("ὁ λόγος", "greek"), 3); // → U+1F79

const monotonic = convert("ὁ λόγος", "greek", "greek", {
  greek: { accentuation: "monotonic" },
});
monotonic; // → ο λόγος
scalar(monotonic, 3); // → U+03CC
```

The choice is made on the output, once the options have shaped it, so that
converting it again changes nothing: polytonic text whose other marks an
option removes is written with tonos. It is made for the whole output of one
conversion. A polytonic text converted one word at a time therefore writes
with tonos the words that carry no other mark (`λόγος`): set
`acute: "oxia"` to write every acute alike, whatever is converted.

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
import { reencode } from "@humanities/greek-conversion";

const exact = reencode("ά;·", "greek", {
  greek: { acute: "oxia", questionMark: "greek", anoTeleia: "greek" },
});
[...exact].map((c) => c.codePointAt(0)!.toString(16));
// → ["1f71","37e","387"]
```

The alternatives are `"semicolon"` and `"middle-dot"`; `"canonical"` is the
default for both punctuation policies.

These preferences belong to the `greek` option group and are applied by the
Greek encoder itself, after the semantic punctuation rules, not by blind
character replacement: `reencode(input, "greek", options)` is how a Greek
string is restyled.

## Iota subscript

Greek output writes a kept iota subscript below the line, and after a capital
as the prosgegrammeni (`ᾼ`, U+1FBC), which is what Unicode's titlecase mapping
gives. `greek.iotaSubscript: "capital-adscript"` writes it on the line after a
capital instead (`Ὠιδῇ`, `ΤΩΙ`), as Smyth describes (§ 5) and as Unicode's
uppercase mapping does (`ᾳ` → `ΑΙ`). `"adscript"` writes it on the line after
every vowel (`τῶι`). The iota is a capital among capitals and in text set in
capitals, and small after a capital that begins a lowercase word or stands
alone. Written on the line, it is a letter: it reads back as iota, and the
conversion reports the loss of the subscript. Monotonic output has no iota
subscript to write.

## Letter forms

The Greek reader reads the symbol forms of letters as those letters, which is
how Unicode folds them under compatibility normalization (NFKC): `ϐ` as beta,
`ϑ` as theta, `ϕ` as phi, `ϖ` as pi, `ϰ` as kappa, `ϱ` as rho, `ϵ` as
epsilon, and the capitals `ϴ` as theta and `ϒ` as upsilon, with its accented
forms `ϓ` and `ϔ`. It also remembers the form as the grapheme's
`glyphVariant`, as it does for the lunate sigma `ϲ` (`Ϲ`) and for the final and
medial sigma.

By default, Greek output keeps the forms the source writes. Each has its
option, whose `"standard"` value writes the ordinary letter: `greek.sigma` for
the lunate sigma, `greek.medialBeta` for `ϐ`, and `greek.symbolForms` for the
other symbol forms. `greek.medialBeta: "symbol"` writes `ϐ` inside a word and
`β` at its start, as French typography does, whatever the source has. No
option writes another symbol form where the source has the ordinary letter:
Unicode reserves them for mathematics (§ 7.2), and leaves the shape of a
letter to the font.

```ts
import { reencode } from "@humanities/greek-conversion";

reencode("ϐίος ϑεός", "greek"); // → ϐίος ϑεός
reencode("ϐίος ϑεός", "greek", {
  greek: { medialBeta: "standard", symbolForms: "standard" },
});
// → βίος θεός
reencode("βίος ἅβα", "greek", {
  greek: { medialBeta: "symbol" },
});
// → βίος ἅϐα
```

### Signs for several letters

Some signs stand for several letters. The readers read them as those letters,
and remember the sign as the `glyphVariant` of the first one: the καί symbol
`ϗ` (`Ϗ`, Beta Code `#1532` and `#1531`) as `και` (`kai-symbol`), and the
ligature `ȣ` (`Ȣ`, Beta Code `#1521`) as `ου` (`ou-ligature`). The ligature is
a Latin letter, OU, which editions use for the Greek one; only the Greek
reader takes it for `ου`. Marks written after a sign belong to its last
letter (`ϗ́` is `καί`, `ȣ̓` is `οὐ`); a capital sign begins a word, or is set
in capitals before a capital (`ȢΤΟΣ`), and so is a sign that stands alone
between words in capitals: the nearest word on each side, across spaces and
punctuation, has its two letters nearest the sign in capitals, on one side at
least, and no small letter on the other (`ΛΟΓΟΣ Ϗ ΤΟΥ` is `ΛΟΓΟΣ ΚΑΙ ΤΟΥ`;
a word of one capital letter decides nothing). No accent is read: `ϗ` is
`και`.

`greek.stigma: "ligature"` reads a stigma between two letters as `σ` and `τ`
(`stigma-ligature`), which older printing joined in that sign: `ἐϛὶ` is
`ἐστὶ`. A stigma after a letter but before none, or before a keraia, stays
the numeral (`ιϛ`, `ιϛʹ`). The option bears on reading, in every format,
since a stigma between two letters cannot otherwise be told from the
ligature.

By default, Greek output writes the sign again where the letters it stands
for follow its first one unchanged, and `greek.ligatures: "standard"` writes
the letters. Beta Code writes the TLG codes of `ϗ`, `Ϗ`, and `Ȣ`, the only
ones the TLG has; transliteration writes the letters. No option writes a sign
where the source has the letters.

```ts
import { convert, reencode } from "@humanities/greek-conversion";

convert("ἐγὼ ϗ σύ", "greek", "beta-code"); // → e)gw\ #1532 su/
convert("ἐγὼ ϗ σύ", "greek", "transliteration"); // → egṑ kai sý
reencode("ϗ ȣ̓κ", "greek", { greek: { ligatures: "standard" } });
// → και οὐκ
const stigma = { greek: { stigma: "ligature" } } as const;
convert("ἐϛὶ", "greek", "transliteration", stigma); // → estì
```

#### The accent of `καί`

`ϗ` marks no accent, and the `και` it stands for has none unless one is
written after the sign. Where the output writes the letters, in
transliteration and in Greek and Beta Code under `greek.ligatures:
"standard"`, `greek.kaiAccent` writes the accent the context gives:

- `"none"`, the default, writes none: `kai`.
- `"byzantine"` writes the grave, as Byzantine manuscripts do, even before
  punctuation: `καὶ`.
- `"modern"` follows modern editions (Smyth §§154, 183, 187). It writes the
  acute before a comma, a period, a raised dot, a question mark, a colon, or
  an exclamation mark, at the end of the text, and before an enclitic
  without accent (`καί τινες`, `καί ἐστι`) or elided (`καί μ’`, `καί σ’`,
  `καί ῥ’`). It writes the grave before any other word or sign: a word with
  an accent (`καὶ ἔστι`, `καὶ τίς`), a proclitic (`καὶ ὁ`), a bracket, a
  dash. A line break is no pause: the word after it decides.

The enclitics are those of Smyth §181, with their poetic and dialect forms
(`μιν`, `σφε`, `κως`, `κε`, `ῥα`). Where the form alone does not decide,
`"modern"` writes what modern editions most often have: the grave before
`οἱ`, which is the article more often than the pronoun; the grave before an
enclitic that has an accent, which is then more often an interrogative or
emphatic word than an enclitic accented by the next (`καὶ τί ποτε`); the
grave before `τιν’`, and the acute before a comma and before `σ’`.

No accent is written on a sign that has one (`ϗ́`), in capitals, or in a text
with no polytonic mark (a breathing, a grave, a circumflex, an iota subscript,
a coronis, or a quantity mark), which may be monotonic or unaccented:
`ϗ ὁ λόγος` takes the accent, `ϗ λόγος` does not. Monotonic output writes no
accent on `και` in any case. The document keeps the sign unaccented, so that Greek
and Beta Code still write `ϗ` and `#1532` where they write the sign;
`convertDetailed()` reports each accent written as `added-diacritic`.

```ts
import { convert, reencode } from "@humanities/greek-conversion";

const modern = { greek: { kaiAccent: "modern" } } as const;
convert("ϗ τινες ϗ τοῦ ϗ", "greek", "transliteration", modern);
// → kaí tines kaì toũ kaí
reencode("ϗ τοῦ", "greek", {
  greek: { kaiAccent: "byzantine", ligatures: "standard" },
});
// → καὶ τοῦ
```

### Case of the forms

A form belongs to one case, except the lunate sigma, which has a capital and a
small form. Changing the case of `ϑ` or `ϐ` writes `Θ` or `Β`, as
`toUpperCase()` does, and that of `ϴ` or `ϒ` writes `θ` or `υ`.

A form that Greek output, under the options of the conversion, writes from a
Greek source but not from the text read back is lost, and
`convertDetailed()` reports it (`removed-glyph-variant`, with the source
form in `glyphVariant`; see [Letter forms](information-loss.md#letter-forms)
for the other source formats). Transliteration writes `ϐίος` as `bíos`, which
reads back as `βίος`: the conversion reports the loss under the default
`medialBeta: "preserve"`, but not under `"symbol"`, which writes `βίος` from
either text. Beta Code writes the lunate sigma `s3`, and transliteration
writes it `c` under `transliteration.lunateSigma: "c"`. Under the default
`greek.finalSigma: "preserve"`, Beta Code also writes a sigma whose shape
contradicts its place as `s1` (`σ`) or `s2` (`ς`), the codes of the TLG:
`λόγοσ` gives `lo/gos1`.

Where its position decides the shape of a sigma (`greek.finalSigma:
"contextual"`, or `"preserve"` for a sigma whose shape the source does not
note), a sigma before an apostrophe stays medial: the apostrophe stands for an
elided vowel, and the word goes on (`ἔχουσ’ ἐγώ`, `σ’ αγαπώ`). The sigma is
final only when the apostrophe closes a quotation that `‘` opened on the same
line, and no word that begins with a vowel follows it on that line, since
Greek elides only before a vowel. A sigma on its own is always medial: it is
the elided σε or σου, which Modern Greek also elides before a consonant
(`σ’ το πω`), or the letter quoted (‘σ’).

```ts
import { convert, reencode } from "@humanities/greek-conversion";

const contextual = { greek: { finalSigma: "contextual" } } as const;
reencode("ἔχους’ ἐγώ", "greek", contextual); // → ἔχουσ’ ἐγώ
reencode("‘λόγοσ’ est", "greek", contextual); // → ‘λόγος’ est
convert("e)/xous' e)gw/", "beta-code", "greek"); // → ἔχουσ’ ἐγώ
```

An apostrophe after punctuation or a digit cannot be an elision, and closes
the quotation (‘ναί.’, ‘1821’). A straight quotation mark opens nothing, since
it cannot be told from an aphaeresis (`’στιν`). A closing quotation mark
followed by a word that begins with a vowel is read as an elision, and the
quotation stays open for the rest of the line. So, under `"contextual"`,
`'λόγος'` gives `’λόγοσ’`, `‘λόγος’ ἐστί` gives `‘λόγοσ’ ἐστί`, and
`‘Ναι’ είπε ἐλθοῦσ’.` gives `‘Ναι’ είπε ἐλθοῦς’.`; the default `"preserve"`
keeps these shapes as written.
