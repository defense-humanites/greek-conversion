/**
 * The conversion of the Greek passages of a text (`text.scope: "greek"`):
 * the passages are converted, the rest of the text is copied, and the rules
 * of the conversion see the whole text.
 *
 * Internal: not exported by the package entry points.
 */
import type { ReaderHooks, WriterHooks } from "./codec.ts";
import {
  type ConversionResult,
  type ConversionSpan,
  findConversionLosses,
} from "./losses.ts";
import type { Document, Token } from "./model.ts";
import { OptionError } from "./option_error.ts";
import type { ResolvedConversionOptions } from "./options.ts";
import {
  type ReadPositions,
  readSpans,
  type TokenTargets,
  type WrittenPositions,
  writtenSpans,
} from "./parsers/positions.ts";
import { readWith } from "./pipeline.ts";

/**
 * Whether a code point begins or continues a Greek passage: a character of
 * the Greek blocks (U+0370–U+03FF, U+1F00–U+1FFF), letters and the signs
 * that only Greek uses, or one that the Greek reader reads as a letter (the
 * ohm sign U+2126) or as letters (`ȣ` and `Ȣ`).
 */
function isGreekSign(codePoint: number): boolean {
  return (codePoint >= 0x0370 && codePoint <= 0x03ff) ||
    (codePoint >= 0x1f00 && codePoint <= 0x1fff) ||
    codePoint === 0x2126 || codePoint === 0x0222 || codePoint === 0x0223;
}

/**
 * Whether a code point continues a Greek passage: a combining mark, or the
 * keraia U+02B9, to which normalization maps the Greek one (U+0374).
 */
function continuesGreek(codePoint: number): boolean {
  return (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    codePoint === 0x02b9 ||
    (codePoint >= 0x0483 && /\p{M}/u.test(String.fromCodePoint(codePoint)));
}

/**
 * The boundaries of the passages of `input`, in UTF-16 code units: the
 * passages alternate, from a passage of other text, empty when the input
 * begins with Greek, and the last boundary is the length of the input.
 */
export function passageBounds(input: string): number[] {
  const bounds = [0];
  let greek = false;
  for (let i = 0; i < input.length;) {
    const codePoint = input.codePointAt(i)!;
    const isGreek: boolean = isGreekSign(codePoint) ||
      (greek && continuesGreek(codePoint));
    if (isGreek !== greek) {
      bounds.push(i);
      greek = isGreek;
    }
    i += codePoint > 0xffff ? 2 : 1;
  }
  bounds.push(input.length);
  return bounds;
}

/** Throws unless a conversion of the Greek passages reads Greek. */
function assertReadsGreek(reader: ReaderHooks): void {
  if (reader.format !== "greek") {
    throw new OptionError(
      `text.scope "greek" reads Greek only, not ${reader.format}: in Beta Code and transliteration, Latin letters are the Greek text`,
      { path: "text.scope", received: "greek", accepted: ["all"] },
    );
  }
}

/**
 * The document of a text, read as a whole, and its passages: the reader sees
 * the whole text, as the rules will, and the tokens read from each passage
 * are those that start in it. Where a token that starts in a passage takes
 * characters of the next one, the boundary moves to the next token, so that
 * no character is both converted and copied.
 */
interface ReadPassages {
  /**
   * The start of each passage in the input, then its length: the passages
   * alternate, from a passage of other text, empty when the input begins
   * with Greek.
   */
  readonly bounds: readonly number[];
  readonly document: Document;
  /** The index of the first token of each passage, then the token count. */
  readonly firsts: readonly number[];
  /** Where the reader read each token (see `parsers/positions.ts`). */
  readonly read: ReadPositions;
}

function readPassages(
  input: string,
  reader: ReaderHooks,
  reading: ResolvedConversionOptions,
): ReadPassages {
  assertReadsGreek(reader);
  const greekBounds = passageBounds(input);
  const read: ReadPositions = { text: "", starts: [] };
  const document = readWith(reader, input, reading, true, read);
  // The reader reads the input decomposed, which is the passages decomposed
  // one after the other: a passage starts with a character that no mark
  // follows from the passage before, and decomposition moves only marks.
  const decomposed = [0];
  for (let k = 0; k + 1 < greekBounds.length; k++) {
    decomposed.push(
      decomposed[k] +
        input.slice(greekBounds[k], greekBounds[k + 1]).normalize("NFD")
          .length,
    );
  }
  const starts = read.starts;
  const bounds = [0];
  const firsts = [0];
  let passage = 0;
  for (let i = 0; i < document.length; i++) {
    while (
      passage + 2 < decomposed.length && starts[i] >= decomposed[passage + 1]
    ) passage++;
    // The passages of tokens alternate as those of the input do.
    if (passage % 2 !== (firsts.length - 1) % 2) {
      firsts.push(i);
      bounds.push(
        offsetOf(input, greekBounds[passage], decomposed[passage], starts[i]),
      );
    }
  }
  firsts.push(document.length);
  bounds.push(input.length);
  return { bounds, document, firsts, read };
}

/**
 * The offset in `input` of the character at `target` in its decomposition,
 * from a character at `offset` in the input and at `position` in the
 * decomposition: a token starts with a character that decomposes on its own.
 */
function offsetOf(
  input: string,
  offset: number,
  position: number,
  target: number,
): number {
  while (position < target && offset < input.length) {
    const size = input.codePointAt(offset)! > 0xffff ? 2 : 1;
    position += input.slice(offset, offset + size).normalize("NFD").length;
    offset += size;
  }
  return offset;
}

/**
 * What the writer wrote for a document read passage by passage: the output,
 * the start of each passage in it, and, for the Greek passages, the text the
 * writer assembled for each and the range of each of its tokens in that text.
 */
interface WrittenPassages {
  readonly output: string;
  /** The start of each passage in the output, then its length. */
  readonly offsets: readonly number[];
  /** The text the writer assembled for each passage, before it finished it. */
  readonly assembled: readonly string[];
  /** The text of each passage in the output. */
  readonly texts: readonly string[];
  /** Where each token was rendered (`TokenTargets`), or the identity. */
  readonly map: readonly number[] | undefined;
  readonly written: WrittenPositions;
  /** The start of each passage in `written.text`. */
  readonly assembledStarts: readonly number[];
}

/**
 * Writes the document of the whole text at once, so that the rules see the
 * text around each passage, as they would in a conversion of the whole
 * text. The output of the Greek passages is taken from the text the writer
 * assembled, and finished as the writer finishes its output; the other text
 * is the input's.
 */
function writePassages(
  input: string,
  passages: ReadPassages,
  writer: WriterHooks,
  writing: ResolvedConversionOptions,
): WrittenPassages {
  const { bounds, document, firsts } = passages;
  const targets: TokenTargets = {};
  const prepared = writer.prepare(document, writing, targets);
  const written: WrittenPositions = {
    text: "",
    starts: new Array<number>(prepared.length).fill(0),
    ends: new Array<number>(prepared.length).fill(0),
  };
  writer.write(prepared, writing, written);
  const map = targets.map;

  // The text each passage wrote: from where the passages before it ended to
  // where its last rendered token ends. A token whose output joins that of
  // the token before it (the second letter of a modern digraph) shares its
  // range; the ranges of the passages do not overlap.
  const count = bounds.length - 1;
  const assembled: string[] = [];
  const assembledStarts: number[] = [];
  const greek: string[] = [];
  let end = 0;
  for (let k = 0; k < count; k++) {
    const start = end;
    for (let i = firsts[k]; i < firsts[k + 1]; i++) {
      const target = map === undefined ? i : map[i];
      if (target >= 0 && written.ends[target] > end) {
        end = written.ends[target];
      }
    }
    assembledStarts.push(start);
    assembled.push(written.text.slice(start, end));
    if (k % 2 === 1) greek.push(assembled[k]);
  }

  // The Greek passages are finished as one text, so that what the writer
  // decides for the whole output (the oxia of `greek.acute: "system"`) is
  // decided for them all; a line break, which normalization leaves alone
  // and no passage writes, separates them.
  const finished = writer.finish(greek.join("\n"), writing).split("\n");
  const texts: string[] = [];
  const offsets: number[] = [];
  let output = "";
  for (let k = 0; k < count; k++) {
    const text = k % 2 === 0
      ? input.slice(bounds[k], bounds[k + 1])
      : finished[(k - 1) / 2];
    offsets.push(output.length);
    texts.push(text);
    output += text;
  }
  offsets.push(output.length);
  return {
    output,
    offsets,
    assembled,
    texts,
    map,
    written,
    assembledStarts,
  };
}

/**
 * Converts the Greek passages of `input`, and copies the rest as it is
 * (`text.scope: "greek"`).
 *
 * @throws {OptionError} If `reader` does not read Greek.
 */
export function convertPassages(
  input: string,
  reader: ReaderHooks,
  writer: WriterHooks,
  reading: ResolvedConversionOptions,
  writing: ResolvedConversionOptions,
): string {
  const passages = readPassages(input, reader, reading);
  if (passages.bounds.length === 2) return input;
  return writePassages(input, passages, writer, writing).output;
}

/**
 * {@link convertPassages}, with the losses and the spans of
 * `convertDetailed()`. The text copied keeps what it has, and its spans in
 * the output are those in the input, moved. Greek output is read back as a
 * whole, as the input was; in another format, the text copied would be read
 * as Greek, and each Greek passage of the output is read back apart, the
 * text copied keeping its own tokens.
 *
 * @throws {OptionError} If `reader` does not read Greek.
 */
export function convertPassagesDetailed(
  input: string,
  reader: ReaderHooks,
  writer: WriterHooks,
  targetReader: ReaderHooks,
  glyphForm: WriterHooks["glyphForm"],
  reading: ResolvedConversionOptions,
  writing: ResolvedConversionOptions,
): ConversionResult {
  const passages = readPassages(input, reader, reading);
  const { bounds, document: source, firsts } = passages;
  const { starts: inputStarts, ends: inputEnds } = readSpans(
    input,
    passages.read,
  );
  const passagesWritten = writePassages(input, passages, writer, writing);
  const { output, offsets, assembled, texts, map, written } = passagesWritten;
  const form = writer.form(writing);
  const whole = targetReader.format === "greek";

  // Where each source token was written, and the target read back: the
  // tokens of the text copied, and those read from each Greek passage.
  const outputStarts = new Array<number>(source.length).fill(-1);
  const outputEnds = new Array<number>(source.length).fill(-1);
  const target: Token[] = [];
  const readStarts: number[] = [];
  const readEnds: number[] = [];
  for (let k = 0; k + 1 < bounds.length; k++) {
    const shift = offsets[k] - bounds[k];
    if (k % 2 === 0) {
      for (let i = firsts[k]; i < firsts[k + 1]; i++) {
        outputStarts[i] = inputStarts[i] + shift;
        outputEnds[i] = inputEnds[i] + shift;
        if (whole) continue;
        target.push(source[i]);
        readStarts.push(outputStarts[i]);
        readEnds.push(outputEnds[i]);
      }
      continue;
    }
    // The ranges of the passage's tokens in the text it assembled, mapped
    // to the text it finished.
    const base = passagesWritten.assembledStarts[k];
    const indices: number[] = [];
    const starts: number[] = [];
    const ends: number[] = [];
    for (let i = firsts[k]; i < firsts[k + 1]; i++) {
      const rendered = map === undefined ? i : map[i];
      if (rendered < 0) continue;
      indices.push(i);
      starts.push(
        Math.min(
          Math.max(written.starts[rendered] - base, 0),
          assembled[k].length,
        ),
      );
      ends.push(
        Math.min(
          Math.max(written.ends[rendered] - base, 0),
          assembled[k].length,
        ),
      );
    }
    const spans = writtenSpans(texts[k], {
      text: assembled[k],
      normalized: writer.format === "greek"
        ? assembled[k].normalize(form)
        : undefined,
      starts,
      ends,
    }, form);
    for (let j = 0; j < indices.length; j++) {
      outputStarts[indices[j]] = offsets[k] + spans.starts[j];
      outputEnds[indices[j]] = offsets[k] + spans.ends[j];
    }
    if (whole) continue;
    const read: ReadPositions = { text: "", starts: [] };
    const part = readWith(targetReader, texts[k], writing, true, read);
    const partSpans = readSpans(texts[k], read);
    for (let i = 0; i < part.length; i++) {
      target.push(part[i]);
      readStarts.push(offsets[k] + partSpans.starts[i]);
      readEnds.push(offsets[k] + partSpans.ends[i]);
    }
  }
  if (whole) {
    const read: ReadPositions = { text: "", starts: [] };
    for (const token of readWith(targetReader, output, writing, true, read)) {
      target.push(token);
    }
    const outputRead = readSpans(output, read);
    readStarts.push(...outputRead.starts);
    readEnds.push(...outputRead.ends);
  }
  // A token the output dropped has an empty span where the output of the
  // next token starts, as in a conversion of the whole text.
  let next = output.length;
  for (let i = source.length - 1; i >= 0; i--) {
    if (outputStarts[i] < 0) outputStarts[i] = outputEnds[i] = next;
    else next = outputStarts[i];
  }

  const inputSpans = { starts: inputStarts, ends: inputEnds };
  const losses = findConversionLosses(
    source,
    target,
    inputSpans,
    () => ({
      written: { starts: outputStarts, ends: outputEnds },
      read: { starts: readStarts, ends: readEnds },
    }),
    { glyphForm, options: reading },
  );
  const spans: ConversionSpan[] = new Array(source.length);
  for (let index = 0; index < source.length; index++) {
    spans[index] = {
      inputStart: inputStarts[index],
      inputEnd: inputEnds[index],
      outputStart: outputStarts[index],
      outputEnd: outputEnds[index],
    };
  }
  return { output, lossy: losses.length > 0, losses, spans };
}
