/**
 * Marks that canonical order puts before the marks a reader knows. NFD sorts
 * the combining marks of a letter by combining class, so a mark the readers
 * do not know comes before the accents and breathings of its letter when its
 * class is lower: the dot below of Leiden's conventions (class 220) before
 * an acute (230), `ά̣` being α, U+0323, U+0301 whichever order it was typed
 * in. Marks of different classes commute: the text is the same with either
 * first. A reader that meets a mark it knows after such a mark therefore
 * reads the text again with its own marks first ({@link knownMarksFirst}):
 * they go to the letter, and the mark it does not know follows the letter as
 * a literal. A mark of the same class, or of class 0, does not commute, and
 * stays where it was typed, the marks after it with it.
 */
import { codePointAt } from "./code_units.ts";

const COMBINING = /^\p{M}$/u;

/**
 * Marks of a letter beyond which the readers look no further: no letter
 * bears so many, and moving marks within a longer run would cost the square
 * of its length.
 */
const MARKS_LOOKED_AT = 32;

/**
 * A quick test before the exact one: no combining mark lies below U+0300,
 * among the Greek and Cyrillic letters (U+0370–U+0482), or from the Greek
 * Extended block to the currency signs (U+1F00–U+20CF).
 */
export const mayBeMark = (unit: number): boolean =>
  unit < 0x0370
    ? unit >= 0x0300
    : unit >= 0x0483 && (unit < 0x1f00 || unit >= 0x20d0);

/** Whether two marks commute, by pairs met; bounded, as marks are few. */
const COMMUTING = new Map<string, boolean>();
const COMMUTING_LIMIT = 256;

/** Whether canonical order sorts two marks, so that either may come first. */
function commute(first: string, second: string): boolean {
  const key = `${first} ${second}`;
  let result = COMMUTING.get(key);
  if (result === undefined) {
    result = `a${first}${second}`.normalize("NFD") ===
      `a${second}${first}`.normalize("NFD");
    if (COMMUTING.size < COMMUTING_LIMIT) COMMUTING.set(key, result);
  }
  return result;
}

/**
 * Whether the marks of `text` from `i` on, which the reader does not know,
 * are followed by one it knows that commutes with each of them.
 */
export function knownMarkAfter(
  text: string,
  i: number,
  known: (mark: string) => boolean,
): boolean {
  const unknown: string[] = [];
  for (let j = i; j < text.length && unknown.length < MARKS_LOOKED_AT;) {
    const mark = codePointAt(text, j);
    if (known(mark)) {
      return unknown.length > 0 &&
        unknown.every((other) => commute(other, mark));
    }
    if (!COMBINING.test(mark)) return false;
    unknown.push(mark);
    j += mark.length;
  }
  return false;
}

/**
 * Where the run of marks the reader does not know that ends at `i` starts:
 * `i` itself when the code point before it is not one.
 */
export function unknownMarksBefore(
  text: string,
  i: number,
  known: (mark: string) => boolean,
): number {
  let start = i;
  for (let count = 0; start > 0 && count < MARKS_LOOKED_AT; count++) {
    const low = text.charCodeAt(start - 1);
    const width = low >= 0xdc00 && low < 0xe000 && start > 1 ? 2 : 1;
    const mark = text.slice(start - width, start);
    if (known(mark) || !COMBINING.test(mark)) break;
    start -= width;
  }
  return start;
}

/** {@link knownMarkAfter} for text split into code points. */
export function knownMarkAfterIn(
  chars: readonly string[],
  i: number,
  known: (mark: string) => boolean,
): boolean {
  return knownMarkAfter(
    chars.slice(i, i + MARKS_LOOKED_AT + 1).join(""),
    0,
    known,
  );
}

/**
 * `text` with the marks a reader knows moved, in each run of marks, before
 * the marks it does not know that they commute with, their order otherwise
 * kept: a text canonically equivalent to `text`. A run longer than any
 * letter bears is left as it is.
 */
export function knownMarksFirst(
  text: string,
  known: (mark: string) => boolean,
): string {
  let out = "";
  for (let i = 0; i < text.length;) {
    const char = codePointAt(text, i);
    i += char.length;
    if (!COMBINING.test(char)) {
      out += char;
      continue;
    }
    const run = [char];
    while (i < text.length) {
      const mark = codePointAt(text, i);
      if (!COMBINING.test(mark)) break;
      run.push(mark);
      i += mark.length;
    }
    for (let k = 1; k < run.length && run.length <= MARKS_LOOKED_AT; k++) {
      const mark = run[k];
      if (!known(mark)) continue;
      let j = k;
      while (j > 0 && !known(run[j - 1]) && commute(run[j - 1], mark)) {
        run[j] = run[j - 1];
        j--;
      }
      run[j] = mark;
    }
    out += run.join("");
  }
  return out;
}
