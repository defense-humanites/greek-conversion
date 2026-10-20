/** Text representations understood by the conversion engine. */
export type Format = "greek" | "beta-code" | "transliteration";

/** Every supported format identifier, in documentation order. */
export const FORMATS: readonly Format[] = Object.freeze([
  "greek",
  "beta-code",
  "transliteration",
]);

/**
 * Narrows a runtime value to a supported format identifier.
 *
 * @throws {RangeError} If the value is not a supported format.
 */
export function assertFormat(format: unknown): asserts format is Format {
  if (!FORMATS.includes(format as Format)) {
    throw new RangeError(`Unknown format: ${String(format)}`);
  }
}

/**
 * Checks that conversion input is a string before parsing it.
 *
 * @throws {TypeError} If the input is not a string.
 */
export function assertTextInput(input: unknown): asserts input is string {
  if (typeof input !== "string") {
    throw new TypeError(
      `Expected a string to convert, received ${
        input === null ? "null" : typeof input
      }.`,
    );
  }
}

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
  /**
   * Semantic marks. Sets built by the library are shared between graphemes
   * and read-only: to change the marks, assign a new set (and validate it
   * before encoding).
   */
  diacritics: ReadonlySet<Diacritic>;
  /** Optional source glyph provenance used by preserving output policies. */
  glyphVariant?: GlyphVariant;
}

/** Non-grapheme text, including unknown input and canonical punctuation. */
export interface Literal {
  /** Discriminant distinguishing literal text from Greek graphemes. */
  kind: "literal";
  /** Text passed through unless a format-specific punctuation rule applies. */
  value: string;
}

/** A semantic Greek grapheme or preserved literal text. */
export type Token = Grapheme | Literal;

/**
 * Readonly token sequence. Its tokens are mutable; their diacritic sets are
 * replaced, not modified.
 */
export type Document = readonly Token[];

/** Every diacritic, in canonical order; the index is the bit of its mask. */
const DIACRITICS: readonly Diacritic[] = [
  "smooth",
  "coronis",
  "rough",
  "diaeresis",
  "acute",
  "grave",
  "circumflex",
  "macron",
  "breve",
  "iota-subscript",
];

const BITS = new Map<unknown, number>(
  DIACRITICS.map((diacritic, index) => [diacritic, 1 << index]),
);

const READ_ONLY_MESSAGE =
  "Grapheme diacritic sets are shared and read-only; assign a new Set instead";

/**
 * Diacritic sets shared by every grapheme that carries the same marks.
 *
 * There are at most 2^10 distinct sets, so one instance per combination
 * replaces one allocation per grapheme. They stay plain `Set` objects, so
 * structural equality with a caller's `new Set(...)` still holds; their
 * mutating methods are shadowed by non-enumerable throwing ones, since a
 * mutation would change every grapheme at once.
 */
const SHARED: (ReadonlySet<Diacritic> | undefined)[] = new Array(
  1 << DIACRITICS.length,
);
// Non-enumerable, so invisible to structural equality.
const MASK = Symbol("diacritic mask");
type SharedSet = ReadonlySet<Diacritic> & { readonly [MASK]?: number };

const readOnly = (): never => {
  throw new TypeError(READ_ONLY_MESSAGE);
};

function sharedFromMask(mask: number): ReadonlySet<Diacritic> {
  const cached = SHARED[mask];
  if (cached) return cached;
  const set = new Set<Diacritic>();
  for (let bit = 0; bit < DIACRITICS.length; bit++) {
    if (mask & (1 << bit)) set.add(DIACRITICS[bit]);
  }
  for (const method of ["add", "delete", "clear"]) {
    Object.defineProperty(set, method, { value: readOnly });
  }
  Object.defineProperty(set, MASK, { value: mask });
  Object.freeze(set);
  return SHARED[mask] = set;
}

/** Returns the mask of `marks`, or `undefined` if one value is not a diacritic. */
function maskOf(marks: Iterable<unknown>): number | undefined {
  let mask = 0;
  for (const mark of marks) {
    const bit = BITS.get(mark);
    if (bit === undefined) return undefined;
    mask |= bit;
  }
  return mask;
}

/**
 * Returns the mask of a shared set, or `undefined` for a set the library did
 * not build (whose content may change between calls).
 */
export const sharedMask = (marks: ReadonlySet<Diacritic>): number | undefined =>
  (marks as SharedSet)[MASK];

/** Bit of a diacritic in the masks read by {@link diacriticsFromMask}. */
export const diacriticBit = (diacritic: Diacritic): number =>
  BITS.get(diacritic)!;

/** Returns the shared set for a mask built with {@link diacriticBit}. */
export const diacriticsFromMask = (mask: number): ReadonlySet<Diacritic> =>
  SHARED[mask] ?? sharedFromMask(mask);

/** The shared empty diacritic set. */
export const NO_DIACRITICS: ReadonlySet<Diacritic> = sharedFromMask(0);

/**
 * Returns the shared read-only set holding these marks.
 *
 * Values that are not diacritics (possible in documents built by callers
 * outside TypeScript) cannot be shared: they are kept in a new set so that
 * validation still reports them.
 */
export function sharedDiacritics(
  marks: Iterable<Diacritic>,
): ReadonlySet<Diacritic> {
  if ((marks as SharedSet)[MASK] !== undefined) {
    return marks as ReadonlySet<Diacritic>;
  }
  // A one-shot iterable must be read once, whatever the outcome.
  const values = marks instanceof Set || Array.isArray(marks)
    ? marks
    : [...marks];
  const mask = maskOf(values);
  return mask === undefined ? new Set(values) : sharedFromMask(mask);
}

/** Returns the shared set of `marks` with `diacritic` added. */
export function withDiacritic(
  marks: ReadonlySet<Diacritic>,
  diacritic: Diacritic,
): ReadonlySet<Diacritic> {
  if (marks.has(diacritic)) return marks;
  const mask = (marks as SharedSet)[MASK] ?? maskOf(marks);
  return mask === undefined
    ? new Set([...marks, diacritic])
    : sharedFromMask(mask | BITS.get(diacritic)!);
}

/** Returns the shared set of `marks` with `diacritic` removed. */
export function withoutDiacritic(
  marks: ReadonlySet<Diacritic>,
  diacritic: Diacritic,
): ReadonlySet<Diacritic> {
  if (!marks.has(diacritic)) return marks;
  const mask = (marks as SharedSet)[MASK] ?? maskOf(marks);
  return mask === undefined
    ? new Set([...marks].filter((mark) => mark !== diacritic))
    : sharedFromMask(mask & ~BITS.get(diacritic)!);
}

/**
 * Creates a grapheme from a diacritic set that is already shared.
 *
 * Internal to the parsers, which obtain the set from
 * {@link diacriticsFromMask} or {@link sharedDiacritics}; the public
 * {@link grapheme} accepts any iterable instead.
 */
export const ownedGrapheme = (
  letter: Letter,
  uppercase: boolean,
  diacritics: ReadonlySet<Diacritic>,
  glyphVariant?: GlyphVariant,
): Grapheme =>
  glyphVariant === undefined
    ? { kind: "grapheme", letter, uppercase, diacritics }
    : { kind: "grapheme", letter, uppercase, diacritics, glyphVariant };

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
  diacritics: sharedDiacritics(diacritics),
  ...(glyphVariant === undefined ? {} : { glyphVariant }),
});

/** Creates a literal token whose value is preserved by conversion. */
export const literal = (value: string): Literal => ({ kind: "literal", value });
