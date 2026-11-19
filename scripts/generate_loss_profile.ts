/**
 * Writes, in the guide's page on presets, what each preset loses on two
 * reference texts, one monotonic and one polytonic: the table that answers
 * "does this convention convert back?" before a reader chooses one. The
 * losses are those `convertDetailed()` reports from Greek to the preset's
 * format, so the table cannot drift from the library.
 *
 * Run with `npm run docs:losses`; `--check` fails when the page is out of
 * date, as `npm run check` does.
 */
import { readFile, writeFile } from "node:fs/promises";
import {
  type ConversionLoss,
  convertDetailed,
  type Format,
  getPresetOptions,
  listPresetMetadata,
  type Preset,
} from "../src/mod.ts";
import { parse } from "../src/document.ts";

const START = "<!-- BEGIN GENERATED LOSS PROFILE -->";
const END = "<!-- END GENERATED LOSS PROFILE -->";
const PAGE = new URL(
  "../web/docs/src/content/docs/guide/presets.md",
  import.meta.url,
);

/**
 * The reference texts. Between them they have every mark a preset may drop:
 * accents, the diaeresis, and the digraphs of Modern Greek in the first;
 * both breathings, the three accents, the iota subscript, the diaeresis, and
 * a coronis in the second. Neither has a letter form such as `ϐ` or `ϲ`,
 * which only Greek output keeps under every preset.
 */
const MONOTONIC =
  "Η Αθήνα είναι η πρωτεύουσα της Ελλάδας· ο Ταΰγετος, το προϊόν, " +
  "ευχαριστώ, αυτός, άγγελος, μπαμπάς.";
const POLYTONIC = "Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν· " +
  "Ῥόδος, ᾠδή, εὖ, ἄϋλος, κἀγώ.";

/** What a loss is about, in the order the table names them. */
const KINDS = [
  "accents",
  "smooth breathing",
  "rough breathing",
  "iota subscript",
  "diaeresis",
  "coronis",
  "quantity",
  "the absence of a breathing",
  "the place of a breathing",
  "an added diaeresis",
  "letter case",
  "letter forms",
  "other characters",
] as const;
type Kind = typeof KINDS[number] | `the letters ${string}`;

const DIACRITIC_KINDS: Readonly<Record<string, Kind>> = {
  acute: "accents",
  grave: "accents",
  circumflex: "accents",
  smooth: "smooth breathing",
  rough: "rough breathing",
  "iota-subscript": "iota subscript",
  diaeresis: "diaeresis",
  coronis: "coronis",
  macron: "quantity",
  breve: "quantity",
};

const page = await readFile(PAGE, "utf8");
const expected = replaceGeneratedSection(page, render());

if (process.argv.includes("--check")) {
  if (page !== expected) {
    console.error(
      "The loss profile of guide/presets.md is out of date; run `npm run docs:losses`.",
    );
    process.exit(1);
  }
} else {
  await writeFile(PAGE, expected);
}

function render(): string {
  // The default transliteration first: no preset names it.
  const rows = [
    `| No preset (the default) | ${lost(MONOTONIC, "transliteration")} | ${
      lost(POLYTONIC, "transliteration")
    } |`,
    ...listPresetMetadata().map(({ id }) => {
      const to = targetOf(id);
      return `| \`${id}\` | ${lost(MONOTONIC, to, id)} | ${
        lost(POLYTONIC, to, id)
      } |`;
    }),
  ];
  return [
    START,
    "<!-- This section is generated. Do not edit it directly. -->",
    "",
    `- Monotonic: ${MONOTONIC}`,
    `- Polytonic: ${POLYTONIC}`,
    "",
    "| Preset | Lost from the monotonic text | Lost from the polytonic text |",
    "| --- | --- | --- |",
    ...rows,
    "",
    END,
  ].join("\n");
}

/** The format a preset writes: Beta Code if it sets only Beta Code options. */
function targetOf(preset: Preset): Format {
  const groups = Object.keys(getPresetOptions(preset));
  return groups.length > 0 && groups.every((group) => group === "betaCode")
    ? "beta-code"
    : "transliteration";
}

/** What `convertDetailed()` reports as lost, in words. */
function lost(text: string, to: Format, preset?: Preset): string {
  const { losses } = convertDetailed(text, "greek", to, { preset });
  if (losses.length === 0) return "Nothing";
  const document = parse(text, "greek");
  const kinds = new Set<Kind>();
  const letters = new Set<string>();
  for (const loss of losses) {
    const kind = kindOf(loss);
    if (kind !== undefined) kinds.add(kind);
    else {
      const token = document[loss.index];
      if (token.kind === "grapheme") letters.add(token.letter);
    }
  }
  const named: string[] = KINDS.filter((kind) => kinds.has(kind));
  if (letters.size > 0) {
    named.unshift(`the letters ${[...letters].sort().join(", ")}`);
  }
  const sentence = named.join("; ");
  return sentence[0].toUpperCase() + sentence.slice(1);
}

function kindOf(loss: ConversionLoss): Kind | undefined {
  switch (loss.code) {
    case "removed-diacritic":
      return DIACRITIC_KINDS[loss.diacritic ?? ""] ?? "other characters";
    case "inferred-breathing":
      return "the absence of a breathing";
    case "displaced-diacritic":
      return "the place of a breathing";
    case "added-diacritic":
      return "an added diaeresis";
    case "changed-case":
      return "letter case";
    case "removed-glyph-variant":
    case "added-glyph-variant":
      return "letter forms";
    case "unrepresented-grapheme":
      return undefined;
    default:
      return "other characters";
  }
}

function replaceGeneratedSection(source: string, generated: string): string {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start < 0 || end < start) {
    throw new Error("Loss profile markers are missing or out of order.");
  }
  return source.slice(0, start) + generated + source.slice(end + END.length);
}
