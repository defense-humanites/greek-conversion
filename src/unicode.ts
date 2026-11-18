import type { ConversionOptions } from "./options.ts";

const TONOS_TO_OXIA = new Map<string, string>([
  ["ά", "ά"],
  ["έ", "έ"],
  ["ή", "ή"],
  ["ί", "ί"],
  ["ό", "ό"],
  ["ύ", "ύ"],
  ["ώ", "ώ"],
  ["Ά", "Ά"],
  ["Έ", "Έ"],
  ["Ή", "Ή"],
  ["Ί", "Ί"],
  ["Ό", "Ό"],
  ["Ύ", "Ύ"],
  ["Ώ", "Ώ"],
  ["ΐ", "ΐ"],
  ["ΰ", "ΰ"],
]);

const TONOS = new RegExp(`[${[...TONOS_TO_OXIA.keys()].join("")}]`, "gu");

/**
 * The Unicode form of Greek output: NFC, or NFD under
 * `greek.composition: "decomposed"`.
 */
export function normalizeGreek(
  input: string,
  options: ConversionOptions = {},
): string {
  return input.normalize(
    options.greek?.composition === "decomposed" ? "NFD" : "NFC",
  );
}

/**
 * The substitutions made on normalized Greek output, which normalization
 * would undo: the oxia form of the acute, the Greek question mark (U+037E)
 * and the Greek ano teleia (U+0387). Each replaces one code unit by one, so
 * that positions in the normalized text are positions in the output.
 */
export function substituteGreekSigns(
  normalized: string,
  options: ConversionOptions = {},
): string {
  const greek = options.greek;
  let output = normalized;

  if (
    (greek?.composition ?? "composed") === "composed" &&
    acuteForm(normalized, options) === "oxia"
  ) {
    output = output.replace(
      TONOS,
      (character) => TONOS_TO_OXIA.get(character)!,
    );
  }

  if (greek?.questionMark === "greek") {
    output = output.replaceAll(";", "\u037E");
  }
  if (greek?.anoTeleia === "greek") {
    output = output.replaceAll("\u00B7", "\u0387");
  }

  return output;
}

/** Normalizes Greek output and makes the substitutions that follow. */
export function applyGreekUnicode(
  input: string,
  options: ConversionOptions = {},
): string {
  return substituteGreekSigns(normalizeGreek(input, options), options);
}

/**
 * A polytonic mark in normalized Greek. A letter of the Greek Extended block
 * is one: NFC has already written the oxia forms as tonos, so what remains
 * there carries a breathing, a grave, a circumflex, an iota subscript, or a
 * quantity, or is a spacing polytonic sign. So is one of those marks left
 * combining on a Greek letter, where Unicode has no composed form; the same
 * marks on a letter of another script, or on their own, do not count.
 */
const GREEK_EXTENDED = /[\u1F00-\u1FFF]/;
const POLYTONIC_MARK = /[\u0300\u0304\u0306\u0313\u0314\u0342\u0343\u0345]/;
const MARKED_GREEK_LETTER =
  /[\u0370-\u03FF]\p{M}*?[\u0300\u0304\u0306\u0313\u0314\u0342\u0343\u0345]/u;

function hasPolytonicMark(normalized: string): boolean {
  return GREEK_EXTENDED.test(normalized) ||
    // Rare in composed text: look for a mark before looking for its letter.
    (POLYTONIC_MARK.test(normalized) && MARKED_GREEK_LETTER.test(normalized));
}

/**
 * The form of the acute. Under `"system"`, Greek that carries a polytonic
 * mark is written with oxia, and Greek that carries none, which is monotonic
 * as written, with tonos, as `accentuation: "monotonic"` writes it.
 */
function acuteForm(
  normalized: string,
  options: ConversionOptions,
): "tonos" | "oxia" {
  const requested = options.greek?.acute ?? "system";
  if (requested !== "system") return requested;
  if (options.greek?.accentuation === "monotonic") return "tonos";
  return hasPolytonicMark(normalized) ? "oxia" : "tonos";
}
