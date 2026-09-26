import { assertEquals } from "@std/assert";
import { convert, convertDetailed } from "../src/mod.ts";
import { assertNfcEquals } from "./assertions.ts";

// Published ALA-LC ancient and modern tables: see docs/ala-lc-conformance-corpus.md.
const CASES = [
  {
    preset: "ala-lc-ancient",
    rule: "examples: Homer's Iliad and omitted marks",
    greek: "Ἡ τοῦ Ὁμήρου Ἰλιάς",
    latin: "Hē tou Homērou Ilias",
    lossy: true,
  },
  {
    preset: "ala-lc-ancient",
    rule: "examples: phi, eta, and rough breathing",
    greek: "Φίληβος ἢ Περὶ ἡδονῆς",
    latin: "Philēbos ē Peri hēdonēs",
    lossy: true,
  },
  {
    preset: "ala-lc-ancient",
    rule: "examples: rough breathing after rho",
    greek: "Αἴτια Ῥωμαϊκά",
    latin: "Aitia Rhōmaika",
    lossy: true,
  },
  {
    preset: "ala-lc-ancient",
    rule: "examples: omitted diaeresis and contextual upsilon",
    greek: "ἀΰπνους νύκτας ἴαυον",
    latin: "aypnous nyktas iauon",
    lossy: true,
  },
  {
    preset: "ala-lc-ancient",
    rule: "examples: initial rough breathing and diphthongs",
    greek: "Λητοῦς καὶ Διὸς υἱός",
    latin: "Lētous kai Dios huios",
    lossy: true,
  },
  {
    preset: "ala-lc-ancient",
    rule: "examples: digamma and lunate sigma",
    greek: "ἄλαϲτα δὲ ϝέργα",
    latin: "alasta de werga",
    lossy: true,
  },
  {
    preset: "ala-lc-ancient",
    rule: "alphabet: nasal gamma and archaic koppa",
    greek: "γγ γκ γξ γχ ϙ",
    latin: "ng nk nx nch ḳ",
    lossy: false,
  },
  {
    preset: "ala-lc-modern",
    rule: "alphabet: beta, eta, phi, and upsilon pairs",
    greek: "βηφ ω υ αυ ηυ υι ωυ",
    latin: "vēph ō y au ēu ui ōu",
    lossy: false,
  },
  {
    preset: "ala-lc-modern",
    rule: "alphabet: initial, medial, and final digraph positions",
    greek: "μπ αμπ αμπα ντ αντ αντα γκ αγκ αγκα γγ γξ γχ",
    latin: "b amp ampa d̲ ant anta gk agk anka ng nx nch",
    lossy: false,
  },
  {
    preset: "ala-lc-modern",
    rule: "notes: rho takes h only with a source rough breathing",
    greek: "Ῥ ῥ Ρ ρ",
    latin: "Rh rh R r",
    lossy: false,
  },
  {
    preset: "ala-lc-modern",
    rule: "notes: accents, quantity, diaeresis, and subscript omitted",
    greek: "ά ᾱ αϋ ᾳ",
    latin: "a a ay a",
    lossy: true,
  },
  {
    preset: "ala-lc-modern",
    rule: "numerals: six and ninety variants and unmarked thousands",
    greek: "ϝʹ ϛʹ στʹ ϙʹ ϟʹ ϡʹ ͵α ͵αα ͵αβ",
    latin: "6 6 6 90 90 900 1000 1001 1002",
    lossy: true,
  },
] as const;

for (const { preset, rule, greek, latin, lossy } of CASES) {
  Deno.test(`${preset}: ${rule}`, () => {
    const options = { preset };
    const result = convertDetailed(greek, "greek", "transliteration", options);
    assertNfcEquals(result.output, latin);
    assertEquals(result.lossy, lossy);
    assertNfcEquals(
      convert(result.output, "transliteration", "transliteration", options),
      latin,
    );
  });
}

Deno.test("ALA-LC thousands and six variants apply in both presets", () => {
  for (const preset of ["ala-lc-ancient", "ala-lc-modern"] as const) {
    assertEquals(
      convert("͵α ͵αα ͵αβ στʹ", "greek", "transliteration", { preset }),
      "1000 1001 1002 6",
    );
  }
});
