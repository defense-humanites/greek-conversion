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
    acuteForm(options) === "oxia"
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

function acuteForm(options: ConversionOptions): "tonos" | "oxia" {
  const requested = options.greek?.acute ?? "system";
  if (requested !== "system") return requested;
  return options.greek?.accentuation === "monotonic" ? "tonos" : "oxia";
}
