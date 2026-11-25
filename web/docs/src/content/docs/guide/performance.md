---
title: "Performance"
description: "How fast the library converts, what each call costs, and how to keep conversions fast on long texts, on many short strings, and in memory."
---

The conversion functions are synchronous: they read no file and wait for
nothing, and keep no state but the tables they derive from options. On one
core, a text of 10,000 characters converts in 1 to 2 ms, a word in 1 to
3 µs, and a million characters in about a quarter of a second. Time grows
with the length of the text, and with it only.

## Measures

Thucydides 1.1–10, the input of `npm run bench` (10,555 characters, 1,672
words), with `convert()` unless the row says otherwise:

| Conversion                                   | Time   | Characters per second |
| -------------------------------------------- | ------ | --------------------- |
| Greek → Beta Code                            | 1.2 ms | 9 million             |
| Beta Code → Greek                            | 1.2 ms | 11 million            |
| Greek → Greek, with `reencode()`             | 1.2 ms | 9 million             |
| Greek → transliteration                      | 1.8 ms | 6 million             |
| Transliteration → Greek                      | 2.0 ms | 6 million             |
| Greek → transliteration, `iso-843-type-2`    | 2.3 ms | 5 million             |
| Greek → transliteration, `convertDetailed()` | 4.8 ms | 2 million             |

One word, `Ἕλλησιν`, for each call:

| Call                                                            | Time   |
| --------------------------------------------------------------- | ------ |
| `convert()` into Beta Code, with the defaults or a preset       | 1.0 µs |
| `convert()` into transliteration, with the defaults or a preset | 1.7 µs |
| `convert()` into transliteration, with other options            | 3.0 µs |
| `convert()` into transliteration, with options prepared once    | 1.4 µs |
| `convertDetailed()` into transliteration                        | 5.0 µs |
| `convert()` of a converter from `createConverter({})`           | 1.8 µs |

These times were measured with Node.js 24, on one core of a cloud server
(Intel Xeon), during the development of `1.0.0`. Another machine
gives other times, but the ratios between the rows hold better;
`npm run bench`, in a clone of the repository, measures the main ones on
yours.

## What costs what

- **The direction.** Transliteration costs most to write and to read: a
  Latin letter depends on the letters around it (diphthongs, nasal gamma, the
  breathing of a vowel group), and the reader looks for the longest spelling
  at each position. Greek and Beta Code cost least.
- **Spacing signs.** A Greek text with a spacing breathing (`῾Ο`), or with
  a spacing tonos (`΄`) typed for an apostrophe or before a capital
  (`σ΄ αγαπώ`, `΄Ελληνας`), is read a second time to join these signs to
  their letters: a text of 10,000 characters takes some 0.4 ms longer, a
  quarter to two fifths, however few signs it has. A spacing tonos typed
  for the keraia of a numeral (`Β΄ Παγκόσμιος`) adds about a tenth.
- **Words in capitals.** Greek output removes the marks of words in
  capitals (`greek.capitalMarks: "omit"`, the default), and looks at the
  case of each word to find them: converting a text in small letters into
  Greek takes about 5 % longer than with `"preserve"`, and a text in
  capitals about a fifth longer.
- **`convertDetailed()`.** It reads the output again to find what the
  conversion lost, and keeps the position of every token: it costs two to
  three times what `convert()` does. Call it where the losses or the
  positions are wanted, and `convert()` elsewhere.
- **Options.** The defaults and the presets are checked and resolved once,
  and what they imply (the marks each format writes, the Latin letter of
  each Greek one, the spellings the reader accepts) is computed once and
  kept. Options of any other form are checked and resolved at each call: a
  word takes about twice as long, a long text hardly longer. For many short
  strings under such options, prepare them once with `prepareOptions()`,
  and give the prepared options to each call, as
  [Converters, options, and errors](/guide/converters/#prepare-options-once)
  shows.
- **Converters.** A converter from `createConverter()` with nothing to look
  for converts as fast as `convert()`. One bound to a preset checks each
  letter against the preset's repertoire, and one with aliases or characters
  of its own looks for their spellings: a long text takes about a third
  longer. Create one for these, and not to bind a preset alone:
  `convert()` given the preset's name costs less.
- **The first call.** Loading the package takes some tens of milliseconds
  in Node.js, and the first conversion one or two milliseconds more, while
  it builds the tables it needs. Later calls use them.

## Long texts and memory

The time of a conversion grows with the length of its text, and no faster:
a test makes sure of it (`tests/scaling_test.ts`). While it converts, a
conversion holds some 100 bytes for each character of the text, or about
100 MB for a million characters, and `convertDetailed()` two to three times
as much. To keep memory flat on a corpus, convert it line by line or paragraph
by paragraph: a call costing a few microseconds, this is no slower.

One input is slow: thousands of combining marks on one letter, which no
text has, take seconds to normalize. Limit the length of untrusted input
accordingly, as [Guarantees and limits](/reference/guarantees/) says.

The tables kept for options do not grow with use: one for each preset and
each set of prepared options, released with them, and a few dozen at most
for the spellings that options of other forms add.

## Bundle size

On a web page, what the browser loads counts as well. A bundle that imports
`convert()` from the main entry point keeps every format and every preset;
[Smaller bundles](/guide/smaller-bundles/) gives its size, and how to bundle
only the formats and presets a page uses.
