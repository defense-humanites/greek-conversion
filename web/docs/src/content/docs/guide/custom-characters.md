---
title: "Custom characters and strict repertoires"
description: "Add spellings and characters, or restrict a converter to a repertoire."
---
A converter created with `createConverter()` binds a preset and can extend or
restrict the character inventory:

```ts
import { createConverter } from "@humanities/greek-conversion";

const converter = createConverter({
  aliases: [{ letter: "theta", format: "transliteration", spellings: ["þ"] }],
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
