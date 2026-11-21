---
title: "How it works"
description: "The three formats, the canonical document, the option groups, and which function to use."
---

Every conversion follows one model: the source is read into a canonical
document, your options shape it, and the target format is written from it. This
page describes the three formats, that document, the option groups, and the
functions built on them.

## Three formats

The library reads and writes three text formats, in any direction:

| Format                                                                                 | Identifier          | `ἄνθρωπος` is written |
| -------------------------------------------------------------------------------------- | ------------------- | --------------------- |
| Greek script, polytonic or monotonic                                                   | `"greek"`           | `ἄνθρωπος`            |
| [Beta Code](https://stephanus.tlg.uci.edu/encoding.php), the ASCII encoding of the TLG | `"beta-code"`       | `a)/nqrwpos`          |
| Scientific transliteration in Latin script                                             | `"transliteration"` | `ánthrōpos`           |

## The canonical document

A conversion reads the source into a **canonical document** (letters, case, and
diacritics, independent of any spelling), applies your options, and writes the
target format. Because every format goes through the same document, any pair
converts in either direction with the same rules, and the library can compare
what went in with what came out. Unknown characters are never discarded:
anything the library does not recognize is kept in the document as a literal
and copied through unchanged.

## Option groups

Options come in five groups, named after what they describe. That is why a name
such as `coronis` can appear in two of them: `diacritics.coronis` asks whether
the coronis is kept, `transliteration.coronis` how it is written in Latin.

| Group             | What it describes                                                                                                                             | Examples                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `transliteration` | The Latin writing system: how each letter and mark is spelled, when transliteration is written and, without `source`, read                    | `beta: "v"`, `upsilon: "y"`, `longVowels: "circumflex"`, `coronis: "apostrophe"` |
| `greek`           | The Greek writing system: letter shapes, accentuation, assimilation, Unicode form. `sigma`, `finalSigma`, and `doubleRho` reach Beta Code too | `finalSigma: "medial"`, `accentuation: "monotonic"`, `composition: "decomposed"` |
| `betaCode`        | Beta Code conventions                                                                                                                         | `case: "uppercase"`, `yot: "#401"`                                               |
| `text`            | Transformations of the whole text, in every format                                                                                            | `letterCase: "lowercase"`, `whitespace: "collapse"`, `numerals: "decimal"`       |
| `diacritics`      | Which classes of marks are kept at all; `all` sets every class, a class named with it is the exception                                        | `accents: "remove"`, `all: "remove"`                                             |

Every option value is plain ASCII, so it can be typed on any keyboard. The
[option reference](/reference/options/) lists every option with its values,
its default, an example, and the presets that select it.

## Which function to use

| You want to…                                                                               | Use                                                                   |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Convert a string                                                                           | `convert(input, from, to, options?)`                                  |
| Normalize or restyle a string without changing its format                                  | `reencode(input, format, options?)`                                   |
| [Know whether the conversion loses information, and where each token went](/guide/losses/) | `convertDetailed(input, from, to, options?)`                          |
| [Bind a preset, add characters, or restrict the repertoire](/guide/converters/)            | `createConverter(configuration)`                                      |
| [Inspect or edit the parsed text itself](/guide/document/)                                 | `parse()` and `encode()` from `@humanities/greek-conversion/document` |
| [Bundle only the formats and presets a web page uses](/guide/smaller-bundles/)             | `convert()` from `@humanities/greek-conversion/core`                  |

```ts
import { convert, reencode } from "@humanities/greek-conversion";

convert("a)/nqrwpos", "beta-code", "greek"); // → ἄνθρωπος
convert("ánthrōpos", "transliteration", "beta-code"); // → a)/nqrwpos
reencode("λόγος", "greek", { greek: { finalSigma: "medial" } }); // → λόγοσ
```

All of these share the same parser, document, options, and encoders, so they
always agree with one another. The recipes show the option forms of the common
tasks, such as
[removing diacritics](/guide/recipes/diacritics-and-unicode/#remove-all-or-some-diacritics),
[folding letter forms](/guide/recipes/letters-and-text/#keep-or-fold-letter-forms),
or
[choosing a Unicode form](/guide/recipes/diacritics-and-unicode/#control-greek-unicode-output).
