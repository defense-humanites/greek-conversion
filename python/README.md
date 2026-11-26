# greek-conversion for Python

Convert Ancient, Byzantine, and Modern Greek between Greek script, Beta Code,
and Latin script, with standards-based presets and information-loss
diagnostics, from Python.

This package runs the bundle of the JavaScript library
[`@humanities/greek-conversion`](https://greek-conversion.humanites.fr/) in
an embedded JavaScript engine. The outputs are those of the JavaScript
library by construction, and a differential test checks it.

**Status: experimental.** The outputs, losses, and positions are guaranteed
to be those of the JavaScript library of the same version, which the
[documentation](https://greek-conversion.humanites.fr/) describes. The
Python API follows that version and may still change; it is supported on a
best-effort basis.

```python
from greek_conversion import convert, convert_detailed, reencode

convert("ἄνδρα μοι ἔννεπε, μοῦσα", "greek", "beta-code")
# 'a)/ndra moi e)/nnepe, mou=sa'

convert("Νίκος Καζαντζάκης", "greek", "transliteration", preset="ala-lc-modern")
# 'Nikos Kazantzakēs'

convert("Ἀριστοτέλης", "greek", "transliteration",
        diacritics={"all": "remove"},
        transliteration={"long_vowels": "omit"},
        text={"letter_case": "lowercase"})
# 'aristoteles'

result = convert_detailed("Θεσσαλονίκη", "greek", "transliteration",
                          preset="iso-843-type-2")
result.output, result.lossy, result.losses[0].message
# ('Thessaloníki', True, 'The target representation does not retain eta.')

reencode("ϲοφίαϲ", "greek", greek={"sigma": "standard"})
# 'σοφίας'
```

## API

| JavaScript                       | Python                                   |
| -------------------------------- | ---------------------------------------- |
| `convert()`                      | `convert()`                              |
| `reencode()`                     | `reencode()`                             |
| `convertDetailed()`              | `convert_detailed()` → `ConversionResult` |
| `convertGreekPassages()`         | `convert_greek_passages()`               |
| `convertGreekPassagesDetailed()` | `convert_greek_passages_detailed()`      |
| —                                | `convert_many()`: many strings, one call |
| `prepareOptions()`               | `prepare_options()`                      |
| `createConverter()`              | `create_converter()` → `Converter`       |
| `resolveConversionOptions()`     | `resolve_conversion_options()`           |
| `getPresetOptions()`, `getPresetMetadata()`, `listPresetMetadata()` | same names, in snake_case |
| `FORMATS`, `DEFAULT_CONVERSION_OPTIONS`, `CONVERSION_OPTION_VALUES` | same names |
| `OptionError`, `CharacterScopeError` (`RangeError`) | same names (`ValueError`) |

- **Options** are those of the
  [reference](https://greek-conversion.humanites.fr/reference/options/),
  as a mapping, as keyword arguments, or both. Their keys can be written in
  camelCase (`longVowels`) or in snake_case (`long_vowels`). Their values do
  not change (`"iso-843-type-2"`).
- **Positions** (`offset`, `length`, spans) are in code points, as Python
  indexes strings, not in the UTF-16 code units of JavaScript:
  `text[loss.offset : loss.offset + loss.length]` is the token.
- **Results** are frozen dataclasses with snake_case fields
  (`glyph_variant`, `input_start`). The mappings of options and presets keep
  the library's keys.
- **Errors**: a JavaScript `RangeError` raises `ValueError`, and a
  `TypeError` raises `TypeError`. `OptionError` keeps `path`, `received`,
  `accepted`, and `replacement`. `CharacterScopeError` keeps `diagnostics`.

## Engines

| Engine    | Package      | Install                                  | Startup | Cost per call | Long text      |
| --------- | ------------ | ---------------------------------------- | ------- | ------------- | -------------- |
| `quickjs` | `quickjs-ng` | default: 2 MB abi3 wheels, CPython 3.10+ | ~25 ms  | ~40 µs        | 10 to 20× Node |
| `v8`      | `mini-racer` | `pip install greek-conversion[v8]`, 22 MB | ~80 ms  | 0.1 to 0.5 ms | ~1.7× Node     |

When `mini-racer` is installed, the package uses V8; otherwise QuickJS.
Choose the engine with `set_engine("quickjs")` or the environment variable
`GREEK_CONVERSION_ENGINE`.

[quickjs-ng](https://github.com/quickjs-ng/quickjs) is the maintained fork
of QuickJS; its Python binding provides the same `quickjs` module as the
archived `quickjs` package, which works too.

**To convert a corpus, use `convert_many()`.** Each call into the engine has
a fixed cost, which is high with V8. `convert_many()` pays it once per batch,
and V8 then converts within twice the time of Node:

```python
from greek_conversion import convert_many

lines = open("corpus.txt", encoding="utf-8").read().splitlines()
beta = convert_many(lines, "greek", "beta-code", preset="tlg-core")
```

## Development

The package is built from the working tree: the bundle, the version (that
of `package.json`), and the license are generated, not committed.

```sh
npm ci                                   # at the root of the repository
node python/scripts/build_bundle.mjs     # the bundle, _version.py, LICENSE
pip install -e "python[v8,test]"
pytest python                            # both engines

# Differential test against the library in Node
node python/scripts/differential_dump.ts > /tmp/expected.jsonl
python python/scripts/differential.py /tmp/expected.jsonl --engine v8
python python/scripts/differential.py /tmp/expected.jsonl --engine quickjs
```
