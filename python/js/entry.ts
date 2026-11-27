/**
 * The bridge between the library and the JavaScript engine that the Python
 * package embeds.
 *
 * `python/scripts/build_bundle.mjs` bundles this module as an IIFE that
 * defines one global, `__greekConversion`, whose `call(name, argsJson)` runs
 * one operation and returns a JSON string: `{"ok": value}` or
 * `{"error": {...}}`. Everything crosses the boundary as one JSON string each
 * way, which every engine binding passes cheaply and identically.
 *
 * Prepared options and converters stay here, under a number. They travel as
 * arguments of their own, never inside options, so that no mapping of the
 * caller can be taken for one. The Python side keeps what they were made
 * from, and makes them again in another engine or process.
 *
 * Positions are converted here from UTF-16 code units, the unit of
 * JavaScript strings, to code points, the unit of Python strings.
 */

import {
  type CharacterAliasDefinition,
  CharacterScopeError,
  CONVERSION_OPTION_VALUES,
  type ConversionOptions,
  type ConversionResult,
  type ConversionSpan,
  convert,
  convertDetailed,
  type Converter,
  type ConverterConfiguration,
  type ConverterConversionResult,
  convertGreekPassages,
  convertGreekPassagesDetailed,
  createConverter,
  type CustomCharacterDefinition,
  type CustomCharacterForms,
  DEFAULT_CONVERSION_OPTIONS,
  type Format,
  FORMATS,
  getPresetMetadata,
  getPresetOptions,
  listPresetMetadata,
  OptionError,
  type PreparedOptions,
  prepareOptions,
  type Preset,
  reencode,
  resolveConversionOptions,
} from "../../src/mod.ts";

declare const __VERSION__: string;

const handles = new Map<number, Converter | PreparedOptions>();
let nextHandle = 1;

function store(value: Converter | PreparedOptions): number {
  const id = nextHandle++;
  handles.set(id, value);
  return id;
}

function load(id: number, kind: string): Converter | PreparedOptions {
  const value = handles.get(id);
  if (value === undefined) throw new Error(`Unknown or released ${kind}.`);
  return value;
}

type Options = ConversionOptions | PreparedOptions;

/** The options of a call: the prepared options given, or the mapping. */
function options(opts: Options | null, prepared: number | null): Options {
  if (prepared !== null) {
    return load(prepared, "prepared options") as PreparedOptions;
  }
  return opts ?? {};
}

const SURROGATE = /[\uD800-\uDFFF]/;

/**
 * A function from UTF-16 offsets in `text` to code point offsets, the
 * identity when the text has no surrogates (nearly always, for Greek).
 */
function codePoints(text: string): (offset: number) => number {
  if (!SURROGATE.test(text)) return (offset) => offset;
  const table = new Int32Array(text.length + 1);
  let points = 0;
  for (let unit = 0; unit < text.length; unit++) {
    table[unit] = points;
    const code = text.charCodeAt(unit);
    // A high surrogate followed by a low one counts once, at the high one.
    const pair = code >= 0xd800 && code <= 0xdbff && unit + 1 < text.length &&
      (text.charCodeAt(unit + 1) & 0xfc00) === 0xdc00;
    if (pair) table[++unit] = points;
    points++;
  }
  table[text.length] = points;
  return (offset) => table[offset];
}

interface Located {
  offset: number;
  length: number;
}

function locate<T extends Located>(
  items: readonly T[],
  map: (offset: number) => number,
): T[] {
  return items.map((item) => {
    const start = map(item.offset);
    return {
      ...item,
      offset: start,
      length: map(item.offset + item.length) - start,
    };
  });
}

/** Four numbers a span: a third of the JSON of objects, as quick to read. */
function flatSpans(
  spans: readonly ConversionSpan[],
  inputMap: (offset: number) => number,
  outputMap: (offset: number) => number,
): number[] {
  const flat = new Array<number>(spans.length * 4);
  for (let index = 0; index < spans.length; index++) {
    const span = spans[index];
    flat[4 * index] = inputMap(span.inputStart);
    flat[4 * index + 1] = inputMap(span.inputEnd);
    flat[4 * index + 2] = outputMap(span.outputStart);
    flat[4 * index + 3] = outputMap(span.outputEnd);
  }
  return flat;
}

function detailed(
  input: string,
  result: ConversionResult | ConverterConversionResult,
): Record<string, unknown> {
  const inputMap = codePoints(input);
  const outputMap = codePoints(result.output);
  const out: Record<string, unknown> = {
    output: result.output,
    lossy: result.lossy,
    losses: locate(result.losses, inputMap),
    spans: flatSpans(result.spans, inputMap, outputMap),
  };
  if ("diagnostics" in result) {
    out.diagnostics = locate(result.diagnostics, inputMap);
  }
  return out;
}

/** A CharacterScopeError, with its positions in code points. */
class ScopeFailure {
  readonly error: CharacterScopeError;
  readonly diagnostics: readonly Located[];

  constructor(error: CharacterScopeError, diagnostics: readonly Located[]) {
    this.error = error;
    this.diagnostics = diagnostics;
  }
}

function scoped<T>(input: string, run: () => T): T {
  try {
    return run();
  } catch (error) {
    if (error instanceof CharacterScopeError) {
      throw new ScopeFailure(
        error,
        locate(error.diagnostics, codePoints(input)),
      );
    }
    throw error;
  }
}

// Every key that options, a converter's configuration, or preset metadata
// can have, which the Python side writes in snake_case. A record of each
// type's keys makes the compiler check that none is missing; the keys of the
// option groups are those of CONVERSION_OPTION_VALUES, which its type checks.
function keysOf<T>(record: Record<keyof T, true>): string[] {
  return Object.keys(record);
}

const DECLARED_KEYS = [
  ...keysOf<ConversionOptions>({
    preset: true,
    transliteration: true,
    greek: true,
    betaCode: true,
    text: true,
    diacritics: true,
    source: true,
  }),
  ...Object.values(CONVERSION_OPTION_VALUES).flatMap((group) =>
    Object.keys(group)
  ),
  ...keysOf<ConverterConfiguration>({
    preset: true,
    outOfScopeBehavior: true,
    aliases: true,
    characters: true,
    repertoire: true,
    exclude: true,
  }),
  ...keysOf<CharacterAliasDefinition>({
    letter: true,
    format: true,
    spellings: true,
    uppercase: true,
    override: true,
  }),
  ...keysOf<CustomCharacterDefinition>({
    id: true,
    forms: true,
    override: true,
  }),
  ...keysOf<CustomCharacterForms>({ lowercase: true, uppercase: true }),
];

function collectKeys(value: unknown, keys: Set<string>): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      keys.add(key);
      collectKeys(item, keys);
    }
  }
  return keys;
}

// The arguments come from JSON, as the Python side sends them; the library
// checks the types and values it is given. `prepared` and `converter` are
// handles, or null.
type Operation = (...args: never[]) => unknown;

const OPERATIONS: Record<string, Operation> = {
  convert: (
    input: string,
    from: Format,
    to: Format,
    opts: Options | null,
    prepared: number | null,
  ) => convert(input, from, to, options(opts, prepared)),
  reencode: (
    input: string,
    format: Format,
    opts: Options | null,
    prepared: number | null,
  ) => reencode(input, format, options(opts, prepared)),
  convertDetailed: (
    input: string,
    from: Format,
    to: Format,
    opts: Options | null,
    prepared: number | null,
  ) =>
    detailed(input, convertDetailed(input, from, to, options(opts, prepared))),
  convertGreekPassages: (
    input: string,
    to: Format,
    opts: Options | null,
    prepared: number | null,
  ) => convertGreekPassages(input, to, options(opts, prepared)),
  convertGreekPassagesDetailed: (
    input: string,
    to: Format,
    opts: Options | null,
    prepared: number | null,
  ) =>
    detailed(
      input,
      convertGreekPassagesDetailed(input, to, options(opts, prepared)),
    ),
  // Many strings in one crossing: the fixed cost of a call is paid once.
  convertMany: (
    inputs: string[],
    from: Format,
    to: Format,
    opts: Options | null,
    prepared: number | null,
  ) => {
    const resolved = options(opts, prepared);
    return inputs.map((input) => convert(input, from, to, resolved));
  },
  reencodeMany: (
    inputs: string[],
    format: Format,
    opts: Options | null,
    prepared: number | null,
  ) => {
    const resolved = options(opts, prepared);
    return inputs.map((input) => reencode(input, format, resolved));
  },
  convertDetailedMany: (
    inputs: string[],
    from: Format,
    to: Format,
    opts: Options | null,
    prepared: number | null,
  ) => {
    const resolved = options(opts, prepared);
    return inputs.map((input) =>
      detailed(input, convertDetailed(input, from, to, resolved))
    );
  },
  prepareOptions: (opts: ConversionOptions | null) =>
    store(prepareOptions(opts ?? {})),
  createConverter: (
    configuration: ConverterConfiguration | null,
    prepared: number | null,
  ) =>
    store(
      createConverter(
        // Prepared options are refused by the library, with its message.
        options(configuration, prepared) as ConverterConfiguration,
      ),
    ),
  converterConvert: (
    input: string,
    from: Format,
    to: Format,
    opts: Options | null,
    prepared: number | null,
    converter: number,
  ) =>
    scoped(input, () => {
      const instance = load(converter, "converter") as Converter;
      // Prepared options are refused by the library, with its message.
      const given = options(opts, prepared) as ConversionOptions;
      return instance.convert(input, from, to, given);
    }),
  converterConvertDetailed: (
    input: string,
    from: Format,
    to: Format,
    opts: Options | null,
    prepared: number | null,
    converter: number,
  ) =>
    scoped(input, () => {
      const instance = load(converter, "converter") as Converter;
      const given = options(opts, prepared) as ConversionOptions;
      return detailed(input, instance.convertDetailed(input, from, to, given));
    }),
  release: (ids: number[]) => {
    for (const id of ids) handles.delete(id);
    return null;
  },
  resolveConversionOptions: (opts: Options | null, prepared: number | null) =>
    resolveConversionOptions(options(opts, prepared)),
  getPresetOptions: (preset: Preset) => getPresetOptions(preset),
  getPresetMetadata: (preset: Preset) => getPresetMetadata(preset),
  listPresetMetadata: () => listPresetMetadata(),
  constants: () => ({
    version: __VERSION__,
    formats: FORMATS,
    defaultConversionOptions: DEFAULT_CONVERSION_OPTIONS,
    conversionOptionValues: CONVERSION_OPTION_VALUES,
    keys: [
      ...collectKeys(
        listPresetMetadata(),
        collectKeys(DEFAULT_CONVERSION_OPTIONS, new Set(DECLARED_KEYS)),
      ),
    ],
  }),
};

function describe(error: unknown): Record<string, unknown> {
  if (error instanceof ScopeFailure) {
    return { ...describe(error.error), diagnostics: error.diagnostics };
  }
  if (!(error instanceof Error)) {
    return { name: "Error", kind: "Error", message: String(error) };
  }
  const described: Record<string, unknown> = {
    name: error.name,
    // OptionError and CharacterScopeError are RangeErrors.
    kind: error instanceof TypeError
      ? "TypeError"
      : error instanceof RangeError
      ? "RangeError"
      : "Error",
    message: error.message,
  };
  if (error instanceof OptionError) {
    described.path = error.path;
    described.received = error.received === undefined ? null : error.received;
    described.accepted = error.accepted;
    if (error.replacement !== undefined) {
      described.replacement = error.replacement;
    }
  }
  if (error instanceof CharacterScopeError) {
    described.diagnostics = error.diagnostics;
  }
  return described;
}

function call(name: string, argsJson: string): string {
  try {
    const operation = OPERATIONS[name] as
      | ((...args: unknown[]) => unknown)
      | undefined;
    if (operation === undefined) throw new Error(`Unknown operation: ${name}`);
    const args = JSON.parse(argsJson) as unknown[];
    return JSON.stringify({ ok: operation(...args) ?? null });
  } catch (error) {
    const described = describe(error);
    try {
      return JSON.stringify({ error: described });
    } catch {
      // A detail that does not serialize, such as a BigInt received.
      const { name, kind, message } = described;
      return JSON.stringify({ error: { name, kind, message } });
    }
  }
}

(globalThis as Record<string, unknown>).__greekConversion = { call };
