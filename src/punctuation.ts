import type { Format } from "./model.ts";
import type { ConversionOptions } from "./options.ts";

export const EROTIMATIKO = "\u037E";
export const ANO_TELEIA = "\u0387";
export const ENOTIKON = "\u203F";
export const APOSTROPHE = "\u2019";
export const HYPHEN = "\u2010";

const INPUT: Record<Format, ReadonlyMap<string, string>> = {
  greek: new Map([
    [";", EROTIMATIKO],
    ["?", EROTIMATIKO],
    ["\u00B7", ANO_TELEIA],
    ["\u203F", ENOTIKON],
    ["\u035C", ENOTIKON],
    ["-", HYPHEN],
    ["\u2010", HYPHEN],
    ["'", APOSTROPHE],
    ["\u02BC", APOSTROPHE],
    ["\u1FBD", APOSTROPHE],
    ["\u2019", APOSTROPHE],
  ]),
  "beta-code": new Map([
    [";", EROTIMATIKO],
    [":", ANO_TELEIA],
    ["\u203F", ENOTIKON],
    ["\u035C", ENOTIKON],
    ["-", HYPHEN],
    ["'", APOSTROPHE],
    ["\u02BC", APOSTROPHE],
    ["\u1FBD", APOSTROPHE],
    ["\u2019", APOSTROPHE],
  ]),
  transliteration: new Map([
    ["?", EROTIMATIKO],
    [";", ANO_TELEIA],
    ["\u203F", ENOTIKON],
    ["\u035C", ENOTIKON],
    ["-", HYPHEN],
    ["\u2010", HYPHEN],
    ["'", APOSTROPHE],
    ["\u02BC", APOSTROPHE],
    ["\u1FBD", APOSTROPHE],
    ["\u2019", APOSTROPHE],
  ]),
};

const OUTPUT: Record<Format, ReadonlyMap<string, string>> = {
  greek: new Map([
    [EROTIMATIKO, ";"],
    [ANO_TELEIA, "\u00B7"],
    [ENOTIKON, ENOTIKON],
    [HYPHEN, HYPHEN],
    [APOSTROPHE, APOSTROPHE],
  ]),
  "beta-code": new Map([
    [EROTIMATIKO, ";"],
    [ANO_TELEIA, ":"],
    [ENOTIKON, ENOTIKON],
    [HYPHEN, "-"],
    [APOSTROPHE, "'"],
  ]),
  transliteration: new Map([
    [EROTIMATIKO, "?"],
    [ANO_TELEIA, ";"],
    [ENOTIKON, ENOTIKON],
    [HYPHEN, "-"],
    [APOSTROPHE, APOSTROPHE],
  ]),
};

export function parsePunctuation(
  character: string,
  format: Format,
): string | undefined {
  return INPUT[format].get(character);
}

export function encodePunctuation(
  punctuation: string,
  format: Format,
  options: ConversionOptions = {},
): string | undefined {
  if (
    format === "transliteration" && punctuation === HYPHEN &&
    options.orthography?.hyphen === "typographic"
  ) return HYPHEN;
  if (
    format === "transliteration" && punctuation === ENOTIKON &&
    options.orthography?.enotikon === "hyphen"
  ) return "-";
  return OUTPUT[format].get(punctuation);
}
