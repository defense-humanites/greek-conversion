import { assertEquals } from "@std/assert";
import { type ConversionOptions, convert, type Format } from "../src/mod.ts";
import { EQUIVALENCES, FORMATS, valueFor } from "./fixtures.ts";

interface OptionProfile {
  name: string;
  options: ConversionOptions;
}

const PROFILES = [
  { name: "defaults", options: {} },
  { name: "without diacritics", options: { removeDiacritics: true } },
  {
    name: "without accents",
    options: { diacritics: { accents: "remove" } },
  },
  {
    name: "without smooth breathing",
    options: { diacritics: { smoothBreathing: "remove" } },
  },
  {
    name: "without rough breathing",
    options: { diacritics: { roughBreathing: "remove" } },
  },
  {
    name: "without coronis",
    options: { diacritics: { coronis: "remove" } },
  },
  {
    name: "without diaeresis",
    options: { diacritics: { diaeresis: "remove" } },
  },
  {
    name: "without iota subscript",
    options: { diacritics: { iotaSubscript: "remove" } },
  },
  {
    name: "without quantity",
    options: { diacritics: { quantity: "remove" } },
  },
  {
    name: "selective diacritics",
    options: {
      diacritics: {
        accents: "remove",
        smoothBreathing: "remove",
        coronis: "remove",
        iotaSubscript: "remove",
        quantity: "remove",
      },
    },
  },
  {
    name: "lowercase output",
    options: { orthography: { letterCase: "lowercase" } },
  },
  {
    name: "uppercase output",
    options: { orthography: { letterCase: "uppercase" } },
  },
  {
    name: "title-case output",
    options: { orthography: { letterCase: "title" } },
  },
  {
    name: "circumflex long vowels and contextual upsilon",
    options: {
      orthography: {
        longVowels: "circumflex",
        upsilon: "y-with-diphthong-u",
      },
    },
  },
  {
    name: "circumflex long vowels and universal y",
    options: {
      orthography: {
        longVowels: "circumflex",
        upsilon: "y",
      },
    },
  },
  {
    name: "Greek glyph policies",
    options: {
      orthography: {
        doubleRho: "smooth-rough",
        medialBeta: "symbol",
        sigma: "lunate",
      },
    },
  },
  {
    name: "uniform medial final sigma",
    options: { orthography: { finalSigma: "medial" } },
  },
  {
    name: "literal transliteration policies",
    options: {
      orthography: {
        coronis: "apostrophe",
        nasalGamma: "literal",
        upsilon: "y",
      },
    },
  },
  {
    name: "semantic Greek coronis transliteration",
    options: { orthography: { coronis: "greek" } },
  },
  {
    name: "lossy output policies",
    options: {
      removeDiacritics: true,
      orthography: {
        dentalSigma: "assimilate",
        numerals: "decimal",
      },
    },
  },
  {
    name: "monotonic Greek with system acute",
    options: {
      orthography: { accentuation: "monotonic" },
    },
  },
  {
    name: "modern transliteration variants",
    options: {
      orthography: {
        beta: "v",
        chi: "kh",
        eta: "i",
        muPi: "b-initial",
        nuTau: "d-initial",
        phi: "f",
        rho: "systematic",
        upsilon: "y",
        whitespace: "collapse",
        xi: "ks",
      },
    },
  },
  {
    name: "ALA-LC modern digraphs",
    options: {
      orthography: {
        beta: "v",
        muPi: "b-initial",
        nasalGamma: "nasal-medial-kappa",
        nuTau: "d-underline-initial",
      },
    },
  },
  {
    name: "decomposed Greek with forced punctuation",
    options: {
      unicode: {
        composition: "decomposed",
        acute: "oxia",
        questionMark: "greek",
        anoTeleia: "greek",
      },
    },
  },
  { name: "ISO 843 Type 1 preset", options: { preset: "iso-843-type-1" } },
  { name: "ancient ALA-LC preset", options: { preset: "ala-lc-ancient" } },
  { name: "modern ALA-LC preset", options: { preset: "ala-lc-modern" } },
  { name: "academic SBL preset", options: { preset: "sbl-academic" } },
  { name: "general SBL preset", options: { preset: "sbl-general" } },
  { name: "TLG core preset", options: { preset: "tlg-core" } },
  { name: "BnF core preset", options: { preset: "bnf-core" } },
] as const satisfies readonly OptionProfile[];

function assertStable(
  source: string,
  from: Format,
  to: Format,
  profile: OptionProfile,
): void {
  const once = convert(source, from, to, profile.options);
  const twice = convert(once, to, to, profile.options);

  assertEquals(
    twice,
    once,
    `${profile.name}: ${from} → ${to} output must be idempotent`,
  );
}

Deno.test("canonical outputs are idempotent for every format pair", () => {
  for (const equivalence of EQUIVALENCES) {
    for (const from of FORMATS) {
      for (const to of FORMATS) {
        const source = valueFor(equivalence, from);
        for (const profile of PROFILES) {
          assertStable(source, from, to, profile);
        }
      }
    }
  }
});

Deno.test("pathological Unicode remains stable under self-conversion", () => {
  const cases = [
    {
      format: "greek",
      source: "ἅ\u200Dσ\u0323—κἀγώ 😀",
    },
    {
      format: "beta-code",
      source: "a(/\u200Ds\u0323-ka)gw/ 😀",
    },
    {
      format: "transliteration",
      source: "há\u200Ds\u0323—ka’gṓ 😀",
    },
  ] as const satisfies readonly { format: Format; source: string }[];

  for (const { format, source } of cases) {
    for (const profile of PROFILES) {
      assertStable(source, format, format, profile);
    }
  }
});

Deno.test("context-changing diacritic policies are stable for every target", () => {
  const cases = [
    {
      source: "ἄϋλος",
      options: { diacritics: { diaeresis: "remove" } },
    },
    {
      source: "ᾄυ",
      options: { diacritics: { iotaSubscript: "remove" } },
    },
  ] as const satisfies readonly {
    source: string;
    options: ConversionOptions;
  }[];

  for (const testCase of cases) {
    for (const to of FORMATS) {
      assertStable(testCase.source, "greek", to, {
        name: `${to} after selective removal`,
        options: testCase.options,
      });
    }
  }
});

Deno.test("Greek coronis provenance is stable for every target", () => {
  const profile = {
    name: "semantic Greek coronis transliteration",
    options: { orthography: { coronis: "greek" } },
  } as const satisfies OptionProfile;

  for (const to of FORMATS) {
    assertStable("κἀγώ", "greek", to, profile);
  }
});
