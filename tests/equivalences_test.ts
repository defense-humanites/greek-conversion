import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, reencode } from "../src/mod.ts";
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
    "βίοσ",
  );
});

test("preserves literals", () =>
  assertNfcEquals(
    convert("logos 🙂 123", "transliteration", "greek"),
    "λογος 🙂 123",
  ));
