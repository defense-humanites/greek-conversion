// Writes, as JSON lines, what the library returns in Node for the inputs and
// option sets of the repository's differential test (tests/differential.ts),
// so that python/scripts/differential.py can compare the Python package with
// it, engine by engine.
//
//   node python/scripts/differential_dump.ts > /tmp/expected.jsonl
//
// Each line is one case: its operation (`op`), its arguments, and what each
// function returned, `{ok: value}` or `{error: {name, message,
// diagnostics?}}`. Positions are left in UTF-16 code units: the comparison
// converts them itself.
//
// - `convert`: `convert()` and `convertDetailed()`, for every input, pair of
//   formats, and option set; then again for inputs with characters outside
//   the BMP inserted, which take two UTF-16 code units and one Python
//   character, under the first six option sets.
// - `reencode`, `prepared`, `passages`, and `converter`: `reencode()`,
//   `convert()` with prepared options, `convertGreekPassages()` and its
//   detailed form, and converters' `convertDetailed()`, for one input in
//   fifteen, with and without characters outside the BMP.

import { DIFFERENTIAL_FORMATS, optionSets } from "../../tests/differential.ts";
import { differentialInputs } from "../../tests/differential_inputs.ts";
import {
  CharacterScopeError,
  convert,
  convertDetailed,
  type ConverterConfiguration,
  convertGreekPassages,
  convertGreekPassagesDetailed,
  createConverter,
  prepareOptions,
  reencode,
} from "../../src/mod.ts";

function attempt(run: () => unknown): unknown {
  try {
    return { ok: run() };
  } catch (error) {
    const e = error as Error;
    return {
      error: {
        name: e.name,
        message: e.message,
        ...(e instanceof CharacterScopeError
          ? { diagnostics: e.diagnostics }
          : {}),
      },
    };
  }
}

const sets = optionSets();
const inputs = differentialInputs();
const lines: string[] = [];
const write = (record: Record<string, unknown>) =>
  lines.push(JSON.stringify(record));

for (const from of DIFFERENTIAL_FORMATS) {
  for (const input of inputs[from]) {
    for (const to of DIFFERENTIAL_FORMATS) {
      for (const { label, options } of sets) {
        write({
          op: "convert",
          from,
          to,
          set: label,
          options,
          input,
          convert: attempt(() => convert(input, from, to, options)),
          detailed: attempt(() => convertDetailed(input, from, to, options)),
        });
      }
    }
  }
}

// Characters outside the BMP, inserted at random places in some inputs.
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
        write({
          op: "convert",
          from,
          to,
          set: `${label} (astral)`,
          options,
          input,
          convert: attempt(() => convert(input, from, to, options)),
          detailed: attempt(() => convertDetailed(input, from, to, options)),
        });
      }
    }
  }
}

const CONFIGURATIONS: ConverterConfiguration[] = [
  { exclude: ["alpha", "omega"] },
  { preset: "iso-843-type-2", outOfScopeBehavior: "reject" },
  { preset: "ala-lc-ancient" },
  {
    aliases: [{ letter: "sigma", format: "greek", spellings: ["c"] }],
    characters: [{
      id: "x-heta",
      forms: {
        greek: { lowercase: "ͱ", uppercase: "Ͱ" },
        "beta-code": { lowercase: "#7" },
        transliteration: { lowercase: "ẖ" },
      },
    }],
  },
];

for (const from of DIFFERENTIAL_FORMATS) {
  for (const original of inputs[from].filter((_, index) => index % 15 === 0)) {
    for (const input of [original, `\u{1D504}${original}\u{10140}`]) {
      for (const { label, options } of sets.filter((_, i) => i % 3 === 0)) {
        write({
          op: "reencode",
          format: from,
          set: label,
          options,
          input,
          result: attempt(() => reencode(input, from, options)),
        });
        write({
          op: "prepared",
          from,
          to: "transliteration",
          set: label,
          options,
          input,
          result: attempt(() =>
            convert(input, from, "transliteration", prepareOptions(options))
          ),
        });
      }
      if (from === "greek") {
        const mixed = `see ${input} and «${input}» etc.`;
        for (const to of DIFFERENTIAL_FORMATS) {
          write({
            op: "passages",
            to,
            input: mixed,
            result: attempt(() => convertGreekPassages(mixed, to)),
            detailed: attempt(() => convertGreekPassagesDetailed(mixed, to)),
          });
        }
      }
      for (const configuration of CONFIGURATIONS) {
        for (const to of DIFFERENTIAL_FORMATS) {
          write({
            op: "converter",
            configuration,
            from,
            to,
            input,
            detailed: attempt(() =>
              createConverter(configuration).convertDetailed(input, from, to)
            ),
          });
        }
      }
    }
  }
}

process.stdout.write(lines.join("\n") + "\n");
