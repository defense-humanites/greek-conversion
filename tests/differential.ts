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
import { MEANT } from "./meant.ts";
import type { ConversionOptions, Format } from "../src/mod.ts";
import * as core from "../src/core.ts";
import { betaCodeReader, betaCodeWriter } from "../src/formats/beta_code.ts";
import { greekReader, greekWriter } from "../src/formats/greek.ts";
import {
  transliterationReader,
  transliterationWriter,
} from "../src/formats/transliteration.ts";

/** The readers and writers of `./core`, by format. */
const CORE_CODECS: Readonly<
  Record<Format, readonly [core.Reader, core.Writer]>
> = {
  greek: [greekReader, greekWriter],
  "beta-code": [betaCodeReader, betaCodeWriter],
  transliteration: [transliterationReader, transliterationWriter],
};

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

/**
 * The options of a set, as the reference types them: the sets hold only
 * values that it accepts, but this tree's types may know more.
 */
type ReferenceOptions = Parameters<typeof reference.convert>[3];

/** A difference between this tree and the reference. */
export interface Difference {
  label: string;
  call: string;
  input: string;
  reference: string;
  current: string;
}

/**
 * Whether `MEANT` lists a difference. `undone` tells whether the current
 * tree, given more options, gives the reference again.
 */
function isMeant(
  label: string,
  call: string,
  input: string,
  undone: (options: ConversionOptions) => boolean,
): boolean {
  return MEANT.some((meant) =>
    matches(meant.input, input) && matches(meant.label, label) &&
    (meant.call ?? call) === call &&
    (meant.undoneBy === undefined || undone(meant.undoneBy))
  );
}

/** `options`, with the groups of `more` merged into theirs. */
function withOptions(
  options: ConversionOptions,
  more: ConversionOptions | undefined,
): ConversionOptions {
  if (more === undefined) return options;
  const merged: Record<string, unknown> = { ...options };
  for (const [group, values] of Object.entries(more)) {
    merged[group] = typeof values === "object"
      ? { ...(merged[group] as object | undefined), ...values }
      : values;
  }
  return merged as ConversionOptions;
}

/** Whether a value is the one, or matches the pattern, that `MEANT` gives. */
function matches(meant: string | RegExp | undefined, value: string): boolean {
  return meant === undefined ||
    (typeof meant === "string" ? meant === value : meant.test(value));
}

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
 * format, plain and in detail, and their re-encoding, under each set of
 * options; the plain conversion also with `./core`, from the options
 * prepared once. Returns the differences that `MEANT` does not list, at most
 * `limit`.
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
    expected: string,
    run: (more?: ConversionOptions) => unknown,
  ) => {
    compared++;
    const actual = outcome(() => run());
    if (
      expected !== actual && differences.length < limit &&
      !isMeant(
        label,
        call,
        input,
        (more) => outcome(() => run(more)) === expected,
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
    let prepared: core.PreparedOptions | undefined;
    let refused: unknown;
    try {
      prepared = core.prepareOptions(options);
    } catch (error) {
      refused = error;
    }
    const [reader] = CORE_CODECS[from];
    for (const input of inputs) {
      for (const to of DIFFERENTIAL_FORMATS) {
        const plain = outcome(() =>
          reference.convert(input, from, to, options as ReferenceOptions)
        );
        record(
          label,
          `convert(${from} → ${to})`,
          input,
          plain,
          (more) =>
            current.convert(input, from, to, withOptions(options, more)),
        );
        record(
          label,
          `core convert(${from} → ${to})`,
          input,
          plain,
          (more) => {
            if (prepared === undefined) throw refused;
            return core.convert(
              input,
              reader,
              CORE_CODECS[to][1],
              more === undefined
                ? prepared
                : core.prepareOptions(withOptions(options, more)),
            );
          },
        );
        record(
          label,
          `convertDetailed(${from} → ${to})`,
          input,
          outcome(() =>
            reference.convertDetailed(
              input,
              from,
              to,
              options as ReferenceOptions,
            )
          ),
          (more) =>
            current.convertDetailed(
              input,
              from,
              to,
              withOptions(options, more),
            ),
        );
      }
      record(
        label,
        `reencode(${from})`,
        input,
        outcome(() =>
          reference.reencode(input, from, options as ReferenceOptions)
        ),
        (more) => current.reencode(input, from, withOptions(options, more)),
      );
    }
  }
  return { compared, differences };
}

/**
 * Compares the conversions, plain and in detail, of converters made with the
 * same configuration by both releases.
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
        convert(
          input: string,
          from: Format,
          to: Format,
          options?: ConversionOptions,
        ): unknown;
        convertDetailed(
          input: string,
          from: Format,
          to: Format,
          options?: ConversionOptions,
        ): unknown;
      })(configuration)
    );
    for (const input of inputs) {
      for (const to of DIFFERENTIAL_FORMATS) {
        for (const method of ["convert", "convertDetailed"] as const) {
          compared++;
          const [expected, actual] = made.map((converter) =>
            outcome(() => converter[method](input, from, to))
          );
          const call = `createConverter().${method}(${from} → ${to})`;
          if (
            expected !== actual && differences.length < limit &&
            !isMeant(
              label,
              call,
              input,
              (more) =>
                outcome(() => made[1][method](input, from, to, more)) ===
                expected,
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
