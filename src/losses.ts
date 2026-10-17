import type { Diacritic, Document, Token } from "./model.ts";

/** Machine-readable categories of information loss. */
export type ConversionLossCode =
  | "changed-case"
  | "removed-glyph-variant"
  | "removed-diacritic"
  | "displaced-diacritic"
  | "unrepresented-grapheme"
  | "unrepresented-literal";

/** One source token distinction not retained by the rendered target. */
export interface ConversionLoss {
  /** Stable category suitable for programmatic handling. */
  code: ConversionLossCode;
  /** Zero-based token index in the canonical source document. */
  index: number;
  /** Human-readable English explanation. */
  message: string;
  /**
   * The affected semantic mark when {@link code} is `"removed-diacritic"` or
   * `"displaced-diacritic"`.
   */
  diacritic?: Diacritic;
}

/** Output and information-loss diagnostics returned by detailed conversion. */
export interface ConversionResult {
  /** Rendered target text. */
  output: string;
  /** Whether at least one source distinction was lost. */
  lossy: boolean;
  /** Structured losses in source-token order. */
  losses: readonly ConversionLoss[];
}

const ALIGNMENT_WINDOW = 16;

const BREATHINGS: readonly Diacritic[] = ["smooth", "rough"];

export function findConversionLosses(
  source: Document,
  target: Document,
): readonly ConversionLoss[] {
  const losses: ConversionLoss[] = [];
  let sourceIndex = 0;
  let targetIndex = 0;

  while (sourceIndex < source.length) {
    if (
      targetIndex < target.length &&
      preservesToken(source[sourceIndex], target[targetIndex])
    ) {
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

  return losses;
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
  losses: ConversionLoss[],
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
  losses: ConversionLoss[],
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
      losses.push({
        code: "changed-case",
        index,
        message: "The target representation does not retain letter case.",
      });
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
          losses.push({
            code: "displaced-diacritic",
            index,
            diacritic,
            message:
              `The target representation moves the ${diacritic} breathing onto the next vowel; the hiatus it marked is read as a diphthong.`,
          });
          continue;
        }
        losses.push({
          code: "removed-diacritic",
          index,
          diacritic,
          message: `The target representation does not retain ${diacritic}.`,
        });
      }
    }
    if (
      source.glyphVariant === "lunate-sigma" &&
      source.glyphVariant !== target.glyphVariant
    ) {
      changed = true;
      losses.push({
        code: "removed-glyph-variant",
        index,
        message:
          "The target representation does not retain the source glyph variant.",
      });
    }
    if (changed) return;
  }

  if (source.kind === "grapheme") {
    losses.push({
      code: "unrepresented-grapheme",
      index,
      message: `The target representation does not retain ${source.letter}.`,
    });
    return;
  }

  losses.push({
    code: "unrepresented-literal",
    index,
    message: "The target representation does not retain this literal token.",
  });
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
