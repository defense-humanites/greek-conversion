/**
 * `prepareOptions()`, in a module of its own: it brings the validation of
 * the options and the table of the presets into a bundle, which a bundle
 * that converts with the defaults or an imported preset leaves out.
 *
 * Internal: exported by the `./core` entry point.
 */
import type { ConversionOptions } from "./options.ts";
import { makePrepared, type PreparedOptions } from "./prepared.ts";
import { resolveConversionProfiles } from "./presets.ts";

/**
 * Checks and resolves conversion options once, for the functions of the
 * `./core` entry point, which take only prepared options.
 *
 * The options are those that the functions of the main entry point take: a
 * preset by name, custom options that override it, and a `source` profile
 * for reading the input. They are validated as strictly, with the same
 * errors. Prepare options once, outside a loop: the result can be used for
 * any number of conversions, and cannot be changed.
 *
 * A preset with no custom option is also exported as prepared options, by
 * the `./presets` entry point, which brings neither the validation nor the
 * table of the presets into a bundle.
 *
 * @example
 * ```ts
 * import { convert, prepareOptions } from "@humanities/greek-conversion/core";
 * import { greekReader } from "@humanities/greek-conversion/greek";
 * import { transliterationWriter } from "@humanities/greek-conversion/transliteration";
 *
 * const options = prepareOptions({
 *   preset: "sbl-general",
 *   transliteration: { chi: "kh" },
 * });
 * convert("χάος", greekReader, transliterationWriter, options); // "khaos"
 * ```
 *
 * @throws {OptionError} If a preset, an option key, or an option value is
 * unknown, or two values are incompatible. An `OptionError` is a
 * `RangeError`.
 * @throws {TypeError} If `options`, `source`, or an option group has the
 * wrong type.
 */
export function prepareOptions(
  options: ConversionOptions = {},
): PreparedOptions {
  const { reading, writing } = resolveConversionProfiles(options);
  return makePrepared(writing, reading, null);
}
