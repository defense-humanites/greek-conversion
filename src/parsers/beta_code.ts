import { BETA_MARKS, BY_BETA } from "../alphabet.ts";
import {
  ARISTERI_KERAIA,
  classifyCoronides,
  DEXIA_KERAIA,
} from "../context.ts";
import {
  diacriticBit,
  diacriticsFromMask,
  type Document,
  type GlyphVariant,
  grapheme,
  type Letter,
  literal,
  ownedGrapheme,
  type Token,
} from "../model.ts";
import { parsePunctuation } from "../punctuation.ts";
import { codePointAt, codeUnitTable } from "./code_units.ts";
import type { ReadPositions } from "./positions.ts";
import { readSpacingMarks } from "./spacing_marks.ts";
import {
  LETTERS,
  sharedGrapheme,
  sharedLiteral,
  VARIANTS,
} from "./shared_tokens.ts";

/**
 * Like the Greek reader, this one works on UTF-16 code units. Every symbol
 * Beta Code gives a meaning to (asterisk, letters, marks, `#` and `%` codes,
 * punctuation) is made of BMP code units, so code-unit indices make the same
 * comparisons as the code-point indices of `Array.from()`; only a character
 * outside the BMP needs two units, and it is always a literal.
 */
const LETTER_INDEX = new Map(LETTERS.map((letter, index) => [letter, index]));
const SIGMA = LETTERS.indexOf("sigma");
/**
 * Variant flags of the sigma codes `s1` (medial), `s2` (final), and `s3`
 * (lunate): the index in VARIANTS, in bits 1–4.
 */
const SIGMA_CODES: readonly (GlyphVariant | undefined)[] = [
  undefined,
  "medial-sigma",
  "final-sigma",
  "lunate-sigma",
];
const SIGMA_FLAGS = SIGMA_CODES.map((variant) =>
  variant === undefined ? 0 : VARIANTS.indexOf(variant) << 1
);

const NOT_A_LETTER = -1;

function classify(unit: number): number {
  const letter = BY_BETA.get(String.fromCharCode(unit).toLowerCase());
  return letter === undefined ? NOT_A_LETTER : LETTER_INDEX.get(letter)!;
}

/**
 * Letter index of each ASCII unit, or NOT_A_LETTER. Beta Code letters are
 * ASCII, but the reader does not normalize its input and `toLowerCase()`
 * maps one other BMP unit to a letter, the Kelvin sign U+212A (`k`, kappa):
 * units above ASCII, rare in Beta Code, are classified on the fly.
 * tests/reader_tables_test.ts checks every BMP unit.
 */
const ASCII_LETTER_OF = Int8Array.from(
  { length: 0x80 },
  (_, unit) => classify(unit),
);

const letterOf = (unit: number): number =>
  unit < 0x80 ? ASCII_LETTER_OF[unit] : classify(unit);

/** Marks of one ASCII unit: breathings, accents, diaeresis, iota subscript. */
const MARK_BIT = codeUnitTable(
  0,
  0x80,
  [...BETA_MARKS]
    .filter(([mark]) => mark.length === 1)
    .map(([mark, diacritic]) => [mark, diacriticBit(diacritic)]),
);

/**
 * Marks written as a TLG percent code, by number: `%26`, the macron, and
 * `%27`, the breve. The number is every digit after `%`, so `%260` is not a
 * macron followed by `0`; other percent codes are not marks.
 */
const PERCENT_MARK_BIT = new Map(
  [...BETA_MARKS]
    .filter(([mark]) => mark.startsWith("%"))
    .map(([mark, diacritic]) => [mark.slice(1), diacriticBit(diacritic)]),
);

/**
 * The letters of the TLG `#` codes. As for `%` and the brackets, the number
 * is every digit after `#`: `#12` is the obelus, not koppa followed by `2`.
 * `#` alone is the keraia and `#22` the lower keraia; any other code is kept
 * as text, whole.
 */
const HASH_LETTERS: ReadonlyMap<string, Letter> = new Map([
  ["1", "koppa"],
  ["2", "stigma"],
  ["3", "archaic-koppa"],
  ["5", "sampi"],
  ["401", "yot"],
]);
/** Where a `#` code ends, when none starts at the current unit. */
const NO_CODE = -1;

const ASTERISK = 0x2a;
const HASH = 0x23;
const PERCENT = 0x25;
const LEFT_BRACKET = 0x5b;
const RIGHT_BRACKET = 0x5d;
const DIGIT_0 = 0x30;
const DIGIT_1 = 0x31;
const DIGIT_9 = 0x39;

/**
 * Reads Beta Code. With `share`, equal tokens are one shared object
 * (see `shared_tokens.ts`): only for documents that never reach the caller.
 * With `positions`, records where each token starts in the text, which is
 * read as supplied (see `positions.ts`).
 */
export function parseBetaCode(
  input: string,
  share = false,
  positions?: ReadPositions,
): Document {
  const text = input;
  const out: Token[] = [];
  const starts = positions?.starts;
  if (positions !== undefined) positions.text = text;

  for (let i = 0; i < text.length;) {
    const start = i;
    if (starts !== undefined) starts.push(start);
    let upper = false;

    if (text.charCodeAt(i) === ASTERISK && i + 1 < text.length) {
      upper = true;
      i++;
    }

    let marks = 0;
    if (upper) [i, marks] = consumeMarks(text, i);

    // `s3` is the lunate sigma, and `s1` and `s2` the medial and final
    // sigma, which have no capital (`*s1` is a capital sigma and a digit).
    const digit = text.charCodeAt(i + 1) - 0x30;
    const code = (text.charCodeAt(i) | 0x20) === 0x73 && digit >= 1 &&
        digit <= 3
      ? digit
      : 0;
    if (code === 3 || code > 0 && !upper) {
      // Marks follow the code, as they follow a letter.
      [i, marks] = consumeMarks(text, i + 2, marks);
      out.push(
        share
          ? sharedGrapheme(SIGMA, (upper ? 1 : 0) | SIGMA_FLAGS[code], marks)
          : ownedGrapheme(
            "sigma",
            upper,
            diacriticsFromMask(marks),
            SIGMA_CODES[code],
          ),
      );
      continue;
    }

    const punctuation = !upper && i < text.length
      ? parsePunctuation(codePointAt(text, i), "beta-code")
      : undefined;
    if (punctuation) {
      out.push(share ? sharedLiteral(punctuation) : literal(punctuation));
      i++;
      continue;
    }

    const hash = text.charCodeAt(i) === HASH ? digitsEnd(text, i + 1) : NO_CODE;
    const hashLetter = hash === NO_CODE
      ? undefined
      : HASH_LETTERS.get(text.slice(i + 1, hash));
    if (hashLetter !== undefined && marks === 0) {
      out.push(grapheme(hashLetter, upper));
      i = hash;
      continue;
    }

    const parenthesis = parenthesisAt(text, i);
    if (parenthesis !== undefined) {
      // After `*`, as before any character that is not a letter, the prefix
      // is kept as text.
      if (upper) {
        out.push(literal(text.slice(start, i)));
        if (starts !== undefined) starts.push(i);
      }
      out.push(share ? sharedLiteral(parenthesis) : literal(parenthesis));
      i += 2;
      continue;
    }

    if (hash !== NO_CODE && !upper) {
      const number = text.slice(i + 1, hash);
      const value = number === ""
        ? DEXIA_KERAIA
        : number === "22"
        ? ARISTERI_KERAIA
        : text.slice(i, hash);
      out.push(share ? sharedLiteral(value) : literal(value));
      i = hash;
      continue;
    }

    if (i >= text.length) {
      if (upper) out.push(literal(text.slice(start, i)));
      break;
    }

    const unit = text.charCodeAt(i);
    const letter = letterOf(unit);

    if (letter === NOT_A_LETTER) {
      const source = codePointAt(text, i);
      if (upper) {
        out.push(literal(text.slice(start, i)));
        if (starts !== undefined) starts.push(i);
      }
      out.push(share ? sharedLiteral(source) : literal(source));
      i += source.length;
      continue;
    }

    i++;
    [i, marks] = consumeMarks(text, i, marks);

    out.push(
      share
        ? sharedGrapheme(letter, upper ? 1 : 0, marks)
        : ownedGrapheme(LETTERS[letter], upper, diacriticsFromMask(marks)),
    );
  }

  if (starts !== undefined) starts.push(text.length);

  readSpacingMarks(text, out, starts);
  classifyCoronides(out);

  return out;
}

function consumeMarks(
  text: string,
  start: number,
  marks = 0,
): [number, number] {
  let index = start;
  while (index < text.length) {
    const unit = text.charCodeAt(index);
    if (unit === PERCENT) {
      const end = digitsEnd(text, index + 1);
      const bit = PERCENT_MARK_BIT.get(text.slice(index + 1, end));
      if (bit === undefined) break;
      marks |= bit;
      index = end;
      continue;
    }
    const bit = unit < 0x80 ? MARK_BIT[unit] : 0;
    if (bit === 0) break;
    marks |= bit;
    index++;
  }
  return [index, marks];
}

function digitsEnd(text: string, start: number): number {
  let index = start;
  while (index < text.length) {
    const unit = text.charCodeAt(index);
    if (unit < DIGIT_0 || unit > DIGIT_9) break;
    index++;
  }
  return index;
}

/**
 * The parenthesis that a TLG bracket code writes at `start`: `[1` or `]1`.
 * The number is every digit after the bracket, so `[10` is another bracket,
 * kept as text like the other bracket codes.
 */
function parenthesisAt(text: string, start: number): "(" | ")" | undefined {
  const unit = text.charCodeAt(start);
  if (unit !== LEFT_BRACKET && unit !== RIGHT_BRACKET) return undefined;
  if (
    text.charCodeAt(start + 1) !== DIGIT_1 ||
    digitsEnd(text, start + 1) !== start + 2
  ) return undefined;
  return unit === LEFT_BRACKET ? "(" : ")";
}
