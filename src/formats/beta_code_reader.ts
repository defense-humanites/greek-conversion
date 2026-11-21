/**
 * The Beta Code reader.
 *
 * Internal: exported by the `./beta-code` entry point.
 */
import { makeReader, type Reader, type ReaderHooks } from "../codec.ts";
import { readStigmas } from "../orthography.ts";
import { parseBetaCode } from "../parsers/beta_code.ts";

/** How Beta Code is read. */
export const BETA_CODE_READING: ReaderHooks & {
  readonly format: "beta-code";
} = {
  format: "beta-code",
  read: (input, _options, share, read) =>
    readStigmas(input, parseBetaCode(input, share, read)),
};

/**
 * Reads TLG Beta Code, for the functions of the `./core` entry point.
 *
 * @example
 * ```ts
 * import { convert } from "@humanities/greek-conversion/core";
 * import { betaCodeReader } from "@humanities/greek-conversion/beta-code";
 * import { greekWriter } from "@humanities/greek-conversion/greek";
 *
 * convert("lo/gos", betaCodeReader, greekWriter); // "λόγος"
 * ```
 */
export const betaCodeReader: Reader<"beta-code"> = /* @__PURE__ */ makeReader(
  BETA_CODE_READING,
);
