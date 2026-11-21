/**
 * The Beta Code reader and writer, for the functions of the `./core` entry
 * point: `betaCodeReader` reads TLG Beta Code, `betaCodeWriter` writes it,
 * and `betaCodeFormat` does both, for `convertDetailed()` and `reencode()`.
 *
 * A bundle keeps only what it imports: the reader without the writer, or
 * the other way round. See the guide on smaller bundles.
 *
 * @module
 */

export { betaCodeReader } from "./beta_code_reader.ts";
export { betaCodeWriter } from "./beta_code_writer.ts";
export { betaCodeFormat } from "./beta_code_format.ts";
export type { Reader, ReaderWriter, Writer } from "../codec.ts";
export type { Format } from "../model.ts";
