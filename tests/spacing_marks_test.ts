import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed } from "../src/mod.ts";

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
