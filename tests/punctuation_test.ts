import { convert } from "../src/mod.ts";
import { assertNfcEquals } from "./assertions.ts";

Deno.test("converts Greek punctuation semantically between formats", () => {
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

Deno.test("keeps ASCII hyphen in canonical transliteration unless typography is requested", () => {
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
      orthography: { hyphen: "typographic" },
    }),
    "hodos‐rhodos",
  );
});

Deno.test("canonicalizes Unicode punctuation aliases", () => {
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

Deno.test("keeps format-specific semicolon semantics distinct", () => {
  assertNfcEquals(convert(";", "greek", "transliteration"), "?");
  assertNfcEquals(convert(";", "transliteration", "greek"), "·");
  assertNfcEquals(convert(";", "beta-code", "greek"), ";");
});

Deno.test("distinguishes Beta Code breve from apostrophe", () => {
  assertNfcEquals(convert("a' p'", "beta-code", "greek"), "ᾰ π’");
  assertNfcEquals(convert("ᾰ π’", "greek", "beta-code"), "a' p'");
});
