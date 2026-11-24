/**
 * Checks what bundles keep of the npm package built in `npm/`, as a web
 * application's bundler would resolve it, through the package's `exports`
 * and its `sideEffects` field: esbuild bundles each conversion of the guide
 * on smaller bundles, minified, then compressed with gzip.
 *
 * - A conversion with the `./core` entry point keeps no module of a format,
 *   a preset, or a function it does not import: no other reader or writer,
 *   no validation of options without `prepareOptions()`, no metadata of the
 *   presets, no loss analysis without `convertDetailed()`. A reader imported
 *   alone keeps no writer.
 * - Inside a module that a bundle keeps, what it does not import is left out
 *   too, which modules alone do not show: a bundle that imports every preset
 *   weighs what the guide says more than one that imports one, and
 *   `OptionError` alone weighs less than 1 kB, without the table of option
 *   values beside it in `options.js`.
 * - The sizes that the guide gives are those of the bundles, within 3 %, or
 *   0.05 kB for the smallest, and so are its percentages, within 2 points;
 *   the sizes it gives in whole kB, within 3 % or half a kB. A size that
 *   moves further is a module kept by mistake, more often than a change to
 *   write in the guide.
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
/** The most that `OptionError` imported alone may weigh, minified. */
const OPTION_ERROR_BYTES = 1000;

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
      // esbuild gives the paths from the working directory: `npm/esm/…`
      // from the root of the repository.
      .map(([path]) => path.replace(/^(?:.*\/)?npm\/esm\//, "")),
  };
}

/** A cell of the guide's table, as `39.7 kB, 13.0 kB gzip (−42 %)`. */
const CELL = /^(\d+\.\d) kB, (\d+\.\d) kB gzip \(([−+])(\d+) %\)$/;

/**
 * The sizes of a row of the guide's table, for a preset and for
 * `prepareOptions()`: in kB, minified and with gzip, and the percentage.
 */
function documented(guide: string, row: string): number[][] {
  const line = guide.split("\n").find((text) => text.startsWith(`| ${row} `));
  if (line === undefined) {
    failures.push(`The guide has no row "${row}".`);
    return [];
  }
  return line.split("|").slice(2, 4).map((cell) => {
    const match = CELL.exec(cell.trim());
    if (match === null) {
      failures.push(
        `The guide's row "${row}" has a cell that does not read ` +
          `"39.7 kB, 13.0 kB gzip (−42 %)", with a minus sign: ${cell.trim()}`,
      );
      return [];
    }
    return [
      Number(match[1]),
      Number(match[2]),
      (match[3] === "−" ? -1 : 1) * Number(match[4]),
    ];
  });
}

/**
 * Records a failure when a size the guide gives, `written`, differs from
 * the size of the bundle by more than 3 %, or than `rounding`, the half of
 * the unit it is written in.
 */
function compare(
  label: string,
  measured: number,
  written: number,
  rounding = 0.05,
): void {
  if (Math.abs(measured - written) > Math.max(0.03 * written, rounding)) {
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
  // The checks of modules compare names read from the paths that esbuild
  // gives: the bundle of the main entry point keeps its own modules, or the
  // names are not read, and no check of a module could fail.
  for (const module of ["mod.js", "conversion.js"]) {
    if (!references.convert.modules.includes(module)) {
      failures.push(
        `The bundle of convert() has no module ${module} among ` +
          `${references.convert.modules.slice(0, 3).join(", ")}…: ` +
          "the names of the modules are not read from their paths.",
      );
    }
  }
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
  const opening = guide.match(
    /about\s+(\d+) kB\s+minified\s+\((\d+) kB\s+with\s+gzip\)/,
  );
  if (opening === null) {
    failures.push("The guide no longer opens with the size of convert().");
  } else {
    compare(
      "convert(), rounded",
      kB(references.convert.size),
      +opening[1],
      0.5,
    );
    compare(
      "convert(), gzip, rounded",
      kB(references.convert.gzip),
      +opening[2],
      0.5,
    );
  }

  const kept = async (label: string, code: string[], absent: string[]) => {
    const result = await bundle(code.join("\n"));
    for (const module of absent) {
      if (result.modules.includes(module)) {
        failures.push(`${label}: the bundle keeps ${module}.`);
      }
    }
    return result;
  };

  await kept("A reader alone", [
    `import { greekReader } from "${P}/greek";`,
    "console.log(greekReader);",
  ], [
    ...NEVER,
    ...VALIDATION,
    "core.js",
    "encode.js",
    "prepared.js",
    "formats/greek_writer.js",
  ]);

  const optionError = await kept(
    "OptionError alone",
    [`import { OptionError } from "${P}/core";`, "console.log(OptionError);"],
    [...NEVER, "presets.js", "prepare_options.js", "prepared.js"],
  );
  if (optionError.size > OPTION_ERROR_BYTES) {
    failures.push(
      `OptionError alone: the bundle is ${optionError.size} bytes, more ` +
        `than ${OPTION_ERROR_BYTES}: it keeps the table of option values.`,
    );
  }

  // Every preset against one, for an application whose users choose.
  const presetCode = (presets: string, options: string) => [
    `import { convert } from "${P}/core";`,
    `import ${presets} from "${P}/presets";`,
    `import { greekReader } from "${P}/greek";`,
    `import { transliterationWriter } from "${P}/transliteration";`,
    `console.log(convert("λόγος", greekReader, transliterationWriter, ${options}));`,
  ];
  const onePreset = await kept(
    "One preset",
    presetCode("{ iso843Type2 }", "iso843Type2"),
    [...NEVER, ...VALIDATION],
  );
  const everyPreset = await kept(
    "Every preset",
    presetCode("* as presets", "Object.values(presets)[Date.now() % 8]"),
    [...NEVER, ...VALIDATION],
  );
  const every = guide.match(
    /imports\s+them\s+all,\s+which\s+adds\s+(\d+\.\d) kB\s+\((\d+\.\d) kB\s+with\s+gzip\)/,
  );
  if (every === null) {
    failures.push(
      "The guide no longer gives what every preset adds to one.",
    );
  } else {
    compare(
      "Every preset against one",
      kB(everyPreset.size - onePreset.size),
      Number(every[1]),
    );
    compare(
      "Every preset against one, gzip",
      kB(everyPreset.gzip - onePreset.gzip),
      Number(every[2]),
    );
  }

  // What the metadata of the presets adds to a bundle with one preset.
  const metadata = await bundle(
    [
      ...presetCode("{ iso843Type2 }", "iso843Type2"),
      `import { listPresetMetadata } from "${P}";`,
      "console.log(listPresetMetadata());",
    ].join("\n"),
  );
  const metadataSizes = [
    ...guide.matchAll(
      /metadata\s+of\s+(?:every\s+preset|the\s+presets),\s+about\s+(\d+) kB/g,
    ),
  ];
  if (metadataSizes.length === 0) {
    failures.push("The guide no longer gives the size of the metadata.");
  }
  for (const [, size] of metadataSizes) {
    compare(
      "The metadata of the presets",
      kB(metadata.size - onePreset.size),
      Number(size),
      0.5,
    );
  }

  /** The bundles of the table, by row and variant. */
  const measured = new Map<string, { size: number; gzip: number }>();
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
      const result = await kept(label, variant.code, variant.absent);
      measured.set(label, result);
      const [size, gzip, percent] = written[index] ?? [];
      if (percent === undefined) continue;
      compare(label, kB(result.size), size);
      compare(`${label}, gzip`, kB(result.gzip), gzip);
      const gain = Math.round((result.gzip / reference.gzip - 1) * 100);
      if (Math.abs(gain - percent) > 2) {
        failures.push(
          `${label}: the guide gives ${percent} %, the bundle ${gain} %.`,
        );
      }
    }
  }

  // The page of the opening, and what `prepareOptions()` adds to it.
  const page = measured.get("Greek to transliteration, with a preset");
  const prepared = measured.get(
    "Greek to transliteration, with prepareOptions()",
  );
  const pageSizes = guide.match(
    /one\s+preset\s+weighs\s+(\d+) kB\s+\((\d+) kB\s+with\s+gzip\)/,
  );
  const validation = guide.match(
    /into\s+the\s+bundle,\s+about\s+(\d+\.\d) kB\s+\((\d+\.\d) kB\s+with\s+gzip\)/,
  );
  if (page === undefined || prepared === undefined) {
    failures.push("The table has no row of Greek to transliteration.");
  } else if (pageSizes === null || validation === null) {
    failures.push(
      "The guide no longer gives the size of the page with one preset, " +
        "or what prepareOptions() adds to it.",
    );
  } else {
    compare("The page with one preset", kB(page.size), +pageSizes[1], 0.5);
    compare(
      "The page with one preset, gzip",
      kB(page.gzip),
      +pageSizes[2],
      0.5,
    );
    compare(
      "What prepareOptions() adds",
      kB(prepared.size - page.size),
      +validation[1],
    );
    compare(
      "What prepareOptions() adds, gzip",
      kB(prepared.gzip - page.gzip),
      +validation[2],
    );
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  console.error(
    "\nKeep out of these bundles what they do not import; update the guide " +
      "on smaller bundles only for a change of size that is meant.",
  );
  process.exit(1);
}
console.log(
  `${
    SCENARIOS.length * 2 + 4
  } bundles keep only what they import, at the sizes the guide gives.`,
);
