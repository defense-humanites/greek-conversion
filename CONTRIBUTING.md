# Contributing

Bug reports and suggestions are welcome in the
[issue tracker](https://github.com/defense-humanites/greek-conversion/issues).
A conversion that looks wrong is easiest to fix with the input, the formats,
the options or preset, the output you got, and the output you expected; the
playground's Share button gives a link with all of them.

## The library

The library is developed with [Node.js](https://nodejs.org/) 24 or later,
which runs its TypeScript sources directly:

```sh
npm ci               # installs the development tools
npm run check        # formatting, lint, types, API docs, examples and links
npm test             # unit, conformance, and property tests
npm run bench        # throughput baseline
```

`npm run check` type-checks and runs every TypeScript example of the README
and of the guide pages of the documentation site, and compares its output with
the `// →` comment. It also fails when a change to the options leaves
`web/playground/option_relevance.ts` out of date (`npm run site:options`
updates it), or `docs/presets.md`, generated from the presets
(`npm run docs:presets`).

The behavior the version number protects is the one documented in `docs/`
and in the API documentation; the [stability policy](docs/stability.md) says
how each kind of change is released. [RELEASING.md](RELEASING.md) describes a
release.

## The documentation site and the playground

Both are under `web/` and are published together on GitHub Pages: the
documentation site at the root, the playground under `/playground/`.

| Folder           | What it holds                                                                   |
| ---------------- | ------------------------------------------------------------------------------- |
| `docs/`          | The reference, in English: plain Markdown, published in the packages too        |
| `web/docs/`      | The documentation site (Astro and Starlight), with its own `package.json`       |
| `web/playground` | The playground, built with esbuild from the library's sources                   |
| `web/shared/`    | The design tokens (`tokens.css`) and the fonts that both use                    |

The site's guide pages are in `web/docs/src/content/docs/guide/`. Its
reference pages are generated from `docs/` at each build, and its API pages
from the TSDoc of the two entry points: edit `docs/` and the code, not the
generated pages. Pages link to one another by their path from the site's root
(`/reference/presets/`).

```sh
npm ci --prefix web/docs        # installs the site's tools
npm run dev --prefix web/docs   # serves the site with live reload
npm run build --prefix web/docs # builds it into web/docs/dist/
npm run site:build              # builds the playground into _site/playground/
```

A translation of the guide is a folder of the same pages under
`web/docs/src/content/docs/` (`fr/`, for example) and one more entry in the
`locales` of `web/docs/astro.config.mjs`. Pages that are not translated yet
are shown in English, with a notice. The English text of `docs/` and of the
API documentation prevails over the guide and its translations.

The fonts are subsets of Bricolage Grotesque, Literata and Noto Serif, built
with Python and [fontTools](https://github.com/fonttools/fonttools)
(`web/shared/fonts/README.md`):

```sh
pip install "fonttools[woff]==4.67.0"
python3 scripts/build_fonts.py # downloads the sources, writes web/shared/fonts/
```
