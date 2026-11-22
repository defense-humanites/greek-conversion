/**
 * The transliteration reader and writer as one value.
 *
 * Internal: exported by the `./transliteration` entry point. The value is
 * made in a module of its own, so that a bundle that imports only the reader
 * or only the writer does not keep the other.
 */
import { joinCodecs, type ReaderWriter } from "../codec.ts";
import { transliterationReader } from "./transliteration_reader.ts";
import { transliterationWriter } from "./transliteration_writer.ts";

/**
 * Reads and writes scientific transliteration: {@link transliterationReader}
 * and {@link transliterationWriter} as one value, for `convertDetailed()`
 * and `reencode()` of the `./core` entry point, which need both.
 *
 * @example
 * ```ts
 * import { reencode } from "@humanities/greek-conversion/core";
 * import { transliterationFormat } from "@humanities/greek-conversion/transliteration";
 *
 * // The accent is composed with its letter.
 * reencode("lo\u0301gos", transliterationFormat); // → lógos
 * ```
 */
export const transliterationFormat: ReaderWriter = /* @__PURE__ */ joinCodecs(
  transliterationReader,
  transliterationWriter,
);
