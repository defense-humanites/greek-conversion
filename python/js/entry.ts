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
 * Positions are converted here from UTF-16 code units, the unit of
 * JavaScript strings, to code points, the unit of Python strings.
 */

import {
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

/** An object kept here for Python, which holds its number. */
interface Handle {
  readonly __handle: number;
}

const handles = new Map<number, Converter | PreparedOptions>();
let nextHandle = 1;

function store(value: Converter | PreparedOptions): Handle {
  const id = nextHandle++;
  handles.set(id, value);
  return { __handle: id };
}

function isHandle(value: unknown): value is Handle {
  return typeof value === "object" && value !== null && "__handle" in value;
}

function load(handle: unknown, kind: string): Converter | PreparedOptions {
  const value = isHandle(handle) ? handles.get(handle.__handle) : undefined;
  if (value === undefined) throw new Error(`Unknown or released ${kind}.`);
  return value;
}

function converter(handle: unknown): Converter {
  return load(handle, "converter") as Converter;
}

type Options = ConversionOptions | PreparedOptions;

/** Options as received: a plain object, or the handle of prepared options. */
function options(value: Options | Handle | null): Options {
  if (value === null) return {};
  if (isHandle(value)) {
    return load(value, "prepared options") as PreparedOptions;
  }
  return value;
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

// The arguments come from JSON, as the Python side sends them; the library
// checks the types and values it is given.
type Operation = (...args: never[]) => unknown;

const OPERATIONS: Record<string, Operation> = {
  convert: (input: string, from: Format, to: Format, opts: Options | null) =>
    convert(input, from, to, options(opts)),
  reencode: (input: string, format: Format, opts: Options | null) =>
    reencode(input, format, options(opts)),
  convertDetailed: (
    input: string,
    from: Format,
    to: Format,
    opts: Options | null,
  ) => detailed(input, convertDetailed(input, from, to, options(opts))),
  convertGreekPassages: (input: string, to: Format, opts: Options | null) =>
    convertGreekPassages(input, to, options(opts)),
  convertGreekPassagesDetailed: (
    input: string,
    to: Format,
    opts: Options | null,
  ) => detailed(input, convertGreekPassagesDetailed(input, to, options(opts))),
  // Many strings in one crossing: the fixed cost of a call is paid once.
  convertMany: (
    inputs: string[],
    from: Format,
    to: Format,
    opts: Options | null,
  ) => {
    const resolved = options(opts);
    return inputs.map((input) => convert(input, from, to, resolved));
  },
  prepareOptions: (opts: ConversionOptions | null) =>
    store(prepareOptions(opts ?? {})),
  createConverter: (configuration: ConverterConfiguration | null) =>
    store(createConverter(configuration ?? {})),
  converterConvert: (
    handle: Handle,
    input: string,
    from: Format,
    to: Format,
    opts: ConversionOptions | null,
  ) =>
    scoped(input, () => converter(handle).convert(input, from, to, opts ?? {})),
  converterConvertDetailed: (
    handle: Handle,
    input: string,
    from: Format,
    to: Format,
    opts: ConversionOptions | null,
  ) =>
    scoped(input, () =>
      detailed(
        input,
        converter(handle).convertDetailed(input, from, to, opts ?? {}),
      )),
  release: (handle: Handle) => {
    handles.delete(handle.__handle);
    return null;
  },
  resolveConversionOptions: (opts: ConversionOptions | null) =>
    resolveConversionOptions(opts ?? {}),
  getPresetOptions: (preset: Preset) => getPresetOptions(preset),
  getPresetMetadata: (preset: Preset) => getPresetMetadata(preset),
  listPresetMetadata: () => listPresetMetadata(),
  constants: () => ({
    version: __VERSION__,
    formats: FORMATS,
    defaultConversionOptions: DEFAULT_CONVERSION_OPTIONS,
    conversionOptionValues: CONVERSION_OPTION_VALUES,
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
