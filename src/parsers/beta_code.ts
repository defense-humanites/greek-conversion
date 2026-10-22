import { ALPHABET, BETA_MARKS, BY_BETA } from "../alphabet.ts";
import {
  ARISTERI_KERAIA,
  classifyCoronides,
  DEXIA_KERAIA,
} from "../context.ts";
import {
  diacriticBit,
  diacriticsFromMask,
  type Document,
  grapheme,
  type Letter,
  literal,
  ownedGrapheme,
  type Token,
} from "../model.ts";
import { parsePunctuation } from "../punctuation.ts";
import { codePointAt } from "./code_units.ts";

/**
 * Like the Greek reader, this one works on UTF-16 code units. Every symbol
 * Beta Code gives a meaning to (asterisk, letters, marks, `#` codes,
 * punctuation) is a single BMP code unit, so code-unit indices make the same
 * comparisons as the code-point indices of `Array.from()`; only a character
 * outside the BMP needs two units, and it is always a literal.
 */
const LETTERS = Object.keys(ALPHABET) as Letter[];
const LETTER_INDEX = new Map(LETTERS.map((letter, index) => [letter, index]));
const QUANTITY_LETTERS = new Set(["alpha", "iota", "upsilon"]);
const ACCEPTS_BREVE = LETTERS.map((letter) => QUANTITY_LETTERS.has(letter));

const UNSEEN = -2;
const NOT_A_LETTER = -1;
/** Letter index of each code unit, or NOT_A_LETTER; UNSEEN until classified. */
const LETTER_OF = new Int8Array(0x10000).fill(UNSEEN);

function classify(unit: number): number {
  const letter = BY_BETA.get(String.fromCharCode(unit).toLowerCase());
  return LETTER_OF[unit] = letter === undefined
    ? NOT_A_LETTER
    : LETTER_INDEX.get(letter)!;
}

/** Marks are ASCII. */
const MARK_BIT = new Uint16Array(0x80);
for (const [mark, diacritic] of BETA_MARKS) {
  MARK_BIT[mark.charCodeAt(0)] = diacriticBit(diacritic);
}

const ASTERISK = 0x2a;
const APOSTROPHE = 0x27;
const HASH = 0x23;

export function parseBetaCode(input: string): Document {
  const text = input;
  const out: Token[] = [];

  for (let i = 0; i < text.length;) {
    const start = i;
    let upper = false;

    if (text.charCodeAt(i) === ASTERISK && i + 1 < text.length) {
      upper = true;
      i++;
    }

    let marks = 0;
    if (upper) [i, marks] = consumeMarks(text, i, true);

    if (text[i]?.toLowerCase() === "s" && text[i + 1] === "3") {
      out.push(
        ownedGrapheme(
          "sigma",
          upper,
          diacriticsFromMask(marks),
          "lunate-sigma",
        ),
      );
      i += 2;
      continue;
    }

    const punctuation = !upper && i < text.length
      ? parsePunctuation(codePointAt(text, i), "beta-code")
      : undefined;
    if (punctuation) {
      out.push(literal(punctuation));
      i++;
      continue;
    }

    const additional = additionalCharacter(text, i);
    if (additional && marks === 0) {
      out.push(grapheme(additional.letter, upper));
      i += additional.length;
      continue;
    }

    if (text.charCodeAt(i) === HASH && !upper) {
      if (text[i + 1] === "2" && text[i + 2] === "2") {
        out.push(literal(ARISTERI_KERAIA));
        i += 3;
      } else {
        out.push(literal(DEXIA_KERAIA));
        i++;
      }
      continue;
    }

    if (i >= text.length) {
      if (upper) out.push(literal(text.slice(start, i)));
      break;
    }

    const unit = text.charCodeAt(i);
    let letter = LETTER_OF[unit];
    if (letter === UNSEEN) letter = classify(unit);

    if (letter === NOT_A_LETTER) {
      const source = codePointAt(text, i);
      if (upper) out.push(literal(text.slice(start, i)));
      out.push(literal(source));
      i += source.length;
      continue;
    }

    i++;
    [i, marks] = consumeMarks(text, i, ACCEPTS_BREVE[letter], marks);

    out.push(ownedGrapheme(LETTERS[letter], upper, diacriticsFromMask(marks)));
  }

  classifyCoronides(out);

  return out;
}

function consumeMarks(
  text: string,
  start: number,
  acceptsBreve: boolean,
  marks = 0,
): [number, number] {
  let index = start;
  while (index < text.length) {
    const unit = text.charCodeAt(index);
    if (unit === APOSTROPHE && !acceptsBreve) break;
    const bit = unit < 0x80 ? MARK_BIT[unit] : 0;
    if (bit === 0) break;
    marks |= bit;
    index++;
  }
  return [index, marks];
}

function additionalCharacter(
  text: string,
  start: number,
):
  | { letter: "stigma" | "koppa" | "archaic-koppa" | "sampi"; length: 2 }
  | { letter: "yot"; length: 4 }
  | undefined {
  if (text.charCodeAt(start) !== HASH) return undefined;

  if (
    text[start + 1] === "4" && text[start + 2] === "0" &&
    text[start + 3] === "1"
  ) {
    return { letter: "yot", length: 4 };
  }

  switch (text[start + 1]) {
    case "1":
      return { letter: "koppa", length: 2 };
    case "2":
      if (text[start + 2] === "2") return undefined;
      return { letter: "stigma", length: 2 };
    case "3":
      return { letter: "archaic-koppa", length: 2 };
    case "5":
      return { letter: "sampi", length: 2 };
    default:
      return undefined;
  }
}
