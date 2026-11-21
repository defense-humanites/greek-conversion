/**
 * Checks the TypeScript examples of README.md, of the reference (`docs/`),
 * and of the guide pages of the documentation site
 * (`web/docs/src/content/docs/`, except the reference pages generated from
 * `docs/` and the API pages), so that they cannot drift from the code: each
 * ```ts block is type-checked as a module of its own, then executed, and its
 * results are compared with the documented ones. A translated page keeps its
 * examples, so they are checked in every language.
 *
 * Inside a ```ts block, an expected result is written as a comment that
 * starts with an arrow, either after a one-line statement or on the line
 * following a statement:
 *
 *     convert("a)/nqrwpos", "beta-code", "greek"); // → ἄνθρωπος
 *
 *     convert(text, "greek", "transliteration", {
 *       diacritics: { all: "remove" },
 *     });
 *     // → Hellēsin egeneto …
 *
 * A result can be given inside a block, such as a `catch`, at the
 * indentation of its statement.
 *
 * `// throws RangeError: message` expects an exception instead. Text results
 * are compared code point for code point, as a reader who copies one compares
 * it: Greek with an oxia is not Greek with a tonos, nor a decomposed letter a
 * composed one. Other results are compared as JSON. Comments without an arrow
 * are illustrative and are not checked.
 *
 * Links to files of this repository, and to headings in them or in the
 * README, must exist in the working tree. A guide page links to other pages
 * by their path from the site's root (`/reference/presets/#coverage`); the
 * page and the heading must exist, in `docs/` for the reference, generated
 * from it. The README, read away from the site, links to its pages by their
 * full address, the `homepage` of `package.json`, and is checked the same
 * way, as are the links of the migration guide, whose examples are not run.
 * A reference document links to the others, and to files of the
 * repository, by their path from `docs/` (`presets.md#inspection`).
 *
 * Run with `node scripts/check_examples.ts`.
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = new URL("../", import.meta.url);
const README = new URL("README.md", ROOT);
const DOCS = new URL("docs/", ROOT);
const PAGES = new URL("web/docs/src/content/docs/", ROOT);
/** The address of the site, which the README links to in full. */
const SITE: string =
  JSON.parse(await readFile(new URL("package.json", ROOT), "utf8")).homepage;
/** Folders of the site that are generated, from `docs/` and from the API. */
const GENERATED = new Set(["reference", "api"]);
const MAIN = new URL("../src/mod.ts", import.meta.url);
/** The other entry points, by subpath, as `jsr.json` maps them. */
const SUBPATHS: Record<string, URL> = Object.fromEntries(
  Object.entries(
    JSON.parse(await readFile(new URL("jsr.json", ROOT), "utf8"))
      .exports as Record<string, string>,
  )
    .filter(([subpath]) => subpath !== ".")
    .map(([subpath, file]) => [subpath.slice(2), new URL(file, ROOT)]),
);
const TSC = fileURLToPath(
  new URL("../node_modules/typescript/bin/tsc", import.meta.url),
);

const ARROW = /^(\s*)\/\/ → (.*)$/;
const THROWS = /^(\s*)\/\/ throws (\w+): (.*)$/;
const INLINE_ARROW = /^(\s*)(\S.*?);?\s*\/\/ → (.*)$/;
const INLINE_THROWS = /^(\s*)(\S.*?);?\s*\/\/ throws (\w+): (.*)$/;

/** Defines `__check`, which records each outcome for the runner. */
const HELPER = `
const __results = (globalThis as any).__readme as { ok: boolean; detail: string }[];
function __same(value: unknown, expected: string): boolean {
  if (typeof value === "string") return value === expected;
  try {
    return JSON.stringify(value) === JSON.stringify(JSON.parse(expected));
  } catch {
    return false;
  }
}
/** Says where two writings of one text differ, which the eye cannot see. */
function __scalars(value: unknown, expected: string): string {
  if (
    typeof value !== "string" ||
    value.normalize("NFC") !== expected.normalize("NFC")
  ) return "";
  const got = [...value];
  const wanted = [...expected];
  const at = got.findIndex((char, index) => char !== wanted[index]);
  const code = (char: string | undefined) =>
    char === undefined
      ? "nothing"
      : "U+" + char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
  return " (the same text in other code points: at character " + (at + 1) +
    ", the page writes " + code(wanted[at]) + " where " + code(got[at]) +
    " is returned; copy the result as it is returned)";
}
function __check(run: () => unknown, index: number, expectation: any): void {
  const show = (value: unknown) =>
    typeof value === "string" ? value : JSON.stringify(value);
  try {
    const value = run();
    __results[index] = expectation.kind === "value" && __same(value, expectation.expected)
      ? { ok: true, detail: "" }
      : {
        ok: false,
        detail: expectation.kind === "throws"
          ? \`expected \${expectation.error}, got \${show(value)}\`
          : \`expected \${expectation.expected}, got \${show(value)}\` +
            __scalars(value, expectation.expected),
      };
  } catch (error) {
    const name = (error as Error).name;
    const message = (error as Error).message;
    __results[index] = expectation.kind === "throws" &&
        name === expectation.error && message === expectation.expected
      ? { ok: true, detail: "" }
      : { ok: false, detail: \`unexpected \${name}: \${message}\` };
  }
}
`;

interface Expectation {
  kind: "value" | "throws";
  expected: string;
  error?: string;
  line: number;
}

/** A checked document: the README, a reference document, or a guide page. */
interface Source {
  /** Its path from the repository's root, for messages. */
  name: string;
  lines: string[];
  /** Its path on the site, such as `/guide/losses/`, for a guide page. */
  page?: string;
}

const sources: Source[] = [
  { name: "README.md", lines: (await readFile(README, "utf8")).split("\n") },
];
const references = (await readdir(DOCS)).filter((file) => file.endsWith(".md"))
  .sort();
for (const file of references) {
  sources.push({
    name: `docs/${file}`,
    lines: (await readFile(new URL(file, DOCS), "utf8")).split("\n"),
  });
}
for (const file of await guidePages(PAGES)) {
  const url = new URL(file, PAGES);
  sources.push({
    name: relative(fileURLToPath(ROOT), fileURLToPath(url)).replaceAll(
      "\\",
      "/",
    ),
    lines: (await readFile(url, "utf8")).split("\n"),
    page: `/${
      file.replace(/(^|\/)index\.mdx?$/, "$1").replace(/\.mdx?$/, "/")
    }`,
  });
}
// The migration guide shows calls of earlier releases, which are not run; its
// links are checked with the others.
const MIGRATION: Source = {
  name: "MIGRATION.md",
  lines: (await readFile(new URL("MIGRATION.md", ROOT), "utf8")).split("\n"),
};
const blocks = sources.flatMap((source) =>
  [...codeBlocks(source.lines)].map((block) => ({ ...block, source }))
);
const failures: string[] = [];
let checked = 0;

const directory = await mkdtemp(join(tmpdir(), "greek-conversion-readme-"));
try {
  failures.push(...await typeCheck(blocks, directory));

  for (const [number, block] of blocks.entries()) {
    const expectations: Expectation[] = [];
    const program = translate(block.lines, block.start, expectations);
    if (expectations.length === 0) continue;

    const results: { ok: boolean; detail: string }[] = [];
    (globalThis as Record<string, unknown>).__readme = results;
    const file = join(directory, `run-${number}.mts`);
    await writeFile(file, rewriteImports(program, (url) => url.href));
    try {
      await import(pathToFileURL(file).href);
    } catch (error) {
      failures.push(
        `${block.source.name}:${block.start}: the example failed to run: ${error}`,
      );
      continue;
    }
    results.forEach((result, index) => {
      checked++;
      if (!result.ok) {
        failures.push(
          `${block.source.name}:${expectations[index].line}: ${result.detail}`,
        );
      }
    });
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}

// Links to this repository point at main, because the README is also shown on
// JSR and npm; check that each linked file and heading exists in this tree.
// Guide pages link to the site's pages by their path from its root.
const REPOSITORY =
  "https://github.com/defense-humanites/greek-conversion/blob/main/";
const slug = (heading: string) =>
  heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
for (const source of [...sources, MIGRATION]) {
  const text = source.lines.join("\n");
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const line = text.slice(0, match.index).split("\n").length;
    const where = `${source.name}:${line}`;
    const target = match[1];
    let file: string | undefined;
    let anchor: string | undefined;
    if (target.startsWith(REPOSITORY)) {
      [file, anchor] = target.slice(REPOSITORY.length).split("#");
    } else if (target.startsWith("#")) {
      file = source.name;
      anchor = target.slice(1);
    } else if (
      (source.page !== undefined && target.startsWith("/")) ||
      target.startsWith(SITE)
    ) {
      const [path, fragment] =
        (target.startsWith(SITE) ? target.slice(SITE.length - 1) : target)
          .split("#");
      anchor = fragment;
      file = await pageFile(path);
      if (file === undefined) {
        failures.push(`${where}: no such page: ${path}`);
        continue;
      }
      if (file === "") {
        checked++;
        continue;
      }
    } else if (
      source.name.startsWith("docs/") && !/^[a-z][a-z0-9+.-]*:/i.test(target)
    ) {
      // A reference document links by path from docs/.
      const [path, fragment] = target.split("#");
      anchor = fragment;
      file = new URL(path, "file:///docs/").pathname.slice(1);
    } else continue;

    let content: string;
    try {
      content = await readFile(new URL(file, ROOT), "utf8");
    } catch {
      failures.push(`${where}: no such file: ${file}`);
      continue;
    }
    checked++;
    if (anchor === undefined || anchor === "") continue;
    const headings = content.split("\n").filter((row) => /^#{1,6} /.test(row))
      .map((row) => slug(row.replace(/^#+ /, "")));
    if (!headings.includes(anchor)) {
      failures.push(`${where}: no heading #${anchor} in ${file}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error(
    `\n${failures.length} problem(s) found in the examples and links.`,
  );
  process.exit(1);
}
console.log(
  `${checked} results and links check out in the README, ${references.length} reference documents, ${
    sources.length - 1 - references.length
  } guide pages, and the migration guide.`,
);

/** The guide pages under `folder`, as paths relative to it. */
async function guidePages(folder: URL): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(folder, { recursive: true, withFileTypes: true });
  } catch {
    return [];
  }
  return entries.filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
    .map((entry) =>
      relative(fileURLToPath(folder), join(entry.parentPath, entry.name))
        .replaceAll("\\", "/")
    )
    .filter((file) => !GENERATED.has(file.split("/")[0]))
    .sort();
}

/**
 * The file, from the repository's root, of the site's page at `path`:
 * `docs/<name>.md` for a reference page, the page's source for a guide page,
 * an empty string for a page this check does not read (the API reference,
 * generated from the code, and the playground), and undefined for no page.
 */
async function pageFile(path: string): Promise<string | undefined> {
  const reference = path.match(/^\/reference\/([\w-]+)\/$/);
  if (reference) {
    const file = `docs/${reference[1]}.md`;
    try {
      await readFile(new URL(file, ROOT));
      return file;
    } catch {
      return undefined;
    }
  }
  // The API pages are generated by TypeDoc, under the overview of each
  // entry point; `/api/` itself is not a page.
  if (/^\/api\/.+\/$/.test(path) || path === "/playground/") return "";
  if (!path.endsWith("/")) return undefined;
  const base = path === "/" ? "index" : path.slice(1, -1);
  for (
    const candidate of [
      `${base}.md`,
      `${base}.mdx`,
      `${base}/index.md`,
      `${base}/index.mdx`,
    ]
  ) {
    try {
      await readFile(new URL(candidate, PAGES));
      return relative(
        fileURLToPath(ROOT),
        fileURLToPath(new URL(candidate, PAGES)),
      )
        .replaceAll("\\", "/");
    } catch {
      // Try the next layout.
    }
  }
  return undefined;
}

function* codeBlocks(
  all: readonly string[],
): Generator<{ start: number; lines: string[] }> {
  for (let i = 0; i < all.length; i++) {
    if (all[i].trim() !== "```ts") continue;
    const start = i + 2;
    const body: string[] = [];
    for (i++; i < all.length && all[i].trim() !== "```"; i++) {
      body.push(all[i]);
    }
    yield { start, lines: body };
  }
}

/** Turns expectation comments into calls that record their outcome. */
function translate(
  body: readonly string[],
  start: number,
  expectations: Expectation[],
): string {
  const out: string[] = [];
  let pending: string[] = [];

  const flush = () => {
    out.push(...pending);
    pending = [];
  };
  const check = (statement: string, expectation: Expectation) => {
    const index = expectations.push(expectation) - 1;
    out.push(
      `__check(() => (${statement.replace(/;\s*$/, "")}), ${index}, ${
        JSON.stringify(expectation)
      });`,
    );
  };

  body.forEach((line, offset) => {
    const lineNumber = start + offset;
    const arrow = line.match(ARROW);
    const throws = line.match(THROWS);
    if (arrow || throws) {
      // The checked statement is the last statement before it at the same
      // indentation: the top level, or the block the result is given in.
      const indent = (arrow ?? throws)![1];
      let first = pending.length - 1;
      while (first > 0 && !startsStatement(pending[first], indent)) first--;
      const statement = pending.slice(first).join("\n");
      pending = pending.slice(0, first);
      flush();
      check(
        statement,
        arrow ? { kind: "value", expected: arrow[2], line: lineNumber } : {
          kind: "throws",
          error: throws![2],
          expected: throws![3],
          line: lineNumber,
        },
      );
      return;
    }

    const inlineArrow = line.match(INLINE_ARROW);
    const inlineThrows = line.match(INLINE_THROWS);
    if (inlineArrow || inlineThrows) {
      flush();
      check(
        (inlineArrow ?? inlineThrows)![2],
        inlineArrow
          ? { kind: "value", expected: inlineArrow[3], line: lineNumber }
          : {
            kind: "throws",
            error: inlineThrows![3],
            expected: inlineThrows![4],
            line: lineNumber,
          },
      );
      return;
    }
    pending.push(line);
  });
  flush();

  return `${HELPER}\n${out.join("\n")}`;
}

/** Whether `line` starts a statement at the indentation `indent`. */
function startsStatement(line: string, indent: string): boolean {
  if (!line.startsWith(indent)) return false;
  const rest = line.slice(indent.length);
  return rest.length > 0 && !/^[\s})\]]/.test(rest) && !rest.startsWith("//");
}

function rewriteImports(
  program: string,
  specifier: (url: URL) => string,
): string {
  return program
    .replace(
      /"@humanities\/greek-conversion\/([a-z-]+)"/g,
      (whole, subpath: string) =>
        Object.hasOwn(SUBPATHS, subpath)
          ? JSON.stringify(specifier(SUBPATHS[subpath]))
          : whole,
    )
    .replaceAll(
      '"@humanities/greek-conversion"',
      JSON.stringify(specifier(MAIN)),
    );
}

function toPath(url: URL): string {
  return fileURLToPath(url).replaceAll("\\", "/");
}

/**
 * Type-checks each block as a module of its own, as written, and returns the
 * errors with their file names and line numbers.
 */
async function typeCheck(
  all: readonly { start: number; lines: string[]; source: Source }[],
  directory: string,
): Promise<string[]> {
  const files: string[] = [];
  for (const [number, block] of all.entries()) {
    const file = `check-${number}.mts`;
    await writeFile(
      join(directory, file),
      // TypeScript resolves paths, not file URLs.
      rewriteImports(block.lines.join("\n"), toPath),
    );
    files.push(file);
  }
  await writeFile(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022"],
        module: "NodeNext",
        moduleResolution: "NodeNext",
        types: [],
        strict: true,
        allowImportingTsExtensions: true,
        noEmit: true,
      },
      files,
    }),
  );
  try {
    execFileSync(process.execPath, [
      TSC,
      "--project",
      directory,
      "--pretty",
      "false",
    ], {
      encoding: "utf8",
    });
    return [];
  } catch (error) {
    const output = String((error as { stdout?: string }).stdout ?? error);
    return output.split("\n").filter((line) => line.trim() !== "").map(
      (line) =>
        line.replace(
          /^(?:.*[\\/])?check-(\d+)\.mts\((\d+),(\d+)\)/,
          (_, number: string, row: string, column: string) =>
            `${all[Number(number)].source.name}:${
              all[Number(number)].start + Number(row) - 1
            }:${column}`,
        ),
    );
  }
}
