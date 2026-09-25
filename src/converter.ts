import { ALPHABET } from "./alphabet.ts";
import { encode, parse } from "./conversion.ts";
import {
  type ConversionLoss,
  type ConversionResult,
  findConversionLosses,
} from "./losses.ts";
import { grapheme, literal } from "./model.ts";
import type { Document, Format, Letter, Token } from "./model.ts";
import type {
  ConversionOptions,
  Preset,
  ResolvedConversionOptions,
} from "./options.ts";
import {
  isCharacterInPresetScope,
  presetMappingIssue,
  resolveConversionOptions,
} from "./presets.ts";
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

/** Lowercase and optional uppercase spellings in one representation. */
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
  /** Preserves unsupported recognized input by default or rejects the conversion. */
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
  /** Zero-based token index in the parsed source document. */
  index: number;
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

interface PreprocessedInput {
  value: string;
  originals: ReadonlyMap<string, readonly string[]>;
}

interface PreparedSource {
  document: Document;
  diagnostics: readonly CharacterScopeDiagnostic[];
}

const BUILTIN_LETTERS = new Set<string>(Object.keys(ALPHABET));
const SENTINEL_START = 0xF0000;

/**
 * An immutable conversion engine with isolated character extensions.
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
    const resolved = this.#resolveOptions(options);
    const sourceInput = this.#preprocess(input, from, resolved);
    const prepared = this.#prepareSource(sourceInput, from, resolved, to);
    this.#assertScope(prepared.diagnostics);
    const encoded = encode(prepared.document, to, resolved);
    const output = this.#postprocess(encoded, to);

    const targetInput = this.#preprocess(output, to, resolved);
    const target = this.#prepareSource(targetInput, to, resolved).document;
    const losses = findConversionLosses(prepared.document, target);

    return {
      output,
      lossy: losses.length > 0,
      losses,
      diagnostics: prepared.diagnostics,
    };
  }

  #run(
    input: string,
    from: Format,
    to: Format,
    options: ConversionOptions,
  ): { output: string } {
    const resolved = this.#resolveOptions(options);
    const preprocessed = this.#preprocess(input, from, resolved);
    const prepared = this.#prepareSource(preprocessed, from, resolved, to);
    this.#assertScope(prepared.diagnostics);
    const encoded = encode(prepared.document, to, resolved);
    return { output: this.#postprocess(encoded, to) };
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

    for (let index = 0; index < chars.length;) {
      const match = entries.find((entry) =>
        entry.normalized.every((char, offset) => chars[index + offset] === char)
      );

      if (match === undefined) {
        output.push(chars[index]);
        index++;
        continue;
      }

      if (match.kind === "alias") {
        output.push(encode(
          [grapheme(match.letter, match.uppercase)],
          format,
          options,
        ));
      } else {
        output.push(match.sentinel);
        const values = originals.get(match.sentinel) ?? [];
        values.push(
          chars.slice(index, index + match.normalized.length).join(""),
        );
        originals.set(match.sentinel, values);
      }
      index += match.normalized.length;
    }

    return { value: output.join(""), originals };
  }

  #prepareSource(
    input: PreprocessedInput,
    format: Format,
    options: ResolvedConversionOptions,
    target?: Format,
  ): PreparedSource {
    const parsed = parse(input.value, format, options);
    const diagnostics: CharacterScopeDiagnostic[] = [];
    const occurrences = new Map<string, number>();

    const document = parsed.flatMap((token, index): readonly Token[] => {
      if (token.kind === "grapheme") {
        if (!this.#isAllowed(token.letter, parsed, index)) {
          diagnostics.push(
            scopeDiagnostic(index, token.letter, this.#outOfScopeBehavior),
          );
          return literalTokens(encode([token], format, options));
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
        diagnostics.push(
          mappingDiagnostic(
            index,
            token.letter,
            issue,
            this.#outOfScopeBehavior,
          ),
        );
        return literalTokens(encode([token], format, options));
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
    });

    return { document, diagnostics };
  }

  #postprocess(
    input: string,
    format: Format,
  ): string {
    let output = input;
    for (const [sentinel, { character, uppercase }] of this.#sentinels) {
      output = output.replaceAll(
        sentinel,
        customForm(character, format, uppercase),
      );
    }
    return output;
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
    const shadowsMeaning = rawLiterals.some((value) =>
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
      (options.orthography.betaCodeCase === "uppercase"
        ? base.toUpperCase()
        : base.toLowerCase());
  }
  return value;
}

function scopeDiagnostic(
  index: number,
  character: string,
  behavior: ConverterOutOfScopeBehavior,
): CharacterScopeDiagnostic {
  return {
    code: "out-of-scope-character",
    index,
    character,
    message:
      `Character ${character} is outside this converter's repertoire and was ${
        behavior === "reject" ? "rejected" : "preserved literally"
      }.`,
  };
}

function mappingDiagnostic(
  index: number,
  character: string,
  code: "undefined-preset-mapping" | "unresolved-preset-mapping",
  behavior: ConverterOutOfScopeBehavior,
): CharacterScopeDiagnostic {
  const reason = code === "undefined-preset-mapping"
    ? "has no ISO 843 Type 1 transliteration"
    : "cannot be identified unambiguously with ISO 843's koppa";
  return {
    code,
    index,
    character,
    message: `Character ${character} ${reason} and was ${
      behavior === "reject" ? "rejected" : "preserved literally"
    }.`,
  };
}

function literalTokens(value: string): readonly Token[] {
  return Array.from(value).map(literal);
}
