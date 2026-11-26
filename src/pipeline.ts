/**
 * The steps of a conversion that do not depend on the format: a reader's
 * hooks, then what every reader reads afterwards; a writer's hooks, and the
 * positions of their output.
 *
 * The module imports no format, so that a conversion made with handles (see
 * `codec.ts`) bundles only the formats it is given.
 *
 * Internal: not exported by the package entry points.
 */
import type { ReaderHooks, WriterHooks } from "./codec.ts";
import type { Document } from "./model.ts";
import type { ResolvedConversionOptions } from "./options.ts";
import { stigmaLigatures } from "./steps.ts";
import {
  outputSpans,
  type ReadPositions,
  type SpanTable,
  type TokenTargets,
  type WrittenPositions,
  writtenSpans,
} from "./parsers/positions.ts";

/**
 * Reads the input with a reader, then the stigma written for `στ` when the
 * options read one (`greek.stigma: "ligature"`). With `share`, the document
 * may hold shared tokens and must not reach the caller; with `read`, the
 * reader records where each token starts.
 */
export function readWith(
  reader: ReaderHooks,
  input: string,
  options: ResolvedConversionOptions,
  share = false,
  read?: ReadPositions,
): Document {
  return stigmaLigatures(
    reader.read(input, options, share, read),
    options,
    read?.starts,
  );
}

/** Writes a document with a writer. */
export function writeWith(
  writer: WriterHooks,
  document: Document,
  options: ResolvedConversionOptions,
): string {
  return writer.write(writer.prepare(document, options), options);
}

/**
 * {@link writeWith}, with the span in the output of each token of the
 * document: the output of the rendered token it became, which several tokens
 * may share (a Greek numeral written as one decimal number, a whitespace run
 * collapsed to one space, the letters of a modern digraph), or an empty span
 * where the output of the next token starts when the output has nothing for
 * it (a leading or trailing whitespace run under `whitespace: "collapse"`).
 */
export function writeTracked(
  writer: WriterHooks,
  document: Document,
  options: ResolvedConversionOptions,
): { output: string; spans: SpanTable } {
  const targets: TokenTargets = {};
  const prepared = writer.prepare(document, options, targets);
  const written: WrittenPositions = {
    text: "",
    starts: new Array<number>(prepared.length).fill(0),
    ends: new Array<number>(prepared.length).fill(0),
  };
  const output = writer.write(prepared, options, written);
  const rendered = writtenSpans(output, written, writer.form(options));
  return { output, spans: outputSpans(targets.map, rendered, output.length) };
}
