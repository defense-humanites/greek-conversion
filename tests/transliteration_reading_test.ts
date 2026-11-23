import { test } from "node:test";
import * as reference from "greek-conversion-previous";
import { assertEquals } from "./assertions.ts";
import { type ConversionOptions, convertDetailed } from "../src/mod.ts";

/**
 * The transliteration reader splits and lowercases a long text at once
 * (`lowercaseUnits()` in `src/parsers/transliteration.ts`), and a short one,
 * or one with surrogates, character by character. Each text below is read
 * both ways, short and long, under options that reorder marks or not, and
 * compared with the previous release, which read every text character by
 * character.
 */

// Repeated past the length from which a text is read at once.
const long = (text: string) => `${text} `.repeat(12).trimEnd();

const TEXTS = [
  // Lowercased at once, a capital sigma at the end of a word would become a
  // final sigma; lowercased alone, it stays medial.
  "ΣΟΦΟΣ Σ lógos",
  // The dotted capital I would lowercase into two characters, had NFD not
  // decomposed it.
  "İlion İ anḗr",
  // Surrogates: an acrophonic numeral and an emoji.
  "\u{10175} 😀 Hḗrē",
  // Marks in every order, an iota written for eta (ISO 843 Type 2), whose
  // length mark is moved before the others.
  "í̄ ī́ Íliada ēí",
  "í̂ î́ Í̂lios ḯ̂",
  "Ánthrōpoi kaì theoí, hoi d’ ā̓́ndres",
];

const VARIANTS: ConversionOptions[] = [
  {},
  { preset: "iso-843-type-2" },
  { preset: "ala-lc-ancient" },
  { transliteration: { eta: "i", longVowels: "circumflex" } },
];

test("a long text reads as each of its characters would", () => {
  for (const options of VARIANTS) {
    for (const text of TEXTS) {
      for (const input of [text, long(text)]) {
        for (const to of ["greek", "beta-code"] as const) {
          assertEquals(
            JSON.stringify(
              convertDetailed(input, "transliteration", to, options),
            ),
            JSON.stringify(
              reference.convertDetailed(
                input,
                "transliteration",
                to,
                options as never,
              ),
            ),
            `${JSON.stringify(options)}: ${input.slice(0, 20)}… → ${to}`,
          );
        }
      }
    }
  }
});
