/**
 * Convert Ancient, Byzantine, and Modern Greek between Greek script, Beta Code,
 * and Latin script, with atomic options composed into standards-based presets,
 * and information-loss diagnostics.
 *
 * Use {@link convert} for ordinary conversions and {@link convertDetailed}
 * when information-loss diagnostics are required, and
 * {@link convertGreekPassages} for Greek quoted in a text in another
 * language. Advanced access to the canonical document is available from the
 * `./document` entry point.
 *
 * @module
 */

import {
  encodeResolved,
  encodeTracked,
  parseResolved,
  readerFor,
  writerFor,
} from "./conversion.ts";
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
import { convertPassages, convertPassagesDetailed } from "./passages.ts";
import type { PreparedOptions } from "./prepared.ts";
import { conversionProfiles } from "./presets.ts";

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
  AnoTeleiaTransliteration,
  ArchaicKoppaTransliteration,
  BetaCodeCase,
  BetaCodeOptions,
  BetaCodeYot,
  BetaTransliteration,
  CapitalMarksOrthography,
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
  ElidedStopOrthography,
  EnotikonTransliteration,
  EtaTransliteration,
  FinalSigmaOrthography,
  GreekAccentuation,
  GreekAcuteForm,
  GreekAnoTeleiaForm,
  GreekOptions,
  GreekQuestionMarkForm,
  HyphenTransliteration,
  IotaSubscriptOrthography,
  KaiAccent,
  KeraiaTransliteration,
  LetterCaseOrthography,
  LigatureOrthography,
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
  SourceOptions,
  StigmaReading,
  SymbolFormOrthography,
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
export { getPresetMetadata, listPresetMetadata } from "./preset_metadata.ts";
export type {
  PresetCoverage,
  PresetMetadata,
  PresetOutOfScopeBehavior,
  PresetReference,
} from "./preset_metadata.ts";
export { getPresetOptions, resolveConversionOptions } from "./presets.ts";
export { prepareOptions } from "./prepare_options.ts";
export type { PreparedOptions } from "./prepared.ts";
export type { PresetOptions } from "./presets.ts";

/**
 * Converts text between Greek, Beta Code, and scientific transliteration.
 *
 * Unknown literals are preserved. The result is canonical and idempotent for
 * fixed formats and options, converted again without `source`, but a reverse
 * conversion is not necessarily lossless; use {@link convertDetailed} when
 * that distinction matters.
 *
 * Without a preset, transliteration is the library's own: the letters of the
 * SBL Handbook of Style, with the accents, iota subscript, diaeresis, and
 * quantity marks that the Handbook leaves out.
 *
 * The defaults and each preset are checked and resolved once; other options,
 * at each call, unless they are prepared once with {@link prepareOptions}.
 *
 * @example
 * ```ts
 * import { convert } from "@humanities/greek-conversion";
 *
 * convert("λόγος", "greek", "beta-code"); // → lo/gos
 * convert("Θεσσαλονίκη", "greek", "transliteration", {
 *   preset: "iso-843-type-2",
 * });
 * // → Thessaloníki
 * ```
 *
 * @throws {TypeError} If `input` is not a string.
 * @throws {RangeError} If a format is unknown; an {@link OptionError} (a
 * `RangeError`) if a preset, an option key, or an option value is.
 */
export function convert(
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions | PreparedOptions = {},
): string {
  return runConversion(input, from, to, options).output;
}

/**
 * Parses and re-encodes text in the same format.
 *
 * This is the expressive shorthand for `convert(input, format, format,
 * options)`. It canonicalizes accepted aliases and applies the selected
 * orthographic policies. The options describe the input as well, which
 * normalizes a text in its own style. Reading transliteration depends on its
 * options: to restyle a transliteration, give the style it is written in as
 * `options.source` ({@link ConversionOptions.source}).
 *
 * @example
 * ```ts
 * import { reencode } from "@humanities/greek-conversion";
 *
 * reencode("λόγος", "greek", {
 *   greek: { finalSigma: "medial" },
 * });
 * // → λόγοσ
 *
 * reencode("phílos", "transliteration", {
 *   transliteration: { phi: "f" },
 *   source: {},
 * });
 * // → fílos
 * ```
 */
export function reencode(
  input: string,
  format: Format,
  options: ConversionOptions | PreparedOptions = {},
): string {
  return convert(input, format, format, options);
}

/**
 * Converts text and reports information that the target representation cannot
 * retain, and where each source token was read and written.
 *
 * Unicode composition and tonos/oxia are representational differences and are
 * not reported as loss. A letter form of the source (`glyphVariant`) is
 * reported when the target cannot keep it and the options do not write it
 * again; a form the options fold is not. The conversion itself is executed
 * once; only the rendered target is parsed again for comparison.
 *
 * Positions ({@link ConversionResult.spans}, {@link ConversionLoss.offset})
 * are offsets in UTF-16 code units in the input as supplied and in the
 * output as returned: the readers and writers normalize the text, but the
 * positions are mapped back to the caller's strings.
 *
 * @example
 * ```ts
 * import { convertDetailed } from "@humanities/greek-conversion";
 *
 * const result = convertDetailed("ἐν ἀρχῇ", "greek", "transliteration", {
 *   preset: "sbl-general",
 * });
 * result.output; // → en archē
 * result.lossy; // → true
 * result.losses.map((loss) => loss.diacritic);
 * // → ["smooth","smooth","circumflex","iota-subscript"]
 * ```
 *
 * @throws {TypeError} If `input` is not a string.
 * @throws {RangeError} If a format is unknown; an {@link OptionError} (a
 * `RangeError`) if a preset, an option key, or an option value is.
 */
export function convertDetailed(
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions | PreparedOptions = {},
): ConversionResult {
  assertTextInput(input);
  assertFormat(from);
  assertFormat(to);
  const { reading, writing: resolved } = conversionProfiles(options);
  const read: ReadPositions = { text: "", starts: [] };
  const source = parseResolved(input, from, reading, true, read);
  const inputSpans = readSpans(input, read);
  const { output, spans: outputSpans } = encodeTracked(source, to, resolved);
  // Where the target tokens were read, only if the losses need it: reading
  // the output again with positions costs less than recording them each
  // time. Where the output writes letters that read back as others, as
  // transliteration without length marks writes eta (ISO 843 Type 2), the
  // losses need them for nearly every text: they are recorded as it is read.
  const readTarget: ReadPositions | undefined = to === "transliteration" &&
      resolved.transliteration.longVowels === "omit"
    ? { text: "", starts: [] }
    : undefined;
  const target = parseResolved(output, to, resolved, true, readTarget);
  const losses = findConversionLosses(
    source,
    target,
    inputSpans,
    () => {
      let reread = readTarget;
      if (reread === undefined) {
        reread = { text: "", starts: [] };
        parseResolved(output, to, resolved, true, reread);
      }
      return { written: outputSpans, read: readSpans(output, reread) };
    },
    { glyphForm: writerFor(from).glyphForm, options: reading, format: from },
  );

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

/**
 * Converts the Greek passages of a text, for Greek quoted in a text in
 * another language, and copies the rest as it is, code unit by code unit.
 *
 * A Greek passage is a run of Greek letters with their combining marks, and
 * of the signs that only Greek uses, by their code points: the Greek
 * question mark (U+037E), the ano teleia (U+0387), the koronis (U+1FBD), the
 * spacing breathings and accents, and the keraiai (U+0374, which
 * normalization makes U+02B9, and U+0375). Everything else is copied: the
 * punctuation that Greek shares with other scripts (`;`, `?`, `·`, `'`,
 * `’`, `-`), whitespace, and the text around. The options apply to the
 * passages; the rules of the conversion see the whole text, so that before
 * `.`, `Θ` is an initial (`Th.`). The source is Greek: in Beta Code and
 * transliteration, Latin letters are the Greek text. Into Greek, the
 * passages are normalized in the style of the options.
 *
 * @example
 * ```ts
 * import { convertGreekPassages } from "@humanities/greek-conversion";
 *
 * convertGreekPassages("see λόγος; also ‘ἀπ᾽ αὐτοῦ’", "transliteration");
 * // → see lógos; also ‘ap’ autoũ’
 * ```
 *
 * @param to The format of the passages in the output.
 * @throws {TypeError} If `input` is not a string.
 * @throws {RangeError} If the format is unknown; an {@link OptionError} (a
 * `RangeError`) if a preset, an option key, or an option value is.
 */
export function convertGreekPassages(
  input: string,
  to: Format,
  options: ConversionOptions | PreparedOptions = {},
): string {
  assertTextInput(input);
  assertFormat(to);
  const { reading, writing } = conversionProfiles(options);
  return convertPassages(input, writerFor(to), reading, writing);
}

/**
 * {@link convertGreekPassages}, with the losses and the spans of
 * {@link convertDetailed}. The text copied keeps what it has, and its spans
 * in the output are those in the input, moved; the losses are those of the
 * passages.
 *
 * @example
 * ```ts
 * import { convertGreekPassagesDetailed } from "@humanities/greek-conversion";
 *
 * const result = convertGreekPassagesDetailed("voir ϐίος ;", "beta-code");
 * result.output; // → voir bi/os ;
 * result.losses.map((loss) => loss.code); // → ["removed-glyph-variant"]
 * ```
 *
 * @param to The format of the passages in the output.
 * @throws {TypeError} If `input` is not a string.
 * @throws {RangeError} If the format is unknown; an {@link OptionError} (a
 * `RangeError`) if a preset, an option key, or an option value is.
 */
export function convertGreekPassagesDetailed(
  input: string,
  to: Format,
  options: ConversionOptions | PreparedOptions = {},
): ConversionResult {
  assertTextInput(input);
  assertFormat(to);
  const { reading, writing } = conversionProfiles(options);
  return convertPassagesDetailed(
    input,
    writerFor(to),
    readerFor(to),
    reading,
    writing,
  );
}

function runConversion(
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions | PreparedOptions,
): { source: Document; output: string; resolved: ResolvedConversionOptions } {
  assertTextInput(input);
  assertFormat(from);
  assertFormat(to);
  const { reading, writing: resolved } = conversionProfiles(options);
  const source = parseResolved(input, from, reading, true);
  return { source, output: encodeResolved(source, to, resolved), resolved };
}
