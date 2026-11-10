/**
 * Checks the TypeScript examples of README.md, so that the README cannot
 * drift from the code: each ```ts block is type-checked as a module of its
 * own, then executed, and its results are compared with the documented ones.
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
 * `// throws RangeError: message` expects an exception instead. Text results
 * are compared after NFC normalization; other results are compared as JSON.
 * Comments without an arrow are illustrative and are not checked.
 *
 * Links to files of this repository, and to headings in them or in the
 * README, must exist in the working tree.
 *
 * Run with `node scripts/check_readme.ts`.
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const README = new URL("../README.md", import.meta.url);
const MAIN = new URL("../src/mod.ts", import.meta.url);
const DOCUMENT = new URL("../src/document.ts", import.meta.url);
const TSC = fileURLToPath(
  new URL("../node_modules/typescript/bin/tsc", import.meta.url),
);

const ARROW = /^\/\/ → (.*)$/;
const THROWS = /^\/\/ throws (\w+): (.*)$/;
const INLINE_ARROW = /^(\S.*?);?\s*\/\/ → (.*)$/;
const INLINE_THROWS = /^(\S.*?);?\s*\/\/ throws (\w+): (.*)$/;

/** Defines `__check`, which records each outcome for the runner. */
const HELPER = `
const __results = (globalThis as any).__readme as { ok: boolean; detail: string }[];
function __same(value: unknown, expected: string): boolean {
  if (typeof value === "string") {
    return value.normalize("NFC") === expected.normalize("NFC");
  }
  try {
    return JSON.stringify(value) === JSON.stringify(JSON.parse(expected));
  } catch {
    return false;
  }
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
          : \`expected \${expectation.expected}, got \${show(value)}\`,
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

const source = await readFile(README, "utf8");
const lines = source.split("\n");
const blocks = [...codeBlocks(lines)];
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
        `README.md:${block.start}: the example failed to run: ${error}`,
      );
      continue;
    }
    results.forEach((result, index) => {
      checked++;
      if (!result.ok) {
        failures.push(
          `README.md:${expectations[index].line}: ${result.detail}`,
        );
      }
    });
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}

// Links to this repository point at main, because the README is also shown on
// JSR and npm; check that each linked file and heading exists in this tree.
const REPOSITORY =
  "https://github.com/defense-humanites/greek-conversion/blob/main/";
const slug = (heading: string) =>
  heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
for (const [index, line] of lines.entries()) {
  for (const match of line.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    let file: string | undefined;
    let anchor: string | undefined;
    if (target.startsWith(REPOSITORY)) {
      [file, anchor] = target.slice(REPOSITORY.length).split("#");
    } else if (target.startsWith("#")) {
      file = "README.md";
      anchor = target.slice(1);
    } else continue;

    let text: string;
    try {
      text = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    } catch {
      failures.push(`README.md:${index + 1}: no such file: ${file}`);
      continue;
    }
    checked++;
    if (anchor === undefined) continue;
    const headings = text.split("\n").filter((row) => /^#{1,6} /.test(row))
      .map((row) => slug(row.replace(/^#+ /, "")));
    if (!headings.includes(anchor)) {
      failures.push(`README.md:${index + 1}: no heading #${anchor} in ${file}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} README problem(s) found.`);
  process.exit(1);
}
console.log(`${checked} README results and links check out.`);

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
      // The checked statement is the last top-level statement before it.
      let first = pending.length - 1;
      while (first > 0 && !startsStatement(pending[first])) first--;
      const statement = pending.slice(first).join("\n");
      pending = pending.slice(0, first);
      flush();
      check(
        statement,
        arrow ? { kind: "value", expected: arrow[1], line: lineNumber } : {
          kind: "throws",
          error: throws![1],
          expected: throws![2],
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
        (inlineArrow ?? inlineThrows)![1],
        inlineArrow
          ? { kind: "value", expected: inlineArrow[2], line: lineNumber }
          : {
            kind: "throws",
            error: inlineThrows![2],
            expected: inlineThrows![3],
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

function startsStatement(line: string): boolean {
  return line.length > 0 && !/^[\s})\]]/.test(line) && !line.startsWith("//");
}

function rewriteImports(
  program: string,
  specifier: (url: URL) => string,
): string {
  return program
    .replaceAll(
      '"@humanities/greek-conversion/document"',
      JSON.stringify(specifier(DOCUMENT)),
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
 * errors with their README line numbers.
 */
async function typeCheck(
  all: readonly { start: number; lines: string[] }[],
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
            `README.md:${
              all[Number(number)].start + Number(row) - 1
            }:${column}`,
        ),
    );
  }
}
