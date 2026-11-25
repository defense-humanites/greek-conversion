import { GREEK_MARKS } from "../alphabet.ts";
import { ligatureLength } from "../ligatures.ts";
import { isVowel, TONOS_SIGN } from "../context.ts";
import {
  type Diacritic,
  type Document,
  type Grapheme,
  type Letter,
  literal,
  type Token,
  withDiacritic,
} from "../model.ts";
import { APOSTROPHE } from "../punctuation.ts";

/**
 * The spacing breathings, psili U+1FBF and dasia U+1FFE, and the spacing
 * diaeresis U+00A8, which their compounds with an accent decompose to
 * (U+1FCD–U+1FCF, U+1FDD–U+1FDF; U+0385, U+1FC1, U+1FED, U+1FEE), and the
 * spacing tonos U+0384, which decomposes to none.
 */
const PSILI = "\u1FBF";
const DASIA = "\u1FFE";
const SPACING_BASES = new Set([0x1fbf, 0x1ffe, 0x00a8]);
/** The first units of the spacing signs, composed or not. */
const SPACING_SIGNS: ReadonlySet<number> = new Set([
  0x00a8,
  0x0384,
  0x0385,
  0x1fbf,
  0x1fc1,
  0x1fcd,
  0x1fce,
  0x1fcf,
  0x1fdd,
  0x1fde,
  0x1fdf,
  0x1fed,
  0x1fee,
  0x1ffe,
]);
/** The spacing signs, decomposed or not. */
const SPACING_SIGN =
  /[\u00A8\u0384\u0385\u1FBF\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED\u1FEE\u1FFE]/;

/**
 * Whether a text may have a spacing sign, so that its reader calls
 * {@link readSpacingMarks}; a Beta Code text may also write one as a code.
 */
export const mayHaveSpacingSigns = (text: string): boolean =>
  SPACING_SIGN.test(text);

/** The vowels that may be long, which alone take a circumflex. */
const LONG_VOWELS: ReadonlySet<Letter> = new Set([
  "alpha",
  "eta",
  "iota",
  "upsilon",
  "omega",
]);

const ACCENTS: ReadonlySet<Diacritic> = new Set([
  "acute",
  "grave",
  "circumflex",
]);

/**
 * Whether a token ends with a letter: a Greek letter, or one that the format
 * does not read (a Latin `h` with no vowel after it in transliteration).
 * With `digits`, a digit counts as well, which a numeral may become in the
 * output. Only the last character of a literal counts, so that a code read
 * as one piece of text (`%811`) and the same text read one character at a
 * time agree.
 */
function endsWithLetter(token: Token | undefined, digits = false): boolean {
  if (token === undefined) return false;
  if (token.kind === "grapheme") return true;
  const last = token.value.at(-1)!;
  return digits ? /[\p{L}\p{N}]/u.test(last) : /\p{L}/u.test(last);
}

/** The accent of a literal that is one combining accent, or undefined. */
function accentOf(value: string): Diacritic | undefined {
  const diacritic = GREEK_MARKS.get(value);
  return diacritic !== undefined && ACCENTS.has(diacritic)
    ? diacritic
    : undefined;
}

/**
 * The marks of a spacing breathing, alone or with accents (`῾`, `῎`), or of
 * the spacing tonos (`΄`), or undefined for any other literal.
 */
function breathingMarks(value: string): Diacritic[] | undefined {
  if (value === TONOS_SIGN) return ["acute"];
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

/** The zero-width non-joiner, which writers put between a sign and a capital. */
export const ZWNJ = "\u200C";

/**
 * Whether the literal at `index` is a spacing breathing that a reader would
 * join to the capital after it, had the capital been able to carry it: the
 * sign of `῾Ἀ`, which {@link readSpacingMarks} keeps apart. A capital
 * written without the mark that kept them apart (`῾A` in transliteration,
 * `῾Α` in monotonic Greek) would take it when read again, so writers put a
 * zero-width non-joiner after such a sign, which keeps it apart in every
 * format.
 */
export function standsApart(document: Document, index: number): boolean {
  const token = document[index];
  const next = document[index + 1];
  if (
    token?.kind !== "literal" ||
    !SPACING_SIGNS.has(token.value.charCodeAt(0)) ||
    next?.kind !== "grapheme" || !next.uppercase ||
    !(next.letter === "rho" || isVowel(next.letter)) ||
    endsWithLetter(document[index - 1], true)
  ) return false;
  const marks = breathingMarks(token.value);
  const bearer = document[index + ligatureLength(next.glyphVariant)];
  // A sign that the letter could not carry even alone (an accent on a rho)
  // never joins it.
  return marks !== undefined && bearer?.kind === "grapheme" &&
    carries(bearer.letter, new Set(marks));
}

/**
 * Reads the spacing breathings of a document, whatever format it was read
 * from, which leaves them literals:
 *
 * - a spacing sign and the combining accents after it are one literal, the
 *   sign that Unicode composes (`᾿` and an acute, `῎`);
 * - at the start of a word (not after a letter or a digit), spacing
 *   breathings, with their accents, before a capital vowel or rho are the
 *   capital's: older typesetting, and the digitizations of it, writes
 *   `῾Ρωμαῖοι` for `Ῥωμαῖοι`, and the typewriter and ISO 8859-7 the tonos
 *   before a capital vowel, `΄Ελληνας` for `Έλληνας`;
 * - after a letter, a psili is the apostrophe of elision that it looks like
 *   (`τ᾿ ἐστί`).
 *
 * A capital takes the signs nearest to it that it can carry: no second
 * breathing or accent, no accent on a rho, no circumflex on a short vowel,
 * no breathing with a diaeresis. The signs before them stay as they are, as
 * do the signs everywhere else (`῾Ἀ` keeps its `῾`). `starts`, when given,
 * loses the starts of the tokens joined to the one after them. A reader
 * calls it only on a text that may have a spacing sign
 * ({@link mayHaveSpacingSigns}). Each pass copies the tokens once, so that
 * the time is linear in the length of the text.
 */
export function readSpacingMarks(tokens: Token[], starts?: number[]): void {
  // The signs with the combining accents after them, as one literal each.
  const signs: Token[] = [];
  const signStarts: number[] | undefined = starts && [];
  for (let i = 0; i < tokens.length;) {
    const token = tokens[i];
    signStarts?.push(starts![i]);
    if (
      token.kind !== "literal" ||
      !SPACING_BASES.has(token.value.charCodeAt(0))
    ) {
      signs.push(token);
      i++;
      continue;
    }
    let value = token.value;
    let end = i + 1;
    for (; end < tokens.length; end++) {
      const next = tokens[end];
      if (next.kind !== "literal" || accentOf(next.value) === undefined) break;
      const composed = (value + next.value).normalize("NFC");
      if (composed.length !== 1) break;
      value = composed;
    }
    signs.push(end > i + 1 ? literal(value) : token);
    i = end;
  }

  const out: Token[] = [];
  const outStarts: number[] | undefined = starts && [];
  const keep = (index: number, token: Token = signs[index]) => {
    out.push(token);
    outStarts?.push(signStarts![index]);
  };
  for (let i = 0; i < signs.length;) {
    const token = signs[i];
    if (token.kind !== "literal" || breathingMarks(token.value) === undefined) {
      keep(i++);
      continue;
    }
    const previous = out.at(-1);
    if (endsWithLetter(previous, true)) {
      keep(
        i,
        token.value === PSILI && endsWithLetter(previous)
          ? literal(APOSTROPHE)
          : token,
      );
      i++;
      continue;
    }
    // The run of signs, and the letter after it.
    let capital = i + 1;
    while (
      capital < signs.length && signs[capital].kind === "literal" &&
      breathingMarks((signs[capital] as { value: string }).value) !== undefined
    ) capital++;
    const from = joinedFrom(signs, i, capital);
    for (let k = i; k < from; k++) keep(k);
    if (from === capital) {
      i = capital;
      continue;
    }
    const letter = signs[capital] as Grapheme;
    const last = capital + ligatureLength(letter.glyphVariant) - 1;
    const bearer = signs[last] as Grapheme;
    let diacritics = bearer.diacritics;
    for (let k = from; k < capital; k++) {
      const value = (signs[k] as { value: string }).value;
      for (const mark of breathingMarks(value)!) {
        diacritics = withDiacritic(diacritics, mark);
      }
    }
    signs[last] = { ...bearer, diacritics };
    // The capital starts where the first sign it takes does.
    keep(from, signs[capital]);
    i = capital + 1;
  }
  if (starts !== undefined) outStarts!.push(signStarts![signs.length]);

  tokens.length = 0;
  for (const token of out) tokens.push(token);
  if (starts !== undefined) {
    starts.length = 0;
    for (const start of outStarts!) starts.push(start);
  }
}

/**
 * The first of the signs from `start` to `capital` that the token at
 * `capital` takes, or `capital` if it takes none: the signs nearest to it,
 * as many as its letter can carry with the marks it has. The marks of a sign
 * that stands for several letters are its last letter's (`᾿Ȣ` is `Οὐ`, as
 * `Ȣ̓` is).
 */
function joinedFrom(signs: Token[], start: number, capital: number): number {
  const letter = signs[capital];
  if (
    letter?.kind !== "grapheme" || !letter.uppercase ||
    !(letter.letter === "rho" || isVowel(letter.letter))
  ) return capital;
  const bearer = signs[capital + ligatureLength(letter.glyphVariant) - 1];
  if (bearer?.kind !== "grapheme") return capital;
  const marks = new Set(bearer.diacritics);
  let from = capital;
  for (let k = capital - 1; k >= start; k--) {
    for (const mark of breathingMarks((signs[k] as { value: string }).value)!) {
      marks.add(mark);
    }
    if (!carries(bearer.letter, marks)) break;
    from = k;
  }
  return from;
}

/**
 * Whether a letter can carry `marks`, by the rules of `validateDocument()`
 * that a breathing or an accent can break: one breathing and one accent at
 * most, an accent on a vowel only (not on a rho), a circumflex on a vowel
 * that may be long, and no breathing with a diaeresis or a coronis.
 */
function carries(letter: Letter, marks: ReadonlySet<Diacritic>): boolean {
  const breathing = marks.has("smooth") || marks.has("rough");
  const accents = (marks.has("acute") ? 1 : 0) +
    (marks.has("grave") ? 1 : 0) + (marks.has("circumflex") ? 1 : 0);
  return !(marks.has("smooth") && marks.has("rough")) && accents <= 1 &&
    (accents === 0 || isVowel(letter)) &&
    (!marks.has("circumflex") || LONG_VOWELS.has(letter)) &&
    !(breathing && (marks.has("diaeresis") || marks.has("coronis")));
}
