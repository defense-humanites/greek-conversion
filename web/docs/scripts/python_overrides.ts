/**
 * The Python of the examples of the guide that `python_examples.ts` cannot
 * translate, written by hand, by page and by the rank of the block in it
 * (from 0). `source` is the beginning of the SHA-256 of the TypeScript
 * block it stands for: when that block changes, `sync_python.ts` fails until
 * its Python is checked and the hash updated. The Python is Markdown, which
 * replaces the block: one or more ```python blocks, which
 * `python/scripts/check_docs.py` runs, or a note.
 */

/**
 * Passages of the TypeScript text to write otherwise for Python, by page:
 * each is replaced before the page is translated, and must be found.
 */
export const PROSE: Record<string, [string, string][]> = {
  // What only holds in TypeScript, in the pages added after the first.
  "docs/conversion-analysis.md": [
    [
      `\`lossy\` is equivalent to \`losses.length > 0\``,
      `\`lossy\` is equivalent to \`len(losses) > 0\``,
    ],
    [
      `in UTF-16 code
units (see [Positions](#positions)); \`input.slice(offset, offset + length)\` is
the text`,
      `in characters
(see [Positions](#positions)); \`text[offset : offset + length]\` is
the text`,
    ],
    [
      `All four are offsets in
UTF-16 code units, the unit of \`String.length\`, \`slice()\`, and editor
selections,`,
      `All four are offsets in
characters as Python counts them, code points, the unit of \`len()\` and of
slices,`,
    ],
    [
      `a precomposed \`ἄ\` is one unit and the same letter written as \`α\` plus two
combining marks is three. A character outside the Basic Multilingual Plane
is two units.`,
      `a precomposed \`ἄ\` is one character and the same letter written as \`α\` plus
two combining marks is three. A character outside the Basic Multilingual
Plane is one, as Python counts it.`,
    ],
    [
      `code unit keeps its own position`,
      `code point keeps its own position`,
    ],
  ],
  "docs/character-extensions.md": [
    [
      `// In UTF-16 code units of the input.`,
      `// In characters of the input.`,
    ],
    [
      `(\`THSHA\`): the \`toUpperCase()\` of the declared uppercase form, with the Greek
locale for Greek forms,`,
      `(\`THSHA\`): the capitals of the declared uppercase form, in the Greek locale
for Greek forms,`,
    ],
  ],
  "guide/how-it-works.md": [
    [
      `\`convert(input, from, to, options?)\``,
      `\`convert(text, source, target, options)\` |
| Convert many strings at once, the lines of a corpus | \`convert_many(texts, source, target, options)\``,
    ],
    [
      `\`reencode(input, format, options?)\``,
      `\`reencode(text, format, options)\``,
    ],
    [
      `\`convertDetailed(input, from, to, options?)\``,
      `\`convertDetailed(text, source, target, options)\``,
    ],
    [
      `| [Inspect or edit the parsed text itself](/guide/document/)                                 | \`parse()\` and \`encode()\` from \`@humanities/greek-conversion/document\` |
`,
      ``,
    ],
    [
      `| [Bundle only the formats and presets a web page uses](/guide/smaller-bundles/)             | \`convert()\` from \`@humanities/greek-conversion/core\`                  |
`,
      ``,
    ],
  ],
  "guide/glossary.md": [
    [
      `See [The canonical document](/guide/document/).`,
      `The Python package does not expose it: see
[The canonical document](/guide/document/), in the TypeScript documentation.`,
    ],
  ],
  "docs/stability.md": [
    [
      `The library follows [Semantic Versioning]`,
      `:::note
This policy is the library's, and names its TypeScript API. How it applies
to the Python package is in [The Python package](#the-python-package).
:::

The library follows [Semantic Versioning]`,
    ],
  ],
  // What the TypeScript library alone has (the canonical document, its
  // entry points, its methods of strings), as it is in Python.
  "docs/presets.md": [
    [
      `runtime configurations. Run \`npm run docs:presets\` after changing preset
metadata or options.`,
      `runtime configurations.`,
    ],
  ],
  "docs/guarantees.md": [
    [
      `subscript, which \`validateDocument()\` rejects`,
      `subscript, which are invalid in a canonical document`,
    ],
    [
      `  unknown format throws a plain \`RangeError\`, an option
  group of the wrong type or an input that is not a string a \`TypeError\`. The
  functions of the \`core\` entry point take readers, writers, and prepared
  options, which the presets entry point exports and \`prepareOptions()\`
  returns: given anything else, the name of a format or an object of options
  included, they throw a \`TypeError\`. The functions of the main and document
  entry points take prepared options in place of options. A copy made by
  spreading them, or prepared options given as \`source\`, as a group, or to a
  converter, throw a \`TypeError\`, which names the preset to write instead.
`,
      `  unknown format raises a plain \`ValueError\`, an option
  group of the wrong type or an input that is not a string a \`TypeError\`. The
  functions take prepared options (\`prepare_options()\`) in place of options;
  given to a converter, which takes options, they raise a \`TypeError\`.
`,
    ],
    [
      `code unit by code unit`,
      `character by character`,
    ],
    [
      `(\`String.prototype.normalize()\`)`,
      `(Unicode normalization, in the library)`,
    ],
    [
      `The API documentation (TSDoc of the exported declarations)`,
      `[API reference](/python/reference/api/)`,
    ],
    [
      `| The canonical document and its validation          | [Document API](/reference/document-api/) and [Validation](/reference/validation/)                                       |
`,
      ``,
    ],
    [
      `[Stability policy](/reference/stability/)`,
      `[Stability policy](/reference/stability/#the-python-package)`,
    ],
  ],
  "docs/information-loss.md": [
    [
      `excludes invalid or ambiguous combinations. Use
\`validateDocument()\` when that distinction matters.`,
      `excludes invalid or ambiguous combinations.`,
    ],
    [
      `such a document is already invalid for
  \`validateDocument()\`, and`,
      `such a document is already invalid, and`,
    ],
    [
      `as \`toUpperCase()\`
  writes it`,
      `as \`str.upper()\`
  writes it`,
    ],
  ],
  "docs/greek-unicode.md": [
    [
      `as
\`toUpperCase()\` does`,
      `as
\`str.upper()\` does`,
    ],
  ],
  // The home page, one level deeper, says what it presents, and its hero
  // what it is.
  "index.mdx": [
    ["title: greek conversion\n", "title: greek conversion for Python\n"],
    ["description: A TypeScript library", "description: A Python library"],
    ["../../components/HomeHero.astro", "../../../components/HomeHero.astro"],
    ["<HomeHero>", '<HomeHero language="python">'],
    // A corpus, which Python converts in one call.
    [
      "  convertDetailed,\n  reencode,",
      "  convertDetailed,\n  convertMany,\n  reencode,",
    ],
    [
      "// → I Athína eínai i protévousa\n",
      `// → I Athína eínai i protévousa

// A corpus in one call, from Beta Code
convertMany(["lo/gos", "yuxh/", "a)lh/qeia"], "beta-code", "greek");
// → ["λόγος","ψυχή","ἀλήθεια"]
`,
    ],
  ],
  // The library suggests the camelCase key for a snake_case one; Python
  // refuses the camelCase key and gives its snake_case spelling.
  "guide/converters.md": [[
    "such as `transliteration.longVowels` for\n`transliteration.long_vowels`.",
    "such as `transliteration.long_vowels` for `transliteration.long-vowels`.\nA key written in camelCase, as the TypeScript library spells it, is\nrefused with its snake_case spelling.",
  ]],
  // For the maintainers of the TypeScript library.
  "docs/options.md": [[
    " Run `npm run docs:options`\nafter changing an option, its documentation, or a preset.",
    "",
  ]],
};

export interface Override {
  source: string;
  markdown: string;
}

export const OVERRIDES: Record<string, Override> = {
  // The document API, which the Python package does not expose.
  "guide/byzantine-greek.md#7": {
    source: "43fb18bacb61",
    markdown: `:::note
This example uses the document API (\`parse()\` and \`encode()\`), which the
Python package does not expose. It is shown in the
[TypeScript guide](/guide/byzantine-greek/#the-overline).
:::`,
  },
  // A regular expression.
  "guide/modern-greek.md#9": {
    source: "ddd67d98b2b4",
    markdown: `\`\`\`python
import re

from greek_conversion import convert, reencode

key = {
    "diacritics": {"all": "remove"},
    "text": {"letter_case": "lowercase"},
    "greek": {
        "sigma": "standard",
        "final_sigma": "medial",
        "medial_beta": "standard",
        "symbol_forms": "standard",
    },
}

reencode("ΘΕΣΣΑΛΟΝΙΚΗ", "greek", key)  # → θεσσαλονικη
reencode("Θεσσαλονίκη", "greek", key)  # → θεσσαλονικη

name = convert(
    "Άγιος Νικόλαος, Κρήτη", "greek", "transliteration",
    preset="iso-843-type-2", **key,
)
re.sub(r"[^a-z0-9]+", "-", name)  # → agios-nikolaos-kriti
\`\`\``,
  },
  // A destructuring.
  "guide/losses.md#1": {
    source: "ac03fcaeaa09",
    markdown: `\`\`\`python
from greek_conversion import convert_detailed

detailed = convert_detailed("ἄνθρωπος", "greek", "transliteration")
span = detailed.spans[2]
"ἄνθρωπος"[span.input_start : span.input_end]  # → θ
detailed.output[span.output_start : span.output_end]  # → th
\`\`\``,
  },
  // An exception, caught.
  "guide/converters.md#0": {
    source: "e1ada350043a",
    markdown: `\`\`\`python
import json

from greek_conversion import OptionError, convert

options = json.loads('{ "transliteration": { "eta": "ē" } }')
try:
    convert("λόγος", "greek", "transliteration", options)
except OptionError as error:
    problem = error

str(problem)
# → Invalid value for transliteration.eta: "ē"; expected one of "e", "i".
problem.path  # → transliteration.eta
problem.accepted  # → ('e', 'i')
\`\`\``,
  },
  // Code points.
  "guide/recipes/diacritics-and-unicode.md#4": {
    source: "b3f8764f4b6b",
    markdown: `\`\`\`python
from greek_conversion import reencode

styled = reencode(
    "ά;",
    "greek",
    greek={"acute": "oxia", "question_mark": "greek"},
)
[f"{ord(char):x}" for char in styled]  # → ['1f71', '37e']
\`\`\``,
  },
  // A function of the reader's.
  "docs/information-loss.md#0": {
    source: "0c480b0b34da",
    markdown: `\`\`\`python
from greek_conversion import ConversionOptions, Format, convert


def is_stable(
    text: str, source: Format, target: Format, options: ConversionOptions
) -> bool:
    once = convert(text, source, target, options)
    twice = convert(once, target, target, options)
    return once == twice


is_stable(
    "Ἡ τοῦ Ὁμήρου Ἰλιάς",
    "greek",
    "transliteration",
    {"preset": "ala-lc-ancient"},
)
# → True
\`\`\``,
  },
  // Code points.
  "docs/greek-unicode.md#3": {
    source: "36256589b9ba",
    markdown: `\`\`\`python
from greek_conversion import convert

decomposed = convert(
    "ἄ", "greek", "greek", greek={"composition": "decomposed"}
)
[f"{ord(char):x}" for char in decomposed]  # → ['3b1', '313', '301']
\`\`\``,
  },
  "docs/greek-unicode.md#4": {
    source: "766d95a67917",
    markdown: `\`\`\`python
from greek_conversion import convert, reencode


def scalar(text: str, at: int) -> str:
    return f"U+{ord(text[at]):04X}"


# No polytonic mark: GREEK SMALL LETTER OMICRON WITH TONOS.
scalar(reencode("λόγος", "greek"), 1)  # → U+03CC

# A breathing in the output: GREEK SMALL LETTER OMICRON WITH OXIA.
scalar(reencode("ὁ λόγος", "greek"), 3)  # → U+1F79

monotonic = convert(
    "ὁ λόγος", "greek", "greek", greek={"accentuation": "monotonic"}
)
monotonic  # → ο λόγος
scalar(monotonic, 3)  # → U+03CC
\`\`\``,
  },
  "docs/greek-unicode.md#5": {
    source: "3f42fbca3e9f",
    markdown: `\`\`\`python
from greek_conversion import reencode

exact = reencode(
    "ά;·",
    "greek",
    greek={
        "acute": "oxia",
        "question_mark": "greek",
        "ano_teleia": "greek",
    },
)
[f"{ord(char):x}" for char in exact]  # → ['1f71', '37e', '387']
\`\`\``,
  },
  // A result's fields, and its spans as dataclasses.
  "docs/conversion-analysis.md#0": {
    source: "6104790d8e12",
    markdown: `\`\`\`python
from greek_conversion import convert_detailed

result = convert_detailed(
    "ἄνθρωπος", "greek", "greek", greek={"accentuation": "monotonic"}
)

result.output  # → άνθρωπος
result.lossy  # → True

loss = result.losses[0]
loss.code  # → removed-diacritic
loss.diacritic  # → smooth
loss.index  # → 0
loss.offset  # → 0
loss.length  # → 1
loss.message
# → The target representation does not retain the smooth breathing.

# One span per source token.
len(result.spans)  # → 8
result.spans[0]
# → ConversionSpan(input_start=0, input_end=1, output_start=0, output_end=1)
result.spans[1]
# → ConversionSpan(input_start=1, input_end=2, output_start=1, output_end=2)
\`\`\``,
  },
  // An exception caught.
  "docs/character-extensions.md#5": {
    source: "4eda047063ad",
    markdown: `\`\`\`python
from greek_conversion import CharacterScopeError, create_converter

strict = create_converter(preset="perseus", out_of_scope_behavior="reject")

try:
    strict.convert("αϝ", "greek", "beta-code")
except CharacterScopeError as error:
    problem = error

str(problem)  # → Conversion rejected: 1 out-of-scope character.
[(item.code, item.index) for item in problem.diagnostics]
# → [("out-of-scope-character", 1)]
\`\`\``,
  },
};
