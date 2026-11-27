/**
 * Writes the reference of the conversion options (`docs/options.md`): for
 * each option, what its documentation says, its values, the default, an
 * example of what each value writes, and the presets that select it.
 *
 * Nothing is written by hand below the page's introduction. The texts are
 * the TSDoc of `src/options.ts`, the values and defaults those of the
 * library, the presets those of its registry, and each example is computed:
 * the first word of the probe text (`web/playground/option_probe.ts`) that
 * the value writes otherwise than the default does, shown whole, since in
 * Beta Code the signs before a letter are part of the word, in one
 * conversion for the whole table; the default writes the same words.
 *
 * It also checks that the README and Getting started give the number of
 * options, and the README that of their values, as the library has them.
 *
 * Run with `npm run docs:options`; `--check` fails when the page is out of
 * date, as `npm run check` does.
 */
import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
import {
  CONVERSION_OPTION_VALUES,
  type ConversionOptions,
  convert,
  DEFAULT_CONVERSION_OPTIONS,
  type Format,
  getPresetOptions,
  listPresetMetadata,
} from "../src/mod.ts";
import {
  requiredSettings,
  withSettings,
} from "../web/playground/option_catalogue.ts";
import { PROBE_GREEK } from "../web/playground/option_probe.ts";

const START = "<!-- BEGIN GENERATED OPTION REFERENCE -->";
const END = "<!-- END GENERATED OPTION REFERENCE -->";
const PAGE = new URL("../docs/options.md", import.meta.url);
const SOURCE = new URL("../src/options.ts", import.meta.url);

/** The interface that documents each group of options. */
const GROUP_INTERFACES: Readonly<Record<string, readonly string[]>> = {
  transliteration: ["TransliterationOptions"],
  greek: ["GreekOptions"],
  betaCode: ["BetaCodeOptions"],
  text: ["TextOptions"],
  diacritics: ["DiacriticOptions", "DiacriticClassOptions"],
};

const FORMAT_NAMES: Readonly<Record<Format, string>> = {
  greek: "Greek",
  "beta-code": "Beta Code",
  transliteration: "transliteration",
};

/**
 * The conversions tried for an example, in this order: the one that shows
 * the option on its own ground first.
 */
const PAIRS: readonly (readonly [Format, Format])[] = [
  ["greek", "transliteration"],
  ["greek", "greek"],
  ["greek", "beta-code"],
  ["transliteration", "greek"],
  ["beta-code", "greek"],
];
const PAIRS_BY_GROUP: Readonly<Record<string, readonly number[]>> = {
  transliteration: [0, 3, 1, 2, 4],
  greek: [1, 2, 3, 4, 0],
  betaCode: [2, 4, 0, 1, 3],
  text: [0, 1, 2, 3, 4],
  diacritics: [1, 0, 2, 3, 4],
};

const values = CONVERSION_OPTION_VALUES as unknown as Record<
  string,
  Record<string, readonly string[]>
>;
const defaults = DEFAULT_CONVERSION_OPTIONS as unknown as Record<
  string,
  Record<string, string | undefined>
>;

const documentation = readDocumentation(await readFile(SOURCE, "utf8"));
const page = await readFile(PAGE, "utf8");
const expected = replaceGeneratedSection(page, render());

// The READMEs and Getting started give the number of options, and the
// READMEs that of their values: they follow the library.
const counts = Object.values(CONVERSION_OPTION_VALUES).flatMap((group) =>
  Object.values(group as Record<string, readonly unknown[]>)
);
const optionCount = counts.length;
const valueCount = counts.reduce((sum, values) => sum + values.length, 0);
const stated: readonly [string, RegExp, number][] = [
  ["README.md", /\b(\d+) atomic options\b/, optionCount],
  ["README.md", /\bamong (\d+) values\b/, valueCount],
  ["python/README.md", /\b(\d+) atomic options\b/, optionCount],
  ["python/README.md", /\bamong (\d+) values\b/, valueCount],
  [
    "web/docs/src/content/docs/guide/getting-started.md",
    /\bThere are (\d+) of them\b/,
    optionCount,
  ],
];
for (const [path, pattern, count] of stated) {
  const text = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const found = text.match(pattern)?.[1];
  if (Number(found) !== count) {
    console.error(
      `${path} gives ${
        found ?? "no"
      } where the library has ${count} (${pattern}).`,
    );
    process.exit(1);
  }
}

if (process.argv.includes("--check")) {
  if (page !== expected) {
    console.error(
      "docs/options.md is out of date; run `npm run docs:options`.",
    );
    process.exit(1);
  }
} else {
  await writeFile(PAGE, expected);
}

function render(): string {
  const lines: string[] = [
    START,
    "<!-- This section is generated. Do not edit it directly. -->",
    "",
  ];
  for (const [group, options] of Object.entries(values)) {
    lines.push(`## \`${group}\``, "");
    const about = documentation.interfaces.get(GROUP_INTERFACES[group][0]);
    if (about !== undefined) lines.push(about, "");
    for (const [key, choices] of Object.entries(options)) {
      lines.push(...renderOption(group, key, choices));
    }
  }
  lines.push(END);
  return lines.join("\n");
}

function renderOption(
  group: string,
  key: string,
  choices: readonly string[],
): string[] {
  const property = documentation.properties.get(`${group}.${key}`);
  if (property === undefined) {
    throw new Error(`No documentation for ${group}.${key}.`);
  }
  const lines = [`### \`${group}.${key}\``, "", property.text, ""];
  // The documentation of the type says what each value does, when the type
  // is the option's own.
  const type = property.type === undefined
    ? undefined
    : documentation.types.get(property.type);
  if (type !== undefined && documentation.uses.get(property.type!) === 1) {
    lines.push(type, "");
  }
  const fallback = defaults[group][key];
  const others = choices.filter((value) => value !== fallback);
  // One conversion for the whole table, named in its head: the first, in
  // the group's order, that shows the most values.
  const [from, to, changes] = PAIRS_BY_GROUP[group].map((index) => {
    const [from, to] = PAIRS[index];
    const changes = new Map(others.flatMap((value) => {
      const change = example(group, key, value, from, to);
      return change === undefined ? [] : [[value, change] as const];
    }));
    return [from, to, changes] as const;
  }).reduce((best, next) => next[2].size > best[2].size ? next : best);
  // The default writes each word the other values change, once.
  const words = new Map<string, Change>();
  for (const change of changes.values()) {
    if (!words.has(change.word)) words.set(change.word, change);
  }
  lines.push(
    `| Value | ${capitalize(FORMAT_NAMES[from])} → ${
      FORMAT_NAMES[to]
    } | Presets |`,
    "| --- | --- | --- |",
  );
  for (const value of choices) {
    const isDefault = value === fallback;
    const shown = isDefault
      ? [...words.values()].map((change) =>
        conversion(change.word, change.before, from, to, change.was)
      ).join("<br>")
      : changes.has(value)
      ? conversion(
        changes.get(value)!.word,
        changes.get(value)!.after,
        from,
        to,
        changes.get(value)!.is,
      )
      : "";
    lines.push(
      `| \`"${value}"\`${isDefault ? " (default)" : ""} | ${shown} | ${
        presetsWith(group, key, value).map(code).join(", ")
      } |`,
    );
  }
  lines.push("");
  return lines;
}

/**
 * The presets that select `value`. A preset that leaves the option at its
 * default is not listed: the default may concern what its standard does not
 * cover, as the archaic koppa, which ISO 843 does not map.
 */
function presetsWith(group: string, key: string, value: string): string[] {
  return listPresetMetadata().map(({ id }) => id).filter((id) => {
    const options = (getPresetOptions(id) as Record<
      string,
      Record<string, string> | undefined
    >)[group];
    return options?.[key] === value;
  });
}

/**
 * A word and its writing, as the playground shows an example: `σφίγξ →
 * sphínks`, in the face of the texts (`conversion`, in theme.css), Beta
 * Code in code; then, if need be, the scalars that tell it apart. The
 * arrow does not break the line.
 */
function conversion(
  word: string,
  written: string,
  from: Format,
  to: Format,
  scalar?: string,
): string {
  const form = (text: string, format: Format) =>
    format === "beta-code"
      ? `<code>${html(text)}</code>`
      : format === "greek"
      ? `<span lang="el">${html(text)}</span>`
      : html(text);
  return `<span class="conversion">${
    form(word, from)
  }\u00a0<span class="to">→</span>\u00a0${form(written, to)}</span>${
    scalar === undefined ? "" : ` (${scalars(scalar)})`
  }`;
}

/** Text in HTML, in a table cell: its pipes would end the cell. */
function html(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll("|", "\\|");
}

interface Change {
  word: string;
  before: string;
  after: string;
  /** Where the two writings look alike, the characters that differ. */
  was?: string;
  is?: string;
}

/** What `value` changes in one conversion: the first word it writes otherwise. */
function example(
  group: string,
  key: string,
  value: string,
  from: Format,
  to: Format,
): Change | undefined {
  const chosen = { [group]: { [key]: value } } as ConversionOptions;
  // A value that requires another is shown with it, against the default
  // with that other alone (`longVowels: "grave-circumflex"`, which requires
  // `diacritics.accents: "remove"`).
  const required = requiredSettings(chosen);
  const options = withSettings(chosen, required);
  const base = withSettings({}, required);
  // One line at a time: the lines of the probe are separate texts.
  for (const greek of PROBE_GREEK.split("\n")) {
    const source = from === "greek" ? greek : attempt(greek, "greek", from);
    if (source === undefined) continue;
    const before = attempt(source, from, to, base);
    const after = attempt(source, from, to, options);
    if (before === undefined || after === undefined || before === after) {
      continue;
    }
    const change = firstChangedWord(source, before, after);
    if (change === undefined) continue;
    // Two writings the eye cannot tell apart are told by their scalars.
    if (change.before.normalize("NFC") === change.after.normalize("NFC")) {
      const [was, is] = firstDifference(change.before, change.after);
      return { ...change, was, is };
    }
    return change;
  }
  return undefined;
}

/**
 * The first word that two writings of one text write differently, with the
 * word it writes in the source. Words are what whitespace separates; the
 * punctuation that ends all three is left out, unless it is the change.
 */
function firstChangedWord(
  source: string,
  before: string,
  after: string,
): { word: string; before: string; after: string } | undefined {
  const words = (text: string) => text.split(/\s+/).filter(Boolean);
  const [from, was, is] = [words(source), words(before), words(after)];
  if (was.length !== is.length || from.length !== was.length) return undefined;
  const index = was.findIndex((word, at) => word !== is[at]);
  if (index === -1) return undefined;
  const end = /[.,;:·?!]$/;
  const trio = [from[index], was[index], is[index]];
  const bare = trio.map((word) => word.replace(end, ""));
  const [word, a, b] =
    trio.every((text) => end.test(text)) && bare[1] !== bare[2] ? bare : trio;
  return { word, before: a, after: b };
}

function attempt(
  text: string,
  from: Format,
  to: Format,
  options: ConversionOptions = {},
): string | undefined {
  try {
    return convert(text, from, to, options);
  } catch {
    // Some values only combine with others.
    return undefined;
  }
}

/** The first characters, with their marks, that differ between two texts. */
function firstDifference(before: string, after: string): [string, string] {
  const split = (text: string) =>
    [...new Intl.Segmenter("el", { granularity: "grapheme" }).segment(text)]
      .map(({ segment }) => segment);
  const [was, is] = [split(before), split(after)];
  const at = was.findIndex((segment, index) => segment !== is[index]);
  return [was[at] ?? "", is[at] ?? ""];
}

function scalars(text: string): string {
  return [...text].map((char) =>
    `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`
  ).join(" ");
}

/** Inline code, with a pipe written so that it does not end a table cell. */
function code(text: string): string {
  return `\`${text.replaceAll("|", "\\|")}\``;
}

function capitalize(text: string): string {
  return text[0].toUpperCase() + text.slice(1);
}

interface Documentation {
  /** The TSDoc of each option interface, by name. */
  interfaces: Map<string, string>;
  /** The TSDoc of each option, by path, and the name of its type. */
  properties: Map<string, { text: string; type: string | undefined }>;
  /** The TSDoc of each type alias, by name. */
  types: Map<string, string>;
  /** How many options have each type. */
  uses: Map<string, number>;
}

/** Reads the TSDoc of the option interfaces and of the types of options. */
function readDocumentation(source: string): Documentation {
  const file = ts.createSourceFile(
    "options.ts",
    source,
    ts.ScriptTarget.ES2022,
    true,
  );
  const interfaces = new Map<string, string>();
  const members = new Map<string, Map<string, ts.PropertySignature>>();
  const types = new Map<string, string>();
  for (const statement of file.statements) {
    if (ts.isInterfaceDeclaration(statement)) {
      const text = docOf(statement);
      if (text !== undefined) interfaces.set(statement.name.text, text);
      members.set(
        statement.name.text,
        new Map(
          statement.members.filter(ts.isPropertySignature).map((member) => [
            (member.name as ts.Identifier).text,
            member,
          ]),
        ),
      );
    } else if (ts.isTypeAliasDeclaration(statement)) {
      const text = docOf(statement);
      if (text !== undefined) types.set(statement.name.text, text);
    }
  }

  const properties = new Map<
    string,
    { text: string; type: string | undefined }
  >();
  const uses = new Map<string, number>();
  const paths = new Map<string, string[]>();
  for (const [group, names] of Object.entries(GROUP_INTERFACES)) {
    for (const key of Object.keys(values[group])) {
      const member = names.map((name) => members.get(name)?.get(key)).find((
        found,
      ) => found !== undefined);
      const text = member === undefined ? undefined : docOf(member);
      if (member === undefined || text === undefined) continue;
      const type = member.type !== undefined &&
          ts.isTypeReferenceNode(member.type)
        ? member.type.typeName.getText(file)
        : undefined;
      properties.set(`${group}.${key}`, { text, type });
      if (type !== undefined) {
        uses.set(type, (uses.get(type) ?? 0) + 1);
        paths.set(type, [...(paths.get(type) ?? []), `${group}.${key}`]);
      }
    }
  }

  // `{@link EtaTransliteration}` names the option that has this type.
  const link = (text: string) =>
    text.replace(/\{@link ([\w.]+)\}/g, (_, name: string) => {
      const options = paths.get(name);
      return `\`${options?.length === 1 ? options[0] : name}\``;
    });
  for (const [name, text] of interfaces) interfaces.set(name, link(text));
  for (const [name, text] of types) types.set(name, link(text));
  for (const [path, entry] of properties) {
    properties.set(path, { ...entry, text: link(entry.text) });
  }
  return { interfaces, properties, types, uses };
}

/** The TSDoc of a declaration, as Markdown paragraphs. */
function docOf(node: ts.Node): string | undefined {
  const [comment] = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
  if (comment === undefined) return undefined;
  const text = ts.getTextOfJSDocComment(comment.comment);
  // One line per paragraph: a table cell or a list item would not hold a
  // paragraph broken as the source breaks it.
  return text?.split(/\n\s*\n/).map((paragraph) =>
    paragraph.replace(/\s*\n\s*/g, " ").trim()
  ).join("\n\n");
}

function replaceGeneratedSection(source: string, generated: string): string {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start < 0 || end < start) {
    throw new Error("Option reference markers are missing or out of order.");
  }
  return source.slice(0, start) + generated + source.slice(end + END.length);
}
