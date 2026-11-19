import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed, reencode } from "../src/mod.ts";

test("ignores ASCII case when parsing Beta Code letters", () => {
  for (const input of ["a)/nqrwpos", "A)/NQRWPOS", "a)/NqRwPoS"]) {
    assertNfcEquals(convert(input, "beta-code", "greek"), "ἄνθρωπος");
    assertNfcEquals(
      convert(input, "beta-code", "transliteration"),
      "ánthrōpos",
    );
  }
});

test("uses only the asterisk as the Beta Code uppercase marker", () => {
  assertNfcEquals(convert("a A", "beta-code", "greek"), "α α");
  assertNfcEquals(convert("*a *A", "beta-code", "greek"), "Α Α");
});

test("places and orders Beta Code diacritics canonically", () => {
  assertNfcEquals(convert("w|=(", "beta-code", "greek"), "ᾧ");
  assertNfcEquals(reencode("w|=(", "beta-code"), "w(=|");
  assertNfcEquals(convert("*(=W|", "beta-code", "greek"), "ᾯ");
  assertNfcEquals(reencode("*(=W|", "beta-code"), "*(=w|");
});

test("separates semantic case from Beta Code ASCII case", () => {
  assertNfcEquals(
    convert("Ἄνθρωπος", "greek", "beta-code", { preset: "perseus" }),
    "*)/anqrwpos",
  );
  assertNfcEquals(
    convert("Ἄνθρωπος", "greek", "beta-code", { preset: "tlg-core" }),
    "*)/ANQRWPOS",
  );
});

test("preserves incomplete uppercase Beta Code prefixes", () => {
  for (const input of ["*(", "*(?", "*(#1", "*#22", "*%26"]) {
    assertNfcEquals(reencode(input, "beta-code"), input);
  }
  assertNfcEquals(convert("*#1", "beta-code", "greek"), "Ϟ");
  assertNfcEquals(convert("*(/A", "beta-code", "greek"), "Ἅ");
});

test("recognizes TLG yot and selects its canonical output", () => {
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

test("reads and writes vowel quantity with the TLG percent codes", () => {
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

test("reads & and ' as TLG Beta Code does, not as quantity", () => {
  // & shifts to the Latin font, which the engine does not interpret: it is
  // kept as a literal. ' is the apostrophe.
  assertNfcEquals(convert("a& a' i&", "beta-code", "greek"), "α& α’ ι&");
  assertNfcEquals(reencode("a& a'", "beta-code"), "a& a'");
});

test("writes and reads parentheses with the TLG bracket codes", () => {
  // In Beta Code, ( and ) are the breathings: the TLG writes the parentheses
  // [1 and ]1, as the Bailly writes an optional letter or an apposition.
  assertNfcEquals(convert("δῆσε(ν)", "greek", "beta-code"), "dh=se[1n]1");
  assertNfcEquals(convert("dh=se[1n]1", "beta-code", "greek"), "δῆσε(ν)");
  assertNfcEquals(
    convert("ὁ (ὁ λόφος)", "greek", "beta-code", { preset: "tlg-core" }),
    "O( [1O( LO/FOS]1",
  );
  assertEquals(convertDetailed("(βῆτα)", "greek", "beta-code").lossy, false);
  // Where the smooth breathing is removed, the closing parenthesis no
  // longer reads as one on the letter before it.
  const options = { preset: "ala-lc-ancient" } as const;
  const written = convert("δῆσε(ν)", "greek", "beta-code", options);
  assertNfcEquals(written, "dhse[1n]1");
  assertNfcEquals(reencode(written, "beta-code", options), written);
  // The number is every digit after the bracket: [10 is another bracket,
  // kept as text like the other bracket codes and the bare brackets.
  assertNfcEquals(
    convert("[10a]10 [2a]2 [a]", "beta-code", "greek"),
    "[10α]10 [2α]2 [α]",
  );
  // ( and ) after a letter stay breathings.
  assertNfcEquals(convert("a) a(", "beta-code", "greek"), "ἀ ἁ");
  // A bracket code belongs to the span of its parenthesis.
  const { spans } = convertDetailed("[1a]1", "beta-code", "greek");
  assertEquals(
    spans.map((span) => [span.inputStart, span.inputEnd]),
    [[0, 2], [2, 3], [3, 5]],
  );
});

test("reads a bracket code after an asterisk, and reports a digit after a bracket", () => {
  // As before any character that is not a letter, * is kept as text.
  assertNfcEquals(convert("*[1a]1", "beta-code", "greek"), "*(α)");
  // The number after a bracket is read whole, as in the TLG: [11 is another
  // bracket, so a parenthesis before a digit does not read back.
  assertNfcEquals(convert("(1)", "greek", "beta-code"), "[11]1");
  assertNfcEquals(convert("[11]1", "beta-code", "greek"), "[11)");
  assertEquals(convertDetailed("(1)", "greek", "beta-code").lossy, true);
});

test("reads a TLG # code to its last digit", () => {
  // As for % and the brackets, the number is every digit after #: #12 is the
  // obelus, #532 the hypodiastole, #1532 the καί symbol, none a letter
  // followed by digits. A code the library does not read is kept whole.
  for (const code of ["#6", "#10", "#12", "#13", "#532", "#544", "#1532"]) {
    const result = convertDetailed(`a)lla/ ${code} kai/`, "beta-code", "greek");
    assertNfcEquals(result.output, `ἀλλά ${code} καί`);
    assertEquals(result.lossy, false, code);
    assertEquals(
      reencode(`a)lla/ ${code} kai/`, "beta-code"),
      `a)lla/ ${code} kai/`,
    );
    assertNfcEquals(
      convert(`${code}a`, "beta-code", "transliteration"),
      `${code}a`,
    );
  }
  // The codes it reads are unchanged.
  assertNfcEquals(
    convert("#1 #2 #3 #5 #401 a# #22a *#2", "beta-code", "greek"),
    "ϟ ϛ ϙ ϡ ϳ αʹ ͵α Ϛ",
  );
  // A capital marker before another code is kept as text, as before any
  // character that is not a letter.
  assertNfcEquals(convert("*#12", "beta-code", "greek"), "*#12");
  // The code is one token, and its span covers it whole.
  const spans = convertDetailed("a#532b", "beta-code", "greek").spans;
  assertEquals(spans.length, 3);
  assertEquals([spans[1].inputStart, spans[1].inputEnd], [1, 5]);
});

test("reports a TLG code that a digit would extend", () => {
  // Beta Code cannot write a letter or mark code before a digit: TLG reads
  // ϟ2 as #12, the obelus, and ᾱ5 as a%265, a code it does not know.
  for (
    const [greek, beta, options] of [
      ["ϟ2", "#12", {}],
      ["ϡ32", "#532", {}],
      ["ϛ2", "#22", {}],
      ["ᾱ5", "a%265", {}],
      ["ϳ0", "#4010", { preset: "tlg-core" }],
    ] as const
  ) {
    const result = convertDetailed(greek, "greek", "beta-code", options);
    assertEquals(result.output.toLowerCase(), beta, greek);
    assertEquals(result.lossy, true, greek);
  }
});
