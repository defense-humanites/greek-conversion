import { ALPHABET } from "./alphabet.ts";
import {
  encodeResolved,
  encodeTracked,
  parse,
  parseResolved,
} from "./conversion.ts";
import {
  type ConversionLoss,
  type ConversionResult,
  type ConversionSpan,
  findConversionLosses,
} from "./losses.ts";
import {
  isBoundaryTransparent,
  isVowel,
  isWordInitial,
  keptLetter,
  type QuotationContext,
  sigmaEndsWord,
} from "./context.ts";
import { assertFormat, assertTextInput, grapheme, literal } from "./model.ts";
import type { Document, Format, Grapheme, Letter, Token } from "./model.ts";
import {
  type ConversionOptions,
  DEFAULT_CONVERSION_OPTIONS,
  type Preset,
  type ResolvedConversionOptions,
} from "./options.ts";
import { decimalNumeralTokens } from "./orthography.ts";
import {
  isCharacterInPresetScope,
  presetMappingIssue,
  resolveConversionOptions,
} from "./presets.ts";
import {
  type ReadPositions,
  readSpans,
  type SegmentMap,
  segmentMap,
  spansIn,
  type SpanTable,
} from "./parsers/positions.ts";
import { parsePunctuation } from "./punctuation.ts";

/** Treatment of recognized characters outside this converter's repertoire. */
export type ConverterOutOfScopeBehavior = "preserve" | "reject";

/** One additional input spelling that resolves to a built-in Greek letter. */
export interface CharacterAliasDefinition {
  /** Built-in semantic letter that receives the additional spelling. */
  letter: Letter;
  /** Representation in which the spelling is recognized. */
  format: Format;
  /** Additional source spellings. Longest spellings are matched first. */
  spellings: readonly string[];
  /** Semantic case represented by every supplied spelling. */
  uppercase?: boolean;
  /** Allows the alias to take precedence over an existing parser match. */
  override?: boolean;
}

/**
 * Lowercase and optional uppercase spellings in one representation. Each form
 * should spell one letter: a later release may write a multi-letter uppercase
 * form in full capitals among capitals, as built-in letters are (see
 * `docs/character-extensions.md`, *Word context*).
 */
export interface CustomCharacterForms {
  /** Canonical lowercase spelling. */
  lowercase: string;
  /** Canonical uppercase spelling; derived mechanically when omitted. */
  uppercase?: string;
}

/** Direct spellings of one opaque user-defined character. */
export interface CustomCharacterDefinition {
  /** Stable identifier distinct from every built-in {@link Letter}. */
  id: string;
  /** Canonical spellings in every supported representation. */
  forms: Readonly<Record<Format, CustomCharacterForms>>;
  /** Allows its input spellings to take precedence over parser matches. */
  override?: boolean;
}

/** Character inventory applied by one converter instance. */
export interface CharacterRepertoireDefinition {
  /** Exact allow-list. Omitting it enables every registered character. */
  repertoire?: readonly string[];
  /** Characters removed after the allow-list is resolved. */
  exclude?: readonly string[];
}

/** Immutable configuration used to create an isolated converter. */
export interface ConverterConfiguration extends CharacterRepertoireDefinition {
  /** Preset options and audited built-in scope bound to every conversion. */
  preset?: Preset;
  /**
   * Preserves unsupported recognized input by default or rejects the
   * conversion. A preserved letter is written as the source writes it in its
   * word: of the conversion's options, only `text` changes it, as it changes
   * the whole text.
   */
  outOfScopeBehavior?: ConverterOutOfScopeBehavior;
  /** Additional spellings of built-in semantic letters. */
  aliases?: readonly CharacterAliasDefinition[];
  /** Opaque characters converted only through their declared direct forms. */
  characters?: readonly CustomCharacterDefinition[];
}

/** Stable diagnostic codes emitted by an extensible converter. */
export type CharacterScopeDiagnosticCode =
  | "out-of-scope-character"
  | "undefined-preset-mapping"
  | "unresolved-preset-mapping";

/** One recognized character excluded or lacking a defined preset mapping. */
export interface CharacterScopeDiagnostic {
  /** Stable category suitable for programmatic handling. */
  code: CharacterScopeDiagnosticCode;
  /**
   * Zero-based token index in the source document as the conversion prepared
   * it, the document that `losses` and `spans` index as well: a custom form
   * preserved as several literals is reported at the first of them, and
   * `spans[index]` is where the character was read.
   */
  index: number;
  /**
   * Offset, in UTF-16 code units, of the character in the input as supplied:
   * the spelling the converter recognized (an alias, a custom form, or the
   * built-in spelling).
   */
  offset: number;
  /** Length of that spelling in the input, in UTF-16 code units. */
  length: number;
  /** Built-in letter name or user-defined character identifier. */
  character: string;
  /** Human-readable English explanation. */
  message: string;
}

/** Error raised when a converter rejects recognized unsupported input. */
export class CharacterScopeError extends RangeError {
  /** Every rejected occurrence, indexed in the parsed source document. */
  readonly diagnostics: readonly CharacterScopeDiagnostic[];

  /** Creates an error with an immutable snapshot of the source diagnostics. */
  constructor(diagnostics: readonly CharacterScopeDiagnostic[]) {
    const onlyScope = diagnostics.every(({ code }) =>
      code === "out-of-scope-character"
    );
    super(
      `Conversion rejected: ${diagnostics.length} ${
        onlyScope ? "out-of-scope" : "unsupported"
      } ${diagnostics.length === 1 ? "character" : "characters"}.`,
    );
    this.name = "CharacterScopeError";
    this.diagnostics = Object.freeze(
      diagnostics.map((diagnostic) => Object.freeze({ ...diagnostic })),
    );
  }
}

/** Detailed conversion result with character diagnostics kept separate. */
export interface ConverterConversionResult extends ConversionResult {
  /** Non-lossy repertoire and preset-mapping diagnostics from the source. */
  diagnostics: readonly CharacterScopeDiagnostic[];
  /** Information losses inherited from the ordinary conversion contract. */
  losses: readonly ConversionLoss[];
  /**
   * One span per token of the prepared source document (the parsed input,
   * with out-of-scope characters preserved as literals, except the letters
   * of a decimal numeral), as in
   * `convertDetailed()`: positions are in the input as supplied, before the
   * converter's own spellings are substituted, and in the output as
   * returned, after the custom forms are written.
   */
  spans: readonly ConversionSpan[];
}

interface AliasEntry {
  kind: "alias";
  format: Format;
  spelling: string;
  normalized: readonly string[];
  letter: Letter;
  uppercase: boolean;
}

interface CustomEntry {
  kind: "custom";
  format: Format;
  spelling: string;
  normalized: readonly string[];
  id: string;
  uppercase: boolean;
  sentinel: string;
}

type InputEntry = AliasEntry | CustomEntry;

interface NormalizedCustomCharacter {
  id: string;
  forms: Readonly<Record<Format, Readonly<Required<CustomCharacterForms>>>>;
  lowercaseSentinel: string;
  uppercaseSentinel: string;
  override: boolean;
}

/**
 * One spelling the preprocessing replaced: the units it covered in the
 * normalized input and the units of its replacement in the preprocessed
 * text. Outside the matches, the two texts run unit for unit.
 */
interface Match {
  normalizedStart: number;
  normalizedEnd: number;
  valueStart: number;
  valueEnd: number;
}

interface PreprocessedInput {
  /** The text the reader receives: the input with the spellings replaced. */
  value: string;
  originals: ReadonlyMap<string, readonly string[]>;
  /** What was supplied, its normalized form, and the replacements made. */
  input: string;
  normalized: string;
  format: Format;
  matches: readonly Match[];
}

interface PreparedSource {
  document: Document;
  diagnostics: readonly CharacterScopeDiagnostic[];
  /** The span in the supplied input of each token of `document`, if asked. */
  spans?: SpanTable;
}

const BUILTIN_LETTERS = new Set<string>(Object.keys(ALPHABET));
const SENTINEL_START = 0xF0000;

/**
 * An immutable conversion engine with isolated character extensions. Create
 * one with `createConverter()`: the class is exported as a type only.
 *
 * Aliases resolve to built-in letters and therefore receive the complete
 * contextual behavior of those letters. New characters are deliberately
 * opaque: only direct format mapping and semantic case are guaranteed.
 */
export class Converter {
  readonly #entries: Readonly<Record<Format, readonly InputEntry[]>>;
  readonly #characters: ReadonlyMap<string, NormalizedCustomCharacter>;
  readonly #sentinels: ReadonlyMap<string, {
    character: NormalizedCustomCharacter;
    uppercase: boolean;
  }>;
  readonly #repertoire?: ReadonlySet<string>;
  readonly #excluded: ReadonlySet<string>;
  readonly #preset?: Preset;
  readonly #outOfScopeBehavior: ConverterOutOfScopeBehavior;
  /** Whether a recognized letter can fall outside this converter's scope. */
  readonly #keepsLetters: boolean;

  /** Creates an isolated converter from copied and validated definitions. */
  constructor(configuration: ConverterConfiguration = {}) {
    if (configuration.preset !== undefined) {
      resolveConversionOptions({ preset: configuration.preset });
    }
    this.#preset = configuration.preset;
    const behavior = configuration.outOfScopeBehavior ?? "preserve";
    if (behavior !== "preserve" && behavior !== "reject") {
      throw new TypeError(`Unknown out-of-scope behavior: ${behavior}.`);
    }
    this.#outOfScopeBehavior = behavior;

    const characters = normalizeCharacters(configuration.characters ?? []);
    this.#characters = new Map(characters.map((value) => [value.id, value]));
    const sentinels: Array<
      readonly [string, {
        character: NormalizedCustomCharacter;
        uppercase: boolean;
      }]
    > = characters.flatMap((character) => [
      [character.lowercaseSentinel, { character, uppercase: false }] as const,
      [character.uppercaseSentinel, { character, uppercase: true }] as const,
    ]);
    this.#sentinels = new Map(sentinels);

    const aliases = normalizeAliases(configuration.aliases ?? []);
    const entries = buildEntries(aliases, characters);
    validateEntries(entries);
    this.#entries = {
      greek: freezeEntries(entries.filter((entry) => entry.format === "greek")),
      "beta-code": freezeEntries(
        entries.filter((entry) => entry.format === "beta-code"),
      ),
      transliteration: freezeEntries(
        entries.filter((entry) => entry.format === "transliteration"),
      ),
    };

    const known = new Set([...BUILTIN_LETTERS, ...this.#characters.keys()]);
    this.#repertoire = configuration.repertoire === undefined
      ? undefined
      : new Set(validateCharacterIds(configuration.repertoire, known));
    this.#excluded = new Set(
      validateCharacterIds(configuration.exclude ?? [], known),
    );
    this.#keepsLetters = this.#excluded.size > 0 ||
      this.#repertoire !== undefined || this.#preset !== undefined;

    Object.freeze(this);
  }

  /** Converts text using this converter's immutable character registry. */
  convert(
    input: string,
    from: Format,
    to: Format,
    options: ConversionOptions = {},
  ): string {
    return this.#run(input, from, to, options).output;
  }

  /** Converts text and reports both information loss and repertoire scope. */
  convertDetailed(
    input: string,
    from: Format,
    to: Format,
    options: ConversionOptions = {},
  ): ConverterConversionResult {
    assertTextInput(input);
    assertFormat(from);
    assertFormat(to);
    const resolved = this.#resolveOptions(options);
    const sourceInput = this.#preprocess(input, from, resolved);
    const prepared = this.#prepareSource(
      sourceInput,
      from,
      resolved,
      to,
      "spans",
    );
    this.#assertScope(prepared.diagnostics);
    const encoded = encodeTracked(prepared.document, to, resolved);
    const { output, map } = this.#postprocess(encoded.output, to, true);

    const targetInput = this.#preprocess(output, to, resolved);
    const target =
      this.#prepareSource(targetInput, to, resolved, undefined, "none")
        .document;
    const inputSpans = prepared.spans!;
    const outputSpans = map === undefined ? encoded.spans : spansIn(
      encoded.spans.starts,
      encoded.spans.ends,
      prepared.document.length,
      map,
    );
    const losses = findConversionLosses(
      prepared.document,
      target,
      inputSpans,
      // Reading the output again with positions, only if the losses need it.
      () => ({
        written: outputSpans,
        read: this.#prepareSource(targetInput, to, resolved, undefined, "spans")
          .spans!,
      }),
    );
    const spans: ConversionSpan[] = new Array(prepared.document.length);
    for (let index = 0; index < spans.length; index++) {
      spans[index] = {
        inputStart: inputSpans.starts[index],
        inputEnd: inputSpans.ends[index],
        outputStart: outputSpans.starts[index],
        outputEnd: outputSpans.ends[index],
      };
    }

    return {
      output,
      lossy: losses.length > 0,
      losses,
      diagnostics: prepared.diagnostics,
      spans,
    };
  }

  #run(
    input: string,
    from: Format,
    to: Format,
    options: ConversionOptions,
  ): { output: string } {
    assertTextInput(input);
    assertFormat(from);
    assertFormat(to);
    const resolved = this.#resolveOptions(options);
    const preprocessed = this.#preprocess(input, from, resolved);
    // Only a rejection shows the diagnostics, in the error it throws.
    const prepared = this.#prepareSource(
      preprocessed,
      from,
      resolved,
      to,
      this.#outOfScopeBehavior === "reject" ? "diagnostics" : "none",
    );
    this.#assertScope(prepared.diagnostics);
    const encoded = encodeResolved(prepared.document, to, resolved);
    return { output: this.#postprocess(encoded, to).output };
  }

  #preprocess(
    input: string,
    format: Format,
    options: ResolvedConversionOptions,
  ): PreprocessedInput {
    for (const sentinel of this.#sentinels.keys()) {
      if (input.includes(sentinel)) {
        throw new TypeError(
          "Input contains a private-use scalar reserved by this converter.",
        );
      }
    }

    const normalizedInput = normalizeSpelling(input, format);
    const chars = Array.from(normalizedInput);
    const output: string[] = [];
    const originals = new Map<string, string[]>();
    const entries = this.#entries[format];
    const matches: Match[] = [];
    // Code-unit offset of character `scanned` in the normalized input, and
    // how much longer the output is so far than the input it replaces: only
    // computed at a match, which is rare.
    let scanned = 0;
    let scannedOffset = 0;
    let valueDelta = 0;
    const offsetOf = (index: number): number => {
      for (; scanned < index; scanned++) scannedOffset += chars[scanned].length;
      return scannedOffset;
    };

    for (let index = 0; index < chars.length;) {
      const match = entries.find((entry) =>
        entry.normalized.every((char, offset) => chars[index + offset] === char)
      );

      if (match === undefined) {
        output.push(chars[index]);
        index++;
        continue;
      }

      let replacement: string;
      if (match.kind === "alias") {
        replacement = encodeResolved(
          [grapheme(match.letter, match.uppercase)],
          format,
          options,
        );
      } else {
        replacement = match.sentinel;
        const values = originals.get(match.sentinel) ?? [];
        values.push(
          chars.slice(index, index + match.normalized.length).join(""),
        );
        originals.set(match.sentinel, values);
      }
      output.push(replacement);
      const normalizedStart = offsetOf(index);
      const normalizedEnd = offsetOf(index + match.normalized.length);
      const valueStart = normalizedStart + valueDelta;
      matches.push({
        normalizedStart,
        normalizedEnd,
        valueStart,
        valueEnd: valueStart + replacement.length,
      });
      valueDelta += replacement.length - (normalizedEnd - normalizedStart);
      index += match.normalized.length;
    }

    return {
      value: output.join(""),
      originals,
      input,
      normalized: normalizedInput,
      format,
      matches,
    };
  }

  /**
   * Parses the preprocessed input and preserves or rejects the characters
   * outside the converter's scope. `positions` says which positions to
   * report: those of the diagnostics only, computed when there are any by
   * reading the text again with positions; those of every token of the
   * document as well (`spans`); or none, for a target document that is only
   * compared.
   */
  #prepareSource(
    input: PreprocessedInput,
    format: Format,
    options: ResolvedConversionOptions,
    target?: Format,
    positions: "diagnostics" | "spans" | "none" = "diagnostics",
  ): PreparedSource {
    const track = positions === "spans";
    // A transliterated letter kept out of scope is copied from where it was
    // read: a converter that can keep letters records it while reading, which
    // costs less than reading the text again.
    const read: ReadPositions | undefined = track ||
        format === "transliteration" && this.#keepsLetters
      ? { text: "", starts: [] }
      : undefined;
    const parsed = parseResolved(input.value, format, options, true, read);
    const diagnostics: CharacterScopeDiagnostic[] = [];
    // The parsed token each diagnostic reports: its index in the prepared
    // document, where it may have become several literals, is the one the
    // diagnostic carries, like the losses and the spans.
    const reported: number[] = [];
    const occurrences = new Map<string, number>();
    // The parsed token each prepared token comes from.
    const origins: number[] | undefined = track ? [] : undefined;
    let prepared = 0;
    const kept: KeptLetters = {
      parsed,
      format,
      options,
      value: input.value,
      read,
    };

    const document = parsed.flatMap((token, index): readonly Token[] => {
      const before = diagnostics.length;
      const tokens = this.#prepareToken(
        token,
        index,
        parsed,
        input,
        format,
        options,
        target,
        diagnostics,
        occurrences,
        kept,
      );
      if (diagnostics.length > before) {
        diagnostics[before].index = prepared;
        reported.push(index);
      }
      if (origins !== undefined) {
        for (let k = 0; k < tokens.length; k++) origins.push(index);
      }
      prepared += tokens.length;
      return tokens;
    });

    if (!track && (positions === "none" || diagnostics.length === 0)) {
      return { document, diagnostics };
    }

    // Where each parsed token was read, in the input as supplied.
    const parsedSpans = parsedInputSpans(
      input,
      read ?? readAgain(input.value, format, options),
    );
    for (const [k, diagnostic] of diagnostics.entries()) {
      diagnostic.offset = parsedSpans.starts[reported[k]];
      diagnostic.length = parsedSpans.ends[reported[k]] - diagnostic.offset;
    }
    if (origins === undefined) return { document, diagnostics };

    // The literals an out-of-scope token became share its span.
    const starts = new Array<number>(document.length).fill(0);
    const ends = new Array<number>(document.length).fill(0);
    for (let index = 0; index < document.length; index++) {
      starts[index] = parsedSpans.starts[origins[index]];
      ends[index] = parsedSpans.ends[origins[index]];
    }
    return { document, diagnostics, spans: { starts, ends } };
  }

  #prepareToken(
    token: Token,
    index: number,
    parsed: Document,
    input: PreprocessedInput,
    format: Format,
    options: ResolvedConversionOptions,
    target: Format | undefined,
    diagnostics: CharacterScopeDiagnostic[],
    occurrences: Map<string, number>,
    kept: KeptLetters,
  ): readonly Token[] {
    if (token.kind === "grapheme") {
      if (!this.#isAllowed(token.letter, parsed, index)) {
        const numeral = inDecimalNumeral(kept, index);
        diagnostics.push(
          scopeDiagnostic(
            index,
            token.letter,
            this.#outOfScopeBehavior,
            numeral,
          ),
        );
        return numeral ? [token] : keptTokens(kept, index);
      }
      const issue = this.#preset !== undefined && target !== undefined
        ? presetMappingIssue(
          this.#preset,
          token.letter,
          parsed,
          index,
          target,
          options,
        )
        : undefined;
      if (issue === undefined) return [token];
      const numeral = inDecimalNumeral(kept, index);
      diagnostics.push(
        mappingDiagnostic(
          index,
          token.letter,
          issue,
          this.#outOfScopeBehavior,
          numeral,
        ),
      );
      return numeral ? [token] : keptTokens(kept, index);
    }

    const custom = this.#sentinels.get(token.value);
    if (
      custom === undefined ||
      this.#isAllowed(custom.character.id, parsed, index)
    ) {
      return [token];
    }

    diagnostics.push(
      scopeDiagnostic(index, custom.character.id, this.#outOfScopeBehavior),
    );
    const occurrence = occurrences.get(token.value) ?? 0;
    occurrences.set(token.value, occurrence + 1);
    const original = input.originals.get(token.value)?.[occurrence] ??
      customForm(custom.character, format, custom.uppercase, options);
    return literalTokens(original);
  }

  /**
   * Writes the custom characters' forms in place of their sentinels. With
   * `track`, also returns, for each unit of `input` (and its length), the
   * range it became in the output: a sentinel's two units both become its
   * form.
   */
  #postprocess(
    input: string,
    format: Format,
    track = false,
  ): { output: string; map?: SegmentMap } {
    if (this.#sentinels.size === 0) return { output: input };
    const starts = track
      ? new Array<number>(input.length + 1).fill(0)
      : undefined;
    const ends = track
      ? new Array<number>(input.length + 1).fill(0)
      : undefined;
    let output = "";
    // Start of the run of ordinary units not yet copied to the output.
    let run = 0;
    // The units of a run keep their order: each becomes the one at the same
    // distance from the run's start in the output.
    const copyRun = (end: number) => {
      if (starts !== undefined && ends !== undefined) {
        const delta = output.length - run;
        for (let k = run; k < end; k++) {
          starts[k] = k + delta;
          ends[k] = k + delta + 1;
        }
      }
      output += input.slice(run, end);
    };
    for (let i = 0; i < input.length; i++) {
      const unit = input.charCodeAt(i);
      // Sentinels are private-use scalars of planes 15 and 16: a high
      // surrogate in U+DB80–U+DBFF followed by a low one.
      if (unit < 0xDB80 || unit > 0xDBFF || i + 1 >= input.length) continue;
      const sentinel = this.#sentinels.get(input.slice(i, i + 2));
      if (sentinel === undefined) continue;
      copyRun(i);
      const form = customForm(sentinel.character, format, sentinel.uppercase);
      if (starts !== undefined && ends !== undefined) {
        starts[i] = starts[i + 1] = output.length;
        ends[i] = ends[i + 1] = output.length + form.length;
      }
      output += form;
      i++;
      run = i + 1;
    }
    if (run === 0) return { output: input };
    copyRun(input.length);
    if (starts === undefined || ends === undefined) return { output };
    starts[input.length] = ends[input.length] = output.length;
    return { output, map: { starts, ends } };
  }

  #resolveOptions(options: ConversionOptions): ResolvedConversionOptions {
    if (
      this.#preset !== undefined && options.preset !== undefined &&
      options.preset !== this.#preset
    ) {
      throw new RangeError(
        `Converter is bound to preset ${this.#preset}; received ${options.preset}.`,
      );
    }
    return resolveConversionOptions(
      this.#preset === undefined
        ? options
        : { ...options, preset: this.#preset },
    );
  }

  #assertScope(diagnostics: readonly CharacterScopeDiagnostic[]): void {
    if (this.#outOfScopeBehavior === "reject" && diagnostics.length > 0) {
      throw new CharacterScopeError(diagnostics);
    }
  }

  #isAllowed(id: string, document: Document, index: number): boolean {
    return !this.#excluded.has(id) &&
      (this.#repertoire === undefined || this.#repertoire.has(id)) &&
      (this.#preset === undefined ||
        isCharacterInPresetScope(this.#preset, id, document, index));
  }
}

/** Creates an immutable converter with isolated character extensions. */
export function createConverter(
  configuration: ConverterConfiguration = {},
): Converter {
  return new Converter(configuration);
}

function normalizeAliases(
  definitions: readonly CharacterAliasDefinition[],
): readonly CharacterAliasDefinition[] {
  return definitions.map((definition) => {
    if (definition.spellings.length === 0) {
      throw new TypeError(
        "A character alias must contain at least one spelling.",
      );
    }
    return {
      ...definition,
      spellings: Object.freeze([...definition.spellings]),
    };
  });
}

function normalizeCharacters(
  definitions: readonly CustomCharacterDefinition[],
): readonly NormalizedCustomCharacter[] {
  const ids = new Set<string>();

  return definitions.map((definition, index) => {
    if (definition.id.length === 0) {
      throw new TypeError("A custom character identifier cannot be empty.");
    }
    if (BUILTIN_LETTERS.has(definition.id) || ids.has(definition.id)) {
      throw new TypeError(`Duplicate character identifier: ${definition.id}.`);
    }
    ids.add(definition.id);

    const forms = Object.fromEntries(
      (["greek", "beta-code", "transliteration"] as const).map((format) => {
        const supplied = definition.forms[format];
        if (supplied.lowercase.length === 0) {
          throw new TypeError(
            `Custom character ${definition.id} has an empty ${format} form.`,
          );
        }
        return [
          format,
          Object.freeze({
            lowercase: supplied.lowercase,
            uppercase: supplied.uppercase ??
              deriveUppercase(supplied.lowercase, format),
          }),
        ];
      }),
    ) as Record<Format, Readonly<Required<CustomCharacterForms>>>;

    return Object.freeze({
      id: definition.id,
      forms: Object.freeze(forms),
      lowercaseSentinel: String.fromCodePoint(SENTINEL_START + index * 2),
      uppercaseSentinel: String.fromCodePoint(SENTINEL_START + index * 2 + 1),
      override: definition.override === true,
    });
  });
}

function buildEntries(
  aliases: readonly CharacterAliasDefinition[],
  characters: readonly NormalizedCustomCharacter[],
): readonly (InputEntry & { override?: boolean })[] {
  const entries: Array<InputEntry & { override?: boolean }> = [];

  for (const alias of aliases) {
    for (const spelling of alias.spellings) {
      const normalized = normalizeSpelling(spelling, alias.format);
      entries.push({
        kind: "alias",
        format: alias.format,
        spelling,
        normalized: Array.from(normalized),
        letter: alias.letter,
        uppercase: alias.uppercase ?? isUppercase(spelling, alias.format),
        override: alias.override,
      });
    }
  }

  for (const character of characters) {
    for (const format of ["greek", "beta-code", "transliteration"] as const) {
      const forms = character.forms[format];
      entries.push({
        kind: "custom",
        format,
        spelling: forms.lowercase,
        normalized: Array.from(normalizeSpelling(forms.lowercase, format)),
        id: character.id,
        uppercase: false,
        sentinel: character.lowercaseSentinel,
        override: character.override,
      });
      if (forms.uppercase !== forms.lowercase) {
        entries.push({
          kind: "custom",
          format,
          spelling: forms.uppercase,
          normalized: Array.from(normalizeSpelling(forms.uppercase, format)),
          id: character.id,
          uppercase: true,
          sentinel: character.uppercaseSentinel,
          override: character.override,
        });
      }
    }
  }

  return entries;
}

function validateEntries(
  entries: readonly (InputEntry & { override?: boolean })[],
): void {
  const seen = new Map<string, InputEntry>();

  for (const entry of entries) {
    if (entry.normalized.length === 0) {
      throw new TypeError("A character spelling cannot be empty.");
    }
    const key = `${entry.format}\0${entry.normalized.join("")}`;
    const previous = seen.get(key);
    if (previous !== undefined) {
      throw new TypeError(
        `Ambiguous ${entry.format} character spelling: ${entry.spelling}.`,
      );
    }
    seen.set(key, entry);

    const spelling = entry.normalized.join("");
    const parsed = parse(spelling, entry.format);
    const rawLiterals = Array.from(spelling);
    const shadowsMeaning =
      rawLiterals.some((value) =>
        parsePunctuation(value, entry.format) !== undefined
      ) || parsed.length !== rawLiterals.length ||
      parsed.some((token, index) =>
        token.kind !== "literal" || token.value !== rawLiterals[index]
      );
    if (shadowsMeaning && entry.override !== true) {
      throw new TypeError(
        `${entry.format} spelling ${entry.spelling} already has a meaning; set override to true to replace it.`,
      );
    }
  }
}

function freezeEntries(entries: readonly InputEntry[]): readonly InputEntry[] {
  return Object.freeze(
    [...entries].sort((left, right) =>
      right.normalized.length - left.normalized.length
    ).map((entry) => Object.freeze({ ...entry })),
  );
}

function validateCharacterIds(
  values: readonly string[],
  known: ReadonlySet<string>,
): readonly string[] {
  return values.map((value) => {
    if (!known.has(value)) {
      throw new TypeError(`Unknown character identifier: ${value}.`);
    }
    return value;
  });
}

function normalizeSpelling(value: string, format: Format): string {
  return format === "beta-code"
    ? value.replace(/[A-Z]/g, (letter) => letter.toLowerCase())
    : value.normalize("NFD");
}

function deriveUppercase(value: string, format: Format): string {
  if (format === "beta-code") return `*${value}`;
  const locale = format === "greek" ? "el" : undefined;
  const chars = Array.from(value);
  if (chars.length === 0) return value;
  chars[0] = locale === undefined
    ? chars[0].toUpperCase()
    : chars[0].toLocaleUpperCase(locale);
  return chars.join("");
}

function isUppercase(value: string, format: Format): boolean {
  if (format === "beta-code") return value.startsWith("*");
  const locale = format === "greek" ? "el" : undefined;
  const lowercase = locale === undefined
    ? value.toLowerCase()
    : value.toLocaleLowerCase(locale);
  return value !== lowercase;
}

function customForm(
  character: NormalizedCustomCharacter,
  format: Format,
  uppercase: boolean,
  options?: ResolvedConversionOptions,
): string {
  let value = uppercase
    ? character.forms[format].uppercase
    : character.forms[format].lowercase;
  if (format === "beta-code" && options !== undefined) {
    const semanticPrefix = value.startsWith("*") ? "*" : "";
    const base = semanticPrefix === "" ? value : value.slice(1);
    value = semanticPrefix +
      (options.betaCode.case === "uppercase"
        ? base.toUpperCase()
        : base.toLowerCase());
  }
  return value;
}

function scopeDiagnostic(
  index: number,
  character: string,
  behavior: ConverterOutOfScopeBehavior,
  numeral = false,
): CharacterScopeDiagnostic {
  return {
    code: "out-of-scope-character",
    index,
    offset: 0,
    length: 0,
    character,
    message:
      `Character ${character} is outside this converter's repertoire and was ${
        outcome(behavior, numeral)
      }.`,
  };
}

/**
 * What became of an out-of-scope character: under `numerals: "decimal"`, a
 * letter of a numeral is written in the number.
 */
function outcome(
  behavior: ConverterOutOfScopeBehavior,
  numeral: boolean,
): string {
  if (behavior === "reject") return "rejected";
  return numeral ? "written in a decimal numeral" : "preserved literally";
}

function mappingDiagnostic(
  index: number,
  character: string,
  code: "undefined-preset-mapping" | "unresolved-preset-mapping",
  behavior: ConverterOutOfScopeBehavior,
  numeral = false,
): CharacterScopeDiagnostic {
  const reason = code === "undefined-preset-mapping"
    ? "has no ISO 843 conversion"
    : "cannot be identified unambiguously with ISO 843's koppa";
  return {
    code,
    index,
    offset: 0,
    length: 0,
    character,
    message: `Character ${character} ${reason} and was ${
      outcome(behavior, numeral)
    }.`,
  };
}

function literalTokens(value: string): readonly Token[] {
  return Array.from(value).map(literal);
}

/**
 * The letters of a source document that a converter keeps as they were, and
 * what writes them, found once for all of them.
 */
interface KeptLetters {
  readonly parsed: Document;
  readonly format: Format;
  readonly options: ResolvedConversionOptions;
  /** The preprocessed text the document was read from. */
  readonly value: string;
  /** Where each token was read in it, when the reading recorded it. */
  read?: ReadPositions;
  /** The options that write them in Greek or Beta Code (`keptOptions()`). */
  writing?: ResolvedConversionOptions;
  /** The last word written with them (`writtenWord()`). */
  word?: WrittenWord;
  /** The tokens of decimal numerals (`decimalNumeralTokens()`). */
  numerals?: Uint8Array;
  /** The quotations the sigmas of the source close (`sigmaEndsWord()`). */
  quotations?: QuotationContext;
}

/**
 * The tokens `start` to `end` of a document, written in its format, with the
 * span of each in the output.
 */
interface WrittenWord {
  readonly start: number;
  readonly end: number;
  readonly output: string;
  readonly spans: SpanTable;
}

/**
 * Whether the letter at `index` belongs to a numeral that `numerals:
 * "decimal"` writes as a number. Such a letter stays a letter, outside the
 * converter's scope or not, so that the numeral is written as one number, as
 * the transformations of the whole text are.
 */
function inDecimalNumeral(kept: KeptLetters, index: number): boolean {
  if (kept.options.text.numerals !== "decimal") return false;
  kept.numerals ??= decimalNumeralTokens(kept.parsed);
  return kept.numerals[index] === 1;
}

/**
 * The literal that keeps the letter at `index` as it was, outside the
 * converter's scope: its spelling in the source format (`keptSpelling()`),
 * in one literal that is a letter of its word, with the case it takes in the
 * output (`keptLetter()`). One literal, so that a reader that reorders its
 * marks reads it back whole.
 */
function keptTokens(kept: KeptLetters, index: number): readonly Token[] {
  const uppercase = keptCase(kept, index);
  const spelling = keptSpelling(kept, index, uppercase);
  return spelling === "" ? [] : [keptLetter(spelling, uppercase)];
}

/** Whether the letter at `index` is a capital in the output: `text.letterCase` applies to it. */
function keptCase(kept: KeptLetters, index: number): boolean {
  switch (kept.options.text.letterCase) {
    case "uppercase":
      return true;
    case "lowercase":
      return false;
    case "title":
      return isWordInitial(kept.parsed, index);
    default:
      return (kept.parsed[index] as Grapheme).uppercase;
  }
}

/**
 * How the source writes the letter at `index`, in its word, with only the
 * transformations of the whole text (`text`) applied. Greek and Beta Code
 * are written in their canonical spelling, which notes every mark and shape
 * they can note (`writtenSpelling()`). A transliteration is copied from the
 * source (`copiedSpelling()`): its spelling depends on options, some of which
 * leave marks out, and no options would write every source again.
 */
function keptSpelling(
  kept: KeptLetters,
  index: number,
  uppercase: boolean,
): string {
  return kept.format === "transliteration"
    ? copiedSpelling(kept, index, uppercase)
    : writtenSpelling(kept, index);
}

/**
 * The span of the letter at `index` in its word, written in Greek or Beta
 * Code with the source's own marks and shapes and the conversion's letter
 * case (`keptOptions()`). A sigma whose shape the source does not note, a
 * capital that the letter case lowercases, takes the shape of its place in
 * the whole source, which may depend on a quotation opened before its word.
 */
function writtenSpelling(kept: KeptLetters, index: number): string {
  const options = kept.writing ??= keptOptions(kept.options.text.letterCase);
  let word = kept.word;
  if (word === undefined || index < word.start || index >= word.end) {
    word = kept.word = writtenWord(kept, index, options);
  }
  const position = index - word.start;
  return word.output.slice(
    word.spans.starts[position],
    word.spans.ends[position],
  );
}

/**
 * The word of the letter at `index`, with the token on either side of it (a
 * space, a keraia, an apostrophe), written in the source format. Only the
 * shape of a sigma depends on more than the word, and is decided on the whole
 * source first, so that a conversion writes no more of the source again than
 * the words of the letters it keeps.
 */
function writtenWord(
  kept: KeptLetters,
  index: number,
  options: ResolvedConversionOptions,
): WrittenWord {
  const document = kept.parsed;
  const inWord = (token: Token) =>
    token.kind === "grapheme" || isBoundaryTransparent(token);
  let start = index;
  while (start > 0 && inWord(document[start - 1])) start--;
  let end = index + 1;
  while (end < document.length && inWord(document[end])) end++;
  start = Math.max(0, start - 1);
  end = Math.min(document.length, end + 1);

  const tokens = document.slice(start, end);
  if (kept.format === "greek") {
    for (let k = 0; k < tokens.length; k++) {
      const token = tokens[k];
      if (
        token.kind !== "grapheme" || token.letter !== "sigma" ||
        token.glyphVariant !== undefined
      ) continue;
      const quotations = kept.quotations ??= {};
      tokens[k] = {
        ...token,
        glyphVariant: sigmaEndsWord(document, start + k, quotations)
          ? "final-sigma"
          : "medial-sigma",
      };
    }
  }
  const { output, spans } = encodeTracked(tokens, kept.format, options);
  return { start, end, output, spans };
}

/**
 * The options that write a letter kept as it was in Greek or Beta Code: the
 * canonical spelling of its format (the defaults, whatever `betaCode`
 * options the conversion has, since no reader needs them), the sigma shapes
 * of the source (`greek.sigma` and `greek.finalSigma` set to `"preserve"`),
 * and, of the conversion's options, only the letter case, which `text`
 * applies to the whole text.
 */
function keptOptions(
  letterCase: ResolvedConversionOptions["text"]["letterCase"],
): ResolvedConversionOptions {
  const defaults = DEFAULT_CONVERSION_OPTIONS;
  return {
    transliteration: { ...defaults.transliteration },
    greek: { ...defaults.greek, sigma: "preserve", finalSigma: "preserve" },
    betaCode: { ...defaults.betaCode },
    text: { ...defaults.text, letterCase },
    diacritics: { ...defaults.diacritics },
  };
}

/**
 * The spelling of the transliterated letter at `index` as the source wrote
 * it (`ng` keeps its `n`, a macron or a coronis stays), in the case the
 * letter takes. The `h` of a rough breathing on a diphthong, written before
 * both vowels, goes with the vowel that has the breathing (`hoi`: `o`, and
 * `hi`). A letter whose spelling the reader shares with a neighbour, as the
 * two letters of a modern digraph do (`b` for μπ), is written alone, as the
 * source was read.
 */
function copiedSpelling(
  kept: KeptLetters,
  index: number,
  uppercase: boolean,
): string {
  const { text, starts } = kept.read ??= readAgain(
    kept.value,
    kept.format,
    kept.options,
  );
  const empty = (k: number) =>
    k >= 0 && k < kept.parsed.length && starts[k] === starts[k + 1];
  const token = kept.parsed[index] as Grapheme;
  if (empty(index) || empty(index - 1) || empty(index + 1)) {
    return encodeResolved(
      [{ ...token, uppercase }],
      kept.format,
      {
        ...keptOptions("preserve"),
        transliteration: kept.options.transliteration,
      },
    );
  }

  let spelling = text.slice(starts[index], starts[index + 1]).normalize("NFC");
  if (isVowel(token.letter)) {
    const rough = token.diacritics.has("rough");
    if (!rough && /^[hH]/.test(spelling)) spelling = spelling.slice(1);
    else if (rough && !/[hH]|\u0314/.test(spelling)) {
      spelling = (uppercase && !/\p{Ll}/u.test(spelling) ? "H" : "h") +
        spelling;
    }
  }
  switch (kept.options.text.letterCase) {
    case "uppercase":
      return spelling.toUpperCase();
    case "lowercase":
      return spelling.toLowerCase();
    case "title":
      return uppercase
        ? capitalized(spelling.toLowerCase())
        : spelling.toLowerCase();
    default:
      // The letter keeps the case it was read with, which the h of another
      // vowel may have carried (`Hoi`), or which its own h takes (`HOI`).
      return uppercase === /\p{Lu}/u.test(spelling)
        ? spelling
        : uppercase
        ? capitalized(spelling)
        : spelling.toLowerCase();
  }
}

/** The spelling with its first letter in capitals (`th` → `Th`). */
function capitalized(spelling: string): string {
  return spelling.replace(/\p{L}/u, (letter) => letter.toUpperCase());
}

/** Reads the preprocessed text again, for its positions only. */
function readAgain(
  value: string,
  format: Format,
  options: ResolvedConversionOptions,
): ReadPositions {
  const read: ReadPositions = { text: "", starts: [] };
  parseResolved(value, format, options, true, read);
  return read;
}

/**
 * The span in the supplied input of each token read from the preprocessed
 * text: the reader's positions are mapped to the preprocessed text, then
 * through the replacements to the normalized input, then through the
 * normalization to the input as supplied. The tokens read from one
 * replacement (an alias written in its canonical spelling, a custom
 * character's sentinel) share the span of the spelling it replaced.
 */
function parsedInputSpans(
  input: PreprocessedInput,
  read: ReadPositions,
): SpanTable {
  const inValue = readSpans(input.value, read);
  const map = sourceMap(input);
  return map === undefined
    ? inValue
    : spansIn(inValue.starts, inValue.ends, inValue.starts.length, map);
}

/**
 * For each unit of the preprocessed text (and its length), the range of the
 * supplied input it came from, or undefined when the two are the same text.
 * Between the replacements the preprocessed and the normalized texts run unit
 * for unit, and the normalized text is aligned with the supplied one segment
 * by segment (Beta Code is only lowercased, unit for unit).
 */
function sourceMap(input: PreprocessedInput): SegmentMap | undefined {
  const { value, normalized, matches, format } = input;
  const nfd = format === "beta-code"
    ? undefined
    : segmentMap(normalized, input.input, "to", "NFD");
  if (matches.length === 0) return nfd;

  const starts = new Array<number>(value.length + 1).fill(0);
  const ends = new Array<number>(value.length + 1).fill(0);
  let v = 0;
  let n = 0;
  const copy = (until: number) => {
    for (; v < until; v++, n++) {
      starts[v] = nfd === undefined ? n : nfd.starts[n];
      ends[v] = nfd === undefined ? n + 1 : nfd.ends[n];
    }
  };
  for (const match of matches) {
    copy(match.valueStart);
    const start = nfd === undefined
      ? match.normalizedStart
      : nfd.starts[match.normalizedStart];
    const end = nfd === undefined
      ? match.normalizedEnd
      : nfd.ends[match.normalizedEnd - 1];
    for (; v < match.valueEnd; v++) {
      starts[v] = start;
      ends[v] = end;
    }
    n = match.normalizedEnd;
  }
  copy(value.length);
  starts[value.length] = ends[value.length] = input.input.length;
  return { starts, ends };
}
