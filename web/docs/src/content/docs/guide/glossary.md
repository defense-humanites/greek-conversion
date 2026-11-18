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

**Transliteration** (μεταγραμματισμός). A romanization letter by letter, so
that the Greek can be found again: `η` is `ē` or `ī`, never the `i` of iota.
ISO 843 Type 1 is one. It is also the name of the library's Latin format,
`"transliteration"`, whatever the convention written in it.

**Transcription** (μεταγραφή). A romanization by pronunciation, which merges
the letters that sound alike and does not convert back: `η` and `ι` are
both `i`, `ω` and `ο` both `o`. ISO 843 Type 2, the transcription of passports and maps, is
one. See [Modern Greek](/guide/modern-greek/).

**Beta Code.** An encoding of Greek in ASCII, devised for the Thesaurus
Linguae Graecae: `ἄνθρωπος` is `a)/nqrwpos`. See
[Write Beta Code the TLG way](/guide/recipes/transliteration-and-beta-code/#write-beta-code-the-tlg-way).

**Preset.** A named set of options that implements one published convention,
such as `ala-lc-ancient` or `iso-843-type-2`. See
[Choosing a preset](/guide/presets/).

## Accents and other marks

**Polytonic.** The orthography of Ancient and Byzantine Greek, and of
Modern Greek until 1982: three accents (acute, grave, circumflex), two
breathings, the iota subscript, the diaeresis.

**Monotonic.** The orthography of Modern Greek since 1982: one accent, the
tonos, and the diaeresis. See
[Produce monotonic Greek](/guide/recipes/diacritics-and-unicode/#produce-monotonic-greek).

**Tonos and oxia.** The two characters Unicode has for a vowel with an
acute: `ά` with tonos (U+03AC), as monotonic Greek is typed, and `ά` with
oxia (U+1F71), in the polytonic block. They look alike and are canonically
equivalent, but are not equal when two texts are compared. See
[Control Greek Unicode output](/guide/recipes/diacritics-and-unicode/#control-greek-unicode-output).

**Breathing.** The mark on an initial vowel or rho: rough (`ἁ`), an `h` in
Latin script, or smooth (`ἀ`), which several romanizations leave out.

**Coronis.** The mark of a crasis, the contraction of two words into one,
written like a smooth breathing inside the word: `κἀγώ` for `καὶ ἐγώ`.

**Diaeresis.** The two dots that keep a vowel apart from the one before it
(`ἄϋλος`, `προϊόν`); the dialytika of Modern Greek.

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
[Keep or fold letter variants](/guide/recipes/letters-and-text/#keep-or-fold-letter-variants).

**Literal.** Any character the library does not read as Greek: it is kept
as it is and copied to the output.

**Loss.** A distinction of the source that the output does not keep, so that
converting back does not give the same text. A conversion without loss is
reversible under the same options. See
[Knowing what a conversion loses](/guide/losses/).
