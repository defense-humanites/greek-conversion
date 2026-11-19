---
title: "Glossary"
description: "The terms this documentation uses for Greek writing, its romanizations, and the library's own notions."
---

This documentation speaks of Greek writing with the words of its grammars and
of its standards, and adds a few of its own. This page defines them, with the
page that says more about each.

## Writing Greek in Latin script

**Romanization.** Any writing of Greek in Latin script, whatever its
principle. Libraries speak of romanization tables.

**Transliteration** (μεταγραμματισμός). In the strict sense of the standards, a
romanization letter by letter, so that the Greek can be found again: `η` is
`ē` or `ī`, never the `i` of iota. ISO 843 Type 1 is one. Software gives the
word a broader sense, after the
[Unicode CLDR](https://cldr.unicode.org/index/cldr-spec/transliteration-guidelines):
any conversion from one script to another, which may convert back or not, so
that a romanization is a transliteration into Latin script. The library's
Latin format, `"transliteration"`, is named in that sense: it holds every
convention, transcriptions included.

**Transcription** (μεταγραφή). A romanization by pronunciation, which merges the
letters that sound alike and does not convert back: `η` and `ι` are both `i`,
`ω` and `ο` both `o`. ISO 843 Type 2, the transcription of passports and maps,
is one. See [Modern Greek](/guide/modern-greek/).

**Beta Code.** An encoding of Greek in ASCII, devised for the Thesaurus
Linguae Graecae: `ἄνθρωπος` is `a)/nqrwpos`. See
[Write Beta Code the TLG way](/guide/recipes/transliteration-and-beta-code/#write-beta-code-the-tlg-way).

**Preset.** A named set of options that implements one published convention,
such as `ala-lc-ancient` or `iso-843-type-2`. See
[Choosing a preset](/guide/presets/).

## Greek writing and its marks

**Polytonic.** The orthography of Ancient and Byzantine Greek, and of
Modern Greek until 1982: three accents (acute, grave, circumflex), two
breathings, the iota subscript, the diaeresis.

**Monotonic.** The orthography of Modern Greek since 1982: one accent, the
tonos, and the diaeresis. See
[Produce monotonic Greek](/guide/recipes/diacritics-and-unicode/#produce-monotonic-greek).

**Uncial.** The capital script of ancient and early medieval manuscripts,
written without accents, breathings, or spaces between words. See
[Uncial-style output](/guide/byzantine-greek/#uncial-style-output).

**Tonos and oxia.** The two characters Unicode has for a vowel with an
acute: `ά` with tonos (U+03AC), as monotonic Greek is typed, and `ά` with
oxia (U+1F71), in the polytonic block. They look alike and are canonically
equivalent, but are not equal when two texts are compared. See
[Control Greek Unicode output](/guide/recipes/diacritics-and-unicode/#control-greek-unicode-output).

**Breathing.** The mark on an initial vowel or rho: rough (`ἁ`), an `h` in
Latin script, or smooth (`ἀ`), which several romanizations leave out.

**Coronis.** The mark of a crasis, the contraction of two words into one,
written like a smooth breathing inside the word: `κἀγώ` for `καὶ ἐγώ`.

**Elision.** The loss of a final vowel before a word that begins with a vowel,
marked by an apostrophe: `ἀπ’ αὐτοῦ` for `ἀπὸ αὐτοῦ`. Before a rough breathing,
Attic spelling aspirates the consonant left (`ἀφ’ οὗ`). See
[Aspirate an elided consonant](/guide/recipes/letters-and-text/#aspirate-an-elided-consonant).

**Diaeresis.** The two dots that keep a vowel apart from the one before it
(`ἄϋλος`, `προϊόν`); the dialytika of Modern Greek.

**Hiatus.** Two vowels that meet without forming a diphthong. Greek marks it
with a diaeresis on the second (`ἄϋλος`), or, at the start of a word, with the
breathing on the first vowel instead of the second (`Ἀίδης`, not `Αἴδης`). A
romanization that writes no smooth breathing loses that mark: see
[What formats and options lose](/guide/format-and-option-losses/).

**Iota subscript.** The iota written under a long vowel (`τῷ`), or on the
line after it, as an adscript (`τῶι`). See
[Write the iota on the line](/guide/recipes/letters-and-text/#write-the-iota-on-the-line).

**Keraia.** The sign that marks letters used as a numeral: `ιβʹ` is 12, and
`͵α` 1000. See
[Punctuation and numerals](/reference/punctuation-and-numerals/#alphabetic-numerals).

**Ano teleia.** The raised dot `·`, the Greek semicolon; the Greek question
mark is written `;`. See
[Punctuation and numerals](/reference/punctuation-and-numerals/#punctuation).

## The library's notions

**Canonical document.** What a text is once read: its letters, their case,
and their marks, independent of any spelling. Every format is read into it
and written from it. See [The canonical document](/guide/document/).

**Letter form.** One of several shapes of a letter, which the library reads
as that letter and remembers: the lunate sigma `ϲ`, the final and medial
sigma, and symbol forms such as `ϐ` and `ϑ`. See
[Keep or fold letter forms](/guide/recipes/letters-and-text/#keep-or-fold-letter-forms).

**Literal.** Any character the library does not read as Greek: it is kept
as it is and copied to the output.

**Loss.** A distinction of the source that the output does not keep, so that
converting back does not give the same text. A conversion without loss is
reversible under the same options. See
[Knowing what a conversion loses](/guide/losses/).

**Repertoire.** The characters a converter recognizes. `createConverter()` can
restrict them, and a converter bound to a preset keeps to those of its standard:
it copies the others as they are and reports them, or rejects the text. See
[Restrict to a repertoire](/guide/converters/#restrict-to-a-repertoire).

**Restyle.** To rewrite a text in its own format after another convention, such
as a transliteration from the SBL style to ALA-LC; `source` names the convention
it is written in. See
[Restyle a transliteration](/guide/recipes/transliteration-and-beta-code/#restyle-a-transliteration).
