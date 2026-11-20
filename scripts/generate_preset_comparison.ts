/**
 * Writes, in the guide's page on presets, how each transliteration preset
 * writes the letters, vowel pairs, digraphs, and marks on which the
 * conventions differ: the tables a reader compares before choosing one.
 * Each cell is what `convert()` returns, so the tables cannot drift from the
 * library.
 *
 * Run with `npm run docs:comparison`; `--check` fails when the page is out
 * of date, as `npm run check` does.
 */
import { readFile, writeFile } from "node:fs/promises";
import {
  convert,
  getPresetOptions,
  listPresetMetadata,
  type Preset,
} from "../src/mod.ts";

const START = "<!-- BEGIN GENERATED PRESET COMPARISON -->";
const END = "<!-- END GENERATED PRESET COMPARISON -->";
const PAGE = new URL(
  "../web/docs/src/content/docs/guide/presets.md",
  import.meta.url,
);

/** What is compared: few enough columns for a table to fit the page. */
const TABLES: readonly (readonly [string, readonly string[]])[] = [
  ["Letters", ["β", "η", "υ", "φ", "χ", "ω"]],
  ["Vowel pairs with upsilon", ["αυτός", "ευχή", "ούτε"]],
  ["Gamma before a velar, and the digraphs of Modern Greek", [
    "άγγελος",
    "αγκαλιά",
    "μπαμπάς",
    "ντομάτα",
  ]],
  ["Breathings, iota subscript, and accents", ["ἁ", "ἀ", "ᾳ", "ά", "ῶ"]],
];

/** The row of a conversion without a preset. */
const DEFAULTS = "No preset (the default)";

const page = await readFile(PAGE, "utf8");
const expected = replaceGeneratedSection(page, render());

if (process.argv.includes("--check")) {
  if (page !== expected) {
    console.error(
      "The preset comparison of guide/presets.md is out of date; run `npm run docs:comparison`.",
    );
    process.exit(1);
  }
} else {
  await writeFile(PAGE, expected);
}

function render(): string {
  const presets = listPresetMetadata().map(({ id }) => id).filter(
    writesTransliteration,
  );
  const lines = [
    START,
    "<!-- This section is generated. Do not edit it directly. -->",
    "",
  ];
  for (const [title, samples] of TABLES) {
    lines.push(
      `**${title}**`,
      "",
      `| Preset | ${samples.map(code).join(" | ")} |`,
      `| --- | ${samples.map(() => "---").join(" | ")} |`,
      // The defaults first: no preset names them.
      ...[undefined, ...presets].map((preset) =>
        `| ${preset === undefined ? DEFAULTS : code(preset)} | ${
          samples.map((sample) =>
            code(convert(sample, "greek", "transliteration", { preset }))
          ).join(" | ")
        } |`
      ),
      "",
    );
  }
  lines.push(END);
  return lines.join("\n");
}

/** A preset that sets only Beta Code options writes Beta Code. */
function writesTransliteration(preset: Preset): boolean {
  const groups = Object.keys(getPresetOptions(preset));
  return groups.length === 0 || groups.some((group) => group !== "betaCode");
}

function code(text: string): string {
  return `\`${text}\``;
}

function replaceGeneratedSection(source: string, generated: string): string {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start < 0 || end < start) {
    throw new Error("Preset comparison markers are missing or out of order.");
  }
  return source.slice(0, start) + generated + source.slice(end + END.length);
}
