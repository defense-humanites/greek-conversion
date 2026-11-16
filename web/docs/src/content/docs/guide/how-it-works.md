---
title: "How it works"
description: "The three formats, the canonical document, the option groups, and which function to use."
---

Three text formats are supported, each in both directions:

| Format                                                                                 | Identifier          | `ἄνθρωπος` is written |
| -------------------------------------------------------------------------------------- | ------------------- | --------------------- |
| Unicode Greek, polytonic or monotonic                                                  | `"greek"`           | `ἄνθρωπος`            |
| [Beta Code](https://stephanus.tlg.uci.edu/encoding.php), the ASCII encoding of the TLG | `"beta-code"`       | `a)/nqrwpos`          |
| Scientific transliteration in Latin script                                             | `"transliteration"` | `ánthrōpos`           |

A conversion reads the source into a **canonical document** (letters, case, and
diacritics, independent of any spelling), applies your options, and writes the
target format. Because every format goes through the same document, any pair
converts in either direction with the same rules, and the library can compare
what went in with what came out.

Options come in five groups, named after what they describe. That is why a name
such as `coronis` can appear in two of them: `diacritics.coronis` asks whether
the coronis is kept, `transliteration.coronis` how it is written in Latin.

| Group             | What it describes                                                                                                              | Examples                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `transliteration` | The Latin writing system: how each letter and mark is spelled, when transliteration is written and, without `source`, read     | `beta: "v"`, `upsilon: "y"`, `longVowels: "circumflex"`, `coronis: "apostrophe"` |
| `greek`           | The Greek writing system: letter shapes, accentuation, assimilation, Unicode form. `sigma`, `finalSigma`, and `doubleRho` reach Beta Code too | `finalSigma: "medial"`, `accentuation: "monotonic"`, `composition: "decomposed"` |
| `betaCode`        | Beta Code conventions                                                                                                          | `case: "uppercase"`, `yot: "#401"`                                               |
| `text`            | Transformations of the whole text, in every format                                                                             | `letterCase: "lowercase"`, `whitespace: "collapse"`, `numerals: "decimal"`       |
| `diacritics`      | Which classes of marks are kept at all; `all` sets every class, a class named with it is the exception                         | `accents: "remove"`, `all: "remove"`                                             |

Every option value is plain ASCII, so it can be typed on any keyboard. Unknown
characters are never discarded: anything the library does not recognize is
copied through unchanged.

## Which function to use

| You want to…                                                             | Use                                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Convert a string                                                         | `convert(input, from, to, options?)`                                  |
| Normalize or restyle a string without changing its format                | `reencode(input, format, options?)`                                   |
| Know whether the conversion loses information, and where each token went | `convertDetailed(input, from, to, options?)`                          |
| Reuse one configuration, add characters, or restrict the repertoire      | `createConverter(configuration)`                                      |
| Inspect or edit the parsed text itself                                   | `parse()` and `encode()` from `@humanities/greek-conversion/document` |

```ts
import { convert, reencode } from "@humanities/greek-conversion";

convert("a)/nqrwpos", "beta-code", "greek"); // → ἄνθρωπος
convert("ánthrōpos", "transliteration", "beta-code"); // → a)/nqrwpos
reencode("λόγος", "greek", { greek: { finalSigma: "medial" } }); // → λόγοσ
```

All of these share the same parser, document, options, and encoders, so they
always agree with one another. The recipes show the option forms of the common
tasks, such as [removing diacritics](/guide/recipes/remove-diacritics/),
[folding letter variants](/guide/recipes/letter-variants/), or
[choosing a Unicode form](/guide/recipes/unicode-output/).
