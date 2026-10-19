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

export function applyGreekUnicode(
  input: string,
  options: ConversionOptions = {},
): string {
  const unicode = options.unicode;
  const composition = unicode?.composition ?? "composed";
  let output = input.normalize(composition === "decomposed" ? "NFD" : "NFC");

  if (composition === "composed" && acuteForm(options) === "oxia") {
    output = output.replace(
      TONOS,
      (character) => TONOS_TO_OXIA.get(character)!,
    );
  }

  if (unicode?.questionMark === "greek") {
    output = output.replaceAll(";", "\u037E");
  }
  if (unicode?.anoTeleia === "greek") {
    output = output.replaceAll("\u00B7", "\u0387");
  }

  return output;
}

/**
 * Returns one uppercase `U+...` label for each Unicode scalar value in input.
 *
 * Supplementary characters are reported as one code point rather than two
 * UTF-16 code units. The input is inspected exactly as supplied and is not
 * normalized.
 */
export function toUnicodeCodePoints(input: string): readonly string[] {
  return Array.from(input, (character) => {
    const value = character.codePointAt(0);
    if (value === undefined) return "";
    return `U+${value.toString(16).toUpperCase().padStart(4, "0")}`;
  });
}

function acuteForm(options: ConversionOptions): "tonos" | "oxia" {
  const requested = options.unicode?.acute ?? "system";
  if (requested !== "system") return requested;
  return options.orthography?.accentuation === "monotonic" ? "tonos" : "oxia";
}
