---
title: "Options are checked, errors are explicit"
description: "How options are validated, and the errors they throw."
---
A misspelled option never falls back silently to a default. An unknown key,
value, or preset throws an `OptionError`, a `RangeError` that names the option
(`path`), what it received, what it accepts, and the current spelling of a key
or value an earlier release knew; an unknown format throws a plain `RangeError`,
and an option group of the wrong type a `TypeError`. This matters most when
options come from a configuration file or a form:

```ts
import { convert, OptionError } from "@humanities/greek-conversion";

const options = JSON.parse('{ "transliteration": { "eta": "ē" } }');
try {
  convert("λόγος", "greek", "transliteration", options);
} catch (error) {
  if (error instanceof OptionError) {
    error.message; // → Invalid value for transliteration.eta: "ē"; expected one of "e", "i".
    error.path; // → transliteration.eta
    error.accepted; // → ["e","i"]
  }
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
