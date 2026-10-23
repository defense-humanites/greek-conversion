import { ALPHABET, BY_GREEK, GREEK_MARKS } from "../alphabet.ts";
import { greekLower } from "../case.ts";
import { classifyCoronides } from "../context.ts";
import {
  diacriticBit,
  diacriticsFromMask,
  type Document,
  type GlyphVariant,
  type Letter,
  literal,
  ownedGrapheme,
  type Token,
} from "../model.ts";
import { parsePunctuation } from "../punctuation.ts";
import { codePointAt, codeUnitTable } from "./code_units.ts";

/**
 * The reader works on UTF-16 code units rather than on one string per
 * character: `Array.from()` and the map lookups keyed by those strings cost
 * about four fifths of the reading time. Each code unit is classified once,
 * the first time it is met, with the same functions as before (`greekLower`,
 * `BY_GREEK`), and the answer is kept in typed arrays.
 */
const LETTERS = Object.keys(ALPHABET) as Letter[];
const LETTER_INDEX = new Map(LETTERS.map((letter, index) => [letter, index]));
const VARIANTS: readonly (GlyphVariant | undefined)[] = [
  undefined,
  "lunate-sigma",
  "final-sigma",
  "medial-sigma",
];

const UNSEEN = -2;
const NOT_A_LETTER = -1;
/** Letter index of each code unit, or NOT_A_LETTER; UNSEEN until classified. */
const LETTER_OF = new Int8Array(0x10000).fill(UNSEEN);
/** Bit 0: uppercase; bits 1–2: index in VARIANTS. */
const FLAGS_OF = new Uint8Array(0x10000);

function classify(unit: number): number {
  const source = String.fromCharCode(unit);
  const lower = greekLower(source);
  const letter = BY_GREEK.get(lower === "ς" ? "σ" : lower);
  if (letter === undefined) return LETTER_OF[unit] = NOT_A_LETTER;
  FLAGS_OF[unit] = (source !== lower ? 1 : 0) |
    (lower === "ϲ" ? 1 : lower === "ς" ? 2 : lower === "σ" ? 3 : 0) << 1;
  return LETTER_OF[unit] = LETTER_INDEX.get(letter)!;
}

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

export function parseGreek(input: string): Document {
  const text = input.normalize("NFD");
  const out: Token[] = [];

  for (let i = 0; i < text.length;) {
    const unit = text.charCodeAt(i);
    let letter = LETTER_OF[unit];
    if (letter === UNSEEN) letter = classify(unit);

    if (letter === NOT_A_LETTER) {
      const source = codePointAt(text, i);
      out.push(literal(parsePunctuation(source, "greek") ?? source));
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

    const flags = FLAGS_OF[unit];
    out.push(ownedGrapheme(
      LETTERS[letter],
      (flags & 1) === 1,
      diacriticsFromMask(marks),
      VARIANTS[flags >> 1],
    ));
  }

  classifyCoronides(out);

  return out;
}
