import {
  CONVERSION_OPTION_VALUES,
  type ConversionOptions,
  convert,
  convertDetailed,
  reencode,
} from "../src/mod.ts";
import { assertEquals } from "@std/assert";
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

Deno.test("under phi: f, ph is pi followed by a rough breathing", () => {
  // ph is not an ISO 843 spelling of phi: π + ἡ is written phī, which must
  // read back as π + ἡ for the output to be idempotent.
  for (const preset of ["iso-843-type-1", "iso-843-type-2"] as const) {
    for (const greek of ["πἡ", "ποὑ", "ἀμπἡ"]) {
      const latin = convert(greek, "greek", "transliteration", { preset });
      assertNfcEquals(reencode(latin, "transliteration", { preset }), latin);
    }
  }
  const options = { transliteration: { phi: "f" } } as const;
  assertNfcEquals(convert("phē", "transliteration", "greek", options), "πἡ");
  assertNfcEquals(convert("fē", "transliteration", "greek", options), "φη");
});

Deno.test("under chi: kh and lunateSigma: c, ch is lunate sigma and a rough breathing", () => {
  const options = { transliteration: { chi: "kh", lunateSigma: "c" } } as const;
  for (const greek of ["ϲἡ", "ϲοἱ"]) {
    const latin = convert(greek, "greek", "transliteration", options);
    assertNfcEquals(reencode(latin, "transliteration", options), latin);
  }
  assertNfcEquals(convert("ϲἡ", "greek", "transliteration", options), "chē");
  assertNfcEquals(convert("khē", "transliteration", "greek", options), "χη");
  // Without lunateSigma: c, nothing else is written ch, which still reads as
  // chi.
  assertNfcEquals(
    convert("chē", "transliteration", "greek", {
      transliteration: { chi: "kh" },
    }),
    "χη",
  );
});

Deno.test("where gamma before chi is n, gkh is gamma, kappa, and a rough breathing", () => {
  for (
    const nasalGamma of ["nasal-except-kappa", "nasal-medial-kappa"] as const
  ) {
    const options = { transliteration: { chi: "kh", nasalGamma } } as const;
    assertNfcEquals(
      convert("γκἡ", "greek", "transliteration", options),
      "gkhē",
    );
    assertNfcEquals(
      convert("gkhē", "transliteration", "greek", options),
      "γκἡ",
    );
    assertNfcEquals(
      convert("énkhos", "transliteration", "greek", options),
      "ἔγχος",
    );
  }
});

/** Transliteration options that change how a letter is spelled. */
const LETTER_OPTIONS = [
  "beta",
  "eta",
  "xi",
  "phi",
  "chi",
  "upsilon",
  "muPi",
  "nuTau",
  "rho",
  "nasalGamma",
  "lunateSigma",
  "archaicKoppa",
] as const;

Deno.test("letter spelling options keep consonants before a rough breathing idempotent, alone and in pairs", () => {
  // A consonant and the h of a rough breathing can spell another letter
  // (th, ph, kh, ch...): the merge is a reported loss, but the output must
  // read back as what it writes again.
  type Transliteration = NonNullable<ConversionOptions["transliteration"]>;
  const values = CONVERSION_OPTION_VALUES.transliteration;
  const singles: Transliteration[] = LETTER_OPTIONS.flatMap((key) =>
    values[key].slice(1).map((value) => ({ [key]: value }))
  );
  const configurations: Transliteration[] = [
    {},
    ...singles,
    ...singles.flatMap((a, i) =>
      singles.slice(i + 1)
        .filter((b) => Object.keys(a)[0] !== Object.keys(b)[0])
        .map((b) => ({ ...a, ...b }))
    ),
  ];
  const consonants = [
    ..."βγδθκλμνξπρσϲτφχψϙϝ",
    "μπ",
    "ντ",
    "γκ",
    "γγ",
  ];
  const words = consonants.flatMap((c) => [
    `${c}ἡ`,
    `${c}οὑ`,
    `ἀ${c}ἡ`,
    `ἀ${c}οἱ`,
  ]);
  const failures: string[] = [];
  for (const transliteration of configurations) {
    const options = { transliteration } as ConversionOptions;
    for (const word of words) {
      const { output, lossy } = convertDetailed(
        word,
        "greek",
        "transliteration",
        options,
      );
      const again = reencode(output, "transliteration", options);
      if (again !== output) {
        failures.push(
          `${JSON.stringify(transliteration)}: ${word} → ${output} → ${again}`,
        );
      }
      // Whatever does not come back to the canonical source is reported.
      if (!lossy) {
        const back = convert(output, "transliteration", "greek", options);
        if (back !== convert(word, "greek", "greek", options)) {
          failures.push(
            `${
              JSON.stringify(transliteration)
            }: ${word} → ${output} → ${back} (unreported)`,
          );
        }
      }
    }
  }
  assertEquals(failures, []);
});
