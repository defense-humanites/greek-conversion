Most programs need only the first of the package's two main entry points:

- `@humanities/greek-conversion`: the conversion functions, converters,
  options, presets, and their types;
- `@humanities/greek-conversion/document`: the canonical document, to parse
  once, inspect or edit it, validate it, and encode it in any format.

Five more serve applications whose bundle size matters, as the guide on
[smaller bundles](/guide/smaller-bundles/) explains: they bring into a
bundle only the formats and presets it uses.

- `@humanities/greek-conversion/core`: the conversion functions, which take
  readers and writers instead of format names, and prepared options;
- `@humanities/greek-conversion/greek`, `/beta-code`, `/transliteration`:
  the reader and the writer of each format;
- `@humanities/greek-conversion/presets`: the presets, as prepared options.

The [guarantees and limits](/reference/guarantees/) and the
[stability policy](/reference/stability/) say which behaviors the version
number protects.
