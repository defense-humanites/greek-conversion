import {
  ALPHABET,
  BETA_FOR,
  BY_BETA,
  GREEK_FOR,
  GREEK_ORDER,
  ORDER,
} from "./alphabet.ts";
import {
  ARISTERI_KERAIA,
  assimilatedDental,
  breathingTarget,
  DEXIA_KERAIA,
  elidedAspirate,
  followsCoronisApostrophe,
  hasHiatusMark,
  isAmongCapitals,
  isAuEuOuAt,
  isBoundaryTransparent,
  isDiphthongAt,
  isGreekNumeralContext,
  isKeptLetter,
  isNasalGamma,
  isVowel,
  isVowelUpsilonAt,
  isWordFinal,
  isWordInitial,
  precedesVoicedSound,
  type QuotationContext,
  roughDiphthongStart,
  roughDiphthongStarts,
  sigmaEndsWord,
  standsAlone,
} from "./context.ts";
import {
  infersSmoothBreathing,
  prepareDiacriticsForRendering,
  preservesDiacritic,
} from "./diacritics.ts";
import {
  GLYPH_VARIANTS,
  NO_DIACRITICS,
  sharedMask,
  withDiacritic,
  withoutDiacritic,
} from "./model.ts";
import type {
  Diacritic,
  Document,
  Format,
  Grapheme,
  Letter,
  Token,
} from "./model.ts";
import type {
  ConversionOptions,
  GreekOptions,
  MuPiTransliteration,
  NuTauTransliteration,
  TransliterationOptions,
} from "./options.ts";
import { greekUpper } from "./case.ts";
import { perKey, perProfile } from "./profile_cache.ts";
import { applyMonotonicOrthography, isNumeralUnits } from "./orthography.ts";
import { betaLigature, writtenLigature } from "./ligatures.ts";
import { isMarkCode, isUnreadCode } from "./parsers/beta_code.ts";
import { standsApart, ZWNJ } from "./parsers/spacing_marks.ts";
import {
  continuesSegment,
  joinPieces,
  type WrittenPositions,
} from "./parsers/positions.ts";
import { APOSTROPHE, encodePunctuation, TLG_CODE_OF } from "./punctuation.ts";
import {
  applyGreekUnicode,
  normalizeGreek,
  substituteGreekSigns,
} from "./unicode.ts";

/**
 * Canonical order of combining marks on a Latin vowel: quantity, breathing,
 * diaeresis, accent. Quantity comes first so that an explicit macron and the
 * structural macron of eta and omega share one spelling (`ā́` like `ḗ`),
 * which keeps transliteration output idempotent when the two meet.
 */
const LATIN_ORDER: readonly Diacritic[] = [
  "macron",
  "breve",
  "smooth",
  "coronis",
  "rough",
  "diaeresis",
  "acute",
  "grave",
  "circumflex",
  "iota-subscript",
  "overline",
];

const marks = (token: Grapheme, options: ConversionOptions, format: Format) =>
  (format === "transliteration"
    ? LATIN_ORDER
    : format === "greek"
    ? GREEK_ORDER
    : ORDER).filter((mark) =>
      token.diacritics.has(mark) && preservesDiacritic(mark, options, format)
    );

/**
 * Memoizes a value derived only from a grapheme's marks and the options, for
 * one encoding call, or across calls in `cache`, one of the caches that
 * {@link marksCache} gives for a profile. Shared diacritic sets are keyed by
 * their mask; a caller's own set is computed each time.
 *
 * A cached value is shared by every token with the same marks, so it is
 * frozen: copy it before adding to it (`[...marks, "diaeresis"]`), or the
 * change would reach all those tokens. Values computed for a caller's set
 * are frozen too, so both paths fail the same way.
 */
function byMarks<T>(
  compute: (token: Grapheme) => T,
  cache: (Readonly<T> | undefined)[] = [],
): (token: Grapheme) => Readonly<T> {
  return (token) => {
    const mask = sharedMask(token.diacritics);
    if (mask === undefined) return Object.freeze(compute(token));
    return cache[mask] ??= Object.freeze(compute(token));
  };
}

/**
 * A cache for {@link byMarks}, kept across calls with a sealed profile (see
 * `profile_cache.ts`), and new at each call with other options. What is
 * cached in it must derive from the marks and the profile only.
 */
function marksCache<T>(): (options: ConversionOptions) => T[] {
  return perProfile((): T[] => []);
}

/** The marks that each format writes, by set of marks and profile. */
const GREEK_MARKS = marksCache<string>();
const LATIN_MARKS = marksCache<readonly Diacritic[]>();
const BETA_MARKS = marksCache<readonly Diacritic[]>();

/**
 * The Beta Code of a set of marks after a small letter, and whether the set
 * keeps the overline, which `<` and `>` write around the letters (see
 * {@link writeOverlines}).
 */
interface BetaMarkCodes {
  readonly codes: string;
  readonly overline: boolean;
}

/** The Beta Code of a set of marks before a capital, and after it. */
const BETA_CAPITAL_CODES = marksCache<readonly [string, string]>();
const BETA_MARK_CODES = marksCache<BetaMarkCodes>();

/**
 * The letters of the Greek and Coptic block, U+0370–U+03FF, composed with
 * marks, by the string of the marks and the letter's offset in the block.
 * Kept across calls: a few hundred strings of marks in practice, and at most
 * one for each set of the eleven marks of `GREEK_ORDER`, 2,048, of up to 144
 * letters each.
 */
const COMPOSED_LETTERS = new Map<string, string[]>();
const GREEK_BLOCK = 0x370;
const GREEK_BLOCK_SIZE = 0x90;

/**
 * A letter followed by its marks, composed (NFC) when the letter is one of
 * the Greek block: Greek output is normalized as a whole afterwards, and a
 * text whose letters are already composed is checked quickly, where one
 * written as letters and combining marks is composed anew. The output is
 * the same, since a text and its parts composed are canonically equivalent.
 * Positions are not always: see {@link continuesLetter}.
 */
function composedLetter(letter: string, marks: string): string {
  if (marks === "") return letter;
  const offset = letter.charCodeAt(0) - GREEK_BLOCK;
  if (letter.length !== 1 || offset < 0 || offset >= GREEK_BLOCK_SIZE) {
    return letter + marks;
  }
  let letters = COMPOSED_LETTERS.get(marks);
  if (letters === undefined) {
    letters = [];
    COMPOSED_LETTERS.set(marks, letters);
  }
  return letters[offset] ??= (letter + marks).normalize("NFC");
}

/**
 * Whether the output of `token`, the token after a letter, continues the
 * letter's segment (`parsers/positions.ts`): a literal that starts with a
 * combining mark the readers do not know (`ạ̓n`). With positions, the letter
 * is then written with its marks apart. Normalization composes the segment,
 * which each of its tokens then spans whole; composed, the letter would leave
 * the segment unchanged, and the segment would be split between its tokens.
 * A literal is written as its value, or as a sign that starts a segment as
 * its value does (`encodePunctuation()`), so its value tells.
 */
function continuesLetter(token: Token | undefined): boolean {
  if (token?.kind !== "literal") return false;
  const first = token.value.codePointAt(0);
  // No code point below U+0300, the first combining mark, continues one.
  return first !== undefined && first >= 0x300 && continuesSegment(first);
}

/**
 * Writes Greek, from a document that the Greek writer has prepared: its
 * numerals and double rho already written (`applyOrthography()`). With
 * `written`, records the range of each token's output in the text assembled
 * before Unicode normalization (see `parsers/positions.ts`).
 */
export function encodeGreek(
  doc: Document,
  options: ConversionOptions = {},
  written?: WrittenPositions,
) {
  let out = "";
  const greekMarks = byMarks(
    (token) =>
      marks(token, options, "greek").map((mark) => GREEK_FOR[mark]).join(""),
    GREEK_MARKS(options),
  );
  const rendered = prepareDiacriticsForRendering(
    applyMonotonicOrthography(doc, options),
    options,
    "greek",
  );
  const starts = written?.starts;
  const ends = written?.ends;
  const quotations: QuotationContext = {};
  const uppercaseOutput = options.text?.letterCase === "uppercase";
  // Decomposed output is written as letters and marks, as it ends.
  const composes = options.greek?.composition !== "decomposed";
  // The tests of options that every letter would make otherwise, made once
  // for the whole call.
  const assimilates = options.greek?.dentalSigma === "assimilate";
  const aspirates = options.greek?.elidedStop === "aspirate";
  const adscript = options.greek?.iotaSubscript;
  const writesAdscript = adscriptUnder(adscript);

  for (let i = 0; i < doc.length; i++) {
    const token = rendered[i];
    const start = out.length;
    if (starts !== undefined) starts[i] = start;

    if (token.kind === "literal") {
      out += isKeptLetter(token)
        ? token.value
        : encodePunctuation(token.value, "greek") ?? token.value;
      if (standsApart(rendered, i)) out += ZWNJ;
      if (ends !== undefined) ends[i] = out.length;
      continue;
    }

    const ligature = token.glyphVariant === undefined
      ? undefined
      : writtenLigature(doc, i, options);
    if (ligature !== undefined) {
      // One sign for its letters, with the marks of the last one (`ϗ́`).
      const last = i + ligature.letters.length - 1;
      out += (token.uppercase ? greekUpper(ligature.greek) : ligature.greek) +
        greekMarks(rendered[last] as Grapheme);
      if (starts !== undefined && ends !== undefined) {
        for (let k = i; k <= last; k++) {
          starts[k] = start;
          ends[k] = out.length;
        }
      }
      i = last;
      continue;
    }

    const assimilated = assimilates ? assimilatedDental(doc, i) : undefined;

    if (assimilated !== undefined) {
      let base = ALPHABET.sigma.greek;
      if (writesLunateSigma(doc, i + 1, assimilated, options)) base = "ϲ";
      else if (
        (options.greek?.finalSigma ?? "preserve") === "preserve"
          ? assimilated.glyphVariant === "final-sigma" ||
            assimilated.glyphVariant !== "medial-sigma" &&
              sigmaEndsWord(doc, i + 1, quotations)
          : options.greek?.finalSigma !== "medial" &&
            sigmaEndsWord(doc, i + 1, quotations)
      ) base = "ς";
      out += assimilated.uppercase ? greekUpper(base) : base;
      // The dental and the sigma it became are written as one letter.
      if (starts !== undefined && ends !== undefined) {
        starts[i + 1] = start;
        ends[i] = ends[i + 1] = out.length;
      }
      i++;
      continue;
    }

    const outputLetter = aspirates
      ? elidedAspirate(doc, i) ?? token.letter
      : token.letter;
    let base = outputLetter === token.letter
      ? greekGlyph(doc, i, token, options, quotations)
      : ALPHABET[outputLetter].greek;
    // greekGlyph() writes a symbol form only in its own case, which
    // greekUpper() leaves as it is (ϴ, ϒ).
    if (token.uppercase) base = greekUpper(base);

    if (writesAdscript && writesIotaAdscript(token, options)) {
      out += base + greekMarks(token).replace("\u0345", "") +
        (token.uppercase && (uppercaseOutput || isAmongCapitals(rendered, i))
          ? "Ι"
          : "ι");
    } else if (
      composes && !(written !== undefined && continuesLetter(rendered[i + 1]))
    ) {
      out += composedLetter(base, greekMarks(token));
    } else {
      out += base + greekMarks(token);
    }
    if (ends !== undefined) ends[i] = out.length;
  }

  if (written === undefined) return applyGreekUnicode(out, options);
  // The positions are aligned on the normalized text: the substitutions that
  // follow replace one code unit by one, and the alignment must compare the
  // text with its exact normalization.
  const normalized = normalizeGreek(out, options);
  written.text = out;
  written.normalized = normalized;
  return substituteGreekSigns(normalized, options);
}

/**
 * The glyph Greek output writes for the letter of `token` at `index`, before
 * its case and marks: the shape of a sigma (`ϲ`, `ς`, `σ`), the beta (`ϐ`,
 * `β`), a symbol form the source notes (`ϑ`, `ϴ`…), or the ordinary letter.
 * A symbol form is returned in its own case. The loss detector compares
 * these glyphs (`greekGlyphForm()`).
 */
export function greekGlyph(
  document: Document,
  index: number,
  token: Grapheme,
  options: ConversionOptions,
  quotations: QuotationContext,
): string {
  const ordinary = ALPHABET[token.letter].greek;
  if (token.letter === "sigma") {
    if (writesLunateSigma(document, index, token, options)) return "ϲ";
    // In a numeral, a sigma is 200, written `σ`; a final sigma the source
    // writes there, which no numeral reads, is kept under `"preserve"`.
    if (isGreekNumeralContext(document, index)) {
      return token.glyphVariant === "final-sigma" &&
          (options.greek?.finalSigma ?? "preserve") === "preserve"
        ? "ς"
        : ordinary;
    }
    return ((options.greek?.finalSigma ?? "preserve") === "preserve"
        ? token.glyphVariant === "final-sigma" ||
          token.glyphVariant !== "medial-sigma" &&
            sigmaEndsWord(document, index, quotations)
        : options.greek?.finalSigma !== "medial" &&
          sigmaEndsWord(document, index, quotations))
      ? "ς"
      : ordinary;
  }
  // A variant of another letter, which only a document built by hand can
  // have (`validateDocument()` reports it), is not written.
  const variant = token.glyphVariant !== undefined &&
      Object.hasOwn(GLYPH_VARIANTS, token.glyphVariant) &&
      GLYPH_VARIANTS[token.glyphVariant].letter === token.letter
    ? GLYPH_VARIANTS[token.glyphVariant]
    : undefined;
  if (token.letter === "beta") {
    if (token.uppercase) return ordinary;
    switch (options.greek?.medialBeta) {
      case "symbol":
        return isGreekNumeralContext(document, index) ||
            isWordInitial(document, index)
          ? ordinary
          : "ϐ";
      case "standard":
        return ordinary;
      default:
        return variant?.symbol ?? ordinary;
    }
  }
  return variant?.symbol !== undefined &&
      variant.uppercase === token.uppercase &&
      options.greek?.symbolForms !== "standard" &&
      (token.glyphVariant !== "final-sigma-stigma" ||
        isNumeralUnits(document, index))
    ? variant.symbol
    : ordinary;
}

/**
 * The glyph that Greek output writes for the letter of `token` at `index`
 * under these options, as far as it depends on the token's glyph variant:
 * what the loss detector compares, so that a variant is lost only when the
 * options do not write it again from the text read back
 * (`docs/information-loss.md`). Case is left out, which `changed-case`
 * reports. The writers' `glyphForm` hook (see `codec.ts`).
 */
export function greekGlyphForm(
  document: Document,
  index: number,
  token: Grapheme,
  options: ConversionOptions,
  quotations: QuotationContext,
): string {
  return writtenLigature(document, index, options, token)?.greek ??
    greekGlyph(document, index, token, options, quotations);
}

/** {@link greekGlyphForm} for Beta Code output. */
export function betaCodeGlyphForm(
  document: Document,
  index: number,
  token: Grapheme,
  options: ConversionOptions,
  quotations: QuotationContext,
): string {
  return betaLigature(document, index, options, token)?.code ??
    (token.letter === "sigma"
      ? betaSigma(document, index, token, options, quotations)
      : "");
}

/** {@link greekGlyphForm} for transliteration output. */
export function transliterationGlyphForm(
  _document: Document,
  _index: number,
  token: Grapheme,
  options: ConversionOptions,
): string {
  return token.letter === "sigma" && rendersLunateC(token, options) ? "c" : "";
}

/**
 * The letters that Beta Code writes as a TLG `#` code (`#2`, stigma). Built
 * in an annotated function, as `BETA_SIGN_CODES` below: esbuild keeps a
 * `new Set()` whose argument calls functions, even annotated, in bundles
 * that write no Beta Code.
 */
const HASH_CODE_LETTERS: ReadonlySet<Letter> = /* @__PURE__ */ (() =>
  new Set(
    (Object.keys(ALPHABET) as Letter[]).filter((letter) =>
      ALPHABET[letter].beta.startsWith("#")
    ),
  ))();

/**
 * Whether the token at `index` is a letter written as a `#` code that the
 * digit after it extends into another code (`ϛ5` gives `#25`): read back, it
 * is text, and a sigma before it ends its word.
 */
function extendedByDigit(
  document: Document,
  index: number,
  options: ConversionOptions,
): boolean {
  const token = document[index];
  if (token?.kind !== "grapheme" || token.diacritics.size !== 0) return false;
  if (
    !HASH_CODE_LETTERS.has(token.letter) &&
    !(token.letter === "yot" && options.betaCode?.yot === "#401")
  ) return false;
  const next = document[index + 1];
  const unit = next?.kind === "literal" ? next.value.charCodeAt(0) : 0;
  return unit >= 0x30 && unit <= 0x39;
}

/**
 * The Beta Code of a sigma: `s3` for a lunate sigma, `s1` or `s2` for a
 * sigma whose noted shape (`σ` or `ς`) contradicts its place, kept under
 * `greek.finalSigma: "preserve"` (in a numeral, where a sigma is `σ`, the
 * final shape only), and `s` otherwise, whose shape the position decides.
 * Before a digit from 1 to 3, which would make a code of `s`, a small sigma
 * always takes its code, with the shape Greek output writes. A capital has
 * no shape, and the TLG defines no `*s1` or `*s2`; so a capital sigma
 * before `3` reads back as a lunate sigma.
 */
export function betaSigma(
  document: Document,
  index: number,
  token: Grapheme,
  options: ConversionOptions,
  quotations: QuotationContext,
): "s" | "s1" | "s2" | "s3" {
  if (writesLunateSigma(document, index, token, options)) return "s3";
  if (token.uppercase) return "s";
  const next = document[index + 1];
  const code = next?.kind === "literal" ? next.value.charCodeAt(0) : 0;
  const beforeDigit = code >= 0x31 && code <= 0x33;
  const numeral = isGreekNumeralContext(document, index);
  const policy = options.greek?.finalSigma ?? "preserve";
  // In a numeral, a sigma is `σ`; a final sigma there is kept, as Greek
  // output keeps it.
  const noted = policy === "preserve" &&
    (token.glyphVariant === "final-sigma" ||
      !numeral && token.glyphVariant === "medial-sigma");
  if (!noted && !beforeDigit) return "s";
  const ends = !numeral &&
    (sigmaEndsWord(document, index, quotations) ||
      extendedByDigit(document, index + 1, options));
  const final = noted
    ? token.glyphVariant === "final-sigma"
    : policy !== "medial" && ends;
  if (beforeDigit) return final ? "s2" : "s1";
  return final === ends ? "s" : final ? "s2" : "s1";
}

/**
 * Whether Greek output writes the iota subscript of `token` on the line, as a
 * letter after its vowel (`greek.iotaSubscript`). The iota is a capital among
 * capitals and in text set in capitals (`ΤΗΙ ΩΙΔΗΙ`), and small after a capital
 * that begins a word in lowercase, or stands alone (`Ὠιδῇ`, `Ἧι`): read back,
 * the two letters keep the case they were written with.
 */
/**
 * Whether a policy for the iota subscript writes it adscript at all.
 * encodeGreek() tests it once for the call before writesIotaAdscript(),
 * which starts with it.
 */
function adscriptUnder(
  policy: GreekOptions["iotaSubscript"] | undefined,
): policy is Exclude<GreekOptions["iotaSubscript"], "subscript" | undefined> {
  return policy !== undefined && policy !== "subscript";
}

function writesIotaAdscript(
  token: Grapheme,
  options: ConversionOptions,
): boolean {
  const policy = options.greek?.iotaSubscript;
  return adscriptUnder(policy) && token.diacritics.has("iota-subscript") &&
    (policy === "adscript" || token.uppercase);
}

/** The Beta Code of the signs that it writes with a code. */
const BETA_SIGN_CODES: ReadonlyMap<string, string> =
  /* @__PURE__ */ (() =>
    new Map([
      ...TLG_CODE_OF,
      [DEXIA_KERAIA, "#"],
      [ARISTERI_KERAIA, "#22"],
    ]))();

/** A code that a digit after it would extend: `%`, `#`, or one with digits. */
const EXTENDED_CODE = /[%#\d]$/;

/** Signs that the Beta Code reader reads as marks after a letter. */
const MARK_SIGNS = new Set(["(", ")", "/", "\\", "=", "+", "|"]);

/**
 * Whether Beta Code reads `sign`, written as itself after `previous` and
 * before `digits`, back as itself: a sign outside ASCII; `#` or `%` when it
 * makes with the digits a code read as text (`#25`), and no mark after a
 * letter (`%26`); `:` never, the ano teleia; and the other signs, except
 * those that are marks after a letter when they follow one.
 */
function readsBackAsItself(
  sign: string,
  previous: Token | undefined,
  digits: string,
): boolean {
  if (sign.charCodeAt(0) >= 0x80) return true;
  if (sign === ":") return false;
  if (sign === "#" || sign === "%") {
    const code = sign + digits;
    return isUnreadCode(code) &&
      !(previous?.kind === "grapheme" && isMarkCode(code));
  }
  return !MARK_SIGNS.has(sign) || previous?.kind !== "grapheme";
}

/** The digits that the literals from `start` begin with. */
function digitsFrom(document: Document, start: number): string {
  let digits = "";
  for (let index = start; index < document.length; index++) {
    const token = document[index];
    if (token.kind !== "literal") break;
    const match = /^\d*/.exec(token.value)![0];
    digits += match;
    if (match.length < token.value.length) break;
  }
  return digits;
}

/**
 * Puts `<` and `>` around each run of letters under an overline, as the TLG
 * writes it. The letters a ligature's code writes are one unit, under the
 * overline when its last one is, which bears its marks. Before a digit, `>`
 * would be another code: the overline is not written there.
 */
function writeOverlines(
  pieces: string[],
  rendered: Document,
  doc: Document,
  options: ConversionOptions,
  betaMarks: (token: Grapheme) => readonly Diacritic[],
): void {
  const overline = rendered.map((token) =>
    token.kind === "grapheme" && betaMarks(token).includes("overline")
  );
  // The last letter of the unit that each ligature begins.
  const lasts: number[] = [];
  for (let index = 0; index < rendered.length; index++) {
    const ligature = betaLigature(doc, index, options);
    if (ligature === undefined) continue;
    const last = index + ligature.length - 1;
    overline.fill(overline[last], index, last);
    lasts[index] = last;
    index = last;
  }
  const overlined = (index: number): boolean => overline[index] === true;
  for (let index = 0; index < rendered.length; index++) {
    const last = lasts[index] ?? index;
    if (overlined(last) && pieces[index] !== "") {
      let end = last + 1;
      while (overlined(end)) end++;
      if (digitsFrom(rendered, end) === "") {
        pieces[index] = (overlined(index - 1) ? "" : "<") + pieces[index] +
          (end === last + 1 ? ">" : "");
      }
    }
    index = last;
  }
}

/**
 * Writes Beta Code. With `written`, records the range of each token's output
 * (see `parsers/positions.ts`).
 */
export function encodeBetaCode(
  doc: Document,
  options: ConversionOptions = {},
  written?: WrittenPositions,
) {
  const rendered = prepareDiacriticsForRendering(
    applyMonotonicOrthography(doc, options),
    options,
    "beta-code",
  );
  const betaMarks = byMarks(
    (token) => marks(token, options, "beta-code"),
    BETA_MARKS(options),
  );
  // The codes of the marks, once for each set of marks: after a small
  // letter; before a capital, all but the iota subscript, then after it.
  const markCodes = byMarks(
    (token): BetaMarkCodes => {
      const kept = betaMarks(token);
      return {
        codes: kept.map((mark) => BETA_FOR[mark]).join(""),
        overline: kept.includes("overline"),
      };
    },
    BETA_MARK_CODES(options),
  );
  const capitalMarkCodes = byMarks(
    (token): readonly [string, string] => {
      const kept = betaMarks(token);
      return [
        kept.filter((mark) => mark !== "iota-subscript")
          .map((mark) => BETA_FOR[mark]).join(""),
        kept.includes("iota-subscript") ? "|" : "",
      ];
    },
    BETA_CAPITAL_CODES(options),
  );
  // Whether a letter keeps the overline, noted as the codes of its marks
  // are read.
  let overline = false;
  const uppercaseCodes = options.betaCode?.case === "uppercase";
  const yotCode = options.betaCode?.yot === "#401";
  const quotations: QuotationContext = {};
  // The letters after the first of a ligature, which its code writes.
  let ligatureEnd = 0;

  // The letter right before `index` in the output, where nothing comes
  // between them: `>` ends the overline of a letter that has one.
  const letterBefore = (index: number): Grapheme | undefined => {
    const previous = rendered[index - 1];
    return previous?.kind === "grapheme" &&
        !betaMarks(previous).includes("overline")
      ? previous
      : undefined;
  };

  const pieces = rendered.map((token, index) => {
    if (index < ligatureEnd) return "";
    if (token.kind === "literal") {
      // A space, the most frequent literal, is written as itself.
      if (token.value === " ") return " ";
      if (isKeptLetter(token)) return token.value;
      // A Latin letter reads back as the letter of Beta Code it spells, which
      // convertDetailed() reports: written in the case of the letters, it
      // converts to itself again.
      if (token.value.length === 1 && BY_BETA.has(token.value.toLowerCase())) {
        return uppercaseCodes
          ? token.value.toUpperCase()
          : token.value.toLowerCase();
      }
      const code = BETA_SIGN_CODES.get(token.value);
      // A spacing breathing kept apart from a capital stays apart.
      const apart = standsApart(rendered, index) ? ZWNJ : "";
      if (code === undefined) {
        // A code kept as text that reads as a mark after a letter (`%26`,
        // the macron) is written with the code of `%`, as the text it is.
        if (isMarkCode(token.value) && letterBefore(index) !== undefined) {
          return `%8${token.value.slice(1)}${apart}`;
        }
        return (encodePunctuation(token.value, "beta-code") ?? token.value) +
          apart;
      }
      if (apart !== "") return code + apart;
      // A digit after a code would extend it into another (`#1` is koppa,
      // `#12` the obelus): before one, a sign is written as itself where it
      // reads back as itself.
      if (!EXTENDED_CODE.test(code)) return code;
      const digits = digitsFrom(rendered, index + 1);
      return digits !== "" &&
          readsBackAsItself(token.value, letterBefore(index), digits)
        ? token.value
        : code;
    }
    const ligature = token.glyphVariant === undefined
      ? undefined
      : betaLigature(doc, index, options);
    if (ligature !== undefined) {
      // The code for the letters, with the marks of the last one.
      ligatureEnd = index + ligature.length;
      const codes = markCodes(rendered[ligatureEnd - 1] as Grapheme);
      if (codes.overline) overline = true;
      return ligature.code + codes.codes;
    }
    // The codes of the alphabet are small letters.
    const code = token.letter === "sigma"
      ? betaSigma(doc, index, token, options, quotations)
      : token.letter === "yot" && yotCode
      ? "#401"
      : ALPHABET[token.letter].beta;
    const base = uppercaseCodes ? code.toUpperCase() : code;

    const codes = markCodes(token);
    if (codes.overline) overline = true;
    if (!token.uppercase) return base + codes.codes;
    const [beforeLetter, afterLetter] = capitalMarkCodes(token);
    // A capital whose code a digit extends reads back as an asterisk before
    // another code: it is written so, as it reads back.
    const capital = extendedByDigit(doc, index, options) ? "%2" : "*";
    return `${capital}${beforeLetter}${base}${afterLetter}`;
  });
  // Every letter's marks are read above: the code of a ligature writes
  // those of its last one, and the others have none.
  if (overline) writeOverlines(pieces, rendered, doc, options, betaMarks);
  return written === undefined ? pieces.join("") : joinPieces(pieces, written);
}

/**
 * Writes transliteration. With `written`, records the range of each token's
 * output in the text assembled before NFC (see `parsers/positions.ts`).
 */
export function encodeTransliteration(
  doc: Document,
  options: ConversionOptions = {},
  written?: WrittenPositions,
) {
  const uppercaseOutput = options.text?.letterCase === "uppercase";
  const titleCase = options.text?.letterCase === "title";
  const rendered = prepareDiacriticsForRendering(
    applyMonotonicOrthography(doc, options),
    options,
    "transliteration",
  );
  const latinMarks = byMarks(
    (token) => marks(token, options, "transliteration"),
    LATIN_MARKS(options),
  );
  const preservesDiaeresis = preservesDiacritic(
    "diaeresis",
    options,
    "transliteration",
  );
  // Constant for the whole call: computed once, not at every token.
  const digraphs: DigraphPolicy = {
    muPi: options.transliteration?.muPi ?? "mp",
    nuTau: options.transliteration?.nuTau ?? "nt",
  };
  const rewritesDigraphs = digraphs.muPi !== "mp" || digraphs.nuTau !== "nt";
  const preservesRough = preservesDiacritic(
    "rough",
    options,
    "transliteration",
  );
  const preservesSmooth = preservesDiacritic(
    "smooth",
    options,
    "transliteration",
  );
  const smoothInPlace = preservesSmooth &&
    options.transliteration?.smoothBreathing === "greek";
  // The written marks of a token depend only on its marks, on whether it is
  // epsilon or omicron, or a sigma, on a separation diaeresis, and on
  // whether it follows an upsilon written v or f: memoized on those for
  // shared sets, as byMarks() does, across calls with the same options
  // (latinMarkStrings).
  const markStrings = latinMarkStrings(options);
  const circumflexReadsAsLength =
    options.transliteration?.circumflexAccent === "circumflex" &&
    options.transliteration?.longVowels !== "omit";
  const markString = (
    token: Grapheme,
    separation: boolean,
    consonant: boolean,
  ): string => {
    const shortVowel = token.letter === "epsilon" ||
      token.letter === "omicron";
    // A sigma, or a stigma or sampi, whose `c̄` and `s̄` the reader would
    // read with a circumflex U+0302 as part of the letter.
    const sigma = token.letter === "sigma" || token.letter === "stigma" ||
      token.letter === "sampi";
    const mask = sharedMask(token.diacritics);
    if (mask === undefined) {
      return writeLatinMarks(token, shortVowel, sigma, separation, consonant);
    }
    const key = mask << 4 | (sigma ? 8 : 0) | (consonant ? 4 : 0) |
      (shortVowel ? 2 : 0) | (separation ? 1 : 0);
    return markStrings[key] ??= writeLatinMarks(
      token,
      shortVowel,
      sigma,
      separation,
      consonant,
    );
  };
  const writeLatinMarks = (
    token: Grapheme,
    shortVowel: boolean,
    sigma: boolean,
    separation: boolean,
    consonant: boolean,
  ): string => {
    // The separation diaeresis takes the place a written one would, before
    // the accent (`ÿ́`), so that the output reads back as itself.
    const marked = separation && !token.diacritics.has("diaeresis")
      ? { ...token, diacritics: withDiacritic(token.diacritics, "diaeresis") }
      : token;
    // Latin `ē` and `ō` are eta and omega, so a quantity mark on epsilon or
    // omicron has no transliteration; convertDetailed() reports its removal.
    const tokenMarks = latinMarks(marked).filter(
      (mark) => !(mark === "macron" || mark === "breve") || !shortVowel,
    );
    const transliteratedMarks = tokenMarks
      .filter((mark) => mark !== "coronis")
      .map((mark) =>
        // Epsilon and omicron bear a circumflex only where the accent of the
        // upsilon of `ευ` moves to them (`y-with-ou-v-f`). Unless length marks
        // are omitted, `ê` and `ô` read back as eta and omega: the accent is
        // written as a tilde, which reads back as one. So is a circumflex on
        // a sigma, which no Greek has: `ŝ` and `ĉ` read back as sampi and
        // stigma, and `c̄̂` as a stigma without it.
        mark === "circumflex" &&
          (shortVowel && circumflexReadsAsLength || sigma)
          ? "\u0303"
          : trMark(mark, options)
      )
      .join("");
    // The Greek coronis U+1FBD reads back as one only right after a vowel;
    // after an upsilon written v or f, it is the apostrophe it reads as.
    const coronis = !tokenMarks.includes("coronis")
      ? ""
      : consonant && options.transliteration?.coronis === "greek"
      ? "\u2019"
      : trMark("coronis", options);
    return transliteratedMarks + coronis;
  };

  // Where the h of a rough breathing goes depends on the vowel group as it
  // reads back: under `longVowels: "omit"`, `ηἱ` is written like `εἱ`. The
  // eta of `ηυ` keeps its letter where the upsilon is written v or f
  // (ISO 843 Type 2): the pair is no vowel group in Latin, and the breathing
  // goes before it (`ηὔδα` → `’ívda`).
  // The group that starts a word is read back by initialBreathingTarget(),
  // the rest of the document only for the rough diphthongs.
  const upsilonRule = options.transliteration?.upsilon;
  const vowelUpsilonVF = upsilonRule === "y-with-ou-v-f";
  // The tests of options that every letter would make otherwise, made once
  // for the whole call.
  const separatesVowels = separatesUnder(upsilonRule);
  const bnfKeraia = options.transliteration?.keraia === "bnf";
  const lunateC = options.transliteration?.lunateSigma === "c";
  const systematicRho = options.transliteration?.rho === "systematic";
  const smoothApostrophe =
    options.transliteration?.smoothBreathing === "apostrophe";
  const coronisApostrophe = options.transliteration?.coronis === "apostrophe";
  const nasalGamma = options.transliteration?.nasalGamma;
  const writesNasalGamma = nasalGamma !== "literal";
  const nasalExceptKappa = nasalGamma === "nasal-except-kappa";
  const nasalMedialKappa = nasalGamma === "nasal-medial-kappa";
  // The Latin letter of each Greek one but upsilon, which depends on its
  // neighbors: from the options alone.
  const bases = LATIN_BASES(options);
  // The rough diphthongs inside a word, found once and only when a vowel
  // meets an iota or upsilon with a rough breathing: they are rare.
  let roughDiphthongs: Uint8Array | undefined;

  // The tokens are written in order, so whether a letter starts a word is
  // known from the ones before (isWordInitial): `afterLetter` tells whether
  // the last token that is not transparent to word boundaries is a letter,
  // and `wordStart` is the last grapheme that started a word, or -1 when a
  // letter kept as it was started it.
  let afterLetter = false;
  let wordStart = -1;
  // The apostrophes of the source, where ISO 843 writes a mark as one: they
  // are written once the text around them is (writeApostrophes).
  const apostropheMarks = smoothApostrophe || coronisApostrophe;
  let apostrophes: number[] | undefined;

  const pieces = rendered.map((token, index) => {
    if (token.kind === "literal") {
      // A space, the most frequent literal, ends a word and is written as
      // itself.
      if (token.value === " ") {
        afterLetter = false;
        return " ";
      }
      if (isKeptLetter(token)) {
        if (!afterLetter) wordStart = -1;
        afterLetter = true;
        return token.value;
      }
      if (!isBoundaryTransparent(token)) afterLetter = false;
      if (bnfKeraia) {
        if (token.value === DEXIA_KERAIA) {
          return bnfRightKeraia(options, rendered[index - 1]);
        }
        if (token.value === ARISTERI_KERAIA) return ",";
      }
      if (token.value === APOSTROPHE && apostropheMarks) {
        (apostrophes ??= []).push(index);
      }
      return (encodePunctuation(token.value, "transliteration", options) ??
        token.value) + (standsApart(rendered, index) ? ZWNJ : "");
    }

    if (!afterLetter) wordStart = index;
    afterLetter = true;

    if (rewritesDigraphs) {
      const modernDigraph = modernDigraphAt(doc, index, digraphs);
      if (modernDigraph !== undefined) {
        const second = doc[index + 1];
        return caseDigraph(modernDigraph, token, second);
      }
      if (modernDigraphAt(doc, index - 1, digraphs) !== undefined) return "";
    }

    if (
      token.letter === "sigma" &&
      token.glyphVariant === "lunate-sigma" &&
      lunateC
    ) {
      return token.uppercase ? "C" : "c";
    }

    const previous = doc[index - 1];
    const next = doc[index + 1];
    // initialBreathingStart() as the output reads back: a vowel that starts
    // a word, or the second vowel of a diphthong that starts one.
    const initialStart = wordStart === index
      ? (isVowel(token.letter) ? index : undefined)
      : wordStart === index - 1 &&
          initialBreathingTarget(
            rendered,
            doc,
            index - 1,
            options,
            vowelUpsilonVF,
          ) === index
      ? index - 1
      : undefined;
    // The h of a rough breathing is written only when the breathing is kept.
    const breathingStart = initialStart ??
      (preservesRough && meetsRoughIotaOrUpsilon(rendered, index)
        ? roughDiphthongStart(
          roughDiphthongs ??= findRoughDiphthongs(
            options.transliteration?.longVowels === "omit"
              ? readBackBeforeBreathings(rendered, doc, options, vowelUpsilonVF)
              : rendered,
            doc,
            options,
            preservesSmooth,
            digraphs,
          ),
          index,
        )
        : undefined);
    // The breathing of a rough diphthong inside a word is on its second vowel.
    const breathingIndex = breathingStart === undefined
      ? undefined
      : initialStart === undefined
      ? breathingStart + 1
      : initialBreathingTarget(
        rendered,
        doc,
        breathingStart,
        options,
        vowelUpsilonVF,
      );
    const breathingToken = breathingIndex === undefined
      ? undefined
      : rendered[breathingIndex];
    const initialRough = preservesRough &&
      breathingToken?.kind === "grapheme" &&
      breathingToken.diacritics.has("rough");
    const initialSmooth = preservesSmooth &&
      breathingToken?.kind === "grapheme" &&
      breathingToken.diacritics.has("smooth");
    const groupStart = breathingStart === undefined
      ? undefined
      : rendered[breathingStart];
    const groupUppercase = initialRough && groupStart !== undefined &&
      (groupStart.kind === "grapheme" && groupStart.uppercase ||
        breathingToken.uppercase);
    // A Greek capital whose Latin spelling has several letters is written in
    // full capitals among capitals (`ΘΑΛΑΣΣΑ` → `THALASSA`, `ἙΛΛΑΣ` →
    // `HELLAS`) or on its own (`Θ` → `TH`), and with its first letter only
    // before lowercase text or a period (`Θάλασσα` → `Thálassa`, `Θ.` →
    // `Th.`). A rough-breathing group is capitalized as a whole: every
    // letter of it must be uppercase; on its own, it is a word, such as the
    // article at the head of a sentence (`Ὁ δὲ` → `Ho dè`). Title case asks
    // for the first letter only.
    const capitals = uppercaseOutput ||
      (groupUppercase
        ? groupStart?.kind === "grapheme" && groupStart.uppercase &&
          breathingToken.uppercase &&
          isAmongCapitals(doc, breathingIndex!)
        : token.uppercase &&
          (isAmongCapitals(doc, index) ||
            !titleCase && standsAlone(doc, index)));
    const h = capitals ? "H" : "h";
    let base = token.letter === "upsilon"
      ? transliterationBase(doc, index, token.letter, options)
      : token.letter === "gamma" && writesNasalGamma &&
          isNasalGamma(doc, index, nasalExceptKappa) &&
          !(nasalMedialKappa && isEdgeGammaKappa(doc, index))
      ? "n"
      : latinBase(bases, token.letter, options);
    const bnfLowercaseNumeral = bnfKeraia &&
      token.uppercase &&
      (token.letter === "stigma" || token.letter === "sampi") &&
      bnfNumeralReadsBack(doc, index, options);
    if (
      token.uppercase && !bnfLowercaseNumeral &&
      (!groupUppercase || capitals)
    ) {
      base = capitals
        ? base.toUpperCase()
        : base[0].toUpperCase() + base.slice(1);
    }
    if (
      initialSmooth && index === breathingStart && smoothApostrophe
    ) base = "\u2019" + base;
    // Whether an `h` stands right before this vowel, which then reads back
    // with a rough breathing.
    let hBefore = false;
    if (initialRough && index === breathingStart) {
      base = (groupUppercase ? "H" : "h") +
        (capitals ? base.toUpperCase() : base.toLowerCase());
      hBefore = true;
    } else if (token.letter === "rho" && systematicRho) {
      if (next?.kind !== "grapheme" || next.letter !== "rho") base += h;
    } else if (
      preservesRough &&
      token.diacritics.has("rough") && index !== breathingIndex
    ) {
      if (token.letter === "rho") base += h;
      else if (token.uppercase) {
        base = "H" + (capitals ? base.toUpperCase() : base.toLowerCase());
        hBefore = true;
      } else {
        base = "h" + base;
        hBefore = true;
      }
    } else if (
      token.letter === "rho" &&
      previous?.kind === "grapheme" &&
      previous.letter === "rho"
    ) {
      base += h;
    }
    // A diaeresis and a breathing never share a vowel: none is written where
    // the vowel reads back with one (ὑἱός: `hyhiós`).
    // Only an iota or an upsilon takes one, under a contextual rule for
    // upsilon: tested here with the predicates writesSeparationDiaeresis()
    // starts with, the call is made for few letters.
    const separation = separatesVowels && takesSeparation(token.letter) &&
      writesSeparationDiaeresis(doc, index, options) &&
      preservesDiaeresis && !hBefore &&
      !(smoothInPlace && token.diacritics.has("smooth"));

    return base +
      markString(
        (vowelUpsilonVF && transferredAccents(rendered, index, options)) ||
          token,
        separation,
        vowelUpsilonVF && token.letter === "upsilon" &&
          isVowelUpsilonAt(doc, index - 1),
      );
  });
  if (apostrophes !== undefined) {
    writeApostrophes(pieces, rendered, apostrophes, options);
  }
  return (written === undefined ? pieces.join("") : joinPieces(pieces, written))
    .normalize("NFC");
}

/**
 * The rough diphthongs inside a word (roughDiphthongStarts), as the output
 * reads them back.
 */
function findRoughDiphthongs(
  readBack: Document,
  doc: Document,
  options: ConversionOptions,
  preservesSmooth: boolean,
  digraphs: DigraphPolicy,
): Uint8Array {
  const starts = roughDiphthongStarts(
    marksAsReadBack(readBack, doc, options, preservesSmooth, digraphs),
  );
  // Under ISO 843 Type 2, `ωυ` is written letter by letter (`oy`) and read
  // back so: it is no diphthong whose `h` goes before it.
  if (
    options.transliteration?.upsilon === "y-with-ou-v-f" &&
    options.transliteration?.longVowels === "omit"
  ) {
    for (let index = 0; index < starts.length; index++) {
      const token = doc[index];
      const next = doc[index + 1];
      if (
        starts[index] === 1 && token.kind === "grapheme" &&
        token.letter === "omega" && next?.kind === "grapheme" &&
        next.letter === "upsilon"
      ) starts[index] = 0;
    }
  }
  // A coronis written as an apostrophe after the first vowel splits the pair
  // (splitByCoronis): the second vowel keeps its own `h`.
  if (options.transliteration?.coronis === "apostrophe") {
    for (let index = 0; index < starts.length; index++) {
      const token = readBack[index];
      if (
        starts[index] === 1 && token.kind === "grapheme" &&
        splitByCoronis(token, options)
      ) starts[index] = 0;
    }
  }
  return starts;
}

/**
 * The Latin mark strings already written for shared diacritic sets, under
 * the options they depend on: how transliteration writes the circumflex, the
 * smooth breathing, and the coronis (trMark), and whether it omits length
 * marks, under which a circumflex on epsilon or omicron is an accent and not
 * eta or omega (writeLatinMarks). Which marks it keeps does not enter the
 * key: prepareDiacriticsForRendering() has removed the others from the
 * tokens, whose sets are the rest of the key, and a separation diaeresis is
 * added only where diaereses are kept. Kept across calls, since a short text
 * has few tokens to share one call's strings: for each sealed profile, and
 * by key for other options (`perKey()`); the options are resolved, so there
 * are at most 36 keys.
 */
const latinMarkStrings = perKey(
  (options) => {
    const transliteration = options.transliteration;
    return transliteration?.circumflexAccent + " " +
      transliteration?.smoothBreathing + " " + transliteration?.coronis +
      (transliteration?.longVowels === "omit" ? " omit" : "");
  },
  (): (string | undefined)[] => [],
);

/** Whether a sigma is written `c` (`lunateSigma: "c"`). */
function rendersLunateC(token: Grapheme, options: ConversionOptions): boolean {
  return token.glyphVariant === "lunate-sigma" &&
    options.transliteration?.lunateSigma === "c";
}

/**
 * Whether Greek and Beta Code output write `token`, a sigma, as a lunate
 * sigma: where the source notes one under `"preserve"`, numerals included,
 * and everywhere but in numerals under `"lunate"`.
 */
function writesLunateSigma(
  document: Document,
  index: number,
  token: Pick<Grapheme, "glyphVariant">,
  options: ConversionOptions,
): boolean {
  const policy = options.greek?.sigma ?? "preserve";
  return policy === "preserve"
    ? token.glyphVariant === "lunate-sigma"
    : policy === "lunate" && !isGreekNumeralContext(document, index);
}

/**
 * The single Latin letter for `μπ` or `ντ` starting at `index`, under the
 * `muPi` and `nuTau` policies, or undefined when they are written letter by
 * letter.
 */
/** The `muPi` and `nuTau` policies, read once per encoding call. */
interface DigraphPolicy {
  muPi: MuPiTransliteration;
  nuTau: NuTauTransliteration;
}

function modernDigraphAt(
  document: Document,
  index: number,
  { muPi, nuTau }: DigraphPolicy,
): string | undefined {
  if (index < 0) return undefined;

  const first = document[index];
  const second = document[index + 1];
  if (
    first?.kind !== "grapheme" ||
    second?.kind !== "grapheme" ||
    !(first.letter === "mu" && second.letter === "pi" && muPi !== "mp" ||
      first.letter === "nu" && second.letter === "tau" && nuTau !== "nt") ||
    first.diacritics.size > 0 ||
    second.diacritics.size > 0 ||
    // Checked last: the numeral context is the costly test, and most pairs
    // of letters are not a digraph at all.
    isGreekNumeralContext(document, index)
  ) {
    return undefined;
  }

  const initial = isWordInitial(document, index) &&
    !followsCoronisApostrophe(document, index);
  if (first.letter === "mu") {
    // ISO 843 Type 2, notes 5 to 7: b at either end of the word, mp inside.
    return initial ||
        muPi === "b-initial-final" && isWordFinal(document, index + 1)
      ? "b"
      : undefined;
  }
  if (!initial) return undefined;
  return nuTau === "d-underline-initial" ? "d\u0332" : "d";
}

/**
 * Under `nasalGamma: "nasal-medial-kappa"` (ALA-LC), `γκ` at the beginning or
 * end of a word keeps a literal `g`: `gk`, and `nk` inside the word.
 */
function isEdgeGammaKappa(document: Document, index: number): boolean {
  const first = document[index];
  const second = document[index + 1];
  return first?.kind === "grapheme" && first.letter === "gamma" &&
    second?.kind === "grapheme" && second.letter === "kappa" &&
    first.diacritics.size === 0 && second.diacritics.size === 0 &&
    !isGreekNumeralContext(document, index) &&
    (isWordInitial(document, index) &&
        !followsCoronisApostrophe(document, index) ||
      isWordFinal(document, index + 1));
}

function caseDigraph(
  value: string,
  first: Grapheme,
  second: Document[number] | undefined,
): string {
  if (!first.uppercase) return value;
  if (second?.kind === "grapheme" && second.uppercase) {
    return value.toUpperCase();
  }
  return value[0].toUpperCase() + value.slice(1);
}

/**
 * The Latin letter of each Greek letter but upsilon under the options, which
 * transliterationBase() writes from the options alone: filled as the letters
 * come, and kept across calls for a sealed profile.
 */
const LATIN_BASES = perProfile(() => new Map<Grapheme["letter"], string>());

/**
 * transliterationBase() for a letter but upsilon, kept in `bases`. The empty
 * document stands for one that only upsilon reads.
 */
function latinBase(
  bases: Map<Grapheme["letter"], string>,
  letter: Grapheme["letter"],
  options: ConversionOptions,
): string {
  let base = bases.get(letter);
  if (base === undefined) {
    base = transliterationBase([], 0, letter, options);
    bases.set(letter, base);
  }
  return base;
}

function transliterationBase(
  document: Document,
  index: number,
  letter: Grapheme["letter"],
  options: ConversionOptions,
): string {
  switch (letter) {
    case "archaic-koppa":
      return options.transliteration?.archaicKoppa === "q"
        ? "q"
        : ALPHABET[letter].tr;
    case "beta":
      return options.transliteration?.beta ?? "b";
    case "xi":
      return options.transliteration?.xi ?? "x";
    case "phi":
      return options.transliteration?.phi ?? "ph";
    case "chi":
      return options.transliteration?.chi ?? "ch";
  }

  if (letter === "upsilon") {
    switch (options.transliteration?.upsilon) {
      case "y":
        return "y";
      case "y-with-ou-v-f": {
        if (isVowelUpsilonAt(document, index - 1)) {
          return precedesVoicedSound(document, index) ? "v" : "f";
        }
        // Table 2 lists `ου` but not `ωυ`, which note 8 converts letter by
        // letter: `oy`, read back as omega and upsilon. A numeral is written
        // as it reads back (`ωυʹ` like `ουʹ`), since its letters are digits.
        const previous = document[index - 1];
        return previous?.kind === "grapheme" &&
            (previous.letter === "omicron" ||
              readBackLetter(previous, options) === "omicron" &&
                isGreekNumeralContext(document, index - 1)) &&
            !splitByCoronis(previous, options) &&
            isDiphthongAt(document, index - 1)
          ? "u"
          : "y";
      }
      case "y-with-au-eu-ou":
        return isDiphthongAt(document, index - 1) &&
            readsBack(document, index - 1, options, isAuEuOuAt)
          ? "u"
          : "y";
      case "y-with-diphthong-u":
        return isDiphthongAt(document, index - 1) &&
              readsBack(document, index - 1, options, isDiphthongAt) ||
            isDiphthongAt(document, index) &&
              readsBack(document, index, options, isDiphthongAt)
          ? "u"
          : "y";
      default:
        return "u";
    }
  }

  let base: string;
  switch (letter) {
    case "eta":
      base = options.transliteration?.eta === "i" ? "i" : "e";
      break;
    case "omega":
      base = "o";
      break;
    case "stigma":
      base = "c";
      break;
    case "sampi":
      base = "s";
      break;
    default:
      return ALPHABET[letter].tr;
  }

  switch (options.transliteration?.longVowels) {
    case "circumflex":
      return `${base}\u0302`;
    case "omit":
      // Stigma and sampi keep the macron that tells them from c and s.
      return letter === "eta" || letter === "omega" ? base : `${base}\u0304`;
    default:
      return `${base}\u0304`;
  }
}

const ACCENTS: readonly Diacritic[] = ["acute", "grave", "circumflex"];

/**
 * The BnF right keraia after `previous`: an acute on its letter, or the Greek
 * keraia, which the reader also reads as one, where the acute would not read
 * back as the keraia: when acute accents are removed, since it would then go
 * as an accent, and after anything but a letter without an accent, where it
 * would be a second accent (`ίʹ`, `í́`) or stand on no letter.
 */
function bnfRightKeraia(
  options: ConversionOptions,
  previous: Token | undefined,
): string {
  return preservesDiacritic("acute", options, "transliteration") &&
      previous?.kind === "grapheme" &&
      !ACCENTS.some((accent) => previous.diacritics.has(accent))
    ? "\u0301"
    : DEXIA_KERAIA;
}

/**
 * Whether the BnF numeral of the stigma or sampi at `index` reads back as a
 * numeral, so that the letter can be written small, as BnF prescribes, and
 * stay so when the output is converted again. The comma of the left keraia
 * reads back as one before `c̄` and `s̄`. The right keraia must read back as
 * one: an acute does on a consonant, but reads back as an accent on a vowel.
 */
function bnfNumeralReadsBack(
  document: Document,
  index: number,
  options: ConversionOptions,
): boolean {
  const previous = document[index - 1];
  if (previous?.kind === "literal" && previous.value === ARISTERI_KERAIA) {
    return true;
  }
  let last: Token | undefined;
  for (let i = index; i < document.length; i++) {
    const token = document[i];
    if (token.kind === "grapheme") {
      last = token;
      continue;
    }
    if (isBoundaryTransparent(token)) continue;
    return token.value === DEXIA_KERAIA && last?.kind === "grapheme" &&
      (!isVowel(last.letter) || bnfRightKeraia(options, last) === DEXIA_KERAIA);
  }
  return false;
}

/**
 * Under `upsilon: "y-with-ou-v-f"`, the accent of the upsilon of `αυ`, `ευ`,
 * `ηυ`, written `v` or `f`, moves to the preceding vowel (ISO 843, note 10:
 * `Εύβοια` → `Évvoia`). Returns the token whose marks are written at `index`
 * when they differ from its own, or undefined.
 */
function transferredAccents(
  rendered: Document,
  index: number,
  options: ConversionOptions,
): Grapheme | undefined {
  if (options.transliteration?.upsilon !== "y-with-ou-v-f") return undefined;
  const token = rendered[index];
  if (token.kind !== "grapheme") return undefined;
  // Only an upsilon, or the vowel before one, can change its marks.
  const next = rendered[index + 1];
  const beforeUpsilon = next?.kind === "grapheme" && next.letter === "upsilon";
  if (token.letter !== "upsilon" && !beforeUpsilon) return undefined;
  if (token.letter === "upsilon" && isVowelUpsilonAt(rendered, index - 1)) {
    let diacritics = token.diacritics;
    for (const accent of ACCENTS) {
      diacritics = withoutDiacritic(diacritics, accent);
    }
    return diacritics === token.diacritics
      ? undefined
      : { ...token, diacritics };
  }
  if (beforeUpsilon && isVowelUpsilonAt(rendered, index)) {
    let diacritics = token.diacritics;
    for (const accent of ACCENTS) {
      if (next.diacritics.has(accent)) {
        diacritics = withDiacritic(diacritics, accent);
      }
    }
    return diacritics === token.diacritics
      ? undefined
      : { ...token, diacritics };
  }
  return undefined;
}

function trMark(mark: Diacritic, options: ConversionOptions) {
  switch (mark) {
    case "acute":
      return "\u0301";
    case "grave":
      return "\u0300";
    case "circumflex":
      return options.transliteration?.circumflexAccent === "circumflex"
        ? "\u0302"
        : "\u0303";
    case "smooth":
      return options.transliteration?.smoothBreathing === "greek"
        ? "\u0313"
        : "";
    case "diaeresis":
      return "\u0308";
    case "iota-subscript":
      return "\u0327";
    case "macron":
      return "\u0304";
    case "breve":
      return "\u0306";
    case "overline":
      return "\u0305";
    case "coronis":
      switch (options.transliteration?.coronis) {
        case "apostrophe":
          return "\u2019";
        case "greek":
          return "\u1FBD";
        default:
          return "";
      }
    default:
      return "";
  }
}

/**
 * Whether a vowel is an iota written like eta: under `eta: "i"` with the
 * default `longVowels: "macron"`, eta is `ī`, and so is an iota whose macron
 * is kept (`ῑ`), which reads back as eta.
 */
function writtenAsEta(token: Grapheme, options: ConversionOptions): boolean {
  const longVowels = options.transliteration?.longVowels;
  return token.letter === "iota" && token.diacritics.has("macron") &&
    options.transliteration?.eta === "i" && longVowels !== "omit" &&
    longVowels !== "circumflex" &&
    preservesDiacritic("macron", options, "transliteration");
}

/**
 * The letter a vowel reads back as. Under `longVowels: "omit"`, eta and omega
 * are written like epsilon (or iota, under `eta: "i"`) and omicron; with an
 * iota subscript they keep their letter, which only they can bear.
 */
function readBackLetter(token: Grapheme, options: ConversionOptions): Letter {
  if (
    options.transliteration?.longVowels !== "omit" ||
    token.diacritics.has("iota-subscript")
  ) return token.letter;
  if (token.letter === "omega") return "omicron";
  if (token.letter === "eta") {
    return options.transliteration?.eta === "i" ? "iota" : "epsilon";
  }
  return token.letter;
}

/**
 * breathingTarget() for the vowel group that starts a word at `start`, with
 * its two letters as they read back (readBackBeforeBreathings): only these
 * two are read, so that the whole document need not be.
 */
function initialBreathingTarget(
  rendered: Document,
  doc: Document,
  start: number,
  options: ConversionOptions,
  vowelUpsilonVF: boolean,
): number {
  if (options.transliteration?.longVowels !== "omit") {
    return breathingTarget(rendered, start);
  }
  // Under ISO 843 Type 2, `ωυ` is written letter by letter (`oy`) and read
  // back so: it is no diphthong that carries the breathing.
  const head = rendered[start];
  const next = rendered[start + 1];
  if (
    vowelUpsilonVF && head?.kind === "grapheme" && head.letter === "omega" &&
    next?.kind === "grapheme" && next.letter === "upsilon"
  ) return start;
  const first = readBackInitial(rendered, doc, start, options, vowelUpsilonVF);
  const second = readBackInitial(
    rendered,
    doc,
    start + 1,
    options,
    vowelUpsilonVF,
  );
  if (first === rendered[start] && second === rendered[start + 1]) {
    return breathingTarget(rendered, start);
  }
  const pair: Token[] = second === undefined ? [first] : [first, second];
  return start + breathingTarget(pair, 0);
}

/**
 * The token at `index`, among the first two letters of a word, as
 * readBackBeforeBreathings() gives it.
 */
function readBackInitial(
  rendered: Document,
  doc: Document,
  index: number,
  options: ConversionOptions,
  vowelUpsilonVF: boolean,
): Token {
  const token = rendered[index];
  if (
    token?.kind !== "grapheme" ||
    token.letter !== "eta" && token.letter !== "omega"
  ) return token;
  const letter = readBackLetter(token, options);
  if (
    letter === token.letter || vowelUpsilonVF && isVowelUpsilonAt(doc, index)
  ) {
    return token;
  }
  return { ...token, letter };
}

/**
 * `rendered` with the eta and omega on which the place of a breathing depends
 * as they read back (readBackLetter): those among the first two letters of a
 * word, and those before a vowel with a rough breathing. Copied only if one
 * changes.
 */
function readBackBeforeBreathings(
  rendered: Document,
  doc: Document,
  options: ConversionOptions,
  vowelUpsilonVF: boolean,
): Document {
  let copy: Token[] | undefined;
  for (let index = 0; index < rendered.length; index++) {
    const token = rendered[index];
    if (
      token.kind !== "grapheme" ||
      token.letter !== "eta" && token.letter !== "omega"
    ) continue;
    const letter = readBackLetter(token, options);
    if (letter === token.letter) continue;
    const next = rendered[index + 1];
    if (
      !isWordInitial(rendered, index) && !isWordInitial(rendered, index - 1) &&
      !(next?.kind === "grapheme" && next.diacritics.has("rough"))
    ) continue;
    if (vowelUpsilonVF && isVowelUpsilonAt(doc, index)) continue;
    copy ??= rendered.slice();
    copy[index] = { ...token, letter };
  }
  return copy ?? rendered;
}

/**
 * Whether the letter at `index` is, or comes right before, an iota or upsilon
 * with a rough breathing: only then can it belong to a rough diphthong inside
 * a word. Called for every letter, so it compares letters before marks.
 */
function meetsRoughIotaOrUpsilon(document: Document, index: number): boolean {
  const token = document[index] as Grapheme;
  if (isRoughIotaOrUpsilon(token)) return true;
  const next = document[index + 1];
  return next !== undefined && next.kind === "grapheme" &&
    isRoughIotaOrUpsilon(next);
}

function isRoughIotaOrUpsilon(token: Grapheme): boolean {
  return (token.letter === "iota" || token.letter === "upsilon") &&
    token.diacritics.has("rough");
}

/**
 * `document` with the marks that tell a hiatus from a diphthong as the output
 * reads them back, for the rough diphthongs inside a word:
 * - a smooth breathing is not read back unless written in place
 *   (`smoothBreathing: "greek"`);
 * - nor a rough breathing whose `h` forms a digraph with the consonant before
 *   it (`τἁ` → `tha`, read as θα).
 * Copied only if one changes.
 */
function marksAsReadBack(
  document: Document,
  doc: Document,
  options: ConversionOptions,
  preservesSmooth: boolean,
  digraphs: DigraphPolicy,
): Document {
  const smoothInPlace = preservesSmooth &&
    options.transliteration?.smoothBreathing === "greek";
  let copy: Token[] | undefined;
  for (let index = 0; index < document.length; index++) {
    const token = document[index];
    if (token.kind !== "grapheme" || !isVowel(token.letter)) continue;
    let diacritics = token.diacritics;
    if (diacritics.has("smooth") && !smoothInPlace) {
      diacritics = withoutDiacritic(diacritics, "smooth");
    }
    if (
      diacritics.has("rough") && mergesWithH(doc, index - 1, options, digraphs)
    ) diacritics = withoutDiacritic(diacritics, "rough");
    if (diacritics === token.diacritics) continue;
    copy ??= document.slice();
    copy[index] = { ...token, diacritics };
  }
  return copy ?? document;
}

/**
 * Whether the consonant at `index` and the `h` of a rough breathing after it
 * read back as one letter: `th` (θ), `ph` (φ, except under `phi: "f"`), `rh`
 * (ῥ), `kh` under `chi: "kh"` (χ, except after a gamma written `g`), and the
 * lunate `c` under `lunateSigma: "c"` with the default `chi` (`ch`, χ).
 */
function mergesWithH(
  doc: Document,
  index: number,
  options: ConversionOptions,
  digraphs: DigraphPolicy,
): boolean {
  const token = doc[index];
  if (token?.kind !== "grapheme") return false;
  const transliteration = options.transliteration;
  switch (token.letter) {
    case "tau":
    case "pi":
      // A consonant written within one Latin letter (μπ as `b`, ντ as `d`)
      // has no `t` or `p` of its own.
      if (modernDigraphAt(doc, index - 1, digraphs) !== undefined) return false;
      return token.letter === "tau" || transliteration?.phi !== "f";
    case "rho":
      return true;
    case "kappa": {
      if (transliteration?.chi !== "kh") return false;
      const previous = doc[index - 1];
      return !(previous?.kind === "grapheme" && previous.letter === "gamma" &&
        (transliteration.nasalGamma === "nasal-except-kappa" ||
          transliteration.nasalGamma === "nasal-medial-kappa"));
    }
    case "sigma":
      return rendersLunateC(token, options) && transliteration?.chi !== "kh";
    default:
      return false;
  }
}

/**
 * Whether `test` holds for the pair at `start` as it reads back: its first
 * vowel as readBackLetter gives it, and no pair at all when a coronis written
 * as an apostrophe after the first vowel stands between the two
 * (splitByCoronis). The pair is copied only when its letter reads back
 * differently, which happens only when long vowels are omitted.
 */
function readsBack(
  document: Document,
  start: number,
  options: ConversionOptions,
  test: (document: Document, start: number) => boolean,
): boolean {
  const first = document[start];
  const second = document[start + 1];
  if (
    first?.kind !== "grapheme" || second === undefined ||
    splitByCoronis(first, options)
  ) return false;
  const letter = readBackLetter(first, options);
  return letter === first.letter
    ? test(document, start)
    : test([{ ...first, letter }, second], 0);
}

/** The modifier letter apostrophe, which every reader reads as one. */
const MODIFIER_APOSTROPHE = "\u02BC";

/**
 * Writes U+02BC for each apostrophe of the source that would read back as
 * the smooth breathing or the coronis ISO 843 writes as U+2019: at the start
 * of a word, before a vowel (`smoothBreathing: "apostrophe"`), or after a
 * vowel that may bear a coronis (takesCoronisApostrophe()), before a letter
 * other than the `h` of a rough breathing (`coronis: "apostrophe"`). U+02BC
 * reads back as the apostrophe it is.
 *
 * The test is made from the last apostrophe, since one may follow another,
 * and on the text written around it, as the reader sees it: whether a vowel
 * is written as one, an `h` before the next. Whether that text is a letter,
 * and the breathings of the vowel group, are taken from the document, which
 * the text reads back as but for letters kept as they were.
 */
function writeApostrophes(
  pieces: string[],
  document: Document,
  apostrophes: readonly number[],
  options: ConversionOptions,
): void {
  const transliteration = options.transliteration;
  const smoothApostrophe = transliteration?.smoothBreathing === "apostrophe";
  const coronisApostrophe = transliteration?.coronis === "apostrophe";
  const lunateC = transliteration?.lunateSigma === "c";
  for (let rank = apostrophes.length - 1; rank >= 0; rank--) {
    const index = apostrophes[rank];
    if (pieces[index][0] !== APOSTROPHE) continue;
    let before = index - 1;
    while (before >= 0 && pieces[before] === "") before--;
    let after = index + 1;
    while (after < pieces.length && pieces[after] === "") after++;
    const previous = document[before];
    const written = before < 0 ? "" : pieces[before];
    const next = baseLetter(pieces[after]);
    // The smooth breathing starts a word: not after a letter and its marks.
    let letter = before;
    while (isBoundaryTransparent(document[letter])) letter--;
    const marks = previous?.kind !== "grapheme"
      ? smoothApostrophe && document[letter]?.kind !== "grapheme" &&
        LATIN_VOWEL.test(next)
      : written.endsWith(APOSTROPHE)
      // After the apostrophe of a coronis, U+02BC lets it read back as one;
      // where it cannot, it reads as an apostrophe, which this one follows.
      ? coronisApostrophe &&
          takesCoronis(
            document,
            pieces,
            before,
            written.slice(0, -1),
            options,
          ) ||
        smoothApostrophe && LATIN_VOWEL.test(next)
      : coronisApostrophe &&
        takesCoronis(document, pieces, before, written, options) &&
        (next === MODIFIER_APOSTROPHE ||
          document[after]?.kind === "grapheme" &&
            startsLetter(pieces[after], lunateC));
    if (marks) pieces[index] = MODIFIER_APOSTROPHE + pieces[index].slice(1);
  }
}

const LATIN_VOWEL = /^[aeiouy]$/i;

/**
 * Whether `text` starts with a letter that the reader reads as one, but the
 * `h` of a rough breathing: `c` starts one in `ch`, as a stigma with its mark
 * after it, or as a lunate sigma under `lunateSigma: "c"`.
 */
function startsLetter(text: string, lunateC: boolean): boolean {
  const decomposed = text.normalize("NFD");
  return /^[abd-gi-z]/i.test(decomposed) ||
    /^c(?:h|\u0302|\u0304)/i.test(decomposed) ||
    lunateC && /^c/i.test(decomposed);
}

/** The first character of `text` without its marks. */
function baseLetter(text: string | undefined): string {
  return text?.normalize("NFD")[0] ?? "";
}

/** The last letter of `text` without its marks. */
function lastLetter(text: string): string {
  return text.normalize("NFD").replace(/\p{M}+$/u, "").slice(-1);
}

/**
 * Whether an apostrophe after the letter at `index`, written `written`,
 * reads back as its coronis before a letter, as the reader tells it
 * (takesCoronisApostrophe()): after a vowel whose run of vowels follows a
 * consonant and bears no breathing, nor a coronis before it, each letter as
 * the text reads back. An upsilon written `v` or `f` reads back as a vowel
 * where beta and phi are not written so, or after the `ê` that takes its
 * circumflex (ISO 843 Type 2).
 */
function takesCoronis(
  document: Document,
  pieces: readonly string[],
  index: number,
  written: string,
  options: ConversionOptions,
): boolean {
  const transliteration = options.transliteration;
  const vowelUpsilonVF = transliteration?.upsilon === "y-with-ou-v-f";
  const upsilonLetters = !vowelUpsilonVF
    ? ""
    : (transliteration.beta === "v" ? "" : "v") +
      (transliteration.phi === "f" ? "" : "f");
  const movedCircumflex = vowelUpsilonVF &&
    transliteration.longVowels === "omit" && transliteration.eta === "i";
  for (let at = index; at >= 0; at--) {
    const token = document[at];
    if (isBoundaryTransparent(token)) continue;
    if (token.kind !== "grapheme") return false;
    if (at < index && token.diacritics.has("coronis")) return false;
    const letter = lastLetter(at === index ? written : pieces[at])
      .toLowerCase();
    const vowel = isVowel(token.letter) &&
      (LATIN_VOWEL.test(letter) ||
        token.letter === "upsilon" && (letter === "v" || letter === "f") &&
          (upsilonLetters.includes(letter) ||
            movedCircumflex && at > 0 &&
              /e\p{M}*\u0302\p{M}*$/iu.test(pieces[at - 1].normalize("NFD"))));
    if (!vowel) {
      // A consonant written as one the reader reads (`ç̄` is not).
      let piece = at;
      while (piece > 0 && pieces[piece] === "") piece--;
      return at < index &&
        startsLetter(pieces[piece], transliteration?.lunateSigma === "c");
    }
    if (
      token.diacritics.has("smooth") ||
      token.diacritics.has("rough") &&
        roughReadsBack(document, pieces, at, options)
    ) return false;
  }
  return false;
}

/**
 * Whether the reader reads the rough breathing of the vowel at `index`: its
 * `h`, which starts the piece of the vowel or of the group it ends, does not
 * join the consonant before into a letter, as `th`, `ph` (but under
 * `phi: "f"`), `ch` (but where `ch` is a lunate sigma and a rough
 * breathing), `kh` (under `chi: "kh"`), or `rh`, a rough rho.
 */
function roughReadsBack(
  document: Document,
  pieces: readonly string[],
  index: number,
  options: ConversionOptions,
): boolean {
  const transliteration = options.transliteration;
  const khChi = transliteration?.chi === "kh";
  const joining = "tr" + (transliteration?.phi === "f" ? "" : "p") +
    (khChi ? "k" : "") +
    (khChi && transliteration.lunateSigma === "c" ? "" : "c");
  for (let at = index; at >= 0; at--) {
    if (/^h/i.test(pieces[at])) {
      let before = at - 1;
      while (before >= 0 && pieces[before] === "") before--;
      // A mark after the consonant parts it from the `h` (`c̄h`).
      return before < 0 ||
        !joining.includes(
          pieces[before].normalize("NFD").slice(-1).toLowerCase(),
        );
    }
    const token = document[at];
    if (token.kind !== "grapheme" || !isVowel(token.letter)) return false;
  }
  return false;
}

/**
 * Whether the apostrophe of a coronis on this vowel, written after it under
 * `coronis: "apostrophe"`, separates it from the next one: `τὠυτὸ` is
 * written `to’` and then the upsilon, which reads back as a vowel of its own.
 */
function splitByCoronis(token: Grapheme, options: ConversionOptions): boolean {
  return token.diacritics.has("coronis") &&
    options.transliteration?.coronis === "apostrophe" &&
    preservesDiacritic("coronis", options, "transliteration");
}

/**
 * Whether an iota after an upsilon written `y` needs the diaeresis that the
 * reader would otherwise add, under `upsilon: "y-with-diphthong-u"`: `y`
 * before `i` says "not the diphthong υι", which Greek marks on the upsilon
 * (`Θύιλλος`, `ὑι`). The rough breathing does not keep the hiatus, since
 * its `h` stands before the group; an accent or a smooth breathing written
 * in place does.
 */
function separatesIotaAfterY(
  document: Document,
  index: number,
  options: ConversionOptions,
): boolean {
  const first = document[index - 1];
  if (
    first?.kind !== "grapheme" || first.letter !== "upsilon" ||
    splitByCoronis(first, options)
  ) return false;
  // An upsilon that ends a diphthong is written u.
  if (
    isDiphthongAt(document, index - 2) &&
    readsBack(document, index - 2, options, isDiphthongAt)
  ) return false;
  const written = (mark: Diacritic) =>
    first.diacritics.has(mark) &&
    preservesDiacritic(mark, options, "transliteration");
  if (written("acute") || written("grave") || written("circumflex")) {
    return false;
  }
  return !(options.transliteration?.smoothBreathing === "greek" &&
    written("smooth"));
}

/**
 * Whether a contextual `y` must carry a diaeresis to keep its separation.
 *
 * Under the contextual upsilon rules, `y` after a vowel already means "not a
 * diphthong". Greek marks that hiatus by a breathing on the first vowel; when
 * this orthography neither writes that breathing in place nor infers it on
 * reading, the separation would be reread as a diaeresis, so the diaeresis
 * is written at once and the output is idempotent.
 */
/**
 * Whether a rule for upsilon writes a separation diaeresis at all: the
 * contextual ones. encodeTransliteration() tests it once for the call
 * before writesSeparationDiaeresis(), which starts with it.
 */
function separatesUnder(
  upsilon: TransliterationOptions["upsilon"] | undefined,
): boolean {
  return upsilon === "y-with-au-eu-ou" || upsilon === "y-with-diphthong-u" ||
    upsilon === "y-with-ou-v-f";
}

/** Whether a letter can take a separation diaeresis: iota or upsilon. */
function takesSeparation(letter: Letter): boolean {
  return letter === "iota" || letter === "upsilon";
}

function writesSeparationDiaeresis(
  document: Document,
  index: number,
  options: ConversionOptions,
): boolean {
  const upsilon = options.transliteration?.upsilon;
  if (!separatesUnder(upsilon)) return false;
  const token = document[index];
  const first = document[index - 1];
  // The letter first: it is cheaper than the marks, and rarely iota or upsilon.
  if (
    token?.kind !== "grapheme" || !takesSeparation(token.letter) ||
    first?.kind !== "grapheme"
  ) return false;
  // An iota written like eta reads back as one, and the pair with it.
  const etaLike = !hasHiatusMark(first) &&
    token.letter === "upsilon" && writtenAsEta(first, options);
  if (!etaLike && !hasHiatusMark(first)) return false;
  if (token.letter === "iota") {
    return upsilon === "y-with-diphthong-u" &&
      separatesIotaAfterY(document, index, options);
  }
  if (token.letter !== "upsilon") return false;

  // Without its hiatus mark the pair would be a diphthong rendered with u
  // (or with v or f).
  const unmarked: Document = [
    {
      ...first,
      letter: etaLike ? "eta" : readBackLetter(first, options),
      diacritics: NO_DIACRITICS,
    },
    token,
  ];
  const wouldBeDiphthong = upsilon === "y-with-diphthong-u"
    ? isDiphthongAt(unmarked, 0)
    : isAuEuOuAt(unmarked, 0) ||
      upsilon === "y-with-ou-v-f" && isVowelUpsilonAt(unmarked, 0);
  if (!wouldBeDiphthong) return false;

  // The hiatus survives when one of its marks is reread on the first vowel.
  const written = (mark: Diacritic) =>
    first.diacritics.has(mark) &&
    preservesDiacritic(mark, options, "transliteration");
  if (written("acute") || written("grave") || written("circumflex")) {
    return false;
  }
  if (written("rough") && isWordInitial(document, index - 1)) return false;
  // The reader infers a smooth breathing at the start of a word, but not in
  // a numeral, which takes none. It reads one written in place, and the
  // apostrophe before a word as the breathing of its first vowel (`’ay`),
  // but in a numeral, under monotonic accentuation, which removes it, or for
  // an `o` before `y` where omega is written `o` that does not read back as
  // the omega of `’oy` (ὠυ).
  const smoothBreathing = options.transliteration?.smoothBreathing;
  if (
    first.diacritics.has("smooth") &&
    (infersSmoothBreathing(options) &&
        !isGreekNumeralContext(document, index - 1) ||
      written("smooth") &&
        (smoothBreathing === "greek" ||
          smoothBreathing === "apostrophe" &&
            options.greek?.accentuation !== "monotonic" &&
            isWordInitial(document, index - 1) &&
            !isGreekNumeralContext(document, index - 1) &&
            (upsilon !== "y-with-ou-v-f" ||
              options.transliteration?.longVowels !== "omit" ||
              unmarked[0].kind !== "grapheme" ||
              unmarked[0].letter !== "omicron" ||
              first.letter === "omega" &&
                [...first.diacritics].every((mark) =>
                  mark === "smooth" || mark === "coronis" ||
                  mark === "overline"
                ))))
  ) return false;
  return true;
}
