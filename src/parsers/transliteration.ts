import { ALPHABET, GREEK_MARKS } from "../alphabet.ts";
import { infersSmoothBreathing } from "../diacritics.ts";
import {
  ARISTERI_KERAIA,
  breathingTarget,
  DEXIA_KERAIA,
  type DocumentContext,
  followsNasalGamma,
  hasQuantity,
  isAuEuOuAt,
  isBoundaryTransparent,
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
  type Grapheme,
  grapheme,
  type Letter,
  literal,
  ownedGrapheme,
  sharedMask,
  type Token,
  withDiacritic,
  withoutDiacritic,
} from "../model.ts";
import type { ConversionOptions } from "../options.ts";
import { parsePunctuation } from "../punctuation.ts";
import { perKey } from "../profile_cache.ts";
import { Trie } from "../trie.ts";
import { codeUnitTable } from "./code_units.ts";
import { knownMarkAfterIn, knownMarksFirst } from "./mark_order.ts";
import type { ReadPositions } from "./positions.ts";
import { mayHaveSpacingSigns, readSpacingMarks } from "./spacing_marks.ts";

/** The overline alone, on the last letter of a digraph. */
const OVERLINE = diacriticsFromMask(diacriticBit("overline"));

/** The index after the overlines (U+0305) from `start`. */
function afterOverlines(chars: readonly string[], start: number): number {
  let end = start;
  while (chars[end] === "\u0305") end++;
  return end;
}

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
 * in U+0300–U+036F: the Greek marks, the tilde among them, plus the cedilla
 * as an iota subscript.
 */
const MARKS_START = 0x0300;
const MARK_BIT = codeUnitTable(MARKS_START, 0x70, [
  ...[...GREEK_MARKS].map(([mark, diacritic]) =>
    [mark, diacriticBit(diacritic)] as const
  ),
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
const SMOOTH = diacriticBit("smooth");
const BREATHINGS = ROUGH | diacriticBit("smooth");
const CIRCUMFLEX = diacriticBit("circumflex");
const ACUTE = diacriticBit("acute");
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
  return readTransliteration(text, options, positions, false) ??
    readTransliteration(
      knownMarksFirst(text, isTransliterationMark),
      options,
      positions,
      true,
    )!;
}

/** Whether the reader reads a mark (`mark_order.ts`). */
const isTransliterationMark = (mark: string): boolean => markBit(mark) !== 0;

/**
 * Whether the mark at `chars[i]`, which the reader reads, follows marks of a
 * letter that it does not, and only canonical order put it after them.
 */
function misplacedMark(chars: readonly string[], i: number): boolean {
  const unknown = (char: string) =>
    !isTransliterationMark(char) && /^\p{M}$/u.test(char);
  let start = i;
  while (start > 0 && i - start < 32 && unknown(chars[start - 1])) start--;
  if (start === i || start === 0) return false;
  const before = chars[start - 1];
  return (isTransliterationMark(before) || /^\p{L}$/u.test(before)) &&
    knownMarkAfterIn(chars, start, isTransliterationMark);
}

/**
 * Reads decomposed transliteration; `undefined` when a letter has marks the
 * reader knows after one it does not, unless `ordered`: the text is then
 * read again with its marks in the reader's order (`mark_order.ts`).
 */
function readTransliteration(
  text: string,
  options: ConversionOptions,
  positions: ReadPositions | undefined,
  ordered: boolean,
): Document | undefined {
  const chars = prioritizeEtaMark(Array.from(text), options);
  // Starts are recorded as indices in `chars` and converted to code units at
  // the end. prioritizeEtaMark() only reorders the marks of a letter, which
  // are one unit each, so the offset of a character in `text` is its offset
  // in `chars` joined.
  const starts = positions?.starts;
  if (starts !== undefined) starts.length = 0;
  // Whether a letter has marks the reader knows after one it does not.
  let misordered = false;
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
  // vowel is carried by a breathing on that vowel rather than by a diaeresis:
  // the tokens, which readSpacingMarks() may move.
  const separatedByBreathing = new Set<Token>();
  // The omegas read from an `o` before `y` (ISO 843 Type 2): see below.
  const omegaBeforeY: number[] = [];
  const transliteration = options.transliteration;
  // `b` is μπ only where it cannot be beta; `d̲` is never delta.
  const digraphB = transliteration?.muPi !== undefined &&
    transliteration.muPi !== "mp" && transliteration.beta === "v";
  const digraphD = transliteration?.nuTau === "d-underline-initial";
  const lunateC = transliteration?.lunateSigma === "c";
  // ISO 843 writes the smooth breathing as an apostrophe before the vowel
  // group of a word, as it writes the rough one as `h`, and the coronis as
  // an apostrophe after its vowel, inside the word (`ka’gṓ`). Elsewhere, an
  // apostrophe is one: after a consonant (elision, `ap’`), before one
  // (prodelision, `’gathé`), or at the end of a word.
  const smoothApostrophe = transliteration?.smoothBreathing === "apostrophe";
  const coronisApostrophe = transliteration?.coronis === "apostrophe";
  // The vowels whose coronis was read from an apostrophe after them: as the
  // writer does, the apostrophe parts them from the next vowel (`ta’ys` is
  // τἀυς), which a `y` after them then does not part again.
  const splitByCoronis = new Set<number>();
  // The vowels that the apostrophe before them gave a smooth breathing: the
  // tokens, which readSpacingMarks() may move.
  const smoothedByApostrophe = new Set<Token>();
  const systematicRho = transliteration?.rho === "systematic";
  const circumflexAccent = transliteration?.circumflexAccent === "circumflex";
  // Without a length mark, e and o are epsilon and omicron, and a circumflex
  // on them is an accent: one that only the long vowel can bear.
  const omitLength = transliteration?.longVowels === "omit";
  // An eta written like an iota, with no length mark (ISO 843 Type 2).
  const etaAsIota = omitLength && transliteration?.eta === "i";
  const upsilon = transliteration?.upsilon;
  // An omega written like an omicron, before the upsilon ISO 843 Type 2
  // writes `y` after it.
  const omegaAsO = omitLength && upsilon === "y-with-ou-v-f";
  const nasalGamma = transliteration?.nasalGamma;
  // Where gamma stays `g` before kappa but is `n` before chi, `kh` after `g`
  // is kappa followed by a rough breathing (`γκἡ` → `gkhē`), not chi.
  // BnF writes the right keraia as an acute, which a consonant cannot bear as
  // an accent: there, it is the keraia. The left keraia: see below.
  const bnfKeraia = transliteration?.keraia === "bnf";
  const kappaAfterG = transliteration?.chi === "kh" &&
    (nasalGamma === "nasal-except-kappa" ||
      nasalGamma === "nasal-medial-kappa");

  for (let i = 0; i < chars.length;) {
    let rough = false;
    let roughUppercase = false;
    let smooth = false;
    if (starts !== undefined) starts.push(i);

    if (
      smoothApostrophe && chars[i] === "\u2019" && !followsLetter(out) &&
      startsVowel(lowered, i + 1, trie)
    ) {
      smooth = true;
      i++;
    }

    if (digraphB && lowered[i] === "b") {
      const uppercase = chars[i] !== lowered[i];
      // An overline after the digraph is its last letter's, as a mark after
      // a sign for several letters is (`b̅` is `μπ̅`).
      const end = afterOverlines(chars, i + 1);
      out.push(
        grapheme("mu", uppercase),
        grapheme(
          "pi",
          uppercase && capitalFollows(chars, lowered, end),
          end > i + 1 ? OVERLINE : undefined,
        ),
      );
      // Two letters from one character: the same start, so that they share
      // its span.
      if (starts !== undefined) starts.push(i);
      i = end;
      continue;
    }

    if (digraphD && lowered[i] === "d" && chars[i + 1] === "\u0332") {
      const uppercase = chars[i] !== lowered[i];
      const end = afterOverlines(chars, i + 2);
      out.push(
        grapheme("nu", uppercase),
        grapheme(
          "tau",
          uppercase && capitalFollows(chars, lowered, end),
          end > i + 2 ? OVERLINE : undefined,
        ),
      );
      if (starts !== undefined) starts.push(i);
      i = end;
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
    const ordinary = kappaAfterG && lowered[i] === "k" &&
        lowered[i + 1] === "h" && followsGamma(out) &&
        startsVowel(lowered, i + 2, trie)
      ? KAPPA
      : trie.longest(lowered, i);
    const lunateSigma = !archaic && !ordinary && lunateC && lowered[i] === "c";
    const match = archaic ?? ordinary ??
      (lunateSigma ? { value: "sigma" as const, length: 1 } : undefined);

    if (!match) {
      if (
        upsilon === "y-with-ou-v-f" &&
        (lowered[i] === "v" || lowered[i] === "f") &&
        followsUpsilonVowel(out, etaAsIota)
      ) {
        // ISO 843 Type 2 writes the upsilon of `αυ`, `ευ`, `ηυ` as `v` or
        // `f`, and its accent on the vowel before it (`aftós`, `Évvoia`):
        // where beta and phi do not claim the letter, it is that upsilon,
        // and the accent goes back to it, which makes the pair a diphthong.
        const previous = out[out.length - 1] as Grapheme;
        // Without a length mark, eta is written `i` under `eta: "i"`; `ιυ` is
        // never written with `v` or `f`, so the `i` was that eta.
        if (previous.letter === "iota") previous.letter = "eta";
        let diacritics = diacriticsFromMask(0);
        for (const accent of ["acute", "grave", "circumflex"] as const) {
          if (!previous.diacritics.has(accent)) continue;
          previous.diacritics = withoutDiacritic(previous.diacritics, accent);
          diacritics = withDiacritic(diacritics, accent);
        }
        out.push(
          ownedGrapheme("upsilon", chars[i] !== lowered[i], diacritics),
        );
        i++;
        continue;
      }

      if (
        coronisApostrophe && chars[i] === "\u2019" &&
        startsLetter(chars, lowered, i + 1, trie, lunateC)
      ) {
        const previous = out.at(-1);
        if (
          previous?.kind === "grapheme" &&
          !previous.diacritics.has("coronis") &&
          takesCoronisApostrophe(out, out.length - 1)
        ) {
          previous.diacritics = withDiacritic(previous.diacritics, "coronis");
          splitByCoronis.add(out.length - 1);
          // No token: the apostrophe joins the vowel's span.
          if (starts !== undefined) starts.pop();
          i++;
          continue;
        }
      }

      if (chars[i] === "\u1FBD") {
        const previous = out.at(-1);
        // Not on the vowel of a smooth breathing, which Greek writes alike.
        if (
          previous?.kind === "grapheme" && isVowel(previous.letter) &&
          !previous.diacritics.has("smooth")
        ) {
          previous.diacritics = withDiacritic(previous.diacritics, "coronis");
          // No token: the coronis joins the previous one's span.
          if (starts !== undefined) starts.pop();
          i++;
          continue;
        }
      }

      // A mark the reader knows, read here only after one it does not.
      if (
        !ordered && markBit(chars[i]) !== 0 && misplacedMark(chars, i)
      ) misordered = true;
      if (rough) {
        out.push(literal(roughUppercase ? "H" : "h"));
        if (starts !== undefined) starts.push(i);
      }
      // BnF writes the left keraia as a comma, which reads back as one
      // before `c̄` and `s̄`, the stigma and sampi that only numerals use.
      const leftKeraia = bnfKeraia && chars[i] === "," &&
        markedArchaicLetter(chars, lowered, i + 1) !== undefined &&
        lowered[i + 1] !== "k";
      out.push(
        literal(
          leftKeraia
            ? ARISTERI_KERAIA
            : parsePunctuation(chars[i], "transliteration") ?? chars[i],
        ),
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

    let marks = rough ? ROUGH : smooth ? SMOOTH : 0;
    // Whether the breathing of the vowel before parts this one from it.
    let separated = false;
    let structuralCircumflex = false;
    // Where an acute was read, for a BnF keraia.
    let acuteAt = -1;

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
      if (bit === ACUTE) acuteAt = i;
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
        const epsilon = ownedGrapheme(
          letter,
          roughUppercase || source !== sourceLower,
          diacriticsFromMask(marks & ~CIRCUMFLEX),
        );
        out.push(
          epsilon,
          ownedGrapheme(
            "upsilon",
            chars[i] !== lowered[i],
            diacriticsFromMask(CIRCUMFLEX),
          ),
        );
        if (smooth) smoothedByApostrophe.add(epsilon);
        if (starts !== undefined) starts.push(i);
        i++;
        continue;
      }
    }

    // Under ISO 843 Type 2, omega is written `o`, and `ωυ`, which Table 2
    // does not list, letter by letter (note 8): `oy`. `ου` is written `ou`,
    // or `oy` with an accent on the `o` or a diaeresis on the `y` (note 9),
    // so an `o` without marks, or with a coronis or an overline only
    // (crasis, `τὠυ`; an abbreviation), before a `y` without diaeresis is
    // that omega. The apostrophe of a smooth breathing precedes the group.
    if (
      letter === "upsilon" && omegaAsO && sourceLower === "y" &&
      (marks & DIAERESIS) === 0
    ) {
      const previous = out.at(-1);
      if (
        previous?.kind === "grapheme" && previous.letter === "omicron" &&
        [...previous.diacritics].every((mark) =>
          mark === "coronis" || mark === "overline" ||
          mark === "smooth" && smoothedByApostrophe.has(previous)
        )
      ) {
        previous.letter = "omega";
        omegaBeforeY.push(out.length - 1);
        // The pair is no vowel group: the breathing stays on the omega.
        if (smoothedByApostrophe.has(previous)) separated = true;
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
        smoothedByApostrophe.has(out[out.length - 1]),
      );
      // Whether the pair, as a diphthong, would be written otherwise than
      // with y (u, or v and f under ISO 843 Type 2).
      const wouldRenderU = upsilon === "y-with-diphthong-u"
        ? isDiphthongAt(pair, 0)
        : isAuEuOuAt(pair, 0) ||
          upsilon === "y-with-ou-v-f" && isVowelUpsilonAt(pair, 0);
      // A diaeresis and a breathing never share a vowel (`hy` is ὑ).
      if (
        wouldRenderU && (marks & BREATHINGS) === 0 &&
        !splitByCoronis.has(out.length - 1)
      ) {
        // `y` says the pair is not a diphthong. Greek marks such a hiatus by
        // a breathing on the first vowel when the word starts there (ἀυτμή,
        // ἁυ); the diaeresis is the fallback where no breathing will sit.
        const first = out[out.length - 1];
        const breathingWillSit = first.kind === "grapheme" &&
          isWordInitial(out, out.length - 1) &&
          (first.diacritics.has("rough") ||
            smoothedByApostrophe.has(first) ||
            infersSmoothBreathing(options));
        if (breathingWillSit) separated = true;
        else marks |= DIAERESIS;
      }
    }

    if (
      letter === "iota" &&
      upsilon === "y-with-diphthong-u" &&
      contextualY.has(out.length - 1) &&
      !splitByCoronis.has(out.length - 1) &&
      // A diaeresis and a breathing never share a vowel (`yhi` is υἱ).
      (marks & BREATHINGS) === 0
    ) {
      const pair = latinPair(
        out.at(-1),
        grapheme(letter, false, diacriticsFromMask(marks)),
        smoothedByApostrophe.has(out[out.length - 1]),
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

    const keraia = bnfKeraia && (marks & ACUTE) !== 0 && !isVowel(letter);
    if (keraia) marks &= ~ACUTE;
    const token = ownedGrapheme(
      letter,
      roughUppercase || source !== sourceLower,
      diacriticsFromMask(marks),
      lunateSigma ? "lunate-sigma" : undefined,
    );
    out.push(token);
    if (smooth) smoothedByApostrophe.add(token);
    if (separated) separatedByBreathing.add(token);
    if (keraia) {
      out.push(literal(DEXIA_KERAIA));
      if (starts !== undefined) starts.push(acuteAt);
    }
  }

  if (misordered) return undefined;
  if (positions !== undefined && starts !== undefined) {
    positions.text = text;
    starts.push(chars.length);
    // Character indices to code-unit offsets.
    const offsets = new Array<number>(chars.length + 1).fill(0);
    let offset = 0;
    for (let k = 0; k < chars.length; k++) {
      offsets[k] = offset;
      offset += chars[k].length;
    }
    offsets[chars.length] = offset;
    for (let k = 0; k < starts.length; k++) starts[k] = offsets[starts[k]];
  }

  if (mayHaveSpacingSigns(text)) readSpacingMarks(out, starts);
  if (nasalGamma !== "literal") {
    inferNasalGammas(out, nasalGamma === "nasal-except-kappa");
  }
  // A numeral, whose letters Type 2 writes as it reads them back (`ωυʹ` is
  // `ouʹ`), keeps the `o` and the separation the `y` gives, by a diaeresis.
  for (const index of omegaBeforeY) {
    const omega = out[index];
    const next = out[index + 1];
    if (
      omega.kind === "grapheme" && next?.kind === "grapheme" &&
      !omega.diacritics.has("coronis") && isGreekNumeralContext(out, index)
    ) {
      omega.letter = "omicron";
      next.diacritics = withDiacritic(next.diacritics, "diaeresis");
    }
  }
  inferInitialBreathings(
    out,
    options,
    separatedByBreathing,
    smoothedByApostrophe,
  );

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

/**
 * The spellings the reader reads under the options. A trie of its own is
 * built where an option adds or replaces spellings (ISO 843, ALA-LC for
 * modern Greek), which a word read under such options would otherwise spend
 * most of its time building: kept for each sealed profile, and by the
 * spellings, which are all it depends on, for other options (`perKey()` in
 * `profile_cache.ts`). There are 72 keys at most, one for each combination
 * of `beta`, `eta` with its length mark, `xi`, `phi`, and `chi` with
 * `lunateSigma`.
 */
const transliterationTrie = perKey(
  (options) => {
    const { variants, replaced } = spellingsOf(options);
    return variants.map(([spelling, letter]) => `${spelling}=${letter}`)
      .join(" ") + ` / ${[...replaced].join(" ")}`;
  },
  (options): Trie<Letter> => {
    const { variants, replaced } = spellingsOf(options);
    return variants.length === 0 ? TRIE : new Trie<Letter>([
      ...CANONICAL_ENTRIES.filter(([spelling]) => !replaced.has(spelling)),
      ...variants,
    ]);
  },
);

/**
 * The spellings that the options add to those the reader reads, and those
 * of its spellings that they replace.
 */
function spellingsOf(options: ConversionOptions): {
  variants: (readonly [string, Letter])[];
  replaced: Set<string>;
} {
  const variants: Array<readonly [string, Letter]> = [];
  const transliteration = options.transliteration;

  if (transliteration?.beta === "v") variants.push(["v", "beta"]);
  const mark = etaMark(options);
  if (transliteration?.eta === "i" && mark !== undefined) {
    variants.push([`i${mark}`, "eta"]);
  }
  if (transliteration?.xi === "ks") variants.push(["ks", "xi"]);
  // A spelling that an option replaces is still read, unless the encoder
  // writes the same letters with another meaning under these options: then
  // reading it back would change the output (docs/stability.md, "Reading").
  const replaced = new Set<string>();
  if (transliteration?.phi === "f") {
    variants.push(["f", "phi"]);
    // π followed by a rough breathing: `πἡ` → `phē`.
    replaced.add("ph");
  }
  if (transliteration?.chi === "kh") {
    variants.push(["kh", "chi"]);
    // The lunate sigma `c` followed by a rough breathing: `ϲἡ` → `chē`.
    if (transliteration.lunateSigma === "c") replaced.add("ch");
  }
  return { variants, replaced };
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

const KAPPA = { value: "kappa", length: 1 } as const;

/**
 * Whether the last token read is the vowel of `αυ`, `ευ`, or `ηυ` whose
 * upsilon ISO 843 Type 2 writes `v` or `f`: alpha, epsilon, or eta, with no
 * diaeresis; or an iota where eta is written like one (`etaAsIota`).
 */
function followsUpsilonVowel(
  tokens: readonly Token[],
  etaAsIota: boolean,
): boolean {
  const previous = tokens.at(-1);
  return previous?.kind === "grapheme" &&
    (previous.letter === "alpha" || previous.letter === "epsilon" ||
      previous.letter === "eta" || etaAsIota && previous.letter === "iota") &&
    !previous.diacritics.has("diaeresis");
}

/** Whether the last token read is a gamma. */
function followsGamma(tokens: readonly Token[]): boolean {
  const previous = tokens.at(-1);
  return previous?.kind === "grapheme" && previous.letter === "gamma";
}

/**
 * Whether a letter that is not the `h` of a rough breathing starts at
 * `start`, or the U+02BC the writer writes for an apostrophe of the source
 * after the apostrophe of a coronis: what follows a coronis written as an
 * apostrophe inside a word.
 */
function startsLetter(
  chars: readonly string[],
  lowered: readonly string[],
  start: number,
  trie: Trie<Letter>,
  lunateC: boolean,
): boolean {
  return chars[start] === "\u02BC" ||
    markedArchaicLetter(chars, lowered, start) !== undefined ||
    lunateC && lowered[start] === "c" ||
    lowered[start] !== "h" && trie.longest(lowered, start) !== undefined;
}

/**
 * Whether the vowel at `index` may bear the coronis that ISO 843 writes as an
 * apostrophe after it: the run of vowels it ends follows a consonant, as in a
 * crasis (`κἀγώ`), and bears no breathing, nor a coronis before it. Greek
 * writes a breathing and a coronis alike, and a vowel group bears one: at the
 * start of a word, the mark is a breathing.
 */
function takesCoronisApostrophe(
  tokens: readonly Token[],
  index: number,
): boolean {
  for (let at = index; at >= 0; at--) {
    const token = tokens[at];
    // A mark the reader kept apart belongs to the letter before it.
    if (isBoundaryTransparent(token)) continue;
    if (token.kind !== "grapheme") return false;
    if (!isVowel(token.letter)) return at < index;
    if (
      token.diacritics.has("rough") || token.diacritics.has("smooth") ||
      at < index && token.diacritics.has("coronis")
    ) return false;
  }
  return false;
}

/**
 * Whether the last token read, but the combining marks after it, is a letter:
 * an apostrophe after it does not start a word.
 */
function followsLetter(out: readonly Token[]): boolean {
  let index = out.length - 1;
  while (isBoundaryTransparent(out[index])) index--;
  return out[index]?.kind === "grapheme";
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
  separatedByBreathing: ReadonlySet<Token>,
  smoothedByApostrophe: ReadonlySet<Token> = new Set(),
) {
  const infersSmooth = infersSmoothBreathing(options);
  // The numerals of the tokens, found once: the pass moves marks only.
  const context: DocumentContext = {};
  let wordStart = true;
  // The vowel that a rough breathing went to, the second of a diphthong,
  // where it stays: `houi` is οὑι, whose υ does not pass it on to the ι.
  let placed = -1;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.kind === "literal") {
      // A combining mark that the reader does not read, such as the dot of
      // an uncertain letter, or a join control stays inside the word, as
      // the writer reads it (`kạe` is κα̣ε).
      if (!isBoundaryTransparent(token)) wordStart = true;
      continue;
    }

    if (!wordStart) {
      if (i === placed) continue;
      // An `h` inside a word precedes its vowel group too (`chhoi` → χοἱ):
      // the rough breathing goes to the second vowel of a diphthong.
      const next = tokens[i + 1];
      if (
        hasRough(token) &&
        isVowel(token.letter) &&
        next?.kind === "grapheme" &&
        !hasBreathing(next) &&
        !isGreekNumeralContext(tokens, i, context) &&
        breathingTarget(latinPair(token, next), 0) === 1
      ) {
        token.diacritics = withoutDiacritic(token.diacritics, "rough");
        next.diacritics = withDiacritic(next.diacritics, "rough");
        placed = i + 1;
      }
      continue;
    }
    wordStart = false;

    if (!isVowel(token.letter)) continue;
    // The apostrophe of a smooth breathing is written in a numeral as well.
    const apostrophe = smoothedByApostrophe.has(token);
    if (!apostrophe && isGreekNumeralContext(tokens, i, context)) {
      // A numeral takes no breathing: a `y` that a smooth breathing was to
      // separate from this vowel keeps its separation as a diaeresis.
      const next = tokens[i + 1];
      if (
        next?.kind === "grapheme" && separatedByBreathing.has(next) &&
        !token.diacritics.has("rough")
      ) next.diacritics = withDiacritic(next.diacritics, "diaeresis");
      continue;
    }

    const targetIndex = separatedByBreathing.has(tokens[i + 1])
      ? i
      : i + breathingTarget(latinPair(token, tokens[i + 1], apostrophe), 0);
    const target = tokens[targetIndex];
    if (target.kind !== "grapheme") continue;

    // The apostrophe of a smooth breathing precedes the whole vowel group, as
    // the `h` of a rough one does.
    const breathing = apostrophe
      ? "smooth"
      : token.diacritics.has("rough")
      ? "rough"
      : undefined;
    if (breathing !== undefined) {
      // A vowel bears a breathing or a coronis (`’ai᾽u`).
      if (
        target !== token && !hasBreathing(target) &&
        !(apostrophe && target.diacritics.has("coronis"))
      ) {
        token.diacritics = withoutDiacritic(token.diacritics, breathing);
        target.diacritics = withDiacritic(target.diacritics, breathing);
        placed = targetIndex;
      }
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
 * Whether a grapheme has a rough breathing: read from the mask of its marks,
 * which every set the reader builds has, faster than from the set.
 */
function hasRough(token: Grapheme): boolean {
  const mask = sharedMask(token.diacritics);
  return mask === undefined
    ? token.diacritics.has("rough")
    : (mask & ROUGH) !== 0;
}

/**
 * Whether a vowel already carries a breathing, read from its own `h` (or
 * written in place): the `h` before the previous vowel is then that vowel's,
 * since a vowel group has only one breathing (`hahi` is ἁἱ).
 */
function hasBreathing(token: Grapheme): boolean {
  return token.diacritics.has("rough") || token.diacritics.has("smooth");
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
  apostrophe = false,
): Token[] {
  const pair: Token[] = [];
  if (first === undefined) return pair;
  pair.push(
    first.kind === "grapheme" && (apostrophe || first.diacritics.has("rough"))
      ? {
        ...first,
        diacritics: withoutDiacritic(
          first.diacritics,
          apostrophe ? "smooth" : "rough",
        ),
      }
      : first,
  );
  if (second !== undefined) pair.push(second);
  return pair;
}
