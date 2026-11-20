/**
 * Signs that stand for several letters: the καί symbol `ϗ`, the ου ligature
 * `ȣ`, and the στ ligature `ϛ`. A reader gives the letters, and notes the
 * sign as the glyph variant of the first one; Greek output writes the sign
 * again under `greek.ligatures: "preserve"`, and Beta Code its TLG code where
 * the TLG has one.
 *
 * @module
 */
import {
  type Diacritic,
  type Document,
  type GlyphVariant,
  type Grapheme,
  type Letter,
  NO_DIACRITICS,
  ownedGrapheme,
  type Token,
} from "./model.ts";
import type { ConversionOptions } from "./options.ts";

/** A sign that stands for several letters. */
export interface Ligature {
  /** The letters it stands for, the first of which notes it. */
  readonly letters: readonly Letter[];
  /** Its small Greek form; `greekUpper()` gives the capital. */
  readonly greek: string;
  /** Its TLG Beta Code, small and capital, where the TLG gives one. */
  readonly beta: { readonly small?: string; readonly capital?: string };
}

const LIGATURES: Readonly<Partial<Record<GlyphVariant, Ligature>>> = {
  "kai-symbol": {
    letters: ["kappa", "alpha", "iota"],
    greek: "ϗ",
    beta: { small: "#1532", capital: "#1531" },
  },
  "ou-ligature": {
    letters: ["omicron", "upsilon"],
    greek: "ȣ",
    beta: { capital: "#1521" },
  },
  "stigma-ligature": {
    letters: ["sigma", "tau"],
    greek: "ϛ",
    beta: {},
  },
};

/** The number of letters a sign stands for, by the variant noting it. */
export const ligatureLength = (variant: GlyphVariant | undefined): number =>
  variant === undefined ? 1 : LIGATURES[variant]?.letters.length ?? 1;

/** A sign as a reader finds it: the variant it notes, and its case. */
interface ReadLigature {
  readonly variant: GlyphVariant;
  readonly uppercase: boolean;
}

/**
 * The signs that the Greek reader reads as several letters, by code unit:
 * `ϗ` and `Ϗ`, and `ȣ` and `Ȣ`, Latin letters that editions use for the Greek
 * ligature. The stigma is read as `στ` only on request
 * (`readStigmaLigatures()`).
 */
export const GREEK_LIGATURES: ReadonlyMap<number, ReadLigature> = new Map([
  [0x03d7, { variant: "kai-symbol", uppercase: false }],
  [0x03cf, { variant: "kai-symbol", uppercase: true }],
  [0x0223, { variant: "ou-ligature", uppercase: false }],
  [0x0222, { variant: "ou-ligature", uppercase: true }],
]);

/** The TLG `#` codes that the Beta Code reader reads as several letters. */
export const BETA_LIGATURES: ReadonlyMap<string, ReadLigature> = new Map([
  ["1532", { variant: "kai-symbol", uppercase: false }],
  ["1531", { variant: "kai-symbol", uppercase: true }],
  ["1521", { variant: "ou-ligature", uppercase: true }],
]);

/**
 * The letters a sign stands for, the first noting it and in its case, the
 * last with the marks written after the sign (`ϗ́` is `καί`). The others
 * are small, unless `capitals`: a capital sign before a capital is set in
 * capitals (`ȢΤΟΣ`), and elsewhere begins a word (`Ȣ̓τος`).
 */
export function ligatureLetters(
  { variant, uppercase }: ReadLigature,
  diacritics: ReadonlySet<Diacritic> = NO_DIACRITICS,
  capitals = false,
): Grapheme[] {
  const { letters } = LIGATURES[variant]!;
  const last = letters.length - 1;
  return letters.map((letter, k) =>
    ownedGrapheme(
      letter,
      uppercase && (k === 0 || capitals),
      k === last ? diacritics : NO_DIACRITICS,
      k === 0 ? variant : undefined,
    )
  );
}

/**
 * The sign that Greek output writes for the letters from `index`: `token`,
 * the one there unless another is compared with it, notes it, the letters
 * it stands for follow, with no mark before the last, and
 * `greek.ligatures` keeps it.
 */
export function writtenLigature(
  document: Document,
  index: number,
  options: ConversionOptions,
  token: Token | undefined = document[index],
): Ligature | undefined {
  if (token?.kind !== "grapheme" || token.glyphVariant === undefined) {
    return undefined;
  }
  const ligature = LIGATURES[token.glyphVariant];
  if (
    ligature === undefined || options.greek?.ligatures === "standard"
  ) return undefined;
  const { letters } = ligature;
  for (let k = 0; k < letters.length; k++) {
    const letter = k === 0 ? token : document[index + k];
    if (
      letter?.kind !== "grapheme" || letter.letter !== letters[k] ||
      k < letters.length - 1 && letter.diacritics.size > 0
    ) return undefined;
  }
  return ligature;
}

/** The TLG Beta Code of the sign that Greek output writes at `index`. */
export function betaLigature(
  document: Document,
  index: number,
  options: ConversionOptions,
  token: Token | undefined = document[index],
): { code: string; length: number } | undefined {
  const ligature = writtenLigature(document, index, options, token);
  const code = ligature?.beta[
    (token as Grapheme).uppercase ? "capital" : "small"
  ];
  return code === undefined
    ? undefined
    : { code, length: ligature!.letters.length };
}

/**
 * Reads as `σ` and `τ` each stigma between two letters (`ἐϛὶ`), which older
 * printing used for them, in a document read from any format; a stigma at
 * the end of a word or before a keraia (`ιϛ`, `ϛʹ`) stays the numeral.
 * `starts`, when given, gets the start of the stigma for the `τ` too.
 */
export function readStigmaLigatures(
  document: Document,
  starts?: number[],
): Document {
  const isLigature = (i: number): boolean => {
    const token = document[i];
    return i > 0 && i < document.length - 1 &&
      token.kind === "grapheme" && token.letter === "stigma" &&
      token.glyphVariant === undefined &&
      document[i - 1].kind === "grapheme" &&
      document[i + 1].kind === "grapheme";
  };
  let first = 1;
  while (first < document.length - 1 && !isLigature(first)) first++;
  if (first >= document.length - 1) return document;

  // One copy of the tokens, and of their starts, from the first stigma on.
  const out = document.slice(0, first);
  const read = starts?.slice(0, first);
  for (let i = first; i < document.length; i++) {
    if (!isLigature(i)) {
      out.push(document[i]);
      read?.push(starts![i]);
      continue;
    }
    const token = document[i] as Grapheme;
    const [sigma, tau] = ligatureLetters(
      { variant: "stigma-ligature", uppercase: token.uppercase },
      token.diacritics,
    );
    tau.uppercase = token.uppercase &&
      (document[i + 1] as Grapheme).uppercase;
    out.push(sigma, tau);
    // The `τ` starts where the stigma does.
    read?.push(starts![i], starts![i]);
  }
  if (starts !== undefined) {
    for (let i = document.length; i < starts.length; i++) {
      read!.push(starts[i]);
    }
    starts.length = 0;
    for (const start of read!) starts.push(start);
  }
  return out;
}
