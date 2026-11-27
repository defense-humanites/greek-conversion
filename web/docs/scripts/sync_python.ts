/**
 * Writes the pages of the Python package's documentation that follow pages
 * of the guide and the reference, under `src/content/docs/python/`, served
 * at `/python/…` (and `/next/python/…`). The others, the getting started and
 * the page on the package, are written by hand, and the API reference is
 * written from the docstrings (`python/scripts/api_reference.py`).
 *
 * Each page keeps the text of its source, with:
 *
 * - its TypeScript examples in Python (`python_examples.ts`), or in the
 *   Python written by hand for the few that do not translate
 *   (`python_overrides.ts`);
 * - in inline code, the library's names as Python writes them: functions,
 *   option keys, and fields in snake_case (`convertDetailed()` →
 *   `convert_detailed()`), options as a dictionary (`{ preset: "x" }` →
 *   `{"preset": "x"}`) or a keyword (`coronis: "greek"` →
 *   `coronis="greek"`), `RangeError` as `ValueError`, `true` as `True`;
 * - its links to the pages that have a Python version led to it, the
 *   others to the TypeScript documentation.
 *
 * The output is generated and not committed. `python/scripts/check_docs.py`
 * runs its examples through the package.
 *
 * Run with `node scripts/sync_python.ts`, which `npm run sync` runs.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { CONVERSION_OPTION_VALUES } from "../../../src/mod.ts";
import {
  FUNCTIONS,
  snake,
  toPython,
  Untranslatable,
} from "./python_examples.ts";
import { OVERRIDES, PROSE } from "./python_overrides.ts";

const ROOT = new URL("../../../", import.meta.url);
const CONTENT = new URL("../src/content/docs/", import.meta.url);
const OUTPUT = new URL("python/", CONTENT);
const REPOSITORY = "https://github.com/defense-humanites/greek-conversion/";

/** The pages that have a Python version: their source, and their path. */
const PAGES: readonly [string, string][] = [
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
];

/** Pages of the TypeScript documentation, by the page that stands for them. */
const LINKED = new Map<string, string>([
  ...PAGES.map(([source, path]): [string, string] => [
    source.startsWith("docs/")
      ? `/reference/${source.slice(5, -3)}/`
      : `/${source.slice(0, -3)}/`,
    `/python/${path}/`,
  ]),
  ["/guide/getting-started/", "/python/"],
]);

/** The camelCase names of the library that Python writes in snake_case. */
const NAMES = new Set<string>([
  ...FUNCTIONS,
  ...Object.keys(CONVERSION_OPTION_VALUES),
  ...Object.values(CONVERSION_OPTION_VALUES).flatMap((group) =>
    Object.keys(group)
  ),
  "outOfScopeBehavior",
  "glyphVariant",
  "inputStart",
  "inputEnd",
  "outputStart",
  "outputEnd",
].filter((name) => snake(name) !== name));

/** A key of options in camelCase or not: `eta`, `longVowels`. */
const NAMES_OR_KEYS = /^[a-z][A-Za-z]*$/;

/** The slug of a heading, as Starlight writes it. */
const slug = (heading: string) =>
  heading.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\s-]/gu, "")
    .replace(/\s/g, "-");

const stale: string[] = [];
const untranslated: string[] = [];
/** The anchors of the options reference, from TypeScript to Python. */
const optionAnchors = new Map<string, string>();

// Only what this script writes is removed: the handwritten pages and the
// API reference stay.
await rm(new URL("guide/", OUTPUT), { recursive: true, force: true });
await rm(new URL("reference/options.md", OUTPUT), { force: true });

// The options reference first: the other pages link to its anchors.
const sources = [...PAGES].sort(([a], [b]) =>
  Number(b.startsWith("docs/")) - Number(a.startsWith("docs/"))
);
for (const [source, path] of sources) {
  const fromDocs = source.startsWith("docs/");
  const text = await readFile(
    new URL(source, fromDocs ? ROOT : CONTENT),
    "utf8",
  );
  let page = fromDocs ? referencePage(text, source) : text;
  for (const [from, to] of PROSE[source] ?? []) {
    if (!page.includes(from)) {
      stale.push(`${source}: the passage "${from.slice(0, 40)}…" of PROSE`);
    }
    page = page.replace(from, to);
  }
  const output = new URL(`${path}.md`, OUTPUT);
  await mkdir(new URL(".", output), { recursive: true });
  await writeFile(output, transform(page, source));
}

if (stale.length > 0 || untranslated.length > 0) {
  console.error(
    [
      ...untranslated.map((entry) =>
        `${entry}: no translation; give it in scripts/python_overrides.ts.`
      ),
      ...stale.map((entry) =>
        `${entry}: the TypeScript changed; check its Python in scripts/python_overrides.ts and update its source.`
      ),
    ].join("\n"),
  );
  process.exit(1);
}
console.log(`Wrote ${PAGES.length} pages of the Python documentation.`);

/** A reference document of `docs/` as a page: its heading as its title. */
function referencePage(text: string, source: string): string {
  const heading = text.match(/^# (.+)\n/m);
  if (heading === null) throw new Error(`${source} has no level-one heading.`);
  const body = text.replace(heading[0], "").replace(/^\n+/, "")
    // Links between documents of docs/, as links between their pages.
    .replace(
      /\]\((?!https?:|#)([\w-]+)\.md(#[\w-]+)?\)/g,
      (_, name: string, anchor = "") => `](/reference/${name}/${anchor})`,
    )
    .replace(
      /\]\((?!https?:|#|\/)([^)\s]+)\)/g,
      (_, path: string) =>
        `](${new URL(path, `${REPOSITORY}blob/main/docs/`)})`,
    );
  return `---\ntitle: ${JSON.stringify(heading[1].trim())}\n---\n\n${body}`;
}

function transform(text: string, source: string): string {
  const [, frontMatter, body] =
    text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ??
      [];
  if (frontMatter === undefined) throw new Error(`${source}: no front matter`);
  const edit = source.startsWith("docs/")
    ? `${REPOSITORY}edit/main/${source}`
    : `${REPOSITORY}edit/main/web/docs/src/content/docs/${source}`;
  const parts = body.split(/^(```[^\n]*\n[\s\S]*?^```)$/m);
  let block = 0;
  const converted = parts.map((part, index) => {
    if (index % 2 === 1) {
      if (!part.startsWith("```ts")) return part;
      return python(part.slice(6, -3), `${source}#${block++}`);
    }
    return prose(part, source);
  }).join("");
  const headings = source === "docs/options.md";
  if (headings) {
    for (const [original, written] of zipHeadings(body, converted)) {
      optionAnchors.set(slug(original), slug(written));
    }
  }
  return [
    "---",
    frontMatter.replace(/^editUrl: .*\n?/m, "").trimEnd(),
    `editUrl: ${JSON.stringify(edit)}`,
    "---",
    "",
    `<!-- Generated from ${source} by web/docs/scripts/sync_python.ts. -->`,
    "",
    converted.replace(/^\n+/, ""),
  ].join("\n");
}

function* zipHeadings(before: string, after: string) {
  const headings = (text: string) =>
    text.replace(/^```[\s\S]*?^```$/gm, "").split("\n").filter((line) =>
      /^#{2,6} /.test(line)
    ).map((line) => line.replace(/^#+ /, ""));
  const a = headings(before);
  const b = headings(after);
  for (let index = 0; index < a.length; index++) yield [a[index], b[index]];
}

/** The Python of a TypeScript block, translated or given by hand. */
function python(code: string, where: string): string {
  const override = OVERRIDES[where];
  const hash = createHash("sha256").update(code).digest("hex").slice(0, 12);
  if (override !== undefined) {
    if (override.source !== hash) stale.push(`${where} (now ${hash})`);
    return override.markdown;
  }
  try {
    return "```python\n" + toPython(code) + "\n```";
  } catch (error) {
    if (!(error instanceof Untranslatable)) throw error;
    untranslated.push(`${where} (${error.message}; source ${hash})`);
    return "";
  }
}

/** Prose: its inline code in Python, its links to the Python pages. */
function prose(text: string, source: string): string {
  return text
    // Python raises what JavaScript throws.
    .replace(
      /\b(throw)(s|n)?\b/g,
      (_, verb: string, ending = "") =>
        ({ "": "raise", s: "raises", n: "raised" } as Record<string, string>)[
          ending
        ],
    )
    .replace(
      /(`+)([^`]+?)\1/g,
      (_, ticks: string, code: string) => `${ticks}${inline(code)}${ticks}`,
    )
    .replace(
      /\]\((\/[^)\s#]*)(#[^)\s]*)?\)/g,
      (match, path: string, anchor) => `](${link(path, anchor ?? "", source)})`,
    );
}

function link(path: string, anchor: string, source: string): string {
  const target = LINKED.get(path);
  if (target === undefined) return path + anchor;
  if (target === "/python/reference/options/" && anchor !== "") {
    const python = optionAnchors.get(anchor.slice(1));
    if (python === undefined) {
      throw new Error(`${source}: no heading ${anchor} in the options.`);
    }
    return target + "#" + python;
  }
  return target + anchor;
}

/** Inline code in Python. */
function inline(code: string): string {
  // Options: `{ preset: "x" }` as a dictionary.
  if (/^\{.*\}$/.test(code)) {
    try {
      const python = toPython(`const options = ${code};`);
      return python.replace(/^options = /, "");
    } catch {
      // Not an object: as it is, names converted.
    }
  }
  // An option and its value: `coronis: "greek"` as a keyword.
  const pair = code.match(/^([a-z][A-Za-z]*): (.+)$/);
  if (pair !== null && NAMES_OR_KEYS.test(pair[1])) {
    return `${snake(pair[1])}=${value(pair[2])}`;
  }
  return code
    .replace(
      /\b[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)+\b/g,
      (name) => NAMES.has(name) ? snake(name) : name,
    )
    .replace(/^RangeError$/, "ValueError")
    .replace(
      /^(true|false|null|undefined)$/,
      (word) =>
        ({ true: "True", false: "False", null: "None", undefined: "None" })[
          word as "true"
        ],
    );
}

function value(text: string): string {
  return ({ true: "True", false: "False", null: "None" } as Record<
    string,
    string
  >)[text] ?? text;
}
