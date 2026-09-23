import { convert } from "../src/mod.ts";
import { assertNfcEquals } from "./assertions.ts";

Deno.test("classifies diphthongs before removing their diacritics", () => {
  const options = {
    removeDiacritics: true,
    orthography: { upsilon: "y-with-diphthong-u" },
  } as const;

  assertNfcEquals(
    convert("αϋ αυ ᾳυ", "greek", "transliteration", options),
    "ay au ay",
  );
});

Deno.test("classifies context before selective diacritic removal", () => {
  const options = {
    diacritics: { diaeresis: "remove" },
    orthography: { upsilon: "y-with-diphthong-u" },
  } as const;

  assertNfcEquals(
    convert("αϋ αυ", "greek", "transliteration", options),
    "ay au",
  );
});

Deno.test("does not create contractions by removing blocking marks", () => {
  const options = {
    removeDiacritics: true,
    orthography: { dentalSigma: "assimilate" },
  } as const;

  assertNfcEquals(
    convert("βσ́ τσ́", "greek", "greek", options),
    "βσ τσ",
  );
});

Deno.test("selective removal does not create blocked contractions", () => {
  const options = {
    diacritics: { accents: "remove" },
    orthography: { dentalSigma: "assimilate" },
  } as const;

  assertNfcEquals(
    convert("βσ́ τσ́", "greek", "greek", options),
    "βς τς",
  );
});

Deno.test("combines transliteration policies deterministically", () => {
  const options = {
    removeDiacritics: true,
    orthography: {
      coronis: "apostrophe",
      longVowels: "circumflex",
      nasalGamma: "literal",
      upsilon: "y-with-diphthong-u",
    },
  } as const;

  assertNfcEquals(
    convert(
      "κἀγώ ἄγγελος υ αυ αϋ ῆ",
      "greek",
      "transliteration",
      options,
    ),
    "kagô aggelos y au ay ê",
  );
});

Deno.test("combines modern transliteration and whitespace policies", () => {
  const options = {
    removeDiacritics: true,
    orthography: {
      beta: "v",
      chi: "kh",
      eta: "ī",
      modernDigraphs: "phonetic",
      phi: "f",
      rho: "systematic",
      upsilon: "y",
      whitespace: "collapse",
      xi: "ks",
    },
  } as const;

  assertNfcEquals(
    convert(
      " \tμπήρα  βηξφχυ  ρρ\nντομάτα ",
      "greek",
      "transliteration",
      options,
    ),
    "bīrha vīksfkhy rrh domata",
  );
});

Deno.test("numerals override interacting Greek glyph policies", () => {
  const options = {
    removeDiacritics: true,
    orthography: {
      dentalSigma: "assimilate",
      medialBeta: "symbol",
      numerals: "decimal",
      sigma: "lunate",
    },
  } as const;

  assertNfcEquals(
    convert("βίος βʹ ατσα", "greek", "greek", options),
    "βιοϲ 2 αϲα",
  );
});

Deno.test("diacritic removal dominates optional double-rho marks", () => {
  const options = {
    removeDiacritics: true,
    orthography: { doubleRho: "smooth-rough" },
  } as const;

  assertNfcEquals(
    convert("πολύρριζος", "greek", "greek", options),
    "πολυρριζος",
  );
  assertNfcEquals(
    convert("πολύρριζος", "greek", "beta-code", options),
    "polurrizos",
  );
  assertNfcEquals(
    convert("πολύρριζος", "greek", "transliteration", options),
    "polurrhizos",
  );
});
