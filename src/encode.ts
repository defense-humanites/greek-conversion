import {
  ALPHABET,
  BETA_FOR,
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
  hasHiatusMark,
  initialBreathingStart,
  isAmongCapitals,
  isAuEuOuAt,
  isDiphthongAt,
  isGreekNumeralContext,
  isNasalGamma,
  isVowelUpsilonAt,
  isWordFinal,
  isWordInitial,
  precedesVoicedSound,
} from "./context.ts";
import {
  infersSmoothBreathing,
  prepareDiacriticsForRendering,
  preservesDiacritic,
} from "./diacritics.ts";
import {
  NO_DIACRITICS,
  sharedMask,
  withDiacritic,
  withoutDiacritic,
} from "./model.ts";
import type { Diacritic, Document, Format, Grapheme } from "./model.ts";
import type {
  ConversionOptions,
  MuPiTransliteration,
  NuTauTransliteration,
} from "./options.ts";
import { greekUpper } from "./case.ts";
import { applyGreekOrthography } from "./orthography.ts";
import { joinPieces, type WrittenPositions } from "./parsers/positions.ts";
import { encodePunctuation } from "./punctuation.ts";
import { applyGreekUnicode } from "./unicode.ts";

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
 * Memoizes, for one encoding call, a value derived only from a grapheme's
 * marks. Shared diacritic sets are keyed by their mask; a caller's own set
 * is computed each time.
 *
 * A cached value is shared by every token with the same marks, so it is
 * frozen: copy it before adding to it (`[...marks, "diaeresis"]`), or the
 * change would reach all those tokens. Values computed for a caller's set
 * are frozen too, so both paths fail the same way.
 */
function byMarks<T>(
  compute: (token: Grapheme) => T,
): (token: Grapheme) => Readonly<T> {
  const cache: (Readonly<T> | undefined)[] = [];
  return (token) => {
    const mask = sharedMask(token.diacritics);
    if (mask === undefined) return Object.freeze(compute(token));
    return cache[mask] ??= Object.freeze(compute(token));
  };
}

/**
 * Writes Greek. With `written`, records the range of each token's output in
 * the text assembled before Unicode normalization (see
 * `parsers/positions.ts`).
 */
export function encodeGreek(
  doc: Document,
  options: ConversionOptions = {},
  written?: WrittenPositions,
) {
  let out = "";
  const greekMarks = byMarks((token) =>
    marks(token, options, "greek").map((mark) => GREEK_FOR[mark]).join("")
  );
  const rendered = prepareDiacriticsForRendering(
    applyGreekOrthography(doc, options),
    options,
    "greek",
  );
  const starts = written?.starts;
  const ends = written?.ends;

  for (let i = 0; i < doc.length; i++) {
    const token = rendered[i];
    const start = out.length;
    if (starts !== undefined) starts[i] = start;

    if (token.kind === "literal") {
      out += encodePunctuation(token.value, "greek") ?? token.value;
      if (ends !== undefined) ends[i] = out.length;
      continue;
    }

    const assimilated = options.greek?.dentalSigma === "assimilate"
      ? assimilatedDental(doc, i)
      : undefined;

    if (assimilated !== undefined) {
      let base = ALPHABET.sigma.greek;
      if (rendersLunateSigma(assimilated, options)) base = "ϲ";
      else if (
        options.greek?.finalSigma === "preserve"
          ? assimilated.glyphVariant === "final-sigma" ||
            assimilated.glyphVariant === undefined && isWordFinal(doc, i + 1)
          : options.greek?.finalSigma !== "medial" &&
            isWordFinal(doc, i + 1)
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

    const outputLetter = elidedAspirate(doc, i) ?? token.letter;
    let base = ALPHABET[outputLetter].greek;

    if (
      token.letter === "sigma" &&
      rendersLunateSigma(token, options) &&
      !isGreekNumeralContext(doc, i)
    ) {
      base = "ϲ";
    } else if (
      token.letter === "sigma" &&
      (options.greek?.finalSigma === "preserve"
        ? token.glyphVariant === "final-sigma" ||
          token.glyphVariant === undefined && isWordFinal(doc, i)
        : options.greek?.finalSigma !== "medial" &&
          isWordFinal(doc, i)) &&
      !isGreekNumeralContext(doc, i)
    ) {
      base = "ς";
    }
    if (
      token.letter === "beta" &&
      !token.uppercase &&
      options.greek?.medialBeta === "symbol" &&
      !isGreekNumeralContext(doc, i) &&
      !isWordInitial(doc, i)
    ) {
      base = "ϐ";
    }
    if (token.uppercase) base = greekUpper(base);

    out += base + greekMarks(token);
    if (ends !== undefined) ends[i] = out.length;
  }

  if (written !== undefined) written.text = out;
  return applyGreekUnicode(out, options);
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
  const rendered = prepareDiacriticsForRendering(doc, options, "beta-code");
  const betaMarks = byMarks((token) => marks(token, options, "beta-code"));

  const pieces = rendered.map((token, index) => {
    if (token.kind === "literal") {
      if (token.value === DEXIA_KERAIA) return "#";
      if (token.value === ARISTERI_KERAIA) return "#22";
      return encodePunctuation(token.value, "beta-code") ?? token.value;
    }
    let base: string;
    if (
      token.letter === "sigma" &&
      rendersLunateSigma(token, options) &&
      !isGreekNumeralContext(doc, index)
    ) {
      base = "s3";
    } else {
      base = token.letter === "yot" &&
          options.betaCode?.yot === "#401"
        ? "#401"
        : ALPHABET[token.letter].beta;
    }

    if (options.betaCode?.case === "uppercase") {
      base = base.toUpperCase();
    } else {
      base = base.toLowerCase();
    }

    const renderedMarks = betaMarks(token);
    if (!token.uppercase) {
      return base + renderedMarks.map((mark) => BETA_FOR[mark]).join("");
    }

    const beforeLetter = renderedMarks
      .filter((mark) => mark !== "iota-subscript")
      .map((mark) => BETA_FOR[mark])
      .join("");
    const afterLetter = renderedMarks.includes("iota-subscript") ? "|" : "";
    return `*${beforeLetter}${base}${afterLetter}`;
  });
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
  const rendered = prepareDiacriticsForRendering(
    doc,
    options,
    "transliteration",
  );
  const latinMarks = byMarks((token) =>
    marks(token, options, "transliteration")
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
  // The written marks of a token depend only on its marks, on whether it is
  // epsilon or omicron, and on a separation diaeresis: memoized per call on
  // those three for shared sets, as byMarks() does.
  const markStrings: (string | undefined)[] = [];
  const markString = (token: Grapheme, separation: boolean): string => {
    const shortVowel = token.letter === "epsilon" ||
      token.letter === "omicron";
    const mask = sharedMask(token.diacritics);
    if (mask === undefined) {
      return writeLatinMarks(token, shortVowel, separation);
    }
    const key = mask << 2 | (shortVowel ? 2 : 0) | (separation ? 1 : 0);
    return markStrings[key] ??= writeLatinMarks(token, shortVowel, separation);
  };
  const writeLatinMarks = (
    token: Grapheme,
    shortVowel: boolean,
    separation: boolean,
  ): string => {
    // Latin `ē` and `ō` are eta and omega, so a quantity mark on epsilon or
    // omicron has no transliteration; convertDetailed() reports its removal.
    const tokenMarks = latinMarks(token).filter(
      (mark) => !(mark === "macron" || mark === "breve") || !shortVowel,
    );
    if (separation && !tokenMarks.includes("diaeresis")) {
      tokenMarks.push("diaeresis");
    }
    const transliteratedMarks = tokenMarks
      .filter((mark) => mark !== "coronis")
      .map((mark) => trMark(mark, options))
      .join("");
    const coronis = tokenMarks.includes("coronis")
      ? trMark("coronis", options)
      : "";
    return transliteratedMarks + coronis;
  };

  const pieces = rendered.map((token, index) => {
    if (token.kind === "literal") {
      if (options.transliteration?.keraia === "bnf") {
        if (token.value === DEXIA_KERAIA) return "\u0301";
        if (token.value === ARISTERI_KERAIA) return ",";
      }
      return encodePunctuation(token.value, "transliteration", options) ??
        token.value;
    }

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
      options.transliteration?.lunateSigma === "c"
    ) {
      return token.uppercase ? "C" : "c";
    }

    const previous = doc[index - 1];
    const next = doc[index + 1];
    const breathingStart = initialBreathingStart(rendered, index);
    const breathingIndex = breathingStart === undefined
      ? undefined
      : breathingTarget(rendered, breathingStart);
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
    // `HELLAS`), and with its first letter only before lowercase text or
    // alone (`Θάλασσα` → `Thálassa`, `Θ.` → `Th.`). A rough-breathing group
    // is capitalized as a whole: every letter of it must be uppercase.
    const capitals = uppercaseOutput ||
      (groupUppercase
        ? groupStart?.kind === "grapheme" && groupStart.uppercase &&
          breathingToken.uppercase &&
          isAmongCapitals(doc, breathingIndex!)
        : token.uppercase && isAmongCapitals(doc, index));
    const h = capitals ? "H" : "h";
    const nasalGamma = options.transliteration?.nasalGamma;
    let base = nasalGamma !== "literal" &&
        isNasalGamma(doc, index, nasalGamma === "nasal-except-kappa") &&
        !(nasalGamma === "nasal-medial-kappa" && isEdgeGammaKappa(doc, index))
      ? "n"
      : transliterationBase(doc, index, token.letter, options);
    const bnfLowercaseNumeral = options.transliteration?.keraia === "bnf" &&
      token.uppercase &&
      (token.letter === "stigma" || token.letter === "sampi") &&
      isGreekNumeralContext(doc, index);
    if (
      token.uppercase && !bnfLowercaseNumeral &&
      (!groupUppercase || capitals)
    ) {
      base = capitals
        ? base.toUpperCase()
        : base[0].toUpperCase() + base.slice(1);
    }
    if (
      initialSmooth && index === breathingStart &&
      options.transliteration?.smoothBreathing === "apostrophe"
    ) base = "\u2019" + base;
    if (initialRough && index === breathingStart) {
      base = (groupUppercase ? "H" : "h") +
        (capitals ? base.toUpperCase() : base.toLowerCase());
    } else if (
      token.letter === "rho" &&
      options.transliteration?.rho === "systematic"
    ) {
      if (next?.kind !== "grapheme" || next.letter !== "rho") base += h;
    } else if (
      preservesRough &&
      token.diacritics.has("rough") && index !== breathingIndex
    ) {
      if (token.letter === "rho") base += h;
      else if (token.uppercase) {
        base = "H" + (capitals ? base.toUpperCase() : base.toLowerCase());
      } else base = "h" + base;
    } else if (
      token.letter === "rho" &&
      previous?.kind === "grapheme" &&
      previous.letter === "rho"
    ) {
      base += h;
    }
    const separation = writesSeparationDiaeresis(doc, index, options) &&
      preservesDiaeresis;

    return base +
      markString(
        transferredAccents(rendered, index, options) ?? token,
        separation,
      );
  });
  return (written === undefined ? pieces.join("") : joinPieces(pieces, written))
    .normalize("NFC");
}

function rendersLunateSigma(
  token: Pick<Grapheme, "glyphVariant">,
  options: ConversionOptions,
): boolean {
  return options.greek?.sigma === "lunate" ||
    options.greek?.sigma === "preserve" &&
      token.glyphVariant === "lunate-sigma";
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

  const initial = isWordInitial(document, index);
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
    (isWordInitial(document, index) || isWordFinal(document, index + 1));
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
        const previous = document[index - 1];
        return previous?.kind === "grapheme" &&
            previous.letter === "omicron" &&
            isDiphthongAt(document, index - 1)
          ? "u"
          : "y";
      }
      case "y-with-au-eu-ou":
        return isAuEuOuAt(document, index - 1) ? "u" : "y";
      case "y-with-diphthong-u":
        return isDiphthongAt(document, index - 1) ||
            isDiphthongAt(document, index)
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
 * Whether a contextual `y` must carry a diaeresis to keep its separation.
 *
 * Under the contextual upsilon rules, `y` after a vowel already means "not a
 * diphthong". Greek marks that hiatus by a breathing on the first vowel; when
 * this orthography neither writes that breathing in place nor infers it on
 * reading, the separation would be reread as a diaeresis, so the diaeresis
 * is written at once and the output is idempotent.
 */
function writesSeparationDiaeresis(
  document: Document,
  index: number,
  options: ConversionOptions,
): boolean {
  const upsilon = options.transliteration?.upsilon;
  if (
    upsilon !== "y-with-au-eu-ou" && upsilon !== "y-with-diphthong-u" &&
    upsilon !== "y-with-ou-v-f"
  ) {
    return false;
  }
  const token = document[index];
  const first = document[index - 1];
  if (
    token?.kind !== "grapheme" || token.letter !== "upsilon" ||
    first?.kind !== "grapheme" || !hasHiatusMark(first)
  ) return false;

  // Without its hiatus mark the pair would be a diphthong rendered with u
  // (or with v or f).
  const unmarked: Document = [
    { ...first, diacritics: NO_DIACRITICS },
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
  if (
    first.diacritics.has("smooth") &&
    (infersSmoothBreathing(options) ||
      (options.transliteration?.smoothBreathing === "greek" &&
        written("smooth")))
  ) return false;
  return true;
}
