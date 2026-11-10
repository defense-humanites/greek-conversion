import { assertEquals } from "@std/assert";
import {
  CONVERSION_OPTION_VALUES,
  type ConversionOptions,
  convert,
  reencode,
} from "../src/mod.ts";
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

Deno.test("writes vowel pairs as they read back, under the ISO and SBL presets", () => {
  const iso = { preset: "iso-843-type-2" } as const;
  // Omega is written o: Ionic ωυ is written like ου, not oy, which reads
  // back as the hiatus οϋ.
  assertNfcEquals(
    convert("ἑωυτοῦ", "greek", "transliteration", iso),
    "heoutoû",
  );
  // The apostrophe of a coronis reads back as punctuation; the μπ after it
  // stays inside the word, where it is mp.
  assertNfcEquals(
    convert("τοὔμπαλιν", "greek", "transliteration", iso),
    "toú’mpalin",
  );
  // That apostrophe also separates ω from υ when the coronis is on ω.
  assertNfcEquals(convert("τὠυτὸ", "greek", "transliteration", iso), "to’ytò");
  // Where the upsilon of ηυ is written v or f, the eta keeps the breathing.
  assertNfcEquals(convert("ηὔδα", "greek", "transliteration", iso), "’ívda");
  assertNfcEquals(convert("ηὕηνα", "greek", "transliteration", iso), "hívina");
  assertNfcEquals(reencode("toú’mpalin", "transliteration", iso), "toú’mpalin");
  // sbl-general removes the accent that marks the hiatus of υι: y says it,
  // and the diaeresis that the reader infers from it is written at once.
  const sbl = { preset: "sbl-general" } as const;
  assertNfcEquals(
    convert("Θύιλλος", "greek", "transliteration", sbl),
    "Thyïllos",
  );
  // A separation diaeresis goes before the accent, where a written one would.
  assertNfcEquals(
    convert("ἀύ", "greek", "transliteration", {
      diacritics: { smoothBreathing: "remove" },
    }),
    "aÿ́",
  );
  // Under longVowels: "omit", eta and omega read back as epsilon (or iota)
  // and omicron, and their pairs are written as such.
  assertNfcEquals(
    convert("ηἱ", "greek", "transliteration", {
      transliteration: { longVowels: "omit" },
    }),
    "hei",
  );
  assertNfcEquals(
    convert("ηυ", "greek", "transliteration", {
      transliteration: { longVowels: "omit", eta: "i" },
    }),
    "iy",
  );
});

Deno.test("vowel spelling options keep vowel pairs idempotent", () => {
  // Every pair of a vowel and iota or upsilon, bare or with a breathing, an
  // accent, a coronis, or a diaeresis, alone and inside a word, under every
  // combination of the options that spell vowels and the policies that remove
  // the marks which tell a hiatus from a diphthong.
  type Transliteration = NonNullable<ConversionOptions["transliteration"]>;
  const values = CONVERSION_OPTION_VALUES.transliteration;
  const words: string[] = [];
  for (const first of ["α", "ε", "η", "ι", "ο", "υ", "ω"]) {
    for (const second of ["ι", "υ"]) {
      for (
        const before of ["", "\u0301", "\u0313", "\u0314", "\u0342", "\u0343"]
      ) {
        for (
          const after of [
            "",
            "\u0301",
            "\u0308",
            "\u0313",
            "\u0314",
            "\u0308\u0301",
          ]
        ) {
          if (
            /[\u0313\u0314\u0343]/.test(before) &&
            /[\u0313\u0314]/.test(after)
          ) {
            continue;
          }
          const pair = (first + before).normalize() +
            (second + after).normalize();
          words.push(pair, `τ${pair}ς`);
        }
      }
    }
  }
  const failures: string[] = [];
  for (const eta of values.eta) {
    for (const longVowels of values.longVowels) {
      for (const upsilon of values.upsilon) {
        for (const smoothBreathing of values.smoothBreathing) {
          for (const coronis of values.coronis) {
            for (
              const diacritics of [
                {},
                { accents: "remove" },
                { smoothBreathing: "remove" },
                { accents: "remove", smoothBreathing: "remove" },
              ] as const
            ) {
              const transliteration: Transliteration = {
                eta,
                longVowels,
                upsilon,
                smoothBreathing,
                coronis,
              };
              const options = { transliteration, diacritics };
              for (const word of words) {
                const written = convert(
                  word,
                  "greek",
                  "transliteration",
                  options,
                );
                const again = reencode(written, "transliteration", options);
                if (again !== written) {
                  failures.push(
                    `${
                      JSON.stringify(options)
                    }: ${word} → ${written} → ${again}`,
                  );
                }
              }
            }
          }
        }
      }
    }
  }
  assertEquals(failures, []);
});
