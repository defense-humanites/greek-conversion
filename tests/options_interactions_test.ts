import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import {
  CONVERSION_OPTION_VALUES,
  type ConversionOptions,
  convert,
  convertDetailed,
  reencode,
} from "../src/mod.ts";

test("writes the marks of each call with its own options", () => {
  // The Latin spelling of each set of marks is kept across calls, by the
  // options it depends on: calls that alternate must not see each other's.
  const cases: readonly [ConversionOptions, string][] = [
    [{}, "kagṑ oũn ā́r"],
    [{ transliteration: { circumflexAccent: "circumflex" } }, "kagṑ oûn ā́r"],
    [{ diacritics: { accents: "remove" } }, "kagō oun ār"],
    [{ transliteration: { smoothBreathing: "greek" } }, "kagṑ ou̓̃n ā̓́r"],
    [{ transliteration: { coronis: "apostrophe" } }, "ka’gṑ oũn ā́r"],
    [{ transliteration: { quantity: "omit" } }, "kagṑ oũn ár"],
  ];
  for (let round = 0; round < 2; round++) {
    for (const [options, expected] of cases) {
      assertNfcEquals(
        convert("κἀγὼ οὖν ᾱ̓́ρ", "greek", "transliteration", options),
        expected,
        JSON.stringify(options),
      );
    }
  }
});

test("classifies diphthongs before removing their diacritics", () => {
  const options = {
    diacritics: { all: "remove", roughBreathing: "preserve" },
    transliteration: { upsilon: "y-with-diphthong-u" },
  } as const;

  assertNfcEquals(
    convert("αϋ αυ ᾳυ", "greek", "transliteration", options),
    "ay au ay",
  );
});

test("classifies context before selective diacritic removal", () => {
  const options = {
    diacritics: { diaeresis: "remove" },
    transliteration: { upsilon: "y-with-diphthong-u" },
  } as const;

  assertNfcEquals(
    convert("αϋ αυ", "greek", "transliteration", options),
    "ay au",
  );
});

test("does not create contractions by removing blocking marks", () => {
  const options = {
    diacritics: { all: "remove" },
    greek: { dentalSigma: "assimilate", finalSigma: "contextual" },
  } as const;

  assertNfcEquals(
    convert("βσ́ τσ́", "greek", "greek", options),
    "βς τς",
  );
});

test("selective removal does not create blocked contractions", () => {
  const options = {
    diacritics: { accents: "remove" },
    greek: { dentalSigma: "assimilate", finalSigma: "contextual" },
  } as const;

  assertNfcEquals(
    convert("βσ́ τσ́", "greek", "greek", options),
    "βς τς",
  );
});

test("combines transliteration policies deterministically", () => {
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

test("combines modern transliteration and whitespace policies", () => {
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

test("numerals override interacting Greek glyph policies", () => {
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

test("diacritic removal dominates optional double-rho marks", () => {
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

test("under phi: f, ph is pi followed by a rough breathing", () => {
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

test("under chi: kh and lunateSigma: c, ch is lunate sigma and a rough breathing", () => {
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

test("where gamma before chi is n, gkh is gamma, kappa, and a rough breathing", () => {
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

test("letter spelling options keep consonants before a rough breathing idempotent, alone and in pairs", () => {
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

test("writes vowel pairs as they read back, under the ISO and SBL presets", () => {
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

test("vowel spelling options keep vowel pairs idempotent", () => {
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

test("keeps each rough breathing where the output reads it back", () => {
  const t = (greek: string, options = {}) =>
    convert(greek, "greek", "transliteration", options);
  // Vowels pair from the left: after the diphthong αυ, ἱ keeps its own h.
  assertNfcEquals(t("αυἱ"), "auhi");
  // A vowel with its own breathing keeps the h before the previous vowel.
  assertNfcEquals(t("ἁἱ"), "hahi");
  assertNfcEquals(convert("hahi", "transliteration", "greek"), "ἁἱ");
  // The h of ἁ merges into θ, so the pair reads back as αι: it is written so.
  assertNfcEquals(t("τἁἱς"), "thais");
  // A coronis written as an apostrophe stands between ω and ὑ.
  assertNfcEquals(
    t("τὠὑτό", { transliteration: { coronis: "apostrophe" } }),
    "tō’hytó",
  );
  // No diaeresis on a vowel that carries a breathing, written or read.
  assertNfcEquals(t("ὑἱός"), "hyhiós");
  assertNfcEquals(convert("hyhiós", "transliteration", "greek"), "ὑἱός");
});

test("vowel pairs stay idempotent next to breathings, diphthongs, and capitals", () => {
  // Pairs with a breathing on both vowels, after a diphthong, after a
  // consonant whose Latin letter forms a digraph with h, and in capitals.
  type Transliteration = NonNullable<ConversionOptions["transliteration"]>;
  const values = CONVERSION_OPTION_VALUES.transliteration;
  const words = new Set<string>();
  for (const first of ["α", "ε", "η", "ο", "υ", "ω"]) {
    for (const second of ["ι", "υ"]) {
      for (const before of ["", "\u0313", "\u0314", "\u0301"]) {
        for (const after of ["\u0313", "\u0314", "\u0314\u0342", "\u0301"]) {
          const pair = (first + before).normalize() +
            (second + after).normalize();
          for (
            const word of [
              pair,
              `τ${pair}ς`,
              `ρ${pair}`,
              `κ${pair}`,
              `αυ${second}${after}`.normalize(),
              pair.toUpperCase(),
            ]
          ) words.add(word);
        }
      }
    }
  }
  const failures: string[] = [];
  for (const eta of values.eta) {
    for (const longVowels of values.longVowels) {
      for (const upsilon of values.upsilon) {
        for (const chi of values.chi) {
          for (
            const diacritics of [
              {},
              { accents: "remove" },
              { smoothBreathing: "remove" },
            ] as const
          ) {
            const transliteration: Transliteration = {
              eta,
              longVowels,
              upsilon,
              chi,
              // v and f read back as beta and phi only with these.
              ...(upsilon === "y-with-ou-v-f"
                ? { beta: "v", phi: "f" } as const
                : {}),
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
                  `${JSON.stringify(options)}: ${word} → ${written} → ${again}`,
                );
              }
            }
          }
        }
      }
    }
  }
  assertEquals(failures, []);
});

test("under upsilon: y-with-ou-v-f alone, v and f read back as upsilon", () => {
  // ISO 843 Type 2 writes the upsilon of αυ, ευ, ηυ as v or f, with its
  // accent on the vowel. Without beta: "v" or phi: "f", nothing else claims
  // the letter: it reads back, with its accent. It was read as text, which
  // ended the word, so that title case wrote `Aftós` again as `AfTós`.
  const options = {
    transliteration: { upsilon: "y-with-ou-v-f" },
  } as const;
  for (
    const [greek, latin] of [
      ["αὐτός", "aftós"],
      ["εὖ", "ẽf"],
      ["Εὔβοια", "Évboia"],
      ["αὑτοῦ", "haftoũ"],
    ] as const
  ) {
    const result = convertDetailed(greek, "greek", "transliteration", options);
    assertNfcEquals(result.output, latin);
    assertEquals(result.lossy, false, greek);
    assertNfcEquals(
      convert(latin, "transliteration", "greek", options),
      greek,
    );
  }
  for (
    const letterCase of ["preserve", "uppercase", "title", "lowercase"] as const
  ) {
    const caseOptions = { ...options, text: { letterCase } };
    const once = convert("αὐτός εὖ", "greek", "transliteration", caseOptions);
    assertNfcEquals(
      convert(once, "transliteration", "transliteration", caseOptions),
      once,
      letterCase,
    );
  }
  // Under ISO 843 Type 2, beta and phi are v and f: the pair reads back as
  // they do, as documented.
  assertNfcEquals(
    convert("’aftós", "transliteration", "greek", {
      preset: "iso-843-type-2",
    }),
    "’αφτός",
  );
});

test("BnF numerals stay as written under every letter case and mark removal", () => {
  // An acute on a consonant cannot be an accent: it reads back as the right
  // keraia, and a comma before c̄ or s̄ as the left one. Removing the accents
  // writes the right keraia ʹ, which an acute would not survive.
  const bnf = { preset: "bnf-core" } as const;
  assertNfcEquals(
    convert("c̄́ s̄́ ,c̄", "transliteration", "greek", bnf),
    "ϛʹ ϡʹ ͵ϛ",
  );
  assertEquals(
    convertDetailed("ϛʹ ͵ϛ", "greek", "transliteration", bnf).lossy,
    false,
  );
  // A comma before another letter is a comma.
  assertNfcEquals(convert("a,b", "transliteration", "greek", bnf), "α,β");
  assertNfcEquals(
    convert("ϛʹ αʹ ͵ϛ", "greek", "transliteration", {
      ...bnf,
      diacritics: { all: "remove" },
    }),
    "c̄ʹ aʹ ,c̄",
  );
  const numerals = "ϛʹ Ϛʹ αʹ ιαʹ ϙʹ ϡʹ ͵ϛ ͵Ϡ βʹ ϡαʹ ϡβʹ";
  for (
    const letterCase of ["preserve", "uppercase", "title", "lowercase"] as const
  ) {
    for (const marks of [{}, { diacritics: { all: "remove" } }] as const) {
      const options = {
        transliteration: { keraia: "bnf" },
        text: { letterCase },
        ...marks,
      } as const;
      const once = convert(numerals, "greek", "transliteration", options);
      assertNfcEquals(
        convert(once, "transliteration", "transliteration", options),
        once,
        JSON.stringify(options),
      );
    }
  }
});

test("a Beta Code keraia before a digit is written as itself", () => {
  // `#` and a digit are a TLG character code: `a#1` is αϟ.
  assertEquals(convert("αʹ1 βʹ22 αʹ 1", "greek", "beta-code"), "aʹ1 bʹ22 a# 1");
  for (const input of ["αʹ1", "βʹ22", "αʹ5"]) {
    const result = convertDetailed(input, "greek", "beta-code");
    assertEquals(result.lossy, false, input);
    assertNfcEquals(convert(result.output, "beta-code", "greek"), input);
    assertEquals(
      convert(result.output, "beta-code", "beta-code"),
      result.output,
    );
  }
  assertNfcEquals(convert("a#1", "beta-code", "greek"), "αϟ");
});

test("a separation diaeresis the source does not have is reported", () => {
  // Under the contextual upsilon, transliteration keeps a hiatus that only a
  // breathing on a vowel inside the word marks by a diaeresis, which reads
  // back: ἑυ and ἑϋ are both written `heÿ`.
  for (
    const [input, from] of [["a)e(u", "beta-code"], ["ἀἑυ", "greek"]] as const
  ) {
    const result = convertDetailed(input, from, "transliteration");
    assertNfcEquals(result.output, "aheÿ");
    assertEquals(
      result.losses.map(({ code, diacritic, index }) => [
        code,
        diacritic,
        index,
      ]),
      [["added-diacritic", "diaeresis", 2]],
    );
  }
  assertEquals(convertDetailed("ἀἑϋ", "greek", "transliteration").lossy, false);
});

test("a numeral keeps the separation of a contextual y", () => {
  // A numeral takes no breathing, so the reader infers none there: the `y`
  // keeps its separation by a diaeresis, as inside a word.
  assertNfcEquals(convert("oyʹ ayʹ", "transliteration", "greek"), "οϋʹ αϋʹ");
  assertNfcEquals(convert("ὀυʹ", "greek", "transliteration"), "oÿʹ");
  assertNfcEquals(convert("oÿʹ", "transliteration", "transliteration"), "oÿʹ");
  assertEquals(
    convertDetailed("ὀυʹ", "greek", "transliteration").losses.map((loss) =>
      `${loss.code}:${loss.diacritic}`
    ),
    ["removed-diacritic:smooth", "added-diacritic:diaeresis"],
  );
  // An `h` keeps its rough breathing in place, which separates the pair.
  assertNfcEquals(convert("hayʹ", "transliteration", "greek"), "ἁυʹ");
  assertNfcEquals(convert("ἁυʹ", "greek", "transliteration"), "hayʹ");
  // Outside a numeral, the smooth breathing is inferred at the start of the
  // word.
  assertNfcEquals(convert("oy", "transliteration", "greek"), "ὀυ");
});

test("title case leaves the letter after an apostrophe inside its word", () => {
  // A coronis written as an apostrophe reads back as one: the letter after it
  // stays inside the word, as it was when the coronis was a mark.
  for (
    const [input, options, expected] of [
      [
        "κἀγώ τοὔνομα",
        { transliteration: { coronis: "apostrophe" } },
        "Ka’gṓ Toú’noma",
      ],
      // The upsilon of `ταὐτόν` is written `f`, which reads back as phi.
      [
        "ταὐτόν",
        { preset: "iso-843-type-2", transliteration: { beta: "b" } },
        "Taf’tón",
      ],
    ] as const
  ) {
    const title = { ...options, text: { letterCase: "title" } } as const;
    const output = convert(input, "greek", "transliteration", title);
    assertNfcEquals(output, expected);
    assertNfcEquals(
      convert(output, "transliteration", "transliteration", title),
      output,
    );
  }
  // So does an elision written without a space; a space starts a word.
  assertNfcEquals(
    convert("δ’ἐγώ δ’ ἐγώ", "greek", "greek", {
      text: { letterCase: "title" },
    }),
    "Δ’ἐγώ Δ’ Ἐγώ",
  );
});

test("upsilon written v or f reads back after an eta written i", () => {
  // Under ISO 843 Type 2, eta is `i` with no length mark; with `beta: "b"`,
  // `v` is the upsilon of `ηυ`, and `ιυ` is never written so.
  const options = {
    preset: "iso-843-type-2",
    transliteration: { beta: "b" },
  } as const;
  const result = convertDetailed("ηὗρον", "greek", "transliteration", options);
  assertNfcEquals(result.output, "hîvron");
  assertEquals(result.lossy, false);
  assertNfcEquals(
    convert(result.output, "transliteration", "greek", options),
    "ηὗρον",
  );
  // Before a voiced sound, a coronis written as an apostrophe keeps the `v`.
  const title = { ...options, text: { letterCase: "title" } } as const;
  for (const input of ["κεὐγένειαν", "ταὔλιον"]) {
    const output = convert(input, "greek", "transliteration", title);
    assertNfcEquals(
      convert(output, "transliteration", "transliteration", title),
      output,
    );
  }
});

test("a circumflex moved to epsilon does not read back as eta", () => {
  // Under `y-with-ou-v-f`, the accent of the upsilon of `ευ` moves to the
  // epsilon. Where `ê` is eta, it is written as a tilde.
  for (
    const [preset, expected] of [
      ["iso-843-type-1", "’ẽf"],
      ["bnf-core", "ẽf̓"],
      ["iso-843-type-2", "’êf"],
    ] as const
  ) {
    const options = {
      preset,
      transliteration: { upsilon: "y-with-ou-v-f" },
    } as const;
    const output = convert("εὖ", "greek", "transliteration", options);
    assertNfcEquals(output, expected, preset);
    assertNfcEquals(
      convert(output, "transliteration", "transliteration", options),
      output,
    );
  }
});

test("an iota written like eta keeps the separation of the next y", () => {
  // Under `eta: "i"`, `ī` is eta, and so reads an iota with a macron: before
  // an upsilon, the `y` takes the diaeresis it would take after an eta.
  const options = {
    preset: "iso-843-type-1",
    transliteration: { upsilon: "y-with-ou-v-f" },
  } as const;
  const result = convertDetailed("ῑῠ", "greek", "transliteration", options);
  assertNfcEquals(result.output, "īy\u0306\u0308");
  assertEquals(
    convert(result.output, "transliteration", "transliteration", options),
    result.output,
  );
  assertEquals(
    result.losses.map(({ code }) => code),
    ["unrepresented-grapheme", "added-diacritic"],
  );
});
