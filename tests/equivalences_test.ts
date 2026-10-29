import { assertEquals } from "@std/assert";
import { convert, reencode } from "../src/mod.ts";
import { encode, parse } from "../src/document.ts";
import { assertNfcEquals } from "./assertions.ts";
import { EQUIVALENCES, FORMATS, valueFor } from "./fixtures.ts";

Deno.test("canonical Greek and Beta Code equivalences", () => {
  for (const { greek, betaCode } of EQUIVALENCES) {
    assertNfcEquals(convert(greek, "greek", "beta-code"), betaCode);
    assertNfcEquals(convert(betaCode, "beta-code", "greek"), greek);
  }
});

Deno.test("canonical Greek and transliteration equivalences", () => {
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

Deno.test("canonical Beta Code and transliteration equivalences", () => {
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

Deno.test("canonical documents survive encode-parse round trips", () => {
  for (const equivalence of EQUIVALENCES) {
    for (const format of FORMATS) {
      const document = parse(valueFor(equivalence, format), format);
      assertEquals(parse(encode(document, format), format), document);
    }
  }
});

Deno.test("reencode is the same-format conversion facade", () => {
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

Deno.test("preserves literals", () =>
  assertNfcEquals(
    convert("logos 🙂 123", "transliteration", "greek"),
    "λογος 🙂 123",
  ));
