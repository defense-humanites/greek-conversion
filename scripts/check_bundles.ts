/**
 * Checks what bundles keep of the npm package built in `npm/`, as a web
 * application's bundler would resolve it, through the package's `exports`
 * and its `sideEffects` field: esbuild bundles each conversion of the guide
 * on smaller bundles, minified, then compressed with gzip.
 *
 * - A conversion with the `./core` entry point keeps no module of a format,
 *   a preset, or a function it does not import: no other reader or writer,
 *   no validation of options without `prepareOptions()`, no metadata of the
 *   presets, no loss analysis without `convertDetailed()`, no conversion of
 *   the Greek passages of a text without `convertGreekPassages()`. A reader
 *   imported alone keeps no writer.
 * - Inside a module that a bundle keeps, what it does not import is left out
 *   too, which modules alone do not show: a bundle that imports every preset
 *   weighs what the guide says more than one that imports one, and
 *   `OptionError` alone weighs less than 1 kB, without the table of option
 *   values beside it in `options.js`.
 * - No bundle keeps a top-level declaration that nothing in it reaches,
 *   which esbuild keeps when it cannot prove its value pure: a table built
 *   by a call, which a function annotated `@__PURE__` lets it leave out.
 *   Such a table weighs from a few bytes to a kilobyte, less than the sizes
 *   of the guide change from one release to the next.
 * - The sizes that the guide gives are those of the bundles, within 3 % plus
 *   half the unit they are written in, and so are its percentages, within 2
 *   points. The checks above keep out what a bundle does not use; the guide
 *   follows the bundles, and `--write` writes their sizes into it.
 *
 * Run with `node scripts/check_bundles.ts` after `npm run npm:build`;
 * `npm run npm:check` does both. `npm run docs:bundles` builds the package
 * and writes the sizes of its bundles into the guide, as before a release.
 */
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { SourceMap } from "node:module";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import ts from "typescript";

const ROOT = new URL("../", import.meta.url);
const GUIDE = new URL(
  "web/docs/src/content/docs/guide/smaller-bundles.md",
  ROOT,
);
const P = "@humanities/greek-conversion";
/** Whether to write the sizes of the bundles into the guide. */
const WRITE = process.argv.includes("--write");

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
  "passages.js",
];
/** Modules that only `prepareOptions()` brings. */
const VALIDATION = ["prepare_options.js", "presets.js", "options.js"];
/**
 * The module of the accent of καί, one of the steps that only options
 * outside the presets take, which their resolution links (see
 * `src/steps.ts`): a conversion with a preset keeps it only for the accents
 * that the loss analysis imports from it. The other steps are functions of
 * modules that every conversion keeps.
 */
const STEPS = ["kai_accent.js"];
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
const PACKAGE = fileURLToPath(new URL("npm/", ROOT));
const failures: string[] = [];
let bundles = 0;

/** A top-level statement of a bundle, which may declare names. */
interface Unit {
  node: ts.Node;
  names: string[];
  /** The units whose names it reads, and those whose names it assigns. */
  reads: Set<Unit>;
  writes: Set<Unit>;
}

/** Whether an identifier is assigned, as `x = …` or `x ||= …`. */
function isAssigned(node: ts.Identifier): boolean {
  const parent = node.parent;
  return ts.isBinaryExpression(parent) && parent.left === node &&
    parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
}

/**
 * The top-level declarations of a minified bundle that nothing it runs
 * reaches. What runs is the call of the bundle, which logs a result, and a
 * statement that names no declaration. A declaration is reached when a
 * statement reached reads or assigns it; a statement that declares nothing,
 * such as one that freezes a class, is reached with a declaration it reads;
 * and a statement that assigns a declaration reached is reached too, as the
 * static fields of `Codec` and `Prepared`, which assign the functions that
 * read their private fields. The checker of TypeScript resolves the names,
 * which the minifier gives to locals as well.
 */
function unreached(code: string): ts.Node[] {
  const name = "/bundle.js";
  const source = ts.createSourceFile(
    name,
    code,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS,
  );
  const host: ts.CompilerHost = {
    getSourceFile: (file) => file === name ? source : undefined,
    fileExists: (file) => file === name,
    readFile: () => undefined,
    writeFile: () => {},
    getDefaultLibFileName: () => "/lib.d.ts",
    getCurrentDirectory: () => "/",
    getCanonicalFileName: (file) => file,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };
  const checker = ts.createProgram([name], {
    allowJs: true,
    noLib: true,
    noResolve: true,
    types: [],
  }, host).getTypeChecker();

  const units: Unit[] = [];
  const bySymbol = new Map<ts.Symbol, Unit>();
  const unit = (node: ts.Node): Unit => {
    const made: Unit = { node, names: [], reads: new Set(), writes: new Set() };
    units.push(made);
    return made;
  };
  const declare = (binding: ts.BindingName, declaring: Unit): void => {
    if (ts.isIdentifier(binding)) {
      declaring.names.push(binding.text);
      const symbol = checker.getSymbolAtLocation(binding);
      if (symbol !== undefined) bySymbol.set(symbol, declaring);
      return;
    }
    for (const element of binding.elements) {
      if (!ts.isOmittedExpression(element)) declare(element.name, declaring);
    }
  };
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        declare(declaration.name, unit(declaration));
      }
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) && statement.name !== undefined
    ) {
      declare(statement.name, unit(statement));
    } else {
      unit(statement);
    }
  }

  const names = new Set(units.flatMap((each) => each.names));
  for (const each of units) {
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && names.has(node.text)) {
        const parent = node.parent;
        const symbol =
          ts.isShorthandPropertyAssignment(parent) && parent.name === node
            ? checker.getShorthandAssignmentValueSymbol(parent)
            : checker.getSymbolAtLocation(node);
        const target = symbol === undefined ? undefined : bySymbol.get(symbol);
        if (target !== undefined && target !== each) {
          (isAssigned(node) ? each.writes : each.reads).add(target);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(each.node);
  }

  // The call of the bundle, and the statements that name no declaration.
  const reached = new Set(units.filter((each) =>
    each.names.length === 0 &&
    ((each.reads.size === 0 && each.writes.size === 0) ||
      (ts.isExpressionStatement(each.node) &&
        each.node.expression.getText(source).startsWith("console.log(")))
  ));
  const some = (targets: Set<Unit>) =>
    [...targets].some((target) => reached.has(target));
  for (let grown = true; grown;) {
    grown = false;
    for (const each of units) {
      const reaches = reached.has(each) || some(each.writes) ||
        (each.names.length === 0 && some(each.reads));
      if (!reaches) continue;
      for (const target of [each, ...each.reads, ...each.writes]) {
        if (!reached.has(target)) {
          reached.add(target);
          grown = true;
        }
      }
    }
  }
  return units.filter((each) => each.names.length > 0 && !reached.has(each))
    .map((each) => each.node);
}

/**
 * What a bundle keeps that nothing in it reaches, by name, source, and
 * bytes: the bundle is built again with a source map, which gives the
 * module of `npm/esm/` and the line of each declaration.
 */
async function located(contents: string, nodes: ts.Node[]): Promise<string[]> {
  const result = await build({
    stdin: { contents, resolveDir: directory, loader: "js" },
    bundle: true,
    minify: true,
    format: "esm",
    write: false,
    sourcemap: "external",
    outdir: directory,
    logLevel: "error",
  });
  const output = result.outputFiles.find((file) => file.path.endsWith(".map"));
  const map = new SourceMap(JSON.parse(output?.text ?? "{}"));
  return Promise.all(nodes.map(async (node) => {
    const source = node.getSourceFile();
    const text = node.getText(source);
    const bytes = `${Buffer.byteLength(text)} bytes`;
    const { line, character } = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    const entry = map.findEntry(line, character);
    if (!("originalSource" in entry)) {
      return `\`${text.slice(0, 40)}…\` (${bytes})`;
    }
    const path = resolve(directory, entry.originalSource);
    const declaration = (await readFile(path, "utf8")).split("\n")[
      entry.originalLine
    ];
    const name = /\b(?:const|let|var|function|class)\s+([\w$]+)/.exec(
      declaration ?? "",
    )?.[1] ?? `\`${text.slice(0, 40)}…\``;
    // The modules of `npm/esm/` are those of `src/`, compiled.
    const module = relative(join(PACKAGE, "esm"), path);
    const where = module.startsWith("..")
      ? relative(PACKAGE, path)
      : `src/${module.replace(/\.js$/, ".ts")}`;
    return `${name}, in ${where} (${bytes})`;
  }));
}

/**
 * A bundle's size, minified then compressed, and the modules it keeps;
 * records what it keeps that nothing in it reaches.
 */
async function bundle(
  label: string,
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
  bundles += 1;
  const output = result.outputFiles[0];
  const nodes = unreached(output.text);
  if (nodes.length > 0) {
    for (const declaration of await located(contents, nodes)) {
      failures.push(
        `${label}: the bundle keeps ${declaration}, which nothing in it ` +
          "reaches: esbuild cannot prove its value pure.",
      );
    }
  }
  const [meta] = Object.values(result.metafile.outputs);
  return {
    size: output.contents.length,
    gzip: gzipSync(output.contents, { level: 9 }).length,
    modules: Object.entries(meta.inputs)
      .filter(([, input]) => input.bytesInOutput > 0)
      // esbuild gives the paths from the working directory: `npm/esm/…`
      // from the root of the repository.
      .map(([path]) => path.replace(/^(?:.*\/)?npm\/esm\//, "")),
  };
}

/**
 * A size or a percentage that the guide gives: what the bundles measure,
 * in bytes or in percent, how and where the guide writes it.
 */
interface Figure {
  label: string;
  measured: number;
  /** kB with a decimal, whole kB, or a percentage with its sign. */
  kind: "tenths" | "whole" | "percent";
  start: number;
  end: number;
}

const figures: Figure[] = [];

/**
 * Records the figure that the group `group` of `match` holds, a match of a
 * regular expression with the flag `d`.
 */
function figure(
  label: string,
  measured: number,
  match: RegExpMatchArray,
  group: number,
  kind: Figure["kind"],
): void {
  const [start, end] = match.indices?.[group] ?? [0, 0];
  figures.push({ label, measured, kind, start, end });
}

/** A figure as the guide writes it, from what the bundles measure. */
function written(figure: Figure): string {
  switch (figure.kind) {
    case "tenths":
      return (Math.round(figure.measured / 100) / 10).toFixed(1);
    case "whole":
      return String(Math.round(figure.measured / 1000));
    case "percent":
      return `${figure.measured < 0 ? "−" : "+"}${Math.abs(figure.measured)}`;
  }
}

/**
 * Whether a figure of the guide, `text`, is further from the bundles than
 * 3 % plus half its unit, or 2 points for a percentage.
 */
function drifts(figure: Figure, text: string): boolean {
  if (figure.kind === "percent") {
    const percent = (text.startsWith("−") ? -1 : 1) * Number(text.slice(1));
    return Math.abs(figure.measured - percent) > 2;
  }
  const size = Number(text);
  const unit = figure.kind === "whole" ? 1 : 0.1;
  return Math.abs(figure.measured / 1000 - size) > 0.03 * size + unit / 2;
}

/** A row of the guide's table, as `| Greek to Beta Code | 35.7 kB, … |`. */
const ROW =
  /^\| (.+?) +\| (\d+\.\d) kB, (\d+\.\d) kB gzip \(([−+]\d+) %\) +\| (\d+\.\d) kB, (\d+\.\d) kB gzip \(([−+]\d+) %\) +\|$/dgm;

/**
 * The guide with its table of bundles aligned again, once its sizes are
 * written: each cell padded to the widest of its column.
 */
function aligned(guide: string): string {
  const lines = guide.split("\n");
  const row = lines.findIndex((line) =>
    line.startsWith(`| ${SCENARIOS[0].row} `)
  );
  if (row === -1) return guide;
  let first = row;
  while (lines[first - 1]?.startsWith("|")) first -= 1;
  let last = row;
  while (lines[last + 1]?.startsWith("|")) last += 1;
  const cells = lines.slice(first, last + 1).map((line) =>
    line.slice(1, -1).split("|").map((cell) => cell.trim())
  );
  const rule = (cell: string) => /^-+$/.test(cell);
  const widths = cells[0].map((_, column) =>
    Math.max(
      ...cells.map((each) => rule(each[column]) ? 3 : each[column].length),
    )
  );
  lines.splice(
    first,
    cells.length,
    ...cells.map((each) =>
      `| ${
        each.map((cell, column) =>
          rule(cell) ? "-".repeat(widths[column]) : cell.padEnd(widths[column])
        ).join(" | ")
      } |`
    ),
  );
  return lines.join("\n");
}

try {
  await mkdir(join(directory, "node_modules", "@humanities"), {
    recursive: true,
  });
  await symlink(PACKAGE, join(directory, "node_modules", P), "dir");
  const guide = await readFile(GUIDE, "utf8");

  const references = {
    convert: await bundle(
      "convert()",
      `import { convert } from "${P}";\n` +
        `console.log(convert("λόγος", "greek", "transliteration", { preset: "iso-843-type-2" }));`,
    ),
    convertDetailed: await bundle(
      "convertDetailed()",
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
  const intro = guide.match(
    /`convert\(\)`\s+\((\d+\.\d) kB, (\d+\.\d) kB with gzip\), or\s+`convertDetailed\(\)` \((\d+\.\d) kB, (\d+\.\d) kB\)/d,
  );
  if (intro === null) {
    failures.push(
      "The guide no longer gives the sizes of the main entry point.",
    );
  } else {
    figure("convert()", references.convert.size, intro, 1, "tenths");
    figure("convert(), gzip", references.convert.gzip, intro, 2, "tenths");
    const detailed = references.convertDetailed;
    figure("convertDetailed()", detailed.size, intro, 3, "tenths");
    figure("convertDetailed(), gzip", detailed.gzip, intro, 4, "tenths");
  }
  const opening = guide.match(
    /about\s+(\d+) kB\s+minified\s+\((\d+) kB\s+with\s+gzip\)/d,
  );
  if (opening === null) {
    failures.push("The guide no longer opens with the size of convert().");
  } else {
    const { size, gzip } = references.convert;
    figure("convert(), rounded", size, opening, 1, "whole");
    figure("convert(), gzip, rounded", gzip, opening, 2, "whole");
  }

  const kept = async (label: string, code: string[], absent: string[]) => {
    const result = await bundle(label, code.join("\n"));
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
    /imports\s+them\s+all,\s+which\s+adds\s+(\d+\.\d) kB\s+\((\d+\.\d) kB\s+with\s+gzip\)/d,
  );
  if (every === null) {
    failures.push(
      "The guide no longer gives what every preset adds to one.",
    );
  } else {
    const label = "Every preset against one";
    figure(label, everyPreset.size - onePreset.size, every, 1, "tenths");
    const gzip = everyPreset.gzip - onePreset.gzip;
    figure(`${label}, gzip`, gzip, every, 2, "tenths");
  }

  // What the metadata of the presets adds to a bundle with one preset.
  const metadata = await bundle(
    "The metadata of the presets",
    [
      ...presetCode("{ iso843Type2 }", "iso843Type2"),
      `import { listPresetMetadata } from "${P}";`,
      "console.log(listPresetMetadata());",
    ].join("\n"),
  );
  const metadataSizes = [
    ...guide.matchAll(
      /metadata\s+of\s+(?:every\s+preset|the\s+presets),\s+about\s+(\d+) kB/dg,
    ),
  ];
  if (metadataSizes.length === 0) {
    failures.push("The guide no longer gives the size of the metadata.");
  }
  for (const match of metadataSizes) {
    const label = "The metadata of the presets";
    figure(label, metadata.size - onePreset.size, match, 1, "whole");
  }

  /** The rows of the guide's table, by name. */
  const rows = new Map(
    [...guide.matchAll(ROW)].map((match) => [match[1], match]),
  );
  /** The bundles of the table, by row and variant. */
  const measured = new Map<string, { size: number; gzip: number }>();
  for (const scenario of SCENARIOS) {
    const reference = references[scenario.function];
    const row = rows.get(scenario.row);
    if (row === undefined) {
      failures.push(
        guide.includes(`\n| ${scenario.row} `)
          ? `The guide's row "${scenario.row}" has a cell that does not ` +
            `read "39.7 kB, 13.0 kB gzip (−42 %)", with a minus sign.`
          : `The guide has no row "${scenario.row}".`,
      );
    }
    const variants = [
      {
        name: "a preset",
        code: [
          `import { ${scenario.function} } from "${P}/core";`,
          `import { iso843Type2 } from "${P}/presets";`,
          ...scenario.imports,
          `console.log(${scenario.calls("iso843Type2")});`,
        ],
        absent: [
          ...NEVER,
          ...VALIDATION,
          ...(scenario.function === "convert" ? STEPS : []),
          ...scenario.absent,
        ],
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
      if (row === undefined) continue;
      const group = 2 + 3 * index;
      const gain = Math.round((result.gzip / reference.gzip - 1) * 100);
      figure(label, result.size, row, group, "tenths");
      figure(`${label}, gzip`, result.gzip, row, group + 1, "tenths");
      figure(
        `${label}, gzip against the main entry point`,
        gain,
        row,
        group + 2,
        "percent",
      );
    }
  }

  // The page of the opening, and what `prepareOptions()` adds to it.
  const page = measured.get("Greek to transliteration, with a preset");
  const prepared = measured.get(
    "Greek to transliteration, with prepareOptions()",
  );
  const pageSizes = guide.match(
    /one\s+preset\s+weighs\s+(\d+) kB\s+\((\d+) kB\s+with\s+gzip\)/d,
  );
  const validation = guide.match(
    /into\s+the\s+bundle,\s+about\s+(\d+\.\d) kB\s+\((\d+\.\d) kB\s+with\s+gzip\)/d,
  );
  if (page === undefined || prepared === undefined) {
    failures.push("The table has no row of Greek to transliteration.");
  } else if (pageSizes === null || validation === null) {
    failures.push(
      "The guide no longer gives the size of the page with one preset, " +
        "or what prepareOptions() adds to it.",
    );
  } else {
    const label = "The page with one preset";
    figure(label, page.size, pageSizes, 1, "whole");
    figure(`${label}, gzip`, page.gzip, pageSizes, 2, "whole");
    const adds = "What prepareOptions() adds";
    figure(adds, prepared.size - page.size, validation, 1, "tenths");
    figure(`${adds}, gzip`, prepared.gzip - page.gzip, validation, 2, "tenths");
  }

  if (WRITE) {
    let text = guide;
    for (const each of [...figures].sort((a, b) => b.start - a.start)) {
      text = text.slice(0, each.start) + written(each) + text.slice(each.end);
    }
    text = aligned(text);
    if (text !== guide) await writeFile(GUIDE, text);
    console.log(
      text === guide
        ? "The guide on smaller bundles gives the sizes of the bundles."
        : "The guide on smaller bundles now gives the sizes of the bundles.",
    );
  } else {
    for (const each of figures) {
      const text = guide.slice(each.start, each.end);
      if (!drifts(each, text)) continue;
      const unit = each.kind === "percent" ? "%" : "kB";
      const is = each.kind === "percent" ? "" : " is";
      failures.push(
        `${each.label}: the guide gives ${text} ${unit}, the bundle${is} ` +
          `${written(each)} ${unit}.`,
      );
    }
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  console.error(
    "\nKeep out of these bundles what they do not use: a table that a " +
      "bundle keeps for nothing is built in a function annotated " +
      "`/* @__PURE__ */`. A change of size that is meant is written into " +
      "the guide on smaller bundles by `npm run docs:bundles`.",
  );
  process.exit(1);
}
if (!WRITE) {
  console.log(
    `${bundles} bundles keep only what they use, at the sizes the guide gives.`,
  );
}
