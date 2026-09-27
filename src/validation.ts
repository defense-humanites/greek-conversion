import type { Diacritic, Document, Grapheme, Letter } from "./model.ts";
import { initialBreathingStart } from "./context.ts";
import { ALPHABET, ORDER } from "./alphabet.ts";

/** Machine-readable categories emitted by canonical-document validation. */
export type ValidationCode =
  | "conflicting-accents"
  | "conflicting-breathings"
  | "conflicting-coronis-breathing"
  | "conflicting-quantities"
  | "incompatible-diaeresis-breathing"
  | "invalid-accent"
  | "invalid-breathing"
  | "invalid-coronis"
  | "invalid-circumflex"
  | "invalid-diaeresis"
  | "invalid-iota-subscript"
  | "invalid-quantity"
  | "invalid-letter"
  | "invalid-diacritic"
  | "invalid-glyph-variant"
  | "invalid-token"
  | "invalid-literal"
  | "invalid-case"
  | "invalid-diacritics";

/** One structural problem found in a canonical document. */
export interface ValidationDiagnostic {
  /** Stable category suitable for programmatic handling. */
  code: ValidationCode;
  /** Zero-based token index in the validated document. */
  index: number;
  /** Human-readable English explanation. */
  message: string;
}

const VOWELS = new Set<Letter>([
  "alpha",
  "epsilon",
  "eta",
  "iota",
  "omicron",
  "upsilon",
  "omega",
]);
const LONG_VOWELS = new Set<Letter>([
  "alpha",
  "eta",
  "iota",
  "upsilon",
  "omega",
]);
const DIAERESIS_LETTERS = new Set<Letter>(["iota", "upsilon"]);
const IOTA_SUBSCRIPT_LETTERS = new Set<Letter>(["alpha", "eta", "omega"]);
const MACRON_LETTERS = new Set<Letter>([
  "alpha",
  "eta",
  "iota",
  "upsilon",
  "omega",
]);
const BREVE_LETTERS = new Set<Letter>(["alpha", "iota", "upsilon"]);
const ACCENTS = ["acute", "grave", "circumflex"] as const;
const BREATHINGS = ["smooth", "rough"] as const;
const QUANTITIES = ["macron", "breve"] as const;
const DIACRITICS = new Set<Diacritic>(ORDER);
const SIGMA_VARIANTS = new Set([
  "lunate-sigma",
  "final-sigma",
  "medial-sigma",
]);

/**
 * Reports structurally invalid combinations without modifying the document.
 *
 * Parsed documents are normally valid. This helper is primarily intended for
 * documents constructed or modified through the advanced `./document` API.
 */
export function validateDocument(
  document: Document,
): readonly ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];

  // A malformed token can also break context checks on adjacent graphemes.
  // Inspect the whole shape before checking the semantic combinations.
  for (let index = 0; index < document.length; index++) {
    const token = document[index];
    if (token === null || typeof token !== "object") {
      add(diagnostics, "invalid-token", index, "Expected a document token.");
      continue;
    }
    if (token.kind === "literal") {
      if (typeof token.value !== "string") {
        add(diagnostics, "invalid-literal", index, "Expected literal text.");
      }
      continue;
    }
    if (token.kind !== "grapheme") {
      add(diagnostics, "invalid-token", index, "Unknown document token kind.");
      continue;
    }
    if (typeof token.uppercase !== "boolean") {
      add(diagnostics, "invalid-case", index, "Expected a boolean case flag.");
    }
    if (!(token.diacritics instanceof Set)) {
      add(
        diagnostics,
        "invalid-diacritics",
        index,
        "Expected a set of diacritics.",
      );
      continue;
    }
    if (!Object.hasOwn(ALPHABET, token.letter)) {
      add(diagnostics, "invalid-letter", index, "Unknown Greek letter.");
      continue;
    }
    for (const mark of token.diacritics) {
      if (!DIACRITICS.has(mark)) {
        add(diagnostics, "invalid-diacritic", index, "Unknown diacritic.");
      }
    }
    if (
      token.glyphVariant !== undefined &&
      (token.letter !== "sigma" || !SIGMA_VARIANTS.has(token.glyphVariant) ||
        token.uppercase === true && token.glyphVariant === "final-sigma")
    ) {
      add(
        diagnostics,
        "invalid-glyph-variant",
        index,
        "This source glyph variant is not valid for the selected letter and case.",
      );
    }
  }

  if (diagnostics.length > 0) return diagnostics;

  document.forEach((token, index) => {
    if (token.kind === "grapheme") {
      validateGrapheme(document, token, index, diagnostics);
    }
  });

  return diagnostics;
}

function validateGrapheme(
  document: Document,
  token: Grapheme,
  index: number,
  diagnostics: ValidationDiagnostic[],
): void {
  const { diacritics, letter } = token;
  const accentCount = count(diacritics, ACCENTS);
  const breathingCount = count(diacritics, BREATHINGS);
  const quantityCount = count(diacritics, QUANTITIES);

  if (accentCount > 1) {
    add(
      diagnostics,
      "conflicting-accents",
      index,
      "A grapheme cannot carry multiple accents.",
    );
  }
  if (breathingCount > 1) {
    add(
      diagnostics,
      "conflicting-breathings",
      index,
      "A grapheme cannot carry both breathings.",
    );
  }
  if (diacritics.has("coronis") && breathingCount > 0) {
    add(
      diagnostics,
      "conflicting-coronis-breathing",
      index,
      "A coronis cannot be combined with a breathing.",
    );
  }
  if (quantityCount > 1) {
    add(
      diagnostics,
      "conflicting-quantities",
      index,
      "A grapheme cannot be both long and short.",
    );
  }
  if (accentCount > 0 && !VOWELS.has(letter)) {
    add(
      diagnostics,
      "invalid-accent",
      index,
      "Accents can only be applied to vowels.",
    );
  }
  if (diacritics.has("circumflex") && !LONG_VOWELS.has(letter)) {
    add(
      diagnostics,
      "invalid-circumflex",
      index,
      "A circumflex requires a potentially long vowel.",
    );
  }
  if (breathingCount > 0 && !VOWELS.has(letter) && letter !== "rho") {
    add(
      diagnostics,
      "invalid-breathing",
      index,
      "Breathings can only be applied to vowels or rho.",
    );
  }
  if (
    diacritics.has("coronis") &&
    (
      !VOWELS.has(letter) ||
      initialBreathingStart(document, index) !== undefined
    )
  ) {
    add(
      diagnostics,
      "invalid-coronis",
      index,
      "A coronis requires a non-initial vowel.",
    );
  }
  if (diacritics.has("diaeresis") && !DIAERESIS_LETTERS.has(letter)) {
    add(
      diagnostics,
      "invalid-diaeresis",
      index,
      "A diaeresis can only be applied to iota or upsilon.",
    );
  }
  if (diacritics.has("diaeresis") && breathingCount > 0) {
    add(
      diagnostics,
      "incompatible-diaeresis-breathing",
      index,
      "A grapheme cannot carry both a diaeresis and a breathing.",
    );
  }
  if (diacritics.has("iota-subscript") && !IOTA_SUBSCRIPT_LETTERS.has(letter)) {
    add(
      diagnostics,
      "invalid-iota-subscript",
      index,
      "An iota subscript requires alpha, eta, or omega.",
    );
  }
  if (
    diacritics.has("macron") && !MACRON_LETTERS.has(letter) ||
    diacritics.has("breve") && !BREVE_LETTERS.has(letter)
  ) {
    add(
      diagnostics,
      "invalid-quantity",
      index,
      "This explicit quantity mark is not valid on the selected letter.",
    );
  }
}

function count(
  diacritics: ReadonlySet<Diacritic>,
  values: readonly Diacritic[],
): number {
  return values.filter((value) => diacritics.has(value)).length;
}

function add(
  diagnostics: ValidationDiagnostic[],
  code: ValidationCode,
  index: number,
  message: string,
): void {
  diagnostics.push({ code, index, message });
}
