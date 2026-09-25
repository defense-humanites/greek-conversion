# Character extensions and repertoires

The built-in conversion functions use a closed, standards-oriented Greek
alphabet. `createConverter()` creates an isolated immutable registry when an
application needs additional input spellings, direct mappings for extra
characters, or a smaller effective repertoire.

## Aliases of built-in letters

An alias supplies another source spelling for an existing semantic letter:

```ts
const converter = createConverter({
  aliases: [{
    letter: "theta",
    format: "transliteration",
    spellings: ["þ"],
  }],
});
```

The alias is replaced by the canonical source-format spelling before parsing.
It therefore receives the ordinary case, diacritic, context, validation, and
information-loss behavior of the selected built-in letter.

Aliases are matched longest first. Construction rejects empty and ambiguous
spellings. A spelling already understood by the parser requires
`override: true`, making the change of meaning explicit.

## Opaque custom characters

A custom character declares a stable identifier and one lowercase plus an
optional uppercase spelling in every format:

```ts
const converter = createConverter({
  characters: [{
    id: "san",
    forms: {
      greek: { lowercase: "ϻ", uppercase: "Ϻ" },
      "beta-code": { lowercase: "#9", uppercase: "*#9" },
      transliteration: { lowercase: "š", uppercase: "Š" },
    },
    override: true,
  }],
});
```

Custom characters are opaque boundaries inside the Greek engine. The
converter guarantees direct mapping, declared case, registry immutability, and
stable round trips when the supplied forms are unambiguous. It does not infer
that a custom character:

- is a vowel or consonant;
- accepts Greek diacritics;
- participates in a diphthong, contraction, aspiration, or digraph;
- has an alphabetic-numeral value;
- belongs to any bundled preset.

The lowercase or uppercase form is selected from the semantic case recognized
in the source. General output options such as `letterCase` and `betaCodeCase`
do not rewrite opaque forms; declare the exact forms required by the custom
profile. Beta Code input remains ASCII-case-insensitive, and `*` remains the
only semantic uppercase marker.

Use an alias when a new spelling is semantically a known Greek letter. Use a
custom character only when it represents a genuinely distinct inventory item.

The implementation reserves private-use Unicode scalars internally while a
conversion is running. Supplying one of those scalars as input is rejected
instead of risking silent corruption.

## Restricting the repertoire

`repertoire` is an exact allow-list. Omitting it enables all built-in and
registered custom characters. `exclude` is applied afterwards and always wins:

```ts
const converter = createConverter({
  characters: [customSan],
  repertoire: ["alpha", "beta", "san"],
  exclude: ["san"],
});
```

The policy is semantic rather than graphical. Excluding `stigma` applies to
its Greek, Beta Code, and transliterated spellings. An out-of-scope character
is preserved as literal text using the source representation's canonical
spelling; a matched custom form retains its registered spelling. The target
may consequently contain a deliberate source-format fragment.

`convertDetailed()` keeps scope diagnostics separate from conversion losses:

```ts
const result = converter.convertDetailed(
  "αϛβ",
  "greek",
  "transliteration",
);

result.output; // aϛb
result.lossy; // false
result.diagnostics[0].code; // out-of-scope-character
```

Literal preservation is not information loss, so it does not set `lossy`.
For strict processing, select rejection when creating the converter:

```ts
import { CharacterScopeError, createConverter } from "@humanities/greek-conversion";

const strict = createConverter({
  preset: "perseus",
  outOfScopeBehavior: "reject",
});

try {
  strict.convert("αϝ", "greek", "beta-code");
} catch (error) {
  if (error instanceof CharacterScopeError) {
    error.diagnostics; // [{ code: "out-of-scope-character", index: 1, ... }]
  } else {
    throw error;
  }
}
```

Both `convert()` and `convertDetailed()` reject the entire input when a
recognized character falls outside the effective repertoire or has a known
undefined or unresolved mapping in the target preset. The error contains
every such occurrence, with the same source token indices as
`convertDetailed().diagnostics` in preservation mode. Unknown literals remain
literal: strict mode checks recognized characters, not arbitrary text.

Rejection checks a recognized character against the converter's effective
repertoire and the known missing mappings for the bound preset and target.
It does not guarantee a reversible or fully standards-conformant conversion.
For example, a strict BnF converter accepts `αʹ` and emits `á`, whose numeral
mark cannot be recovered reliably. This can have `lossy: true` without scope
diagnostics. Check `convertDetailed().losses` independently
when these distinctions matter. See the [preset behavior audit](preset-behavior-audit.md)
for other rules that require contextual information.

## Preset boundary

Bind a preset to a converter to apply both its conversion options and every
scope boundary established by the audit:

```ts
const perseus = createConverter({ preset: "perseus" });

perseus.convert("Ἄνθρωπος ϝ", "greek", "beta-code");
// *)/anqrwpos ϝ
```

Here digamma is recognized but preserved because it is outside the Perseus
subset. `convertDetailed()` reports it as `out-of-scope-character`. Set
`outOfScopeBehavior: "reject"` on the converter to reject it instead. Per-call
options may refine the bound preset, but selecting another preset is rejected
because its options would no longer agree with the converter's fixed scope.

ALA-LC boundaries are context-sensitive. For example, a modern ALA-LC-bound
converter preserves unmarked stigma but accepts `ϛʹ` as the alphabetic numeral
6. ISO 843 includes stigma, koppa, and sampi in its Greek source inventory but
does not define their Type 1 transliterations. A bound ISO converter reports
`undefined-preset-mapping` when transliterating them; for archaic koppa it
reports `unresolved-preset-mapping` because the single koppa named in the
standard cannot be assigned unambiguously to the engine's two forms. In
preservation mode they remain Greek text in the output; strict mode rejects
them. Explicit decimal conversion of marked numerals still works. Other
conversion targets and ordinary `convert(..., { preset: "iso-843-type-1" })`
retain the engine's behavior.

Adding an alias or custom character never expands the documented scope of a
preset. A custom character registered alongside a bound preset is allowed as
an explicit application extension, but no preset guarantees apply to its
mapping. `repertoire` and `exclude` can restrict built-in and custom characters
further; they never override a preset exclusion.
