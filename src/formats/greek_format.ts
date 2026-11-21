/**
 * The Greek reader and writer as one value.
 *
 * Internal: exported by the `./greek` entry point. The value is made in a
 * module of its own, so that a bundle that imports only the reader or only
 * the writer does not keep the other.
 */
import { joinCodecs, type ReaderWriter } from "../codec.ts";
import { greekReader } from "./greek_reader.ts";
import { greekWriter } from "./greek_writer.ts";

/**
 * Reads and writes Greek script: {@link greekReader} and {@link greekWriter}
 * as one value, for `convertDetailed()` and `reencode()` of the `./core`
 * entry point, which need both.
 *
 * @example
 * ```ts
 * import { reencode } from "@humanities/greek-conversion/core";
 * import { greekFormat } from "@humanities/greek-conversion/greek";
 *
 * reencode("λο\u0301γος", greekFormat); // "λόγος", composed
 * ```
 */
export const greekFormat: ReaderWriter = /* @__PURE__ */ joinCodecs(
  greekReader,
  greekWriter,
);
