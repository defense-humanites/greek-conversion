import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = await mkdtemp(join(tmpdir(), "greek-conversion-types-"));

try {
  const report = JSON.parse(execFileSync("npm", [
    "pack",
    "./npm",
    "--json",
    "--ignore-scripts",
    "--pack-destination",
    directory,
  ], { encoding: "utf8" }));
  // npm 12 keys the report by package name; earlier versions return an array.
  const [packed] = Array.isArray(report) ? report : Object.values(report);

  execFileSync("npm", [
    "install",
    "--no-audit",
    "--no-fund",
    "--ignore-scripts",
    "--prefix",
    directory,
    join(directory, packed.filename),
    "typescript@5.9.3",
  ], { stdio: "inherit" });

  await writeFile(
    join(directory, "consumer.mts"),
    `
import { createConverter } from "@humanities/greek-conversion";
import {
  applyGreekOrthography,
  encode,
  grapheme,
  parse,
  validateDocument,
  type ConversionOptions,
  type Document,
  type Grapheme,
  type ValidationCode,
} from "@humanities/greek-conversion/document";

const options: ConversionOptions = { preset: "ala-lc-modern" };
const document: Document = parse("ἄ", "greek", options);
const view: Document = applyGreekOrthography(document, options);
const letter: Grapheme = grapheme("alpha", false, ["acute"]);
const codes: ValidationCode[] = validateDocument([letter]).map((item) => item.code);
const output: string = encode(view, "greek", options);
const converter = createConverter({ preset: "ala-lc-modern" });
converter.convert(output, "greek", "transliteration");
void codes;

import {
  convert,
  convertDetailed,
  prepareOptions,
  type PreparedOptions,
  type Reader,
  type ReaderWriter,
} from "@humanities/greek-conversion/core";
import { greekFormat, greekReader } from "@humanities/greek-conversion/greek";
import { betaCodeWriter } from "@humanities/greek-conversion/beta-code";
import { transliterationFormat } from "@humanities/greek-conversion/transliteration";
import { alaLcModern } from "@humanities/greek-conversion/presets";

const reader: Reader = greekReader;
const both: ReaderWriter = transliterationFormat;
// @ts-expect-error: the types are nominal, and an object is not a reader.
const forged: Reader = {};
void forged;
// @ts-expect-error: prepared options are not a reader.
convert("ἄ", alaLcModern, betaCodeWriter);
const prepared: PreparedOptions = prepareOptions({ preset: "ala-lc-modern" });
const beta: string = convert("ἄ", reader, betaCodeWriter, alaLcModern);
convertDetailed(beta, greekFormat, both, prepared);
// @ts-expect-error: the core functions take prepared options only.
convert("ἄ", reader, betaCodeWriter, { preset: "ala-lc-modern" });
// @ts-expect-error: a reader is not a writer.
convert("ἄ", reader, greekReader);
// @ts-expect-error: convertDetailed() takes whole formats.
convertDetailed("ἄ", greekReader, both);
`,
  );
  // CommonJS code: TypeScript, from 5.8, resolves the types of the ES modules
  // that require() loads.
  await writeFile(
    join(directory, "consumer.cts"),
    `
import { convert } from "@humanities/greek-conversion";
import { prepareOptions } from "@humanities/greek-conversion/core";
import type { Document } from "@humanities/greek-conversion/document";

const output: string = convert("a)/nqrwpos", "beta-code", "greek", prepareOptions({}));
let document: Document | undefined;
void output;
void document;
`,
  );
  await writeFile(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        target: "ES2022",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      files: ["consumer.mts", "consumer.cts"],
    }),
  );

  execFileSync(process.execPath, [
    join(directory, "node_modules/typescript/bin/tsc"),
    "--project",
    join(directory, "tsconfig.json"),
  ], { stdio: "inherit" });
  console.log("npm TypeScript consumer smoke test passed");

  // CommonJS code loads every entry point with require(), and gets the same
  // module as import(): there is one copy of the library.
  await writeFile(
    join(directory, "consumer.cjs"),
    `
const assert = require("node:assert/strict");
const main = require("@humanities/greek-conversion");
const { encode, parse } = require("@humanities/greek-conversion/document");
const core = require("@humanities/greek-conversion/core");
const { greekWriter } = require("@humanities/greek-conversion/greek");
const { betaCodeReader } = require("@humanities/greek-conversion/beta-code");
const { transliterationWriter } = require("@humanities/greek-conversion/transliteration");
const { alaLcModern } = require("@humanities/greek-conversion/presets");

assert.equal(main.convert("a)/nqrwpos", "beta-code", "greek"), "ἄνθρωπος");
assert.equal(encode(parse("a)/nqrwpos", "beta-code"), "greek"), "ἄνθρωπος");
assert.equal(core.convert("a)/nqrwpos", betaCodeReader, greekWriter), "ἄνθρωπος");
assert.equal(
  core.convert("Βίος Μπάλα", require("@humanities/greek-conversion/greek").greekReader, transliterationWriter, alaLcModern),
  "Vios Bala",
);
import("@humanities/greek-conversion").then((imported) => {
  assert.equal(imported, main);
  console.log("npm CommonJS smoke test passed");
});
`,
  );
  execFileSync(process.execPath, [join(directory, "consumer.cjs")], {
    stdio: "inherit",
  });
} finally {
  await rm(directory, { recursive: true, force: true });
}
