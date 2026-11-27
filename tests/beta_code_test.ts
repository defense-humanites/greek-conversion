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

test("reads * before anything but a letter as an asterisk", () => {
  // The TLG writes the asterisk %2. Before anything but a letter, * is one,
  // and what follows it is read as if it were not there.
  for (
    const [input, written] of [
      ["*(", "%2[1"],
      ["*(?", "%2[1?"],
      ["*#22", "%2#22"],
      ["*%26", "%2%26"],
    ]
  ) {
    assertNfcEquals(reencode(input, "beta-code"), written);
    assertNfcEquals(
      convert(written, "beta-code", "greek"),
      convert(input, "beta-code", "greek"),
    );
  }
  // Marks may come between * and the code of a capital, as before a letter.
  assertNfcEquals(convert("*(#1", "beta-code", "greek"), "Ϟ\u0314");
  assertNfcEquals(reencode("*(#1", "beta-code"), "*(#1");
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
  // The code is every digit after %: %260 is no quantity mark, and %2 is
  // the asterisk.
  assertNfcEquals(convert("a%260 a%2", "beta-code", "greek"), "α%260 α*");
  // A percent code belongs to the span of its letter.
  const { spans } = convertDetailed("a)/%26 *%27a", "beta-code", "greek");
  assertEquals(
    spans.map((span) => [span.inputStart, span.inputEnd]),
    [[0, 6], [6, 7], [7, 12]],
  );
});

test("writes a Latin letter in the case of the Beta Code letters", () => {
  // It reads back as the letter it spells, which convertDetailed() reports;
  // in the case of the letters, it converts to itself again.
  for (
    const [options, latin, code] of [
      [{}, "H", "h"],
      [{ preset: "tlg-core" }, "h", "H"],
      [{ preset: "tlg-core" }, "c", "C"],
    ] as const
  ) {
    const once = convertDetailed(
      latin,
      "transliteration",
      "beta-code",
      options,
    );
    assertEquals(once.output, code);
    assertEquals(once.lossy, true);
    assertEquals(convert(code, "beta-code", "beta-code", options), code);
  }
});

test("writes an unread code that would read as a mark as the text it is", () => {
  // After `>`, `%26` is no macron: it is written as itself.
  assertEquals(convert("θ̅ς̅%26", "greek", "beta-code"), "<qs>%26");
  // Right after a letter, it would be: it is written with the code of `%`.
  const options = { preset: "sbl-general" } as const;
  const once = convert("<qs>%26", "beta-code", "beta-code", options);
  assertEquals(once, "qs%826");
  assertEquals(convert(once, "beta-code", "beta-code", options), once);
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
  // kept as text like the bare brackets, and [2 the angle bracket.
  assertNfcEquals(
    convert("[10a]10 [2a]2 [a]", "beta-code", "greek"),
    "[10α]10 ⟨α⟩ [α]",
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
  // bracket. Before a digit, a parenthesis is written as itself, which reads
  // back as one where no letter comes before it.
  assertNfcEquals(convert("[11]1", "beta-code", "greek"), "[11)");
  assertNfcEquals(convert("(1)", "greek", "beta-code"), "(1]1");
  assertEquals(convertDetailed("(1)", "greek", "beta-code").lossy, false);
  assertNfcEquals(convert("α(1)", "greek", "beta-code"), "a[11]1");
  assertEquals(convertDetailed("α(1)", "greek", "beta-code").lossy, true);
});

test("reads a TLG # code to its last digit", () => {
  // As for % and the brackets, the number is every digit after #: #10 is
  // the reversed lunate sigma and #12 the obelus, neither koppa followed by
  // digits. A code the library does not read is kept as
  // text, whole.
  for (const code of ["#7", "#10", "#12", "#300", "#1600"]) {
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
  // A code read as a sign is one token, whose span covers it whole.
  const spans = convertDetailed("a#532b", "beta-code", "greek").spans;
  assertEquals(spans.length, 3);
  assertEquals([spans[1].inputStart, spans[1].inputEnd], [1, 5]);
  // After a letter, a % code that is no mark is kept as text too, whole.
  assertEquals(reencode("a%40 a%265", "beta-code"), "a%40 a%265");
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

test("reads and writes signs with their TLG codes", () => {
  const signs = [
    ["⟨λόγος⟩ {α} ⟦β⟧", "[2lo/gos]2 [3a]3 [4b]4"],
    ["†λόγος† —", "%lo/gos% _"],
    ["λόγος/ψυχή *α α: β 50% #", "lo/gos%3yuxh/ %2a a%10 b 50%8 %101"],
    ["! | = + \\ ^ ~", "%4 %5 %6 %7 %103 %104 %107"],
    ["• ‡ § ˈ ¦ ‖", "%11 %13 %14 %15 %16 %17"],
    ["⸏ ⸐ ※ ⸖", "#6 #8 #13 #14"],
    ["ὅ⸒τι ⁘ ⁙ ⁚", "o(/#532ti #544 #55 #73"],
    [
      "᾿ ῾ ´ ` ῀ ῎ ῞ ῝ ῟ ¨ ΅ ῍ ῏",
      "%30 %31 %32 %33 %34 %35 %36 %37 %38 %39 %132 %133 %134",
    ],
  ] as const;
  for (const [greek, beta] of signs) {
    const result = convertDetailed(greek, "greek", "beta-code");
    assertEquals(result.output, beta);
    assertEquals(result.lossy, false, greek);
    assertNfcEquals(convert(beta, "beta-code", "greek"), greek);
  }
  // Other spellings of the angle brackets, and codes read but not written.
  assertNfcEquals(convert("〈α〉 〈β〉", "greek", "greek"), "⟨α⟩ ⟨β⟩");
  assertNfcEquals(convert("%1 %12", "beta-code", "greek"), "; *");
  // `#12` and `#17`, which the TLG gives as a dash and a solidus, and the
  // codes of signs that are mark-up when bare, stay text. `<` and `>`,
  // which bare write an overline, take their codes.
  assertNfcEquals(
    convert("#12 #17 %9 %98 #15 #18", "beta-code", "greek"),
    "#12 #17 %9 %98 > <",
  );
  assertEquals(convert("a < b & c", "greek", "beta-code"), "a #18 b & c");
});

test("writes a sign as itself before a digit where it reads back", () => {
  // A digit after a code would extend it: `#1` and `2` are `#12`.
  for (
    const [greek, beta] of [
      ["1/2", "1/2"],
      ["(1)", "(1]1"],
      ["†1", "†1"],
      ["⟨1⟩", "⟨1]2"],
    ]
  ) {
    const result = convertDetailed(greek, "greek", "beta-code");
    assertEquals(result.output, beta, greek);
    assertEquals(result.lossy, false, greek);
  }
  // After a letter, a mark sign would be the letter's; and `:` is always
  // the ano teleia, `%5` the vertical bar.
  // A `#` before digits is written as itself where it makes a code read as
  // text, which reads back as one piece: the loss reported is only that.
  assertEquals(convert("#25", "greek", "beta-code"), "#25");
  assertNfcEquals(convert("#25", "beta-code", "greek"), "#25");
  for (const greek of ["α/2", "α(1)", "10:30", "%5", "#1"]) {
    assertEquals(
      convertDetailed(greek, "greek", "beta-code").lossy,
      true,
      greek,
    );
  }
});

test("writes a letter kept as text with the marks that compose with it", () => {
  // `é` is no Beta Code: the reader keeps it as text. Written as `e` and an
  // acute, it would read back as an epsilon and a mark kept as text.
  for (
    const [source, from, beta] of [
      ["Valéry λόγος", "greek", "valéry lo/gos"],
      ["ç", "transliteration", "ç"],
      ["ǽ", "greek", "ǽ"],
      // A letter of another script that no mark composes with takes its
      // marks in their canonical order, as Greek output writes them.
      ["\u0438\u0301\u0323", "beta-code", "\u0438\u0323\u0301"],
    ] as const
  ) {
    const result = convertDetailed(source, from, "beta-code");
    assertEquals(result.output, beta.normalize("NFC"));
    assertEquals(
      convert(result.output, "beta-code", "beta-code"),
      result.output,
    );
  }
  // A precomposed letter in a Beta Code source converts back as itself.
  const greek = convertDetailed("\u00E9", "beta-code", "greek");
  assertEquals(greek.lossy, false);
  assertEquals(convert(greek.output, "greek", "beta-code"), "\u00E9");
  // So the letter is retained: only the Latin letters of `Valéry` that Beta
  // Code reads as Greek are reported.
  const mixed = convertDetailed("Valéry", "greek", "beta-code");
  assertEquals(
    mixed.losses.map((loss) => [loss.code, loss.offset]),
    [0, 1, 2, 4, 5].map((offset) => ["unrepresented-literal", offset]),
  );
});
