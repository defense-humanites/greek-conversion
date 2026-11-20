import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import { BY_BETA, BY_GREEK } from "../src/alphabet.ts";
import { greekLower } from "../src/case.ts";
import { parse } from "../src/document.ts";
import { GREEK_LIGATURES } from "../src/ligatures.ts";

/**
 * The Greek and Beta Code readers keep letters in small tables (U+0370–U+03FF
 * for Greek, ASCII for Beta Code) instead of classifying any code unit. These
 * tests check that assumption on every BMP code unit against the reference
 * classification, so that a letter added outside those ranges fails here
 * rather than being read as a literal.
 */

/** The symbol forms of letters, read as the letter with a glyph variant. */
const SYMBOL_FORMS: Readonly<Record<string, string>> = {
  "\u03D0": "beta-symbol",
  "\u03D1": "theta-symbol",
  "\u03D2": "upsilon-hook",
  "\u03D5": "phi-symbol",
  "\u03D6": "pi-symbol",
  "\u03F0": "kappa-symbol",
  "\u03F1": "rho-symbol",
  "\u03F4": "capital-theta-symbol",
  "\u03F5": "lunate-epsilon",
};

const hex = (unit: number) =>
  "U+" + unit.toString(16).toUpperCase().padStart(4, "0");

test("the Greek reader classifies every BMP code unit as greekLower does", () => {
  const mismatches: string[] = [];
  for (let unit = 0; unit < 0x10000; unit++) {
    const char = String.fromCharCode(unit);
    // Only units that NFD leaves alone can reach the reader as themselves;
    // the others reach it as their decomposition, checked on its own units.
    if (char.normalize("NFD") !== char) continue;
    // The signs that stand for several letters are read as those letters
    // (tests/ligatures_test.ts).
    if (GREEK_LIGATURES.has(unit)) continue;

    const lower = greekLower(char);
    const expected = BY_GREEK.get(lower === "ς" ? "σ" : lower);
    const [token] = parse(char, "greek");
    const actual = token.kind === "grapheme" ? token.letter : undefined;
    if (actual !== expected) {
      mismatches.push(`${hex(unit)}: ${actual} instead of ${expected}`);
    } else if (token.kind === "grapheme") {
      // A capital Σ has no final or medial shape; Ϲ is a lunate capital.
      const variant = SYMBOL_FORMS[char] ??
        (lower === "ϲ"
          ? "lunate-sigma"
          : char !== lower
          ? undefined
          : lower === "ς"
          ? "final-sigma"
          : lower === "σ"
          ? "medial-sigma"
          : undefined);
      if (token.uppercase !== (char !== lower)) {
        mismatches.push(`${hex(unit)}: wrong case`);
      }
      if (token.glyphVariant !== variant) {
        mismatches.push(
          `${
            hex(unit)
          }: glyph variant ${token.glyphVariant} instead of ${variant}`,
        );
      }
    }
  }
  assertEquals(mismatches, []);
});

test("the Beta Code reader classifies every BMP code unit as toLowerCase does", () => {
  const mismatches: string[] = [];
  for (let unit = 0; unit < 0x10000; unit++) {
    const char = String.fromCharCode(unit);
    const expected = BY_BETA.get(char.toLowerCase());
    const [token] = parse(char, "beta-code");
    const actual = token?.kind === "grapheme" ? token.letter : undefined;
    if (actual !== expected) {
      mismatches.push(`${hex(unit)}: ${actual} instead of ${expected}`);
    }
  }
  assertEquals(mismatches, []);
});
