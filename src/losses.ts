import { isVowel, type QuotationContext } from "./context.ts";
import { glyphForm } from "./encode.ts";
import { sharedMask } from "./model.ts";
import type {
  Diacritic,
  Document,
  Format,
  GlyphVariant,
  Grapheme,
  Token,
} from "./model.ts";
import type { ConversionOptions } from "./options.ts";
import type { SpanTable } from "./parsers/positions.ts";

/** Machine-readable categories of information loss. */
export type ConversionLossCode =
  | "changed-case"
  | "removed-glyph-variant"
  | "added-glyph-variant"
  | "removed-diacritic"
  | "added-diacritic"
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
   * `"added-diacritic"`, `"displaced-diacritic"`, or `"inferred-breathing"`.
   */
  diacritic?: Diacritic;
  /**
   * The source glyph variant when {@link code} is `"removed-glyph-variant"`,
   * such as `"beta-symbol"` for `ϐ`, and the variant the target writes when
   * it is `"added-glyph-variant"`: a sigma read from `s` under
   * `lunateSigma: "c"`, written `ϲ` under `greek.sigma: "lunate"`
   * (`"lunate-sigma"`), converts back to `c`.
   */
  glyphVariant?: GlyphVariant;
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

/** Where the output was written and read again, in output code units. */
export interface OutputPositions {
  /** The range each source token was written to. */
  written: SpanTable;
  /** Where each target token was read from. */
  read: SpanTable;
}

/**
 * Compares the source document with the target read back from the output and
 * reports what the target does not retain. `spans` gives the position of
 * each source token in the input, carried by the losses.
 *
 * When both documents have the same tokens letter for letter, each source
 * token is compared with the target token at the same index. Otherwise they
 * are paired by position in the output, which `positions` gives on demand: a
 * target token belongs to the source token whose output range it starts in.
 * When several do (a breathing written as an apostrophe, a coronis after its
 * vowel), the one that keeps most of the source token stands for it: one that
 * keeps it whole, then one with the same letter, then one of the same kind. A
 * target token starting in no range is not paired. Pairing by content instead
 * would have to guess where the documents agree again after a change, and
 * could guess wrong: `παιδαγωγῶν` under `iso-843-type-2` reported its loss on
 * `γ` and `ῶ` instead of `ω`, and a loss in a long text could land on another
 * line.
 */
export function findConversionLosses(
  source: Document,
  target: Document,
  spans: SpanTable,
  positions: () => OutputPositions,
  glyphs: SourceGlyphs,
): readonly ConversionLoss[] {
  const losses = new Losses(spans);
  const sameGlyph = glyphComparison(source, glyphs);
  const paired = sameLetters(source, target)
    ? undefined
    : pairByPosition(source, target, positions(), sameGlyph);
  const counterparts = paired?.counterparts;

  for (let index = 0; index < source.length; index++) {
    if (paired?.spelled[index] === 1) continue;
    const counterpart = counterparts === undefined
      ? index
      : counterparts[index] < 0
      ? undefined
      : counterparts[index];
    if (
      counterpart !== undefined &&
      preservesToken(source[index], target[counterpart], index, sameGlyph)
    ) {
      addInferredBreathing(losses, source, target, index, counterpart);
    } else {
      addTokenLoss(losses, source, target, index, counterpart, sameGlyph);
    }
  }

  return losses.all;
}

/**
 * The format the source was read from and the options that write it: those
 * of the conversion, or its `source` profile.
 */
export interface SourceGlyphs {
  readonly format: Format;
  readonly options: ConversionOptions;
}

/**
 * Whether the target token at a source index keeps the glyph of the source
 * token there: whether the source format, under the options, writes them
 * alike (`glyphForm()`). A variant that the options write again from the text
 * read back is kept (`ϐ` inside a word under `medialBeta: "symbol"`); one
 * they fold is not reported (`ϲ` under `sigma: "standard"`), since the
 * canonical source has none.
 */
type GlyphComparison = (
  index: number,
  source: Grapheme,
  target: Grapheme,
) => boolean;

function glyphComparison(
  document: Document,
  { format, options }: SourceGlyphs,
): GlyphComparison {
  const quotations: QuotationContext = {};
  // The target is compared in the source's case: `changed-case` reports the
  // case, and a variant is lost only if the other case has no such form
  // (`ϑ` → `Θ`) and the options do not write it again.
  return (index, source, target) =>
    source.glyphVariant === target.glyphVariant ||
    glyphForm(document, index, source, format, options, quotations) ===
      glyphForm(
        document,
        index,
        target.uppercase === source.uppercase
          ? target
          : { ...target, uppercase: source.uppercase },
        format,
        options,
        quotations,
      );
}

/** Whether both documents have the same tokens, letter for letter. */
function sameLetters(source: Document, target: Document): boolean {
  if (source.length !== target.length) return false;
  for (let index = 0; index < source.length; index++) {
    if (!sameTokenIdentity(source[index], target[index])) return false;
  }
  return true;
}

/**
 * The target token paired with each source token, or -1, and the source
 * literals that the literals read where they were written spell together
 * (`spelled[i]` is 1): a reader may read a letter and its marks as several
 * literals (`ῷ` in transliteration), and the text is retained.
 */
function pairByPosition(
  source: Document,
  target: Document,
  { written, read }: OutputPositions,
  sameGlyph: GlyphComparison,
): { counterparts: Int32Array; spelled: Uint8Array } {
  const counterparts = new Int32Array(source.length).fill(-1);
  const spelled = new Uint8Array(source.length);
  let first = 0;
  for (let index = 0; index < source.length; index++) {
    const start = written.starts[index];
    const end = written.ends[index];
    while (first < target.length && read.starts[first] < start) first++;

    const token = source[index];
    let text: string | undefined = token.kind === "literal" ? "" : undefined;
    let closeness = -1;
    for (
      let targetIndex = first;
      targetIndex < target.length && read.starts[targetIndex] < end;
      targetIndex++
    ) {
      const candidate = target[targetIndex];
      if (text !== undefined) {
        text = candidate.kind === "literal"
          ? text + candidate.value
          : undefined;
      }
      const score = preservesToken(source[index], candidate, index, sameGlyph)
        ? 3
        : sameTokenIdentity(source[index], candidate)
        ? 2
        : candidate.kind === source[index].kind
        ? 1
        : 0;
      if (score > closeness) {
        counterparts[index] = targetIndex;
        closeness = score;
      }
    }
    if (
      text !== undefined && text !== "" && token.kind === "literal" &&
      sameLiteral(token.value, text)
    ) spelled[index] = 1;
  }
  return { counterparts, spelled };
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
    glyphVariant?: GlyphVariant,
  ): void {
    const offset = this.#spans.starts[index];
    const length = this.#spans.ends[index] - offset;
    const loss: ConversionLoss = { code, index, offset, length, message };
    if (diacritic !== undefined) loss.diacritic = diacritic;
    if (glyphVariant !== undefined) loss.glyphVariant = glyphVariant;
    this.all.push(loss);
  }
}

function addTokenLoss(
  losses: Losses,
  sourceDocument: Document,
  targetDocument: Document,
  index: number,
  targetIndex: number | undefined,
  sameGlyph: GlyphComparison,
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
    if (addsDiaeresis(source, target)) {
      changed = true;
      losses.add(
        "added-diacritic",
        index,
        "The target representation writes a diaeresis to keep a hiatus, and does not distinguish this vowel from one with a diaeresis; the diaeresis is read back.",
        "diaeresis",
      );
    }
    if (!sameGlyph(index, source, target)) {
      changed = true;
      if (source.glyphVariant === undefined) {
        losses.add(
          "added-glyph-variant",
          index,
          "The target representation writes a glyph variant that converts back otherwise.",
          undefined,
          target.glyphVariant,
        );
      } else {
        losses.add(
          "removed-glyph-variant",
          index,
          "The target representation does not retain the source glyph variant.",
          undefined,
          source.glyphVariant,
        );
      }
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
    return sameLiteral(source.value, target.value);
  }
  return source.kind === "grapheme" &&
    target.kind === "grapheme" &&
    source.letter === target.letter;
}

function preservesToken(
  source: Token,
  target: Token,
  index: number,
  sameGlyph: GlyphComparison,
): boolean {
  if (source.kind !== target.kind) return false;
  if (source.kind === "literal" && target.kind === "literal") {
    return sameLiteral(source.value, target.value);
  }
  if (source.kind !== "grapheme" || target.kind !== "grapheme") return false;
  return source.letter === target.letter &&
    source.uppercase === target.uppercase &&
    sameGlyph(index, source, target) &&
    includesMarks(target.diacritics, source.diacritics) &&
    !addsDiaeresis(source, target);
}

/**
 * Whether the target reads back a diaeresis the source token does not have:
 * the one transliteration writes on a contextual `y` to keep a hiatus that
 * the reader would otherwise lose (`αἑυ` → `aheÿ`), which reads back as `ϋ`.
 */
function addsDiaeresis(source: Grapheme, target: Grapheme): boolean {
  return source.diacritics !== target.diacritics &&
    target.diacritics.has("diaeresis") && !source.diacritics.has("diaeresis");
}

/** Whether two literals are canonically equivalent; most are equal. */
function sameLiteral(source: string, target: string): boolean {
  return source === target ||
    source.normalize("NFD") === target.normalize("NFD");
}

/** Whether `marks` has every mark of `subset`; by mask for shared sets. */
function includesMarks(
  marks: ReadonlySet<Diacritic>,
  subset: ReadonlySet<Diacritic>,
): boolean {
  if (marks === subset) return true;
  const mask = sharedMask(marks);
  const subsetMask = sharedMask(subset);
  if (mask !== undefined && subsetMask !== undefined) {
    return (subsetMask & ~mask) === 0;
  }
  for (const mark of subset) if (!marks.has(mark)) return false;
  return true;
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
