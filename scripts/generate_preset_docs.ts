import { readFile, writeFile } from "node:fs/promises";
import {
  getPresetOptions,
  listPresetMetadata,
  type PresetMetadata,
} from "../src/mod.ts";

const START = "<!-- BEGIN GENERATED PRESET REFERENCE -->";
const END = "<!-- END GENERATED PRESET REFERENCE -->";
const DOCUMENT = new URL("../docs/presets.md", import.meta.url);

const source = await readFile(DOCUMENT, "utf8");
const generated = renderPresetReference(listPresetMetadata());
const expected = replaceGeneratedSection(source, generated);

if (process.argv.includes("--check")) {
  if (source !== expected) {
    console.error(
      "docs/presets.md is out of date; run `npm run docs:presets`.",
    );
    process.exit(1);
  }
} else {
  await writeFile(DOCUMENT, expected);
}

function replaceGeneratedSection(source: string, generated: string): string {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start < 0 || end < start) {
    throw new Error(
      "Preset documentation markers are missing or out of order.",
    );
  }

  return source.slice(0, start) + generated + source.slice(end + END.length);
}

function renderPresetReference(metadata: readonly PresetMetadata[]): string {
  const summary = [
    START,
    "<!-- This section is generated. Do not edit it directly. -->",
    "",
    "| Preset | Description | Scope | Coverage | Out of scope | Reference |",
    "| --- | --- | --- | --- | --- | --- |",
    ...metadata.map((preset) => {
      const references = preset.references.map((reference) =>
        `[${escapeTable(reference.title)}](${reference.url})`
      ).join("; ");
      return `| \`${preset.id}\` | ${escapeTable(preset.description)} | ${
        preset.scope.map(escapeTable).join("; ")
      } | ${preset.coverage} | ${preset.outOfScopeBehavior} | ${references} |`;
    }),
    "",
  ];

  const details = metadata.flatMap((preset) => [
    `### \`${preset.id}\` — ${preset.name}`,
    "",
    `- **Authority:** ${preset.authority}`,
    `- **Scope:** ${preset.scope.join("; ")}`,
    `- **Coverage:** \`${preset.coverage}\``,
    `- **Out-of-scope behavior:** \`${preset.outOfScopeBehavior}\``,
    "",
    preset.description,
    "",
    "**References:**",
    "",
    ...preset.references.map((reference) =>
      `- [${reference.title}](${reference.url})`
    ),
    "",
    "**Contributed options:**",
    "",
    "```json",
    JSON.stringify(getPresetOptions(preset.id), null, 2),
    "```",
    "",
    "**Known limitations:**",
    "",
    ...preset.limitations.map((limitation) => `- ${limitation}`),
    "",
  ]);

  return [...summary, ...details, END].join("\n");
}

function escapeTable(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
