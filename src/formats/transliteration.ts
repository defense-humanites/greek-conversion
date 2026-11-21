/**
 * The transliteration reader and writer, for the functions of the `./core`
 * entry point: `transliterationReader` reads scientific transliteration,
 * `transliterationWriter` writes it, and `transliterationFormat` does both,
 * for `convertDetailed()` and `reencode()`.
 *
 * A bundle keeps only what it imports: the reader without the writer, or
 * the other way round. See the guide on smaller bundles.
 *
 * @module
 */

export { transliterationReader } from "./transliteration_reader.ts";
export { transliterationWriter } from "./transliteration_writer.ts";
export { transliterationFormat } from "./transliteration_format.ts";
export type { Reader, ReaderWriter, Writer } from "../codec.ts";
export type { Format } from "../model.ts";
