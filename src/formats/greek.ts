/**
 * The Greek reader and writer, for the functions of the `./core` entry
 * point: `greekReader` reads Greek script, `greekWriter` writes it, and
 * `greekFormat` does both, for `convertDetailed()` and `reencode()`.
 *
 * A bundle keeps only what it imports: the reader without the writer, or
 * the other way round. See the
 * [guide on smaller bundles](https://greek-conversion.humanites.fr/guide/smaller-bundles/).
 *
 * @module
 */

export { greekReader } from "./greek_reader.ts";
export { greekWriter } from "./greek_writer.ts";
export { greekFormat } from "./greek_format.ts";
export type { Reader, ReaderWriter, Writer } from "../codec.ts";
export type { Format } from "../model.ts";
