import type { Diacritic, Document, Token } from "./model.ts";

/** Machine-readable categories of information loss. */
export type ConversionLossCode =
  | "changed-case"
  | "removed-glyph-variant"
  | "removed-diacritic"
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
  /** Removed semantic mark when {@link code} is `"removed-diacritic"`. */
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
      addTokenLoss(
        losses,
        source[sourceIndex],
        target[targetIndex],
        sourceIndex,
      );
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

    addTokenLoss(losses, source[sourceIndex], target[targetIndex], sourceIndex);
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
    const targetToken = targetStart + targetOffset < targetEnd
      ? target[targetStart + targetOffset]
      : undefined;
    addTokenLoss(losses, source[index], targetToken, index);
  }
}

function addTokenLoss(
  losses: ConversionLoss[],
  source: Token,
  target: Token | undefined,
  index: number,
): void {
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
