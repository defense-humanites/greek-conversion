/**
 * The comparison of this tree with the previous release, published on npm
 * and installed as the development dependency `greek-conversion-previous`
 * (RELEASING.md moves it to each new release): the
 * same input, converted with the same options by both, must give the same
 * result, output, losses, and positions. `differential_test.ts` runs it over
 * the inputs of the repository; `scripts/differential_corpus.ts` over a
 * local corpus, such as one whose license forbids publishing it.
 *
 * A change of output that is meant goes in `MEANT`, with its reason, until
 * the reference moves to the release that made it.
 */
import * as reference from "greek-conversion-previous";
import * as current from "../src/mod.ts";
import type { ConversionOptions, Format } from "../src/mod.ts";

/** The formats, in the order of the main entry point. */
export const DIFFERENTIAL_FORMATS: readonly Format[] = [
  "greek",
  "beta-code",
  "transliteration",
];

/** Options under a label, as both releases take them. */
export interface OptionSet {
  label: string;
  options: ConversionOptions;
}

/** A difference between this tree and the reference. */
export interface Difference {
  label: string;
  call: string;
  input: string;
  reference: string;
  current: string;
}

/**
 * Changes of output that are meant: the label of the options, the call, and
 * the input, as a difference reports them, with the reason. Empty while the
 * reference is the release before the one in preparation and no output is
 * meant to change.
 */
export const MEANT: readonly {
  label: string;
  call: string;
  input: string;
  reason: string;
}[] = [];

/**
 * The options compared by default: the defaults, every preset, the options
 * that change how difficult forms are read or written, and options drawn at
 * random, with a fixed seed, from the values that the reference accepts.
 */
export function optionSets(random = 12): OptionSet[] {
  const sets: OptionSet[] = [
    { label: "defaults", options: {} },
    ...reference.listPresetMetadata().map(({ id }) => ({
      label: id,
      options: { preset: id } as ConversionOptions,
    })),
    {
      label: "source",
      options: {
        preset: "iso-843-type-2",
        source: { preset: "ala-lc-modern" },
      },
    },
    {
      label: "letters for signs",
      options: { greek: { ligatures: "standard" } },
    },
    {
      label: "stigma ligature, modern καί",
      options: { greek: { stigma: "ligature", kaiAccent: "modern" } },
    },
    { label: "Byzantine καί", options: { greek: { kaiAccent: "byzantine" } } },
    {
      label: "monotonic, decomposed",
      options: {
        greek: { accentuation: "monotonic", composition: "decomposed" },
      },
    },
    {
      label: "decimal numerals, collapsed whitespace",
      options: { text: { numerals: "decimal", whitespace: "collapse" } },
    },
    {
      label: "no diacritics, eta as i",
      options: { diacritics: { all: "remove" }, transliteration: { eta: "i" } },
    },
    { label: "no overline", options: { diacritics: { overline: "remove" } } },
  ];
  const draw = seeded(2027);
  const values = reference.CONVERSION_OPTION_VALUES as unknown as Record<
    string,
    Record<string, readonly string[]>
  >;
  const groups = Object.keys(values);
  const presets = reference.listPresetMetadata().map(({ id }) => id);
  for (let index = 0; index < random; index++) {
    const options: Record<string, unknown> = {};
    if (draw() < 0.4) options.preset = pick(draw, presets);
    for (let count = 1 + Math.floor(draw() * 3); count > 0; count--) {
      const group = pick(draw, groups);
      const keys = Object.keys(values[group]);
      const changes = (options[group] ??= {}) as Record<string, string>;
      for (let keys_ = 1 + Math.floor(draw() * 3); keys_ > 0; keys_--) {
        const key = pick(draw, keys);
        changes[key] = pick(draw, values[group][key]);
      }
    }
    if (draw() < 0.25) {
      options.source = draw() < 0.5 ? {} : { preset: pick(draw, presets) };
    }
    sets.push({
      label: `random ${index + 1}: ${JSON.stringify(options)}`,
      options: options as ConversionOptions,
    });
  }
  return sets;
}

/** A generator of numbers in [0, 1), the same for the same seed. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** An item drawn from `items`. */
export function pick<T>(draw: () => number, items: readonly T[]): T {
  return items[Math.floor(draw() * items.length)];
}

/** What a call gives, or the error it throws, as a string to compare. */
function outcome(call: () => unknown): string {
  try {
    return JSON.stringify(call());
  } catch (error) {
    return `${(error as Error).constructor.name}: ${(error as Error).message}`;
  }
}

/**
 * Compares the conversions of `inputs`, written in `from`, into every
 * format, in detail, and their re-encoding, under each set of options.
 * Returns the differences that `MEANT` does not list, at most `limit`.
 */
export function compareConversions(
  inputs: readonly string[],
  from: Format,
  sets: readonly OptionSet[],
  limit = 50,
): { compared: number; differences: Difference[] } {
  const differences: Difference[] = [];
  let compared = 0;
  const record = (
    label: string,
    call: string,
    input: string,
    run: (library: typeof current) => unknown,
  ) => {
    compared++;
    const expected = outcome(() => run(reference as unknown as typeof current));
    const actual = outcome(() => run(current));
    if (
      expected !== actual && differences.length < limit &&
      !MEANT.some((meant) =>
        meant.label === label && meant.call === call && meant.input === input
      )
    ) {
      differences.push({
        label,
        call,
        input,
        reference: expected,
        current: actual,
      });
    }
  };
  for (const { label, options } of sets) {
    for (const input of inputs) {
      for (const to of DIFFERENTIAL_FORMATS) {
        record(
          label,
          `convertDetailed(${from} → ${to})`,
          input,
          (library) => library.convertDetailed(input, from, to, options),
        );
      }
      record(
        label,
        `reencode(${from})`,
        input,
        (library) => library.reencode(input, from, options),
      );
    }
  }
  return { compared, differences };
}

/**
 * Compares the detailed conversions of converters made with the same
 * configuration by both releases.
 */
export function compareConverters(
  inputs: readonly string[],
  from: Format,
  configurations: readonly { label: string; configuration: object }[],
  limit = 50,
): { compared: number; differences: Difference[] } {
  const differences: Difference[] = [];
  let compared = 0;
  for (const { label, configuration } of configurations) {
    const made = [reference, current].map((library) =>
      (library.createConverter as (configuration: object) => {
        convertDetailed(input: string, from: Format, to: Format): unknown;
      })(configuration)
    );
    for (const input of inputs) {
      for (const to of DIFFERENTIAL_FORMATS) {
        compared++;
        const [expected, actual] = made.map((converter) =>
          outcome(() => converter.convertDetailed(input, from, to))
        );
        const call = `createConverter().convertDetailed(${from} → ${to})`;
        if (
          expected !== actual && differences.length < limit &&
          !MEANT.some((meant) =>
            meant.label === label && meant.call === call &&
            meant.input === input
          )
        ) {
          differences.push({
            label,
            call,
            input,
            reference: expected,
            current: actual,
          });
        }
      }
    }
  }
  return { compared, differences };
}

/** A difference as a few lines, for a failure. */
export function describeDifference(difference: Difference): string {
  return [
    `${difference.label}: ${difference.call}: ${
      JSON.stringify(difference.input)
    }`,
    `  reference: ${difference.reference.slice(0, 400)}`,
    `  current:   ${difference.current.slice(0, 400)}`,
  ].join("\n");
}
