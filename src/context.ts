import {
  diacriticBit,
  literal,
  sharedMask,
  withDiacritic,
  withoutDiacritic,
} from "./model.ts";
import type {
  Diacritic,
  Document,
  Grapheme,
  Letter,
  Literal,
  Token,
} from "./model.ts";
import { APOSTROPHE } from "./punctuation.ts";

const NASAL_GAMMA_FOLLOWERS = new Set<Letter>([
  "gamma",
  "kappa",
  "xi",
  "chi",
]);

const VOWELS = new Set<Letter>([
  "alpha",
  "epsilon",
  "eta",
  "iota",
  "omicron",
  "upsilon",
  "omega",
]);

const DIPHTHONGS = new Set([
  "alpha-iota",
  "alpha-upsilon",
  "epsilon-iota",
  "epsilon-upsilon",
  "eta-upsilon",
  "omicron-iota",
  "omicron-upsilon",
  "upsilon-iota",
  "omega-upsilon",
]);

/**
 * The second letters that make a diphthong with each first letter, from
 * DIPHTHONGS: looking a pair up this way builds no string per call.
 */
const DIPHTHONG_SECONDS = new Map<string, ReadonlySet<string>>();
for (const pair of DIPHTHONGS) {
  const [first, second] = pair.split("-");
  DIPHTHONG_SECONDS.set(
    first,
    new Set([...DIPHTHONG_SECONDS.get(first) ?? [], second]),
  );
}

const ELISION_MARKS = new Set(["'", "\u02BC", "\u1FBD", APOSTROPHE]);

const WORD_JOIN_CONTROLS = new Set(["\u200C", "\u200D", "\u2060", "\uFEFF"]);

export const DEXIA_KERAIA = "\u02B9";
export const ARISTERI_KERAIA = "\u0375";
/**
 * The spacing tonos U+0384, which the Greek keyboard, having no keraia,
 * types for one (`Β΄`, `ΙΑ΄`), and before a capital for its tonos
 * (`΄Ελληνας`).
 */
export const TONOS_SIGN = "\u0384";

/**
 * The right keraiai that the source typed as a spacing tonos: they are
 * keraiai, and Greek output writes them as typed (`Β΄`). The mark is the
 * token itself, so that no rule needs to read it but the writer of Greek.
 */
const TONOS_KERAIAI = new WeakSet<Token>();

/** A right keraia typed as a spacing tonos. */
export function tonosKeraia(): Literal {
  const token = literal(DEXIA_KERAIA);
  TONOS_KERAIAI.add(token);
  return token;
}

/** Whether a right keraia was typed as a spacing tonos. */
export function isTonosKeraia(token: Token): boolean {
  return TONOS_KERAIAI.has(token);
}

const ELIDED_ASPIRATES = new Map<Letter, Letter>([
  ["pi", "phi"],
  ["tau", "theta"],
  ["kappa", "chi"],
]);

const DENTALS = new Set<Letter>(["tau", "delta", "theta"]);

/**
 * The literals that write a letter a converter keeps as it was, outside its
 * scope (see `createConverter()`), and whether that letter is a capital in
 * the output. They are letters of their word, so that the letters around
 * them keep their place in it: `σο`, with omicron kept, keeps its medial
 * sigma, and a capital among them is among capitals. No rule reads which
 * letter they write.
 */
const KEPT_LETTERS = new WeakMap<Token, boolean>();

/** A literal that writes (part of) a letter kept as it was. */
export function keptLetter(value: string, uppercase: boolean): Literal {
  const token = literal(value);
  KEPT_LETTERS.set(token, uppercase);
  return token;
}

/**
 * Whether a token writes (part of) a letter kept as it was: its text is a
 * spelling in the source format, which no punctuation rule rewrites.
 */
export function isKeptLetter(token: Token): boolean {
  return KEPT_LETTERS.has(token);
}

/** The case of a letter kept as it was, or undefined for another token. */
export function keptLetterCase(token: Token): boolean | undefined {
  return KEPT_LETTERS.get(token);
}

/**
 * A letter of the Latin or the Greek script, the scripts in which a letter
 * can be kept: the spacing breathings, of the Greek script, are no letters.
 */
const LETTER =
  /^(?=[\p{Lu}\p{Ll}\p{Lt}\p{Lo}])[\p{Script=Latin}\p{Script=Greek}]/u;
const CAPITAL = /^[\p{Lu}\p{Lt}]/u;

/**
 * Whether a literal writes a letter that a reader keeps as text: a letter
 * of the other script (a Latin letter in Greek, a Greek one in Beta Code),
 * or one that the reader does not read (`c` in transliteration). A letter of
 * a third script, such as a Chinese character, joins no Greek word. A letter that
 * a converter keeps is written in its source format and reads back as such
 * a literal: as a letter of its word, it keeps the place in it that it had
 * when it was written. The test reads the value, not a mark of the token,
 * so that a document built by hand, copied, or whose literal a caller
 * changed reads as its text. Modifier letters, such as the keraia, are
 * signs. Most literals are spaces and punctuation, below `A`.
 */
function writesLetter(value: string): boolean {
  const unit = value.charCodeAt(0);
  if (unit < 0x41) return false;
  if (unit < 0x80) return (unit | 0x20) >= 0x61 && (unit | 0x20) <= 0x7A;
  return LETTER.test(value);
}

/**
 * Whether a token is a letter of a word: a grapheme, a kept letter, or a
 * literal that writes a letter.
 */
export function isWordLetter(token: Token | undefined): boolean {
  return token !== undefined &&
    (token.kind === "grapheme" || KEPT_LETTERS.has(token) ||
      writesLetter(token.value));
}

/** Whether a letter of a word is a capital, or undefined for another token. */
function capitalLetter(token: Token | undefined): boolean | undefined {
  if (token === undefined) return undefined;
  if (token.kind === "grapheme") return token.uppercase;
  const kept = KEPT_LETTERS.get(token);
  if (kept !== undefined) return kept;
  return writesLetter(token.value) ? CAPITAL.test(token.value) : undefined;
}

export function isWordInitial(document: Document, index: number): boolean {
  let previous = index - 1;
  while (previous >= 0 && isBoundaryTransparent(document[previous])) previous--;
  return previous < 0 || !isWordLetter(document[previous]);
}

export function isWordFinal(document: Document, index: number): boolean {
  let next = index + 1;
  while (next < document.length && isBoundaryTransparent(document[next])) {
    next++;
  }
  return next === document.length || !isWordLetter(document[next]);
}

/**
 * What a writer finds in a document once for all the letters that need it,
 * for one conversion: the apostrophes that close a quotation (see
 * `sigmaEndsWord()`), and whether the tokens of a long run of letters are in
 * a numeral (see `isGreekNumeralContext()`), which each letter would
 * otherwise find by reading the rest of its word.
 */
export interface DocumentContext {
  closingQuotes?: Uint8Array;
  numerals?: Uint8Array;
}

/**
 * Whether the sigma at `index` ends its word, for the choice between `σ` and
 * `ς`. An apostrophe after the sigma stands for an elided vowel, so the sigma
 * stays medial (`ἔχουσ’ ἐγώ`, `σ’ αγαπώ`), unless the apostrophe closes a
 * quotation (‘λόγος’).
 */
export function sigmaEndsWord(
  document: Document,
  index: number,
  context: DocumentContext,
): boolean {
  if (!isWordFinal(document, index)) return false;
  const next = adjacentIndex(document, index, 1);
  if (!isElisionMark(document[next])) return true;
  // A sigma on its own is the elided σε or σου (`σ’ αγαπώ`, and `σ’ το πω`,
  // which Modern Greek elides before a consonant), or the letter quoted (‘σ’),
  // which is written medial.
  if (isWordInitial(document, index)) return false;
  if (precedesVowelWord(document, next)) return false;
  context.closingQuotes ??= closingQuotes(document);
  return context.closingQuotes[next] === 1;
}

const LEFT_QUOTATION_MARK = "‘";
const LINE_BREAKS = new Set([
  "\n",
  "\r",
  "\u000B",
  "\u000C",
  "\u0085",
  "\u2028",
  "\u2029",
]);

/**
 * Marks the apostrophes that close a quotation, which ‘ opened on the same
 * line. An apostrophe after a letter closes it unless a word that begins with
 * a vowel follows: Greek elides only before a vowel, so an apostrophe there is
 * an elision, even inside a quotation (‘οὐκ ἔστ’ ἔτυμος λόγος οὗτος’). An
 * apostrophe after punctuation or a digit cannot be an elision, and closes it
 * too (‘ναί.’, ‘1821’). Only ‘ opens a quotation: an apostrophe before a word
 * may be an aphaeresis (`’στιν`), and a straight quotation mark cannot be told
 * from one. This is one pass, made only when a sigma before an apostrophe
 * needs it; searching back from each such sigma would make a conversion
 * quadratic.
 */
function closingQuotes(document: Document): Uint8Array {
  const closing = new Uint8Array(document.length);
  let open = 0;
  for (let i = 0; i < document.length; i++) {
    const token = document[i];
    if (token.kind !== "literal") continue;
    if (isLineBreak(token)) open = 0;
    else if (token.value === LEFT_QUOTATION_MARK) open++;
    else if (open > 0 && isElisionMark(token)) {
      const previous = adjacentToken(document, i, -1);
      if (!spellsLetter(previous)) {
        if (previous !== undefined && !isWhitespace(previous)) open--;
      } else if (!precedesVowelWord(document, i)) {
        closing[i] = 1;
        open--;
      }
    }
  }
  return closing;
}

/**
 * Whether a word that begins with a vowel follows `index` on the same line,
 * past spaces.
 */
function precedesVowelWord(document: Document, index: number): boolean {
  let next = index + 1;
  while (
    next < document.length &&
    (isWhitespace(document[next]) && !isLineBreak(document[next]) ||
      isBoundaryTransparent(document[next]))
  ) next++;
  const token = document[next];
  return token?.kind === "grapheme" && isVowel(token.letter);
}

function isLineBreak(token: Token | undefined): boolean {
  return token?.kind === "literal" && LINE_BREAKS.has(token.value);
}

/**
 * Whether the letter at `index` stands among capitals: the nearest letter of
 * the same word, after it or else before it, is uppercase. A Latin spelling
 * of several letters for one Greek capital (`TH`, `CH`, `PS`, the `H` of a
 * rough breathing) is then written in full capitals; before lowercase text,
 * only its first letter is, which ISO 843 allows (note 11).
 */
export function isAmongCapitals(document: Document, index: number): boolean {
  return (capitalLetter(adjacentToken(document, index, 1)) ??
    capitalLetter(adjacentToken(document, index, -1))) === true;
}

/**
 * Whether the letter at `index` is a word of one letter that is not an
 * initial: nothing that spells a letter is next to it, and no period follows
 * it. A capital consonant on its own is a letter name, a numeral, a siglum,
 * or a label, and its Latin spelling is written in full capitals (`Θ` →
 * `TH`); followed by a period, it is an abbreviated initial (`Θ.` → `Th.`).
 */
export function standsAlone(document: Document, index: number): boolean {
  const next = adjacentToken(document, index, 1);
  return !spellsLetter(adjacentToken(document, index, -1)) &&
    !spellsLetter(next) &&
    !(next?.kind === "literal" && next.value.startsWith("."));
}

function adjacentToken(
  document: Document,
  index: number,
  step: 1 | -1,
): Token | undefined {
  return document[adjacentIndex(document, index, step)];
}

function adjacentIndex(
  document: Document,
  index: number,
  step: 1 | -1,
): number {
  let position = index + step;
  while (
    position >= 0 && position < document.length &&
    isBoundaryTransparent(document[position])
  ) position += step;
  return position;
}

/**
 * A Greek letter, or a literal letter: a Latin one, or a custom character,
 * which a conversion carries as a private-use scalar. Modifier letters, such
 * as the keraia U+0374, are signs.
 */
function spellsLetter(token: Token | undefined): boolean {
  return token?.kind === "grapheme" ||
    token?.kind === "literal" &&
      /[\p{Lu}\p{Ll}\p{Lt}\p{Lo}\p{Co}]/u.test(token.value);
}

export function isVowel(letter: Letter): boolean {
  return VOWELS.has(letter);
}

/**
 * A quantity sign in transliteration preserves metrical information but does
 * not say whether a word-initial vowel bore a smooth breathing.  In
 * particular, this lets forms such as `ā` round-trip as `ᾱ`, rather than
 * inventing `ἀ̄`.
 */
export function hasQuantity(token: Grapheme): boolean {
  return token.diacritics.has("macron") || token.diacritics.has("breve");
}

/**
 * The length of a run of letters from which {@link isGreekNumeralContext}
 * keeps what it reads: longer than nearly every word, so that reading a
 * short one costs no more than reading it.
 */
const LONG_RUN = 16;

/**
 * Whether the token at `start` is in a numeral: after a left keraia, or in a
 * run of letters that a right keraia ends. The run is read to its end, from
 * `start`: each letter of a long word that asks would read the rest of it,
 * and its letters would take a time that grows with its square. With
 * `context`, what the reading of a long run finds is kept for the tokens it
 * read, so that each token of such a run is read once for the document.
 */
export function isGreekNumeralContext(
  document: Document,
  start: number,
  context?: DocumentContext,
): boolean {
  const previous = document[start - 1];
  if (
    previous?.kind === "literal" && previous.value === ARISTERI_KERAIA
  ) {
    return true;
  }

  // 0: not read yet; 1: the run of the token ends without a keraia; 2: with
  // one.
  let runs = context?.numerals;
  let end = start;
  while (end < document.length && (runs === undefined || runs[end] === 0)) {
    const token = document[end];
    if (!isWordLetter(token) && !isBoundaryTransparent(token)) break;
    end++;
    if (
      runs === undefined && context !== undefined && end - start === LONG_RUN
    ) runs = context.numerals = new Uint8Array(document.length);
  }
  const known = runs === undefined || end === document.length ? 0 : runs[end];
  const numeral = known === 0
    ? end < document.length &&
      (document[end] as Literal).value === DEXIA_KERAIA
    : known === 2;
  runs?.fill(numeral ? 2 : 1, start, Math.min(end + 1, document.length));
  return numeral;
}

/** Marks that, on the first vowel of a pair, signal that it is not a diphthong. */
const HIATUS_MARKS: readonly Diacritic[] = [
  "smooth",
  "rough",
  "acute",
  "grave",
  "circumflex",
];
const HIATUS_MASK = HIATUS_MARKS.reduce(
  (mask, mark) => mask | diacriticBit(mark),
  0,
);

/**
 * Whether a vowel carries a mark that excludes a following diphthong.
 *
 * A breathing or accent written on the first of two vowels that could form a
 * diphthong is the orthographic signal of hiatus or of an iota adscript
 * (`Ἅιδης`, `Ἀίδης`, `ἀίδηλος`, `ἄυλος`); a diphthong carries its marks on
 * the second element. The engine therefore trusts that placement instead of
 * treating it as a misplaced mark.
 */
export function hasHiatusMark(token: Grapheme): boolean {
  const mask = sharedMask(token.diacritics);
  return mask === undefined
    ? HIATUS_MARKS.some((mark) => token.diacritics.has(mark))
    : (mask & HIATUS_MASK) !== 0;
}

/**
 * Whether two vowels form a diphthong when no mark parts them (`αι`, `ευ`).
 */
export function mayFormDiphthong(first: Letter, second: Letter): boolean {
  return DIPHTHONG_SECONDS.get(first)?.has(second) === true;
}

export function isDiphthongAt(document: Document, start: number): boolean {
  const first = document[start];
  const second = document[start + 1];

  return first?.kind === "grapheme" &&
    second?.kind === "grapheme" &&
    DIPHTHONG_SECONDS.get(first.letter)?.has(second.letter) === true &&
    !first.diacritics.has("iota-subscript") &&
    !hasHiatusMark(first) &&
    !second.diacritics.has("diaeresis");
}

/** The three upsilon pairs transliterated with u by ISO 843 and BnF. */
export function isAuEuOuAt(document: Document, start: number): boolean {
  if (!isDiphthongAt(document, start)) return false;
  const first = document[start];
  return first?.kind === "grapheme" &&
    (first.letter === "alpha" || first.letter === "epsilon" ||
      first.letter === "omicron");
}

/**
 * The three diphthongs whose upsilon ISO 843 Type 2 writes `v` or `f`: `αυ`,
 * `ευ`, `ηυ`. Like every diphthong, they exclude a breathing or an accent on
 * the first vowel and a diaeresis on the upsilon (note 9).
 */
export function isVowelUpsilonAt(document: Document, start: number): boolean {
  if (!isDiphthongAt(document, start)) return false;
  const first = document[start];
  return first?.kind === "grapheme" &&
    (first.letter === "alpha" || first.letter === "epsilon" ||
      first.letter === "eta");
}

/**
 * Letters after which ISO 843 Type 2 writes the upsilon of `αυ`, `ευ`, `ηυ`
 * as `f` (note 4); the archaic letters follow their sound (stigma `στ`,
 * koppa `κ`, sampi `σσ`). Any other letter, vowels included, gives `v`
 * (note 3); the end of the word gives `f`.
 */
const VOICELESS = new Set<Letter>([
  "theta",
  "kappa",
  "xi",
  "pi",
  "sigma",
  "tau",
  "phi",
  "chi",
  "psi",
  "stigma",
  "koppa",
  "archaic-koppa",
  "sampi",
]);

/**
 * Whether the upsilon at `index` is followed by a voiced sound in its word. A
 * coronis on it, written as an apostrophe and read back (`Kev’géneian`),
 * leaves the letter after it in the word, as the coronis did.
 */
export function precedesVoicedSound(
  document: Document,
  index: number,
): boolean {
  let next = index + 1;
  if (followsCoronisApostrophe(document, index + 2)) next++;
  else if (isWordFinal(document, index)) return false;
  while (isBoundaryTransparent(document[next])) next++;
  const token = document[next];
  return token?.kind === "grapheme" && !VOICELESS.has(token.letter);
}

export function breathingTarget(document: Document, start: number): number {
  return isDiphthongAt(document, start) ? start + 1 : start;
}

/**
 * Marks the first vowel of every diphthong whose second vowel carries a rough
 * breathing, anywhere in a word: `starts[i]` is 1 when such a diphthong begins
 * at `i`. Transliteration writes the `h` before the whole diphthong inside a
 * word as at its start (`χοἱ` → `chhoi`, like `οἱ` → `hoi`): "the h precedes
 * the romanized vowel or diphthong" (ALA-LC). One pass over the document, so
 * that the encoder reads a flag per token.
 */
export function roughDiphthongStarts(document: Document): Uint8Array {
  const starts = new Uint8Array(document.length);
  for (let i = 1; i < document.length; i++) {
    const token = document[i];
    // A diphthong ends in iota or upsilon: test the letter, which is cheap,
    // before the marks.
    // Vowels pair from the left: a vowel that ends a diphthong does not
    // begin another (`αυἱ` is αυ and ἱ).
    if (
      token.kind === "grapheme" &&
      (token.letter === "iota" || token.letter === "upsilon") &&
      token.diacritics.has("rough") && isDiphthongAt(document, i - 1) &&
      !isDiphthongAt(document, i - 2)
    ) starts[i - 1] = 1;
  }
  return starts;
}

/**
 * The first vowel of the rough diphthong that the token at `index` belongs
 * to, if any, from the flags of {@link roughDiphthongStarts}.
 */
export function roughDiphthongStart(
  starts: Uint8Array,
  index: number,
): number | undefined {
  if (starts[index] === 1) return index;
  return index > 0 && starts[index - 1] === 1 ? index - 1 : undefined;
}

export function initialBreathingStart(
  document: Document,
  index: number,
): number | undefined {
  if (
    isWordInitial(document, index) &&
    document[index].kind === "grapheme" &&
    isVowel(document[index].letter)
  ) {
    return index;
  }

  const previous = index - 1;
  if (
    previous >= 0 &&
    isWordInitial(document, previous) &&
    breathingTarget(document, previous) === index
  ) {
    return previous;
  }

  return undefined;
}

/**
 * Classifies the shared smooth mark as a coronis on an internal vowel. A
 * reader that notes the indices of the letters it reads with a smooth
 * breathing passes them as `candidates`, in order, so that only those are
 * visited; any other token is left as it is anyway.
 */
export function classifyCoronides(
  tokens: Token[],
  candidates?: readonly number[],
): void {
  if (candidates === undefined) {
    for (let i = 0; i < tokens.length; i++) classifyCoronis(tokens, i);
  } else {
    for (let k = 0; k < candidates.length; k++) {
      classifyCoronis(tokens, candidates[k]);
    }
  }
}

function classifyCoronis(tokens: Token[], i: number): void {
  const token = tokens[i];
  if (
    token.kind === "grapheme" &&
    token.diacritics.has("smooth") &&
    isVowel(token.letter) &&
    initialBreathingStart(tokens, i) === undefined
  ) {
    // Replaced, not modified: the token may be shared by other occurrences.
    tokens[i] = {
      ...token,
      diacritics: withDiacritic(
        withoutDiacritic(token.diacritics, "smooth"),
        "coronis",
      ),
    };
  }
}

/**
 * Whether the gamma at `index` is nasal: before gamma, kappa, xi, or chi, or
 * not before kappa when `exceptKappa` is set (ISO 843 Type 2 writes `γκ` as
 * `gk`).
 */
export function isNasalGamma(
  document: Document,
  index: number,
  exceptKappa = false,
): boolean {
  const token = document[index];
  const next = document[index + 1];

  return token.kind === "grapheme" &&
    token.letter === "gamma" &&
    next?.kind === "grapheme" &&
    followsNasalGamma(next.letter, exceptKappa);
}

export function followsNasalGamma(
  letter: Letter,
  exceptKappa = false,
): boolean {
  return NASAL_GAMMA_FOLLOWERS.has(letter) &&
    !(exceptKappa && letter === "kappa");
}

/**
 * Returns the aspirated spelling of an elided final mute before a word with a
 * rough breathing, which Greek output writes under `elidedStop: "aspirate"`.
 * The apostrophe itself and any intervening whitespace remain literal tokens,
 * so the transformation is confined to Greek output.
 */
export function elidedAspirate(
  document: Document,
  index: number,
): Letter | undefined {
  const token = document[index];
  if (token.kind !== "grapheme") return undefined;

  const aspirate = ELIDED_ASPIRATES.get(token.letter);
  if (!aspirate || !isElisionMark(document[index + 1])) return undefined;

  let nextIndex = index + 2;
  while (isWhitespace(document[nextIndex])) nextIndex++;

  const next = document[nextIndex];
  if (next?.kind !== "grapheme") return undefined;

  const targetIndex = isVowel(next.letter)
    ? breathingTarget(document, nextIndex)
    : nextIndex;
  const target = document[targetIndex];

  return target?.kind === "grapheme" && target.diacritics.has("rough")
    ? aspirate
    : undefined;
}

/**
 * Whether the letter at `index` follows a vowel and an apostrophe with no
 * space between them: an apostrophe inside a word, or a coronis written as
 * one (`coronis: "apostrophe"`) where it reads back as punctuation, after a
 * vowel group with a breathing. An elision apostrophe follows a consonant,
 * and a space follows it. The letter stays inside the word for the rules that
 * tell the start of a word from its middle, as it would after the coronis:
 * `τού’μπαλιν` must not be written `toúʼbalin`.
 */
export function followsCoronisApostrophe(
  document: Document,
  index: number,
): boolean {
  const mark = document[index - 1];
  const vowel = document[index - 2];
  return isElisionMark(mark) && vowel?.kind === "grapheme" &&
    isVowel(vowel.letter);
}

/**
 * Whether the letter at `index` follows a letter and an apostrophe with no
 * space between them, for title case (see followsCoronisApostrophe()).
 */
export function followsApostropheInWord(
  document: Document,
  index: number,
): boolean {
  return isElisionMark(document[index - 1]) &&
    document[index - 2]?.kind === "grapheme";
}

/** Whether a literal is an apostrophe: elision, or a coronis written so. */
export function isElisionMark(token: Token | undefined): boolean {
  return token?.kind === "literal" && ELISION_MARKS.has(token.value);
}

function isWhitespace(token: Token | undefined): boolean {
  return token?.kind === "literal" && /^\p{White_Space}$/u.test(token.value);
}

/** Marks and explicit join controls do not interrupt an orthographic word. */
/** Whether a literal is a combining mark or word-join control inside a word. */
export function isBoundaryTransparent(token: Token | undefined): boolean {
  if (token?.kind !== "literal") return false;
  // Most literals are spaces and punctuation: no combining mark or join
  // control lies below U+0300, so a one-unit literal there needs no regex.
  if (token.value.length === 1 && token.value.charCodeAt(0) < 0x0300) {
    return false;
  }
  return /^\p{M}$/u.test(token.value) || WORD_JOIN_CONTROLS.has(token.value);
}

/**
 * Returns the sigma that replaces a dental and the following sigma when
 * `dentalSigma: "assimilate"` deletes the dental.
 *
 * Only this opt-in assimilation merges two letters. Greek writes `κσ` and
 * `πσ` where a prefix meets a stem (`ἔκστασις`), so a labial or velar before
 * sigma is never contracted to `ψ` or `ξ`: that would alter correct source
 * text, and the parsers already read `ψ` and `ξ` from their own spellings.
 */
export function assimilatedDental(
  document: Document,
  index: number,
  context?: DocumentContext,
): Pick<Grapheme, "uppercase" | "glyphVariant"> | undefined {
  const dental = document[index];
  const sigma = document[index + 1];

  if (
    dental.kind !== "grapheme" ||
    !DENTALS.has(dental.letter) ||
    dental.diacritics.size > 0 ||
    sigma?.kind !== "grapheme" ||
    sigma.letter !== "sigma" ||
    sigma.diacritics.size > 0 ||
    sigma.uppercase && !dental.uppercase ||
    isGreekNumeralContext(document, index, context)
  ) {
    return undefined;
  }

  return {
    uppercase: dental.uppercase,
    ...(sigma.glyphVariant === undefined
      ? {}
      : { glyphVariant: sigma.glyphVariant }),
  };
}
