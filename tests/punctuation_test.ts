import { test } from "node:test";
import { assertNfcEquals } from "./assertions.ts";
import { convert } from "../src/mod.ts";

test("converts Greek punctuation semantically between formats", () => {
  const greek = "; · ‿ ‐ ’";

  assertNfcEquals(convert(greek, "greek", "beta-code"), "; : ‿ - '");
  assertNfcEquals(
    convert(greek, "greek", "transliteration"),
    "? ; ‿ - ’",
  );
  assertNfcEquals(convert("; : ‿ - '", "beta-code", "greek"), greek);
  assertNfcEquals(
    convert("? ; ‿ - '", "transliteration", "greek"),
    greek,
  );
});

test("keeps ASCII hyphen in canonical transliteration unless typography is requested", () => {
  assertNfcEquals(
    convert("ὁδός-ῥόδος", "greek", "transliteration"),
    "hodós-rhódos",
  );
  assertNfcEquals(
    convert("hodos‐rhodos", "transliteration", "transliteration"),
    "hodos-rhodos",
  );
  assertNfcEquals(
    convert("hodos-rhodos", "transliteration", "transliteration", {
      transliteration: { hyphen: "typographic" },
    }),
    "hodos‐rhodos",
  );
});

test("canonicalizes Unicode punctuation aliases", () => {
  for (const question of [";", "\u037E", "?"]) {
    assertNfcEquals(convert(question, "greek", "greek"), ";");
  }
  for (const raisedDot of ["\u00B7", "\u0387"]) {
    assertNfcEquals(convert(raisedDot, "greek", "greek"), "·");
  }
  for (const enotikon of ["\u203F", "\u035C"]) {
    assertNfcEquals(convert(enotikon, "greek", "greek"), "‿");
  }
  for (const apostrophe of ["'", "\u02BC", "\u1FBD", "\u2019"]) {
    assertNfcEquals(convert(apostrophe, "greek", "greek"), "’");
  }
  for (const hyphen of ["-", "\u2010"]) {
    assertNfcEquals(convert(hyphen, "greek", "greek"), "‐");
  }
});

test("keeps format-specific semicolon semantics distinct", () => {
  assertNfcEquals(convert(";", "greek", "transliteration"), "?");
  assertNfcEquals(convert(";", "transliteration", "greek"), "·");
  assertNfcEquals(convert(";", "beta-code", "greek"), ";");
});

test("distinguishes Beta Code breve from apostrophe", () => {
  assertNfcEquals(convert("a%27 p'", "beta-code", "greek"), "ᾰ π’");
  assertNfcEquals(convert("ᾰ π’", "greek", "beta-code"), "a%27 p'");
  // In TLG Beta Code, ' is the apostrophe after a vowel too.
  assertNfcEquals(convert("a' a%27'", "beta-code", "greek"), "α’ ᾰ’");
});
