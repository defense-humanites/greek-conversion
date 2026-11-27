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
};
