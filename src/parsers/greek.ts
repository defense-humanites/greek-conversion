import { BY_GREEK, GREEK_MARKS } from "../alphabet.ts";
import { greekLower } from "../case.ts";
import { classifyCoronides } from "../context.ts";
import {
  diacriticBit,
  diacriticsFromMask,
  type Document,
  literal,
  ownedGrapheme,
  type Token,
} from "../model.ts";
import { parsePunctuation } from "../punctuation.ts";
import { codePointAt, codeUnitTable } from "./code_units.ts";
import type { ReadPositions } from "./positions.ts";
import {
  LETTERS,
  sharedGrapheme,
  sharedLiteral,
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
/** Bit 0: uppercase; bits 1–2: index in VARIANTS. */
const FLAGS_OF = new Uint8Array(LETTERS_SIZE);

for (let index = 0; index < LETTERS_SIZE; index++) {
  const source = String.fromCharCode(LETTERS_START + index);
  const lower = greekLower(source);
  const letter = BY_GREEK.get(lower === "ς" ? "σ" : lower);
  if (letter === undefined) continue;
  LETTER_OF[index] = LETTER_INDEX.get(letter)!;
  FLAGS_OF[index] = (source !== lower ? 1 : 0) |
    (lower === "ϲ" ? 1 : lower === "ς" ? 2 : lower === "σ" ? 3 : 0) << 1;
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
  const out: Token[] = [];
  const starts = positions?.starts;
  if (positions !== undefined) positions.text = text;

  for (let i = 0; i < text.length;) {
    const unit = text.charCodeAt(i);
    const letter = letterOf(unit);
    if (starts !== undefined) starts.push(i);

    if (letter === NOT_A_LETTER) {
      const source = codePointAt(text, i);
      const value = parsePunctuation(source, "greek") ?? source;
      out.push(share ? sharedLiteral(value) : literal(value));
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
    out.push(
      share ? sharedGrapheme(letter, flags, marks) : ownedGrapheme(
        LETTERS[letter],
        (flags & 1) === 1,
        diacriticsFromMask(marks),
        VARIANTS[flags >> 1],
      ),
    );
  }

  if (starts !== undefined) starts.push(text.length);

  classifyCoronides(out);

  return out;
}
