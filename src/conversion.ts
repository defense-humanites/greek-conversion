import {
  encodeBetaCode,
  encodeGreek,
  encodeTransliteration,
} from "./encode.ts";
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
import { applyNumeralOrthography, applyOrthography } from "./orthography.ts";
import { parseBetaCode } from "./parsers/beta_code.ts";
import { parseGreek } from "./parsers/greek.ts";
import {
  outputSpans,
  type ReadPositions,
  readSpans,
  type SpanTable,
  type TokenTargets,
  type WrittenPositions,
  writtenSpans,
} from "./parsers/positions.ts";
import { parseTransliteration } from "./parsers/transliteration.ts";
import { resolveConversionOptions } from "./presets.ts";

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
   * One span per token, in token order. Spans are in increasing order and
   * cover the input without gaps. Tokens read from one character of the
   * input (the jamo of a Hangul syllable, kept as literals; the two letters
   * read from a modern-digraph `b`) share its span.
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
 * or Beta Code depends on no option. Every option is validated whatever the
 * format.
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
  return parseResolved(input, format, resolveConversionOptions(options));
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
    resolveConversionOptions(options),
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
  switch (format) {
    case "greek":
      return parseGreek(input, share, read);
    case "beta-code":
      return parseBetaCode(input, share, read);
    case "transliteration":
      return parseTransliteration(input, options, read);
  }
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
  const prepared = format === "transliteration"
    ? applyNumeralOrthography(document, options)
    : applyOrthography(document, options);

  switch (format) {
    case "greek":
      return encodeGreek(prepared, options);
    case "beta-code":
      return encodeBetaCode(prepared, options);
    case "transliteration":
      return encodeTransliteration(prepared, options);
  }
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
  const targets: TokenTargets = {};
  const prepared = format === "transliteration"
    ? applyNumeralOrthography(document, options, targets)
    : applyOrthography(document, options, targets);
  const written: WrittenPositions = {
    text: "",
    starts: new Array<number>(prepared.length).fill(0),
    ends: new Array<number>(prepared.length).fill(0),
  };

  let output: string;
  let form: "NFC" | "NFD" = "NFC";
  switch (format) {
    case "greek":
      output = encodeGreek(prepared, options, written);
      if (options.greek.composition === "decomposed") form = "NFD";
      break;
    case "beta-code":
      output = encodeBetaCode(prepared, options, written);
      break;
    case "transliteration":
      output = encodeTransliteration(prepared, options, written);
      break;
  }

  const rendered = writtenSpans(output, written, form);
  return { output, spans: outputSpans(targets.map, rendered, output.length) };
}
