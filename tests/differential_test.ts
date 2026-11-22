import { test } from "node:test";
import {
  compareConversions,
  compareConverters,
  describeDifference,
  type Difference,
  DIFFERENTIAL_FORMATS,
  optionSets,
} from "./differential.ts";
import {
  CONVERTER_CONFIGURATIONS,
  converterInputs,
  differentialInputs,
} from "./differential_inputs.ts";

/**
 * This tree against the previous release, published on npm (see
 * `differential.ts`), over the inputs of the repository
 * (`differential_inputs.ts`).
 */

function report(differences: Difference[]): string {
  return [
    `${differences.length} differences with the previous release:`,
    ...differences.slice(0, 10).map(describeDifference),
    "A change that is meant goes in MEANT (tests/differential.ts).",
  ].join("\n");
}

const SETS = optionSets();
const INPUTS = differentialInputs();

for (const from of DIFFERENTIAL_FORMATS) {
  test(`conversions from ${from} are those of the previous release`, () => {
    const { compared, differences } = compareConversions(
      INPUTS[from],
      from,
      SETS,
    );
    if (differences.length > 0) throw new Error(report(differences));
    if (compared < 10_000) throw new Error(`only ${compared} compared`);
  });
}

test("converters convert as those of the previous release", () => {
  const differences: Difference[] = [];
  for (const from of DIFFERENTIAL_FORMATS) {
    differences.push(
      ...compareConverters(
        converterInputs(from),
        from,
        CONVERTER_CONFIGURATIONS,
      ).differences,
    );
  }
  if (differences.length > 0) throw new Error(report(differences));
});
