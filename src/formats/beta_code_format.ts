/**
 * The Beta Code reader and writer as one value.
 *
 * Internal: exported by the `./beta-code` entry point. The value is made in
 * a module of its own, so that a bundle that imports only the reader or only
 * the writer does not keep the other.
 */
import { joinCodecs, type ReaderWriter } from "../codec.ts";
import { betaCodeReader } from "./beta_code_reader.ts";
import { betaCodeWriter } from "./beta_code_writer.ts";

/**
 * Reads and writes TLG Beta Code: {@link betaCodeReader} and
 * {@link betaCodeWriter} as one value, for `convertDetailed()` and
 * `reencode()` of the `./core` entry point, which need both.
 *
 * @example
 * ```ts
 * import { reencode } from "@humanities/greek-conversion/core";
 * import { betaCodeFormat } from "@humanities/greek-conversion/beta-code";
 *
 * reencode("LO/GOS", betaCodeFormat); // "lo/gos"
 * ```
 */
export const betaCodeFormat: ReaderWriter = /* @__PURE__ */ joinCodecs(
  betaCodeReader,
  betaCodeWriter,
);
