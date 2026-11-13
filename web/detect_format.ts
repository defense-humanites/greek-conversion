import type { Format } from "../src/mod.ts";

const GREEK = /[Ͱ-Ͽἀ-῿]/u;
// A Beta Code mark written against a letter: an accent, a breathing, a
// subscript or a diaeresis after it (`a)/`, `w|`, `i+`), or the capital
// asterisk before it, marks included (`*)a`).
const BETA_CODE = /[A-Za-z][()/\\=|+]|\*[()/\\=|+]*[A-Za-z]/;
// Latin letters with diacritics, precomposed or combining, as a
// transliteration writes them (`ē`, `á`, `ō̃`).
const TRANSLITERATION = /[À-ɏḀ-ỿ]|[A-Za-z][̀-ͯ]/u;

/**
 * Guesses the format of a text from its characters: Greek script, Beta Code
 * marks against letters, or Latin letters with diacritics. Returns
 * `undefined` when the text gives no clue, as plain unaccented Latin letters
 * (`logos`) read the same in Beta Code and in transliteration.
 */
export function detectFormat(text: string): Format | undefined {
  if (GREEK.test(text)) return "greek";
  // Beta Code is plain ASCII: a Latin letter with a diacritic rules it out,
  // even beside a parenthesis that would otherwise read as a breathing.
  if (TRANSLITERATION.test(text)) return "transliteration";
  if (BETA_CODE.test(text)) return "beta-code";
  return undefined;
}
