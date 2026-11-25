import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import {
  type ConversionOptions,
  convert,
  createConverter,
  type Format,
} from "../src/mod.ts";

const noAlpha = createConverter({ exclude: ["alpha"] });
const noSigma = createConverter({ exclude: ["sigma"] });

test("a letter kept in another format reads back as a letter of its word", () => {
  // A converter writes a letter out of its scope in its source format; the
  // reader of the target keeps it as text, as a letter of its word, so the
  // rules around it decide again what they decided (#173).
  const cases: [
    typeof noAlpha,
    string,
    Format,
    ConversionOptions,
    string,
  ][] = [
    // Final sigma: a letter follows `s`.
    [noAlpha, "σα", "beta-code", {}, "sα"],
    [noAlpha, "σα", "transliteration", {}, "sα"],
    // Letter case: `s` begins no word.
    [noAlpha, "ας", "beta-code", { text: { letterCase: "title" } }, "Αs"],
    // Monotonic accentuation: a word whose syllables it cannot count.
    [
      noAlpha,
      "έα",
      "beta-code",
      { greek: { accentuation: "monotonic" } },
      "e/α",
    ],
    // The case of the word around a kept capital.
    [noSigma, "ΣἙ", "transliteration", {}, "ΣHE"],
    // Numerals: `*e#` is no numeral alone.
    [noSigma, "ΔΣΈʹ", "beta-code", { preset: "ala-lc-modern" }, "*dΣ*e#"],
  ];
  for (const [converter, source, target, options, written] of cases) {
    const detailed = converter.convertDetailed(
      source,
      "greek",
      target,
      options,
    );
    assertNfcEquals(detailed.output, written);
    assertEquals(
      converter.convert(detailed.output, target, target, options),
      detailed.output,
    );
    if (!detailed.lossy) {
      assertEquals(
        converter.convert(detailed.output, target, "greek", options),
        converter.convert(source, "greek", "greek", options),
      );
    }
  }
});

test("a letter that a reader keeps as text is a letter of its word", () => {
  // A Latin letter among Greek ones, as a digitized text has (`K` for `Κ`).
  assertNfcEquals(
    convert("Kαζάρμα", "greek", "greek", { text: { letterCase: "title" } }),
    "Kαζάρμα",
  );
  // A letter that transliteration does not read: a sigma before it is
  // medial, and monotonic accentuation keeps the accent of its word.
  assertNfcEquals(convert("sc", "transliteration", "greek"), "σc");
  assertNfcEquals(
    convert("ùc", "transliteration", "greek", {
      greek: { accentuation: "monotonic" },
    }),
    "ύc",
  );
});

test("a vowel with both breathings reads back with both under ISO 843", () => {
  // The writer writes `h’` before it, which no Greek word has.
  const iso = { preset: "iso-843-type-1" } as const;
  const written = convert("Ὁ̓Υ", "greek", "transliteration", iso);
  assertEquals(written, "H’OY");
  const preserve = { ...iso, greek: { capitalMarks: "preserve" } } as const;
  assertNfcEquals(
    convert(written, "transliteration", "greek", preserve),
    convert("Ὁ̓Υ", "greek", "greek", preserve),
  );
});
