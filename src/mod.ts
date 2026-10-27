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

import {
  encode,
  encodeResolved,
  encodeTracked,
  parse,
  parseResolved,
} from "./conversion.ts";
export {
  CharacterScopeError,
  Converter,
  createConverter,
} from "./converter.ts";
export type {
  CharacterAliasDefinition,
  CharacterRepertoireDefinition,
  CharacterScopeDiagnostic,
  CharacterScopeDiagnosticCode,
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
  GreekUnicodeOptions,
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
  BetaCodeYot,
  BetaTransliteration,
  ChiTransliteration,
  CircumflexTransliteration,
  ConversionOptions,
  ConversionOptionValues,
  CoronisTransliteration,
  DefaultConversionOptions,
  DentalSigmaOrthography,
  DiacriticDisposition,
  DiacriticOptions,
  DoubleRhoOrthography,
  EnotikonTransliteration,
  EtaTransliteration,
  FinalSigmaOrthography,
  GreekAccentuation,
  GreekAcuteForm,
  GreekAnoTeleiaForm,
  GreekQuestionMarkForm,
  GreekUnicodeOptions,
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
  OrthographyOptions,
  PhiTransliteration,
  Preset,
  QuantityTransliteration,
  ResolvedConversionOptions,
  RhoTransliteration,
  SigmaOrthography,
  SmoothBreathingTransliteration,
  UnicodeComposition,
  UpsilonTransliteration,
  WhitespaceOrthography,
  XiTransliteration,
} from "./options.ts";
export {
  CONVERSION_OPTION_VALUES,
  DEFAULT_CONVERSION_OPTIONS,
} from "./options.ts";
export {
  getPresetMetadata,
  getPresetOptions,
  listPresetMetadata,
  resolveConversionOptions,
} from "./presets.ts";
export type {
  OutOfScopeBehavior,
  PresetCoverage,
  PresetMetadata,
  PresetOptions,
  PresetReference,
} from "./presets.ts";
export { toUnicodeCodePoints } from "./unicode.ts";

/**
 * Removes removable marks and returns the canonical spelling of the selected
 * format. A rough breathing's `h` remains in transliteration because it is a
 * letter there; `diacritics.roughBreathing: "remove"` removes it explicitly.
 *
 * Structural distinctions required to identify a letter, such as `η → ē` and
 * `ω → ō`, are retained. Greek sigma glyphs are retained unless an explicit
 * orthographic policy overrides them. Context is analyzed before marks are
 * hidden.
 *
 * @example
 * ```ts
 * removeDiacritics("a)/nqrwpos", "beta-code"); // "anqrwpos"
 * ```
 */
export function removeDiacritics(
  input: string,
  format: Format,
  options: ConversionOptions = {},
): string {
  const resolved = resolveConversionOptions(options);
  assertTextInput(input);
  assertFormat(format);
  return encodeResolved(
    parseResolved(input, format, resolved, true),
    format,
    resolveConversionOptions({ ...options, removeDiacritics: true }),
  );
}

/**
 * Folds Greek letter-shape variants to a uniform comparison spelling.
 *
 * Medial beta `ϐ` becomes `β`, lunate sigma `ϲ` becomes `σ`, and every
 * lowercase final sigma `ς` becomes medial `σ`. Case and semantic diacritics
 * are preserved by default. They remain independently controllable through
 * the ordinary conversion options.
 *
 * @example
 * ```ts
 * foldGreekVariants("ϐίος λόγος ϲῶμα"); // "βίοσ λόγοσ σῶμα"
 * foldGreekVariants("ϐΊΟΣ", {
 *   orthography: { letterCase: "lowercase" },
 * }); // "βίοσ"
 * ```
 */
export function foldGreekVariants(
  input: string,
  options: ConversionOptions = {},
): string {
  const resolved = resolveConversionOptions(options);
  assertTextInput(input);
  return encodeResolved(
    parseResolved(input, "greek", resolved, true),
    "greek",
    {
      ...resolved,
      orthography: {
        ...resolved.orthography,
        medialBeta: "standard",
        sigma: "standard",
        finalSigma: "medial",
      },
    },
  );
}

/**
 * Re-encodes Greek text with explicit Unicode representation preferences.
 *
 * This helper does not change the Greek orthography. Forced oxia and Greek
 * punctuation scalars are applied after composition and may therefore produce
 * text that is canonically equivalent to NFC without itself being NFC.
 */
export function formatGreekUnicode(
  input: string,
  options: GreekUnicodeOptions = {},
): string {
  return encode(parse(input, "greek"), "greek", { unicode: options });
}

/**
 * Converts text between Greek, Beta Code, and scientific transliteration.
 *
 * Unknown literals are preserved. The result is canonical and idempotent for
 * fixed formats and options, but a reverse conversion is not necessarily
 * lossless; use {@link convertDetailed} when that distinction matters.
 *
 * @throws {TypeError} If `input` is not a string.
 * @throws {RangeError} If a format, preset, option key, or option value is
 * unknown.
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
 *   orthography: { finalSigma: "medial" },
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
 * @throws {RangeError} If a format, preset, option key, or option value is
 * unknown.
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

/** Converts Greek text to canonical Beta Code. */
export function greekToBetaCode(
  input: string,
  options: ConversionOptions = {},
): string {
  return convert(input, "greek", "beta-code", options);
}

/** Converts Greek text to scientific transliteration. */
export function greekToTransliteration(
  input: string,
  options: ConversionOptions = {},
): string {
  return convert(input, "greek", "transliteration", options);
}

/** Converts Beta Code to canonical Greek text. */
export function betaCodeToGreek(
  input: string,
  options: ConversionOptions = {},
): string {
  return convert(input, "beta-code", "greek", options);
}

/** Converts Beta Code to scientific transliteration. */
export function betaCodeToTransliteration(
  input: string,
  options: ConversionOptions = {},
): string {
  return convert(input, "beta-code", "transliteration", options);
}

/** Converts scientific transliteration to canonical Greek text. */
export function transliterationToGreek(
  input: string,
  options: ConversionOptions = {},
): string {
  return convert(input, "transliteration", "greek", options);
}

/** Converts scientific transliteration to canonical Beta Code. */
export function transliterationToBetaCode(
  input: string,
  options: ConversionOptions = {},
): string {
  return convert(input, "transliteration", "beta-code", options);
}
