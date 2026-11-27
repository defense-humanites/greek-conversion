---
title: "How the package works"
description: "The Python package runs the TypeScript library in an embedded engine: the same results and versions, Python's names and positions, the engines and their speed, processes, threads, and types."
---

`greek-conversion` is first a TypeScript library, published on npm and JSR.
The Python package runs that library, the reference implementation, in a
JavaScript engine embedded in Python. It needs neither Node.js nor any other
installation, and its conversions are the library's: this page says what
follows from that, and what is proper to Python.

## The same library

- **The same results.** Outputs, losses, and positions are those of the
  library of the same version. On every change to either, they are compared
  over more than a hundred thousand conversions, under every preset and
  more than twenty sets of options.
- **The same versions.** The package's version is the library's, in Python's
  spelling (`1.0.0rc15` for `1.0.0-rc.15`), followed by `.postN` for a fix of
  the Python package alone, published between two releases of the library.
  The [stability policy](/reference/stability/#the-python-package) applies
  to it as to the library.
- **The same documentation.** These pages give the guide and the reference
  in Python. The pages of the TypeScript documentation that they link to,
  such as [How it works](/guide/how-it-works/), describe the library, and
  hold for the package as they are written, in the spelling of the next
  section.

## Writing it in Python

The library's names are written as Python writes names: functions, option
keys, and the fields of results in snake_case (`convert_detailed()`,
`long_vowels`, `beta_code`, `glyph_variant`). Option values do not change
(`"grave-circumflex"`, `"iso-843-type-2"`). Options and metadata are
dictionaries, both those you give and those you get back, which can be given
back as options; results are frozen dataclasses:

```python
from greek_conversion import (
    convert,
    convert_detailed,
    resolve_conversion_options,
)

options = resolve_conversion_options(preset="sbl-general")
options["transliteration"]["long_vowels"]  # → macron
convert("ψυχή", "greek", "transliteration", options)  # → psychē

result = convert_detailed("ϐίος", "greek", "beta-code")
result.output  # → bi/os
result.losses[0].glyph_variant  # → beta-symbol
```

A key written in camelCase, as the TypeScript library spells it, is
refused, with its snake_case spelling, so that an option has one spelling;
the option names of every error are written in snake_case too.

**Positions count characters as Python does.** The offsets of losses and
diagnostics and the bounds of spans index the strings you gave and got, so
that `text[loss.offset : loss.offset + loss.length]` is the token. JavaScript
counts a character outside the Basic Multilingual Plane, such as an emoji or
the acrophonic numerals, as two; the package converts its positions:

```python
from greek_conversion import convert_detailed

text = "𐅀 ϐίος"
loss = convert_detailed(text, "greek", "beta-code").losses[0]
text[loss.offset : loss.offset + loss.length]  # → ϐ
```

**Errors are Python's.** An unknown preset, option key, or value raises an
`OptionError`, and characters a converter rejects a `CharacterScopeError`;
both are `ValueError`s, and keep their details (`path`, `received`,
`accepted`, `replacement`; `diagnostics`). An unknown format raises a plain
`ValueError`, and a value of the wrong type a `TypeError`. The
[API reference](/python/reference/api/) gives every function and class.

## Engines and speed

The package runs the library in one of two engines:

| Engine  | Installed with                                            | Start  | One call      | A long text    |
| ------- | --------------------------------------------------------- | ------ | ------------- | -------------- |
| QuickJS | the package: `quickjs-ng`, a 2 MB wheel                   | ~25 ms | ~40 µs        | 10 to 20× Node |
| V8      | `pip install "greek-conversion[v8]"`: `mini-racer`, 22 MB | ~80 ms | 0.1 to 0.5 ms | ~1.7× Node     |

[quickjs-ng](https://github.com/quickjs-ng/quickjs), the maintained fork of
QuickJS, is quick to start and quick for many small calls. V8, the engine of
Chrome and Node, is quicker on long texts, and slower to call. When
`mini-racer` is installed, the package uses V8; `set_engine()` or the
environment variable `GREEK_CONVERSION_ENGINE` chooses otherwise:

```python
from greek_conversion import engine_name, set_engine

set_engine("quickjs")
engine_name()  # → quickjs
set_engine(None)
```

**Convert many strings in one call.** Each call into the engine has a fixed
cost, which `convert_many()`, `reencode_many()`, and
`convert_detailed_many()` pay once for a whole list. With V8, they convert
the words of a text within twice the time of Node, and 20 to 100 times
faster than one call a word; with QuickJS, whose cost lies more in the
conversion itself, `reencode_many()` and `convert_many()` gain about a third.

**Prepare options used in a loop.** The defaults and the presets are already
resolved once; options of your own can be, with `prepare_options()`, and
then given in their place:

```python
from greek_conversion import convert_many, prepare_options

scheme = prepare_options(transliteration={"chi": "kh", "upsilon": "u"})
convert_many(["ψυχή", "χάος"], "greek", "transliteration", scheme)
# → ['psukhḗ', 'kháos']
```

## Processes and threads

Prepared options and converters keep, on the Python side, what they were
made from, and are made in the engine of each process when first used
there. They can be pickled and copied, and so given to the processes of
`multiprocessing` or `concurrent.futures`, with every start method, `fork`
included. Calls from several threads are safe, and run one at a time: the
engine runs one call at once, so that threads bring no speed, where
processes do.

## Types

The package is typed. Options are `TypedDict`s and their values `Literal`s,
generated from the library's own list of options and values, so that an
editor completes them and a type checker, such as mypy or Pyright, reports a
key or a value that does not exist before the code runs: `Preset`, `Format`,
`ConversionOptions`, `TransliterationOptions`, and the other groups can be
imported to annotate your own code.
