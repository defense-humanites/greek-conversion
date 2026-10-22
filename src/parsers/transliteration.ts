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
 * `toLowerCase()` of each one-unit character, memoized: the reader compares
 * the lowercase form of every character several times. A character outside
 * the BMP is lowercased directly.
 */
const LOWER: string[] = [];
const lowercase = (char: string): string =>
  char.length === 1
    ? LOWER[char.charCodeAt(0)] ??= char.toLowerCase()
    : char.toLowerCase();

/**
 * Bit of each combining mark the reader accepts, by code unit. They all lie
 * in U+0300–U+036F: the Greek marks, plus the tilde as a circumflex and the
 * cedilla as an iota subscript.
 */
const MARKS_START = 0x0300;
const MARK_BIT = new Uint16Array(0x70);
for (const [mark, diacritic] of GREEK_MARKS) {
  MARK_BIT[mark.charCodeAt(0) - MARKS_START] = diacriticBit(diacritic);
}
MARK_BIT[0x0303 - MARKS_START] = diacriticBit("circumflex");
MARK_BIT[0x0342 - MARKS_START] = diacriticBit("circumflex");
MARK_BIT[0x0327 - MARKS_START] = diacriticBit("iota-subscript");

function markBit(char: string): number {
  if (char.length !== 1) return 0;
  const unit = char.charCodeAt(0);
  return unit >= MARKS_START && unit < MARKS_START + 0x70
    ? MARK_BIT[unit - MARKS_START]
    : 0;
}

const ROUGH = diacriticBit("rough");
const MACRON = diacriticBit("macron");
const DIAERESIS = diacriticBit("diaeresis");

export function parseTransliteration(
  input: string,
  options: ConversionOptions = {},
): Document {
  const chars = prioritizeEtaMacron(
    Array.from(input.normalize("NFD")),
    options,
  );
  // Lowercased once, after prioritizeEtaMacron() has reordered the marks.
  const lowered = chars.map(lowercase);
  const out: Token[] = [];
  const trie = transliterationTrie(options);
  const contextualY = new Set<number>();
  // Upsilons read from a contextual `y` whose separation from the preceding
  // vowel is carried by a breathing on that vowel rather than by a diaeresis.
  const separatedByBreathing = new Set<number>();
  const orthography = options.orthography;
  const digraphB = (orthography?.modernDigraphs === "phonetic" ||
    orthography?.modernDigraphs === "ala-lc") &&
    orthography.beta === "v";
  const digraphD = orthography?.modernDigraphs === "ala-lc";
  const lunateC = orthography?.lunateSigma === "c";
  const systematicRho = orthography?.rho === "systematic";
  const circumflexAccent = orthography?.circumflexAccent === "circumflex";
  const upsilon = orthography?.upsilon;

  for (let i = 0; i < chars.length;) {
    let rough = false;
    let roughUppercase = false;

    if (digraphB && lowered[i] === "b") {
      const uppercase = chars[i] !== lowered[i];
      out.push(grapheme("mu", uppercase), grapheme("pi"));
      i++;
      continue;
    }

    if (digraphD && lowered[i] === "d" && chars[i + 1] === "\u0332") {
      const uppercase = chars[i] !== lowered[i];
      out.push(grapheme("nu", uppercase), grapheme("tau"));
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
          i++;
          continue;
        }
      }

      if (rough) out.push(literal(roughUppercase ? "H" : "h"));
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

    const letter = resolveLongVowel(
      match.value,
      (marks & MACRON) !== 0,
      structuralCircumflex,
    );
    // The macron of `ē` and `ō` makes the letter, not a mark.
    if (letter !== match.value && !structuralCircumflex) marks &= ~MACRON;

    if (
      letter === "upsilon" &&
      (upsilon === "y-with-diphthong-u" || upsilon === "y-with-au-eu-ou") &&
      sourceLower === "y"
    ) {
      const pair = latinPair(
        out.at(-1),
        grapheme(letter, false, diacriticsFromMask(marks)),
      );
      const wouldRenderU = upsilon === "y-with-au-eu-ou"
        ? isAuEuOuAt(pair, 0)
        : isDiphthongAt(pair, 0);
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

  if (options.orthography?.nasalGamma !== "literal") {
    inferNasalGammas(out);
  }
  inferInitialBreathings(out, options, separatedByBreathing);

  return out;
}

function prioritizeEtaMacron(
  input: string[],
  options: ConversionOptions,
): string[] {
  if (options.orthography?.eta !== "i-macron") return input;

  const chars = [...input];
  for (let start = 0; start < chars.length; start++) {
    if (lowercase(chars[start]) !== "i") continue;

    let end = start + 1;
    while (end < chars.length && /^\p{M}$/u.test(chars[end])) end++;

    // Look for the macron inside this letter's marks only: scanning the rest
    // of the text at every `i` made parsing quadratic.
    let macron = start + 1;
    while (macron < end && chars[macron] !== "\u0304") macron++;
    if (macron < end && macron > start + 1) {
      // Move the macron to the front of the marks, shifting the others right.
      for (let j = macron; j > start + 1; j--) chars[j] = chars[j - 1];
      chars[start + 1] = "\u0304";
    }
    start = end - 1;
  }

  return chars;
}

function transliterationTrie(options: ConversionOptions): Trie<Letter> {
  const variants: Array<readonly [string, Letter]> = [];
  const orthography = options.orthography;

  if (orthography?.beta === "v") variants.push(["v", "beta"]);
  if (orthography?.eta === "i-macron") variants.push(["i\u0304", "eta"]);
  if (orthography?.xi === "ks") variants.push(["ks", "xi"]);
  if (orthography?.phi === "f") variants.push(["f", "phi"]);
  if (orthography?.chi === "kh") variants.push(["kh", "chi"]);

  return variants.length === 0
    ? TRIE
    : new Trie<Letter>([...CANONICAL_ENTRIES, ...variants]);
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

function inferNasalGammas(tokens: Token[]) {
  for (let i = 0; i < tokens.length - 1; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];

    if (
      token.kind === "grapheme" &&
      token.letter === "nu" &&
      next.kind === "grapheme" &&
      followsNasalGamma(next.letter)
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
