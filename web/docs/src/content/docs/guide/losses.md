---
title: "Knowing what a conversion loses"
description: "Find out what a conversion cannot keep, and where."
---

Some conversions necessarily merge distinctions. `convertDetailed()` runs the
conversion once and reports, token by token, what the target cannot express and
where, so that an application can warn about a loss, highlight it, or rely on
a round trip.
[What formats and options lose](/guide/format-and-option-losses/) says which
distinctions each format and option can lose, in general.

## What a conversion loses

Each loss names what the target cannot keep (`code`) and locates it in the
input. Writing monotonic Greek, for example, removes the breathings:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const monotonic = convertDetailed("ἄνθρωπος", "greek", "greek", {
  greek: { accentuation: "monotonic" },
});
monotonic.output; // → άνθρωπος
monotonic.lossy; // → true
monotonic.losses[0].code; // → removed-diacritic
monotonic.losses[0].diacritic; // → smooth
monotonic.losses[0].offset; // → 0

// Monotonic or uncial Greek has no breathings; transliteration cannot tell
// "no breathing" from "smooth breathing", so reading it back adds one.
convertDetailed("άνθρωπος", "greek", "transliteration").losses[0].code;
// → inferred-breathing
```

## Where each token went

Each loss locates its token in the input (`offset`, `length`, in UTF-16 code
units), and `spans` gives, for every token of the source, where it was read and
where its output was written, so an application can highlight a loss or map a
selection from one text to the other:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const detailed = convertDetailed("ἄνθρωπος", "greek", "transliteration");
const { inputStart, inputEnd, outputStart, outputEnd } = detailed.spans[2];
"ἄνθρωπος".slice(inputStart, inputEnd); // → θ
detailed.output.slice(outputStart, outputEnd); // → th
```

## Text in another language

A text mixed with another language reports losses for the letters of that
language, since the library converts the whole string and the target would read
some of them as Greek. Filter the losses by `code` to keep the ones about the
Greek. The filter also drops the few literals of the Greek itself that a
target cannot keep, such as a parenthesis before a digit in Beta Code:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const mixed = convertDetailed(
  "Voir λόγος ; cf. ψυχή.",
  "greek",
  "transliteration",
);
mixed.output; // → Voir lógos ? cf. psychḗ.
mixed.lossy; // → true
const aboutGreek = mixed.losses.filter(
  (loss) => loss.code !== "unrepresented-literal",
);
aboutGreek.length; // → 0
```

## Round trips and loss codes

When `lossy` is `false`, converting the output back with the same options gives
the same canonical text; after a restyle, swap `source` and the other options.
The loss codes are:

| Code                     | What the target cannot keep                                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `removed-diacritic`      | A diacritic of the source                                                                                                           |
| `displaced-diacritic`    | The position of a breathing: a hiatus marked only by a breathing (`Ἀίδης`) reads back as a diphthong (`Αἴδης`)                      |
| `added-diacritic` | A diaeresis that transliteration writes on a contextual `y` to keep a hiatus, or the accent `greek.kaiAccent` writes on the `καί` of `ϗ`, which read back; `diacritic` identifies it |
| `inferred-breathing`     | The absence of a breathing on an initial vowel, which reads back as a smooth breathing                                              |
| `changed-case`           | The letter case                                                                                                                     |
| `removed-glyph-variant`  | A letter form, such as `ϲ`, `ϐ`, or a `σ` at the end of a word; `glyphVariant` identifies it                                        |
| `added-glyph-variant`    | A letter form the target writes where the source has none, and that converts back as another spelling; `glyphVariant` identifies it |
| `unrepresented-grapheme` | A letter, or its position                                                                                                           |
| `unrepresented-literal`  | A literal token                                                                                                                     |

See the
[information-loss contract](/reference/information-loss/)
for each format pair and option, and the
[conversion-analysis contract](/reference/conversion-analysis/)
for the result format.
