import type { Document, Grapheme, Letter, Token } from "./model.ts";
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

const ELISION_MARKS = new Set(["'", "\u02BC", "\u1FBD", APOSTROPHE]);

const WORD_JOIN_CONTROLS = new Set(["\u200C", "\u200D", "\u2060", "\uFEFF"]);

export const DEXIA_KERAIA = "\u02B9";
export const ARISTERI_KERAIA = "\u0375";

const ELIDED_ASPIRATES = new Map<Letter, Letter>([
  ["pi", "phi"],
  ["tau", "theta"],
  ["kappa", "chi"],
]);

const SIGMA_CONTRACTIONS = new Map<Letter, Letter>([
  ["pi", "psi"],
  ["beta", "psi"],
  ["phi", "psi"],
  ["kappa", "xi"],
  ["gamma", "xi"],
  ["chi", "xi"],
]);

const DENTALS = new Set<Letter>(["tau", "delta", "theta"]);

export function isWordInitial(document: Document, index: number): boolean {
  let previous = index - 1;
  while (previous >= 0 && isBoundaryTransparent(document[previous])) previous--;
  return previous < 0 || document[previous].kind === "literal";
}

export function isWordFinal(document: Document, index: number): boolean {
  let next = index + 1;
  while (next < document.length && isBoundaryTransparent(document[next])) {
    next++;
  }
  return next === document.length || document[next].kind === "literal";
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

export function isGreekNumeralContext(
  document: Document,
  start: number,
): boolean {
  const previous = document[start - 1];
  if (
    previous?.kind === "literal" && previous.value === ARISTERI_KERAIA
  ) {
    return true;
  }

  for (let i = start; i < document.length; i++) {
    const token = document[i];
    if (token.kind === "grapheme" || isBoundaryTransparent(token)) continue;
    return token.value === DEXIA_KERAIA;
  }

  return false;
}

export function isDiphthongAt(document: Document, start: number): boolean {
  const first = document[start];
  const second = document[start + 1];

  return first?.kind === "grapheme" &&
    second?.kind === "grapheme" &&
    DIPHTHONGS.has(`${first.letter}-${second.letter}`) &&
    !first.diacritics.has("iota-subscript") &&
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

export function breathingTarget(document: Document, start: number): number {
  return isDiphthongAt(document, start) ? start + 1 : start;
}

/** Moves an initial breathing supplied on the first half of a diphthong. */
export function normalizeInitialDiphthongBreathings(tokens: Token[]): void {
  for (let start = 0; start < tokens.length; start++) {
    const first = tokens[start];
    if (
      first.kind !== "grapheme" ||
      !isWordInitial(tokens, start) ||
      !isVowel(first.letter)
    ) {
      continue;
    }

    const targetIndex = breathingTarget(tokens, start);
    if (targetIndex === start) continue;

    const target = tokens[targetIndex];
    if (target.kind !== "grapheme") continue;

    for (const breathing of ["smooth", "rough"] as const) {
      if (
        first.diacritics.has(breathing) &&
        !target.diacritics.has("smooth") &&
        !target.diacritics.has("rough")
      ) {
        first.diacritics.delete(breathing);
        target.diacritics.add(breathing);
      }
    }
  }
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

/** Classifies the shared smooth mark as a coronis on an internal vowel. */
export function classifyCoronides(tokens: Token[]): void {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (
      token.kind === "grapheme" &&
      isVowel(token.letter) &&
      token.diacritics.has("smooth") &&
      initialBreathingStart(tokens, i) === undefined
    ) {
      token.diacritics.delete("smooth");
      token.diacritics.add("coronis");
    }
  }
}

export function isNasalGamma(document: Document, index: number): boolean {
  const token = document[index];
  const next = document[index + 1];

  return token.kind === "grapheme" &&
    token.letter === "gamma" &&
    next?.kind === "grapheme" &&
    NASAL_GAMMA_FOLLOWERS.has(next.letter);
}

export function followsNasalGamma(letter: Letter): boolean {
  return NASAL_GAMMA_FOLLOWERS.has(letter);
}

/**
 * Returns the aspirated spelling of an elided final mute before a word with a
 * rough breathing. The apostrophe itself and any intervening whitespace remain
 * literal tokens, so the transformation is confined to Greek output.
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

function isElisionMark(token: Token | undefined): boolean {
  return token?.kind === "literal" && ELISION_MARKS.has(token.value);
}

function isWhitespace(token: Token | undefined): boolean {
  return token?.kind === "literal" && /^\p{White_Space}$/u.test(token.value);
}

/** Marks and explicit join controls do not interrupt an orthographic word. */
function isBoundaryTransparent(token: Token | undefined): boolean {
  return token?.kind === "literal" &&
    (/^\p{M}$/u.test(token.value) || WORD_JOIN_CONTROLS.has(token.value));
}

export function contractedSigma(
  document: Document,
  index: number,
  assimilateDentals = false,
): Pick<Grapheme, "letter" | "uppercase" | "glyphVariant"> | undefined {
  const mute = document[index];
  const sigma = document[index + 1];

  if (
    mute.kind !== "grapheme" ||
    mute.diacritics.size > 0 ||
    sigma?.kind !== "grapheme" ||
    sigma.letter !== "sigma" ||
    sigma.diacritics.size > 0
  ) {
    return undefined;
  }

  if (isGreekNumeralContext(document, index)) return undefined;

  const letter = SIGMA_CONTRACTIONS.get(mute.letter) ??
    (assimilateDentals && DENTALS.has(mute.letter) ? "sigma" : undefined);
  if (!letter || sigma.uppercase && !mute.uppercase) return undefined;

  return {
    letter,
    uppercase: mute.uppercase,
    ...(letter === "sigma" && sigma.glyphVariant !== undefined
      ? { glyphVariant: sigma.glyphVariant }
      : {}),
  };
}
