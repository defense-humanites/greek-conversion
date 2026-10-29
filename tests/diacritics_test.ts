import { assertEquals } from "@std/assert";
import {
  convert,
  convertDetailed,
  reencode,
  resolveConversionOptions,
} from "../src/mod.ts";
import { assertNfcEquals } from "./assertions.ts";

/** Every class removed, the rough breathing's `h` included. */
const WITHOUT_DIACRITICS = { diacritics: { all: "remove" } } as const;
/** The recipe that keeps the `h`: the class is the exception to `all`. */
const WITHOUT_MARKS = {
  diacritics: { all: "remove", roughBreathing: "preserve" },
} as const;
/** The recipe that changes nothing but the marks in Greek. */
const KEEP_SIGMA_SHAPES = {
  greek: { sigma: "preserve", finalSigma: "preserve" },
} as const;

Deno.test("diacritics.all removes every class in every format", () => {
  const greek = "ἄνθρωπος ᾆ ῑ";

  assertNfcEquals(
    convert(greek, "greek", "greek", WITHOUT_DIACRITICS),
    "ανθρωπος α ι",
  );
  assertNfcEquals(
    convert(greek, "greek", "beta-code", WITHOUT_DIACRITICS),
    "anqrwpos a i",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", WITHOUT_DIACRITICS),
    "anthrōpos a i",
  );
});

Deno.test("diacritics.all is expanded where it is written", () => {
  // The caller's shorthand overrides every class a preset set.
  assertEquals(
    resolveConversionOptions({ preset: "sbl-general", ...WITHOUT_DIACRITICS })
      .diacritics,
    {
      accents: "remove",
      smoothBreathing: "remove",
      roughBreathing: "remove",
      coronis: "remove",
      diaeresis: "remove",
      iotaSubscript: "remove",
      quantity: "remove",
    },
  );
  // A class named alongside it is the exception, and a preset's classes
  // survive a caller who names classes only.
  assertEquals(
    resolveConversionOptions({
      preset: "sbl-general",
      diacritics: { accents: "preserve" },
    }).diacritics,
    {
      accents: "preserve",
      smoothBreathing: "remove",
      roughBreathing: "preserve",
      coronis: "remove",
      diaeresis: "preserve",
      iotaSubscript: "remove",
      quantity: "remove",
    },
  );
  assertEquals(
    resolveConversionOptions({ diacritics: { all: "preserve" } }).diacritics,
    resolveConversionOptions().diacritics,
  );
});

Deno.test("selects semantic diacritic classes independently", () => {
  const selective = {
    diacritics: {
      accents: "remove",
      smoothBreathing: "remove",
      roughBreathing: "preserve",
      coronis: "remove",
      diaeresis: "preserve",
      iotaSubscript: "remove",
      quantity: "remove",
    },
  } as const;
  const greek = "ἄ ἅ κἀ ΐ ᾷ ᾱ ῐ";

  assertNfcEquals(
    convert(greek, "greek", "greek", selective),
    "α ἁ κα ϊ α α ι",
  );
  assertNfcEquals(
    convert(greek, "greek", "beta-code", selective),
    "a a( ka i+ a a i",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", selective),
    "a ha ka ï a a i",
  );
});

Deno.test("preserves unspecified diacritic classes by default", () => {
  const accentsOnly = {
    diacritics: { accents: "remove" },
  } as const;

  assertNfcEquals(
    convert("ἄ ἅ κἀ ΐ ᾷ ᾱ ῐ", "greek", "greek", accentsOnly),
    "ἀ ἁ κἀ ϊ ᾳ ᾱ ῐ",
  );
});

Deno.test("a class named alongside all is the exception, not the rule", () => {
  // The old shortcut `removeDiacritics: true` removed every class whatever
  // the classes said; `all` yields to the classes named with it.
  const exceptions = {
    diacritics: {
      all: "remove",
      accents: "preserve",
      roughBreathing: "preserve",
      diaeresis: "preserve",
      iotaSubscript: "preserve",
      quantity: "preserve",
    },
  } as const;

  assertNfcEquals(
    convert("ἄ ἅ ΐ ᾷ ᾱ", "greek", "greek", exceptions),
    "ά ἅ ΐ ᾷ ᾱ",
  );
  // A class set to `undefined` is absent, not an exception.
  const absent = {
    diacritics: {
      all: "remove",
      accents: undefined,
      roughBreathing: undefined,
    },
  } as const;
  assertEquals(
    resolveConversionOptions(absent).diacritics,
    resolveConversionOptions(WITHOUT_DIACRITICS).diacritics,
  );
  assertNfcEquals(convert("ἄ ἅ ΐ ᾷ ᾱ", "greek", "greek", absent), "α α ι α α");
});

Deno.test("removes the marks of every format with one recipe", () => {
  assertNfcEquals(
    reencode("ἄνθρωπος· ἀπ’", "greek", WITHOUT_MARKS),
    "ανθρωπος· απ’",
  );
  assertNfcEquals(
    reencode("a)/nqrwpos a)=| i& ap'", "beta-code", WITHOUT_MARKS),
    "anqrwpos a i ap'",
  );
  assertNfcEquals(
    reencode("hánthrōpos aĩ ī ḳ c̄ s̄", "transliteration", WITHOUT_MARKS),
    "hanthrōpos ai i ḳ c̄ s̄",
  );
});

Deno.test("removing Greek diacritics changes sigma shapes unless asked not to", () => {
  const input = "λόγος λόγοσ ὅϲοϲ ςόσ";
  // Removing the marks alone: the recipe keeps every source sigma shape.
  const marksOnly = { ...WITHOUT_DIACRITICS, ...KEEP_SIGMA_SHAPES };
  assertNfcEquals(
    convert(input, "greek", "greek", marksOnly),
    "λογος λογοσ οϲοϲ ςοσ",
  );
  assertNfcEquals(
    convert(
      convert(input, "greek", "greek", marksOnly),
      "greek",
      "greek",
      marksOnly,
    ),
    "λογος λογοσ οϲοϲ ςοσ",
  );
  // Without the recipe the default sigma policies apply as in any conversion.
  assertNfcEquals(
    convert(input, "greek", "greek", WITHOUT_DIACRITICS),
    "λογος λογος οσος σος",
  );
  assertNfcEquals(
    convert("λόγος ὅϲοϲ", "greek", "greek", {
      ...WITHOUT_DIACRITICS,
      greek: { sigma: "standard", finalSigma: "medial" },
    }),
    "λογοσ οσοσ",
  );
  assertEquals(convertDetailed("λόγοσ", "greek", "greek").losses, []);
});

Deno.test("the rough breathing's h goes with its class", () => {
  const greek = "ὁδός ὀδός ῥυθμός";

  // The class is the same in every format: kept, it is a mark in Greek and
  // Beta Code and a letter in transliteration.
  assertNfcEquals(
    convert(greek, "greek", "greek", WITHOUT_MARKS),
    "ὁδος οδος ῥυθμος",
  );
  assertNfcEquals(
    convert(greek, "greek", "beta-code", WITHOUT_MARKS),
    "o(dos odos r(uqmos",
  );
  assertNfcEquals(
    convert(greek, "greek", "greek", WITHOUT_DIACRITICS),
    "οδος οδος ρυθμος",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", WITHOUT_MARKS),
    "hodos odos rhythmos",
  );
  assertNfcEquals(
    reencode("hódos odós rhythmós", "transliteration", WITHOUT_MARKS),
    "hodos odos rhythmos",
  );
  assertNfcEquals(
    reencode("hódos-rhythmós", "transliteration", WITHOUT_MARKS),
    "hodos-rhythmos",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", WITHOUT_DIACRITICS),
    "odos odos rythmos",
  );
});

Deno.test("retains structural marks required to identify letters", () => {
  assertNfcEquals(
    convert("ῆ ῶ ϛ ϡ ϙ", "greek", "transliteration", {
      ...WITHOUT_DIACRITICS,
      transliteration: { longVowels: "circumflex" },
    }),
    "ê ô ĉ ŝ ḳ",
  );
  assertNfcEquals(
    reencode("ý", "transliteration", {
      ...WITHOUT_DIACRITICS,
      transliteration: { upsilon: "y" },
    }),
    "y",
  );
});

Deno.test("removes coronis regardless of its output policy", () => {
  assertNfcEquals(
    convert("κἀγώ", "greek", "transliteration", {
      ...WITHOUT_DIACRITICS,
      transliteration: { coronis: "apostrophe" },
    }),
    "kagō",
  );
});

Deno.test("selective removal keeps hiatus marks on the first vowel", () => {
  // Removing a diaeresis or an iota subscript does not turn the pair into a
  // diphthong while the first vowel still carries a breathing or accent.
  const cases = [
    {
      source: "ἄϋλος",
      options: { diacritics: { diaeresis: "remove" } },
      greek: "ἄυλος",
      beta: "a)/ulos",
    },
    {
      source: "ᾄυ",
      options: { diacritics: { iotaSubscript: "remove" } },
      greek: "ἄυ",
      beta: "a)/u",
    },
  ] as const;

  for (const testCase of cases) {
    const greek = convert(
      testCase.source,
      "greek",
      "greek",
      testCase.options,
    );
    const beta = convert(
      testCase.source,
      "greek",
      "beta-code",
      testCase.options,
    );

    assertNfcEquals(greek, testCase.greek);
    assertNfcEquals(beta, testCase.beta);
    assertNfcEquals(
      convert(greek, "greek", "greek", testCase.options),
      greek,
    );
    assertNfcEquals(
      convert(beta, "beta-code", "beta-code", testCase.options),
      beta,
    );
  }
});

Deno.test("render-only diacritic removal preserves semantic diphthong choices", () => {
  const options = {
    diacritics: { diaeresis: "remove" },
    transliteration: { upsilon: "y-with-diphthong-u" },
  } as const;

  assertNfcEquals(
    convert("αϋ αυ", "greek", "transliteration", options),
    "ay au",
  );
});
