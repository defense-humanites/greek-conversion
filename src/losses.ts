import { isVowel } from "./context.ts";
import type { Diacritic, Document, Token } from "./model.ts";
import type { SpanTable } from "./parsers/positions.ts";

/** Machine-readable categories of information loss. */
export type ConversionLossCode =
  | "changed-case"
  | "removed-glyph-variant"
  | "removed-diacritic"
  | "displaced-diacritic"
  | "inferred-breathing"
  | "unrepresented-grapheme"
  | "unrepresented-literal";

/** One source token distinction not retained by the rendered target. */
export interface ConversionLoss {
  /** Stable category suitable for programmatic handling. */
  code: ConversionLossCode;
  /** Zero-based token index in the canonical source document. */
  index: number;
  /**
   * Offset, in UTF-16 code units, of the source token in the input as
   * supplied: `spans[index].inputStart` of the result.
   */
  offset: number;
  /** Length of the source token in the input, in UTF-16 code units. */
  length: number;
  /** Human-readable English explanation. */
  message: string;
  /**
   * The affected semantic mark when {@link code} is `"removed-diacritic"`,
   * `"displaced-diacritic"`, or `"inferred-breathing"`.
   */
  diacritic?: Diacritic;
}

/**
 * Where one source token was read in the input and where its output was
 * written, as ranges of UTF-16 code units (the unit of `String.length`,
 * `slice()` and editor selections), start included and end excluded.
 *
 * Spans are in order: their starts and their ends never decrease. Input
 * spans cover the input without gaps; a token read from part of a character
 * that the previous token also draws on (a stray mark of a precomposed
 * letter) has that character's span, inside the previous token's and ending
 * with it. Output spans cover the output; several tokens written as one share
 * a span (a Greek numeral written as a decimal number, a whitespace run
 * collapsed to one space, the two letters of a modern digraph), and a token
 * the output has nothing for has an empty span where the output of the next
 * token starts. See the positions contract in `docs/conversion-analysis.md`.
 */
export interface ConversionSpan {
  /** Offset of the token's first code unit in the input as supplied. */
  inputStart: number;
  /** Offset after its last code unit in the input. */
  inputEnd: number;
  /** Offset of the first code unit of the token's output. */
  outputStart: number;
  /** Offset after the last code unit of the token's output. */
  outputEnd: number;
}

/** Output and information-loss diagnostics returned by detailed conversion. */
export interface ConversionResult {
  /** Rendered target text. */
  output: string;
  /** Whether at least one source distinction was lost. */
  lossy: boolean;
  /** Structured losses in source-token order. */
  losses: readonly ConversionLoss[];
  /**
   * One span per token of the parsed source, in token order: where it was
   * read and where its output was written.
   */
  spans: readonly ConversionSpan[];
}

const ALIGNMENT_WINDOW = 16;

const BREATHINGS: readonly Diacritic[] = ["smooth", "rough"];

const DIACRITIC_NAMES: Readonly<Record<Diacritic, string>> = {
  smooth: "smooth breathing",
  rough: "rough breathing",
  coronis: "coronis",
  acute: "acute accent",
  grave: "grave accent",
  circumflex: "circumflex accent",
  diaeresis: "diaeresis",
  "iota-subscript": "iota subscript",
  macron: "macron",
  breve: "breve",
};

/**
 * Compares the source document with the target read back from the output and
 * reports what the target does not retain. `spans` gives the position of
 * each source token in the input, carried by the losses.
 */
export function findConversionLosses(
  source: Document,
  target: Document,
  spans: SpanTable,
): readonly ConversionLoss[] {
  const losses = new Losses(spans);
  let sourceIndex = 0;
  let targetIndex = 0;

  while (sourceIndex < source.length) {
    if (
      targetIndex < target.length &&
      preservesToken(source[sourceIndex], target[targetIndex])
    ) {
      addInferredBreathing(losses, source, target, sourceIndex, targetIndex);
      sourceIndex++;
      targetIndex++;
      continue;
    }

    if (
      targetIndex < target.length &&
      sameTokenIdentity(source[sourceIndex], target[targetIndex])
    ) {
      addTokenLoss(losses, source, target, sourceIndex, targetIndex);
      sourceIndex++;
      targetIndex++;
      continue;
    }

    const alignment = nextAlignment(source, target, sourceIndex, targetIndex);
    if (alignment !== undefined) {
      addLosses(
        losses,
        source,
        target,
        sourceIndex,
        alignment.source,
        targetIndex,
        alignment.target,
      );
      sourceIndex = alignment.source;
      targetIndex = alignment.target;
      continue;
    }

    addTokenLoss(
      losses,
      source,
      target,
      sourceIndex,
      targetIndex < target.length ? targetIndex : undefined,
    );
    sourceIndex++;
    if (targetIndex < target.length) targetIndex++;
  }

  return losses.all;
}

/** The losses found so far, each located at its source token. */
class Losses {
  readonly all: ConversionLoss[] = [];
  readonly #spans: SpanTable;

  constructor(spans: SpanTable) {
    this.#spans = spans;
  }

  add(
    code: ConversionLossCode,
    index: number,
    message: string,
    diacritic?: Diacritic,
  ): void {
    const offset = this.#spans.starts[index];
    const length = this.#spans.ends[index] - offset;
    this.all.push(
      diacritic === undefined
        ? { code, index, offset, length, message }
        : { code, index, offset, length, diacritic, message },
    );
  }
}

function nextAlignment(
  source: Document,
  target: Document,
  sourceStart: number,
  targetStart: number,
): { source: number; target: number } | undefined {
  const sourceEnd = Math.min(source.length, sourceStart + ALIGNMENT_WINDOW + 1);
  const targetEnd = Math.min(target.length, targetStart + ALIGNMENT_WINDOW + 1);
  let best: { source: number; target: number; distance: number } | undefined;

  for (let sourceIndex = sourceStart; sourceIndex < sourceEnd; sourceIndex++) {
    for (
      let targetIndex = targetStart;
      targetIndex < targetEnd;
      targetIndex++
    ) {
      if (sourceIndex === sourceStart && targetIndex === targetStart) continue;
      if (!preservesToken(source[sourceIndex], target[targetIndex])) continue;

      const distance = sourceIndex - sourceStart + targetIndex - targetStart;
      if (best === undefined || distance < best.distance) {
        best = { source: sourceIndex, target: targetIndex, distance };
      }
    }
  }

  return best;
}

function addLosses(
  losses: Losses,
  source: Document,
  target: Document,
  sourceStart: number,
  sourceEnd: number,
  targetStart: number,
  targetEnd: number,
): void {
  for (let index = sourceStart; index < sourceEnd; index++) {
    const targetOffset = index - sourceStart;
    const targetIndex = targetStart + targetOffset < targetEnd
      ? targetStart + targetOffset
      : undefined;
    addTokenLoss(losses, source, target, index, targetIndex);
  }
}

function addTokenLoss(
  losses: Losses,
  sourceDocument: Document,
  targetDocument: Document,
  index: number,
  targetIndex: number | undefined,
): void {
  const source = sourceDocument[index];
  const target = targetIndex === undefined
    ? undefined
    : targetDocument[targetIndex];

  if (
    source.kind === "grapheme" &&
    target?.kind === "grapheme" &&
    source.letter === target.letter
  ) {
    let changed = false;
    if (source.uppercase !== target.uppercase) {
      changed = true;
      losses.add(
        "changed-case",
        index,
        "The target representation does not retain letter case.",
      );
    }

    const removed = [...source.diacritics].filter((mark) =>
      !target.diacritics.has(mark)
    );
    if (removed.length > 0) {
      changed = true;
      for (const diacritic of removed) {
        if (
          isDisplacedBreathing(
            diacritic,
            sourceDocument,
            targetDocument,
            index,
            targetIndex,
          )
        ) {
          losses.add(
            "displaced-diacritic",
            index,
            `The target representation moves the ${
              DIACRITIC_NAMES[diacritic]
            } onto the next vowel; the hiatus it marked is read as a diphthong.`,
            diacritic,
          );
          continue;
        }
        losses.add(
          "removed-diacritic",
          index,
          `The target representation does not retain the ${
            DIACRITIC_NAMES[diacritic]
          }.`,
          diacritic,
        );
      }
    }
    if (
      source.glyphVariant === "lunate-sigma" &&
      source.glyphVariant !== target.glyphVariant
    ) {
      changed = true;
      losses.add(
        "removed-glyph-variant",
        index,
        "The target representation does not retain the source glyph variant.",
      );
    }
    if (changed) return;
  }

  if (source.kind === "grapheme") {
    losses.add(
      "unrepresented-grapheme",
      index,
      `The target representation does not retain ${source.letter}.`,
    );
    return;
  }

  losses.add(
    "unrepresented-literal",
    index,
    "The target representation does not retain this literal token.",
  );
}

function sameTokenIdentity(source: Token, target: Token): boolean {
  if (source.kind !== target.kind) return false;
  if (source.kind === "literal" && target.kind === "literal") {
    return source.value.normalize("NFD") === target.value.normalize("NFD");
  }
  return source.kind === "grapheme" &&
    target.kind === "grapheme" &&
    source.letter === target.letter;
}

function preservesToken(source: Token, target: Token): boolean {
  if (source.kind !== target.kind) return false;
  if (source.kind === "literal" && target.kind === "literal") {
    return source.value.normalize("NFD") === target.value.normalize("NFD");
  }
  if (source.kind !== "grapheme" || target.kind !== "grapheme") return false;
  return source.letter === target.letter &&
    source.uppercase === target.uppercase &&
    (source.glyphVariant !== "lunate-sigma" ||
      source.glyphVariant === target.glyphVariant) &&
    [...source.diacritics].every((mark) => target.diacritics.has(mark));
}

/**
 * Reports a smooth breathing that the target carries on a vowel the source
 * left unmarked.
 *
 * Transliteration writes nothing for a smooth breathing and nothing for an
 * unmarked initial vowel, so the reparsed target infers a smooth breathing
 * that monotonic or uncial sources did not have. A breathing that merely moved
 * from the previous vowel is reported there as displaced, not here.
 */
function addInferredBreathing(
  losses: Losses,
  source: Document,
  target: Document,
  index: number,
  targetIndex: number,
): void {
  const sourceToken = source[index];
  const targetToken = target[targetIndex];
  if (
    sourceToken.kind !== "grapheme" || targetToken.kind !== "grapheme" ||
    !isVowel(sourceToken.letter) ||
    !targetToken.diacritics.has("smooth") ||
    BREATHINGS.some((mark) => sourceToken.diacritics.has(mark))
  ) return;

  const previousSource = source[index - 1];
  const previousTarget = target[targetIndex - 1];
  const displaced = previousSource?.kind === "grapheme" &&
    previousTarget?.kind === "grapheme" &&
    BREATHINGS.some((mark) =>
      previousSource.diacritics.has(mark) &&
      !previousTarget.diacritics.has(mark)
    );
  if (displaced) return;

  losses.add(
    "inferred-breathing",
    index,
    "The target representation does not distinguish an unmarked initial vowel from one with a smooth breathing; the breathing is inferred when the target is read back.",
    "smooth",
  );
}

/**
 * Whether a breathing absent from the target token reappears on the following
 * target vowel, where the source had none.
 *
 * This happens when a hiatus marked only by a breathing on its first vowel is
 * rendered in a format that does not write that breathing in place, so the
 * reparsed target reads the pair as a diphthong.
 */
function isDisplacedBreathing(
  diacritic: Diacritic,
  source: Document,
  target: Document,
  index: number,
  targetIndex: number | undefined,
): boolean {
  if (!BREATHINGS.includes(diacritic) || targetIndex === undefined) {
    return false;
  }
  const nextSource = source[index + 1];
  const nextTarget = target[targetIndex + 1];
  return nextSource?.kind === "grapheme" &&
    nextTarget?.kind === "grapheme" &&
    nextSource.letter === nextTarget.letter &&
    !BREATHINGS.some((mark) => nextSource.diacritics.has(mark)) &&
    nextTarget.diacritics.has(diacritic);
}
