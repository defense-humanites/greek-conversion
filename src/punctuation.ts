import type { Format } from "./model.ts";
import type { ConversionOptions } from "./options.ts";

export const EROTIMATIKO = "\u037E";
export const ANO_TELEIA = "\u0387";
export const ENOTIKON = "\u203F";
export const APOSTROPHE = "\u2019";
export const HYPHEN = "\u2010";
export const EM_DASH = "\u2014";
const LEFT_ANGLE_BRACKET = "\u27E8";
const RIGHT_ANGLE_BRACKET = "\u27E9";

/**
 * The spellings of the angle brackets: the mathematical ones, which Unicode
 * recommends, and the brackets U+2329 and U+232A, which the TLG gives,
 * equivalent to the CJK brackets U+3008 and U+3009 that normalization makes
 * of them.
 */
const ANGLE_BRACKETS: readonly (readonly [string, string])[] = [
  ["\u2329", LEFT_ANGLE_BRACKET],
  ["\u3008", LEFT_ANGLE_BRACKET],
  ["\u232A", RIGHT_ANGLE_BRACKET],
  ["\u3009", RIGHT_ANGLE_BRACKET],
];

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
    ...ANGLE_BRACKETS,
  ]),
  "beta-code": new Map([
    [";", EROTIMATIKO],
    [":", ANO_TELEIA],
    ["\u203F", ENOTIKON],
    ["\u035C", ENOTIKON],
    ["-", HYPHEN],
    ["_", EM_DASH],
    ["'", APOSTROPHE],
    ["\u02BC", APOSTROPHE],
    ["\u1FBD", APOSTROPHE],
    ["\u2019", APOSTROPHE],
    ...ANGLE_BRACKETS,
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
    ...ANGLE_BRACKETS,
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
    [EM_DASH, "_"],
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

/**
 * The signs that TLG Beta Code writes with a code, as the *Beta Code Manual*
 * gives them (§3.2, brackets; §3.3, `%`; §3.4, `#`): mostly the ASCII signs
 * that Beta Code otherwise reads as something else (`(` and `/` are marks,
 * `*` the capital, `:` the ano teleia), and the editorial and Byzantine
 * signs. `%30` and `%31`, the spacing breathings of a lacuna, are the Greek
 * psili and dasia here, where the TLG gives U+02BC and U+02BD, which are
 * apostrophes to every reader.
 *
 * `<` and `>` are written `#18` and `#15`, since bare they write an
 * overline (`<QS>`). Left out: the codes of `&` and `"` (`%9`, `%98`),
 * signs that the TLG also uses, bare, as mark-up (a font, quotation marks),
 * which the reader keeps as text and the writer writes as it reads them, so
 * that Beta Code converted to itself keeps its mark-up.
 */
const TLG_CODES: readonly (readonly [code: string, sign: string])[] = [
  ["[1", "("],
  ["]1", ")"],
  ["[2", LEFT_ANGLE_BRACKET],
  ["]2", RIGHT_ANGLE_BRACKET],
  ["[3", "{"],
  ["]3", "}"],
  ["[4", "\u27E6"],
  ["]4", "\u27E7"],
  ["%", "\u2020"],
  ["%2", "*"],
  ["%3", "/"],
  ["%4", "!"],
  ["%5", "|"],
  ["%6", "="],
  ["%7", "+"],
  ["%8", "%"],
  ["%10", ":"],
  ["%11", "\u2022"],
  ["%13", "\u2021"],
  ["%14", "\u00A7"],
  ["%15", "\u02C8"],
  ["%16", "\u00A6"],
  ["%17", "\u2016"],
  ["%30", "\u1FBF"],
  ["%31", "\u1FFE"],
  ["%32", "\u00B4"],
  ["%33", "`"],
  ["%34", "\u1FC0"],
  ["%35", "\u1FCE"],
  ["%36", "\u1FDE"],
  ["%37", "\u1FDD"],
  ["%38", "\u1FDF"],
  ["%39", "\u00A8"],
  ["%101", "#"],
  ["%103", "\\"],
  ["%104", "^"],
  ["%107", "~"],
  ["%132", "\u0385"],
  ["%133", "\u1FCD"],
  ["%134", "\u1FCF"],
  ["#6", "\u2E0F"],
  ["#8", "\u2E10"],
  ["#13", "\u203B"],
  ["#14", "\u2E16"],
  ["#15", ">"],
  ["#18", "<"],
  ["#55", "\u2059"],
  ["#73", "\u205A"],
  ["#532", "\u2E12"],
  ["#544", "\u2058"],
];

/**
 * What the Beta Code reader gives each TLG code of a sign: the codes above,
 * `%1`, the question mark, and `%12`, an asterisk, which `;` and `%2` write.
 * `#12` and `#17`, obeli that the TLG gives as a dash and a solidus, stay
 * text: `ϟ2` and `ϟ7`, which Beta Code cannot write, give them.
 */
export const TLG_SIGNS: ReadonlyMap<string, string> = new Map([
  ...TLG_CODES,
  ["%1", EROTIMATIKO],
  ["%12", "*"],
]);

/**
 * The TLG code of each sign that Beta Code writes with one, and of the
 * signs canonically equivalent to them (the oxia U+1FFD is the acute accent
 * U+00B4).
 */
export const TLG_CODE_OF: ReadonlyMap<string, string> = new Map([
  ...TLG_CODES.map(([code, sign]) => [sign, code] as const),
  ["\u1FFD", "%32"],
  ["\u1FEF", "%33"],
  ["\u1FEE", "%132"],
]);

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
    options.transliteration?.hyphen === "typographic"
  ) return HYPHEN;
  if (
    format === "transliteration" && punctuation === ENOTIKON &&
    options.transliteration?.enotikon === "hyphen"
  ) return "-";
  return OUTPUT[format].get(punctuation);
}
