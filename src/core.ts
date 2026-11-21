/**
 * Conversions that bring into a bundle only the formats and the options they
 * are given: the functions of the main entry point, which take the names of
 * formats, with readers and writers in their place.
 *
 * Readers and writers are imported from the entry point of their format
 * (`greekReader` and `greekWriter` from `./greek`, and so on), presets from
 * `./presets`, as prepared options. Other options are prepared once with
 * {@link prepareOptions}, which brings their validation into the bundle. A
 * bundle that converts Greek into transliteration with a preset is then
 * about half the size of one that imports `convert()` from the main entry
 * point. The guide on smaller bundles compares the cases: an application
 * that reads and writes every format, or lets its users choose them, gains
 * little, and a server none.
 *
 * @example
 * ```ts
 * import { convert } from "@humanities/greek-conversion/core";
 * import { greekReader } from "@humanities/greek-conversion/greek";
 * import { iso843Type2 } from "@humanities/greek-conversion/presets";
 * import { transliterationWriter } from "@humanities/greek-conversion/transliteration";
 *
 * convert("Θεσσαλονίκη", greekReader, transliterationWriter, iso843Type2);
 * // → Thessaloníki
 * ```
 *
 * @module
 */

import {
  type Reader,
  type ReaderHooks,
  readerHooks,
  type ReaderWriter,
  type Writer,
  type WriterHooks,
  writerHooks,
} from "./codec.ts";
import {
  type ConversionResult,
  type ConversionSpan,
  findConversionLosses,
} from "./losses.ts";
import { assertTextInput } from "./model.ts";
import { DEFAULT_CONVERSION_OPTIONS } from "./option_defaults.ts";
import { type ReadPositions, readSpans } from "./parsers/positions.ts";
import { readWith, writeTracked, writeWith } from "./pipeline.ts";
import {
  type PreparedOptions,
  preparedProfiles,
  type Profiles,
} from "./prepared.ts";
import { hasPreparedMark } from "./prepared_mark.ts";

export type { Reader, ReaderWriter, Writer } from "./codec.ts";
export type {
  ConversionLoss,
  ConversionLossCode,
  ConversionResult,
  ConversionSpan,
} from "./losses.ts";
export type { Format } from "./model.ts";
export type { ConversionOptions, Preset, SourceOptions } from "./options.ts";
export { OptionError } from "./options.ts";
export { prepareOptions } from "./prepare_options.ts";
export type { PreparedOptions } from "./prepared.ts";

/**
 * Converts text with a reader and a writer.
 *
 * The conversion of `convert()` from the main entry point: unknown literals
 * are preserved, and the result is canonical and idempotent for fixed
 * formats and options, but a reverse conversion is not necessarily lossless;
 * use {@link convertDetailed} when that distinction matters.
 *
 * Without options, the defaults apply: the library's own transliteration,
 * the letters of the SBL Handbook of Style with the accents, iota subscript,
 * diaeresis, and quantity marks that the Handbook leaves out.
 *
 * @example
 * ```ts
 * import { convert } from "@humanities/greek-conversion/core";
 * import { betaCodeReader } from "@humanities/greek-conversion/beta-code";
 * import { greekWriter } from "@humanities/greek-conversion/greek";
 *
 * convert("*)odusseu/s", betaCodeReader, greekWriter); // → Ὀδυσσεύς
 * ```
 *
 * @param from The reader of the input's format.
 * @param to The writer of the output's format.
 * @param options A preset from `./presets`, or what {@link prepareOptions}
 * returns; the defaults if omitted.
 * @throws {TypeError} If `input` is not a string, `from` not a reader, `to`
 * not a writer, or `options` not prepared options.
 */
export function convert(
  input: string,
  from: Reader,
  to: Writer,
  options?: PreparedOptions,
): string {
  assertTextInput(input);
  const reader = readerOf(from, "from");
  const writer = writerOf(to, "to");
  const { reading, writing } = profilesOf(options);
  return writeWith(writer, readWith(reader, input, reading, true), writing);
}

/**
 * Parses and re-encodes text in the same format: {@link convert} with the
 * reader and the writer of one format.
 *
 * The options describe the input as well, which normalizes a text in its own
 * style. Reading transliteration depends on its options: to restyle a
 * transliteration, prepare options with the style it is written in as
 * `source`.
 *
 * @example
 * ```ts
 * import { prepareOptions, reencode } from "@humanities/greek-conversion/core";
 * import { transliterationFormat } from "@humanities/greek-conversion/transliteration";
 *
 * const fromDefaults = prepareOptions({
 *   transliteration: { phi: "f" },
 *   source: {},
 * });
 * reencode("phílos", transliterationFormat, fromDefaults); // → fílos
 * ```
 *
 * @param format The reader and writer of the format, as `greekFormat`.
 * @param options A preset from `./presets`, or what {@link prepareOptions}
 * returns; the defaults if omitted.
 * @throws {TypeError} If `input` is not a string, `format` not a reader and
 * writer, or `options` not prepared options.
 */
export function reencode(
  input: string,
  format: ReaderWriter,
  options?: PreparedOptions,
): string {
  assertTextInput(input);
  const [reader, writer] = formatOf(format, "format");
  const { reading, writing } = profilesOf(options);
  return writeWith(writer, readWith(reader, input, reading, true), writing);
}

/**
 * Converts text and reports information that the target representation
 * cannot retain, and where each source token was read and written: the
 * result of `convertDetailed()` from the main entry point.
 *
 * Both formats are given whole, as `greekFormat`: the output is read back to
 * be compared with the source, and letter forms are compared as the source
 * format writes them.
 *
 * @example
 * ```ts
 * import { convertDetailed } from "@humanities/greek-conversion/core";
 * import { greekFormat } from "@humanities/greek-conversion/greek";
 * import { transliterationFormat } from "@humanities/greek-conversion/transliteration";
 *
 * convertDetailed("ϐ", greekFormat, transliterationFormat).lossy; // → true
 * ```
 *
 * @param from The reader and writer of the input's format.
 * @param to The reader and writer of the output's format.
 * @param options A preset from `./presets`, or what {@link prepareOptions}
 * returns; the defaults if omitted.
 * @throws {TypeError} If `input` is not a string, `from` or `to` not a reader
 * and writer, or `options` not prepared options.
 */
export function convertDetailed(
  input: string,
  from: ReaderWriter,
  to: ReaderWriter,
  options?: PreparedOptions,
): ConversionResult {
  assertTextInput(input);
  const [sourceReader, sourceWriter] = formatOf(from, "from");
  const [targetReader, targetWriter] = formatOf(to, "to");
  const { reading, writing } = profilesOf(options);
  const read: ReadPositions = { text: "", starts: [] };
  const source = readWith(sourceReader, input, reading, true, read);
  const inputSpans = readSpans(input, read);
  const { output, spans: outputSpans } = writeTracked(
    targetWriter,
    source,
    writing,
  );
  const target = readWith(targetReader, output, writing, true);
  // Where the target tokens were read, only if the losses need it: reading
  // the output again with positions costs less than recording them each time.
  const losses = findConversionLosses(
    source,
    target,
    inputSpans,
    () => {
      const reread: ReadPositions = { text: "", starts: [] };
      readWith(targetReader, output, writing, true, reread);
      return { written: outputSpans, read: readSpans(output, reread) };
    },
    { glyphForm: sourceWriter.glyphForm, options: reading },
  );

  const spans: ConversionSpan[] = new Array(source.length);
  for (let index = 0; index < source.length; index++) {
    spans[index] = {
      inputStart: inputSpans.starts[index],
      inputEnd: inputSpans.ends[index],
      outputStart: outputSpans.starts[index],
      outputEnd: outputSpans.ends[index],
    };
  }

  return { output, lossy: losses.length > 0, losses, spans };
}

const PACKAGE = "@humanities/greek-conversion";

/** The profiles of a conversion without options. */
const DEFAULTS: Profiles = {
  reading: DEFAULT_CONVERSION_OPTIONS,
  writing: DEFAULT_CONVERSION_OPTIONS,
};

// The errors name what to import: in JavaScript, nothing else tells a
// format name or an options object from what the functions take. A value
// of another copy of the library (two versions installed, or one passed to
// a worker) is not one of this copy's.

function profilesOf(options: unknown): Profiles {
  if (options === undefined) return DEFAULTS;
  const profiles = preparedProfiles(options);
  if (profiles !== undefined) return profiles;
  throw new TypeError(
    `Expected prepared options, received ${kind(options)}: import a preset ` +
      `from "${PACKAGE}/presets", or prepare options with prepareOptions(), ` +
      "of the same copy of the library.",
  );
}

function readerOf(value: unknown, parameter: string): ReaderHooks {
  return readerHooks(value) ?? fail("a reader", parameter, value);
}

function writerOf(value: unknown, parameter: string): WriterHooks {
  return writerHooks(value) ?? fail("a writer", parameter, value);
}

function formatOf(
  value: unknown,
  parameter: string,
): [ReaderHooks, WriterHooks] {
  const reader = readerHooks(value);
  const writer = writerHooks(value);
  return reader !== undefined && writer !== undefined
    ? [reader, writer]
    : fail("the reader and writer of a format", parameter, value);
}

function fail(expected: string, parameter: string, value: unknown): never {
  throw new TypeError(
    `Expected ${expected} as \`${parameter}\`, received ${kind(value)}: ` +
      `import readers and writers from "${PACKAGE}/greek", ` +
      `"${PACKAGE}/beta-code", or "${PACKAGE}/transliteration", of the ` +
      `same copy of the library; the functions of "${PACKAGE}" take the ` +
      "names of formats.",
  );
}

/** What a value is, for an error. */
function kind(value: unknown): string {
  return typeof value === "string"
    ? JSON.stringify(value)
    : value === null
    ? "null"
    : typeof value !== "object"
    ? typeof value
    : readerHooks(value)
    ? writerHooks(value) ? "a reader and writer" : "a reader"
    : writerHooks(value)
    ? "a writer"
    : hasPreparedMark(value)
    ? Object.getPrototypeOf(value) === Object.prototype
      ? "a copy of prepared options, which holds none of them"
      : "prepared options"
    : "an object";
}
