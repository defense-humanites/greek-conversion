import { build, emptyDir } from "@deno/dnt";
import denoConfig from "../deno.json" with { type: "json" };

const OUT_DIR = "./npm";
// RELEASING.md is a maintainer procedure and stays in the repository only.
const DOCUMENTS = [
  "CHANGELOG.md",
  "LICENSE",
  "MIGRATION.md",
  "README.md",
] as const;

if (denoConfig.name !== "@humanities/greek-conversion") {
  throw new Error(`Unexpected package name: ${denoConfig.name}`);
}
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(denoConfig.version)) {
  throw new Error(`Invalid package version: ${denoConfig.version}`);
}

await emptyDir(OUT_DIR);

await build({
  entryPoints: [
    { name: ".", path: "./src/mod.ts" },
    { name: "./document", path: "./src/document.ts" },
  ],
  outDir: OUT_DIR,
  esModule: true,
  scriptModule: false,
  declaration: "separate",
  declarationMap: true,
  typeCheck: "single",
  test: false,
  compilerOptions: {
    target: "ES2022",
  },
  shims: {},
  package: {
    name: denoConfig.name,
    version: denoConfig.version,
    description:
      "Bidirectional conversion between Greek, Beta Code, and transliteration, with standards-based presets and information-loss diagnostics.",
    author: "Antoine Boquet",
    license: denoConfig.license,
    homepage: "https://github.com/defense-humanites/greek-conversion#readme",
    repository: {
      type: "git",
      url: "git+https://github.com/defense-humanites/greek-conversion.git",
    },
    bugs: {
      url: "https://github.com/defense-humanites/greek-conversion/issues",
    },
    keywords: [
      "greek",
      "polytonic",
      "monotonic",
      "ancient-greek",
      "modern-greek",
      "beta-code",
      "transliteration",
      "romanization",
      "unicode",
      "humanities",
      "classics",
      "ala-lc",
      "bnf",
      "iso-843",
      "sbl",
      "tlg",
    ],
    engines: {
      node: ">=24",
    },
    // The package has no import-time side effects; bundlers may drop
    // unused exports.
    sideEffects: false,
  },
  async postBuild(): Promise<void> {
    for (const document of DOCUMENTS) {
      await Deno.copyFile(document, `${OUT_DIR}/${document}`);
    }

    await Deno.mkdir(`${OUT_DIR}/docs`, { recursive: true });
    for await (const entry of Deno.readDir("docs")) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        await Deno.copyFile(
          `docs/${entry.name}`,
          `${OUT_DIR}/docs/${entry.name}`,
        );
      }
    }
  },
});
