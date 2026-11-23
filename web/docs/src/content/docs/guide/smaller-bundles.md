---
title: "Smaller bundles"
description: "Bundle only the formats and presets a web application uses, with the core entry point, readers and writers, and prepared options."
---

The functions of the main entry point take the names of formats and options
as values, which they read when they are called. A bundler cannot tell which
of them an application will use: a bundle that imports `convert()` keeps
every format, every preset, and the validation of options, about 70 kB
minified (23 kB with gzip). On a server, this costs nothing that matters,
and the main entry point is the one to use. The functions of `core`, which
check no options when they are called, convert a single word about 5 %
faster with the defaults or a preset, and up to 30 % faster with other
options, which the main entry point checks at each call; the difference
fades on longer texts.

For a web page, the `core` entry point converts with the same functions,
given readers, writers, and options that the application imports. A bundle
then keeps only those: a page that writes Greek in transliteration with one
preset weighs 40 kB (13 kB with gzip).

## Readers and writers

Each format has an entry point that exports its reader, its writer, and both
as one value. The functions of `core` take them where the main entry point
takes the names of formats, in the same order:

```ts
import { convert } from "@humanities/greek-conversion/core";
import { greekReader } from "@humanities/greek-conversion/greek";
import { iso843Type2 } from "@humanities/greek-conversion/presets";
import {
  transliterationWriter,
} from "@humanities/greek-conversion/transliteration";

convert("Θεσσαλονίκη", greekReader, transliterationWriter, iso843Type2);
// → Thessaloníki
```

| Entry point                                    | Exports                                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `@humanities/greek-conversion/core`            | `convert`, `convertDetailed`, `reencode`, `prepareOptions`, `OptionError`                                  |
| `@humanities/greek-conversion/greek`           | `greekReader`, `greekWriter`, `greekFormat`                                                                |
| `@humanities/greek-conversion/beta-code`       | `betaCodeReader`, `betaCodeWriter`, `betaCodeFormat`                                                       |
| `@humanities/greek-conversion/transliteration` | `transliterationReader`, `transliterationWriter`, `transliterationFormat`                                  |
| `@humanities/greek-conversion/presets`         | `alaLcAncient`, `alaLcModern`, `bnfCore`, `iso843Type1`, `iso843Type2`, `perseus`, `sblGeneral`, `tlgCore` |

`convert()` takes a reader and a writer. `reencode()` and `convertDetailed()`
take a format's reader and writer as one value, such as `greekFormat`:
`reencode()` reads what it writes, and `convertDetailed()` reads its output
back and compares letter forms as the source format writes them.

```ts
import { convertDetailed } from "@humanities/greek-conversion/core";
import { greekFormat } from "@humanities/greek-conversion/greek";
import {
  transliterationFormat,
} from "@humanities/greek-conversion/transliteration";

const result = convertDetailed(
  "ϐίϐλος",
  greekFormat,
  transliterationFormat,
);
result.output; // → bíblos
result.lossy; // → true
```

The results are those of the main entry point, letter for letter, and the
test suite compares them.

## Options

Without options, the defaults apply. A preset is imported from `presets`, as
options ready for use. Any other options are prepared once with
`prepareOptions()`, which takes what the main entry point takes, a preset by
name and `source` included, and checks it as strictly:

```ts
import { convert, prepareOptions } from "@humanities/greek-conversion/core";
import { greekReader } from "@humanities/greek-conversion/greek";
import {
  transliterationWriter,
} from "@humanities/greek-conversion/transliteration";

const options = prepareOptions({
  preset: "sbl-general",
  transliteration: { chi: "kh" },
});
convert("χάος", greekReader, transliterationWriter, options); // → khaos
```

`prepareOptions()` brings the validation of options and the table of the
presets into the bundle, about 8.5 kB (2.6 kB with gzip): an application that
uses one preset as it is should import it instead. Prepared options cannot be
changed; prepare them once, outside a loop, and use them for every call. The
functions of `core` take no other options: an object of options, which they
would have to validate, throws a `TypeError`.

A preset is changed by its name, as above. Spreading prepared options copies
none of them: `{ ...sblGeneral, transliteration: { chi: "kh" } }` holds the
change alone, and would convert with the defaults. `prepareOptions()` and the
main entry point refuse it with a `TypeError` that says what to write instead:

```ts
import { prepareOptions } from "@humanities/greek-conversion/core";
import { sblGeneral } from "@humanities/greek-conversion/presets";

try {
  prepareOptions({ ...sblGeneral, transliteration: { chi: "kh" } });
} catch (error) {
  (error as TypeError).message.endsWith('as in { preset: "sbl-general" }.');
  // → true
}
```

## What a bundle weighs

Bundles of the conversions below, made with esbuild for this release,
minified, then with gzip. The percentage compares the size with gzip to that
of the same conversion imported from the main entry point: `convert()`
(74.2 kB, 24.2 kB with gzip), or `convertDetailed()` (82.7 kB, 26.9 kB).

| Conversions                                   | With a preset or the defaults | With `prepareOptions()`       |
| --------------------------------------------- | ----------------------------- | ----------------------------- |
| Greek to Beta Code                            | 35.0 kB, 12.2 kB gzip (−49 %) | 43.5 kB, 14.7 kB gzip (−39 %) |
| Beta Code to Greek                            | 37.6 kB, 12.9 kB gzip (−47 %) | 46.1 kB, 15.4 kB gzip (−36 %) |
| Greek to transliteration                      | 42.8 kB, 14.1 kB gzip (−42 %) | 51.2 kB, 16.6 kB gzip (−31 %) |
| Greek and transliteration both ways           | 59.6 kB, 19.3 kB gzip (−20 %) | 68.1 kB, 21.9 kB gzip (−9 %)  |
| Every format both ways                        | 66.6 kB, 21.8 kB gzip (−10 %) | 75.1 kB, 24.4 kB gzip (+1 %)  |
| `convertDetailed()`, Greek to transliteration | 68.3 kB, 22.2 kB gzip (−17 %) | 76.8 kB, 24.9 kB gzip (−8 %)  |

The `core` entry point is worth it with a preset or the defaults, unless the
application reads and writes every format. With `prepareOptions()`, it is
worth it when transliteration is written or read, not both. An application
whose users choose the formats needs them all, and gains little.

An application whose users choose among the presets imports those it
offers. If it imports them all, which adds 1.5 kB (0.4 kB with gzip) to a
bundle with one preset, it still gains nearly as much. A record of its own
gives them the identifiers of the main entry point:

```ts
import { convert } from "@humanities/greek-conversion/core";
import { greekReader } from "@humanities/greek-conversion/greek";
import * as presets from "@humanities/greek-conversion/presets";
import {
  transliterationWriter,
} from "@humanities/greek-conversion/transliteration";

// The presets offered, by the identifiers of the main entry point.
const offered = {
  "iso-843-type-2": presets.iso843Type2,
  "sbl-general": presets.sblGeneral,
};
const chosen: keyof typeof offered = "sbl-general";
convert("Θεσσαλονίκη", greekReader, transliterationWriter, offered[chosen]);
// → Thessalonikē
```

A bundler keeps only the presets that the record reads. The application
writes the names that it shows: `listPresetMetadata()`, from the main entry
point, would bring the metadata of every preset, about 10 kB.

## Keeping the gain

- **One import is enough to lose it.** A single import of `convert()`,
  `createConverter()`, or the functions of the `document` entry point, in the
  application or in one of its dependencies, brings every format back into
  the bundle. `listPresetMetadata()` brings the metadata of the presets, about
  10 kB. A library that converts Greek in the browser should import from
  `core` too.
- **Import the half you use.** `greekFormat` brings the writer as well as the
  reader of Greek; `greekReader` alone is enough for `convert()`.
- **Check the bundle.** Bundlers keep only what is imported from packages
  that declare no side effects, as this one does: esbuild, Rollup, Vite, and
  webpack in production mode. esbuild's `--metafile` and its analyzer, or a
  bundle visualizer, show which modules a bundle holds.
- **Keep the values as they are.** Readers, writers, and prepared options
  are frozen, so that the reactive state of a framework, such as Vue's
  `reactive()` or `ref()`, keeps them without wrapping them in a `Proxy`. A
  copy or a wrapper of one is not one.
- **One copy of the library.** Readers, writers, and prepared options belong
  to the copy of the library that made them: a function of another copy,
  such as a second version installed beside it, does not take them. A worker
  imports its own, and does not receive them in a message.
- **Store the name of a preset.** A copy made by `structuredClone()`, by JSON,
  or by a message holds nothing of prepared options: the functions of `core`
  refuse it, but the main entry point would read it as no option, and
  convert with the defaults. Store or send the identifier of a preset
  (`"sbl-general"`), and import or prepare the options where they are used.

## Errors

In JavaScript, nothing else tells a format name from a reader: the functions
of `core` throw a `TypeError` that names what to import when they are given
the name of a format, an object of options, or a value of another copy. The
functions of the main entry point refuse readers and writers with a
`RangeError`, as an unknown format, and prepared options with a `TypeError`.

```ts
import { convert } from "@humanities/greek-conversion/core";
import { greekReader } from "@humanities/greek-conversion/greek";

try {
  // @ts-expect-error: a format name, which the main entry point takes.
  convert("λόγος", greekReader, "transliteration");
} catch (error) {
  (error as TypeError).message.startsWith("Expected a writer as `to`");
  // → true
}
```
