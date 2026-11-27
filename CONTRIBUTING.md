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

`npm run check` type-checks and runs every TypeScript example of the README,
of the reference (`docs/`), of the guide pages of the documentation site, and
of the TSDoc of `src/`, and compares its output with the `// →` comment, code
point for code point.
Write an example as a module, with its imports; a ```ts block that is not
one fails the check. A conversion cited in prose (`ἀπ’ οὗ` → `ἀφ’ οὗ`) is
checked too: it must be what the library returns under the defaults, a
preset the page names, or the options named around it
(`scripts/check_cited_conversions.ts`, whose `--list` says which). It also fails when a change to
the options leaves `web/playground/option_relevance.ts` out of date
(`npm run site:options` updates it), or `docs/presets.md`, generated from the
presets (`npm run docs:presets`), or `src/prepared_presets.ts`, the presets as
prepared options (`npm run presets:generate`), or one of the generated parts of the
documentation: the option reference `docs/options.md`
(`npm run docs:options`), and, in the guide's page on presets, the tables of
how each preset writes Greek (`npm run docs:comparison`) and of what it loses
(`npm run docs:losses`).

The behavior the version number protects is the one documented in `docs/`
and in the API documentation; the [stability policy](docs/stability.md) says
how each kind of change is released. [RELEASING.md](RELEASING.md) describes a
release.

### Changes that keep the output

`npm test` compares the library with the previous release, published on npm
and installed as the development dependency `greek-conversion-previous`
(`tests/differential_test.ts`), which [RELEASING.md](RELEASING.md) moves to
each new release: a long text, the difficult forms of the
property tests, the equivalences, the playground's examples, and strings
drawn at random from the signs of each format, converted into every format,
plainly, with `core`, and in detail, and re-encoded, under 29 sets of
options (the defaults, every preset, and others), must give the same
output, losses, and positions. A
change of output that is meant goes in `MEANT` (`tests/meant.ts`),
with its reason, until the reference moves to the release that makes it:
`node scripts/differential_changes.ts` lists the inputs whose conversions
changed, with an example of each.
`node scripts/differential_corpus.ts corpus.txt` makes the same comparison
over a local corpus, one input per line, such as one whose license forbids
publishing it here.

The speed of a change is measured with `npm run bench:ab`, which runs
versions in turn in one process, so that the noise of the machine falls on
them alike: the working tree (`.`), a directory, or a git ref, checked out in
a temporary worktree. `--aa` measures a copy of the first version as a
control:

```sh
npm run bench:ab -- --aa v1.0.0-rc.14 .
npm run bench:ab -- --mode word --from beta-code --to greek v1.0.0-rc.14 .
```

The modes are `long` (Thucydides 1.1–10), `short` (its first clause),
`word`, `detailed` (`convertDetailed()` of the long text) and `parse`. The
noise of the measure, which `--aa` shows, is about 2 % on the long text and
up to 5 % on a word or a clause: repeat a measure before trusting a smaller
difference.

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
from the TSDoc of the entry points: edit `docs/` and the code, not the
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

## The Python package

The Python package, `greek-conversion` on PyPI, is in `python/`. It runs the
library's bundle in an embedded JavaScript engine, QuickJS (`quickjs-ng`) or
V8 (`mini-racer`); `python/js/entry.ts` is the bridge between them. The
bundle, the package's version, which is the library's, and its copy of the
license are built from the working tree, not committed:

```sh
npm ci
node python/scripts/build_bundle.mjs      # the bundle, _version.py, LICENSE
python -m pip install -e "python[v8]"
python -m pip install --group python/pyproject.toml:test
ruff check python
pytest python                             # on both engines
```

Its outputs, losses, positions, and errors must be the library's: the
comparison runs every case of `tests/differential.ts`, inputs with
characters outside the BMP, `reencode()`, prepared options, Greek passages,
and converters, through the package.

```sh
node python/scripts/differential_dump.ts > /tmp/expected.jsonl
python python/scripts/differential.py /tmp/expected.jsonl --engine quickjs
python python/scripts/differential.py /tmp/expected.jsonl --engine v8
```

The Python workflow (`.github/workflows/python.yml`) builds the wheel,
installs it, and runs both on every change. A change to the library's
exports, options, or errors may need one to `python/js/entry.ts`, whose list
of option keys the type check keeps complete.
