import { normalizeInitialDiphthongBreathings } from "./context.ts";
import type { Diacritic, Document, Format, Token } from "./model.ts";
import type { ConversionOptions, DiacriticDisposition } from "./options.ts";

export function diacriticDisposition(
  diacritic: Diacritic,
  options: ConversionOptions,
  format: Format,
): DiacriticDisposition {
  if (options.removeDiacritics) {
    // Rough breathing is rendered as a Latin letter in transliteration.
    // An explicit request to remove that class still takes precedence.
    return diacritic === "rough" && format === "transliteration" &&
        options.diacritics?.roughBreathing !== "remove"
      ? "preserve"
      : "remove";
  }

  const policy = options.diacritics;
  switch (diacritic) {
    case "acute":
    case "grave":
    case "circumflex":
      return policy?.accents ?? "preserve";
    case "smooth":
      return policy?.smoothBreathing ?? "preserve";
    case "rough":
      return policy?.roughBreathing ?? "preserve";
    case "coronis":
      return policy?.coronis ?? "preserve";
    case "diaeresis":
      return policy?.diaeresis ?? "preserve";
    case "iota-subscript":
      return policy?.iotaSubscript ?? "preserve";
    case "macron":
    case "breve":
      return policy?.quantity ?? "preserve";
  }
}

export function preservesDiacritic(
  diacritic: Diacritic,
  options: ConversionOptions,
  format: Format,
): boolean {
  return diacriticDisposition(diacritic, options, format) === "preserve";
}

/** Removes canonical diacritics without mutating the source document. */
export function stripDiacritics(document: Document): Document {
  let changed = false;
  const stripped = document.map((token) => {
    if (token.kind === "literal" || token.diacritics.size === 0) return token;

    changed = true;
    return { ...token, diacritics: new Set<Diacritic>() };
  });

  return changed ? stripped : document;
}

/**
 * Builds the diacritic view used for rendering without changing the semantic
 * document used by contextual orthography. Removing diaeresis or iota
 * subscript can expose a diphthong, so initial breathings are normalized again
 * on the detached view to make the first rendering canonical and idempotent.
 */
export function prepareDiacriticsForRendering(
  document: Document,
  options: ConversionOptions,
  format: Format,
): Document {
  const removesAnyMark = document.some((token) =>
    token.kind === "grapheme" &&
    [...token.diacritics].some((mark) =>
      !preservesDiacritic(mark, options, format)
    )
  );

  if (!removesAnyMark) return document;

  const rendered: Token[] = document.map((token) =>
    token.kind === "literal" ? token : {
      ...token,
      diacritics: new Set(
        [...token.diacritics].filter((mark) =>
          preservesDiacritic(mark, options, format)
        ),
      ),
    }
  );

  normalizeInitialDiphthongBreathings(rendered);
  return rendered;
}
