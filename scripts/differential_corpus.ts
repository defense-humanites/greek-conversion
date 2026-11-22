/**
 * Compares this tree with the previous release (see
 * `tests/differential.ts`) over a local corpus, one input per line, such as
 * the Bailly, whose license forbids publishing it in the repository:
 *
 *   node scripts/differential_corpus.ts corpus.txt [--from greek]
 *     [--every 10] [--sets presets|all]
 *
 * `--every n` keeps one line in n; `--sets presets` compares the defaults
 * and the presets only, `all` (the default) the options of the test as
 * well. For Greek, the lines are also compared once written in Beta Code
 * and in transliteration by the reference, with its defaults.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import * as reference from "greek-conversion-previous";
import type { Format } from "../src/mod.ts";
import {
  compareConversions,
  describeDifference,
  type Difference,
  DIFFERENTIAL_FORMATS,
  optionSets,
} from "../tests/differential.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    from: { type: "string", default: "greek" },
    every: { type: "string", default: "1" },
    sets: { type: "string", default: "all" },
  },
});
/** Stops with a message, as for a wrong command. */
function refuse(message: string): never {
  console.error(message);
  process.exit(2);
}

if (positionals.length !== 1) {
  refuse(
    "Usage: node scripts/differential_corpus.ts corpus.txt [--from greek] [--every n] [--sets presets|all]",
  );
}
const from = values.from as Format;
if (!DIFFERENTIAL_FORMATS.includes(from)) refuse(`Unknown format: ${from}`);
if (!/^[1-9][0-9]*$/.test(values.every)) {
  refuse(`--every takes a positive whole number, not ${values.every}`);
}
const every = Number(values.every);
if (values.sets !== "presets" && values.sets !== "all") {
  refuse(`--sets takes presets or all, not ${values.sets}`);
}
const lines = readFileSync(positionals[0], "utf8").split("\n").filter((
  line,
  index,
) => line !== "" && index % every === 0);
if (lines.length === 0) refuse(`No line to compare in ${positionals[0]}`);
const sets = values.sets === "presets"
  ? optionSets(0).filter(({ label }) =>
    label === "defaults" ||
    reference.listPresetMetadata().some(({ id }) => id === label)
  )
  : optionSets();

const sources: { format: Format; inputs: string[] }[] = [
  { format: from, inputs: lines },
];
if (from === "greek") {
  for (const format of DIFFERENTIAL_FORMATS.slice(1)) {
    sources.push({
      format,
      inputs: lines.map((line) => reference.convert(line, "greek", format)),
    });
  }
}

let compared = 0;
const differences: Difference[] = [];
const started = performance.now();
for (const { format, inputs } of sources) {
  const result = compareConversions(inputs, format, sets, 200);
  compared += result.compared;
  differences.push(...result.differences);
  console.log(
    `${format}: ${inputs.length} lines, ${result.compared} comparisons, ${result.differences.length} differences`,
  );
}
for (const difference of differences.slice(0, 20)) {
  console.log(describeDifference(difference));
}
console.log(
  `${compared} comparisons under ${sets.length} sets of options, ${differences.length} differences, in ${
    Math.round((performance.now() - started) / 1000)
  } s.`,
);
process.exit(differences.length > 0 ? 1 : 0);
