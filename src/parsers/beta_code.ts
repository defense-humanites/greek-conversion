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
  type Letter,
  literal,
  ownedGrapheme,
  type Token,
  withDiacritic,
} from "../model.ts";
import {
  BETA_LIGATURES,
  capitalizeLoneSigns,
  ligatureLength,
  ligatureLetters,
} from "../ligatures.ts";
import { parsePunctuation, TLG_SIGNS } from "../punctuation.ts";
import { codePointAt, codeUnitTable } from "./code_units.ts";
import type { ReadPositions } from "./positions.ts";
import { mayHaveSpacingSigns, readSpacingMarks } from "./spacing_marks.ts";
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
const SMOOTH_BIT = diacriticBit("smooth");

const ASTERISK = 0x2a;
const LESS = 0x3c;
const GREATER = 0x3e;
const HASH = 0x23;
const PERCENT = 0x25;
const LEFT_BRACKET = 0x5b;
const RIGHT_BRACKET = 0x5d;
const DIGIT_0 = 0x30;
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
  // The first token under an overline that `<` opened, or NO_CODE.
  let overline = NO_CODE;
  // The first `>` after the last `<` read, for `opensOverline()`: searched
  // again only past it, so that a text of many `<` is read in linear time.
  let close = NO_CODE - 1;
  // The letters read with a smooth breathing, which alone may bear a
  // coronis (see `classifyCoronides`), and whether a sign for several
  // letters was read.
  const smooth: number[] = [];
  let signs = false;

  for (let i = 0; i < text.length;) {
    if (overline !== NO_CODE && text.charCodeAt(i) === GREATER) {
      // The `>` that closes an overline belongs to the token before it.
      overlineFrom(out, overline);
      overline = NO_CODE;
      i++;
      continue;
    }
    const start = i;
    if (starts !== undefined) starts.push(start);
    if (overline === NO_CODE && text.charCodeAt(i) === LESS) {
      if (close !== NO_CODE && close < i) close = text.indexOf(">", i + 1);
      if (opensOverline(text, i, close)) {
        overline = out.length;
        i++;
      }
    }
    let upper = false;

    if (text.charCodeAt(i) === ASTERISK && i + 1 < text.length) {
      upper = true;
      i++;
    }

    let marks = 0;
    if (upper) [i, marks] = consumeMarks(text, i);

    const hash = text.charCodeAt(i) === HASH ? digitsEnd(text, i + 1) : NO_CODE;
    const hashLetter = hash === NO_CODE
      ? undefined
      : HASH_LETTERS.get(text.slice(i + 1, hash));
    if (
      upper && hashLetter === undefined && signAt(text, i) !== undefined
    ) {
      // Before anything but a letter, `*` is an asterisk, and what follows
      // it is read as if it were not there.
      out.push(literal("*"));
      i = start + 1;
      continue;
    }

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

    // No letter is a sign (tests/reader_tables_test.ts): a letter, the most
    // frequent unit, is not looked up.
    const first = text.charCodeAt(i);
    const punctuation = !upper && i < text.length &&
        !(first < 0x80 && ASCII_LETTER_OF[first] !== NOT_A_LETTER)
      ? parsePunctuation(codePointAt(text, i), "beta-code")
      : undefined;
    if (punctuation) {
      out.push(share ? sharedLiteral(punctuation) : literal(punctuation));
      i++;
      continue;
    }

    if (hashLetter !== undefined) {
      // Marks follow the code, as they follow a letter, or come between `*`
      // and the code of a capital.
      [i, marks] = consumeMarks(text, hash, marks);
      // None of these letters is a vowel, which alone a coronis can be, but
      // every letter with a smooth breathing is noted: the classification
      // must not depend on the list.
      if ((marks & SMOOTH_BIT) !== 0) smooth.push(out.length);
      out.push(
        ownedGrapheme(hashLetter, upper, diacriticsFromMask(marks)),
      );
      continue;
    }

    const ligature = hash === NO_CODE || upper
      ? undefined
      : BETA_LIGATURES.get(text.slice(i + 1, hash));
    if (ligature !== undefined) {
      // Marks follow the code, and belong to its last letter.
      [i, marks] = consumeMarks(text, hash);
      const letters = ligatureLetters(
        ligature,
        diacriticsFromMask(marks),
        text.charCodeAt(i) === ASTERISK,
      );
      if ((marks & SMOOTH_BIT) !== 0) {
        for (let k = 0; k < letters.length; k++) smooth.push(out.length + k);
      }
      out.push(...letters);
      // The letters share the code's span.
      for (let k = 1; k < letters.length; k++) starts?.push(start);
      signs = true;
      continue;
    }

    const sign = upper ? undefined : signAt(text, i);
    if (sign !== undefined) {
      out.push(share ? sharedLiteral(sign.value) : literal(sign.value));
      i = sign.end;
      continue;
    }

    if (i >= text.length && upper) {
      out.push(literal("*"));
      i = start + 1;
      continue;
    }

    const unit = text.charCodeAt(i);
    const letter = letterOf(unit);

    if (letter === NOT_A_LETTER) {
      if (upper) {
        out.push(literal("*"));
        i = start + 1;
        continue;
      }
      const source = codePointAt(text, i);
      out.push(share ? sharedLiteral(source) : literal(source));
      i += source.length;
      continue;
    }

    i++;
    [i, marks] = consumeMarks(text, i, marks);

    if ((marks & SMOOTH_BIT) !== 0) smooth.push(out.length);
    out.push(
      share
        ? sharedGrapheme(letter, upper ? 1 : 0, marks)
        : ownedGrapheme(LETTERS[letter], upper, diacriticsFromMask(marks)),
    );
  }

  if (starts !== undefined) starts.push(text.length);
  if (signs) capitalizeLoneSigns(out);

  if (mayHaveSpacingSigns(text) || text.includes("%")) {
    // Joining the spacing signs to the letters moves the letters noted.
    readSpacingMarks(out, starts);
    classifyCoronides(out);
  } else {
    classifyCoronides(out, smooth);
  }

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
 * Whether the `<` at `start` opens an overline, which the TLG writes over the
 * letters between `<` and `>` (`<QS>`, θ̅ς̅): no digit follows it or its `>`,
 * which would make them codes of another mark-up, and a letter, but no
 * whitespace, stands between them. `end` is the first `>` after it, or
 * NO_CODE.
 */
function opensOverline(text: string, start: number, end: number): boolean {
  if (isDigitAt(text, start + 1)) return false;
  if (end === NO_CODE || isDigitAt(text, end + 1)) return false;
  const between = text.slice(start + 1, end);
  return !/[\s<]/.test(between) && /[a-z]|#\d/i.test(between);
}

const isDigitAt = (text: string, index: number): boolean => {
  const unit = text.charCodeAt(index);
  return unit >= DIGIT_0 && unit <= DIGIT_9;
};

/**
 * Gives an overline to the letters from `start`; to the last letter only of
 * those a sign stands for, which bears the sign's marks (`<#1532>`, `ϗ̅`).
 */
function overlineFrom(out: Token[], start: number): void {
  for (let k = start; k < out.length; k++) {
    const token = out[k];
    if (token.kind !== "grapheme") continue;
    k += ligatureLength(token.glyphVariant) - 1;
    const last = out[k] as typeof token;
    out[k] = {
      ...last,
      diacritics: withDiacritic(last.diacritics, "overline"),
    };
  }
}

/** Whether `code` is a mark after a letter: `%26`, the macron, or `%27`. */
export const isMarkCode = (code: string): boolean =>
  code[0] === "%" && PERCENT_MARK_BIT.has(code.slice(1));

/**
 * Whether the reader keeps `code`, a `%` or `#` and its digits, as text: no
 * letter, keraia, sign, or ligature of the TLG that the library knows.
 */
export function isUnreadCode(code: string): boolean {
  return code !== "#" && code !== "#22" && !TLG_SIGNS.has(code) &&
    !(code[0] === "#" &&
      (HASH_LETTERS.has(code.slice(1)) || BETA_LIGATURES.has(code.slice(1))));
}

/**
 * The sign that a TLG code writes at `start`, and where the code ends: `%`,
 * `#`, `[`, or `]`, and every digit after it (`#12` is not koppa and `2`,
 * and `[10` another bracket than `[1`). `#` alone is the keraia and `#22` the lower
 * keraia. A `%` or `#` code that writes no sign the library knows is kept
 * as text, whole, and a bracket code as the bracket and its digits, read
 * one by one.
 */
function signAt(
  text: string,
  start: number,
): { value: string; end: number } | undefined {
  const unit = text.charCodeAt(start);
  if (
    unit !== PERCENT && unit !== HASH && unit !== LEFT_BRACKET &&
    unit !== RIGHT_BRACKET
  ) return undefined;
  const end = digitsEnd(text, start + 1);
  const code = text.slice(start, end);
  const sign = TLG_SIGNS.get(code);
  if (sign !== undefined) return { value: sign, end };
  if (unit === LEFT_BRACKET || unit === RIGHT_BRACKET) return undefined;
  if (code === "#") return { value: DEXIA_KERAIA, end };
  if (code === "#22") return { value: ARISTERI_KERAIA, end };
  return { value: code, end };
}
