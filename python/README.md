<br>

<p align="center">
  <img src="https://raw.githubusercontent.com/defense-humanites/greek-conversion/main/docs/assets/greek-conversion-logo-clair.svg" alt="greek conversion" width="240">
</p>

<p align="center">
  <b>A Python library that converts Ancient, Byzantine, and Modern Greek
  between Greek script, Beta Code, and Latin script, with atomic options
  composed into standards-based presets, and information-loss
  diagnostics.</b>
</p>

<p align="center">
  <a href="https://pypi.org/project/greek-conversion/"><img src="https://img.shields.io/pypi/v/greek-conversion" alt="PyPI"></a>
  <a href="https://github.com/defense-humanites/greek-conversion/actions/workflows/python.yml"><img src="https://github.com/defense-humanites/greek-conversion/actions/workflows/python.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/defense-humanites/greek-conversion/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
</p>

<p align="center">
  <a href="https://greek-conversion.humanites.fr/python/"><b>Documentation</b></a> ·
  <a href="https://greek-conversion.humanites.fr/playground/"><b>Playground</b></a>
</p>

<br>

`greek-conversion` is a Python library for everyone who moves Greek between
scripts:

- **Ancient Greek**: read polytonic Greek with every mark, digamma, koppa,
  and sampi; transliterate an edition with its accents and length marks, or
  after SBL, the BnF, ALA-LC, or ISO 843; read and write the Beta Code of
  the TLG and Perseus.
- **Byzantine Greek**, under the same conventions: read the breathings
  printed before capitals, the καί symbol, and alphabetic numerals; keep the
  lunate sigma, the overline of the nomina sacra, and Byzantine punctuation;
  romanize after ALA-LC, whose table runs to 1453.
- **Modern Greek**: transcribe names as passports and maps write them, after
  ELOT 743, which the United Nations adopted and ISO 843 gives as its Type 2;
  transliterate after ISO 843 Type 1, which converts back, or ALA-LC; turn
  polytonic text into monotonic; build search keys and URL slugs.

Each convention is a preset: a set of the library's 52 atomic options, which
states its references and how far it follows them. The options also combine
beyond the presets, among 126 values: `transliteration={"chi": "kh",
"upsilon": "u"}` writes `ψυχή` as `psukhḗ`, and
`greek={"iota_subscript": "adscript"}` writes `τῷ` as `τῶι`. The ALA-LC,
BnF, and ISO 843 presets are tested against examples from their published
tables, and `iso-843-type-2` against every example of the BGN/PCGN table. When a conversion cannot be reversed, the
library says what was lost instead of quietly guessing. It converts whole
corpora in one call.

The package is the Python distribution of the TypeScript library of the same
name, and runs it: see [How the package works](#how-the-package-works).

**Not a developer?** The
[playground](https://greek-conversion.humanites.fr/playground/)
converts in the browser, with every preset and option, and shows what each
conversion loses.

## Installation

```sh
pip install greek-conversion
```

The package requires Python 3.11 or later. It is typed: every option key
and value is known to editors and type checkers, which complete and check
them (`ConversionOptions`, `Preset`, `Format`).

## Main functions

| You want to…                                                             | Use                                          |
| ------------------------------------------------------------------------ | -------------------------------------------- |
| Convert a string                                                         | `convert(text, source, target, options)`     |
| Convert many strings at once: the lines of a corpus, a column            | `convert_many(texts, source, target, options)` |
| Normalize or restyle a string without changing its format                | `reencode(text, format, options)`            |
| …for many strings at once                                                | `reencode_many(texts, format, options)`      |
| Know whether the conversion loses information, and where each token went | `convert_detailed(text, source, target, options)` |
| …for many strings at once                                                | `convert_detailed_many(texts, source, target, options)` |
| Convert only the Greek of a text in another language                     | `convert_greek_passages(text, target, options)` |
| Bind a preset, add characters, or restrict the repertoire                | `create_converter(configuration)`            |

Options are given as a mapping, as keyword arguments, or both.

## Examples

### `convert()`

`convert()` takes a string from one format to another, after a preset or
the options it is given:

```python
>>> from greek_conversion import convert

>>> # The first words of the Odyssey, in the Beta Code of Perseus
>>> convert("ἄνδρα μοι ἔννεπε, μοῦσα", "greek", "beta-code")
'a)/ndra moi e)/nnepe, mou=sa'

>>> # A Byzantine manuscript's ligature for ου
>>> convert("τȣ̃ θεȣ̃", "greek", "transliteration")
'toũ theoũ'

>>> # A Modern Greek author, for a library record
>>> convert("Νίκος Καζαντζάκης", "greek", "transliteration", preset="ala-lc-modern")
'Nikos Kazantzakēs'

>>> # A search key, without marks or capitals
>>> convert("Ἀριστοτέλης", "greek", "transliteration",
...         diacritics={"all": "remove"},
...         transliteration={"long_vowels": "omit"},
...         text={"letter_case": "lowercase"})
'aristoteles'

```

### `convert_many()`

`convert_many()` converts a list of strings as `convert()` converts each,
in one call, which is much faster for a corpus; `reencode_many()` and
`convert_detailed_many()` do the same for `reencode()` and
`convert_detailed()`:

```python
>>> from greek_conversion import convert_many

>>> convert_many(["μῆνιν ἄειδε", "Πηληϊάδεω Ἀχιλῆος"], "greek", "beta-code",
...              preset="tlg-core")
['MH=NIN A)/EIDE', '*PHLHI+A/DEW *)AXILH=OS']

```

### `convert_detailed()`

`convert_detailed()` converts as `convert()` does, and says what the output
cannot carry back, and where:

```python
>>> from greek_conversion import convert_detailed

>>> # ISO 843 Type 2, which Greek passports use, writes eta like iota
>>> city = convert_detailed("Θεσσαλονίκη", "greek", "transliteration",
...                         preset="iso-843-type-2")
>>> city.output, city.lossy
('Thessaloníki', True)
>>> city.losses[0].message, city.losses[0].offset
('The target representation does not retain eta.', 10)

>>> # SBL's general style drops smooth breathings, accents, iota subscripts
>>> verse = convert_detailed("ἐν ἀρχῇ ἦν", "greek", "transliteration",
...                          preset="sbl-general")
>>> verse.output, len(verse.losses)
('en archē ēn', 6)

```

### `reencode()`

`reencode()` keeps the format and changes the spelling: it normalizes a
text, or writes it after other conventions:

```python
>>> from greek_conversion import reencode

>>> # The lunate sigma of an edition, made standard
>>> reencode("ϲοφίαϲ", "greek", greek={"sigma": "standard"})
'σοφίας'

>>> # Greek numerals, in figures
>>> reencode("ἔτει ͵αωκαʹ", "greek", text={"numerals": "decimal"})
'ἔτει 1821'

>>> # The Beta Code of Perseus, in the capitals of the TLG
>>> reencode("a)/ndra moi e)/nnepe, mou=sa", "beta-code", preset="tlg-core")
'A)/NDRA MOI E)/NNEPE, MOU=SA'

```

## How the package works

`greek-conversion` is first a TypeScript library, published on npm and JSR.
This package runs that library, the reference implementation, in a
JavaScript engine embedded in Python. It needs neither Node.js nor any other
installation:

- **The same results.** Outputs, losses, and positions are those of the
  library of the same version. On every change, they are compared with the
  library's own over more than a hundred thousand conversions.
- **The same versions.** The package's version is the library's (`1.0.0rc15`
  for `1.0.0-rc.15`), followed by `.postN` for a fix of the Python package
  alone.
- **The same documentation.** The
  [Python documentation](https://greek-conversion.humanites.fr/python/) is
  the library's, with its examples in Python; the rest of the
  [documentation](https://greek-conversion.humanites.fr/) describes the
  library in TypeScript, and its presets, options, losses, and guarantees
  are the package's too. In Python:
  - functions and option keys are written in snake_case (`convert_detailed`,
    `long_vowels`, `beta_code`, `out_of_scope_behavior`), as are the keys of
    the options and metadata returned, and the option names in errors;
    option values do not change (`"grave-circumflex"`, `"iso-843-type-2"`);
  - positions (`offset`, `length`, `input_start`…) count characters as
    Python does, so that `text[loss.offset : loss.offset + loss.length]` is
    the token;
  - results are frozen dataclasses; `OptionError` and `CharacterScopeError`
    are `ValueError`s, with their details.
- **Prepared options and converters** (`prepare_options()`,
  `create_converter()`) can be pickled and used in other processes, for
  instance with `multiprocessing`.

### Engines

The package runs the library in one of two engines:

| Engine    | Installed with                           | Startup | Cost per call | Long text      |
| --------- | ---------------------------------------- | ------- | ------------- | -------------- |
| QuickJS   | the package: `quickjs-ng`, a 2 MB wheel  | ~25 ms  | ~40 µs        | 10 to 20× Node |
| V8        | `pip install "greek-conversion[v8]"`: `mini-racer`, 22 MB | ~80 ms | 0.1 to 0.5 ms | ~1.7× Node |

[quickjs-ng](https://github.com/quickjs-ng/quickjs) is the maintained fork of
QuickJS: quick to start, and quick for many small calls. V8 is the engine of
Chrome and Node: quicker on long texts, slower to call. When `mini-racer` is
installed, the package uses V8; choose otherwise with
`set_engine("quickjs")` or the environment variable
`GREEK_CONVERSION_ENGINE`, for instance for many short strings converted
one by one. To convert a corpus, `convert_many()` pays the cost of a call
once for the whole list, as do `reencode_many()` and
`convert_detailed_many()`: with V8, they convert within twice the time of
Node, and 20 to 100 times faster than one call per string.

## Documentation

- [Getting started](https://greek-conversion.humanites.fr/python/),
  then the pages on
  [Ancient](https://greek-conversion.humanites.fr/python/guide/ancient-greek/),
  [Byzantine and Medieval](https://greek-conversion.humanites.fr/python/guide/byzantine-greek/),
  and [Modern Greek](https://greek-conversion.humanites.fr/python/guide/modern-greek/).
- [Choosing a preset](https://greek-conversion.humanites.fr/python/guide/presets/):
  what each convention writes, and what it loses.
- The [API](https://greek-conversion.humanites.fr/python/reference/api/) and the
  [options](https://greek-conversion.humanites.fr/python/reference/options/).
- [Guarantees and limits](https://greek-conversion.humanites.fr/reference/guarantees/)
  and [information loss](https://greek-conversion.humanites.fr/reference/information-loss/), in the
  library's reference.
- [Contributing](https://github.com/defense-humanites/greek-conversion/blob/main/CONTRIBUTING.md):
  the package lives in the `python/` folder of the repository, which
  describes how to build and test it.

Every page of the site is also in Markdown, which
[`llms.txt`](https://greek-conversion.humanites.fr/llms.txt) lists.

## Citing and license

If you use `greek-conversion` in research or in a published resource, please
cite it; GitHub's “Cite this repository” button uses the metadata in
[`CITATION.cff`](https://github.com/defense-humanites/greek-conversion/blob/main/CITATION.cff).

Copyright (C) 2021–2026 Antoine Boquet. Released under the
[MIT License](https://github.com/defense-humanites/greek-conversion/blob/main/LICENSE).
The greek-conversion logos are not covered by this license: all rights are
reserved, as recorded in
[`LicenseRef-greek-conversion-marks`](https://github.com/defense-humanites/greek-conversion/blob/main/LICENSES/LicenseRef-greek-conversion-marks.txt).
