import { GREEK_MARKS } from "../alphabet.ts";
import { isVowel } from "../context.ts";
import {
  type Diacritic,
  literal,
  type Token,
  withDiacritic,
} from "../model.ts";
import { APOSTROPHE } from "../punctuation.ts";

/**
 * The spacing breathings, psili U+1FBF and dasia U+1FFE, and the spacing
 * diaeresis U+00A8, which their compounds with an accent decompose to
 * (U+1FCD–U+1FCF, U+1FDD–U+1FDF; U+0385, U+1FC1, U+1FED, U+1FEE).
 */
const PSILI = "\u1FBF";
const DASIA = "\u1FFE";
const SPACING_BASES = new Set([0x1fbf, 0x1ffe, 0x00a8]);
/** The spacing signs, decomposed or not. */
const SPACING_SIGN =
  /[\u00A8\u0385\u1FBF\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED\u1FEE\u1FFE]/;

const ACCENTS: ReadonlySet<Diacritic> = new Set([
  "acute",
  "grave",
  "circumflex",
]);

/**
 * Whether a token is a letter: a Greek letter, or one that the format does
 * not read (a Latin `h` with no vowel after it in transliteration). A word
 * goes on after it.
 */
const isLetter = (token: Token | undefined): boolean =>
  token?.kind === "grapheme" ||
  token?.kind === "literal" && /^\p{L}/u.test(token.value);

/** The accent of a literal that is one combining accent, or undefined. */
function accentOf(value: string): Diacritic | undefined {
  const diacritic = GREEK_MARKS.get(value);
  return diacritic !== undefined && ACCENTS.has(diacritic)
    ? diacritic
    : undefined;
}

/**
 * The marks of a spacing breathing, alone or with accents (`῾`, `῎`), or
 * undefined for any other literal.
 */
function breathingMarks(value: string): Diacritic[] | undefined {
  const marks = value.normalize("NFD");
  const breathing: Diacritic | undefined = marks[0] === PSILI
    ? "smooth"
    : marks[0] === DASIA
    ? "rough"
    : undefined;
  if (breathing === undefined) return undefined;
  const all: Diacritic[] = [breathing];
  for (let k = 1; k < marks.length; k++) {
    const accent = accentOf(marks[k]);
    if (accent === undefined) return undefined;
    all.push(accent);
  }
  return all;
}

/**
 * Reads the spacing breathings of a document, whatever format it was read
 * from, which leaves them literals:
 *
 * - a spacing sign and the combining accents after it are one literal, the
 *   sign that Unicode composes (`᾿` and an acute, `῎`);
 * - at the start of a word (not after a letter), spacing breathings, with
 *   their accents, before a capital vowel, or before a capital rho if no
 *   accent came, are the capital's: older typesetting, and the digitizations
 *   of it, writes `῾Ρωμαῖοι` for `Ῥωμαῖοι`;
 * - after a letter, a psili is the apostrophe of elision that it looks like
 *   (`τ᾿ ἐστί`).
 *
 * Elsewhere, the signs stay as they are. `text` is the text read, and
 * `starts`, when given, loses the starts of the tokens joined to the one
 * before them.
 */
export function readSpacingMarks(
  text: string,
  tokens: Token[],
  starts?: number[],
): void {
  if (!SPACING_SIGN.test(text)) return;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (
      token.kind !== "literal" ||
      !SPACING_BASES.has(token.value.charCodeAt(0))
    ) continue;
    let value = token.value;
    let end = i + 1;
    for (; end < tokens.length; end++) {
      const next = tokens[end];
      if (next.kind !== "literal" || accentOf(next.value) === undefined) break;
      const composed = (value + next.value).normalize("NFC");
      if (composed.length !== 1) break;
      value = composed;
    }
    if (end > i + 1) join(tokens, starts, i, end, literal(value));
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind !== "literal") continue;
    let marks = breathingMarks(token.value);
    if (marks === undefined) continue;
    if (isLetter(tokens[i - 1])) {
      if (token.value === PSILI) tokens[i] = literal(APOSTROPHE);
      continue;
    }
    let capital = i + 1;
    for (; capital < tokens.length; capital++) {
      const next = tokens[capital];
      const more = next.kind === "literal"
        ? breathingMarks(next.value)
        : undefined;
      if (more === undefined) break;
      marks = [...marks, ...more];
    }
    const letter = tokens[capital];
    if (
      letter?.kind !== "grapheme" || !letter.uppercase ||
      !(letter.letter === "rho" || isVowel(letter.letter)) ||
      letter.letter === "rho" && marks.some((mark) => ACCENTS.has(mark))
    ) continue;
    let diacritics = letter.diacritics;
    for (const mark of marks) diacritics = withDiacritic(diacritics, mark);
    join(tokens, starts, i, capital + 1, { ...letter, diacritics });
  }
}

/** Replaces the tokens from `start` to `end` with `token`. */
function join(
  tokens: Token[],
  starts: number[] | undefined,
  start: number,
  end: number,
  token: Token,
): void {
  tokens.splice(start, end - start, token);
  starts?.splice(start + 1, end - start - 1);
}
