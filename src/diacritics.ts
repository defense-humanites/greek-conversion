import {
  diacriticBit,
  diacriticsFromMask,
  ORDER,
  sharedDiacritics,
  sharedMask,
} from "./model.ts";
import type { Diacritic, Document, Format, Token } from "./model.ts";
import type { ConversionOptions, DiacriticDisposition } from "./options.ts";

/**
 * Whether a mark is written in the given format. The disposition of its
 * class decides, `diacritics.all` standing for every class not named; the
 * `quantity` spelling of transliteration can also omit the length marks.
 */
export function diacriticDisposition(
  diacritic: Diacritic,
  options: ConversionOptions,
  format: Format,
): DiacriticDisposition {
  if (
    format === "transliteration" &&
    (diacritic === "macron" || diacritic === "breve") &&
    options.transliteration?.quantity === "omit"
  ) return "remove";

  const policy = options.diacritics;
  const all = policy?.all ?? "preserve";
  switch (diacritic) {
    case "acute":
    case "grave":
    case "circumflex":
      return policy?.accents ?? all;
    case "smooth":
      return policy?.smoothBreathing ?? all;
    case "rough":
      return policy?.roughBreathing ?? all;
    case "coronis":
      return policy?.coronis ?? all;
    case "diaeresis":
      return policy?.diaeresis ?? all;
    case "iota-subscript":
      return policy?.iotaSubscript ?? all;
    case "macron":
    case "breve":
      return policy?.quantity ?? all;
  }
}

/**
 * Whether the transliteration parser supplies a smooth breathing to an
 * unmarked initial vowel group.
 *
 * Scientific transliteration omits the smooth breathing, so the polytonic
 * reading infers it. Nothing is inferred when the orthography writes the
 * breathing explicitly (`"greek"`, `"apostrophe"`), or does not write smooth
 * breathings at all (monotonic accentuation, removal policies).
 */
export function infersSmoothBreathing(options: ConversionOptions): boolean {
  return options.transliteration?.smoothBreathing !== "greek" &&
    options.transliteration?.smoothBreathing !== "apostrophe" &&
    options.greek?.accentuation !== "monotonic" &&
    preservesDiacritic("smooth", options, "greek");
}

export function preservesDiacritic(
  diacritic: Diacritic,
  options: ConversionOptions,
  format: Format,
): boolean {
  return diacriticDisposition(diacritic, options, format) === "preserve";
}

/**
 * Builds the diacritic view used for rendering without changing the semantic
 * document used by contextual orthography. Marks on the first vowel of a
 * pair keep signalling hiatus on the detached view, so removing a diaeresis
 * or an iota subscript cannot turn that pair into a diphthong.
 */
export function prepareDiacriticsForRendering(
  document: Document,
  options: ConversionOptions,
  format: Format,
): Document {
  // The marks this format and these options remove, as a mask: a shared set
  // is tested and filtered with one operation. A caller's own set has no
  // mask and is checked mark by mark, as before.
  const removed = ORDER.reduce(
    (mask, mark) =>
      preservesDiacritic(mark, options, format)
        ? mask
        : mask | diacriticBit(mark),
    0,
  );

  const removesAnyMark = document.some((token) => {
    if (token.kind !== "grapheme") return false;
    const mask = sharedMask(token.diacritics);
    if (mask !== undefined) return (mask & removed) !== 0;
    for (const mark of token.diacritics) {
      if (!preservesDiacritic(mark, options, format)) return true;
    }
    return false;
  });

  if (!removesAnyMark) return document;

  // A token that loses nothing is kept as it is, and a token that loses marks
  // is copied once per call: documents read for the library share their
  // tokens, so a long text has a few hundred copies to make, not one per
  // letter. The rendered document is only read by the encoders.
  const copies = new Map<Token, Token>();
  const rendered: Token[] = document.map((token) => {
    if (token.kind === "literal") return token;
    const mask = sharedMask(token.diacritics);
    if (mask !== undefined && (mask & removed) === 0) return token;
    const known = copies.get(token);
    if (known !== undefined) return known;
    const copy: Token = {
      ...token,
      diacritics: mask !== undefined
        ? diacriticsFromMask(mask & ~removed)
        : sharedDiacritics(
          [...token.diacritics].filter((mark) =>
            preservesDiacritic(mark, options, format)
          ),
        ),
    };
    copies.set(token, copy);
    return copy;
  });

  return rendered;
}
