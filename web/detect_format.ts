import type { Format } from "../src/mod.ts";

const GREEK = /[Ͱ-Ͽἀ-῿]/u;
// A Beta Code mark written against a letter: an accent, a breathing, a
// subscript or a diaeresis after it (`a)/`, `w|`, `i+`), or the capital
// asterisk before it, marks included (`*)a`).
const BETA_CODE = /[A-Za-z][()/\\=|+]|\*[()/\\=|+]*[A-Za-z]/;
// Latin letters with diacritics, precomposed or combining, as a
// transliteration writes them (`ē`, `á`, `ō̃`).
const TRANSLITERATION = /[À-ɏḀ-ỿ]|[A-Za-z][̀-ͯ]/u;
const LATIN = /[A-Za-z]/;

/**
 * Guesses the format of a text from its characters. Greek script makes it
 * Greek. Latin letters with diacritics make it a transliteration, even beside
 * a parenthesis that would read as a breathing, since Beta Code is plain
 * ASCII. Beta Code marks against letters make it Beta Code. Any other Latin
 * letters (`logos`) are taken as a transliteration. Returns `undefined` when
 * the text has no letter at all.
 */
export function detectFormat(text: string): Format | undefined {
  if (GREEK.test(text)) return "greek";
  if (TRANSLITERATION.test(text)) return "transliteration";
  if (BETA_CODE.test(text)) return "beta-code";
  if (LATIN.test(text)) return "transliteration";
  return undefined;
}
