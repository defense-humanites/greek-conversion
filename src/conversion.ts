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
import { parseTransliteration } from "./parsers/transliteration.ts";
import { resolveConversionOptions } from "./presets.ts";

/**
 * Parses one supported representation into the canonical document model.
 *
 * Unknown input is retained as literal tokens. Presets and custom options are
 * resolved before parsing because some transliteration spellings are
 * option-dependent.
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
 * {@link parse} for options that `resolveConversionOptions()` already returned
 * in this call, with input and format already checked. Library functions that
 * parse and encode with the same options use it so that the resolved object,
 * with its forty-odd fields, is not validated and copied again at each step:
 * that re-resolution was about three quarters of a short conversion.
 *
 * With `share`, the Greek and Beta Code readers return shared tokens
 * (see `parsers/shared_tokens.ts`): for documents that never reach the caller.
 *
 * Internal: not exported by the package entry points.
 */
export function parseResolved(
  input: string,
  format: Format,
  options: ResolvedConversionOptions,
  share = false,
): Document {
  switch (format) {
    case "greek":
      return parseGreek(input, share);
    case "beta-code":
      return parseBetaCode(input, share);
    case "transliteration":
      return parseTransliteration(input, options);
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
