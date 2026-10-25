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
 * The cache holds at most {@link SHARED_TOKEN_LIMIT} tokens, whatever the
 * input; past that, readers create tokens as before.
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

/** Upper bound of the cache, graphemes and literals together. */
export const SHARED_TOKEN_LIMIT = 4096;

// A grapheme key packs the letter, the flags (bit 0: uppercase; bits 1–2:
// variant) and the mark mask, one bit per entry of ORDER.
const MASKS = 1 << ORDER.length;
const FLAGS = 8;

const graphemes = new Map<number, Grapheme>();
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
  if (graphemes.size + literals.size < SHARED_TOKEN_LIMIT) {
    graphemes.set(key, token);
  }
  return token;
}

/** Returns the shared literal for a value. */
export function sharedLiteral(value: string): Literal {
  const known = literals.get(value);
  if (known !== undefined) return known;

  const token = literal(value);
  if (graphemes.size + literals.size < SHARED_TOKEN_LIMIT) {
    literals.set(value, token);
  }
  return token;
}

/** Number of cached tokens, for tests. */
export function sharedTokenCount(): number {
  return graphemes.size + literals.size;
}
