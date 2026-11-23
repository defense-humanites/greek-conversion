import { test } from "node:test";
import { assert, assertEquals } from "./assertions.ts";
import {
  type ConversionOptions,
  convert,
  type Format,
  listPresetMetadata,
} from "../src/mod.ts";
import * as core from "../src/core.ts";
import { betaCodeReader, betaCodeWriter } from "../src/formats/beta_code.ts";
import { greekReader, greekWriter } from "../src/formats/greek.ts";
import {
  transliterationReader,
  transliterationWriter,
} from "../src/formats/transliteration.ts";
import { resolveConversionOptions } from "../src/presets.ts";
import { perProfile, sealProfile } from "../src/profile_cache.ts";

/**
 * What a writer derives from its profile is kept across calls for the
 * profiles that the library freezes whole (`src/profile_cache.ts`): those
 * shared by conversions and those of prepared options. A value kept for one
 * profile must never reach a conversion with another, nor a value derived
 * from options that may change between calls.
 */

// Marks of every class, capitals with an iota subscript, overlines, and a
// ligature that Beta Code writes with the marks of its last letter.
const GREEK = "ᾌδης ἀνὴρ ᾠδῇ Ὦ ῥήτωρ ϗ καὶ θ̅ς̅ Χ̅Σ̅ ἆ̆ ϊ ᾱ̓ Ἇ ᾯ ὅ̅ ν̅ῦ̅";
const FORMATS: readonly Format[] = ["greek", "beta-code", "transliteration"];
const PRESETS = listPresetMetadata().map(({ id }) => id);

// Each form of options twice: the form that conversions share, and one with
// an empty group, which is resolved at each call and shares nothing.
const SHARED: readonly (ConversionOptions | undefined)[] = [
  undefined,
  ...PRESETS.map((preset) => ({ preset })),
];
const unshared = (options: ConversionOptions | undefined) => ({
  ...options,
  text: {},
});

test("profiles that share their marks never mix them", () => {
  for (const from of FORMATS) {
    const input = from === "greek" ? GREEK : convert(GREEK, "greek", from);
    for (const to of FORMATS) {
      const expected = SHARED.map((options) =>
        convert(input, from, to, unshared(options))
      );
      // Every profile after every other, in both orders: a set of marks
      // first seen with one profile is seen again with the next.
      for (const order of [SHARED, [...SHARED].reverse()]) {
        for (let round = 0; round < 2; round++) {
          order.forEach((options) => {
            assertEquals(
              convert(input, from, to, options),
              expected[SHARED.indexOf(options)],
              `${from} → ${to}, ${options?.preset ?? "defaults"}`,
            );
          });
        }
      }
    }
  }
});

test("profiles that write other marks write them in turn", () => {
  // Outputs written by 1.0.0-rc.12, which kept nothing across calls: they
  // would not catch a cache shared by every profile otherwise, which the
  // outputs compared above would share too.
  const text = "ᾌδης ἀνὴρ ᾠδῇ θ̅ς̅ ἆ̆";
  const variants: (ConversionOptions | undefined)[] = [
    undefined,
    { diacritics: { accents: "remove" } },
    { diacritics: { all: "remove", roughBreathing: "preserve" } },
    { diacritics: { overline: "remove", iotaSubscript: "remove" } },
    { preset: "sbl-general" },
  ];
  const expected: Record<Format, string[]> = {
    "greek": [
      "ᾌδης ἀνὴρ ᾠδῇ θ̅ς̅ ᾰ̓͂",
      "ᾈδης ἀνηρ ᾠδῃ θ̅ς̅ ᾰ̓",
      "Αδης ανηρ ωδη θς α",
      "Ἄδης ἀνὴρ ὠδῆ θς ᾰ̓͂",
      "Αδης ανηρ ωδη θς α",
    ],
    "beta-code": [
      "*)/a|dhs a)nh\\r w)|dh=| <qs> a)=%27",
      "*)a|dhs a)nhr w)|dh| <qs> a)%27",
      "*adhs anhr wdh qs a",
      "*)/adhs a)nh\\r w)dh= qs a)=%27",
      "*adhs anhr wdh qs a",
    ],
    "transliteration": [
      "Á̧dēs anḕr ō̧dȩ̄̃ th̅s̅ ẵ",
      "A̧dēs anēr ō̧dȩ̄ th̅s̅ ă",
      "Adēs anēr ōdē ths a",
      "Ádēs anḕr ōdē̃ ths ẵ",
      "Adēs anēr ōdē ths a",
    ],
  };
  const prepared = variants.map((options) => core.prepareOptions(options));
  const writers = {
    "greek": greekWriter,
    "beta-code": betaCodeWriter,
    "transliteration": transliterationWriter,
  } as const;
  for (let round = 0; round < 2; round++) {
    for (const to of FORMATS) {
      variants.forEach((options, index) => {
        assertEquals(convert(text, "greek", to, options), expected[to][index]);
        assertEquals(
          core.convert(text, greekReader, writers[to], prepared[index]),
          expected[to][index],
        );
      });
    }
  }
});

test("prepared options keep their marks apart", () => {
  const handles = {
    "greek": [greekReader, greekWriter],
    "beta-code": [betaCodeReader, betaCodeWriter],
    "transliteration": [transliterationReader, transliterationWriter],
  } as const;
  const variants: ConversionOptions[] = [
    {},
    { diacritics: { accents: "remove" } },
    { diacritics: { all: "remove", roughBreathing: "preserve" } },
    { diacritics: { overline: "remove", iotaSubscript: "remove" } },
    { transliteration: { quantity: "omit" } },
  ];
  const prepared = variants.map((options) => core.prepareOptions(options));
  for (const to of FORMATS) {
    for (let round = 0; round < 2; round++) {
      variants.forEach((options, index) => {
        assertEquals(
          core.convert(
            GREEK,
            handles.greek[0],
            handles[to][1],
            prepared[index],
          ),
          convert(GREEK, "greek", to, options),
          `greek → ${to}, ${JSON.stringify(options)}`,
        );
      });
    }
  }
});

test("options changed between calls are read anew", () => {
  const options = {
    diacritics: { accents: "preserve" as "preserve" | "remove" },
  };
  const text = "ἀνὴρ";
  for (const to of FORMATS) {
    const kept = convert(text, "greek", to, options);
    options.diacritics.accents = "remove";
    const removed = convert(text, "greek", to, options);
    options.diacritics.accents = "preserve";
    assert(kept !== removed, `greek → ${to}`);
    assertEquals(convert(text, "greek", to, options), kept);
  }
});

test("Beta Code writes overlines with marks already coded", () => {
  // Each text is converted after another whose letters bear the same marks:
  // the codes of the marks come from the cache, and the overline must still
  // be written around the letters. Small letters, capitals alone, and a
  // ligature, which writes the marks of its last letter, each note the
  // overline on their own path. Outputs of 1.0.0-rc.12.
  const cases: [string, string][] = [
    ["θ̅ς̅", "<qs>"],
    ["Χ̅Σ̅", "<*x*s>"],
    ["ϗ̅", "<#1532>"],
    ["θ̅ς̅ Χ̅Σ̅", "<qs> <*x*s>"],
  ];
  for (let round = 0; round < 3; round++) {
    for (const [text, expected] of cases) {
      convert("ν̅", "greek", "beta-code");
      assertEquals(convert(text, "greek", "beta-code"), expected, text);
    }
  }
});

test("a profile keeps the marks of each format apart", () => {
  // One profile writes the three formats in turn. BnF and an omitted
  // quantity drop in transliteration the marks of quantity that Greek and
  // Beta Code keep; and where both keep a long vowel's marks (`κῑ́` by
  // default), Beta Code writes the accent first and transliteration the
  // length. A mask or a cache of marks shared by two formats would write
  // the marks of one in another. Outputs of 1.0.0-rc.12.
  const text = "ἄ ὦ ῆ ᾱ ᾰ ποιῇ ἅ ϊ ὕ ᾷ ᾱ̓́ κῑ́ θ̅";
  const writers = {
    "transliteration": transliterationWriter,
    "greek": greekWriter,
    "beta-code": betaCodeWriter,
  } as const;
  const cases: [ConversionOptions, Record<Format, string>][] = [
    [
      {},
      {
        "transliteration": "á ō̃ ē̃ ā ă poiȩ̄̃ há ï hý ã̧ ā́ kī́ th̅",
        "greek": "ἄ ὦ ῆ ᾱ ᾰ ποιῇ ἅ ϊ ὕ ᾷ ᾱ̓́ κῑ́ θ̅",
        "beta-code":
          "a)/ w)= h= a%26 a%27 poih=| a(/ i+ u(/ a=| a)/%26 ki/%26 <q>",
      },
    ],
    [
      { preset: "bnf-core" },
      {
        "transliteration": "a̓́ ō̓̂ ē̂ a a poiȩ̄̂ há ï hý â̧ a̓́ kí th̅",
        "greek": "ἄ ὦ ῆ ᾱ ᾰ ποιῇ ἅ ϊ ὕ ᾷ ᾱ̓́ κῑ́ θ̅",
        "beta-code":
          "a)/ w)= h= a%26 a%27 poih=| a(/ i+ u(/ a=| a)/%26 ki/%26 <q>",
      },
    ],
    [
      { transliteration: { quantity: "omit" } },
      {
        "transliteration": "á ō̃ ē̃ a a poiȩ̄̃ há ï hý ã̧ á kí th̅",
        "greek": "ἄ ὦ ῆ ᾱ ᾰ ποιῇ ἅ ϊ ὕ ᾷ ᾱ̓́ κῑ́ θ̅",
        "beta-code":
          "a)/ w)= h= a%26 a%27 poih=| a(/ i+ u(/ a=| a)/%26 ki/%26 <q>",
      },
    ],
  ];
  for (const [options, outputs] of cases) {
    const prepared = core.prepareOptions(options);
    for (const order of [FORMATS, [...FORMATS].reverse()]) {
      for (let round = 0; round < 2; round++) {
        for (const format of order) {
          assertEquals(
            convert(text, "greek", format, options),
            outputs[format],
            `${JSON.stringify(options)} → ${format}`,
          );
          assertEquals(
            core.convert(text, greekReader, writers[format], prepared),
            outputs[format],
            `prepared ${JSON.stringify(options)} → ${format}`,
          );
        }
      }
    }
  }
});

test("only sealed profiles keep what is derived from them", () => {
  let computed = 0;
  const derive = perProfile(() => ++computed);
  const sealed = sealProfile(resolveConversionOptions({}));
  assertEquals(derive(sealed), 1);
  assertEquals(derive(sealed), 1);
  // Frozen by its owner, whose groups may still change: not kept.
  const frozen = Object.freeze(resolveConversionOptions({}));
  assertEquals(derive(frozen), 2);
  assertEquals(derive(frozen), 3);
  assert(Object.isFrozen(sealed) && Object.isFrozen(sealed.diacritics));
});
