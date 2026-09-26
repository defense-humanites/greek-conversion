import { ARISTERI_KERAIA, DEXIA_KERAIA, isWordInitial } from "./context.ts";
import { literal } from "./model.ts";
import type { Diacritic, Document, Grapheme, Letter, Token } from "./model.ts";
import type { ConversionOptions } from "./options.ts";

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

export function applyOrthography(
  document: Document,
  options: ConversionOptions = {},
): Document {
  const numbered = applyNumeralOrthography(document, options);
  if (options.orthography?.doubleRho !== "smooth-rough") return numbered;

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
 * The monotonic policy is mechanical and lossy: it preserves diaeresis,
 * collapses acute/grave/circumflex to one acute, and removes breathings,
 * coronis, iota subscript, and explicit quantity. It does not use lexical or
 * morphological knowledge.
 */
export function applyGreekOrthography(
  document: Document,
  options: ConversionOptions = {},
): Document {
  const orthographic = applyOrthography(document, options);
  if (options.orthography?.accentuation !== "monotonic") {
    return orthographic;
  }

  let changed = false;
  const monotonic = orthographic.map((token) => {
    if (token.kind === "literal" || token.diacritics.size === 0) return token;

    const diacritics = new Set<Diacritic>();
    if (token.diacritics.has("diaeresis")) diacritics.add("diaeresis");
    if (
      token.diacritics.has("acute") ||
      token.diacritics.has("grave") ||
      token.diacritics.has("circumflex")
    ) {
      diacritics.add("acute");
    }

    if (sameDiacritics(token.diacritics, diacritics)) return token;
    changed = true;
    return { ...token, diacritics };
  });

  return changed ? monotonic : orthographic;
}

export function applyNumeralOrthography(
  document: Document,
  options: ConversionOptions = {},
): Document {
  const spaced = applyWhitespaceOrthography(document, options);
  const cased = applyLetterCaseOrthography(spaced, options);
  if (options.orthography?.numerals !== "decimal") return cased;

  const output: Token[] = [];
  for (let index = 0; index < cased.length;) {
    const numeral = readNumeral(cased, index);
    if (numeral === undefined) {
      output.push(cased[index]);
      index++;
      continue;
    }

    output.push(literal(String(numeral.value)));
    index = numeral.end;
  }
  return output;
}

function applyLetterCaseOrthography(
  document: Document,
  options: ConversionOptions,
): Document {
  const policy = options.orthography?.letterCase ?? "preserve";
  if (policy === "preserve") return document;

  let changed = false;
  const cased = document.map((token, index) => {
    if (token.kind === "literal") return token;

    const uppercase = policy === "uppercase" ||
      policy === "title" && isWordInitial(document, index);
    if (token.uppercase === uppercase) return token;

    changed = true;
    return { ...token, uppercase };
  });

  return changed ? cased : document;
}

function applyWhitespaceOrthography(
  document: Document,
  options: ConversionOptions,
): Document {
  if (options.orthography?.whitespace !== "collapse") return document;

  const output: Token[] = [];
  let pendingSpace = false;

  for (const token of document) {
    if (isWhitespace(token)) {
      pendingSpace = output.length > 0;
      continue;
    }

    if (pendingSpace) output.push(literal(" "));
    output.push(token);
    pendingSpace = false;
  }

  return output;
}

function readNumeral(
  document: Document,
  start: number,
): { value: number; end: number } | undefined {
  const previousToken = document[start - 1];
  if (
    previousToken?.kind === "grapheme" ||
    isLiteral(previousToken, ARISTERI_KERAIA)
  ) {
    return undefined;
  }

  let index = start;
  let value = 0;
  let hasThousands = false;

  if (isLiteral(document[index], ARISTERI_KERAIA)) {
    const thousands = numericValue(document[index + 1]);
    if (thousands === undefined || thousands > 9) return undefined;
    value = thousands * 1000;
    index += 2;
    hasThousands = true;
  }

  // Both ALA-LC Greek tables list στʹ as an alternate sign for six.
  if (
    !hasThousands && isLetter(document[index], "sigma") &&
    isLetter(document[index + 1], "tau") &&
    isLiteral(document[index + 2], DEXIA_KERAIA)
  ) {
    return { value: 6, end: index + 3 };
  }

  let previous = 1000;
  let digits = 0;
  while (index < document.length) {
    const current = numericValue(document[index]);
    if (current === undefined || current >= previous) break;
    value += current;
    previous = current;
    digits++;
    index++;
  }

  if (value === 0 || (digits === 0 && !hasThousands)) return undefined;
  if (isLiteral(document[index], DEXIA_KERAIA)) {
    return { value, end: index + 1 };
  }
  // A leading thousands sign suffices in the ALA-LC tables. Do not convert
  // a prefix of a longer sequence that fails the numeral ordering rule.
  if (hasThousands && document[index]?.kind !== "grapheme") {
    return { value, end: index };
  }
  return undefined;
}

function isLetter(token: Token | undefined, letter: Letter): boolean {
  return token?.kind === "grapheme" && token.letter === letter &&
    token.diacritics.size === 0;
}

function numericValue(token: Token | undefined): number | undefined {
  if (token?.kind !== "grapheme" || token.diacritics.size > 0) return undefined;
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
  return {
    ...token,
    diacritics: new Set([...token.diacritics, diacritic]),
  };
}

function sameDiacritics(
  left: ReadonlySet<Diacritic>,
  right: ReadonlySet<Diacritic>,
): boolean {
  return left.size === right.size && [...left].every((mark) => right.has(mark));
}
