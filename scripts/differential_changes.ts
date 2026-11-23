/**
 * Lists the inputs of the comparison with the previous release
 * (`tests/differential_test.ts`) whose conversions changed and that `MEANT`
 * does not list yet, with the number of calls that changed and an example,
 * so that a change that is meant can be reviewed and listed:
 *
 *   node scripts/differential_changes.ts [--from greek]
 *
 * Every difference is shown once per input; `--all` shows each one.
 */
import { parseArgs } from "node:util";
import type { Format } from "../src/mod.ts";
import {
  compareConversions,
  compareConverters,
  type Difference,
  DIFFERENTIAL_FORMATS,
  optionSets,
} from "../tests/differential.ts";
import {
  CONVERTER_CONFIGURATIONS,
  converterInputs,
  differentialInputs,
} from "../tests/differential_inputs.ts";

const { values } = parseArgs({
  options: {
    from: { type: "string" },
    all: { type: "boolean", default: false },
  },
});
const formats = values.from === undefined
  ? DIFFERENTIAL_FORMATS
  : [values.from as Format];
for (const format of formats) {
  if (!DIFFERENTIAL_FORMATS.includes(format)) {
    console.error(`Unknown format: ${format}`);
    process.exit(2);
  }
}

const inputs = differentialInputs();
const sets = optionSets();
let total = 0;
for (const from of formats) {
  const differences: Difference[] = [
    ...compareConversions(inputs[from], from, sets, Infinity).differences,
    ...compareConverters(
      converterInputs(from),
      from,
      CONVERTER_CONFIGURATIONS,
      Infinity,
    ).differences,
  ];
  total += differences.length;
  const byInput = Map.groupBy(differences, (difference) => difference.input);
  for (const [input, changed] of byInput) {
    const labels = new Set(changed.map((difference) => difference.label));
    console.log(
      `${from} ${
        JSON.stringify(input)
      }: ${changed.length} calls, ${labels.size} sets of options`,
    );
    for (const difference of values.all ? changed : changed.slice(0, 1)) {
      console.log(`  ${difference.label}: ${difference.call}`);
      console.log(`    reference: ${difference.reference.slice(0, 300)}`);
      console.log(`    current:   ${difference.current.slice(0, 300)}`);
    }
  }
}
console.log(`${total} differences that MEANT does not list.`);
process.exit(total > 0 ? 1 : 0);
