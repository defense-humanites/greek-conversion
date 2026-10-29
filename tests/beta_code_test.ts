import { assertEquals } from "@std/assert";
import { convert, convertDetailed, reencode } from "../src/mod.ts";
import { assertNfcEquals } from "./assertions.ts";

Deno.test("ignores ASCII case when parsing Beta Code letters", () => {
  for (const input of ["a)/nqrwpos", "A)/NQRWPOS", "a)/NqRwPoS"]) {
    assertNfcEquals(convert(input, "beta-code", "greek"), "ἄνθρωπος");
    assertNfcEquals(
      convert(input, "beta-code", "transliteration"),
      "ánthrōpos",
    );
  }
});

Deno.test("uses only the asterisk as the Beta Code uppercase marker", () => {
  assertNfcEquals(convert("a A", "beta-code", "greek"), "α α");
  assertNfcEquals(convert("*a *A", "beta-code", "greek"), "Α Α");
});

Deno.test("places and orders Beta Code diacritics canonically", () => {
  assertNfcEquals(convert("w|=(", "beta-code", "greek"), "ᾧ");
  assertNfcEquals(reencode("w|=(", "beta-code"), "w(=|");
  assertNfcEquals(convert("*(=W|", "beta-code", "greek"), "ᾯ");
  assertNfcEquals(reencode("*(=W|", "beta-code"), "*(=w|");
});

Deno.test("separates semantic case from Beta Code ASCII case", () => {
  assertNfcEquals(
    convert("Ἄνθρωπος", "greek", "beta-code", { preset: "perseus" }),
    "*)/anqrwpos",
  );
  assertNfcEquals(
    convert("Ἄνθρωπος", "greek", "beta-code", { preset: "tlg-core" }),
    "*)/ANQRWPOS",
  );
});

Deno.test("preserves incomplete uppercase Beta Code prefixes", () => {
  for (const input of ["*(", "*(?", "*(#1", "*#22", "*%26"]) {
    assertNfcEquals(reencode(input, "beta-code"), input);
  }
  assertNfcEquals(convert("*#1", "beta-code", "greek"), "Ϟ");
  assertNfcEquals(convert("*(/A", "beta-code", "greek"), "Ἅ");
});

Deno.test("recognizes TLG yot and selects its canonical output", () => {
  assertNfcEquals(convert("#401", "beta-code", "greek"), "ϳ");
  assertNfcEquals(convert("ϳ", "greek", "beta-code"), "j");
  assertNfcEquals(
    convert("ϳ", "greek", "beta-code", { preset: "tlg-core" }),
    "#401",
  );
  assertNfcEquals(
    reencode("j #401", "beta-code", { preset: "tlg-core" }),
    "#401 #401",
  );
});

Deno.test("reads and writes vowel quantity with the TLG percent codes", () => {
  // TLG Beta Code: %26 is the combining macron, %27 the combining breve.
  assertNfcEquals(
    convert("a%26 a%27 i%26 u%27", "beta-code", "greek"),
    "ᾱ ᾰ ῑ ῠ",
  );
  assertNfcEquals(
    convert("ᾱ ᾰ ῑ ῠ", "greek", "beta-code"),
    "a%26 a%27 i%26 u%27",
  );
  // After the other marks of a small letter; between * and a capital.
  assertNfcEquals(convert("a)/%26 *%27a", "beta-code", "greek"), "ᾱ̓́ Ᾰ");
  assertNfcEquals(convert("ᾱ̓́ Ᾰ", "greek", "beta-code"), "a)/%26 *%27a");
  assertNfcEquals(
    convert("ᾱ ᾰ", "greek", "beta-code", { preset: "tlg-core" }),
    "A%26 A%27",
  );
  // The code is every digit after %: %260 and %2 are not quantity marks.
  assertNfcEquals(convert("a%260 a%2", "beta-code", "greek"), "α%260 α%2");
  // A percent code belongs to the span of its letter.
  const { spans } = convertDetailed("a)/%26 *%27a", "beta-code", "greek");
  assertEquals(
    spans.map((span) => [span.inputStart, span.inputEnd]),
    [[0, 6], [6, 7], [7, 12]],
  );
});

Deno.test("reads & and ' as TLG Beta Code does, not as quantity", () => {
  // & shifts to the Latin font, which the engine does not interpret: it is
  // kept as a literal. ' is the apostrophe.
  assertNfcEquals(convert("a& a' i&", "beta-code", "greek"), "α& α’ ι&");
  assertNfcEquals(reencode("a& a'", "beta-code"), "a& a'");
});
