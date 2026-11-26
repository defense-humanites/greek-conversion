// Writes, as JSON lines, what the library returns in Node for the inputs and
// option sets of the repository's differential test (tests/differential.ts),
// so that python/scripts/differential.py can compare the Python package with
// it, engine by engine.
//
//   node python/scripts/differential_dump.ts > /tmp/expected.jsonl
//
// Each line: {from, to, set, options, input, convert, detailed}, where
// convert and detailed are {ok: value} or {error: {name, message}}. Positions
// are left in UTF-16 code units: the comparison converts them itself.

import { DIFFERENTIAL_FORMATS, optionSets } from "../../tests/differential.ts";
import { differentialInputs } from "../../tests/differential_inputs.ts";
import { convert, convertDetailed } from "../../src/mod.ts";

function attempt(run: () => unknown): unknown {
  try {
    return { ok: run() };
  } catch (error) {
    const e = error as Error;
    return { error: { name: e.name, message: e.message } };
  }
}

const sets = optionSets();
const inputs = differentialInputs();
const lines: string[] = [];
for (const from of DIFFERENTIAL_FORMATS) {
  for (const input of inputs[from]) {
    for (const to of DIFFERENTIAL_FORMATS) {
      for (const { label, options } of sets) {
        lines.push(JSON.stringify({
          from,
          to,
          set: label,
          options,
          input,
          convert: attempt(() => convert(input, from, to, options)),
          detailed: attempt(() => convertDetailed(input, from, to, options)),
        }));
      }
    }
  }
}
// The inputs above are all in the BMP. Characters outside it take two UTF-16
// code units and one Python character: some inputs again, with such
// characters inserted, test the conversion of positions.
const ASTRAL = ["\u{10140}", "\u{1F600}", "\u{1D504}", "\u{1D200}"];
let seed = 2026;
const draw = () =>
  (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (const from of DIFFERENTIAL_FORMATS) {
  for (const original of inputs[from].slice(0, 300)) {
    const chars = Array.from(original);
    for (let count = 0; count < 3; count++) {
      const at = Math.floor(draw() * (chars.length + 1));
      chars.splice(at, 0, ASTRAL[Math.floor(draw() * ASTRAL.length)]);
    }
    const input = chars.join("");
    for (const to of DIFFERENTIAL_FORMATS) {
      for (const { label, options } of sets.slice(0, 6)) {
        lines.push(JSON.stringify({
          from,
          to,
          set: `${label} (astral)`,
          options,
          input,
          convert: attempt(() => convert(input, from, to, options)),
          detailed: attempt(() => convertDetailed(input, from, to, options)),
        }));
      }
    }
  }
}
process.stdout.write(lines.join("\n") + "\n");
