/**
 * Checks that the code blocks of the documentation site fit its column of
 * text without scrolling sideways: no line of a fenced block in the guide
 * pages (`web/docs/src/content/docs/`, except the generated API) or in the
 * reference sources (`docs/`) may be wider than 76 columns. The column of
 * text is 720px wide, and 692px beside "On this page" from 1440px: a code
 * block then holds 76 columns of the 14px monospace. A combining mark takes
 * no column. A phone's narrower screen still scrolls a long line.
 *
 * Run with `node scripts/check_code_width.ts`.
 */
import { readdir, readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);
const FOLDERS = [
  new URL("web/docs/src/content/docs/", ROOT),
  new URL("docs/", ROOT),
];
/** Folders of the site generated from elsewhere. */
const SKIPPED = new Set(["api", "reference"]);
const COLUMNS = 76;
const FENCE = /^\s*(```|~~~)/;
const COMBINING = /\p{M}/gu;

async function markdownFiles(folder: URL): Promise<string[]> {
  const root = fileURLToPath(folder);
  const entries = await readdir(folder, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name))
    .map((entry) => `${entry.parentPath}/${entry.name}`)
    .filter((path) => !SKIPPED.has(relative(root, path).split("/")[0]!))
    .sort();
}

const failures: string[] = [];
for (const folder of FOLDERS) {
  for (const path of await markdownFiles(folder)) {
    let fence: string | undefined;
    const lines = (await readFile(path, "utf8")).split("\n");
    lines.forEach((line, index) => {
      const marker = FENCE.exec(line)?.[1];
      if (marker && (fence === undefined || marker === fence)) {
        fence = fence === undefined ? marker : undefined;
        return;
      }
      if (fence === undefined) return;
      const columns = [...line.replace(COMBINING, "")].length;
      if (columns > COLUMNS) {
        failures.push(
          `${relative(fileURLToPath(ROOT), path)}:${
            index + 1
          }: ${columns} columns`,
        );
      }
    });
  }
}

if (failures.length > 0) {
  console.error(
    `Code lines wider than ${COLUMNS} columns scroll in the documentation:`,
  );
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`Every code line of the documentation fits in ${COLUMNS} columns.`);
