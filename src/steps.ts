/**
 * The steps of a conversion that only options outside every preset take:
 * the accent of καί (`greek.kaiAccent`), monotonic accentuation
 * (`greek.accentuation: "monotonic"`), and the stigma read as `στ`
 * (`greek.stigma: "ligature"`). Resolved options that take one carry the
 * steps: the resolution of options (`presets.ts`), which every option
 * outside the presets goes through, links them to the options it returns
 * (`linkSteps()`), and the readers and writers reach them through the
 * options. This module imports none of them, so that a bundle of the
 * `./core` entry point that converts with a preset or the defaults, and so
 * never resolves options, leaves out their code, about a tenth of the
 * bundle.
 *
 * The presets as prepared options (`prepared_presets.ts`) are made without
 * the resolution: `scripts/generate_preset_objects.ts` refuses a preset that
 * would take one of these steps.
 *
 * Internal: not exported by the package entry points.
 */
import type { Document, Format } from "./model.ts";
import type {
  ConversionOptions,
  ResolvedConversionOptions,
} from "./options.ts";

/** The steps, as `presets.ts` links them. */
export interface Steps {
  /** `supplyKaiAccents()` of `kai_accent.ts`. */
  readonly kaiAccents: (
    document: Document,
    format: Format,
    options: ResolvedConversionOptions,
  ) => Document;
  /** `applyMonotonicOrthography()` of `orthography.ts`. */
  readonly monotonic: (
    document: Document,
    options: ConversionOptions,
  ) => Document;
  /** `readStigmaLigatures()` of `ligatures.ts`. */
  readonly stigmaLigatures: (
    document: Document,
    starts?: number[],
  ) => Document;
}

/**
 * The key under which resolved options that take a step carry the steps. A
 * symbol property, set where the options are made, costs nothing, where a
 * `WeakMap` cost about 0.2 µs for each resolution. Neither the names of the
 * options nor `JSON.stringify()` meet it, and `resolveConversionOptions()`
 * returns a copy without it.
 */
const STEPS = Symbol("steps");

/** Resolved options with the steps they may carry. */
type Linked = { [STEPS]?: Steps };

/** Whether resolved options take one of the steps of this module. */
export function needsSteps(options: ResolvedConversionOptions): boolean {
  return options.greek.kaiAccent !== "none" ||
    options.greek.accentuation === "monotonic" ||
    options.greek.stigma === "ligature";
}

/**
 * Links `steps` to resolved options that take one of them, and returns the
 * options: called by the resolution of options, on each object it returns.
 */
export function linkSteps(
  options: ResolvedConversionOptions,
  steps: Steps,
): ResolvedConversionOptions {
  if (needsSteps(options)) (options as Linked)[STEPS] = steps;
  return options;
}

/**
 * The steps linked to options that take one. Every entry point resolves
 * the options it is given, or takes prepared options, which were resolved
 * or are a preset that takes none: options without their steps are a fault
 * of the library, which this reports rather than skipping the step.
 */
function stepsOf(options: ConversionOptions): Steps {
  const steps = (options as Linked)[STEPS];
  if (steps === undefined) {
    throw new Error(
      "Internal error: options that take an optional step were not " +
        "resolved with it.",
    );
  }
  return steps;
}

/** The accent of καί that the options supply (`supplyKaiAccents()`). */
export function kaiAccents(
  document: Document,
  format: Format,
  options: ResolvedConversionOptions,
): Document {
  return options.greek.kaiAccent === "none"
    ? document
    : stepsOf(options).kaiAccents(document, format, options);
}

/** Monotonic accentuation, where the options take it. */
export function monotonic(
  document: Document,
  options: ConversionOptions,
): Document {
  return options.greek?.accentuation === "monotonic"
    ? stepsOf(options).monotonic(document, options)
    : document;
}

/** The stigma read as `στ`, where the options read it so. */
export function stigmaLigatures(
  document: Document,
  options: ResolvedConversionOptions,
  starts?: number[],
): Document {
  return options.greek.stigma === "ligature"
    ? stepsOf(options).stigmaLigatures(document, starts)
    : document;
}
