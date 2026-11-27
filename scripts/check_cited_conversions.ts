/**
 * Checks the conversions that the documentation cites in its prose, outside
 * its examples: `ἀπ’ οὗ` → `ἀφ’ οὗ`, `Ἅιδῃ → Háidȩ̄`, "`ἐϛὶ` gives `ec̄ì`".
 * The examples are run by `scripts/check_examples.ts`; these are not code,
 * and nothing said under which options each one holds.
 *
 * A citation is two spellings joined by an arrow, between two code spans or
 * inside one, or by one of a few verbs ("gives", "reads back as",
 * "becomes"). It checks out when a conversion that its page can mean turns the
 * first spelling into the second:
 *
 * - between the formats the spellings are written in; where its paragraph
 *   speaks of Beta Code and not of transliteration, or the reverse, a Latin
 *   spelling is read as that format alone;
 * - under the defaults, or a preset that its paragraph, its section, or its
 *   page names, never another one;
 * - with the options named in its paragraph, list item, or table row, or in
 *   its section, examples included: one, two, or all of them.
 *
 * The comparison is made after NFC, since prose is typed, not copied from a
 * result. A fragment of a word (`αυ → av`, in a table of rules) checks out
 * when it is written so at the start or at the end of a word.
 *
 * The check proves that the documentation cites nothing the library cannot
 * return in the context where it is cited. It does not prove that the prose
 * names the right options: for that, an example says them and is run.
 *
 * What is not a conversion of the library, or needs more than options (a
 * converter, a rule of a standard that the library does not implement), is
 * listed in `NOT_CONVERSIONS` with its reason.
 *
 * Run with `node scripts/check_cited_conversions.ts`; `--list` prints every
 * citation with the conversion found for it.
 */
import { readdir, readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONVERSION_OPTION_VALUES,
  type ConversionOptions,
  convert,
  type Format,
  listPresetMetadata,
  type Preset,
} from "../src/mod.ts";
import { PYTHON_PAGES } from "../web/docs/src/documentations.ts";

const ROOT = new URL("../", import.meta.url);
const FOLDERS = [
  new URL("docs/", ROOT),
  new URL("web/docs/src/content/docs/", ROOT),
];
/** Folders of the site generated from elsewhere. */
const SKIPPED = new Set(["api", "reference"]);
/**
 * The Python pages written from TypeScript ones, whose sources this checks
 * (`web/docs/src/documentations.ts`).
 */
const PYTHON_GENERATED = new Set(
  PYTHON_PAGES.map(([, path]) =>
    path === "" ? "python/index.mdx" : `python/${path}.md`
  ),
);

/**
 * Citations that are not conversions of the library, by page and source
 * spelling, with the reason. A citation listed here and not found in its
 * page fails the check, so that the list cannot outlive its entries.
 */
const NOT_CONVERSIONS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "docs/ala-lc-conformance-corpus.md": {
    "γκ": "one spelling for each of three places in the word",
    "ΗΣΙΟΔΟΥ …": "the table's expectation, which the library does not meet",
    "κεῖται παρ’ Ἅιδῃ":
      "the table's expectation, which the library does not meet",
  },
  "docs/character-extensions.md": {
    "ΘϷΑ": "needs a converter with a custom character",
    "σα": "needs a converter with alpha out of its scope",
    "Ϸ": "the form of a custom character, not a conversion",
  },
  "docs/greek-unicode.md": {
    "ᾳ": "Unicode's uppercase mapping, not a conversion",
  },
  "docs/preset-conformance-corpus.md": {
    "αυ/ευ": "several spellings for each pair, by what follows it",
    "ΑΘΗΝΑ": "the expectation of BGN/PCGN, which the library does not meet",
  },
};

const values = CONVERSION_OPTION_VALUES as unknown as Record<
  string,
  Record<string, readonly string[]>
>;
const PRESETS = listPresetMetadata().map(({ id }) => id);

/** Letters that give a fragment a word to stand in. */
const BEFORE = ["α", "ε", "λ"];
const AFTER = ["α", "ο", "τ", "β", "ν", "ς"];

const SPAN = "`([^`\\n]+)`";
// "is written" and "is transliterated" are left out: their subject is often
// a part of the first spelling (the upsilon of `αὐτόν` is transliterated
// `y`), which an arrow never does.
const VERBS = ["gives", "reads back as", "reads as", "becomes"];
const BETWEEN = new RegExp(
  `${SPAN}(\\s*→\\s*|\\s+(?:${VERBS.join("|")})\\s+)(?=${SPAN})`,
  "g",
);

/** Names a page gives a preset besides its identifier. */
const PRESET_NAMES: readonly (readonly [RegExp, Preset])[] = [
  [/\bType 1\b/, "iso-843-type-1"],
  [/\bType 2\b/, "iso-843-type-2"],
  [/\bISO 843\b/, "iso-843-type-1"],
  [/\bISO 843\b/, "iso-843-type-2"],
  [/\bBnF\b/, "bnf-ancient"],
];

interface Citation {
  from: string;
  to: string;
  line: number;
  /** The paragraph, list item, or table row it stands in. */
  block: string;
  /** Its section, from one heading to the next, examples included. */
  section: string;
  page: string;
}

const failures: string[] = [];
const found: string[] = [];
let checked = 0;

for (const file of await pages()) {
  const name = relative(fileURLToPath(ROOT), file).replaceAll("\\", "/");
  const exempt = new Map(Object.entries(NOT_CONVERSIONS[name] ?? {}));
  const used = new Set<string>();
  for (const citation of citations(await readFile(file, "utf8"))) {
    const where = `${name}:${citation.line}`;
    const label = `\`${citation.from}\` → \`${citation.to}\``;
    if (exempt.has(citation.from)) {
      used.add(citation.from);
      continue;
    }
    checked++;
    const how = explain(citation);
    if (how === undefined) {
      failures.push(`${where}: ${label} is given by no conversion`);
    } else found.push(`${where}: ${label}  [${how}]`);
  }
  for (const source of exempt.keys()) {
    if (!used.has(source)) {
      failures.push(`${name}: NOT_CONVERSIONS lists \`${source}\`, not cited`);
    }
  }
}

if (process.argv.includes("--list")) console.log(found.join("\n"));
if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} cited conversion(s) do not check out.`);
  process.exit(1);
}
console.log(`${checked} conversions cited in prose check out.`);

/** The Markdown pages read: the reference and the guide. */
async function pages(): Promise<string[]> {
  const files: string[] = [];
  for (const folder of FOLDERS) {
    const root = fileURLToPath(folder);
    const entries = await readdir(folder, {
      recursive: true,
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || !/\.mdx?$/.test(entry.name)) continue;
      const path = `${entry.parentPath}/${entry.name}`.replaceAll("\\", "/");
      const file = relative(root, path).replaceAll("\\", "/");
      if (
        folder !== FOLDERS[0] &&
        (SKIPPED.has(file.split("/")[0]) || PYTHON_GENERATED.has(file))
      ) continue;
      files.push(path);
    }
  }
  return files.sort();
}

/** The citations of a page, outside its code blocks and generated parts. */
function* citations(text: string): Generator<Citation> {
  const lines = text.split("\n");
  let fenced = false;
  let generated = false;
  let section = 0;
  const sections: string[][] = [[]];
  let block: { start: number; section: number; lines: string[] } | undefined;
  const blocks: { start: number; section: number; lines: string[] }[] = [];
  const close = () => {
    if (block !== undefined) blocks.push(block);
    block = undefined;
  };
  lines.forEach((line, index) => {
    if (line.includes("<!-- BEGIN GENERATED")) generated = true;
    if (line.includes("<!-- END GENERATED")) {
      generated = false;
      return;
    }
    if (generated) return;
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      close();
      return;
    }
    if (!fenced && /^#{1,6} /.test(line)) {
      close();
      section = sections.push([]) - 1;
    }
    // The options of a section's examples are options it names.
    sections[section].push(line);
    if (fenced) return;
    // A table row and a list item stand on their own; a paragraph runs to
    // the next blank line.
    const starts = /^\s*(\||[-*] |\d+\. )/.test(line);
    if (line.trim() === "" || starts) close();
    if (line.trim() === "") return;
    block ??= { start: index + 1, section, lines: [] };
    block.lines.push(line);
    if (line.trimStart().startsWith("|")) close();
  });
  close();

  for (const { start, section: at, lines: rows } of blocks) {
    const context = rows.join("\n");
    for (const [from, to, offset] of pairs(context)) {
      const line = start + context.slice(0, offset).split("\n").length - 1;
      yield {
        from,
        to,
        line,
        block: context,
        section: sections[at].join("\n"),
        page: text,
      };
    }
  }
}

/** The pairs of spellings a block cites, with the offset of each. */
function* pairs(text: string): Generator<[string, string, number]> {
  // Two spans joined by an arrow or a verb, in chains: `a` → `b` → `c`.
  for (const match of text.matchAll(BETWEEN)) {
    yield* expand(match[1], match[3], match.index);
  }
  // An arrow inside one span: `a → b`, `a → b → c`.
  for (const match of text.matchAll(new RegExp(SPAN, "g"))) {
    const parts = match[1].split(/\s*→\s*/);
    for (let index = 0; index + 1 < parts.length; index++) {
      yield* expand(parts[index], parts[index + 1], match.index);
    }
  }
}

/**
 * `αυ/ευ/ου` → `au/eu/ou` cites three conversions, and `ϝʹ/ϛʹ/στʹ` → `6`
 * three with one result.
 */
function* expand(
  from: string,
  to: string,
  offset: number,
): Generator<[string, string, number]> {
  const [sources, targets] = [from.split("/"), to.split("/")];
  if (
    sources.length > 1 &&
    (sources.length === targets.length || targets.length === 1)
  ) {
    for (const [index, source] of sources.entries()) {
      yield [source, targets[index] ?? targets[0], offset];
    }
  } else yield [from, to, offset];
}

/** The conversion that gives a citation, in words, or undefined. */
function explain(citation: Citation): string | undefined {
  const { from, to, block } = citation;
  const nfc = (text: string) => text.normalize("NFC");
  // A part of a word: one letter, or two or three without marks. A longer
  // spelling, or one with marks, is a word, and is converted as it stands.
  const fragment = /^(\p{Script=Greek}\p{M}*|\p{Script=Greek}{2,3})$/u.test(
    from.normalize("NFD"),
  );
  for (const source of formats(from, to, block)) {
    for (const target of formats(to, from, block)) {
      for (const [options, name] of configurations(citation)) {
        const pair = `${source} to ${target}, ${name}`;
        const output = attempt(from, source, target, options);
        if (output !== undefined && nfc(output) === nfc(to)) return pair;
        if (!fragment || source !== "greek") continue;
        for (const after of AFTER) {
          const word = attempt(from + after, source, target, options);
          if (
            word !== undefined && nfc(word).startsWith(nfc(to)) &&
            nfc(word).length > nfc(to).length
          ) return `${pair}, before ${after}`;
        }
        for (const before of BEFORE) {
          const word = attempt(before + from, source, target, options);
          if (
            word !== undefined && nfc(word).endsWith(nfc(to)) &&
            nfc(word).length > nfc(to).length
          ) return `${pair}, after ${before}`;
        }
      }
    }
  }
  return undefined;
}

/**
 * The formats a spelling can be written in: Greek if it has a Greek letter;
 * any format if it has no letter. A Latin spelling is transliteration, and
 * can be Beta Code where its block speaks of Beta Code, or where it or the
 * spelling it is cited with has a sign that only Beta Code writes; it is
 * Beta Code alone where the block speaks of no transliteration.
 */
function formats(text: string, other: string, block: string): Format[] {
  if (/[\u0370-\u03FF\u1F00-\u1FFF]/.test(text)) {
    return ["greek", "transliteration"];
  }
  // A sign on its own, such as `;`, is written so in any format.
  if (!/\p{L}/u.test(text)) return ["greek", "beta-code", "transliteration"];
  const named = /Beta Code/.test(block);
  const latin = /transliterat|romaniz|Latin/i.test(block);
  if (named && !latin) return ["beta-code"];
  const signs = /[()/\\=|*#&+\d]/;
  return named || signs.test(text) || signs.test(other)
    ? ["transliteration", "beta-code"]
    : ["transliteration"];
}

/** The options a text names: `upsilon: "y"`, `greek.sigma: "lunate"`. */
function namedOptions(text: string): [string, string, string][] {
  const named = new Map<string, [string, string, string]>();
  for (const match of text.matchAll(/(\w+)(?:\.(\w+))?:\s*"([^"]+)"/g)) {
    const [, first, second, value] = match;
    const key = second ?? first;
    for (const [group, table] of Object.entries(values)) {
      if (second !== undefined && group !== first) continue;
      if (table[key]?.includes(value)) {
        named.set(`${group}.${key}=${value}`, [group, key, value]);
      }
    }
  }
  return [...named.values()];
}

/** The presets a text names, by identifier or by another name. */
function namedPresets(text: string): Preset[] {
  return PRESETS.filter((preset) =>
    text.includes(preset) ||
    PRESET_NAMES.some(([name, id]) => id === preset && name.test(text))
  );
}

/**
 * The options a citation can mean: the defaults and the presets that its
 * block, its section, or its page names, each alone and with the options
 * that its block or its section names, one at a time, two at a time, and
 * all those of the block together. What the block names comes first.
 */
function* configurations(
  { block, section, page }: Citation,
): Generator<[ConversionOptions, string]> {
  const own = namedOptions(block);
  const all = [...own];
  for (const option of namedOptions(section)) {
    if (!all.some((other) => other.join() === option.join())) all.push(option);
  }
  const sets: [string, string, string][][] = [[]];
  for (const one of all) sets.push([one]);
  for (const [index, one] of all.entries()) {
    for (const other of all.slice(index + 1)) {
      // Two values of one option cannot both hold.
      if (one[0] !== other[0] || one[1] !== other[1]) sets.push([one, other]);
    }
  }
  if (own.length > 2) sets.push(own);

  const presets: (Preset | undefined)[] = [...namedPresets(block), undefined];
  for (const preset of [...namedPresets(section), ...namedPresets(page)]) {
    if (!presets.includes(preset)) presets.push(preset);
  }
  for (const preset of presets) {
    for (const set of sets) {
      const options: Record<string, Record<string, string>> = {};
      for (const [group, key, value] of set) {
        (options[group] ??= {})[key] = value;
      }
      yield [
        { ...(preset === undefined ? {} : { preset }), ...options },
        [
          preset ?? "the defaults",
          ...set.map(([group, key, value]) => `${group}.${key}: "${value}"`),
        ].join(", "),
      ];
    }
  }
}

function attempt(
  text: string,
  from: Format,
  to: Format,
  options: ConversionOptions,
): string | undefined {
  try {
    return convert(text, from, to, options);
  } catch {
    // Some values only combine with others.
    return undefined;
  }
}
