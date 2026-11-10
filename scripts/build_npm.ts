/**
 * Builds the npm package into `npm/`: the library compiled by TypeScript
 * (`tsconfig.build.json`), its declarations, the sources the declaration maps
 * point to, the user documentation, and a `package.json` derived from the
 * repository's.
 *
 * Run with `npm run npm:build`.
 */
import { execFileSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);
const OUT = new URL("npm/", ROOT);
// RELEASING.md is a maintainer procedure and stays in the repository only.
const DOCUMENTS = [
  "CHANGELOG.md",
  "LICENSE",
  "MIGRATION.md",
  "README.md",
] as const;

const repository = JSON.parse(
  await readFile(new URL("package.json", ROOT), "utf8"),
);
if (repository.name !== "@humanities/greek-conversion") {
  throw new Error(`Unexpected package name: ${repository.name}`);
}
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(repository.version)) {
  throw new Error(`Invalid package version: ${repository.version}`);
}

await rm(OUT, { recursive: true, force: true });

execFileSync(process.execPath, [
  fileURLToPath(new URL("node_modules/typescript/bin/tsc", ROOT)),
  "--project",
  fileURLToPath(new URL("tsconfig.build.json", ROOT)),
], { stdio: "inherit" });

// TypeScript rewrites the `.ts` extensions of relative imports in the
// JavaScript it emits, not in the declarations; point those at the `.js`
// files too, as consumers' tools expect. The lengths are equal, so the
// declaration maps stay exact.
for (const file of await readdir(new URL("types/", OUT), { recursive: true })) {
  if (file.endsWith(".d.ts.map")) {
    // The maps point at the repository's `src/`; the package has its copy
    // one level up from `types/`.
    const url = new URL(`types/${file}`, OUT);
    const map = JSON.parse(await readFile(url, "utf8"));
    map.sources = map.sources.map((source: string) =>
      source.replace(/^((?:\.\.\/)*)\.\.\/src\//, "$1src/")
    );
    await writeFile(url, JSON.stringify(map));
    continue;
  }
  if (!file.endsWith(".d.ts")) continue;
  const url = new URL(`types/${file}`, OUT);
  const text = await readFile(url, "utf8");
  await writeFile(
    url,
    text.replace(
      /((?:from|import)\s*\(?\s*)(["'])(\.\.?\/[^"']*)\.ts\2/g,
      "$1$2$3.js$2",
    ),
  );
}

// The declaration maps lead editors to the TypeScript sources.
await cp(new URL("src/", ROOT), new URL("src/", OUT), { recursive: true });

for (const document of DOCUMENTS) {
  await cp(new URL(document, ROOT), new URL(document, OUT));
}
await mkdir(new URL("docs/", OUT), { recursive: true });
for (
  const entry of await readdir(new URL("docs/", ROOT), { withFileTypes: true })
) {
  if (entry.isFile() && entry.name.endsWith(".md")) {
    await cp(
      new URL(`docs/${entry.name}`, ROOT),
      new URL(`docs/${entry.name}`, OUT),
    );
  }
}

const published = {
  name: repository.name,
  version: repository.version,
  description: repository.description,
  keywords: repository.keywords,
  author: repository.author,
  homepage: repository.homepage,
  repository: repository.repository,
  license: repository.license,
  bugs: repository.bugs,
  type: "module",
  module: "./esm/mod.js",
  types: "./types/mod.d.ts",
  exports: {
    ".": {
      import: {
        types: "./types/mod.d.ts",
        default: "./esm/mod.js",
      },
    },
    "./document": {
      import: {
        types: "./types/document.d.ts",
        default: "./esm/document.js",
      },
    },
  },
  engines: repository.engines,
  // The package has no import-time side effects; bundlers may drop unused
  // exports.
  sideEffects: false,
};

await writeFile(
  new URL("package.json", OUT),
  `${JSON.stringify(published, null, 2)}\n`,
);
