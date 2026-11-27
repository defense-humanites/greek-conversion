import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import {
  type ConversionOptions,
  convert,
  convertDetailed,
  createConverter,
  type Format,
} from "../src/mod.ts";
import { parse } from "../src/document.ts";

/**
 * Guards against superlinear conversion cost.
 *
 * Each path is timed on two inputs, the second eight times longer. Linear
 * code takes about eight times as long; the quadratic transliteration parser
 * fixed before 1.0 took about sixty times as long. The threshold sits far
 * from both.
 *
 * Each run is timed by the processor time of the process, not by the
 * clock: on a machine busy with other processes, the clock counts the time
 * they take, which falls more on the long runs than on the short ones, whose
 * fastest fits between two of them. Timed by the clock, the test failed in
 * about one run in six with three busy processes on two processors, and in
 * none timed so.
 *
 * Noise still remains (a collection or a recompilation during the long
 * input's runs). A ratio over the threshold is therefore measured again, up
 * to three times, and the lowest one is kept: noise does not repeat three
 * times in a row, a superlinear cost does (a deliberately quadratic path
 * measures about 50 to 64 on every attempt).
 */
const PASSAGE =
  "κίνησις γὰρ αὕτη δὴ μεγίστη τοῖς Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων. ἀυτμή ἄυλος ϛʹ Μπάλα ϲῶμα. ";
// Repetitions of a passage: long enough for the small input to take well over
// the 0.05 ms floor of fastest(), even with fast readers.
const SMALL = 60;
const LARGE = 480;
const MAX_RATIO = 25;
const ATTEMPTS = 3;

/**
 * A passage for searches that run ahead in the text. Until 1.0.0-rc.2,
 * reading transliteration under `eta: "i-macron"` (now `"i"`) looked for the
 * next macron anywhere in the rest of the text at every `i`. In PASSAGE, transliterated
 * under ISO 843, a macron follows within a word or two, so the search stopped
 * early and the ratio stayed near 9. This passage has no eta, no omega and no
 * long vowel, hence no macron at all: on 1.0.0-rc.1 its ratio was 36 to 55.
 */
const IOTA_PASSAGE =
  "φιλία καὶ πίστις τινὶ ἐν τοῖς ἄλλοις, ὅτι δίκαιον καὶ καλόν ἐστι πιστεύειν. ";

/**
 * A passage on one line with quotations and sigmas before an apostrophe,
 * whose shape depends on the open quotations of the line (see
 * `closingQuotes()` in `src/context.ts`). Searching back for them from each
 * such sigma would be quadratic.
 */
const ELISION_PASSAGE =
  "‘Ναι’ είπε ἀγγέλλουσ’ — θεοῖσ’; ‘λόγος’ est, ‘ναί.’ ἐλθοῦσ’, ἤν ";

/**
 * Older editions, and their digitizations, print the breathing of a capital
 * before it (`src/parsers/spacing_marks.ts`). Until 1.0.0-rc.11 was
 * published, each one joined to its capital moved the rest of the document:
 * the ratio was about 64.
 */
const EDITION_PASSAGE = "῾Ο δὲ λόγος ἐστὶν ἀληθὴς καὶ καλός, ᾿Αθηναῖοι. ";

/**
 * Spacing signs in a row, which join no capital: each one looked at all the
 * others, and the ratio was in the hundreds.
 */
const SPACING_RUN = "῾᾿῎῾᾿";

/**
 * Words of one capital, whose case the nearest longer word decides under
 * `greek.capitalMarks: "omit"`: searching past all the others for it, from
 * each of them, would be quadratic.
 */
const ONE_CAPITAL_WORDS = "Ἣ Δ’ Ὁ, ";

/**
 * One word in capitals, with a mark that the reader does not read after
 * each letter: looking for a numeral after each such mark, to the end of
 * the word, would be quadratic in its length.
 */
const MARKED_WORD = [..."ΑΒΓΔΕΖΗΘΙΚ"].map((letter) => letter + "\u0307")
  .join("");

/**
 * One long word, as a text without spaces makes one (an inscription in
 * scriptio continua). Its sigmas, its betas under `medialBeta: "symbol"`,
 * its `μπ` under ALA-LC, its dentals before sigma under `dentalSigma:
 * "assimilate"`, and its rough breathings inside the word, read back from
 * transliteration, each asked whether they stood in a numeral, which reading
 * the rest of the word answered: in 1.0.0-rc.13, the ratio was about 55.
 */
const LONG_WORD = "σοϐμπατσἁγκι".repeat(4);

/** Stigmas read as `στ` under `greek.stigma: "ligature"` (`ἐϛὶ`). */
const STIGMA_PASSAGE = "ἐϛὶν ἄϛυ ";

/**
 * Letters under one overline, which Beta Code writes `<…>`: each one looked
 * for the end of the overline, to the end of the run, until 1.0.0-rc.15.
 */
const OVERLINE_RUN = [..."θεοςκυριοςχριστος"].map((letter) => letter + "\u0305")
  .join("");

/**
 * Omegas before `y` in a long word, read under ISO 843 Type 2: each one asked
 * whether it stood in a numeral, which reading the rest of the word answered.
 */
const OMEGA_Y_WORD = "oyoioyai".repeat(5);

/**
 * Capital stigmas and sampis, which BnF writes small in a numeral: each one
 * read the rest of its word to find a keraia.
 */
const BNF_NUMERAL_WORD = "ϚϠΑ".repeat(12);

/**
 * Signs `ϗ` written without spaces, in a polytonic text, under `greek.kaiAccent:
 * "modern"`: the accent of each read the word after it to its end.
 */
const KAI_WORD = "ϗϗϗἀ".repeat(10);

/** The lowest processor time of three runs, in milliseconds, after one more. */
function fastest(run: () => unknown): number {
  run();
  let best = Infinity;
  for (let i = 0; i < 3; i++) {
    const start = process.cpuUsage();
    run();
    const { user, system } = process.cpuUsage(start);
    best = Math.min(best, (user + system) / 1000);
  }
  return Math.max(best, 0.05);
}

const CASES: readonly {
  format: Format;
  target: Format;
  options: ConversionOptions;
  passage?: string;
  name?: string;
}[] = [
  { format: "greek", target: "transliteration", options: {} },
  { format: "beta-code", target: "greek", options: {} },
  { format: "transliteration", target: "greek", options: {} },
  {
    format: "transliteration",
    target: "greek",
    options: { preset: "iso-843-type-1" },
  },
  {
    format: "transliteration",
    target: "greek",
    options: { preset: "iso-843-type-1" },
    passage: IOTA_PASSAGE,
    name: "iota passage",
  },
  {
    format: "greek",
    target: "greek",
    options: { greek: { accentuation: "monotonic" } },
  },
  {
    format: "greek",
    target: "greek",
    options: {},
    passage: ELISION_PASSAGE,
    name: "elision passage",
  },
  {
    format: "greek",
    target: "transliteration",
    options: {},
    passage: EDITION_PASSAGE,
    name: "breathings before capitals",
  },
  {
    format: "greek",
    target: "transliteration",
    options: {},
    passage: SPACING_RUN,
    name: "spacing signs in a row",
  },
  {
    format: "beta-code",
    target: "greek",
    options: {},
    passage: SPACING_RUN,
    name: "spacing signs in a row",
  },
  {
    format: "greek",
    target: "transliteration",
    options: { greek: { stigma: "ligature" } },
    passage: STIGMA_PASSAGE,
    name: "stigma ligatures",
  },
  {
    format: "greek",
    target: "greek",
    options: {},
    passage: ONE_CAPITAL_WORDS,
    name: "words of one capital",
  },
  {
    format: "greek",
    target: "greek",
    options: {},
    passage: MARKED_WORD,
    name: "a word in capitals with unread marks",
  },
  {
    format: "greek",
    target: "greek",
    options: { greek: { medialBeta: "symbol", dentalSigma: "assimilate" } },
    passage: LONG_WORD,
    name: "one long word",
  },
  {
    format: "greek",
    target: "beta-code",
    options: {},
    passage: LONG_WORD,
    name: "one long word",
  },
  {
    format: "greek",
    target: "transliteration",
    options: { preset: "ala-lc-modern" },
    passage: LONG_WORD,
    name: "one long word",
  },
  {
    format: "transliteration",
    target: "greek",
    options: {},
    passage: LONG_WORD,
    name: "one long word",
  },
  {
    format: "greek",
    target: "beta-code",
    options: {},
    passage: OVERLINE_RUN,
    name: "letters under one overline",
  },
  {
    format: "transliteration",
    target: "greek",
    options: { preset: "iso-843-type-2" },
    passage: OMEGA_Y_WORD,
    name: "omegas before y in a long word",
  },
  {
    format: "greek",
    target: "transliteration",
    options: { preset: "bnf-ancient" },
    passage: BNF_NUMERAL_WORD,
    name: "capital stigmas and sampis in a long word",
  },
  {
    format: "greek",
    target: "transliteration",
    options: { greek: { kaiAccent: "modern" } },
    passage: KAI_WORD,
    name: "signs of καί written without spaces",
  },
];

test("conversion cost grows linearly with the input", () => {
  for (const { format, target, options, passage = PASSAGE, name } of CASES) {
    const small = convert(passage.repeat(SMALL), "greek", format, options);
    const large = convert(passage.repeat(LARGE), "greek", format, options);
    for (
      const [label, run] of [
        ["parse", (text: string) => parse(text, format, options)],
        [
          "convertDetailed",
          (text: string) => convertDetailed(text, format, target, options),
        ],
      ] as const
    ) {
      let ratio = Infinity;
      for (
        let attempt = 0;
        attempt < ATTEMPTS && ratio >= MAX_RATIO;
        attempt++
      ) {
        ratio = Math.min(
          ratio,
          fastest(() => run(large)) / fastest(() => run(small)),
        );
      }
      assertEquals(
        ratio < MAX_RATIO,
        true,
        `${label} ${format} → ${target} ${JSON.stringify(options)}${
          name === undefined ? "" : ` (${name})`
        }: an 8× longer input took ${ratio.toFixed(1)}× as long`,
      );
    }
  }
});

test("a converter checks the scope of a long word in linear time", () => {
  // A converter bound to ALA-LC asked, for each stigma, sampi, or koppa,
  // whether it stood in a numeral, and one bound to ISO 843 did for every
  // letter under decimal numerals: reading the rest of the word each time,
  // until 1.0.0-rc.15.
  const ala = createConverter({ preset: "ala-lc-ancient" });
  const iso = createConverter({ preset: "iso-843-type-1" });
  const decimal = { text: { numerals: "decimal" } } as const;
  for (
    const [name, passage, run] of [
      [
        "ALA-LC",
        "ϛϡϙα".repeat(12),
        (text: string) => ala.convert(text, "greek", "transliteration"),
      ],
      [
        "ISO 843, decimal numerals",
        "αβγδ".repeat(12),
        (text: string) =>
          iso.convert(text, "greek", "transliteration", decimal),
      ],
    ] as const
  ) {
    const small = passage.repeat(SMALL);
    const large = passage.repeat(LARGE);
    let ratio = Infinity;
    for (let attempt = 0; attempt < ATTEMPTS && ratio >= MAX_RATIO; attempt++) {
      ratio = Math.min(
        ratio,
        fastest(() => run(large)) / fastest(() => run(small)),
      );
    }
    assertEquals(
      ratio < MAX_RATIO,
      true,
      `${name}: an 8× longer input took ${ratio.toFixed(1)}× as long`,
    );
  }
});

test("a long run of letters is in a numeral as a short one is", () => {
  // isGreekNumeralContext() keeps what it reads of a run longer than 16
  // tokens: the letters asked after the first get the same answer.
  const contextual = { greek: { finalSigma: "contextual" } } as const;
  const symbol = { greek: { medialBeta: "symbol" } } as const;
  for (const length of [4, 20, 40]) {
    assertEquals(
      convert("σ".repeat(length), "greek", "greek", contextual),
      "σ".repeat(length - 1) + "ς",
    );
    assertEquals(
      convert("σ".repeat(length) + "ʹ", "greek", "greek", contextual),
      "σ".repeat(length) + "ʹ",
    );
    assertEquals(
      convert("β".repeat(length), "greek", "greek", symbol),
      "β" + "ϐ".repeat(length - 1),
    );
    assertEquals(
      convert("β".repeat(length) + "ʹ", "greek", "greek", symbol),
      "β".repeat(length) + "ʹ",
    );
  }
  // After a left keraia, a dental and the sigma after it are a numeral.
  assertEquals(
    convert("͵τσ", "greek", "greek", { greek: { dentalSigma: "assimilate" } }),
    "͵τσ",
  );
});
