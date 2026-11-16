/**
 * Copies the reference documents of `docs/` into the site, as
 * `src/content/docs/reference/<name>.md`, so that `docs/` stays the one
 * source: plain Markdown that reads well on GitHub and ships in the packages.
 *
 * For each document, the first `# ` heading becomes the `title` of the page,
 * links to other documents of `docs/` become links to their pages, and links
 * to other files of the repository point at them on GitHub. The output is
 * generated and not committed.
 *
 * The project's marks (`docs/assets/`) are copied too, into `public/`: the
 * symbol of the header, light and dark, and the favicon.
 *
 * Run with `npm run sync`, which `npm run dev` and `npm run build` do first.
 */
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";

const DOCS = new URL("../../../docs/", import.meta.url);
const OUTPUT = new URL("../src/content/docs/reference/", import.meta.url);
const PUBLIC = new URL("../public/", import.meta.url);
const REPOSITORY =
  "https://github.com/defense-humanites/greek-conversion/blob/main/";

const names = (await readdir(DOCS)).filter((name) => name.endsWith(".md"))
  .sort();
const documents = new Set(names.map((name) => name.slice(0, -3)));

await rm(OUTPUT, { recursive: true, force: true });
await mkdir(OUTPUT, { recursive: true });

for (const name of names) {
  const text = await readFile(new URL(name, DOCS), "utf8");
  const heading = text.match(/^# (.+)\n/m);
  if (heading === null) {
    throw new Error(`docs/${name} has no level-one heading.`);
  }
  const body = text.replace(heading[0], "").replace(/^\n+/, "");
  const page = [
    "---",
    `title: ${JSON.stringify(heading[1].trim())}`,
    `editUrl: ${
      JSON.stringify(`${REPOSITORY.replace("/blob/", "/edit/")}docs/${name}`)
    }`,
    "---",
    "",
    `<!-- Generated from docs/${name} by scripts/sync_reference.ts. -->`,
    "",
    rewriteLinks(body, name),
  ].join("\n");
  await writeFile(new URL(name, OUTPUT), page);
}

await mkdir(PUBLIC, { recursive: true });
for (
  const [name, copy] of [
    ["symbol-clair", "symbol-light"],
    ["symbol-sombre", "symbol-dark"],
    ["favicon", "favicon"],
  ]
) {
  await cp(
    new URL(`assets/greek-conversion-${name}.svg`, DOCS),
    new URL(`${copy}.svg`, PUBLIC),
  );
}

console.log(`${names.length} reference documents synced from docs/.`);

/** Rewrites the relative links of `docs/<name>` for its page on the site. */
function rewriteLinks(body: string, name: string): string {
  return body.replace(/\]\(([^)\s]+)\)/g, (link, target: string) => {
    if (/^[a-z]+:/i.test(target) || target.startsWith("#")) return link;
    const [path, anchor] = target.split("#");
    const suffix = anchor === undefined ? "" : `#${anchor}`;
    if (!path.includes("/") && path.endsWith(".md")) {
      const document = path.slice(0, -3);
      if (!documents.has(document)) {
        throw new Error(`docs/${name}: no such document: ${path}`);
      }
      return `](/reference/${document}/${suffix})`;
    }
    const file = new URL(path, new URL(name, "file:///repository/docs/"))
      .pathname.replace("/repository/", "");
    return `](${REPOSITORY}${file}${suffix})`;
  });
}
