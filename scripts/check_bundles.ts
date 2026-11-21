/**
 * Checks what bundles keep of the npm package built in `npm/`, as a web
 * application's bundler would resolve it, through the package's `exports`
 * and its `sideEffects` field: esbuild bundles each conversion of the guide
 * on smaller bundles, minified, then compressed with gzip.
 *
 * - A conversion with the `./core` entry point keeps no module of a format,
 *   a preset, or a function it does not import: no other reader or writer,
 *   no validation of options without `prepareOptions()`, no metadata of the
 *   presets, no loss analysis without `convertDetailed()`.
 * - The sizes that the guide gives are those of the bundles, within 3 % (a
 *   change that moves one further has the page updated), and so are its
 *   percentages, within 2 points.
 *
 * Run with `node scripts/check_bundles.ts` after `npm run npm:build`;
 * `npm run npm:check` does both.
 */
import { mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const ROOT = new URL("../", import.meta.url);
const GUIDE = new URL(
  "web/docs/src/content/docs/guide/smaller-bundles.md",
  ROOT,
);
const P = "@humanities/greek-conversion";

interface Scenario {
  /** The row of the guide's table. */
  row: string;
  function: "convert" | "convertDetailed";
  imports: string[];
  /** The calls, given the expression of the options. */
  calls: (options: string) => string;
  /** Modules of `npm/esm/` that the bundle must not keep. */
  absent: string[];
}

/** Modules no conversion of the core entry point keeps. */
const NEVER = [
  "mod.js",
  "document.js",
  "conversion.js",
  "converter.js",
  "preset_metadata.js",
  "validation.js",
];
/** Modules that only `prepareOptions()` brings. */
const VALIDATION = ["prepare_options.js", "presets.js", "options.js"];

const SCENARIOS: Scenario[] = [
  {
    row: "Greek to Beta Code",
    function: "convert",
    imports: [
      `import { greekReader } from "${P}/greek";`,
      `import { betaCodeWriter } from "${P}/beta-code";`,
    ],
    calls: (options) =>
      `convert("λόγος", greekReader, betaCodeWriter, ${options})`,
    absent: [
      "losses.js",
      "parsers/transliteration.js",
      "formats/greek_writer.js",
      "formats/beta_code_reader.js",
      "formats/transliteration_reader.js",
      "formats/transliteration_writer.js",
    ],
  },
  {
    row: "Beta Code to Greek",
    function: "convert",
    imports: [
      `import { betaCodeReader } from "${P}/beta-code";`,
      `import { greekWriter } from "${P}/greek";`,
    ],
    calls: (options) =>
      `convert("lo/gos", betaCodeReader, greekWriter, ${options})`,
    absent: [
      "losses.js",
      "parsers/transliteration.js",
      "formats/greek_reader.js",
      "formats/beta_code_writer.js",
      "formats/transliteration_reader.js",
      "formats/transliteration_writer.js",
    ],
  },
  {
    row: "Greek to transliteration",
    function: "convert",
    imports: [
      `import { greekReader } from "${P}/greek";`,
      `import { transliterationWriter } from "${P}/transliteration";`,
    ],
    calls: (options) =>
      `convert("λόγος", greekReader, transliterationWriter, ${options})`,
    absent: [
      "losses.js",
      "parsers/beta_code.js",
      "parsers/transliteration.js",
      "formats/greek_writer.js",
      "formats/beta_code_reader.js",
      "formats/beta_code_writer.js",
      "formats/transliteration_reader.js",
    ],
  },
  {
    row: "Greek and transliteration both ways",
    function: "convert",
    imports: [
      `import { greekReader, greekWriter } from "${P}/greek";`,
      `import { transliterationReader, transliterationWriter } from "${P}/transliteration";`,
    ],
    calls: (options) =>
      `[convert("λόγος", greekReader, transliterationWriter, ${options}), ` +
      `convert("lógos", transliterationReader, greekWriter, ${options})]`,
    absent: [
      "losses.js",
      "parsers/beta_code.js",
      "formats/beta_code_reader.js",
      "formats/beta_code_writer.js",
    ],
  },
  {
    row: "Every format both ways",
    function: "convert",
    imports: [
      `import { greekFormat } from "${P}/greek";`,
      `import { betaCodeFormat } from "${P}/beta-code";`,
      `import { transliterationFormat } from "${P}/transliteration";`,
    ],
    calls: (options) =>
      "[greekFormat, betaCodeFormat, transliterationFormat].flatMap((from) => " +
      "[greekFormat, betaCodeFormat, transliterationFormat].map((to) => " +
      `convert("λόγος", from, to, ${options})))`,
    absent: ["losses.js"],
  },
  {
    row: "`convertDetailed()`, Greek to transliteration",
    function: "convertDetailed",
    imports: [
      `import { greekFormat } from "${P}/greek";`,
      `import { transliterationFormat } from "${P}/transliteration";`,
    ],
    calls: (options) =>
      `convertDetailed("λόγος", greekFormat, transliterationFormat, ${options})`,
    absent: [
      "parsers/beta_code.js",
      "formats/beta_code_reader.js",
      "formats/beta_code_writer.js",
    ],
  },
];

const directory = await mkdtemp(join(tmpdir(), "greek-conversion-bundles-"));
const failures: string[] = [];

/** A bundle's size, minified then compressed, and the modules it keeps. */
async function bundle(
  contents: string,
): Promise<{ size: number; gzip: number; modules: string[] }> {
  const result = await build({
    stdin: { contents, resolveDir: directory, loader: "js" },
    bundle: true,
    minify: true,
    format: "esm",
    write: false,
    metafile: true,
    logLevel: "error",
  });
  const output = result.outputFiles[0].contents;
  const [meta] = Object.values(result.metafile.outputs);
  return {
    size: output.length,
    gzip: gzipSync(output, { level: 9 }).length,
    modules: Object.entries(meta.inputs)
      .filter(([, input]) => input.bytesInOutput > 0)
      .map(([path]) => path.replace(/^.*\/npm\/esm\//, "")),
  };
}

/** The sizes of a row of the guide's table: in kB, and percentages. */
function documented(guide: string, row: string): number[] {
  const line = guide.split("\n").find((text) => text.startsWith(`| ${row} `));
  if (line === undefined) {
    failures.push(`The guide has no row "${row}".`);
    return [];
  }
  return [...line.matchAll(/(\d+\.\d) kB|\(([−+])(\d+) %\)/g)].map((match) =>
    match[1] !== undefined
      ? Number(match[1])
      : (match[2] === "−" ? -1 : 1) * Number(match[3])
  );
}

function compare(label: string, measured: number, written: number): void {
  if (Math.abs(measured / written - 1) > 0.03) {
    failures.push(
      `${label}: the guide gives ${written} kB, the bundle is ${measured} kB.`,
    );
  }
}

try {
  await mkdir(join(directory, "node_modules", "@humanities"), {
    recursive: true,
  });
  await symlink(
    fileURLToPath(new URL("npm/", ROOT)),
    join(directory, "node_modules", P),
    "dir",
  );
  const guide = await readFile(GUIDE, "utf8");

  const references = {
    convert: await bundle(
      `import { convert } from "${P}";\n` +
        `console.log(convert("λόγος", "greek", "transliteration", { preset: "iso-843-type-2" }));`,
    ),
    convertDetailed: await bundle(
      `import { convertDetailed } from "${P}";\n` +
        `console.log(convertDetailed("λόγος", "greek", "transliteration", { preset: "iso-843-type-2" }));`,
    ),
  };
  const kB = (bytes: number) => Math.round(bytes / 100) / 10;
  const intro = guide.match(
    /`convert\(\)`\s+\((\d+\.\d) kB, (\d+\.\d) kB with gzip\), or\s+`convertDetailed\(\)` \((\d+\.\d) kB, (\d+\.\d) kB\)/,
  );
  if (intro === null) {
    failures.push(
      "The guide no longer gives the sizes of the main entry point.",
    );
  } else {
    compare("convert()", kB(references.convert.size), Number(intro[1]));
    compare("convert(), gzip", kB(references.convert.gzip), Number(intro[2]));
    compare(
      "convertDetailed()",
      kB(references.convertDetailed.size),
      Number(intro[3]),
    );
    compare(
      "convertDetailed(), gzip",
      kB(references.convertDetailed.gzip),
      Number(intro[4]),
    );
  }

  for (const scenario of SCENARIOS) {
    const reference = references[scenario.function];
    const written = documented(guide, scenario.row);
    const variants = [
      {
        name: "a preset",
        code: [
          `import { ${scenario.function} } from "${P}/core";`,
          `import { iso843Type2 } from "${P}/presets";`,
          ...scenario.imports,
          `console.log(${scenario.calls("iso843Type2")});`,
        ],
        absent: [...NEVER, ...VALIDATION, ...scenario.absent],
      },
      {
        name: "prepareOptions()",
        code: [
          `import { ${scenario.function}, prepareOptions } from "${P}/core";`,
          ...scenario.imports,
          `const options = prepareOptions({ preset: "iso-843-type-2", transliteration: { eta: "e" } });`,
          `console.log(${scenario.calls("options")});`,
        ],
        absent: [...NEVER, ...scenario.absent],
      },
    ];
    for (const [index, variant] of variants.entries()) {
      const label = `${scenario.row}, with ${variant.name}`;
      const result = await bundle(variant.code.join("\n"));
      for (const module of variant.absent) {
        if (result.modules.includes(module)) {
          failures.push(`${label}: the bundle keeps ${module}.`);
        }
      }
      const [size, gzip, percent] = written.slice(index * 3, index * 3 + 3);
      if (percent === undefined) {
        failures.push(`${label}: the guide's row has no sizes.`);
        continue;
      }
      compare(label, kB(result.size), size);
      compare(`${label}, gzip`, kB(result.gzip), gzip);
      const measured = Math.round((result.gzip / reference.gzip - 1) * 100);
      if (Math.abs(measured - percent) > 2) {
        failures.push(
          `${label}: the guide gives ${percent} %, the bundle ${measured} %.`,
        );
      }
    }
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  console.error(
    "\nUpdate the guide on smaller bundles, or keep the modules out.",
  );
  process.exit(1);
}
console.log(
  `${
    SCENARIOS.length * 2
  } bundles keep only what they import, at the sizes the guide gives.`,
);
