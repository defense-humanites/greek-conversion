import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed } from "../src/mod.ts";
import { parse, validateDocument } from "../src/document.ts";

// Older typesetting writes the breathing of a capital before it, and its
// digitizations keep it there as a spacing sign: psili U+1FBF, dasia U+1FFE,
// or one of their compounds with an accent (U+1FCD–U+1FCF, U+1FDD–U+1FDF).

test("a spacing breathing before a capital is the capital's", () => {
  for (
    const [spaced, joined, transliterated] of [
      ["῾Ρωμαῖοι", "Ῥωμαῖοι", "Rhōmaĩoi"],
      ["᾿Αθῆναι", "Ἀθῆναι", "Athē̃nai"],
      ["῎Ανθρωπος", "Ἄνθρωπος", "Ánthrōpos"],
      ["῞Ομηρος", "Ὅμηρος", "Hómēros"],
      ["῟Ηρα", "Ἧρα", "Hē̃ra"],
      ["οἱ ῾Ελληνες", "οἱ Ἑλληνες", "hoi Hellēnes"],
      ["«῾Ελλάς»", "«Ἑλλάς»", "«Hellás»"],
    ]
  ) {
    assertNfcEquals(convert(spaced, "greek", "greek"), joined);
    const result = convertDetailed(spaced, "greek", "transliteration");
    assertNfcEquals(result.output, transliterated);
    assertEquals(result.lossy, false, spaced);
    assertEquals(
      convert(spaced, "greek", "beta-code"),
      convert(joined, "greek", "beta-code"),
    );
  }
  // The capital's span starts at the breathing.
  const spans = convertDetailed("῾Ρω", "greek", "transliteration").spans;
  assertEquals(spans.length, 2);
  assertEquals([spans[0].inputStart, spans[0].inputEnd], [0, 2]);
});

test("a spacing breathing stays a sign of its own elsewhere", () => {
  // After a letter, or before a small letter, a consonant, or nothing, it is
  // not a capital's breathing; nor is an accent a rho's.
  for (
    const text of [
      "῾",
      "῎",
      "λόγος ῾ λόγος",
      "῾ Ρ",
      "῾ρ",
      "῾Β",
      "῎Ρ",
      "α῾Ο",
    ]
  ) {
    assertNfcEquals(convert(text, "greek", "greek"), text);
  }
});

test("a psili after a letter is an apostrophe", () => {
  assertNfcEquals(convert("τ᾿ ἐστί", "greek", "greek"), "τ’ ἐστί");
  assertEquals(convert("τ᾿ ἐστί", "greek", "beta-code"), "t' e)sti/");
  // A sigma before it is not final.
  assertEquals(convert("ὅσ᾿ ἂν", "greek", "beta-code"), "o(/s' a)\\n");
  assertEquals(
    convertDetailed("ὅσ᾿ ἂν", "greek", "transliteration").lossy,
    false,
  );
  // With an accent on it, it is not.
  assertNfcEquals(convert("α῎", "greek", "greek"), "α῎");
});

test("every format reads spacing breathings alike", () => {
  // Text written by 1.0.0-rc.10 from a Greek source that had them reads back.
  for (
    const [text, format] of [
      ["῾*rwmai=oi", "beta-code"],
      ["῾Rōmaĩoi", "transliteration"],
    ] as const
  ) {
    for (const to of ["greek", "beta-code", "transliteration"] as const) {
      const once = convert(text, format, to);
      assertEquals(convert(once, to, to), once, `${text} → ${to}`);
    }
    assertNfcEquals(convert(text, format, "greek"), "Ῥωμαῖοι");
  }
  assertNfcEquals(convert("t᾿ e)sti/", "beta-code", "greek"), "τ’ ἐστί");
  assertNfcEquals(convert("t᾿ estí", "transliteration", "greek"), "τ’ ἐστί");
  // After a letter that the format does not read, a word goes on: the `h`
  // before a sign is not a breathing, and the sign is not the capital's.
  const restyled = convert("h῎A", "transliteration", "transliteration");
  assertEquals(
    convert(restyled, "transliteration", "transliteration"),
    restyled,
  );
  const spans = convertDetailed("῾*rw", "beta-code", "greek").spans;
  assertEquals([spans[0].inputStart, spans[0].inputEnd], [0, 3]);
});

test("a capital takes only the spacing signs it can carry", () => {
  // A second breathing or accent, an accent on a rho, a circumflex on a short
  // vowel, or a breathing with a diaeresis: the sign stays as it is.
  for (const text of ["῾Ἀ", "῾Ὠ", "᾿Ῥ", "῏Ε", "῾Ϊ", "῎Ὰ", "῎Ρ"]) {
    assertNfcEquals(convert(text, "greek", "greek"), text);
    assertEquals(validateDocument(parse(text, "greek")), [], text);
    const once = convert(text, "greek", "transliteration", {
      preset: "iso-843-type-1",
    });
    assertEquals(
      convert(once, "transliteration", "transliteration", {
        preset: "iso-843-type-1",
      }),
      once,
      text,
    );
  }
  // It takes the signs nearest to it that it can: the rough breathing that
  // comes before a smooth one stays.
  assertNfcEquals(convert("῾᾿Α", "greek", "greek"), "῾Ἀ");
  assertNfcEquals(convert("῎῾Ρ", "greek", "greek"), "῎Ῥ");
  const spans = convertDetailed("῾᾿Α", "greek", "transliteration").spans;
  assertEquals(
    spans.map(({ inputStart, inputEnd }) => [inputStart, inputEnd]),
    [[0, 1], [1, 3]],
  );
});
