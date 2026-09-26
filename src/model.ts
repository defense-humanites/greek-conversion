/** Text representations understood by the conversion engine. */
export type Format = "greek" | "beta-code" | "transliteration";

/** Semantic Greek letters represented by a canonical grapheme. */
export type Letter =
  | "alpha"
  | "beta"
  | "gamma"
  | "delta"
  | "epsilon"
  | "zeta"
  | "eta"
  | "theta"
  | "iota"
  | "kappa"
  | "lambda"
  | "mu"
  | "nu"
  | "xi"
  | "omicron"
  | "pi"
  | "rho"
  | "sigma"
  | "tau"
  | "upsilon"
  | "phi"
  | "chi"
  | "psi"
  | "omega"
  | "digamma"
  | "yot"
  | "stigma"
  | "koppa"
  | "archaic-koppa"
  | "sampi";

/** Semantic diacritics represented independently from Unicode spelling. */
export type Diacritic =
  | "smooth"
  | "coronis"
  | "rough"
  | "acute"
  | "grave"
  | "circumflex"
  | "diaeresis"
  | "iota-subscript"
  | "macron"
  | "breve";

/** Source glyph distinctions retained independently from the Greek letter. */
export type GlyphVariant = "lunate-sigma" | "final-sigma" | "medial-sigma";

/** One canonical Greek letter with mutable case and semantic diacritics. */
export interface Grapheme {
  /** Discriminant distinguishing Greek graphemes from literal tokens. */
  kind: "grapheme";
  /** Semantic Greek letter. */
  letter: Letter;
  /** Whether the letter is uppercase. */
  uppercase: boolean;
  /** Semantic marks; validate manually modified sets before encoding. */
  diacritics: Set<Diacritic>;
  /** Optional source glyph provenance used by preserving output policies. */
  glyphVariant?: GlyphVariant;
}

/** Uninterpreted text preserved verbatim between recognized graphemes. */
export interface Literal {
  /** Discriminant distinguishing literal text from Greek graphemes. */
  kind: "literal";
  /** Preserved literal value. */
  value: string;
}

/** A semantic Greek grapheme or preserved literal text. */
export type Token = Grapheme | Literal;

/** Readonly token sequence; its tokens and grapheme diacritic sets are mutable. */
export type Document = readonly Token[];

/** Creates a canonical Greek grapheme. */
export const grapheme = (
  letter: Letter,
  uppercase = false,
  diacritics: Iterable<Diacritic> = [],
  glyphVariant?: GlyphVariant,
): Grapheme => ({
  kind: "grapheme",
  letter,
  uppercase,
  diacritics: new Set(diacritics),
  ...(glyphVariant === undefined ? {} : { glyphVariant }),
});

/** Creates a literal token whose value is preserved by conversion. */
export const literal = (value: string): Literal => ({ kind: "literal", value });
