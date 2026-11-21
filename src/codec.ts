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

/**
 * A reader: what reads one format, for the functions of the `./core` entry
 * point. Readers are imported from the entry point of their format
 * (`greekReader` from `./greek`, for instance); the type has no member to
 * use, and an object of another shape is not one.
 *
 * @typeParam F The format read.
 */
export declare class Reader<F extends Format = Format> {
  // The brand that makes the type nominal, declared only.
  // oxlint-disable-next-line no-unused-private-class-members
  #reader: F;
  /** Readers are imported from the entry points of formats, not made. */
  private constructor();
}

/**
 * A writer: what writes one format, for the functions of the `./core` entry
 * point. Writers are imported from the entry point of their format
 * (`greekWriter` from `./greek`, for instance); the type has no member to
 * use, and an object of another shape is not one.
 *
 * @typeParam F The format written.
 */
export declare class Writer<F extends Format = Format> {
  // The brand that makes the type nominal, declared only.
  // oxlint-disable-next-line no-unused-private-class-members
  #writer: F;
  /** Writers are imported from the entry points of formats, not made. */
  private constructor();
}

/**
 * A reader and a writer of the same format, as `greekFormat` from `./greek`:
 * what `convertDetailed()` and `reencode()` of the `./core` entry point take,
 * since they read what they write, or compare letter forms in the source
 * format.
 *
 * @typeParam F The format read and written.
 */
export type ReaderWriter<F extends Format = Format> = Reader<F> & Writer<F>;

/**
 * The runtime class of readers and writers, which the types above, declared
 * only, describe from outside. Its fields are private: a handle shows no
 * property, and an object built by hand is not one.
 */
class Codec {
  readonly #reader: ReaderHooks | undefined;
  readonly #writer: WriterHooks | undefined;

  constructor(
    reader: ReaderHooks | undefined,
    writer: WriterHooks | undefined,
  ) {
    this.#reader = reader;
    this.#writer = writer;
    Object.freeze(this);
  }

  static readerOf(value: unknown): ReaderHooks | undefined {
    return typeof value === "object" && value !== null && #reader in value
      ? value.#reader
      : undefined;
  }

  static writerOf(value: unknown): WriterHooks | undefined {
    return typeof value === "object" && value !== null && #writer in value
      ? value.#writer
      : undefined;
  }
}

/** A reader of the format that `hooks` read. */
export function makeReader<F extends Format>(
  hooks: ReaderHooks & { readonly format: F },
): Reader<F> {
  return new Codec(hooks, undefined) as unknown as Reader<F>;
}

/** A writer of the format that `hooks` write. */
export function makeWriter<F extends Format>(
  hooks: WriterHooks & { readonly format: F },
): Writer<F> {
  return new Codec(undefined, hooks) as unknown as Writer<F>;
}

/** The reader and the writer of one format, as one value. */
export function joinCodecs<F extends Format>(
  reader: Reader<F>,
  writer: Writer<F>,
): ReaderWriter<F> {
  return new Codec(
    Codec.readerOf(reader),
    Codec.writerOf(writer),
  ) as unknown as ReaderWriter<F>;
}

/** The hooks of a reader, or `undefined` for any other value. */
export function readerHooks(value: unknown): ReaderHooks | undefined {
  return Codec.readerOf(value);
}

/** The hooks of a writer, or `undefined` for any other value. */
export function writerHooks(value: unknown): WriterHooks | undefined {
  return Codec.writerOf(value);
}

/** Whether a value is a reader or a writer, of this copy of the library. */
export function isCodec(value: unknown): boolean {
  return Codec.readerOf(value) !== undefined ||
    Codec.writerOf(value) !== undefined;
}
