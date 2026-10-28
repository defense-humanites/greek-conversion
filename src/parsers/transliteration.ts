import { ALPHABET, GREEK_MARKS } from "../alphabet.ts";
import { infersSmoothBreathing } from "../diacritics.ts";
import {
  breathingTarget,
  followsNasalGamma,
  hasQuantity,
  isAuEuOuAt,
  isDiphthongAt,
  isGreekNumeralContext,
  isVowel,
  isVowelUpsilonAt,
  isWordInitial,
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
  withDiacritic,
  withoutDiacritic,
} from "../model.ts";
import type { ConversionOptions } from "../options.ts";
import { parsePunctuation } from "../punctuation.ts";
import { Trie } from "../trie.ts";
import { codeUnitTable } from "./code_units.ts";
import type { ReadPositions } from "./positions.ts";

const CANONICAL_ENTRIES = [
  ...Object.entries(ALPHABET)
    .filter(([letter]) =>
      letter !== "eta" &&
      letter !== "omega" &&
      letter !== "stigma" &&
      letter !== "sampi" &&
      letter !== "archaic-koppa"
    )
    .map(([letter, forms]) =>
      [
        forms.tr.normalize("NFD").replaceAll(/\p{M}/gu, ""),
        letter as Letter,
      ] as const
    ),
  ["y", "upsilon"] as const,
] as const;

const TRIE = new Trie<Letter>(CANONICAL_ENTRIES);

/**
 * `toLowerCase()` of each one-unit character below U+0400, memoized: the
 * reader compares the lowercase form of every character several times, and
 * transliteration lives in that range (Latin, combining marks). Other
 * characters are lowercased directly. The memo is preallocated and bounded:
 * an empty array indexed by a high code unit would switch to slow dictionary
 * elements for the rest of the process.
 */
const LOWER_END = 0x400;
const LOWER: (string | undefined)[] = new Array(LOWER_END).fill(undefined);
function lowercase(char: string): string {
  const unit = char.charCodeAt(0);
  return char.length === 1 && unit < LOWER_END
    ? LOWER[unit] ??= char.toLowerCase()
    : char.toLowerCase();
}

/**
 * Bit of each combining mark the reader accepts, by code unit. They all lie
 * in U+0300–U+036F: the Greek marks, plus the tilde as a circumflex and the
 * cedilla as an iota subscript.
 */
const MARKS_START = 0x0300;
const MARK_BIT = codeUnitTable(MARKS_START, 0x70, [
  ...[...GREEK_MARKS].map(([mark, diacritic]) =>
    [mark, diacriticBit(diacritic)] as const
  ),
  ["\u0303", diacriticBit("circumflex")],
  ["\u0342", diacriticBit("circumflex")],
  ["\u0327", diacriticBit("iota-subscript")],
]);

function markBit(char: string): number {
  if (char.length !== 1) return 0;
  const unit = char.charCodeAt(0);
  return unit >= MARKS_START && unit < MARKS_START + 0x70
    ? MARK_BIT[unit - MARKS_START]
    : 0;
}

const ROUGH = diacriticBit("rough");
const CIRCUMFLEX = diacriticBit("circumflex");
const IOTA_SUBSCRIPT = diacriticBit("iota-subscript");
const MACRON = diacriticBit("macron");
const DIAERESIS = diacriticBit("diaeresis");

/**
 * Reads transliteration. With `positions`, records where each token starts
 * in the text read (see `positions.ts`).
 */
export function parseTransliteration(
  input: string,
  options: ConversionOptions = {},
  positions?: ReadPositions,
): Document {
  const text = input.normalize("NFD");
  const chars = prioritizeEtaMark(Array.from(text), options);
  // Starts are recorded as indices in `chars` and converted to code units at
  // the end. prioritizeEtaMark() only reorders the marks of a letter, which
  // are one unit each, so the offset of a character in `text` is its offset
  // in `chars` joined.
  const starts = positions?.starts;
  // Lowercased once, after prioritizeEtaMark() has reordered the marks.
  // Built with a loop rather than `chars.map()`: once this function is
  // optimized, V8's inlined `map` returns arrays of a different elements kind
  // from the builtin's, and the reads of `lowered` below then deoptimize the
  // whole function every few hundred calls.
  const lowered: string[] = [];
  for (let k = 0; k < chars.length; k++) lowered.push(lowercase(chars[k]));
  const out: Token[] = [];
  const trie = transliterationTrie(options);
  const contextualY = new Set<number>();
  // Upsilons read from a contextual `y` whose separation from the preceding
  // vowel is carried by a breathing on that vowel rather than by a diaeresis.
  const separatedByBreathing = new Set<number>();
  const transliteration = options.transliteration;
  // `b` is μπ only where it cannot be beta; `d̲` is never delta.
  const digraphB = transliteration?.muPi !== undefined &&
    transliteration.muPi !== "mp" && transliteration.beta === "v";
  const digraphD = transliteration?.nuTau === "d-underline-initial";
  const lunateC = transliteration?.lunateSigma === "c";
  const systematicRho = transliteration?.rho === "systematic";
  const circumflexAccent = transliteration?.circumflexAccent === "circumflex";
  // Without a length mark, e and o are epsilon and omicron, and a circumflex
  // on them is an accent: one that only the long vowel can bear.
  const omitLength = transliteration?.longVowels === "omit";
  const upsilon = transliteration?.upsilon;

  for (let i = 0; i < chars.length;) {
    let rough = false;
    let roughUppercase = false;
    if (starts !== undefined) starts.push(i);

    if (digraphB && lowered[i] === "b") {
      const uppercase = chars[i] !== lowered[i];
      out.push(
        grapheme("mu", uppercase),
        grapheme("pi", uppercase && capitalFollows(chars, lowered, i + 1)),
      );
      // Two letters from one character: the same start, so that they share
      // its span.
      if (starts !== undefined) starts.push(i);
      i++;
      continue;
    }

    if (digraphD && lowered[i] === "d" && chars[i + 1] === "\u0332") {
      const uppercase = chars[i] !== lowered[i];
      out.push(
        grapheme("nu", uppercase),
        grapheme("tau", uppercase && capitalFollows(chars, lowered, i + 2)),
      );
      if (starts !== undefined) starts.push(i);
      i += 2;
      continue;
    }

    if (
      lowered[i] === "h" && startsVowel(lowered, i + 1, trie)
    ) {
      rough = true;
      roughUppercase = chars[i] !== lowered[i];
      i++;
    }

    const archaic = markedArchaicLetter(chars, lowered, i);
    const ordinary = trie.longest(lowered, i);
    const lunateSigma = !archaic && !ordinary && lunateC && lowered[i] === "c";
    const match = archaic ?? ordinary ??
      (lunateSigma ? { value: "sigma" as const, length: 1 } : undefined);

    if (!match) {
      if (chars[i] === "\u1FBD") {
        const previous = out.at(-1);
        if (
          previous?.kind === "grapheme" && isVowel(previous.letter)
        ) {
          previous.diacritics = withDiacritic(previous.diacritics, "coronis");
          // No token: the coronis joins the previous one's span.
          if (starts !== undefined) starts.pop();
          i++;
          continue;
        }
      }

      if (rough) {
        out.push(literal(roughUppercase ? "H" : "h"));
        if (starts !== undefined) starts.push(i);
      }
      out.push(
        literal(parsePunctuation(chars[i], "transliteration") ?? chars[i]),
      );
      i++;
      continue;
    }

    const source = chars[i];
    const sourceLower = lowered[i];

    i += match.length;

    if (match.value === "rho" && lowered[i] === "h") {
      const previous = out.at(-1);

      if (
        !systematicRho &&
        (previous?.kind !== "grapheme" || previous.letter !== "rho")
      ) {
        rough = true;
      }

      i++;
    }

    let marks = rough ? ROUGH : 0;
    let structuralCircumflex = false;

    while (i < chars.length) {
      if (
        !omitLength &&
        chars[i] === "\u0302" &&
        (match.value === "epsilon" || match.value === "omicron") &&
        !((marks & MACRON) !== 0 && circumflexAccent)
      ) {
        structuralCircumflex = true;
        i++;
        continue;
      }
      const bit = markBit(chars[i]);
      if (bit === 0) break;
      marks |= bit;
      i++;
    }

    let letter = resolveLongVowel(
      match.value,
      (marks & MACRON) !== 0,
      structuralCircumflex,
    );
    // The macron of `ē` and `ō` makes the letter, not a mark.
    if (letter !== match.value && !structuralCircumflex) marks &= ~MACRON;

    if (omitLength && (marks & IOTA_SUBSCRIPT) !== 0) {
      // Only alpha, eta, and omega bear an iota subscript.
      if (letter === "omicron") letter = "omega";
      else if (
        letter === (transliteration?.eta === "i" ? "iota" : "epsilon")
      ) letter = "eta";
    }
    if (omitLength && (marks & CIRCUMFLEX) !== 0) {
      if (letter === "omicron") letter = "omega";
      else if (letter === "epsilon" && transliteration?.eta !== "i") {
        letter = "eta";
      } else if (
        letter === "epsilon" && upsilon === "y-with-ou-v-f" &&
        (lowered[i] === "v" || lowered[i] === "f")
      ) {
        // `εῦ`, whose accent ISO 843 Type 2 moves onto the e (note 10).
        out.push(
          ownedGrapheme(
            letter,
            roughUppercase || source !== sourceLower,
            diacriticsFromMask(marks & ~CIRCUMFLEX),
          ),
          ownedGrapheme(
            "upsilon",
            chars[i] !== lowered[i],
            diacriticsFromMask(CIRCUMFLEX),
          ),
        );
        if (starts !== undefined) starts.push(i);
        i++;
        continue;
      }
    }

    if (
      letter === "upsilon" &&
      (upsilon === "y-with-diphthong-u" || upsilon === "y-with-au-eu-ou" ||
        upsilon === "y-with-ou-v-f") &&
      sourceLower === "y"
    ) {
      const pair = latinPair(
        out.at(-1),
        grapheme(letter, false, diacriticsFromMask(marks)),
      );
      // Whether the pair, as a diphthong, would be written otherwise than
      // with y (u, or v and f under ISO 843 Type 2).
      const wouldRenderU = upsilon === "y-with-diphthong-u"
        ? isDiphthongAt(pair, 0)
        : isAuEuOuAt(pair, 0) ||
          upsilon === "y-with-ou-v-f" && isVowelUpsilonAt(pair, 0);
      if (wouldRenderU) {
        // `y` says the pair is not a diphthong. Greek marks such a hiatus by
        // a breathing on the first vowel when the word starts there (ἀυτμή,
        // ἁυ); the diaeresis is the fallback where no breathing will sit.
        const first = out[out.length - 1];
        const breathingWillSit = first.kind === "grapheme" &&
          isWordInitial(out, out.length - 1) &&
          (first.diacritics.has("rough") || infersSmoothBreathing(options));
        if (breathingWillSit) separatedByBreathing.add(out.length);
        else marks |= DIAERESIS;
      }
    }

    if (
      letter === "iota" &&
      upsilon === "y-with-diphthong-u" &&
      contextualY.has(out.length - 1)
    ) {
      const pair = latinPair(
        out.at(-1),
        grapheme(letter, false, diacriticsFromMask(marks)),
      );
      if (isDiphthongAt(pair, 0)) {
        marks |= DIAERESIS;
      }
    }

    if (
      letter === "upsilon" &&
      upsilon === "y-with-diphthong-u" &&
      sourceLower === "y"
    ) {
      contextualY.add(out.length);
    }

    out.push(ownedGrapheme(
      letter,
      roughUppercase || source !== sourceLower,
      diacriticsFromMask(marks),
      lunateSigma ? "lunate-sigma" : undefined,
    ));
  }

  if (positions !== undefined && starts !== undefined) {
    positions.text = text;
    starts.push(chars.length);
    // Character indices to code-unit offsets.
    const offsets = new Uint32Array(chars.length + 1);
    let offset = 0;
    for (let k = 0; k < chars.length; k++) {
      offsets[k] = offset;
      offset += chars[k].length;
    }
    offsets[chars.length] = offset;
    for (let k = 0; k < starts.length; k++) starts[k] = offsets[starts[k]];
  }

  const nasalGamma = options.transliteration?.nasalGamma;
  if (nasalGamma !== "literal") {
    inferNasalGammas(out, nasalGamma === "nasal-except-kappa");
  }
  inferInitialBreathings(out, options, separatedByBreathing);

  return out;
}

/**
 * Under `eta: "i"`, the length mark makes the letter: `ī` (or `î` under
 * `longVowels: "circumflex"`) is eta, not iota with a mark. The mark is moved
 * to the front of the letter's marks so that the reader matches it with the
 * `i` as one letter, whatever the order of marks in the input.
 */
function prioritizeEtaMark(
  input: string[],
  options: ConversionOptions,
): string[] {
  const mark = etaMark(options);
  if (options.transliteration?.eta !== "i" || mark === undefined) return input;

  const chars = [...input];
  for (let start = 0; start < chars.length; start++) {
    if (lowercase(chars[start]) !== "i") continue;

    let end = start + 1;
    while (end < chars.length && /^\p{M}$/u.test(chars[end])) end++;

    // Look for the mark inside this letter's marks only: scanning the rest
    // of the text at every `i` made parsing quadratic.
    let found = start + 1;
    while (found < end && chars[found] !== mark) found++;
    if (found < end && found > start + 1) {
      // Move the mark to the front of the marks, shifting the others right.
      for (let j = found; j > start + 1; j--) chars[j] = chars[j - 1];
      chars[start + 1] = mark;
    }
    start = end - 1;
  }

  return chars;
}

function transliterationTrie(options: ConversionOptions): Trie<Letter> {
  const variants: Array<readonly [string, Letter]> = [];
  const transliteration = options.transliteration;

  if (transliteration?.beta === "v") variants.push(["v", "beta"]);
  const mark = etaMark(options);
  if (transliteration?.eta === "i" && mark !== undefined) {
    variants.push([`i${mark}`, "eta"]);
  }
  if (transliteration?.xi === "ks") variants.push(["ks", "xi"]);
  if (transliteration?.phi === "f") variants.push(["f", "phi"]);
  if (transliteration?.chi === "kh") variants.push(["kh", "chi"]);

  return variants.length === 0
    ? TRIE
    : new Trie<Letter>([...CANONICAL_ENTRIES, ...variants]);
}

/** The combining mark that shows the length of eta and omega, if any. */
function etaMark(
  options: ConversionOptions,
): "\u0302" | "\u0304" | undefined {
  switch (options.transliteration?.longVowels) {
    case "circumflex":
      return "\u0302";
    case "omit":
      return undefined;
    default:
      return "\u0304";
  }
}

function markedArchaicLetter(
  chars: readonly string[],
  lowered: readonly string[],
  start: number,
):
  | { value: "archaic-koppa"; length: 2 }
  | { value: "stigma" | "sampi"; length: number }
  | undefined {
  if (
    lowered[start] === "k" &&
    chars[start + 1] === "\u0323"
  ) {
    return { value: "archaic-koppa", length: 2 };
  }

  const firstMark = chars[start + 1];
  if (firstMark !== "\u0304" && firstMark !== "\u0302") return undefined;

  const secondMark = chars[start + 2];
  const length = secondMark !== firstMark &&
      (secondMark === "\u0304" || secondMark === "\u0302")
    ? 3
    : 2;

  switch (lowered[start]) {
    case "c":
      return { value: "stigma", length };
    case "s":
      return { value: "sampi", length };
    default:
      return undefined;
  }
}

function inferNasalGammas(tokens: Token[], exceptKappa: boolean) {
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];

    if (
      token.kind === "grapheme" &&
      token.letter === "nu" &&
      next.kind === "grapheme" &&
      followsNasalGamma(next.letter, exceptKappa)
    ) {
      token.letter = "gamma";
    }
  }
}

function startsVowel(
  lowered: readonly string[],
  start: number,
  trie: Trie<Letter>,
) {
  const match = trie.longest(lowered, start);
  return !!match && isVowel(match.value);
}

/** Whether the next Latin character, from `start`, is an uppercase letter. */
function capitalFollows(
  chars: readonly string[],
  lowered: readonly string[],
  start: number,
): boolean {
  const char = chars[start];
  return char !== undefined && char !== lowered[start] &&
    /^\p{L}$/u.test(char);
}

function resolveLongVowel(
  letter: Letter,
  macron: boolean,
  structuralCircumflex: boolean,
): Letter {
  if (!macron && !structuralCircumflex) return letter;
  if (letter === "epsilon") return "eta";
  if (letter === "omicron") return "omega";
  return letter;
}

function inferInitialBreathings(
  tokens: Token[],
  options: ConversionOptions,
  separatedByBreathing: ReadonlySet<number>,
) {
  const infersSmooth = infersSmoothBreathing(options);
  let wordStart = true;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.kind === "literal") {
      wordStart = true;
      continue;
    }

    if (!wordStart) continue;
    wordStart = false;

    if (!isVowel(token.letter) || isGreekNumeralContext(tokens, i)) continue;

    const target = separatedByBreathing.has(i + 1)
      ? token
      : tokens[i + breathingTarget(latinPair(token, tokens[i + 1]), 0)];
    if (target.kind !== "grapheme") continue;

    if (token.diacritics.has("rough") && target !== token) {
      token.diacritics = withoutDiacritic(token.diacritics, "rough");
      target.diacritics = withDiacritic(target.diacritics, "rough");
    } else if (
      infersSmooth &&
      !target.diacritics.has("rough") &&
      // A diaeresis and a breathing never share a vowel; Greek writes an
      // initial `ϊ` or `ϋ` without a breathing, so none is inferred.
      !target.diacritics.has("diaeresis") &&
      !hasQuantity(token) &&
      !hasQuantity(target)
    ) {
      target.diacritics = withDiacritic(target.diacritics, "smooth");
    }
  }
}

/**
 * Returns the two-token window that the diphthong helpers inspect, without
 * the breathing provisionally attached to the first vowel.
 *
 * A Latin `h` precedes the whole vowel group, so the rough breathing it places
 * on the first vowel is not the hiatus signal that a breathing written on the
 * first Greek vowel would be. Accents stay: they are attached to one Latin
 * vowel and keep their hiatus meaning. The window avoids copying the document
 * at each vowel, which made parsing quadratic.
 */
function latinPair(
  first: Token | undefined,
  second: Token | undefined,
): Token[] {
  const pair: Token[] = [];
  if (first === undefined) return pair;
  pair.push(
    first.kind === "grapheme" && first.diacritics.has("rough")
      ? {
        ...first,
        diacritics: withoutDiacritic(first.diacritics, "rough"),
      }
      : first,
  );
  if (second !== undefined) pair.push(second);
  return pair;
}
