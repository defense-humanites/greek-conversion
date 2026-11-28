/**
 * The site holds two documentations of the library: in TypeScript, the
 * reference implementation, from the site's root, and in Python, for the
 * package that runs it, under `/python/`. The header's selector
 * (`SiteTitle.astro`) leads from a page to the same page in the other, when
 * it has one, and otherwise to its home.
 *
 * Most Python pages are written from TypeScript ones
 * (`scripts/sync_python.ts`): every page but those of what Python does not
 * have (the canonical document, bundles, and the speed of the library in
 * JavaScript), so that a reader of the Python documentation stays in it.
 * The others are written by hand, and some stand for a TypeScript page all
 * the same: the getting started, and the performance of the package.
 */

export type Language = "typescript" | "python";

export const LANGUAGES: readonly { id: Language; label: string }[] = [
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
];

/**
 * The Python pages written from TypeScript ones: the source, below
 * `src/content/docs/` or, for a reference document, the repository's root,
 * and the page's path below `/python/`.
 */
export const PYTHON_PAGES: readonly (readonly [string, string])[] = [
  ["index.mdx", ""],
  ["guide/how-it-works.md", "guide/how-it-works"],
  ["guide/glossary.md", "guide/glossary"],
  ["guide/ancient-greek.md", "guide/ancient-greek"],
  ["guide/byzantine-greek.md", "guide/byzantine-greek"],
  ["guide/modern-greek.md", "guide/modern-greek"],
  ["guide/presets.md", "guide/presets"],
  ["guide/format-and-option-losses.md", "guide/format-and-option-losses"],
  ["guide/losses.md", "guide/losses"],
  ["guide/converters.md", "guide/converters"],
  [
    "guide/recipes/transliteration-and-beta-code.md",
    "guide/recipes/transliteration-and-beta-code",
  ],
  [
    "guide/recipes/diacritics-and-unicode.md",
    "guide/recipes/diacritics-and-unicode",
  ],
  ["guide/recipes/letters-and-text.md", "guide/recipes/letters-and-text"],
  ["docs/options.md", "reference/options"],
  ["docs/presets.md", "reference/presets"],
  ["docs/guarantees.md", "reference/guarantees"],
  ["docs/information-loss.md", "reference/information-loss"],
  ["docs/greek-unicode.md", "reference/greek-unicode"],
  ["docs/punctuation-and-numerals.md", "reference/punctuation-and-numerals"],
  ["docs/conversion-analysis.md", "reference/conversion-analysis"],
  ["docs/character-extensions.md", "reference/character-extensions"],
  ["docs/stability.md", "reference/stability"],
  ["docs/preset-behavior-audit.md", "reference/preset-behavior-audit"],
  ["docs/preset-repertoire-audit.md", "reference/preset-repertoire-audit"],
  [
    "docs/ala-lc-conformance-corpus.md",
    "reference/ala-lc-conformance-corpus",
  ],
  [
    "docs/preset-conformance-corpus.md",
    "reference/preset-conformance-corpus",
  ],
];

/** The path of a TypeScript page from its source: `/guide/losses/`. */
export function typescriptPath(source: string): string {
  if (source === "index.mdx") return "/";
  if (source.startsWith("docs/")) {
    return `/reference/${source.slice(5).replace(/\.md$/, "")}/`;
  }
  return `/${source.replace(/\.mdx?$/, "")}/`;
}

/** The path of a Python page from its path below `/python/`. */
export function pythonPath(path: string): string {
  return path === "" ? "/python/" : `/python/${path}/`;
}

/** The overview of the main entry point, in the TypeScript API. */
const API = "/api/humanities/greek-conversion/readme/";

/** TypeScript and Python pages that stand for one another. */
export const COUNTERPARTS: readonly (readonly [string, string])[] = [
  ...PYTHON_PAGES.map(([source, path]) =>
    [typescriptPath(source), pythonPath(path)] as const
  ),
  ["/guide/getting-started/", "/python/guide/getting-started/"],
  ["/guide/performance/", "/python/guide/performance/"],
  [API, "/python/reference/api/"],
];

/** The documentation a page belongs to, from its path below the base. */
export function languageOf(path: string): Language {
  return path === "/python" || path.startsWith("/python/")
    ? "python"
    : "typescript";
}

/**
 * The same page in the other documentation, as a path below the base: its
 * counterpart, or the other documentation's home. Every page of the
 * TypeScript API (`/api/…`) leads to the Python API reference, which leads
 * to the overview of the main entry point.
 */
export function counterpart(path: string): string {
  const python = languageOf(path) === "python";
  const key = !python && path.startsWith("/api/") ? API : path;
  const pair = COUNTERPARTS.find(([typescript, py]) =>
    (python ? py : typescript) === key
  );
  if (pair !== undefined) return python ? pair[0] : pair[1];
  return python ? "/" : "/python/";
}
