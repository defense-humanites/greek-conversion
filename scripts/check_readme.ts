/**
 * Executes the TypeScript examples of README.md and compares their results
 * with the documented ones, so that the README cannot drift from the code.
 *
 * Inside a ```ts block, an expected result is written as a comment that
 * starts with an arrow, either after a one-line statement or on the line
 * following a statement:
 *
 *     convert("a)/nqrwpos", "beta-code", "greek"); // → ἄνθρωπος
 *
 *     convert(text, "greek", "transliteration", {
 *       removeDiacritics: true,
 *     });
 *     // → Hellēsin egeneto …
 *
 * `// throws RangeError: message` expects an exception instead. Text results
 * are compared after NFC normalization; other results are compared as JSON.
 * Comments without an arrow are illustrative and are not checked.
 *
 * Run with `deno run --allow-read scripts/check_readme.ts`.
 */

const README = new URL("../README.md", import.meta.url);
const MAIN = new URL("../src/mod.ts", import.meta.url).href;
const DOCUMENT = new URL("../src/document.ts", import.meta.url).href;

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

const source = await Deno.readTextFile(README);
const lines = source.split("\n");
const failures: string[] = [];
let checked = 0;

for (const block of codeBlocks(lines)) {
  const expectations: Expectation[] = [];
  const program = translate(block.lines, block.start, expectations);
  if (expectations.length === 0) continue;

  const results: { ok: boolean; detail: string }[] = [];
  (globalThis as Record<string, unknown>).__readme = results;
  const url = `data:application/typescript;base64,${
    toBase64(rewriteImports(program))
  }`;
  try {
    await import(url);
  } catch (error) {
    failures.push(
      `README.md:${block.start}: the example failed to run: ${error}`,
    );
    continue;
  }
  results.forEach((result, index) => {
    checked++;
    if (!result.ok) {
      failures.push(`README.md:${expectations[index].line}: ${result.detail}`);
    }
  });
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} README example(s) do not match.`);
  Deno.exit(1);
}
console.log(`${checked} README results match the library.`);

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

function rewriteImports(program: string): string {
  return program
    .replaceAll('"@humanities/greek-conversion/document"', `"${DOCUMENT}"`)
    .replaceAll('"@humanities/greek-conversion"', `"${MAIN}"`);
}

function toBase64(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
