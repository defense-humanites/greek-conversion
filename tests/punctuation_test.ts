import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed, type Format } from "../src/mod.ts";

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

test("keeps a middle dot outside Greek as a literal, lost in Greek output", () => {
  // Transliteration and Beta Code write the ano teleia `;` and `:`: a middle
  // dot is not read, whichever of its two code points is typed, and Greek
  // output, which reads it as the ano teleia, reports it.
  const sources: [string, Format][] = [
    ["lógos· ésti", "transliteration"],
    ["lógos\u0387 ésti", "transliteration"],
    ["lo/gos· e)/sti", "beta-code"],
    ["lo/gos\u0387 e)/sti", "beta-code"],
  ];
  for (const [input, from] of sources) {
    for (const anoTeleia of ["canonical", "middle-dot", "greek"] as const) {
      const result = convertDetailed(input, from, "greek", {
        greek: { anoTeleia },
      });
      assertNfcEquals(result.output, "λόγος· ἔστι");
      assertEquals(
        result.losses.map((loss) => [loss.code, loss.offset]),
        [["unrepresented-literal", input.search(/[\u00B7\u0387]/)]],
        `${from} ${input} (${anoTeleia})`,
      );
    }
    for (const to of ["beta-code", "transliteration"] as const) {
      const result = convertDetailed(input, from, to);
      assertEquals(result.output.includes("\u00B7"), true, `${from} → ${to}`);
      assertEquals(result.lossy, false, `${from} → ${to}`);
    }
  }
  // The ano teleia of each format converts without loss.
  for (
    const [input, from] of [
      ["λόγος· ἔστι", "greek"],
      ["lógos; ésti", "transliteration"],
      ["lo/gos: e)/sti", "beta-code"],
    ] as const
  ) {
    assertEquals(convertDetailed(input, from, "greek").lossy, false, from);
  }
});

test("distinguishes Beta Code breve from apostrophe", () => {
  assertNfcEquals(convert("a%27 p'", "beta-code", "greek"), "ᾰ π’");
  assertNfcEquals(convert("ᾰ π’", "greek", "beta-code"), "a%27 p'");
  // In TLG Beta Code, ' is the apostrophe after a vowel too.
  assertNfcEquals(convert("a' a%27'", "beta-code", "greek"), "α’ ᾰ’");
});
