import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = await mkdtemp(join(tmpdir(), "greek-conversion-types-"));

try {
  const packed = JSON.parse(execFileSync("npm", [
    "pack",
    "./npm",
    "--json",
    "--ignore-scripts",
    "--pack-destination",
    directory,
  ], { encoding: "utf8" }));

  execFileSync("npm", [
    "install",
    "--no-audit",
    "--no-fund",
    "--ignore-scripts",
    "--prefix",
    directory,
    join(directory, packed[0].filename),
    "typescript@5.9.3",
  ], { stdio: "inherit" });

  await writeFile(join(directory, "consumer.mts"), `
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
`);
  await writeFile(join(directory, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      target: "ES2022",
      strict: true,
      noEmit: true,
      skipLibCheck: false,
    },
    files: ["consumer.mts"],
  }));

  execFileSync(process.execPath, [
    join(directory, "node_modules/typescript/bin/tsc"),
    "--project",
    join(directory, "tsconfig.json"),
  ], { stdio: "inherit" });
  console.log("npm TypeScript consumer smoke test passed");
} finally {
  await rm(directory, { recursive: true, force: true });
}
