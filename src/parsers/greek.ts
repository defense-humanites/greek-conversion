import { BY_GREEK, GREEK_MARKS } from "../alphabet.ts";
import { greekLower } from "../case.ts";
import { classifyCoronides } from "../context.ts";
import {
  diacriticBit,
  diacriticsFromMask,
  type Document,
  type GlyphVariant,
  ownedGrapheme,
  type Token,
} from "../model.ts";
import {
  capitalizeLoneSigns,
  GREEK_LIGATURES,
  ligatureLetters,
} from "../ligatures.ts";
import { readTonosKeraiai } from "../orthography.ts";
import { parsePunctuation } from "../punctuation.ts";
import { codePointAt, codeUnitTable } from "./code_units.ts";
import {
  knownMarkAfter,
  knownMarksFirst,
  mayBeMark,
  unknownMarksBefore,
} from "./mark_order.ts";
import type { ReadPositions } from "./positions.ts";
import { readSpacingMarks } from "./spacing_marks.ts";
import {
  LETTERS,
  sharedGrapheme,
  textLiteral,
  VARIANTS,
} from "./shared_tokens.ts";

/**
 * The reader works on UTF-16 code units rather than on one string per
 * character: `Array.from()` and the map lookups keyed by those strings cost
 * about four fifths of the reading time. Letters are classified once, at load
 * time, with the same functions as before (`greekLower`, `BY_GREEK`), and the
 * answers are kept in small typed arrays.
 */
const LETTER_INDEX = new Map(LETTERS.map((letter, index) => [letter, index]));

const NOT_A_LETTER = -1;

/**
 * Once the text is in NFD, every code unit that `greekLower` maps to a letter
 * lies in U+0370–U+03FF: the only other one in the BMP, the ohm sign U+2126,
 * decomposes to U+03A9. tests/reader_tables_test.ts checks every BMP unit.
 * Two tables of 144 entries replace two of 65,536.
 */
const LETTERS_START = 0x0370;
const LETTERS_SIZE = 0x90;
/** Letter index of each unit of the range, or NOT_A_LETTER. */
const LETTER_OF = new Int8Array(LETTERS_SIZE).fill(NOT_A_LETTER);
/** Bit 0: uppercase; bits 1–4: index in VARIANTS. */
const FLAGS_OF = new Uint8Array(LETTERS_SIZE);

/**
 * The glyph variant each symbol form notes. `greekLower` reads them as their
 * letters (`docs/greek-unicode.md`, *Letter forms*); NFD has already split
 * `ϓ` and `ϔ` into `ϒ` and a mark.
 */
const SYMBOL_VARIANTS = new Map<string, GlyphVariant>([
  ["ϐ", "beta-symbol"],
  ["ϑ", "theta-symbol"],
  ["ϴ", "capital-theta-symbol"],
  ["ϕ", "phi-symbol"],
  ["ϖ", "pi-symbol"],
  ["ϰ", "kappa-symbol"],
  ["ϱ", "rho-symbol"],
  ["ϵ", "lunate-epsilon"],
  ["ϒ", "upsilon-hook"],
]);

for (let index = 0; index < LETTERS_SIZE; index++) {
  const source = String.fromCharCode(LETTERS_START + index);
  const lower = greekLower(source);
  const letter = BY_GREEK.get(lower === "ς" ? "σ" : lower);
  if (letter === undefined) continue;
  LETTER_OF[index] = LETTER_INDEX.get(letter)!;
  const symbol = SYMBOL_VARIANTS.get(source);
  const uppercase = symbol === undefined
    ? source !== lower
    : symbol === "capital-theta-symbol" || symbol === "upsilon-hook";
  // A capital sigma has no final or medial shape to keep; the capital lunate
  // sigma Ϲ is still lunate.
  const variant: GlyphVariant | undefined = symbol ??
    (lower === "ϲ"
      ? "lunate-sigma"
      : uppercase
      ? undefined
      : lower === "ς"
      ? "final-sigma"
      : lower === "σ"
      ? "medial-sigma"
      : undefined);
  FLAGS_OF[index] = (uppercase ? 1 : 0) |
    (variant === undefined ? 0 : VARIANTS.indexOf(variant)) << 1;
}

const letterOf = (unit: number): number =>
  unit >= LETTERS_START && unit < LETTERS_START + LETTERS_SIZE
    ? LETTER_OF[unit - LETTERS_START]
    : NOT_A_LETTER;

/** Combining marks all lie in U+0300–U+036F. */
const MARKS_START = 0x0300;
const MARK_BIT = codeUnitTable(
  MARKS_START,
  0x70,
  [...GREEK_MARKS].map(([mark, diacritic]) => [mark, diacriticBit(diacritic)]),
);

const markBit = (unit: number): number =>
  unit >= MARKS_START && unit < MARKS_START + 0x70
    ? MARK_BIT[unit - MARKS_START]
    : 0;

const SMOOTH_BIT = diacriticBit("smooth");

/** Whether the reader reads a mark (`mark_order.ts`). */
const isGreekMark = (mark: string): boolean =>
  mark.length === 1 && markBit(mark.charCodeAt(0)) !== 0;

/**
 * Whether the mark at `i`, which the reader reads, follows marks of a letter
 * that it does not, and only canonical order put it after them.
 */
function misplacedMark(text: string, i: number): boolean {
  const start = unknownMarksBefore(text, i, isGreekMark);
  if (start === i || start === 0) return false;
  const before = text.charCodeAt(start - 1);
  return (letterOf(before) !== NOT_A_LETTER || markBit(before) !== 0 ||
    GREEK_LIGATURES.has(before)) && knownMarkAfter(text, start, isGreekMark);
}

/**
 * Whether a unit of decomposed text is a spacing sign (see
 * `spacing_marks.ts`): psili, dasia, or the spacing diaeresis, which the
 * compounds of each with an accent decompose to, or the spacing tonos.
 */
const isSpacingSign = (unit: number): boolean =>
  unit === 0x1fbf || unit === 0x1ffe || unit === 0x00a8 || unit === 0x0384;

/**
 * Reads Greek. With `share`, equal tokens are one shared object (see
 * `shared_tokens.ts`): only for documents that never reach the caller. With
 * `positions`, records where each token starts in the text read (see
 * `positions.ts`).
 */
export function parseGreek(
  input: string,
  share = false,
  positions?: ReadPositions,
): Document {
  const text = input.normalize("NFD");
  return readGreek(text, share, positions, false) ??
    readGreek(knownMarksFirst(text, isGreekMark), share, positions, true)!;
}

/**
 * Reads decomposed Greek; `undefined` when a letter has marks the reader
 * knows after one it does not, unless `ordered`: the text is then read again
 * with its marks in the reader's order (`mark_order.ts`).
 */
function readGreek(
  text: string,
  share: boolean,
  positions: ReadPositions | undefined,
  ordered: boolean,
): Document | undefined {
  const out: Token[] = [];
  const starts = positions?.starts;
  if (starts !== undefined) starts.length = 0;
  if (positions !== undefined) positions.text = text;
  // The letters read with a smooth breathing, which alone may bear a
  // coronis, and whether the text has a spacing sign, noted as each unit is
  // read rather than searched for afterwards.
  const smooth: number[] = [];
  let spacing = false;
  let tonos = false;
  // Whether a letter has marks the reader knows after one it does not, and
  // whether a sign for several letters was read.
  let misordered = false;
  let signs = false;

  for (let i = 0; i < text.length;) {
    const unit = text.charCodeAt(i);
    const letter = letterOf(unit);
    if (starts !== undefined) starts.push(i);

    if (letter === NOT_A_LETTER) {
      const ligature = GREEK_LIGATURES.get(unit);
      if (ligature !== undefined) {
        i = readLigature(text, i, ligature, out, starts, smooth, ordered);
        if (i < 0) return undefined;
        signs = true;
        continue;
      }
      if (isSpacingSign(unit)) {
        if (unit === 0x0384) tonos = true;
        else spacing = true;
      }
      // A mark the reader knows, read here only after one it does not.
      if (!ordered && markBit(unit) !== 0 && misplacedMark(text, i)) {
        misordered = true;
      }
      const source = codePointAt(text, i);
      const value = parsePunctuation(source, "greek") ?? source;
      out.push(textLiteral(value, share));
      i += source.length;
      continue;
    }

    let marks = 0;

    i++;

    while (i < text.length) {
      const bit = markBit(text.charCodeAt(i));
      if (bit === 0) break;
      marks |= bit;
      i++;
    }

    const flags = FLAGS_OF[unit - LETTERS_START];
    if ((marks & SMOOTH_BIT) !== 0) smooth.push(out.length);
    out.push(
      share ? sharedGrapheme(letter, flags, marks) : ownedGrapheme(
        LETTERS[letter],
        (flags & 1) === 1,
        diacriticsFromMask(marks),
        VARIANTS[flags >> 1],
      ),
    );
  }

  if (misordered) return undefined;
  if (starts !== undefined) starts.push(text.length);
  if (signs) capitalizeLoneSigns(out);
  // The spacing tonos typed for a keraia, which then follows a numeral as
  // a keraia does, before the spacing signs, which read those left.
  if (tonos && readTonosKeraiai(out)) spacing = true;

  if (spacing) {
    // Joining the spacing signs to the letters moves the letters noted.
    readSpacingMarks(out, starts);
    classifyCoronides(out);
  } else {
    classifyCoronides(out, smooth);
  }

  return out;
}

/**
 * Reads the sign for several letters at `i` (`ϗ`, `ȣ`), with the marks
 * written after it, which belong to its last letter; returns where reading
 * goes on, or -1 where the text is to be read again, as by `readGreek`. Out
 * of the loop of `readGreek`, which this rare case would otherwise make
 * longer.
 */
function readLigature(
  text: string,
  i: number,
  ligature: Parameters<typeof ligatureLetters>[0],
  out: Token[],
  starts: number[] | undefined,
  smooth: number[],
  ordered: boolean,
): number {
  let marks = 0;
  for (i++; i < text.length; i++) {
    const bit = markBit(text.charCodeAt(i));
    if (bit === 0) break;
    marks |= bit;
  }
  if (
    !ordered && i < text.length && mayBeMark(text.charCodeAt(i)) &&
    knownMarkAfter(text, i, isGreekMark)
  ) return -1;
  const next = letterOf(text.charCodeAt(i));
  const letters = ligatureLetters(
    ligature,
    diacriticsFromMask(marks),
    next !== NOT_A_LETTER &&
      (FLAGS_OF[text.charCodeAt(i) - LETTERS_START] & 1) === 1,
  );
  if ((marks & SMOOTH_BIT) !== 0) {
    for (let k = 0; k < letters.length; k++) smooth.push(out.length + k);
  }
  out.push(...letters);
  // The letters share the sign's span.
  for (let k = 1; k < letters.length; k++) starts?.push(starts.at(-1)!);
  return i;
}
