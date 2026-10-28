import { convert } from "../src/mod.ts";
import { assertNfcEquals } from "./assertions.ts";

Deno.test("classifies diphthongs before removing their diacritics", () => {
  const options = {
    diacritics: { all: "remove", roughBreathing: "preserve" },
    transliteration: { upsilon: "y-with-diphthong-u" },
  } as const;

  assertNfcEquals(
    convert("αϋ αυ ᾳυ", "greek", "transliteration", options),
    "ay au ay",
  );
});

Deno.test("classifies context before selective diacritic removal", () => {
  const options = {
    diacritics: { diaeresis: "remove" },
    transliteration: { upsilon: "y-with-diphthong-u" },
  } as const;

  assertNfcEquals(
    convert("αϋ αυ", "greek", "transliteration", options),
    "ay au",
  );
});

Deno.test("does not create contractions by removing blocking marks", () => {
  const options = {
    diacritics: { all: "remove" },
    greek: { dentalSigma: "assimilate" },
  } as const;

  assertNfcEquals(
    convert("βσ́ τσ́", "greek", "greek", options),
    "βς τς",
  );
});

Deno.test("selective removal does not create blocked contractions", () => {
  const options = {
    diacritics: { accents: "remove" },
    greek: { dentalSigma: "assimilate" },
  } as const;

  assertNfcEquals(
    convert("βσ́ τσ́", "greek", "greek", options),
    "βς τς",
  );
});

Deno.test("combines transliteration policies deterministically", () => {
  const options = {
    diacritics: { all: "remove", roughBreathing: "preserve" },
    transliteration: {
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
    diacritics: { all: "remove", roughBreathing: "preserve" },
    transliteration: {
      beta: "v",
      chi: "kh",
      eta: "i",
      muPi: "b-initial",
      nuTau: "d-initial",
      phi: "f",
      rho: "systematic",
      upsilon: "y",
      xi: "ks",
    },
    text: { whitespace: "collapse" },
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
    diacritics: { all: "remove", roughBreathing: "preserve" },
    greek: { dentalSigma: "assimilate", medialBeta: "symbol", sigma: "lunate" },
    text: { numerals: "decimal" },
  } as const;

  assertNfcEquals(
    convert("βίος βʹ ατσα", "greek", "greek", options),
    "βιοϲ 2 αϲα",
  );
});

Deno.test("diacritic removal dominates optional double-rho marks", () => {
  const options = {
    diacritics: { all: "remove" },
    greek: { doubleRho: "smooth-rough" },
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
    "polyrrhizos",
  );
  // A class kept as the exception keeps the marks the policy adds too.
  assertNfcEquals(
    convert("πολύρριζος", "greek", "greek", {
      ...options,
      diacritics: { all: "remove", roughBreathing: "preserve" },
    }),
    "πολυρῥιζος",
  );
});
