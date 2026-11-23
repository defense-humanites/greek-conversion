import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, type Format } from "../src/mod.ts";
import { EQUIVALENCES, FORMATS } from "./fixtures.ts";

test("canonical and decomposed Greek input convert identically", () => {
  for (const { greek } of EQUIVALENCES) {
    for (const target of FORMATS) {
      assertNfcEquals(
        convert(greek.normalize("NFC"), "greek", target),
        convert(greek.normalize("NFD"), "greek", target),
      );
    }
  }
});

test("canonicalizes adversarial combining-mark order and duplicates", () => {
  const adversarial = "α\u0301\u0314 α\u0314\u0314\u0301\u0301";

  assertNfcEquals(convert(adversarial, "greek", "greek"), "ἅ ἅ");
  assertNfcEquals(
    convert(adversarial, "greek", "beta-code"),
    "a(/ a(/",
  );
  assertNfcEquals(
    convert(adversarial, "greek", "transliteration"),
    "há há",
  );
});

test("preserves non-BMP and unrecognized Unicode literals", () => {
  const literals = "😀 𝄞 𐀀 \u2066¶\u2069";

  for (const source of FORMATS) {
    for (const target of FORMATS) {
      assertEquals(convert(literals, source, target), literals);
    }
  }
});

test("keeps unrecognized combining marks literal", () => {
  const rareMark = "\u1AB0";

  for (const format of FORMATS) {
    assertNfcEquals(
      convert(`λ${rareMark}λ`, "greek", format),
      format === "greek" ? `λ${rareMark}λ` : `l${rareMark}l`,
    );
  }
});

test("an unrecognized mark keeps no mark from its letter", () => {
  // Canonical order puts the dot below of Leiden's conventions (class 220)
  // before the accents and breathings (230): they still belong to the letter,
  // in every reader, whatever the order the marks were typed in.
  const leiden = ["ἄ\u0323νθρωπος", "α\u0313\u0301\u0323νθρωπος"];
  for (const greek of leiden) {
    assertNfcEquals(convert(greek, "greek", "greek"), "ἄ\u0323νθρωπος");
    assertNfcEquals(
      convert(greek, "greek", "transliteration"),
      "a\u0323\u0301nthrōpos",
    );
    assertEquals(convert(greek, "greek", "beta-code"), "a)/\u0323nqrwpos");
  }
  assertNfcEquals(convert("ὁ\u0323", "greek", "transliteration"), "ho\u0323");
  assertNfcEquals(
    convert("a\u0323\u0301nthrōpos", "transliteration", "greek"),
    "ἄ\u0323νθρωπος",
  );
  // A mark of the same class as the accent, or of class 0, stays where it
  // was typed, and the marks after it with it.
  assertNfcEquals(convert("α\u0307\u0301", "greek", "greek"), "α\u0307\u0301");
  assertNfcEquals(convert("α\u20DD\u0301", "greek", "greek"), "α\u20DD\u0301");
});

test("the Latin circumflex and tilde read as the perispomeni", () => {
  for (const mark of ["\u0302", "\u0303"]) {
    assertEquals(convert(`ȣ${mark}`, "greek", "greek"), "ȣ\u0342");
    assertEquals(convert(`τω${mark}ν`, "greek", "beta-code"), "tw=n");
    assertNfcEquals(convert(`ᾱ${mark}`, "greek", "greek"), "ᾱ\u0342");
  }
});

test("handles transparent controls at final-sigma boundaries", () => {
  const transparent = ["\u0323", "\u200C", "\u200D", "\u2060", "\uFEFF"];

  const contextual = { greek: { finalSigma: "contextual" } } as const;

  for (const suffix of transparent) {
    assertNfcEquals(
      convert(`ασ${suffix}`, "greek", "greek", contextual),
      `ας${suffix}`,
    );
    assertNfcEquals(
      convert(`ας${suffix}α`, "greek", "greek", contextual),
      `ασ${suffix}α`,
    );
    assertNfcEquals(
      convert(`as${suffix}`, "beta-code", "greek"),
      `ας${suffix}`,
    );
  }
});

test("every output respects its Unicode composition policy", () => {
  const source = "Ἄϊδα—κἀγώ· ϳ ϙ ϡʹ 😀";

  for (const format of FORMATS as readonly Format[]) {
    const output = convert(source, "greek", format);
    if (format !== "greek") assertEquals(output, output.normalize("NFC"));
    assertEquals(
      convert(output.normalize("NFD"), format, format),
      output,
    );
  }

  const tonos = convert(source, "greek", "greek", {
    greek: { acute: "tonos" },
  });
  assertEquals(tonos, tonos.normalize("NFC"));

  const decomposed = convert(source, "greek", "greek", {
    greek: { composition: "decomposed" },
  });
  assertEquals(decomposed, decomposed.normalize("NFD"));
});
