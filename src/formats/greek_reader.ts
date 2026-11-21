/**
 * The Greek reader.
 *
 * Internal: exported by the `./greek` entry point.
 */
import { makeReader, type Reader, type ReaderHooks } from "../codec.ts";
import { readStigmas } from "../orthography.ts";
import { parseGreek } from "../parsers/greek.ts";

/** How Greek is read. */
export const GREEK_READING: ReaderHooks & { readonly format: "greek" } = {
  format: "greek",
  read: (input, _options, share, read) =>
    readStigmas(input, parseGreek(input, share, read)),
};

/**
 * Reads Greek script, for the functions of the `./core` entry point.
 *
 * @example
 * ```ts
 * import { convert } from "@humanities/greek-conversion/core";
 * import { greekReader } from "@humanities/greek-conversion/greek";
 * import { transliterationWriter } from "@humanities/greek-conversion/transliteration";
 *
 * convert("λόγος", greekReader, transliterationWriter); // "lógos"
 * ```
 */
export const greekReader: Reader = /* @__PURE__ */ makeReader(
  GREEK_READING,
);
