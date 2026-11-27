---
title: "Getting started"
description: "Install greek-conversion for Python, convert a first text, set a conversion with options and presets, and convert a corpus in one call."
---

The `greek-conversion` package converts Ancient, Byzantine, and Modern Greek
between Greek script, Beta Code, and Latin script, in any direction, with
atomic options composed into presets that follow published conventions. This
page installs the package and converts a first text, then presents the
options and the presets, the conventions of each period, normalizing a text
within its format, and converting many strings at once.

## Installation

The package is published as
[`greek-conversion`](https://pypi.org/project/greek-conversion/) on PyPI. It
requires Python 3.11 or later, and is typed: editors and type checkers know
every option and its values.

```sh
pip install greek-conversion
```

It is the Python distribution of the TypeScript library of the same name,
which it runs in a JavaScript engine embedded in Python, with the same
results: [How the package works](/python/package/) says what this means for
you. The [playground](/playground/) converts in the browser, with every
preset and option, without installing anything.

## A first conversion

To begin, transliterate a passage of Thucydides (_History_ 1.1.2), then
write it without diacritics and in Beta Code:

```python
from greek_conversion import convert

thucydides = "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων"

convert(thucydides, "greek", "transliteration")
# → Héllēsin egéneto kaì mérei tinì tō̃n barbárōn

convert(
    thucydides,
    "greek",
    "transliteration",
    diacritics={"all": "remove", "rough_breathing": "preserve"},
)
# → Hellēsin egeneto kai merei tini tōn barbarōn

convert(thucydides, "greek", "beta-code")
# → *(/ellhsin e)ge/neto kai\ me/rei tini\ tw=n barba/rwn
```

Without a preset, the transliteration is the library's own: the letters of the
SBL Handbook, with the accents, iota subscript, diaeresis, and quantity marks
that the Handbook leaves out. Removing the diacritics but keeping the rough
breathing keeps its `h`: in Latin script it is a letter. Every conversion also
works in reverse, and when it matters whether you can get back to where you
started, `convert_detailed()` tells you:

```python
from greek_conversion import convert, convert_detailed

convert(
    "*(/ellhsin e)ge/neto kai\\ me/rei tini\\ tw=n barba/rwn",
    "beta-code",
    "greek",
)
# → Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων

thucydides = "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων"

convert_detailed(thucydides, "greek", "transliteration").lossy  # → False

plain = convert_detailed(
    thucydides,
    "greek",
    "transliteration",
    diacritics={"all": "remove", "rough_breathing": "preserve"},
)
plain.lossy  # → True
plain.losses[0].code  # → removed-diacritic
plain.losses[0].diacritic  # → acute
plain.losses[0].offset  # → 0
```

A loss says where it happened, in the characters of the text you gave, as
Python counts them: `thucydides[0]` is the `Ἕ` whose acute was removed.

## Options and presets

Every conversion is set by options. An option sets one thing, such as
whether the accents are kept (`diacritics.accents`) or how eta is written
(`transliteration.eta`), and has a default. There are 52 of them, in five
groups named after what they describe: `transliteration`, `greek`,
`beta_code`, `text`, and `diacritics`. Each group is a keyword argument, a
dictionary of its options; they combine freely: here chi is written `kh` and
upsilon `u`, and the accents are left out:

```python
from greek_conversion import convert

convert(
    "ψυχὴ καὶ σῶμα",
    "greek",
    "transliteration",
    transliteration={"chi": "kh", "upsilon": "u"},
    diacritics={"accents": "remove"},
)
# → psukhē kai sōma
```

A preset is a set of these options that follows a published convention:
`iso-843-type-1`, the transliteration of the ISO 843 standard, sets ten of
them. The defaults apply first, then the preset, then the options given
with it, so that a preset can be adjusted, here to leave out the apostrophe
that marks the smooth breathing:

```python
from greek_conversion import convert

thucydides = "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων"

convert(thucydides, "greek", "transliteration", preset="iso-843-type-1")
# → Héllīsin ’egéneto kaì mérei tinì tō̂n varvárōn

convert(
    thucydides,
    "greek",
    "transliteration",
    preset="iso-843-type-1",
    transliteration={"smooth_breathing": "omit"},
)
# → Héllīsin egéneto kaì mérei tinì tō̂n varvárōn
```

Options can also be given as one dictionary, for instance read from a
configuration file, in place of the keywords or beside them: the keywords
then take precedence. Keys are written in snake_case, as above; a key
written in camelCase, as the TypeScript library spells it, is refused with
its snake_case spelling, and so is any unknown key or value, which never
falls back to a default:

```python
from greek_conversion import OptionError, convert

settings = {
    "preset": "iso-843-type-1",
    "transliteration": {"smooth_breathing": "omit"},
}
convert("ἐγένετο", "greek", "transliteration", settings)  # → egéneto

try:
    convert(
        "ἐγένετο",
        "greek",
        "transliteration",
        transliteration={"eta": "ē"},
    )
except OptionError as error:
    problem = error

problem.path  # → transliteration.eta
problem.accepted  # → ('e', 'i')
```

[Conversion options](/python/reference/options/) gives each option with its
values and what each writes, and [Choosing a preset](/python/guide/presets/)
compares the conventions.

## Your Greek

Byzantine and Modern Greek convert the same way, with the options and the
presets of their period: the καί symbol takes the accent that manuscripts
give it, and Modern Greek the ISO 843 transcription that passports and maps
use:

```python
from greek_conversion import convert

convert(
    "ϗ τὰ λοιπά",
    "greek",
    "transliteration",
    greek={"kai_accent": "byzantine"},
)
# → kaì tà loipá

convert(
    "Η Αθήνα είναι η πρωτεύουσα",
    "greek",
    "transliteration",
    preset="iso-843-type-2",
)
# → I Athína eínai i protévousa
```

[Ancient Greek](/python/guide/ancient-greek/),
[Byzantine and Medieval Greek](/python/guide/byzantine-greek/), and
[Modern Greek](/python/guide/modern-greek/) give the conventions that apply
to each period, what each keeps, and the tasks proper to it.

## Normalizing a text

To normalize or restyle a text without changing its format, `reencode()`
reads it and writes it back in the same format, with the options you give:
polytonic Greek made monotonic, Beta Code typed in capitals, as in TLG
files, brought back to the library's form, or a transliteration rewritten
following a preset:

```python
from greek_conversion import reencode

thucydides = "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων"

reencode(thucydides, "greek", greek={"accentuation": "monotonic"})
# → Έλλησιν εγένετο και μέρει τινί των βαρβάρων

reencode("*(/ELLHSIN E)GE/NETO KAI\\ ME/REI", "beta-code")
# → *(/ellhsin e)ge/neto kai\ me/rei

transliterated = "Héllēsin egéneto kaì mérei tinì tō̃n barbárōn"

reencode(transliterated, "transliteration", preset="bnf-ancient", source={})
# → Héllēsin e̓géneto kaì mérei tinì tō̂n barbárōn
```

The options describe the text you give as well as the one you get back.
Greek and Beta Code read the same whatever the options, but a
transliteration is read according to its style: `source` names the style it
is written in, here `{}`, the library's own, which `convert()` wrote above.
Read as the BnF's, which marks the smooth breathing, `egéneto` would have
none.

## Many strings at once

`convert()`, `reencode()`, and `convert_detailed()` each have a form that
takes a list of strings and gives back a list, in one call: `convert_many()`,
`reencode_many()`, and `convert_detailed_many()`. For the lines of a corpus or
the cells of a column, they are the fast way, as each call into the
library's engine has a fixed cost that they pay once:

```python
from greek_conversion import convert_detailed_many, convert_many

words = ["μῆνιν", "ἄειδε", "θεὰ"]

convert_many(words, "greek", "beta-code", preset="tlg-core")
# → ['MH=NIN', 'A)/EIDE', 'QEA\\']

results = convert_detailed_many(
    words, "greek", "transliteration", preset="sbl-general"
)
[result.lossy for result in results]  # → [True, True, True]
```

[How the package works](/python/package/#engines-and-speed) gives what a call
costs, and how to choose the engine.

## Next steps

- To see why every format converts to every other with the same rules,
  read [How it works](/python/guide/how-it-works/), in the TypeScript guide: it
  holds for Python.
- To find out what a conversion cannot keep, see
  [What formats and options lose](/python/guide/format-and-option-losses/);
  to find where a given text loses it, as `lossy` hinted above, see
  [Knowing what a conversion loses](/python/guide/losses/).
- For a precise task, the recipes cover
  [diacritics and Unicode output](/python/guide/recipes/diacritics-and-unicode/),
  [transliteration and Beta Code](/python/guide/recipes/transliteration-and-beta-code/),
  and [letters and text](/python/guide/recipes/letters-and-text/).
- Every function is described in the [API reference](/python/reference/api/).
- Before you rely on it, read
  [Guarantees and limits](/python/reference/guarantees/); for a word of this
  documentation, see the [Glossary](/python/guide/glossary/).
