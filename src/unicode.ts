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
  const greek = options.greek;
  const composition = greek?.composition ?? "composed";
  let output = input.normalize(composition === "decomposed" ? "NFD" : "NFC");

  if (composition === "composed" && acuteForm(options) === "oxia") {
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

function acuteForm(options: ConversionOptions): "tonos" | "oxia" {
  const requested = options.greek?.acute ?? "system";
  if (requested !== "system") return requested;
  return options.greek?.accentuation === "monotonic" ? "tonos" : "oxia";
}
