/**
 * The transliteration reader.
 *
 * Internal: exported by the `./transliteration` entry point.
 */
import { makeReader, type Reader, type ReaderHooks } from "../codec.ts";
import { parseTransliteration } from "../parsers/transliteration.ts";

/** How transliteration is read. */
export const TRANSLITERATION_READING: ReaderHooks & {
  readonly format: "transliteration";
} = {
  format: "transliteration",
  read: (input, options, _share, read) =>
    parseTransliteration(input, options, read),
};

/**
 * Reads scientific transliteration, for the functions of the `./core` entry
 * point. Reading transliteration depends on its options, the spellings of
 * the style it is written in: give them as prepared options.
 *
 * @example
 * ```ts
 * import { convert } from "@humanities/greek-conversion/core";
 * import { greekWriter } from "@humanities/greek-conversion/greek";
 * import { transliterationReader } from "@humanities/greek-conversion/transliteration";
 *
 * convert("lógos", transliterationReader, greekWriter); // "λόγος"
 * ```
 */
export const transliterationReader: Reader<"transliteration"> =
  /* @__PURE__ */ makeReader(TRANSLITERATION_READING);
