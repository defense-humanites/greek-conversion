---
title: "Converters, options, and errors"
description: "Bind a configuration in a converter, add or restrict characters, and handle the errors of invalid options."
---

The conversion functions take their options on every call and check them
strictly, unless they are prepared once. A converter created with
`createConverter()` binds a preset once,
can extend or restrict the characters it knows, and can enforce the
repertoire of that preset; the other options are still given on each call.

## Options are checked

A misspelled option never falls back silently to a default. An unknown key,
value, or preset throws an `OptionError`, a `RangeError` that names the option
(`path`), what it received, what it accepts, and the current spelling of a key
or value an earlier release knew; its message also names the option a key was
likely meant for, such as `transliteration.longVowels` for
`transliteration.long_vowels`. An unknown format throws a plain `RangeError`,
and an option group of the wrong type a `TypeError`. This matters most when
options come from a configuration file or a form:

```ts
import { convert, OptionError } from "@humanities/greek-conversion";

const options = JSON.parse('{ "transliteration": { "eta": "ē" } }');
try {
  convert("λόγος", "greek", "transliteration", options);
} catch (error) {
  if (!(error instanceof OptionError)) throw error;
  error.message;
  // → Invalid value for transliteration.eta: "ē"; expected one of "e", "i".
  error.path; // → transliteration.eta
  error.accepted; // → ["e","i"]
}
```

`FORMATS` and `CONVERSION_OPTION_VALUES` list everything that is accepted, which
is convenient for building a user interface:

```ts
import {
  CONVERSION_OPTION_VALUES,
  FORMATS,
} from "@humanities/greek-conversion";

FORMATS; // → ["greek","beta-code","transliteration"]
CONVERSION_OPTION_VALUES.transliteration.eta; // → ["e","i"]
```

## Prepare options once

`prepareOptions()` checks and resolves options once, with the same errors,
and returns prepared options, which every conversion function takes in
their place:

```ts
import { convert, prepareOptions } from "@humanities/greek-conversion";

const options = prepareOptions({ transliteration: { chi: "kh" } });
const words = ["χάος", "ψυχή"];
words.map((word) => convert(word, "greek", "transliteration", options));
// → ["kháos","psykhḗ"]
```

The defaults and each preset named are resolved once anyway. Other options
are checked and resolved at each call, which a word takes about twice as
long to convert: prepare them where many short texts are converted, or
where options come from a configuration file or a form, to check them once.
Prepared options cannot be changed, nor spread into other options, which
they would leave empty: spread, given as `source`, or given to a converter,
which binds its own preset, they throw a `TypeError` that says what to
write instead.

## Add or exclude characters

`createConverter()` takes a preset, which it binds, and can teach the
converter new spellings or characters, or exclude some:

```ts
import { createConverter } from "@humanities/greek-conversion";

const converter = createConverter({
  aliases: [
    { letter: "theta", format: "transliteration", spellings: ["þ"] },
  ],
  exclude: ["stigma", "koppa", "sampi"],
});

converter.convert("þeos", "transliteration", "greek"); // → θεος
```

An alias inherits every rule of its built-in letter. A new character definition
maps directly between formats and keeps its case, but does not join the
contextual rules for diphthongs, breathings, or numerals. Excluded characters
are kept as the source writes them in their word. Of the options, only the
transformations of the whole text (`text`) still apply to them:

```ts
import { createConverter } from "@humanities/greek-conversion";

const noStigma = createConverter({ exclude: ["stigma"] });

noStigma.convert("λόγος ϛ", "greek", "transliteration", {
  text: { letterCase: "uppercase" },
});
// → LÓGOS Ϛ
```

## Restrict to a repertoire

A converter bound to a preset also enforces the preset's character scope.
Characters outside it are preserved and reported; with
`outOfScopeBehavior: "reject"`, the conversion throws instead:

```ts
import { createConverter } from "@humanities/greek-conversion";

const perseus = createConverter({ preset: "perseus" });
const result = perseus.convertDetailed("ἄνθρωπος ϝ", "greek", "beta-code");
result.output; // → a)/nqrwpos ϝ
result.diagnostics[0].code; // → out-of-scope-character
result.diagnostics[0].offset; // → 9

const iso = createConverter({
  preset: "iso-843-type-1",
  outOfScopeBehavior: "reject",
});
iso.convert("ϟ", "greek", "transliteration");
// throws CharacterScopeError: Conversion rejected: 1 unsupported character.
```

The error's `diagnostics` list each rejected occurrence; here, koppa, for which
ISO 843 defines no transliteration. See
[character extensions and repertoires](/reference/character-extensions/)
and the
[preset repertoire audit](/reference/preset-repertoire-audit/).
