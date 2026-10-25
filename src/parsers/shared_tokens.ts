import { ALPHABET } from "../alphabet.ts";
import {
  diacriticsFromMask,
  type GlyphVariant,
  type Grapheme,
  type Letter,
  type Literal,
  literal,
  ORDER,
  ownedGrapheme,
} from "../model.ts";

/**
 * Tokens shared by every occurrence of the same grapheme or literal, for the
 * documents the library reads for itself (`convert()`, `convertDetailed()`,
 * converters…) and never hands to callers. A text has few distinct tokens
 * (Thucydides, book I: 155 graphemes and 15 literals for 100,518 tokens), so
 * sharing them spares one allocation per token, and on long texts the
 * garbage collection that follows.
 *
 * Shared tokens must never be modified in place: the change would reach every
 * occurrence (`classifyCoronides()` now replaces the token it reclassifies;
 * tests/shared_tokens_test.ts checks it on a crasis). They are not frozen: a
 * frozen object has another hidden class, and encoders that meet both kinds
 * ran about 3 % slower. `parse()` keeps returning tokens of its own, which
 * `Document` documents as mutable.
 *
 * The cache is bounded whatever the input, and kept in three parts so that
 * no kind of token can use up the room of another for the rest of the
 * process (non-Greek text yields one literal per distinct character):
 *
 * - at most {@link SHARED_GRAPHEME_LIMIT} graphemes;
 * - literals of one code unit below {@link LITERAL_UNITS} (Latin, Greek,
 *   combining marks, general punctuation: whatever a Greek text holds besides
 *   its letters), always shared, at most one per unit of that range;
 * - at most {@link SHARED_LITERAL_LIMIT} other literals.
 *
 * Past a limit, readers create tokens of that kind as before.
 */

/** Letter indices, in the order the readers use. */
export const LETTERS = Object.keys(ALPHABET) as Letter[];

/** Glyph variants by index; a reader's flags hold the index in bits 1–2. */
export const VARIANTS: readonly (GlyphVariant | undefined)[] = [
  undefined,
  "lunate-sigma",
  "final-sigma",
  "medial-sigma",
];

/** Upper bound of the shared graphemes. */
export const SHARED_GRAPHEME_LIMIT = 3072;

/** Literals of one code unit below this one are always shared. */
export const LITERAL_UNITS = 0x2070;

/** Upper bound of the other shared literals. */
export const SHARED_LITERAL_LIMIT = 1024;

// A grapheme key packs the letter, the flags (bit 0: uppercase; bits 1–2:
// variant) and the mark mask, one bit per entry of ORDER.
const MASKS = 1 << ORDER.length;
const FLAGS = 8;

const graphemes = new Map<number, Grapheme>();
const unitLiterals = new Map<number, Literal>();
const literals = new Map<string, Literal>();

/** Returns the shared grapheme for a letter index, flags and mark mask. */
export function sharedGrapheme(
  letter: number,
  flags: number,
  marks: number,
): Grapheme {
  const key = (letter * FLAGS + flags) * MASKS + marks;
  const known = graphemes.get(key);
  if (known !== undefined) return known;

  const token = ownedGrapheme(
    LETTERS[letter],
    (flags & 1) === 1,
    diacriticsFromMask(marks),
    VARIANTS[flags >> 1],
  );
  if (graphemes.size < SHARED_GRAPHEME_LIMIT) graphemes.set(key, token);
  return token;
}

/** Returns the shared literal for a value. */
export function sharedLiteral(value: string): Literal {
  if (value.length === 1) {
    const unit = value.charCodeAt(0);
    if (unit < LITERAL_UNITS) {
      let token = unitLiterals.get(unit);
      if (token === undefined) {
        token = literal(value);
        unitLiterals.set(unit, token);
      }
      return token;
    }
  }

  const known = literals.get(value);
  if (known !== undefined) return known;

  const token = literal(value);
  if (literals.size < SHARED_LITERAL_LIMIT) literals.set(value, token);
  return token;
}

/** Number of cached tokens of each kind, for tests. */
export function sharedTokenCounts(): {
  graphemes: number;
  unitLiterals: number;
  literals: number;
} {
  return {
    graphemes: graphemes.size,
    unitLiterals: unitLiterals.size,
    literals: literals.size,
  };
}

/**
 * Empties the cache, for tests: a test that fills it must not leave the tests
 * that run after it in the same file on the unshared path.
 */
export function resetSharedTokens(): void {
  graphemes.clear();
  unitLiterals.clear();
  literals.clear();
}
