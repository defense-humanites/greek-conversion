import { assertEquals } from "@std/assert";
import {
  convert,
  convertDetailed,
  reencode,
  removeDiacritics,
} from "../src/mod.ts";
import { stripDiacritics } from "../src/diacritics.ts";
import { grapheme, literal } from "../src/model.ts";
import { assertNfcEquals } from "./assertions.ts";

const WITHOUT_DIACRITICS = { removeDiacritics: true } as const;

Deno.test("removes marks while retaining transliterated rough breathing", () => {
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

Deno.test("removeDiacritics dominates selective preservation", () => {
  const legacyShortcut = {
    removeDiacritics: true,
    diacritics: {
      accents: "preserve",
      roughBreathing: "preserve",
      diaeresis: "preserve",
      iotaSubscript: "preserve",
      quantity: "preserve",
    },
  } as const;

  assertNfcEquals(
    convert("ἄ ἅ ΐ ᾷ ᾱ", "greek", "greek", legacyShortcut),
    "α α ι α α",
  );
});

Deno.test("exposes format-aware diacritic removal as a public helper", () => {
  assertNfcEquals(
    removeDiacritics("ἄνθρωπος· ἀπ’", "greek"),
    "ανθρωπος· απ’",
  );
  assertNfcEquals(
    removeDiacritics("a)/nqrwpos a)=| i& ap'", "beta-code"),
    "anqrwpos a i ap'",
  );
  assertNfcEquals(
    removeDiacritics("hánthrōpos aĩ ī ḳ c̄ s̄", "transliteration"),
    "hanthrōpos ai i ḳ c̄ s̄",
  );
});

Deno.test("removing Greek diacritics retains all source sigma glyphs", () => {
  const input = "λόγος λόγοσ ὅϲοϲ ςόσ";
  assertNfcEquals(
    removeDiacritics(input, "greek"),
    "λογος λογοσ οϲοϲ ςοσ",
  );
  assertNfcEquals(
    removeDiacritics(removeDiacritics(input, "greek"), "greek"),
    "λογος λογοσ οϲοϲ ςοσ",
  );
  assertNfcEquals(
    removeDiacritics("λόγος ὅϲοϲ", "greek", {
      orthography: { sigma: "standard", finalSigma: "medial" },
    }),
    "λογοσ οσοσ",
  );
  assertNfcEquals(
    convert("λόγοσ", "greek", "greek", WITHOUT_DIACRITICS),
    "λογοσ",
  );
  assertNfcEquals(
    convert("ὅϲοϲ", "greek", "greek", WITHOUT_DIACRITICS),
    "οϲοϲ",
  );
  assertEquals(convertDetailed("λόγοσ", "greek", "greek").losses, []);
});

Deno.test("keeps h in transliterated rough breathing and rh", () => {
  const greek = "ὁδός ὀδός ῥυθμός";
  const options = { removeDiacritics: true } as const;

  assertNfcEquals(
    convert(greek, "greek", "greek", options),
    "οδος οδος ρυθμος",
  );
  assertNfcEquals(
    convert(greek, "greek", "beta-code", options),
    "odos odos ruqmos",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", options),
    "hodos odos rhuthmos",
  );
  assertNfcEquals(
    removeDiacritics("hódos odós rhuthmós", "transliteration"),
    "hodos odos rhuthmos",
  );
  assertNfcEquals(
    reencode("hódos-rhuthmós", "transliteration", options),
    "hodos-rhuthmos",
  );
  assertNfcEquals(
    convert("ῥυθμός", "greek", "transliteration", {
      removeDiacritics: true,
      diacritics: { roughBreathing: "remove" },
    }),
    "ruthmos",
  );
});

Deno.test("retains structural marks required to identify letters", () => {
  assertNfcEquals(
    convert("ῆ ῶ ϛ ϡ ϙ", "greek", "transliteration", {
      removeDiacritics: true,
      orthography: { longVowels: "circumflex" },
    }),
    "ê ô ĉ ŝ ḳ",
  );
  assertNfcEquals(
    removeDiacritics("ý", "transliteration", {
      orthography: { upsilon: "y" },
    }),
    "y",
  );
});

Deno.test("removes coronis regardless of its output policy", () => {
  assertNfcEquals(
    convert("κἀγώ", "greek", "transliteration", {
      removeDiacritics: true,
      orthography: { coronis: "apostrophe" },
    }),
    "kagō",
  );
});

Deno.test("selective removal exposes diphthongs canonically on first render", () => {
  const cases = [
    {
      source: "ἄϋλος",
      options: { diacritics: { diaeresis: "remove" } },
      greek: "άὐλος",
      beta: "a/u)los",
    },
    {
      source: "ᾄυ",
      options: { diacritics: { iotaSubscript: "remove" } },
      greek: "άὐ",
      beta: "a/u)",
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
    orthography: { upsilon: "y-with-diphthong-u" },
  } as const;

  assertNfcEquals(
    convert("αϋ αυ", "greek", "transliteration", options),
    "ay au",
  );
});

Deno.test("diacritic removal is immutable", () => {
  const source = [
    literal("["),
    grapheme("alpha", false, ["smooth", "acute"]),
    literal("]"),
  ];
  const stripped = stripDiacritics(source);

  assertEquals(source[1], grapheme("alpha", false, ["smooth", "acute"]));
  assertEquals(stripped[1], grapheme("alpha"));
  assertEquals(stripped === source, false);
  assertEquals(stripDiacritics([grapheme("alpha")])[0], grapheme("alpha"));
});
