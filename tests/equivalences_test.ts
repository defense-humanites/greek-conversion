import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed, reencode } from "../src/mod.ts";
import { encode, parse } from "../src/document.ts";
import { EQUIVALENCES, FORMATS, valueFor } from "./fixtures.ts";

test("canonical Greek and Beta Code equivalences", () => {
  for (const { greek, betaCode } of EQUIVALENCES) {
    assertNfcEquals(convert(greek, "greek", "beta-code"), betaCode);
    assertNfcEquals(convert(betaCode, "beta-code", "greek"), greek);
  }
});

test("canonical Greek and transliteration equivalences", () => {
  for (const { greek, transliteration } of EQUIVALENCES) {
    assertNfcEquals(
      convert(greek, "greek", "transliteration"),
      transliteration,
    );
    assertNfcEquals(
      convert(transliteration, "transliteration", "greek"),
      greek,
    );
  }
});

test("canonical Beta Code and transliteration equivalences", () => {
  for (const { betaCode, transliteration } of EQUIVALENCES) {
    assertNfcEquals(
      convert(betaCode, "beta-code", "transliteration"),
      transliteration,
    );
    assertNfcEquals(
      convert(transliteration, "transliteration", "beta-code"),
      betaCode,
    );
  }
});

test("canonical documents survive encode-parse round trips", () => {
  for (const equivalence of EQUIVALENCES) {
    for (const format of FORMATS) {
      const document = parse(valueFor(equivalence, format), format);
      assertEquals(parse(encode(document, format), format), document);
    }
  }
});

test("reencode is the same-format conversion facade", () => {
  for (const equivalence of EQUIVALENCES) {
    for (const format of FORMATS) {
      const input = valueFor(equivalence, format);
      assertEquals(reencode(input, format), convert(input, format, format));
    }
  }

  assertNfcEquals(
    reencode("ϐΊΟΣ", "greek", {
      greek: { finalSigma: "medial" },
      text: { letterCase: "lowercase" },
    }),
    "ϐίοσ",
  );
  assertNfcEquals(
    reencode("ϐΊΟΣ", "greek", {
      greek: { finalSigma: "medial", medialBeta: "standard" },
      text: { letterCase: "lowercase" },
    }),
    "βίοσ",
  );
});

test("reads the symbol forms of letters as those letters", () => {
  // ϑ ϕ ϖ ϰ ϱ ϵ, and the capitals ϒ (with its accented forms ϓ ϔ) and ϴ,
  // as ϐ is read as beta (#47). Greek output keeps them, or writes the
  // letters themselves under symbolForms: "standard".
  const symbols = "ϑεός ϕῶς ϖ ϰ ϱ ϵ ϒ ϓ ϔ ϴ";
  const standard = { greek: { symbolForms: "standard" } } as const;
  assertNfcEquals(convert(symbols, "greek", "greek"), symbols);
  assertNfcEquals(
    convert(symbols, "greek", "greek", standard),
    "θεός φῶς π κ ρ ε Υ Ύ Ϋ Θ",
  );
  assertEquals(convertDetailed(symbols, "greek", "greek").lossy, false);
  assertEquals(
    convertDetailed(symbols, "greek", "greek", standard).lossy,
    false,
  );
  // Read as letters, the symbols name the same letters.
  const letters = (text: string) =>
    parse(text, "greek").map((token) =>
      token.kind === "grapheme" ? token.letter : token.value
    );
  assertEquals(letters(symbols), letters("θεός φῶς π κ ρ ε Υ Ύ Ϋ Θ"));
  assertNfcEquals(convert("ϑεός", "greek", "transliteration"), "theós");
  assertEquals(convert("ϑεός", "greek", "beta-code"), "qeo/s");
});

test("preserves literals", () =>
  assertNfcEquals(
    convert("logos 🙂 123", "transliteration", "greek"),
    "λογος 🙂 123",
  ));
