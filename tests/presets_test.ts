import { assertEquals } from "@std/assert";
import {
  convert,
  convertDetailed,
  DEFAULT_CONVERSION_OPTIONS,
  getPresetMetadata,
  getPresetOptions,
  listPresetMetadata,
  resolveConversionOptions,
} from "../src/mod.ts";
import { parse } from "../src/document.ts";
import { assertNfcEquals } from "./assertions.ts";

Deno.test("exposes descriptive metadata for every preset", () => {
  assertEquals(listPresetMetadata().map(({ id }) => id), [
    "ala-lc-ancient",
    "ala-lc-modern",
    "bnf-core",
    "iso-843-type-1",
    "perseus",
    "sbl-academic",
    "sbl-general",
    "tlg-core",
  ]);

  assertEquals(getPresetMetadata("ala-lc-ancient"), {
    id: "ala-lc-ancient",
    name: "ALA-LC — Ancient and Medieval Greek",
    authority: "American Library Association and Library of Congress",
    description:
      "Romanization profile for Ancient and Medieval Greek before 1454.",
    scope: ["Ancient Greek", "Medieval Greek before 1454"],
    coverage: "partial",
    outOfScopeBehavior: "engine-default",
    references: [{
      title: "ALA-LC Romanization Tables: Greek (Ancient and Medieval)",
      url: "https://www.loc.gov/catdir/cpso/romanization/greeka.pdf",
    }],
    limitations: [
      "Missing rough breathings are not inferred from lexical knowledge or capitalization.",
      "Iota adscript cannot be distinguished mechanically from an ordinary iota.",
      "Omitted diaeresis is recoverable only in the deterministic contextual y/u cases implemented by the parser.",
      "Stigma, modern koppa, and sampi are documented only as marked numerals; their unmarked engine defaults are outside the ALA-LC table.",
      "Yot is not part of the cited ALA-LC inventory.",
    ],
  });

  assertEquals(getPresetMetadata("perseus"), {
    id: "perseus",
    name: "Perseus Beta Code — Core subset",
    authority: "Perseus Digital Library",
    description:
      "Lowercase-ASCII subset of TLG Beta Code used by the Perseus Digital Library project.",
    scope: ["Polytonic Greek", "Perseus and Morpheus interchange"],
    coverage: "complete",
    outOfScopeBehavior: "engine-default",
    references: [
      {
        title: "The Care and Feeding of Morpheus",
        url:
          "https://github.com/PerseusDL/morpheus/blob/master/doc/morpheus.html",
      },
      {
        title: "Perseids Tools Beta Code JSON mappings",
        url: "https://github.com/perseids-tools/beta-code-json",
      },
      {
        title: "TLG Beta Code Quick Reference Guide",
        url: "https://stephanus.tlg.uci.edu/encoding/quickbeta.pdf",
      },
    ],
    limitations: [
      "The Perseus subset covers letters, accents, breathings, diaeresis, and iota subscript; TLG markup escapes are outside its scope.",
      "The cited Perseids mapping contains the standard alphabet and lunate sigma, but none of the engine's six additional letter entries (digamma, yot, stigma, either koppa, or sampi).",
    ],
  });
});

Deno.test("returns detached preset metadata", () => {
  const first = getPresetMetadata("tlg-core");
  const second = getPresetMetadata("tlg-core");

  (first.scope as string[]).push("Changed scope");
  first.references[0].title = "Changed title";
  (first.limitations as string[]).length = 0;

  assertEquals(second.scope.includes("Changed scope"), false);
  assertEquals(
    second.references[0].title,
    "TLG Beta Code Quick Reference Guide",
  );
  assertEquals(second.limitations.length, 1);
});

Deno.test("resolves custom options after nested preset options", () => {
  const resolved = resolveConversionOptions({
    preset: "ala-lc-modern",
    diacritics: { accents: "preserve" },
    orthography: { beta: "b", letterCase: "uppercase" },
  });

  assertEquals(resolved, {
    ...DEFAULT_CONVERSION_OPTIONS,
    diacritics: {
      ...DEFAULT_CONVERSION_OPTIONS.diacritics,
      smoothBreathing: "remove",
      roughBreathing: "preserve",
      coronis: "remove",
      diaeresis: "remove",
      iotaSubscript: "remove",
      quantity: "remove",
    },
    orthography: {
      ...DEFAULT_CONVERSION_OPTIONS.orthography,
      beta: "b",
      modernDigraphs: "ala-lc",
      numerals: "decimal",
      upsilon: "y-with-diphthong-u",
      letterCase: "uppercase",
    },
  });
});

Deno.test("publishes immutable effective defaults", () => {
  const longVowels: "macron" =
    DEFAULT_CONVERSION_OPTIONS.orthography.longVowels;

  assertEquals(resolveConversionOptions(), DEFAULT_CONVERSION_OPTIONS);
  assertEquals(longVowels, "macron");
  assertEquals(Object.isFrozen(DEFAULT_CONVERSION_OPTIONS), true);
  assertEquals(Object.isFrozen(DEFAULT_CONVERSION_OPTIONS.orthography), true);
  assertEquals(Object.isFrozen(DEFAULT_CONVERSION_OPTIONS.unicode), true);
  assertEquals(Object.isFrozen(DEFAULT_CONVERSION_OPTIONS.diacritics), true);
});

Deno.test("returns detached preset option objects", () => {
  const first = getPresetOptions("ala-lc-modern");
  const second = getPresetOptions("ala-lc-modern");

  first.orthography!.beta = "b";
  assertEquals(second.orthography!.beta, "v");
});

Deno.test("rejects unknown preset names at runtime", () => {
  let error: unknown;
  try {
    resolveConversionOptions({ preset: "unknown" as never });
  } catch (caught) {
    error = caught;
  }

  assertEquals(error instanceof RangeError, true);
  assertEquals((error as Error).message, "Unknown conversion preset: unknown");

  error = undefined;
  try {
    getPresetMetadata("unknown" as never);
  } catch (caught) {
    error = caught;
  }
  assertEquals(error instanceof RangeError, true);
});

Deno.test("applies ISO 843 Type 1 spellings", () => {
  assertNfcEquals(
    convert("βήτα ἄγγελος φύσις κἀγώ", "greek", "transliteration", {
      preset: "iso-843-type-1",
    }),
    "vī́ta ’ággelos fýsis ka’gṓ",
  );
});

Deno.test("ISO and BnF restrict upsilon-u to au, eu, and ou", () => {
  const greek = "υ αυ ευ ου ηυ υι ωυ αϋ άυ";
  assertNfcEquals(
    convert(greek, "greek", "transliteration", {
      preset: "iso-843-type-1",
    }),
    "y au eu ou īy yi ōy aÿ áu",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", { preset: "bnf-core" }),
    "y au eu ou ēy yi ōy aÿ áu",
  );
  for (const preset of ["iso-843-type-1", "bnf-core"] as const) {
    assertNfcEquals(
      convert("au eu ou", "transliteration", "transliteration", { preset }),
      "au eu ou",
    );
    assertEquals(
      convert("a", "transliteration", "transliteration", { preset }),
      "a",
    );
  }
});

Deno.test("BnF renders keraiai only in transliteration and reports their loss", () => {
  const greek = "βʹ ͵αʹ, βʹ";
  const options = { preset: "bnf-core" } as const;
  const result = convertDetailed(greek, "greek", "transliteration", options);

  assertNfcEquals(result.output, "b́ ,á, b́");
  assertEquals(result.lossy, true);
  assertEquals(result.losses.length > 0, true);
  const markedVowel = convertDetailed(
    "αʹ",
    "greek",
    "transliteration",
    options,
  );
  assertEquals(markedVowel.output, "á");
  assertEquals(markedVowel.losses.some(({ index }) => index === 1), true);
  assertEquals(
    convert("αʹ", "greek", "transliteration", options),
    convert("ά", "greek", "transliteration", options),
  );
  assertEquals(
    convert("αʹ", "greek", "transliteration", {
      preset: "bnf-core",
      orthography: { numerals: "decimal" },
    }),
    "1",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", {
      preset: "iso-843-type-1",
    }),
    "vʹ ͵aʹ, vʹ",
  );
  assertNfcEquals(convert(greek, "greek", "greek", options), greek);
  assertNfcEquals(
    convert(greek, "greek", "beta-code", options),
    "b# #22a#, b#",
  );
  assertNfcEquals(
    convert(greek, "greek", "transliteration", {
      preset: "bnf-core",
      orthography: { keraia: "greek" },
    }),
    "bʹ ͵aʹ, bʹ",
  );
});

Deno.test("BnF distinguishes structural length from explicit quantity marks", () => {
  const options = { preset: "bnf-core" } as const;

  assertNfcEquals(
    convert("ἄ ὦ ῆ ᾱ ᾰ ποιῇ", "greek", "transliteration", options),
    "a̓́ ō̓̂ ē̂ a a poiȩ̄̂",
  );
  const etaWithCircumflex = convert(
    "ποιῇ",
    "greek",
    "transliteration",
    options,
  );
  assertEquals(
    convert(etaWithCircumflex, "transliteration", "transliteration", options),
    etaWithCircumflex,
  );
  assertNfcEquals(
    convert("a̓́", "transliteration", "greek", options),
    "ἄ",
  );
  assertNfcEquals(
    convert("ᾱ ᾰ", "greek", "greek", options),
    "ᾱ ᾰ",
  );
  assertNfcEquals(
    convert("ᾱ ᾰ", "greek", "transliteration", {
      preset: "bnf-core",
      orthography: { quantityTransliteration: "preserve" },
    }),
    "ā ă",
  );
  assertEquals(
    convertDetailed("ᾱ", "greek", "transliteration", options).lossy,
    true,
  );
});

Deno.test("ISO Type 1 uses apostrophe and distinct punctuation for cited marks", () => {
  const options = { preset: "iso-843-type-1" } as const;

  assertNfcEquals(
    convert("ἄ αὐ;·", "greek", "transliteration", options),
    "’á ’au?;",
  );
  assertNfcEquals(
    convert("ἄ;·", "greek", "transliteration", {
      preset: "bnf-core",
    }),
    "a̓́?;",
  );
  assertEquals(convert(";·", "greek", "transliteration", options), "?;");
});

Deno.test("applies ancient ALA-LC policies without inferring breathings", () => {
  assertNfcEquals(
    convert(
      "Ἡσίοδου ἄϋλος υἱός κἀγώ βʹ",
      "greek",
      "transliteration",
      { preset: "ala-lc-ancient" },
    ),
    "Hēsiodou aylos huios kagō 2",
  );
});

Deno.test("contextual y retains an omitted diaeresis semantically", () => {
  const options = { preset: "ala-lc-ancient" } as const;
  const once = convert("ἄϋλος", "greek", "transliteration", options);

  assertEquals(once, "aylos");
  assertEquals(
    convert(once, "transliteration", "transliteration", options),
    once,
  );
  const reparsed = parse(once, "transliteration", options);
  assertEquals(reparsed[1].kind, "grapheme");
  if (reparsed[1].kind === "grapheme") {
    assertEquals(reparsed[1].diacritics.has("diaeresis"), true);
  }
});

Deno.test("applies modern ALA-LC contextual spellings", () => {
  assertNfcEquals(
    convert(
      "Βίος Μπάλα ΝΤΟ αγκά αγκ βʹ",
      "greek",
      "transliteration",
      { preset: "ala-lc-modern" },
    ),
    "Vios Bala D̲O anka agk 2",
  );
});

Deno.test("distinguishes academic and general SBL diacritics", () => {
  assertNfcEquals(
    convert("ἄϋλος ὑιός", "greek", "transliteration", {
      preset: "sbl-academic",
    }),
    "áÿlos huiós",
  );
  assertNfcEquals(
    convert("ἄϋλος ὑιός", "greek", "transliteration", {
      preset: "sbl-general",
    }),
    "aÿlos huios",
  );
});

Deno.test("core presets remain conservative and mixable", () => {
  assertNfcEquals(
    convert("ϲοϲ", "greek", "beta-code", { preset: "tlg-core" }),
    "SOS",
  );
  assertNfcEquals(
    convert("κἀγώ", "greek", "transliteration", {
      preset: "bnf-core",
      orthography: { coronis: "greek" },
    }),
    "ka᾽gṓ",
  );
  assertNfcEquals(
    convert("ϟϙ", "greek", "transliteration", { preset: "bnf-core" }),
    "qq",
  );
  assertNfcEquals(
    convert("ϳ", "greek", "beta-code", { preset: "tlg-core" }),
    "#401",
  );
  assertNfcEquals(
    convert("ϙ", "greek", "transliteration", {
      preset: "bnf-core",
      orthography: { archaicKoppa: "k-dot-below" },
    }),
    "ḳ",
  );
  assertNfcEquals(
    convert("ϳ", "greek", "beta-code", {
      preset: "tlg-core",
      orthography: { yotBetaCode: "j" },
    }),
    "J",
  );
});

Deno.test("Perseus emits lowercase Beta Code", () => {
  assertNfcEquals(
    convert("Ἄνθρωπος", "greek", "beta-code", { preset: "perseus" }),
    "*)/anqrwpos",
  );
});

Deno.test("convertDetailed reports losses introduced by presets", () => {
  const result = convertDetailed(
    "ἄνθρωπος",
    "greek",
    "transliteration",
    { preset: "ala-lc-ancient" },
  );

  assertEquals(result.lossy, true);
  assertEquals(
    result.losses.map((loss) => loss.code),
    ["removed-diacritic"],
  );

  const bnfKoppa = convertDetailed(
    "ϙ",
    "greek",
    "transliteration",
    { preset: "bnf-core" },
  );
  assertEquals(bnfKoppa.output, "q");
  assertEquals(bnfKoppa.losses.map((loss) => loss.code), [
    "unrepresented-grapheme",
  ]);
});
