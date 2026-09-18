import { ALPHABET, BETA_FOR, GREEK_FOR, ORDER } from "./alphabet.ts";
import {
  ARISTERI_KERAIA,
  breathingTarget,
  contractedSigma,
  DEXIA_KERAIA,
  elidedAspirate,
  initialBreathingStart,
  isDiphthongAt,
  isGreekNumeralContext,
  isNasalGamma,
  isWordFinal,
  isWordInitial,
} from "./context.ts";
import {
  prepareDiacriticsForRendering,
  preservesDiacritic,
} from "./diacritics.ts";
import type { Diacritic, Document, Grapheme } from "./model.ts";
import type { ConversionOptions } from "./options.ts";
import { applyGreekOrthography } from "./orthography.ts";
import { encodePunctuation } from "./punctuation.ts";
import { applyGreekUnicode } from "./unicode.ts";

const marks = (token: Grapheme, options: ConversionOptions) =>
  ORDER.filter((mark) =>
    token.diacritics.has(mark) && preservesDiacritic(mark, options)
  );

export function encodeGreek(doc: Document, options: ConversionOptions = {}) {
  let out = "";
  const rendered = prepareDiacriticsForRendering(
    applyGreekOrthography(doc, options),
    options,
  );

  for (let i = 0; i < doc.length; i++) {
    const token = rendered[i];

    if (token.kind === "literal") {
      out += encodePunctuation(token.value, "greek") ?? token.value;
      continue;
    }

    const contraction = contractedSigma(
      doc,
      i,
      options.orthography?.dentalSigma === "assimilate",
    );

    if (contraction !== undefined) {
      let base = ALPHABET[contraction.letter].greek;
      if (contraction.letter === "sigma") {
        if (rendersLunateSigma(contraction, options)) base = "ϲ";
        else if (
          options.orthography?.finalSigma !== "medial" &&
          isWordFinal(doc, i + 1)
        ) base = "ς";
      }
      out += contraction.uppercase ? base.toLocaleUpperCase("el") : base;
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
      options.orthography?.finalSigma !== "medial" &&
      isWordFinal(doc, i) &&
      !isGreekNumeralContext(doc, i)
    ) {
      base = "ς";
    }
    if (
      token.letter === "beta" &&
      !token.uppercase &&
      options.orthography?.medialBeta === "symbol" &&
      !isGreekNumeralContext(doc, i) &&
      !isWordInitial(doc, i)
    ) {
      base = "ϐ";
    }
    if (token.uppercase) base = base.toLocaleUpperCase("el");

    out += base +
      marks(token, options).map((mark) => GREEK_FOR[mark]).join("");
  }

  return applyGreekUnicode(out, options);
}

export function encodeBetaCode(
  doc: Document,
  options: ConversionOptions = {},
) {
  const rendered = prepareDiacriticsForRendering(doc, options);

  return rendered.map((token, index) => {
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
          options.orthography?.yotBetaCode === "#401"
        ? "#401"
        : ALPHABET[token.letter].beta;
    }

    if (options.orthography?.betaCodeCase === "uppercase") {
      base = base.toUpperCase();
    } else {
      base = base.toLowerCase();
    }

    const renderedMarks = marks(token, options);
    if (!token.uppercase) {
      return base + renderedMarks.map((mark) => BETA_FOR[mark]).join("");
    }

    const beforeLetter = renderedMarks
      .filter((mark) => mark !== "iota-subscript")
      .map((mark) => BETA_FOR[mark])
      .join("");
    const afterLetter = renderedMarks.includes("iota-subscript") ? "|" : "";
    return `*${beforeLetter}${base}${afterLetter}`;
  }).join("");
}

export function encodeTransliteration(
  doc: Document,
  options: ConversionOptions = {},
) {
  const uppercaseOutput = options.orthography?.letterCase === "uppercase";
  const rendered = prepareDiacriticsForRendering(doc, options);

  return rendered.map((token, index) => {
    if (token.kind === "literal") {
      return encodePunctuation(token.value, "transliteration") ?? token.value;
    }

    const modernDigraph = modernDigraphAt(doc, index, options);
    if (modernDigraph !== undefined) {
      const second = doc[index + 1];
      return caseDigraph(modernDigraph, token, second);
    }
    if (modernDigraphAt(doc, index - 1, options) !== undefined) return "";

    if (
      token.letter === "sigma" &&
      token.glyphVariant === "lunate-sigma" &&
      options.orthography?.lunateSigma === "c"
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
    const initialRough = preservesDiacritic("rough", options) &&
      breathingToken?.kind === "grapheme" &&
      breathingToken.diacritics.has("rough");
    const groupUppercase = initialRough && breathingStart !== undefined &&
      (rendered[breathingStart].kind === "grapheme" &&
          rendered[breathingStart].uppercase ||
        breathingToken.uppercase);
    let base = options.orthography?.nasalGamma !== "literal" &&
        isNasalGamma(doc, index)
      ? "n"
      : transliterationBase(doc, index, token.letter, options);
    if (token.uppercase && (!groupUppercase || uppercaseOutput)) {
      base = uppercaseOutput
        ? base.toUpperCase()
        : base[0].toUpperCase() + base.slice(1);
    }
    if (initialRough && index === breathingStart) {
      base = (groupUppercase ? "H" : "h") +
        (groupUppercase && uppercaseOutput
          ? base.toUpperCase()
          : base.toLowerCase());
    } else if (
      token.letter === "rho" &&
      options.orthography?.rho === "systematic"
    ) {
      if (next?.kind !== "grapheme" || next.letter !== "rho") {
        base += uppercaseOutput ? "H" : "h";
      }
    } else if (
      preservesDiacritic("rough", options) &&
      token.diacritics.has("rough") && index !== breathingIndex
    ) {
      if (token.letter === "rho") base += uppercaseOutput ? "H" : "h";
      else if (token.uppercase) {
        base = "H" +
          (uppercaseOutput ? base.toUpperCase() : base.toLowerCase());
      } else base = "h" + base;
    } else if (
      token.letter === "rho" &&
      previous?.kind === "grapheme" &&
      previous.letter === "rho"
    ) {
      base += uppercaseOutput ? "H" : "h";
    }
    const tokenMarks = marks(token, options);
    const transliteratedMarks = tokenMarks
      .filter((mark) => mark !== "coronis")
      .map((mark) => trMark(mark, options))
      .join("");
    const coronis = tokenMarks.includes("coronis")
      ? trMark("coronis", options)
      : "";

    return base + transliteratedMarks + coronis;
  }).join("").normalize("NFC");
}

function rendersLunateSigma(
  token: Pick<Grapheme, "glyphVariant">,
  options: ConversionOptions,
): boolean {
  return options.orthography?.sigma === "lunate" ||
    options.orthography?.sigma === "preserve" &&
      token.glyphVariant === "lunate-sigma";
}

function modernDigraphAt(
  document: Document,
  index: number,
  options: ConversionOptions,
): string | undefined {
  const policy = options.orthography?.modernDigraphs;
  if ((policy !== "phonetic" && policy !== "ala-lc") || index < 0) {
    return undefined;
  }

  const first = document[index];
  const second = document[index + 1];
  if (
    first?.kind !== "grapheme" ||
    second?.kind !== "grapheme" ||
    first.diacritics.size > 0 ||
    second.diacritics.size > 0 ||
    isGreekNumeralContext(document, index)
  ) {
    return undefined;
  }

  const initial = isWordInitial(document, index);
  if (first.letter === "mu" && second.letter === "pi" && initial) return "b";
  if (first.letter === "nu" && second.letter === "tau" && initial) {
    return policy === "ala-lc" ? "d\u0332" : "d";
  }
  if (
    policy === "ala-lc" &&
    first.letter === "gamma" &&
    second.letter === "kappa"
  ) {
    return initial || isWordFinal(document, index + 1) ? "gk" : "nk";
  }
  return undefined;
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
      return options.orthography?.archaicKoppa === "q"
        ? "q"
        : ALPHABET[letter].tr;
    case "beta":
      return options.orthography?.beta ?? "b";
    case "xi":
      return options.orthography?.xi ?? "x";
    case "phi":
      return options.orthography?.phi ?? "ph";
    case "chi":
      return options.orthography?.chi ?? "ch";
  }

  if (letter === "upsilon") {
    switch (options.orthography?.upsilon) {
      case "y":
        return "y";
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
      if (options.orthography?.eta === "ī") return "i\u0304";
      base = "e";
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

  switch (options.orthography?.longVowels) {
    case "circumflex":
      return `${base}\u0302`;
    default:
      return `${base}\u0304`;
  }
}

function trMark(mark: Diacritic, options: ConversionOptions) {
  switch (mark) {
    case "acute":
      return "\u0301";
    case "grave":
      return "\u0300";
    case "circumflex":
      return "\u0303";
    case "diaeresis":
      return "\u0308";
    case "iota-subscript":
      return "\u0327";
    case "macron":
      return "\u0304";
    case "breve":
      return "\u0306";
    case "coronis":
      switch (options.orthography?.coronis) {
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
