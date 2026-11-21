/**
 * Readers and writers: the values that the `./core` entry point converts
 * with, and the hooks they hold.
 *
 * A reader or a writer is an opaque handle. Its public type has no member a
 * caller can use, and its hooks are held in private fields, so that they can
 * change in any release: the `./greek`, `./beta-code` and `./transliteration`
 * entry points export the handles, and only the library reads their hooks.
 * The library's own conversions, from the main entry point, go through the
 * same hooks (see `conversion.ts`), so that both entry points convert alike.
 *
 * Internal: the module is not an entry point; the entry points export its
 * types and the handles made with it.
 */
import type { QuotationContext } from "./context.ts";
import type { Document, Format, Grapheme } from "./model.ts";
import type {
  ConversionOptions,
  ResolvedConversionOptions,
} from "./options.ts";
import type {
  ReadPositions,
  TokenTargets,
  WrittenPositions,
} from "./parsers/positions.ts";

/** How a reader reads its format into the canonical document. */
export interface ReaderHooks {
  /** The format read. */
  readonly format: Format;
  /**
   * Reads the input. With `share`, the reader may return shared tokens (see
   * `parsers/shared_tokens.ts`), for documents that never reach the caller;
   * with `read`, it records where each token starts (see
   * `parsers/positions.ts`). The stigma read as `στ`
   * (`greek.stigma: "ligature"`) is read afterwards, for every format (see
   * `pipeline.ts`).
   */
  read(
    input: string,
    options: ResolvedConversionOptions,
    share: boolean,
    read?: ReadPositions,
  ): Document;
}

/** How a writer writes the canonical document in its format. */
export interface WriterHooks {
  /** The format written. */
  readonly format: Format;
  /**
   * Applies what the options write before the document is rendered: the
   * accent of καί, the orthographic policies, the numerals. With `targets`,
   * records which rendered token each token became.
   */
  prepare(
    document: Document,
    options: ResolvedConversionOptions,
    targets?: TokenTargets,
  ): Document;
  /**
   * Renders the prepared document. With `written`, records the range of each
   * token's output before Unicode normalization.
   */
  write(
    document: Document,
    options: ResolvedConversionOptions,
    written?: WrittenPositions,
  ): string;
  /** The Unicode normalization form of the output. */
  form(options: ResolvedConversionOptions): "NFC" | "NFD";
  /**
   * The glyph that the format writes for a grapheme where a letter form
   * matters, or `""` (see `losses.ts`).
   */
  glyphForm(
    document: Document,
    index: number,
    token: Grapheme,
    options: ConversionOptions,
    quotations: QuotationContext,
  ): string;
}

// The types do not say which format a reader or a writer is of: the
// declarations that npm consumers read replace private fields with
// `#private`, which would drop a type parameter carried by one. A parameter,
// with a default, can be added in a minor release, on a member that the
// declarations keep.

/**
 * A reader: what reads one format, for the functions of the `./core` entry
 * point. Readers are imported from the entry point of their format
 * (`greekReader` from `./greek`, for instance); the type has no member to
 * use, and an object of another shape is not one.
 */
export declare class Reader {
  // The brand that makes the type nominal, declared only.
  // oxlint-disable-next-line no-unused-private-class-members
  #reader: true;
  /** Readers are imported from the entry points of formats, not made. */
  private constructor();
}

/**
 * A writer: what writes one format, for the functions of the `./core` entry
 * point. Writers are imported from the entry point of their format
 * (`greekWriter` from `./greek`, for instance); the type has no member to
 * use, and an object of another shape is not one.
 */
export declare class Writer {
  // The brand that makes the type nominal, declared only.
  // oxlint-disable-next-line no-unused-private-class-members
  #writer: true;
  /** Writers are imported from the entry points of formats, not made. */
  private constructor();
}

/**
 * A reader and a writer of the same format, as `greekFormat` from `./greek`:
 * what `convertDetailed()` and `reencode()` of the `./core` entry point take,
 * since they read what they write, or compare letter forms in the source
 * format.
 */
export type ReaderWriter = Reader & Writer;

/** What the library passes to make a handle: `new` from outside throws. */
const MADE = Symbol();

/** The hooks of a reader, or `undefined` for any other value. */
export let readerHooks: (value: unknown) => ReaderHooks | undefined;

/** The hooks of a writer, or `undefined` for any other value. */
export let writerHooks: (value: unknown) => WriterHooks | undefined;

/**
 * The runtime class of readers and writers, which the types above, declared
 * only, describe from outside. Nothing reaches the hooks but this module: a
 * handle shows no property; the functions that read its private fields are
 * not members of the class, which an instance leads to by its
 * `constructor`, but are assigned from inside it to the variables above;
 * `new` from outside throws; and the hooks, the handles, the class, and its
 * prototype are frozen.
 */
class Codec {
  readonly #reader: ReaderHooks | undefined;
  readonly #writer: WriterHooks | undefined;

  constructor(
    made: symbol,
    reader: ReaderHooks | undefined,
    writer: WriterHooks | undefined,
  ) {
    if (made !== MADE) {
      throw new TypeError("Illegal constructor");
    }
    this.#reader = reader && Object.freeze(reader);
    this.#writer = writer && Object.freeze(writer);
    Object.freeze(this);
  }

  static {
    readerHooks = (value) =>
      typeof value === "object" && value !== null && #reader in value
        ? value.#reader
        : undefined;
    writerHooks = (value) =>
      typeof value === "object" && value !== null && #writer in value
        ? value.#writer
        : undefined;
  }
}
Object.freeze(Codec.prototype);
Object.freeze(Codec);

/** A reader of the format that `hooks` read. */
export function makeReader(hooks: ReaderHooks): Reader {
  return new Codec(MADE, hooks, undefined) as unknown as Reader;
}

/** A writer of the format that `hooks` write. */
export function makeWriter(hooks: WriterHooks): Writer {
  return new Codec(MADE, undefined, hooks) as unknown as Writer;
}

/** The reader and the writer of one format, as one value. */
export function joinCodecs(reader: Reader, writer: Writer): ReaderWriter {
  return new Codec(
    MADE,
    readerHooks(reader),
    writerHooks(writer),
  ) as unknown as ReaderWriter;
}
