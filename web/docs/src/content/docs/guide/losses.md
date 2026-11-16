---
title: "Knowing what a conversion loses"
description: "Find out what a conversion cannot keep, and where."
---
Some conversions necessarily merge distinctions. `convertDetailed()` runs the
conversion once and reports, token by token, what the target cannot express:

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

A text mixed with another language reports losses for the letters of that
language, since the library converts the whole string and the target would read
some of them as Greek. Filter the losses by `code` to keep the ones about the
Greek:

```ts
import { convertDetailed } from "@humanities/greek-conversion";

const mixed = convertDetailed(
  "Voir λόγος ; cf. ψυχή.",
  "greek",
  "transliteration",
);
mixed.output; // → Voir lógos ? cf. psychḗ.
mixed.lossy; // → true
mixed.losses.filter((loss) => loss.code !== "unrepresented-literal").length; // → 0
```

When `lossy` is `false`, converting the output back with the same options gives
the same canonical text; after a restyle, swap `source` and the other options.
The loss codes are:

| Code                     | What the target cannot keep                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `removed-diacritic`      | A diacritic of the source                                                                                      |
| `displaced-diacritic`    | The position of a breathing: a hiatus marked only by a breathing (`Ἀίδης`) reads back as a diphthong (`Αἴδης`) |
| `added-diacritic`        | A diaeresis that transliteration writes on a contextual `y` to keep a hiatus, which reads back; `diacritic` identifies it |
| `inferred-breathing`     | The absence of a breathing on an initial vowel, which reads back as a smooth breathing                         |
| `changed-case`           | The letter case                                                                                                |
| `removed-glyph-variant`  | A letter form, such as `ϲ`, `ϐ`, or a `σ` at the end of a word; `glyphVariant` identifies it                     |
| `added-glyph-variant`    | A letter form the target writes where the source has none, and that converts back as another spelling; `glyphVariant` identifies it |
| `unrepresented-grapheme` | A letter, or its position                                                                                      |
| `unrepresented-literal`  | A literal token                                                                                                |

See the
[information-loss matrix](/reference/information-loss/)
for each format pair and option, and the
[conversion-analysis contract](/reference/conversion-analysis/)
for the result format.
