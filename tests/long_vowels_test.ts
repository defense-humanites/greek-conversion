import { convert, convertDetailed } from "../src/mod.ts";
import { encode } from "../src/document.ts";
import { grapheme } from "../src/model.ts";
import { assertEquals } from "@std/assert";
import { assertNfcEquals } from "./assertions.ts";

const CIRCUMFLEX = {
  transliteration: { longVowels: "circumflex" },
} as const;

Deno.test("selects the transliterated spelling of structural long vowels", () => {
  const greek = "βη βω βᾱ βῑ βῡ";

  assertNfcEquals(
    convert(greek, "greek", "transliteration"),
    "bē bō bā bī bȳ",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", CIRCUMFLEX),
    "bê bô bā bī bȳ",
  );
});

Deno.test("accepts every structural long-vowel spelling on input", () => {
  assertNfcEquals(
    convert(
      "be bê bē bê̄ bo bô bō bô̄",
      "transliteration",
      "greek",
    ),
    "βε βη βη βη̄ βο βω βω βω̄",
  );
  assertNfcEquals(
    convert("bê̄ bô̄", "transliteration", "greek"),
    "βη̄ βω̄",
  );
  assertNfcEquals(
    convert("bê̄ bô̄", "transliteration", "transliteration", CIRCUMFLEX),
    "bê̄ bô̄",
  );
  assertNfcEquals(
    convert("η̄ ω̄", "greek", "transliteration", CIRCUMFLEX),
    "ê̄ ô̄",
  );
});

Deno.test("applies the structural marker policy to stigma and sampi", () => {
  const greek = "ϛ ϡ ϛʹ ϡʹ";

  assertNfcEquals(
    convert(greek, "greek", "transliteration"),
    "c̄ s̄ c̄ʹ s̄ʹ",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", CIRCUMFLEX),
    "ĉ ŝ ĉʹ ŝʹ",
  );
  for (const transliteration of ["c̄ s̄", "ĉ ŝ", "ĉ̄ ŝ̄", "c̄̂ s̄̂"]) {
    assertNfcEquals(
      convert(transliteration, "transliteration", "greek"),
      "ϛ ϡ",
    );
  }
});

Deno.test("keeps structural length distinct from Greek circumflex accent", () => {
  const greek = "βῆ βῶ βᾶ βᾱ";

  assertNfcEquals(
    convert(greek, "greek", "transliteration"),
    "bē̃ bō̃ bã bā",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", CIRCUMFLEX),
    "bễ bỗ bã bā",
  );
  assertNfcEquals(
    encode(
      [grapheme("alpha", false, ["macron", "circumflex"])],
      "transliteration",
      CIRCUMFLEX,
    ),
    "ā̃",
  );

  assertNfcEquals(
    encode(
      [grapheme("eta", false, ["macron", "circumflex"])],
      "transliteration",
      CIRCUMFLEX,
    ),
    "ê̄̃",
  );
});

Deno.test("writes quantity before other marks in transliteration", () => {
  const cases = [
    ["ᾱ́", "a\u0304\u0301"],
    ["ᾱ̀", "a\u0304\u0300"],
    ["ῑ́", "i\u0304\u0301"],
    ["ῠ́", "y\u0306\u0301"],
    ["ῑ̈", "i\u0304\u0308"],
    ["ᾱ̓́", "a\u0304\u0301"],
  ] as const;
  for (const [greek, latin] of cases) {
    const output = convert(greek, "greek", "transliteration");
    assertEquals(output, latin.normalize("NFC"));
    assertEquals(
      convert(output, "transliteration", "transliteration"),
      output,
    );
  }
  // Either input order is accepted and yields the same canonical Greek.
  const canonical = convert("ᾱ́", "greek", "greek");
  assertNfcEquals(convert("á̄", "transliteration", "greek"), canonical);
  assertNfcEquals(convert("ā́", "transliteration", "greek"), canonical);

  // An explicit macron on iota stays idempotent even where `ī` is eta.
  const iso = { preset: "iso-843-type-1" } as const;
  const once = convert("ῑ́", "greek", "transliteration", iso);
  assertEquals(convert(once, "transliteration", "transliteration", iso), once);
});

Deno.test("writes quantity before other marks in Greek", () => {
  // The macron or breve sits on the vowel, the breathing and accent above
  // it: NFC keeps the precomposed long vowel and adds the other marks.
  const cases = [
    ["\u03B1\u0301\u0304", "\u1FB1\u0301"],
    ["\u1F00\u0304", "\u1FB1\u0313"],
    ["\u1F04\u0304", "\u1FB1\u0313\u0301"],
    ["\u1FB9\u0301", "\u1FB9\u0301"],
    ["\u03B9\u0308\u0304", "\u1FD1\u0308"],
    ["\u03C5\u0301\u0306", "\u1FE0\u0301"],
  ] as const;
  for (const [source, expected] of cases) {
    const output = convert(source, "greek", "greek");
    assertEquals(output, expected);
    assertEquals(output, output.normalize("NFC"));
    assertEquals(convert(output, "greek", "greek"), output);
  }
  // Beta Code keeps its TLG mark order and reads back the same Greek.
  assertEquals(convert("\u1F04\u0304", "greek", "beta-code"), "a)/%26");
  assertEquals(convert("a)/%26", "beta-code", "greek"), "\u1FB1\u0313\u0301");
});

Deno.test("omits a quantity mark on epsilon and omicron in transliteration", () => {
  const result = convertDetailed("ἔ̄ ὄ̄", "greek", "transliteration");
  assertNfcEquals(result.output, "é ó");
  assertEquals(
    result.losses.map(({ code, diacritic }) => ({ code, diacritic })),
    [
      { code: "removed-diacritic", diacritic: "macron" },
      { code: "removed-diacritic", diacritic: "macron" },
    ],
  );
});
