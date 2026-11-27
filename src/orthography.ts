import {
  ARISTERI_KERAIA,
  DEXIA_KERAIA,
  hasHiatusMark,
  isBoundaryTransparent,
  isDiphthongAt,
  isGreekNumeralContext,
  isVowel,
  isWordInitial,
  isWordLetter,
  keptLetterCase,
  mayFormDiphthong,
  startsTitleCaseWord,
  TONOS_SIGN,
  tonosKeraia,
} from "./context.ts";
import {
  diacriticBit,
  diacriticsFromMask,
  GLYPH_VARIANTS,
  literal,
  ORDER,
  sharedDiacritics,
  sharedMask,
  withDiacritic as addDiacritic,
  withoutDiacritic,
} from "./model.ts";
import { preservesDiacritic } from "./diacritics.ts";
import { APOSTROPHE } from "./punctuation.ts";
import { isSpacingSign } from "./parsers/spacing_marks.ts";
import type {
  Diacritic,
  Document,
  Format,
  Grapheme,
  Letter,
  Token,
} from "./model.ts";
import type { ConversionOptions } from "./options.ts";
import { composeTargets, type TokenTargets } from "./parsers/positions.ts";

const NUMERAL_VALUES = new Map<Letter, number>([
  ["alpha", 1],
  ["beta", 2],
  ["gamma", 3],
  ["delta", 4],
  ["epsilon", 5],
  ["digamma", 6],
  ["stigma", 6],
  ["zeta", 7],
  ["eta", 8],
  ["theta", 9],
  ["iota", 10],
  ["kappa", 20],
  ["lambda", 30],
  ["mu", 40],
  ["nu", 50],
  ["xi", 60],
  ["omicron", 70],
  ["pi", 80],
  ["koppa", 90],
  ["archaic-koppa", 90],
  ["rho", 100],
  ["sigma", 200],
  ["tau", 300],
  ["upsilon", 400],
  ["phi", 500],
  ["chi", 600],
  ["psi", 700],
  ["omega", 800],
  ["sampi", 900],
]);

/**
 * Applies the orthography of Greek and Beta Code output, in `format`. With
 * `targets`, records where each token of the original document ends up (see
 * `parsers/positions.ts`); only the passes that change the token count
 * touch it.
 */
export function applyOrthography(
  document: Document,
  options: ConversionOptions = {},
  targets?: TokenTargets,
  format: "greek" | "beta-code" = "greek",
  capitals?: CapitalOrthography,
): Document {
  const numbered = applyNumeralOrthography(
    document,
    options,
    targets,
    format,
    capitals,
  );
  if (options.greek?.doubleRho !== "smooth-rough") return numbered;

  return numbered.map((token, index) => {
    if (token.kind !== "grapheme" || token.letter !== "rho") return token;

    const previous = numbered[index - 1];
    const next = numbered[index + 1];

    if (isRho(next)) return withDiacritic(token, "smooth");
    if (isRho(previous)) return withDiacritic(token, "rough");

    return token;
  });
}

/**
 * Applies Greek-output orthography to a canonical document without mutation.
 *
 * The monotonic policy is mechanical and lossy: it preserves diaeresis and
 * overline, collapses acute/grave/circumflex to one acute, removes
 * breathings, coronis, iota subscript, and explicit quantity, writes a
 * diaeresis where a breathing or an iota subscript it removes showed a
 * hiatus (`ἀυτμή` → `αϋτμή`), and applies
 * the accent rules of monotonic orthography to each word (see
 * {@link accentWords}). It does not use lexical or morphological knowledge:
 * the accents it keeps on monosyllables are read from the marks of the
 * source.
 */
export function applyGreekOrthography(
  document: Document,
  options: ConversionOptions = {},
): Document {
  return applyMonotonicOrthography(
    applyOrthography(
      document,
      options,
      undefined,
      "greek",
      applyCapitalOrthography,
    ),
    options,
  );
}

/**
 * The monotonic part of {@link applyGreekOrthography}, which every writer
 * applies to the document it has prepared: monotonic accentuation is an
 * orthography of Greek, which Beta Code and transliteration spell as Greek
 * output writes it.
 */
export function applyMonotonicOrthography(
  orthographic: Document,
  options: ConversionOptions = {},
): Document {
  if (options.greek?.accentuation !== "monotonic") {
    return orthographic;
  }

  let changed = false;
  const monotonic = orthographic.map((token, index) => {
    if (token.kind === "literal") return token;
    const separated = monotonicHidesHiatus(orthographic, index);
    if (token.diacritics.size === 0 && !separated) return token;

    const diacritics = new Set<Diacritic>();
    if (separated || token.diacritics.has("diaeresis")) {
      diacritics.add("diaeresis");
    }
    // The overline of an abbreviation or a numeral is no accent.
    if (token.diacritics.has("overline")) diacritics.add("overline");
    if (
      token.diacritics.has("acute") ||
      token.diacritics.has("grave") ||
      token.diacritics.has("circumflex")
    ) {
      diacritics.add("acute");
    }

    if (sameDiacritics(token.diacritics, diacritics)) return token;
    changed = true;
    return { ...token, diacritics: sharedDiacritics(diacritics) };
  });

  changed = accentWords(orthographic, monotonic) || changed;
  return changed ? monotonic : orthographic;
}

/**
 * Whether the vowel at `index` follows one whose breathing or iota
 * subscript alone showed that they form no diphthong (`ἀυτμή`, `ἀίδηλος`):
 * monotonic Greek, which writes neither, shows it with a diaeresis
 * (`αϋτμή`, `αΐδηλος`), as words in capitals do. An accent on the first
 * vowel still shows it (`άυλος`), and a vowel that ends a diphthong begins
 * none.
 */
function monotonicHidesHiatus(document: Document, index: number): boolean {
  const token = document[index];
  const previous = document[index - 1];
  return token.kind === "grapheme" && previous?.kind === "grapheme" &&
    (previous.diacritics.has("smooth") || previous.diacritics.has("rough") ||
      previous.diacritics.has("iota-subscript")) &&
    !previous.diacritics.has("acute") && !previous.diacritics.has("grave") &&
    !previous.diacritics.has("circumflex") &&
    mayFormDiphthong(previous.letter, token.letter) &&
    !isDiphthongAt(document, index - 2);
}

/**
 * Applies the accent rules of monotonic orthography to each word of the
 * monotonic view, in place:
 *
 * - a monosyllable loses its accent, but for those the monotonic system
 *   distinguishes ({@link keepsMonosyllableAccent}), a word that abbreviates
 *   a longer one (`ό,τι`, `κ.ά.`, `20ός`), and a word that elision made a
 *   monosyllable, which keeps it (`δείξ’ το`, {@link isElided});
 * - a word accented on its last two syllables, as polytonic Greek accents a
 *   paroxytone or properispomenon before an enclitic (`σῶμά μου`), loses the
 *   second accent: monotonic Greek writes two accents on a proparoxytone only
 *   (`άνθρωπός μου`).
 *
 * Syllables are counted on the monotonic view itself, where an accent on the
 * first of two vowels is the only remaining sign of hiatus, so that rendering
 * the output again gives the same result. The exceptions are read from the
 * marks of the source.
 */
function accentWords(source: Document, monotonic: Token[]): boolean {
  let changed = false;
  for (let start = 0; start < monotonic.length; start++) {
    if (
      monotonic[start].kind !== "grapheme" || !isWordInitial(monotonic, start)
    ) continue;

    const word: number[] = [];
    // A letter a converter keeps as it was cannot be counted: its word keeps
    // its accent.
    let kept = false;
    let end = start;
    for (; end < monotonic.length; end++) {
      const token = monotonic[end];
      if (token.kind === "grapheme") word.push(end);
      else if (isWordLetter(token)) kept = true;
      // A comma does not end the count: before a letter, it is the
      // hypodiastole of `ό,τι`, inside its word, and before anything else,
      // what follows it ends the word.
      else if (isLiteral(token, ",")) continue;
      else if (!isBoundaryTransparent(token)) break;
    }
    const first = start;
    start = end - 1;

    if (
      kept || !word.some((index) => isAccented(monotonic[index])) ||
      isGreekNumeralContext(monotonic, word[0]) ||
      isAbbreviation(monotonic, first, end)
    ) continue;

    // The syllables of the word, a diphthong being one, and those that bear
    // an accent: the first and the last, and how many.
    let syllables = 0;
    let lastSyllable = -1;
    let accented = 0;
    let firstAccented = -1;
    let lastAccented = -1;
    for (const index of word) {
      const token = monotonic[index] as Grapheme;
      if (!isVowel(token.letter)) continue;
      if (
        index - 1 < first || monotonic[index - 1].kind !== "grapheme" ||
        !isDiphthongAt(monotonic, index - 1)
      ) {
        syllables++;
        lastSyllable = index;
      }
      if (token.diacritics.has("acute") && lastAccented !== syllables) {
        accented++;
        if (firstAccented < 0) firstAccented = syllables;
        lastAccented = syllables;
      }
    }

    let unaccented: readonly number[];
    if (syllables === 1) {
      if (
        keepsMonosyllableAccent(source, word, monotonic) ||
        isElided(monotonic, word, end)
      ) continue;
      unaccented = word;
    } else if (
      accented === 2 && firstAccented === syllables - 1 &&
      lastAccented === syllables
    ) {
      // The accents of the last two syllables: the second goes.
      unaccented = word.filter((index) =>
        index >= lastSyllable &&
        isVowel((monotonic[index] as Grapheme).letter)
      );
    } else continue;

    for (const index of unaccented) {
      const token = monotonic[index] as Grapheme;
      if (!token.diacritics.has("acute")) continue;
      monotonic[index] = {
        ...token,
        diacritics: withoutDiacritic(token.diacritics, "acute"),
      };
      changed = true;
    }
  }
  return changed;
}

/**
 * Whether the letter at `last`, which ends a word, is followed by spaces and
 * another word, with no punctuation between them, that is no enclitic of
 * ancient Greek: polytonic Greek writes an acute on an oxytone before one
 * (`τούς τε`, `σού γε`).
 */
function precedesWord(document: Document, last: number): boolean {
  let index = last + 1;
  while (isBoundaryTransparent(document[index])) index++;
  const space = index;
  while (index < document.length && isWhitespace(document[index])) index++;
  if (index === space || document[index]?.kind !== "grapheme") return false;
  let letters = "";
  for (; document[index]?.kind === "grapheme"; index++) {
    letters += (letters === "" ? "" : " ") +
      (document[index] as Grapheme).letter;
  }
  return !ANCIENT_ENCLITICS.has(letters);
}

/**
 * The enclitics of ancient Greek that follow an oxytone, by their letters,
 * which no weak pronoun of Modern Greek precedes.
 */
const ANCIENT_ENCLITICS: ReadonlySet<string> = new Set([
  "tau epsilon",
  "gamma epsilon",
  "tau omicron iota",
  "pi epsilon rho",
  "rho alpha",
  "mu omicron iota",
  "sigma omicron iota",
]);

function isAccented(token: Token): boolean {
  return token.kind === "grapheme" && token.diacritics.has("acute");
}

/**
 * Whether elision made the word a monosyllable: it ends in a consonant that
 * ends no word of Modern Greek, so that a vowel was elided, before an
 * apostrophe (`δείξ’ το`, `πάρ’ το`). A word keeps its accent then, which the
 * monotonic system writes ("Όταν μια λέξη παθαίνει έκθλιψη ή αποκοπή και
 * γίνεται μονοσύλλαβη, κρατάει τον τόνο"). The closing quotation mark is
 * the apostrophe too: after a word that ends in a vowel, `ν`, or `ς`, as a
 * modern Greek word does, or that an opening one starts (`‘πῦρ’`), it is no
 * elision.
 */
function isElided(
  document: Document,
  word: readonly number[],
  end: number,
): boolean {
  const last = document[word[word.length - 1]] as Grapheme;
  const before = document[word[0] - 1];
  return isLiteral(document[end], APOSTROPHE) && !isVowel(last.letter) &&
    last.letter !== "nu" && last.glyphVariant !== "final-sigma" &&
    !isLiteral(before, OPENING_QUOTE) && !isLiteral(before, APOSTROPHE);
}

/** The opening single quotation mark, which the closing one pairs with. */
const OPENING_QUOTE = "\u2018";

/**
 * Whether the word from `start` to `end` (excluded) abbreviates a longer one,
 * whose accent it keeps: the ending of an ordinal written with digits
 * (`20ός`), or a word that a period joins to a letter (`κ.ά.`, for `και
 * άλλα`).
 */
function isAbbreviation(
  document: Document,
  start: number,
  end: number,
): boolean {
  const before = document[start - 1];
  if (before?.kind === "literal") {
    const unit = before.value.charCodeAt(before.value.length - 1);
    if (unit >= 0x30 && unit <= 0x39) return true;
  }
  return isLiteral(before, ".") && isWordLetter(document[start - 2]) ||
    isLiteral(document[end], ".") && isWordLetter(document[end + 1]);
}

/**
 * The monosyllables that keep their accent in monotonic orthography, as far
 * as the source marks identify them:
 *
 * - disjunctive `ή` ("or"), written `ἤ` or `ἢ` in polytonic Greek, as opposed
 *   to the article `ἡ` and to `ἦ`;
 * - interrogative `πού` and `πώς`, written `ποῦ` and `πῶς` in polytonic Greek,
 *   as opposed to the relative or indefinite `που`, `ποὺ`, `πως`, `πὼς`;
 * - the weak forms of the personal pronouns, `μου`, `σου`, `του`, `της`,
 *   `μας`, `σας`, `τους`, written with an acute where they could be read as
 *   enclitics of the word before (`ο πατέρας μού είπε`, `δώσε μού το`), and
 *   which belong to the word after, in `following` ({@link precedesWord}).
 *   A circumflex or a grave does not identify them, since `τοῦ`, `τῆς`, and
 *   `τοὺς` are the article, nor an acute before punctuation or an ancient
 *   enclitic, which polytonic Greek writes on an oxytone (`σάς.`, the
 *   possessive, `τούς τε`).
 *
 * An acute on these words is kept, because it is how monotonic text writes
 * them; a polytonic enclitic that received an acute from a following
 * enclitic is therefore kept as well.
 */
function keepsMonosyllableAccent(
  source: Document,
  word: readonly number[],
  following?: Document,
): boolean {
  const tokens = word.map((index) => source[index]);
  if (!tokens.every((token) => token?.kind === "grapheme")) return false;
  const graphemes = tokens as Grapheme[];
  const letters = graphemes.map(({ letter }) => letter).join(" ");

  if (letters === "eta") {
    const [eta] = graphemes;
    return !eta.diacritics.has("rough") &&
      (eta.diacritics.has("acute") || eta.diacritics.has("grave"));
  }
  if (letters === "pi omicron upsilon" || letters === "pi omega sigma") {
    return graphemes.some(({ diacritics }) =>
      diacritics.has("circumflex") || diacritics.has("acute")
    );
  }
  if (WEAK_PRONOUNS.has(letters)) {
    return following !== undefined &&
      graphemes.some(({ diacritics }) => diacritics.has("acute")) &&
      precedesWord(following, word[word.length - 1]);
  }
  return false;
}

/** The weak forms of the personal pronouns, by their letters. */
const WEAK_PRONOUNS: ReadonlySet<string> = new Set([
  "mu omicron upsilon",
  "sigma omicron upsilon",
  "tau omicron upsilon",
  "tau eta sigma",
  "mu alpha sigma",
  "sigma alpha sigma",
  "tau omicron upsilon sigma",
]);

/** {@link applyCapitalOrthography}, or another pass of the same shape. */
export type CapitalOrthography = (
  document: Document,
  options: ConversionOptions,
) => Document;

/** A literal made of letters, with their marks. */
const LETTERS = /^\p{L}[\p{L}\p{M}]*$/u;

/**
 * Whether a literal is made of letters. Most literals are spaces and
 * punctuation: one unit below `A` needs no regex. The right keraia, a
 * modifier letter of Unicode, ends a numeral, which may be written as a
 * number: it is no letter of a word.
 */
function isLetters(value: string): boolean {
  return (value.length !== 1 || value.charCodeAt(0) >= 0x41) &&
    value !== DEXIA_KERAIA && LETTERS.test(value);
}

/** Whether a token is a letter of a word in capitals, as it reads back. */
function isCapitalWordLetter(token: Token): boolean {
  return token.kind === "grapheme" || isLetters(token.value);
}

/**
 * Writes the words in capitals of Greek output without accents, breathings,
 * coronis, or quantity marks, unless `greek.capitalMarks` is `"preserve"` (see
 * `CapitalMarksOrthography`): their diaeresis stays, one is written on
 * the second of two vowels whose hiatus a mark on the first showed, and the
 * disjunctive `ή` keeps its accent. Returns `document` itself when no word
 * changes.
 */
export function applyCapitalOrthography(
  document: Document,
  options: ConversionOptions,
): Document {
  if (options.greek?.capitalMarks === "preserve") return document;
  // The marks that a word in capitals keeps, as a mask, and those it adds,
  // computed for the first such word, and here rather than in the module,
  // so that a bundle that writes no Greek leaves them out.
  let capitalMask = 0;
  let diaeresis = 0;
  let acute = 0;
  const policy = options.greek?.iotaSubscript;
  // Whether Greek output writes an iota subscript on the line, which only a
  // word of one letter asks.
  let adscript: boolean | undefined;
  // A capital whose iota subscript Greek output writes on the line, as a
  // capital in text set in capitals, and else, after a capital alone, small.
  const writesAdscript = (letter: Grapheme) =>
    letter.uppercase && letter.diacritics.has("iota-subscript") &&
    (adscript ??= (policy === "capital-adscript" || policy === "adscript") &&
      preservesDiacritic("iota-subscript", options, "greek"));
  const letterCase = options.text?.letterCase;
  const capitalIota = letterCase === "uppercase";
  // Whether numerals become numbers, which cut the words that hold them.
  const decimal = options.text?.numerals === "decimal";
  // The case that the searches of `caseNear()` found past each word of one
  // capital, by direction, so that a run of them costs no more than its
  // length.
  let near: [NearCases, NearCases] | undefined;
  let output: Token[] | undefined;
  // Whether the token before, spaces and marks aside, is a letter: words
  // are cut as they read back, where a letter a converter keeps, written
  // with a sign that is no letter (`*s3`), ends one.
  let afterLetter = false;
  // Whether the word began after a left keraia, under decimal numerals, and
  // has only letters the reader of numerals reads: a numeral, which its
  // first mark or joiner ends, so that the letters after it begin a word
  // once it is a number (`͵α̇ΟΜΆΙΟΣ`).
  let thousands = false;
  for (let start = 0; start < document.length; start++) {
    const first = document[start];
    if (first.kind === "literal") {
      // Most literals are spaces and punctuation, below `A`, which neither
      // a mark nor a letter is.
      const value = first.value;
      if (value.length === 1 && value.charCodeAt(0) < 0x41) {
        afterLetter = false;
        continue;
      }
      if (isBoundaryTransparent(first)) {
        if (thousands) afterLetter = thousands = false;
        continue;
      }
      if (!isLetters(value)) {
        afterLetter = false;
        continue;
      }
      // A letter that the reader of numerals does not read ends a numeral.
      thousands = false;
    }
    // Within a word, or a word that starts with a small letter.
    if (afterLetter) continue;
    afterLetter = true;
    thousands = decimal && first.kind === "grapheme" &&
      isLiteral(document[start - 1], ARISTERI_KERAIA);
    if (first.kind === "grapheme") {
      // A small letter first or second: the word is not in capitals.
      if (!first.uppercase) continue;
      const second = document[start + 1];
      if (second?.kind === "grapheme" && !second.uppercase) continue;
    }

    const word: number[] = [];
    let kept = 0;
    let capitals = true;
    let end = start;
    for (; end < document.length; end++) {
      const token = document[end];
      if (token.kind === "grapheme") {
        // Under decimal numerals, the letters of a numeral after a mark or
        // joiner that the word holds aside, which the reader of numerals
        // does not, are a word of their own, which may become a number
        // (`Ἰ̇βʹ`).
        if (
          decimal && end > start && isBoundaryTransparent(document[end - 1]) &&
          beginsNumeral(document, end)
        ) break;
        word.push(end);
        if (!token.uppercase) capitals = false;
      } else if (isCapitalWordLetter(token)) {
        // Letters of another script, or a letter a converter keeps as it
        // was, which reads back as letters, are of the word: the kept one
        // takes the case of the text once written, or keeps its own. The
        // reader of numerals reads none.
        kept++;
        thousands = false;
        const keptCase = keptLetterCase(token);
        if (
          keptCase !== undefined
            ? letterCase === "lowercase" || letterCase === "title" ||
              letterCase !== "uppercase" && !keptCase
            : /\p{Ll}/u.test(token.value)
        ) capitals = false;
      } else if (!isBoundaryTransparent(token) || thousands) break;
    }
    start = end - 1;
    afterLetter = true;
    if (!capitals || word.length === 0) continue;
    // A word of one letter takes the case of the words around it, unless
    // an iota written on the line after it makes it two letters, two
    // capitals in text set in capitals, and else a capital and a small
    // letter, which begin a word in small letters (`Ὠι`). In text set in
    // capitals, every word is in capitals.
    if (word.length === 1 && kept === 0 && !capitalIota) {
      if (writesAdscript(document[word[0]] as Grapheme)) continue;
      near ??= [new Map(), new Map()];
      const sides = [
        caseNear(document, word[0] - 1, -1, writesAdscript, decimal, near[0]),
        caseNear(document, word[0] + 1, 1, writesAdscript, decimal, near[1]),
      ];
      if (!sides.includes("capitals") || sides.includes("small")) continue;
    }

    if (capitalMask === 0) {
      diaeresis = diacriticBit("diaeresis");
      capitalMask = diaeresis | diacriticBit("overline") |
        diacriticBit("iota-subscript");
      acute = diacriticBit("acute");
    }
    // The disjunctive `ή`, which the accent tells from the article.
    const only = document[word[0]] as Grapheme;
    const disjunctive = word.length === 1 && kept === 0 &&
      only.letter === "eta" &&
      !only.diacritics.has("iota-subscript") &&
      keepsMonosyllableAccent(document, word);
    for (let k = 0; k < word.length; k++) {
      const index = word[k];
      const letter = document[index] as Grapheme;
      // A mark on the first of two vowels that would form a diphthong
      // showed their hiatus, which the diaeresis shows in capitals; a vowel
      // that ends a diphthong begins none.
      const previous = document[index - 1];
      const hiatus = k > 0 && word[k - 1] === index - 1 &&
        previous.kind === "grapheme" && hasHiatusMark(previous) &&
        !previous.diacritics.has("iota-subscript") &&
        mayFormDiphthong(previous.letter, letter.letter) &&
        !(k > 1 && word[k - 2] === index - 2 &&
          isDiphthongAt(document, index - 2));
      // Marks read from text share a set that carries their mask; values
      // that are no marks, from a document built outside TypeScript, are
      // left for validation to report.
      const mask = sharedMask(sharedDiacritics(letter.diacritics));
      if (mask === undefined) continue;
      const written = (mask & capitalMask) | (disjunctive ? acute : 0) |
        (hiatus ? diaeresis : 0);
      if (written === mask) continue;
      output ??= [...document];
      output[index] = { ...letter, diacritics: diacriticsFromMask(written) };
    }
  }
  return output ?? document;
}

/** The case of the words near a text, as {@link caseNear} gives it. */
type NearCase = "capitals" | "small" | undefined;
/** The cases found past words of one capital, by their index. */
export type NearCases = Map<number, NearCase>;

/**
 * Whether the word of one capital at `index` is among words in capitals: the
 * nearest word on either side, words of one letter aside, is in capitals,
 * and neither is in small letters (`ΘΕΟΣ Θ`, but not `Θ, ϑ, θ`). A number
 * or a numeral ends the search on its side (`ΘΕΟΣ ιβʹ Θ`), as
 * {@link caseNear} says.
 * `near` keeps the cases found past each side's words of one capital, for
 * the searches of one document.
 */
export function amongCapitalWords(
  document: Document,
  index: number,
  decimal: boolean,
  near: readonly [NearCases, NearCases],
): boolean {
  const sides = [
    caseNear(document, index - 1, -1, writesNoAdscript, decimal, near[0]),
    caseNear(document, index + 1, 1, writesNoAdscript, decimal, near[1]),
  ];
  return sides.includes("capitals") && !sides.includes("small");
}

function writesNoAdscript(): boolean {
  return false;
}

/**
 * The case of the nearest word from `start` in `direction`, across spaces
 * and punctuation, by its two letters nearest `start`, or `undefined` where
 * there is none before a digit, a literal with a letter that is no letter of
 * a word (`isWordLetter()`), or a numeral, which may be written as a number.
 * A literal that writes a letter is read by the letters of its text, as it
 * reads back. A word of one capital tells
 * nothing, and the search goes on past it (`Ἣ Δ’ ΑΕΚΟΥΣ’`), but for a
 * capital with an iota written on the line, which outside text set in
 * capitals is a capital and a small letter. Words are cut as the pass cuts
 * them, at the numerals that `decimal` numerals make numbers. `passed`
 * keeps, for each word of one capital passed, the case found beyond it,
 * which a later search that reaches it takes as it is.
 */
function caseNear(
  document: Document,
  start: number,
  direction: 1 | -1,
  writesAdscript: (letter: Grapheme) => boolean,
  decimal: boolean,
  passed: NearCases,
): NearCase {
  const words: number[] = [];
  let found: NearCase;
  let index = start;
  search: for (;;) {
    // A literal that writes a letter is a letter of its word, with its case
    // (`isWordLetter()`); another literal with a letter or a digit ends the
    // search.
    for (
      ;
      document[index]?.kind === "literal" && !isWordLetter(document[index]);
      index += direction
    ) {
      if (/[\p{L}\p{N}]/u.test((document[index] as { value: string }).value)) {
        break search;
      }
    }
    const first = document[index];
    // The letters of a numeral, which may be written as a number, are no
    // word either (`Ἠ ιβʹ`, `͵αβ Ἠ`).
    if (
      first === undefined ||
      first.kind === "grapheme" &&
        (direction === 1
          ? beginsNumeral(document, index)
          : endsThousands(document, index))
    ) break;
    // A literal is read by the letters of its text, as it reads back: a
    // letter kept in its source format may be spelled with several.
    const letters = first.kind === "literal"
      ? literalCases(first, direction)
      : undefined;
    if (letters === undefined ? !(first as Grapheme).uppercase : !letters[0]) {
      found = "small";
      break;
    }
    if (letters !== undefined && letters.length > 1) {
      found = letters[1] ? "capitals" : "small";
      break;
    }
    if (passed.has(index)) {
      found = passed.get(index);
      break;
    }
    // The next letter of the word, the marks and joiners that the word
    // holds aside, as the word is cut: under decimal numerals, a numeral on
    // the other side of them is a word of its own (`Ἰ̇βʹ`, `͵α̇Ο`).
    let next = index + direction;
    while (isBoundaryTransparent(document[next])) next += direction;
    const second = document[next];
    if (
      second?.kind === "grapheme"
        ? !(decimal && next !== index + direction &&
          (direction === 1
            ? beginsNumeral(document, next)
            : endsThousands(document, next)))
        : isWordLetter(second)
    ) {
      found = (second.kind === "literal"
          ? literalCases(second, direction)[0]
          : second.uppercase)
        ? "capitals"
        : "small";
      break;
    }
    if (first.kind === "grapheme" && writesAdscript(first)) {
      found = "small";
      break;
    }
    words.push(index);
    index = next;
  }
  for (const word of words) passed.set(word, found);
  return found;
}

/**
 * Whether each letter of a literal is a capital, from the side that a search
 * in `direction` reaches first.
 */
function literalCases(token: Token, direction: 1 | -1): boolean[] {
  const cases = [...(token as { value: string }).value]
    .filter((character) => /\p{L}/u.test(character))
    .map((character) => /[\p{Lu}\p{Lt}]/u.test(character));
  return direction === 1 ? cases : cases.reverse();
}

/**
 * Whether a numeral, which may be written as a number, starts at `index`, as
 * the reader of numerals reads one: after a left keraia, or as letters up to
 * a right keraia, which a mark or joiner between them would end (in `Ἰ̇βʹ`,
 * only `βʹ` is one). The letters are read up to the first token that is no
 * letter, once for each run of them, so that the time stays linear.
 */
function beginsNumeral(document: Document, index: number): boolean {
  if (isLiteral(document[index - 1], ARISTERI_KERAIA)) return true;
  let end = index;
  while (document[end]?.kind === "grapheme") end++;
  return end > index && isLiteral(document[end], DEXIA_KERAIA);
}

/**
 * Whether the letters that end at `index` began after a left keraia, which
 * a numeral without a right keraia has (`͵αβ`), read back to the first
 * token that is no letter.
 */
function endsThousands(document: Document, index: number): boolean {
  let start = index;
  while (document[start - 1]?.kind === "grapheme") start--;
  return isLiteral(document[start - 1], ARISTERI_KERAIA);
}

/**
 * Applies the transformations of the whole text that every format shares:
 * whitespace, letter case, and decimal numerals. A numeral is read on its
 * letters as `format` writes them: a letter whose marks the options all
 * remove is a digit (`σόʹ` is 270 with the accents removed), since the
 * output would read back as one. `capitals`, which the writer of Greek
 * gives, writes the words in capitals before their numerals are read: it is
 * a parameter, so that a bundle that writes no Greek leaves it out.
 */
export function applyNumeralOrthography(
  document: Document,
  options: ConversionOptions = {},
  targets?: TokenTargets,
  format: Format = "greek",
  capitals?: CapitalOrthography,
): Document {
  const spaced = applyWhitespaceOrthography(document, options, targets);
  const lettered = applyLetterCaseOrthography(spaced, options);
  const cased = capitals === undefined ? lettered : capitals(lettered, options);
  if (options.text?.numerals !== "decimal" || !cased.some(isKeraia)) {
    return cased;
  }

  const reading = writtenReading(options, format);
  const output: Token[] = [];
  const next = targets === undefined
    ? undefined
    : new Array<number>(cased.length).fill(0);
  for (let index = 0; index < cased.length;) {
    const numeral = readNumeral(cased, index, reading);
    if (numeral === undefined) {
      if (next !== undefined) next[index] = output.length;
      output.push(cased[index]);
      index++;
      continue;
    }

    // The letters and keraiai of the numeral all become the one number.
    if (next !== undefined) next.fill(output.length, index, numeral.end);
    output.push(literal(String(numeral.value)));
    index = numeral.end;
  }
  if (targets !== undefined && next !== undefined) {
    composeTargets(targets, next);
  }
  return output;
}

/**
 * Marks the tokens that `numerals: "decimal"` writes as numbers in `format`:
 * `marks[i]` is 1 when token `i` is a letter or keraia of a numeral, as
 * `applyNumeralOrthography()` reads them.
 */
export function decimalNumeralTokens(
  document: Document,
  options: ConversionOptions,
  format: Format,
): Uint8Array {
  const marks = new Uint8Array(document.length);
  if (!document.some(isKeraia)) return marks;
  const reading = writtenReading(options, format);
  for (let index = 0; index < document.length;) {
    const numeral = readNumeral(document, index, reading);
    if (numeral === undefined) {
      index++;
      continue;
    }
    marks.fill(1, index, numeral.end);
    index = numeral.end;
  }
  return marks;
}

function applyLetterCaseOrthography(
  document: Document,
  options: ConversionOptions,
): Document {
  const policy = options.text?.letterCase ?? "preserve";
  if (policy === "preserve") return document;

  let changed = false;
  const cased = document.map((token, index) => {
    if (token.kind === "literal") return token;

    const uppercase = policy === "uppercase" ||
      policy === "title" && startsTitleCaseWord(document, index);
    if (token.uppercase === uppercase) return token;

    changed = true;
    // A symbol form exists in one case only: in the other, the letter is the
    // ordinary one (`ϑ` → `Θ`, `ϴ` → `θ`). The lunate sigma has both.
    const variant = token.glyphVariant !== undefined &&
        Object.hasOwn(GLYPH_VARIANTS, token.glyphVariant)
      ? GLYPH_VARIANTS[token.glyphVariant].uppercase
      : undefined;
    if (variant !== undefined && variant !== uppercase) {
      const { glyphVariant: _variant, ...ordinary } = token;
      return { ...ordinary, uppercase };
    }
    return { ...token, uppercase };
  });

  return changed ? cased : document;
}

function applyWhitespaceOrthography(
  document: Document,
  options: ConversionOptions,
  targets?: TokenTargets,
): Document {
  if (options.text?.whitespace !== "collapse") return document;

  const output: Token[] = [];
  const next = targets === undefined
    ? undefined
    : new Array<number>(document.length).fill(-1);
  let pendingSpace = false;
  // Where the current whitespace run starts: its tokens all become the one
  // space written for it, or nothing at either end of the text.
  let runStart = 0;

  for (let index = 0; index < document.length; index++) {
    const token = document[index];
    if (isWhitespace(token)) {
      if (!pendingSpace) runStart = index;
      pendingSpace = output.length > 0;
      continue;
    }

    if (pendingSpace) {
      if (next !== undefined) next.fill(output.length, runStart, index);
      output.push(literal(" "));
    }
    if (next !== undefined) next[index] = output.length;
    output.push(token);
    pendingSpace = false;
  }

  if (targets !== undefined && next !== undefined) {
    composeTargets(targets, next);
  }
  return output;
}

/**
 * The right keraia as Greek and Beta Code write it: `ʹ`, the Greek numeral
 * sign that NFC turns into it, the spacing tonos typed for it, and Beta Code
 * `#`.
 */
const KERAIA = /[#\u0374\u02B9\u0384]/;

/**
 * Reads a spacing tonos after the letters of a numeral as its keraia, which
 * the Greek keyboard types so (`Β΄ Παγκόσμιος`, `ΙΑ΄`, `α΄ έκδοση`); Greek
 * output writes it as typed. The same sign also stands for an apostrophe: a
 * consonant alone, which elision leaves of `σε`, `με`, `το`, `να`, `θα`, or
 * `από`, `κι`, or `υπ`, before a word that starts with a vowel, is no
 * numeral (`σ΄ αγαπώ`, `Σ΄ αγαπώ`, `κι΄ εγώ`, `υπ΄ όψιν`), nor are letters
 * before a vowel that follows the sign without a space (`σ΄αγαπώ`), or that
 * no numeral writes, which has one letter for each order (`όλ΄ αυτά`); they
 * keep the sign as it is, as does any other word (`απ΄ όλα`). Neither the
 * case nor the marks of the letters decide, which the options of a
 * conversion may change: its output reads back so. The Greek reader reads
 * them before the spacing signs, which follow a keraia as a letter (`ςʹ᾿`
 * ends with an apostrophe), and which read the signs left: returns whether
 * there is one.
 */
export function readTonosKeraiai(tokens: Token[]): boolean {
  let left = false;
  for (let index = 0; index < tokens.length; index++) {
    if (!isLiteral(tokens[index], TONOS_SIGN)) continue;
    if (isTonosKeraiaAt(tokens, index)) tokens[index] = tonosKeraia();
    else left = true;
  }
  return left;
}

/** Whether the spacing tonos at `index` is the keraia of a numeral. */
function isTonosKeraiaAt(tokens: Token[], index: number): boolean {
  if (tokens[index - 1]?.kind !== "grapheme") return false;
  // A vowel right after the sign makes it an apostrophe (`σ΄αγαπώ`), but
  // for that of a numeral, which may be written as a number.
  const next = tokens[index + 1];
  if (
    next?.kind === "grapheme" && isVowel(next.letter) &&
    !startsNumeral(tokens, index + 1)
  ) return false;
  let start = index;
  while (tokens[start - 1]?.kind === "grapheme") start--;
  if (isElisionOfTonos(tokens, start, index)) return false;
  if (isLiteral(tokens[start - 1], ARISTERI_KERAIA)) start--;
  const from = Math.max(0, start - 1);
  const window = [...tokens.slice(from, index), literal(DEXIA_KERAIA)];
  return readsAsNumeral(window, start - from);
}

/** A reading of numerals that takes every letter as bare. */
const ANY_MARKS: NumeralReading = { bare: () => true, finalSigma: false };

/**
 * Whether the window, which ends with a keraia, reads as one numeral from
 * `start`, whatever the marks of its letters: its last letter may be a final
 * sigma that writes a stigma (`ις΄`, 16), which
 * {@link readFinalSigmaStigmas} reads once the keraia is.
 */
function readsAsNumeral(window: Token[], start: number): boolean {
  if (readNumeral(window, start, ANY_MARKS)?.end === window.length) {
    return hasOneLetterPerOrder(window, start);
  }
  const units = window[window.length - 2];
  if (
    units.kind !== "grapheme" || units.letter !== "sigma" ||
    units.glyphVariant !== "final-sigma"
  ) return false;
  window[window.length - 2] = { ...units, letter: "stigma" };
  return readNumeral(window, start, ANY_MARKS)?.end === window.length &&
    hasOneLetterPerOrder(window, start);
}

/**
 * Whether each letter of the numeral that the window reads from `start` is
 * of a lower order than the one before, as numerals are written (`ιβ΄`,
 * `ΣΤ΄`, `͵ασ΄`): `όλ΄` (70 and 30), which the reader of numerals takes as
 * 100, is a word whose apostrophe the spacing tonos types.
 */
function hasOneLetterPerOrder(window: Token[], start: number): boolean {
  let order = 4;
  let thousands = false;
  for (let index = start; index < window.length - 1; index++) {
    const token = window[index];
    if (token.kind !== "grapheme") {
      thousands = true;
      continue;
    }
    // `στ` before the keraia is six.
    const six = token.letter === "sigma" && index === window.length - 3 &&
      (window[index + 1] as Grapheme).letter === "tau";
    const value = six ? 6 : NUMERAL_VALUES.get(token.letter) ?? 0;
    const current = thousands ? 3 : value >= 100 ? 2 : value >= 10 ? 1 : 0;
    if (current >= order) return false;
    order = current;
    thousands = false;
    if (six) index++;
  }
  return true;
}

/**
 * The words that elision leaves as one consonant, `κι`, and `υπ`, which
 * reads as a numeral (480) where `υπ΄ όψιν` and `υπ΄ αριθμόν` elide `υπό`.
 */
const ELIDED_BEFORE_TONOS: ReadonlySet<string> = new Set([
  "sigma",
  "mu",
  "tau",
  "nu",
  "theta",
  "pi",
  "kappa iota",
  "upsilon pi",
]);

/**
 * Whether the letters from `start` to the spacing tonos at `index` are a
 * word that elision left, before a word that starts with a vowel, the
 * spaces aside. Before another numeral, they are one too (`σ΄ ιβ΄`), which
 * may be written as a number.
 */
function isElisionOfTonos(
  document: Document,
  start: number,
  index: number,
): boolean {
  const letters = document.slice(start, index) as Grapheme[];
  if (!ELIDED_BEFORE_TONOS.has(letters.map(({ letter }) => letter).join(" "))) {
    return false;
  }
  let next = index + 1;
  while (next < document.length && isWhitespace(document[next])) next++;
  if (next === index + 1) return false;
  // A spacing sign that the capital after it takes (`σ΄ ΄Ελληνα`).
  while (isSpacingSign(document[next])) next++;
  const vowel = document[next];
  return vowel?.kind === "grapheme" && isVowel(vowel.letter) &&
    !startsNumeral(document, next);
}

/**
 * Whether the letters from `start` are a numeral, before a keraia or a
 * spacing tonos.
 */
function startsNumeral(document: Document, start: number): boolean {
  let end = start;
  while (document[end]?.kind === "grapheme") end++;
  const sign = document[end];
  return (isLiteral(sign, TONOS_SIGN) || isLiteral(sign, DEXIA_KERAIA)) &&
    readsAsNumeral(
      [...document.slice(start - 1, end), literal(DEXIA_KERAIA)],
      1,
    );
}

/**
 * {@link readFinalSigmaStigmas} for the Greek and Beta Code readers, which
 * note the final sigma that writes a stigma before a right keraia. An input
 * without one, most text, is not searched for them.
 */
export function readStigmas(input: string, document: Document): Document {
  return KERAIA.test(input) ? readFinalSigmaStigmas(document) : document;
}

/**
 * Reads a final sigma that is the units of a numeral as a stigma written
 * with the sign it resembles (`ςʹ` 6, `ιςʹ` 16, `͵αςʹ` 1006): keyboards
 * lack the stigma, and `ς` is no numeral sign of its own, 200 being `σʹ`.
 * Returns `document` itself when no sigma is such.
 */
export function readFinalSigmaStigmas(document: Document): Document {
  let output: Token[] | undefined;
  for (let index = 0; index < document.length; index++) {
    const token = document[index];
    if (
      token.kind !== "grapheme" || token.letter !== "sigma" ||
      token.glyphVariant !== "final-sigma" || !isNumeralUnits(document, index)
    ) continue;
    output ??= [...document];
    output[index] = {
      kind: "grapheme",
      letter: "stigma",
      uppercase: false,
      diacritics: token.diacritics,
      glyphVariant: "final-sigma-stigma",
    };
  }
  return output ?? document;
}

/**
 * Whether the small letter at `index` is read as the units of a numeral
 * when it is a stigma written `ς`: it stands before a right keraia, without
 * a mark, at the end of letters that read as a numeral with it. Greek output
 * writes such a stigma `ς` only there, where it reads back as one.
 */
export function isNumeralUnits(document: Document, index: number): boolean {
  const token = document[index];
  if (
    token?.kind !== "grapheme" ||
    !isLiteral(document[index + 1], DEXIA_KERAIA)
  ) return false;

  // The letters before it, up to a left keraia or any other token, would
  // be the rest of the numeral, which reads no letter with a mark.
  let start = index;
  while (document[start - 1]?.kind === "grapheme") start--;
  if (isLiteral(document[start - 1], ARISTERI_KERAIA)) start--;
  const stigma: Grapheme = {
    kind: "grapheme",
    letter: "stigma",
    uppercase: false,
    diacritics: token.diacritics,
  };
  const from = Math.max(0, start - 1);
  const window = [
    ...document.slice(from, index),
    stigma,
    document[index + 1],
  ];
  return readNumeral(window, start - from) !== undefined;
}

/**
 * How a numeral is read: which letters count as written without a mark, as
 * the letters of a numeral are, and whether a final sigma before the keraia
 * is a stigma, as `ς` reads back (`ιςʹ`, 16).
 */
interface NumeralReading {
  readonly bare: (token: Grapheme) => boolean;
  readonly finalSigma: boolean;
}

/**
 * The reading of a document as it is. A final sigma that could be the units
 * of a numeral is a stigma already (`readFinalSigmaStigmas()`).
 */
const AS_READ: NumeralReading = {
  bare: (token) => token.diacritics.size === 0,
  finalSigma: false,
};

/** The marks that monotonic Greek keeps, an accent becoming an acute. */
const MONOTONIC_MARKS: ReadonlySet<Diacritic> = new Set([
  "diaeresis",
  "acute",
  "grave",
  "circumflex",
]);

/**
 * The reading of a document as `format` writes it under these options, so
 * that a numeral is the one the output reads back as. A letter is bare when
 * it has no mark, or when the options remove each of its marks, monotonic
 * accentuation those that are not an accent or a diaeresis, and
 * transliteration the marks that it leaves out (transliterationOmits()):
 * `ἀʹ` gives `1` under decimal numerals, where `aʹ` would read back as `1`. A
 * final sigma is written `ς`, a stigma before the keraia, under
 * `greek.finalSigma: "preserve"` in Greek and Beta Code; transliteration has
 * no final sigma.
 */
function writtenReading(
  options: ConversionOptions,
  format: Format,
): NumeralReading {
  const monotonic = options.greek?.accentuation === "monotonic";
  const removed = new Set(
    ORDER.filter((mark) =>
      !preservesDiacritic(mark, options, format) ||
      monotonic && !MONOTONIC_MARKS.has(mark)
    ),
  );
  const finalSigma = format !== "transliteration" &&
    (options.greek?.finalSigma ?? "preserve") === "preserve";
  let removedMask = 0;
  for (const mark of removed) removedMask |= diacriticBit(mark);
  const omitted = format === "transliteration"
    ? transliterationOmits(options, removedMask)
    : undefined;
  if (removed.size === 0 && omitted === undefined) {
    return { bare: AS_READ.bare, finalSigma };
  }
  return {
    bare: (token) => {
      if (token.diacritics.size === 0) return true;
      const letterMask = omitted?.(token.letter) ?? removedMask;
      // Marks read from text share a set that carries their mask.
      const mask = sharedMask(token.diacritics);
      if (mask !== undefined) return (mask & ~letterMask) === 0;
      for (const mark of token.diacritics) {
        if ((diacriticBit(mark) & letterMask) === 0) return false;
      }
      return true;
    },
    finalSigma,
  };
}

/**
 * The marks that transliteration leaves out of a letter, as a mask, beside
 * those that the options remove (`removed`), for the letters of a numeral,
 * which the reader reads back without them, since it infers no breathing in
 * a numeral:
 * - the smooth breathing, unless written in place (`smoothBreathing:
 *   "greek"`), or as an apostrophe before a vowel;
 * - the coronis, under `coronis: "omit"`;
 * - a quantity mark on a letter written as epsilon or omicron are, which
 *   would make `ē` or `ō` (see `writeLatinMarks()`): epsilon, omicron, and,
 *   without length marks, omega, and eta unless written `i`.
 */
function transliterationOmits(
  options: ConversionOptions,
  removed: number,
): (letter: Letter) => number {
  const transliteration = options.transliteration;
  const smooth = transliteration?.smoothBreathing ?? "omit";
  const coronis = (transliteration?.coronis ?? "omit") === "omit"
    ? diacriticBit("coronis")
    : 0;
  const omitsLength = transliteration?.longVowels === "omit";
  const etaAsI = transliteration?.eta === "i";
  const quantity = diacriticBit("macron") | diacriticBit("breve");
  const smoothBit = diacriticBit("smooth");
  return (letter) => {
    let mask = removed | coronis;
    if (smooth === "omit" || smooth === "apostrophe" && !isVowel(letter)) {
      mask |= smoothBit;
    }
    if (
      letter === "epsilon" || letter === "omicron" ||
      omitsLength && (letter === "omega" || letter === "eta" && !etaAsI)
    ) mask |= quantity;
    return mask;
  };
}

function readNumeral(
  document: Document,
  start: number,
  reading: NumeralReading = AS_READ,
): { value: number; end: number } | undefined {
  const previousToken = document[start - 1];
  if (
    isWordLetter(previousToken) ||
    isLiteral(previousToken, ARISTERI_KERAIA) ||
    // A numeral next to a digit would make one number with it once written
    // as a number, which a second conversion would read otherwise: `͵α͵β`
    // gives `1000͵β`, whose `͵β` follows a digit then.
    isDigit(previousToken)
  ) {
    return undefined;
  }

  let index = start;
  let value = 0;
  let hasThousands = false;

  if (isLiteral(document[index], ARISTERI_KERAIA)) {
    const thousands = numericValue(document, index + 1, reading);
    if (thousands === undefined || thousands > 9) return undefined;
    value = thousands * 1000;
    index += 2;
    hasThousands = true;
  }

  let previous = 1000;
  let digits = 0;
  while (index < document.length) {
    // Both ALA-LC Greek tables list στʹ as an alternate sign for six
    // (ϝʹ, ϛʹ, στʹ 6), so it is also the units of a longer numeral: ιστʹ is
    // 16, ͵αστʹ 1006. Read as 200 and 300, the pair would break the
    // descending order, so before a keraia it reads only one way.
    if (
      previous >= 10 && isLetter(document[index], "sigma", reading) &&
      isLetter(document[index + 1], "tau", reading) &&
      isLiteral(document[index + 2], DEXIA_KERAIA)
    ) {
      return { value: value + 6, end: index + 3 };
    }
    const current = numericValue(document, index, reading);
    if (current === undefined || current >= previous) break;
    value += current;
    previous = current;
    digits++;
    index++;
  }

  if (value === 0 || (digits === 0 && !hasThousands)) return undefined;
  if (isLiteral(document[index], DEXIA_KERAIA)) {
    return isDigit(document[index + 1]) ? undefined : { value, end: index + 1 };
  }
  // A leading thousands sign suffices in the ALA-LC tables. Do not convert
  // a prefix of a longer sequence that fails the numeral ordering rule.
  if (
    hasThousands && !isWordLetter(document[index]) &&
    !isDigit(document[index])
  ) {
    return { value, end: index };
  }
  return undefined;
}

/** Whether a token is a literal that ends with an ASCII digit. */
function isDigit(token: Token | undefined): boolean {
  if (token?.kind !== "literal") return false;
  const last = token.value.charCodeAt(token.value.length - 1);
  return last >= 0x30 && last <= 0x39;
}

/** Whether a token is a keraia, which every numeral has. */
function isKeraia(token: Token): boolean {
  return token.kind === "literal" &&
    (token.value === DEXIA_KERAIA || token.value === ARISTERI_KERAIA);
}

function isLetter(
  token: Token | undefined,
  letter: Letter,
  reading: NumeralReading,
): boolean {
  return token?.kind === "grapheme" && token.letter === letter &&
    reading.bare(token);
}

function numericValue(
  document: Document,
  index: number,
  reading: NumeralReading,
): number | undefined {
  const token = document[index];
  if (token?.kind !== "grapheme" || !reading.bare(token)) return undefined;
  if (
    reading.finalSigma && token.glyphVariant === "final-sigma" &&
    !token.uppercase && isLiteral(document[index + 1], DEXIA_KERAIA)
  ) return 6;
  return NUMERAL_VALUES.get(token.letter);
}

function isLiteral(token: Token | undefined, value: string): boolean {
  return token?.kind === "literal" && token.value === value;
}

function isWhitespace(token: Token): boolean {
  return token.kind === "literal" && /^\p{White_Space}$/u.test(token.value);
}

function isRho(token: Token | undefined): token is Grapheme {
  return token?.kind === "grapheme" && token.letter === "rho";
}

function withDiacritic(token: Grapheme, diacritic: Diacritic): Grapheme {
  return { ...token, diacritics: addDiacritic(token.diacritics, diacritic) };
}

function sameDiacritics(
  left: ReadonlySet<Diacritic>,
  right: ReadonlySet<Diacritic>,
): boolean {
  return left.size === right.size && [...left].every((mark) => right.has(mark));
}
