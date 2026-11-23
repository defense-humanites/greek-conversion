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

test("the transliteration reader keeps the spellings of each profile", () => {
  // Spellings that options add or replace, which the reader reads with a
  // trie of their own: `v` for beta and `f` for phi (ISO 843, ALA-LC for
  // modern Greek), `ks` and `kh` for xi and chi. A trie kept for one profile
  // would read them under another.
  const text = "Ví fos phos ksénos khóra aftós";
  const variants: ConversionOptions[] = [
    {},
    { preset: "iso-843-type-1" },
    { preset: "ala-lc-modern" },
    { preset: "iso-843-type-2" },
    { transliteration: { xi: "ks", chi: "kh" } },
  ];
  // Outputs written by 1.0.0-rc.12, which kept nothing across calls:
  // computed here, they would share a fault of the cache. ISO 843 Type 1 and
  // Type 2 read these spellings alike.
  const expected = [
    "Vἴ fὀς φος κσένος κὅρα ἀfτός",
    "Βί φος πὁς κσένος κὅρα αφτός",
    "Βι fος φος κσενος κὁρα αfτος",
    "Βί φος πὁς κσένος κὅρα αφτός",
    "Vἴ fὀς φος ξένος χόρα ἀfτός",
  ];
  for (const options of variants) {
    assertEquals(
      convert(text, "transliteration", "greek", unshared(options)),
      expected[variants.indexOf(options)],
    );
  }
  const prepared = variants.map((options) => core.prepareOptions(options));
  for (const order of [variants, [...variants].reverse()]) {
    for (let round = 0; round < 2; round++) {
      order.forEach((options) => {
        const index = variants.indexOf(options);
        assertEquals(
          convert(text, "transliteration", "greek", options),
          expected[index],
          JSON.stringify(options),
        );
        assertEquals(
          core.convert(
            text,
            transliterationReader,
            greekWriter,
            prepared[index],
          ),
          expected[index],
          `prepared ${JSON.stringify(options)}`,
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
  // The second call finds the codes of the marks kept by the first: the
  // overline must still be written around the letters.
  for (let round = 0; round < 3; round++) {
    assertEquals(convert("θ̅ς̅ Χ̅Σ̅", "greek", "beta-code"), "<qs> <*x*s>");
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
