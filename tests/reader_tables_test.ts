import { assertEquals } from "@std/assert";
import { BY_BETA, BY_GREEK } from "../src/alphabet.ts";
import { greekLower } from "../src/case.ts";
import { parse } from "../src/document.ts";

/**
 * The Greek and Beta Code readers keep letters in small tables (U+0370–U+03FF
 * for Greek, ASCII for Beta Code) instead of classifying any code unit. These
 * tests check that assumption on every BMP code unit against the reference
 * classification, so that a letter added outside those ranges fails here
 * rather than being read as a literal.
 */

const hex = (unit: number) =>
  "U+" + unit.toString(16).toUpperCase().padStart(4, "0");

Deno.test("the Greek reader classifies every BMP code unit as greekLower does", () => {
  const mismatches: string[] = [];
  for (let unit = 0; unit < 0x10000; unit++) {
    const char = String.fromCharCode(unit);
    // Only units that NFD leaves alone can reach the reader as themselves;
    // the others reach it as their decomposition, checked on its own units.
    if (char.normalize("NFD") !== char) continue;

    const lower = greekLower(char);
    const expected = BY_GREEK.get(lower === "ς" ? "σ" : lower);
    const [token] = parse(char, "greek");
    const actual = token.kind === "grapheme" ? token.letter : undefined;
    if (actual !== expected) {
      mismatches.push(`${hex(unit)}: ${actual} instead of ${expected}`);
    } else if (
      token.kind === "grapheme" && token.uppercase !== (char !== lower)
    ) {
      mismatches.push(`${hex(unit)}: wrong case`);
    }
  }
  assertEquals(mismatches, []);
});

Deno.test("the Beta Code reader classifies every BMP code unit as toLowerCase does", () => {
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
