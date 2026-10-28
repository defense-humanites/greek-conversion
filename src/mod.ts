/**
 * Bidirectional conversion between Greek, Beta Code, and scientific
 * transliteration.
 *
 * Use {@link convert} for ordinary conversions and {@link convertDetailed}
 * when information-loss diagnostics are required. Advanced access to the
 * canonical document is available from the `./document` entry point.
 *
 * @module
 */

import { encodeResolved, encodeTracked, parseResolved } from "./conversion.ts";
export { CharacterScopeError, createConverter } from "./converter.ts";
export type {
  CharacterAliasDefinition,
  CharacterRepertoireDefinition,
  CharacterScopeDiagnostic,
  CharacterScopeDiagnosticCode,
  Converter,
  ConverterConfiguration,
  ConverterConversionResult,
  ConverterOutOfScopeBehavior,
  CustomCharacterDefinition,
  CustomCharacterForms,
} from "./converter.ts";
import {
  type ConversionResult,
  type ConversionSpan,
  findConversionLosses,
} from "./losses.ts";
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
import { type ReadPositions, readSpans } from "./parsers/positions.ts";
import { resolveConversionOptions } from "./presets.ts";

export { FORMATS } from "./model.ts";
export type {
  Diacritic,
  Document,
  Format,
  GlyphVariant,
  Grapheme,
  Letter,
  Literal,
  Token,
} from "./model.ts";
export type {
  ConversionLoss,
  ConversionLossCode,
  ConversionResult,
  ConversionSpan,
} from "./losses.ts";
export type {
  ArchaicKoppaTransliteration,
  BetaCodeCase,
  BetaCodeOptions,
  BetaCodeYot,
  BetaTransliteration,
  ChiTransliteration,
  CircumflexTransliteration,
  ConversionOptions,
  ConversionOptionValues,
  CoronisTransliteration,
  DefaultConversionOptions,
  DentalSigmaOrthography,
  DiacriticClassOptions,
  DiacriticDisposition,
  DiacriticOptions,
  DoubleRhoOrthography,
  EnotikonTransliteration,
  EtaTransliteration,
  FinalSigmaOrthography,
  GreekAccentuation,
  GreekAcuteForm,
  GreekAnoTeleiaForm,
  GreekOptions,
  GreekQuestionMarkForm,
  HyphenTransliteration,
  KeraiaTransliteration,
  LetterCaseOrthography,
  LongVowelTransliteration,
  LunateSigmaTransliteration,
  MedialBetaOrthography,
  MuPiTransliteration,
  NasalGammaTransliteration,
  NumeralOrthography,
  NuTauTransliteration,
  OptionValueTable,
  PhiTransliteration,
  Preset,
  QuantityTransliteration,
  ResolvedConversionOptions,
  RhoTransliteration,
  SigmaOrthography,
  SmoothBreathingTransliteration,
  TextOptions,
  TransliterationOptions,
  UnicodeComposition,
  UpsilonTransliteration,
  WhitespaceOrthography,
  XiTransliteration,
} from "./options.ts";
export {
  CONVERSION_OPTION_VALUES,
  DEFAULT_CONVERSION_OPTIONS,
  OptionError,
} from "./options.ts";
export {
  getPresetMetadata,
  getPresetOptions,
  listPresetMetadata,
  resolveConversionOptions,
} from "./presets.ts";
export type {
  PresetCoverage,
  PresetMetadata,
  PresetOptions,
  PresetOutOfScopeBehavior,
  PresetReference,
} from "./presets.ts";

/**
 * Converts text between Greek, Beta Code, and scientific transliteration.
 *
 * Unknown literals are preserved. The result is canonical and idempotent for
 * fixed formats and options, but a reverse conversion is not necessarily
 * lossless; use {@link convertDetailed} when that distinction matters.
 *
 * Without a preset, transliteration follows the SBL academic style, which the
 * `sbl-academic` preset names.
 *
 * @throws {TypeError} If `input` is not a string.
 * @throws {RangeError} If a format is unknown; an {@link OptionError} (a
 * `RangeError`) if a preset, an option key, or an option value is.
 */
export function convert(
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions = {},
): string {
  return runConversion(input, from, to, options).output;
}

/**
 * Parses and re-encodes text in the same format.
 *
 * This is the expressive shorthand for `convert(input, format, format,
 * options)`. It canonicalizes accepted aliases and applies the selected
 * orthographic policies.
 *
 * @example
 * ```ts
 * reencode("λόγος", "greek", {
 *   greek: { finalSigma: "medial" },
 * }); // "λόγοσ"
 * ```
 */
export function reencode(
  input: string,
  format: Format,
  options: ConversionOptions = {},
): string {
  return convert(input, format, format, options);
}

/**
 * Converts text and reports information that the target representation cannot
 * retain, and where each source token was read and written.
 *
 * Unicode composition and tonos/oxia are representational differences and are
 * not reported as loss. Known lunate-sigma provenance is reported when an
 * output policy removes it. The conversion itself is executed once; only the
 * rendered target is parsed again for comparison.
 *
 * Positions ({@link ConversionResult.spans}, {@link ConversionLoss.offset})
 * are offsets in UTF-16 code units in the input as supplied and in the
 * output as returned: the readers and writers normalize the text, but the
 * positions are mapped back to the caller's strings.
 *
 * @throws {TypeError} If `input` is not a string.
 * @throws {RangeError} If a format is unknown; an {@link OptionError} (a
 * `RangeError`) if a preset, an option key, or an option value is.
 */
export function convertDetailed(
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions = {},
): ConversionResult {
  assertTextInput(input);
  assertFormat(from);
  assertFormat(to);
  const resolved = resolveConversionOptions(options);
  const read: ReadPositions = { text: "", starts: [] };
  const source = parseResolved(input, from, resolved, true, read);
  const inputSpans = readSpans(input, read);
  const { output, spans: outputSpans } = encodeTracked(source, to, resolved);
  const target = parseResolved(output, to, resolved, true);
  const losses = findConversionLosses(source, target, inputSpans);

  const spans: ConversionSpan[] = new Array(source.length);
  for (let index = 0; index < source.length; index++) {
    spans[index] = {
      inputStart: inputSpans.starts[index],
      inputEnd: inputSpans.ends[index],
      outputStart: outputSpans.starts[index],
      outputEnd: outputSpans.ends[index],
    };
  }

  return { output, lossy: losses.length > 0, losses, spans };
}

function runConversion(
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions,
): { source: Document; output: string; resolved: ResolvedConversionOptions } {
  assertTextInput(input);
  assertFormat(from);
  assertFormat(to);
  const resolved = resolveConversionOptions(options);
  const source = parseResolved(input, from, resolved, true);
  return { source, output: encodeResolved(source, to, resolved), resolved };
}
