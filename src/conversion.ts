import type { ReaderHooks, WriterHooks } from "./codec.ts";
import { BETA_CODE_READING } from "./formats/beta_code_reader.ts";
import { BETA_CODE_WRITING } from "./formats/beta_code_writer.ts";
import { GREEK_READING } from "./formats/greek_reader.ts";
import { GREEK_WRITING } from "./formats/greek_writer.ts";
import { TRANSLITERATION_READING } from "./formats/transliteration_reader.ts";
import { TRANSLITERATION_WRITING } from "./formats/transliteration_writer.ts";
import {
  assertFormat,
  assertTextInput,
  type Document,
  type Format,
} from "./model.ts";
import type {
  ConversionOptions,
  ResolvedConversionOptions,
} from "./options.ts";
import {
  type ReadPositions,
  readSpans,
  type SpanTable,
} from "./parsers/positions.ts";
import { readWith, writeTracked, writeWith } from "./pipeline.ts";
import {
  resolveConversionOptions,
  resolveConversionProfiles,
} from "./presets.ts";

/** How each format is read: the hooks of its reader (see `codec.ts`). */
const READERS: Readonly<Record<Format, ReaderHooks>> = {
  greek: GREEK_READING,
  "beta-code": BETA_CODE_READING,
  transliteration: TRANSLITERATION_READING,
};

/** How each format is written: the hooks of its writer (see `codec.ts`). */
const WRITERS: Readonly<Record<Format, WriterHooks>> = {
  greek: GREEK_WRITING,
  "beta-code": BETA_CODE_WRITING,
  transliteration: TRANSLITERATION_WRITING,
};

/**
 * The hooks of the writer of a format: those of the handle that the
 * `./core` entry point would be given.
 *
 * Internal: not exported by the package entry points.
 */
export function writerFor(format: Format): WriterHooks {
  return WRITERS[format];
}

/** Where a token was read: a range of UTF-16 code units in the input. */
export interface TokenSpan {
  /** Offset of the first code unit of the token in the input as supplied. */
  start: number;
  /** Offset after the last one. */
  end: number;
}

/** A parsed document with the position of each token in the input. */
export interface ParseResult {
  /** The canonical document. */
  document: Document;
  /**
   * One span per token, in token order. Spans are in order (their starts and
   * their ends never decrease) and cover the input without gaps. Tokens read
   * from one character of the input (the jamo of a Hangul syllable, kept as
   * literals; the two letters read from a modern-digraph `b`) share its span;
   * a token read from part of a character that the previous token also draws
   * on (the dot below of a precomposed `ḥ` after the `p` of `ph`) has that
   * character's span, inside the previous token's and ending with it.
   */
  spans: readonly TokenSpan[];
}

/**
 * Parses one supported representation into the canonical document model.
 *
 * Unknown input is retained as literal tokens. Presets and custom options are
 * resolved before parsing because some transliteration spellings are
 * option-dependent: the `transliteration` group, `greek.accentuation`, and
 * the disposition of the smooth breathing (`diacritics.smoothBreathing`, or
 * `diacritics.all`) decide how transliteration is read, while reading Greek
 * or Beta Code depends on no option. As in a conversion, the input is read
 * with `options.source` when it is given. Every option is validated whatever
 * the format.
 *
 * @throws {TypeError} If `input` is not a string.
 * @throws {RangeError} If `format` is not supported or an option is invalid.
 */
export function parse(
  input: string,
  format: Format,
  options: ConversionOptions = {},
): Document {
  assertTextInput(input);
  assertFormat(format);
  return parseResolved(
    input,
    format,
    resolveConversionProfiles(options).reading,
  );
}

/**
 * {@link parse}, with the position of each token in the input.
 *
 * Positions are offsets in UTF-16 code units, the unit of `String.length`,
 * `slice()` and editor selections, in the input exactly as supplied: the
 * reader normalizes the text, but the spans are mapped back to the caller's
 * string.
 *
 * @throws {TypeError} If `input` is not a string.
 * @throws {RangeError} If `format` is not supported or an option is invalid.
 */
export function parseDetailed(
  input: string,
  format: Format,
  options: ConversionOptions = {},
): ParseResult {
  assertTextInput(input);
  assertFormat(format);
  const read: ReadPositions = { text: "", starts: [] };
  const document = parseResolved(
    input,
    format,
    resolveConversionProfiles(options).reading,
    false,
    read,
  );
  const { starts, ends } = readSpans(input, read);
  const spans: TokenSpan[] = new Array(document.length);
  for (let index = 0; index < document.length; index++) {
    spans[index] = { start: starts[index], end: ends[index] };
  }
  return { document, spans };
}

/**
 * {@link parse} for options that `resolveConversionOptions()` already returned
 * in this call, with input and format already checked. Library functions that
 * parse and encode with the same options use it so that the resolved object,
 * with its forty-odd fields, is not validated and copied again at each step:
 * that re-resolution was about three quarters of a short conversion.
 *
 * With `share`, the Greek and Beta Code readers return shared tokens
 * (see `parsers/shared_tokens.ts`): for documents that never reach the caller.
 * With `read`, the reader records where each token starts (see
 * `parsers/positions.ts`).
 *
 * Internal: not exported by the package entry points.
 */
export function parseResolved(
  input: string,
  format: Format,
  options: ResolvedConversionOptions,
  share = false,
  read?: ReadPositions,
): Document {
  return readWith(READERS[format], input, options, share, read);
}

/**
 * Encodes a canonical document in one supported representation.
 *
 * This function does not validate manually constructed documents. Call
 * `validateDocument()` first when the document did not originate from
 * {@link parse}.
 *
 * @throws {RangeError} If `format` is not supported or an option is invalid.
 */
export function encode(
  document: Document,
  format: Format,
  options: ConversionOptions = {},
): string {
  assertFormat(format);
  return encodeResolved(document, format, resolveConversionOptions(options));
}

/**
 * {@link encode} for options that `resolveConversionOptions()` already
 * returned in this call, with the format already checked; see
 * {@link parseResolved}.
 *
 * Internal: not exported by the package entry points.
 */
export function encodeResolved(
  document: Document,
  format: Format,
  options: ResolvedConversionOptions,
): string {
  return writeWith(WRITERS[format], document, options);
}

/**
 * {@link encodeResolved}, with the span in the output of each token of the
 * document: the output of the rendered token it became, which several tokens
 * may share (a Greek numeral written as one decimal number, a whitespace run
 * collapsed to one space, the letters of a modern digraph), or an empty span
 * where the output of the next token starts when the output has nothing for
 * it (a leading or trailing whitespace run under `whitespace: "collapse"`).
 *
 * Internal: not exported by the package entry points.
 */
export function encodeTracked(
  document: Document,
  format: Format,
  options: ResolvedConversionOptions,
): { output: string; spans: SpanTable } {
  return writeTracked(WRITERS[format], document, options);
}
