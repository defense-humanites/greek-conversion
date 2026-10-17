import { convert, convertDetailed, greekToBetaCode } from "../src/mod.ts";
import { encode } from "../src/document.ts";
import { grapheme } from "../src/model.ts";
import { assertEquals } from "@std/assert";
import { assertNfcEquals } from "./assertions.ts";

Deno.test("preserves case when transliterating nasal gamma", () => {
  assertNfcEquals(
    convert("ΓΓ ΓΚ ΓΞ ΓΧ", "greek", "transliteration"),
    "NG NK NX NCh",
  );
  assertNfcEquals(
    convert("NG NK NX NCh", "transliteration", "greek"),
    "ΓΓ ΓΚ ΓΞ ΓΧ",
  );
});

Deno.test("makes nasal-gamma transliteration optional", () => {
  const literal = { orthography: { nasalGamma: "literal" } } as const;

  assertNfcEquals(
    convert("γγ γκ γξ γχ", "greek", "transliteration", literal),
    "gg gk gx gch",
  );
  assertNfcEquals(
    convert("ΓΓ ΓΚ ΓΞ ΓΧ", "greek", "transliteration", literal),
    "GG GK GX GCh",
  );
  assertNfcEquals(
    convert("gg gk gx gch", "transliteration", "greek", literal),
    "γγ γκ γξ γχ",
  );
  assertNfcEquals(
    convert("ng nk nx nch", "transliteration", "greek", literal),
    "νγ νκ νξ νχ",
  );
});

Deno.test("aspirates an elided final mute before a rough breathing", () => {
  assertNfcEquals(
    convert("ap’ hēmō̃n", "transliteration", "greek"),
    "ἀφ’ ἡμῶν",
  );
  assertNfcEquals(
    convert("t’ hḗde", "transliteration", "greek"),
    "θ’ ἥδε",
  );
  assertNfcEquals(
    convert("dek’ hén", "transliteration", "greek"),
    "δεχ’ ἕν",
  );
});

Deno.test("recognizes common Unicode elision marks", () => {
  for (const mark of ["'", "\u02BC", "\u1FBD", "\u2019"]) {
    assertNfcEquals(
      convert(`ap${mark} hēmō̃n`, "transliteration", "greek"),
      "ἀφ’ ἡμῶν",
    );
  }
});

Deno.test("does not aspirate outside the elision context", () => {
  assertNfcEquals(
    convert("ap’ emoũ", "transliteration", "greek"),
    "ἀπ’ ἐμοῦ",
  );
  assertNfcEquals(
    convert("ap hēmō̃n", "transliteration", "greek"),
    "ἀπ ἡμῶν",
  );
  assertNfcEquals(
    convert("ap’ hēmō̃n", "transliteration", "beta-code"),
    "a)p' h(mw=n",
  );
});

Deno.test("places initial breathings on the diphthong target", () => {
  assertNfcEquals(
    convert("haíresis", "transliteration", "greek"),
    "αἵρεσις",
  );
  assertNfcEquals(
    convert("αἵρεσις", "greek", "transliteration"),
    "haíresis",
  );
  assertNfcEquals(
    convert("Haíresis", "transliteration", "greek"),
    "Αἵρεσις",
  );
  assertNfcEquals(
    convert("Αἵρεσις", "greek", "transliteration"),
    "Haíresis",
  );
});

Deno.test("diaeresis prevents an initial diphthong", () => {
  assertNfcEquals(
    convert("huḯdion", "transliteration", "greek"),
    "ὑΐδιον",
  );
  assertNfcEquals(
    convert("ὑΐδιον", "greek", "transliteration"),
    "huḯdion",
  );
});

Deno.test("handles rare omega-upsilon as an initial diphthong", () => {
  assertNfcEquals(
    convert("hōu", "transliteration", "greek"),
    "ωὑ",
  );
  assertNfcEquals(
    convert("ωὑ", "greek", "transliteration"),
    "hōu",
  );
});

Deno.test("marks on the first vowel of a pair signal hiatus and are kept", () => {
  // A breathing or accent on the first vowel means the pair is not a
  // diphthong: iota adscript after a capital, or two syllables.
  assertNfcEquals(convert("ἁι", "greek", "greek"), "ἁι");
  assertNfcEquals(convert("a(i", "beta-code", "beta-code"), "a(i");
  assertNfcEquals(convert("a)i", "beta-code", "greek"), "ἀι");

  for (const word of ["Ἅιδῃ", "Ἀίδης", "ἀίδηλος", "ἄυλος", "ἀυτμή"]) {
    assertNfcEquals(convert(word, "greek", "greek"), word);
    assertEquals(convertDetailed(word, "greek", "greek").lossy, false);
    assertNfcEquals(
      convert(convert(word, "greek", "beta-code"), "beta-code", "greek"),
      word,
    );
    assertEquals(convertDetailed(word, "greek", "beta-code").lossy, false);
  }

  // An accent on the first vowel survives transliteration; a hiatus signalled
  // only by a breathing does not, because the breathing is reread on the
  // diphthong. That displacement is reported, and the breathing itself is not
  // reported as removed.
  for (const word of ["Ἅιδῃ", "ἄυλος"]) {
    const result = convertDetailed(word, "greek", "transliteration");
    assertEquals(result.lossy, false);
    assertNfcEquals(convert(result.output, "transliteration", "greek"), word);
  }
  for (const word of ["Ἀίδης", "ἀίδηλος", "ἀυτμή"]) {
    const result = convertDetailed(word, "greek", "transliteration");
    assertEquals(result.lossy, true);
    assertEquals(
      result.losses.map(({ code, index, diacritic }) => ({
        code,
        index,
        diacritic,
      })),
      [{ code: "displaced-diacritic", index: 0, diacritic: "smooth" }],
    );
  }

  // Writing the smooth breathing in place keeps the hiatus reversible.
  const inPlace = { orthography: { smoothBreathing: "greek" } } as const;
  for (const word of ["Ἀίδης", "ἀίδηλος", "ἀυτμή"]) {
    const result = convertDetailed(word, "greek", "transliteration", inPlace);
    assertEquals(result.lossy, false);
    assertNfcEquals(
      convert(result.output, "transliteration", "greek", inPlace),
      word,
    );
  }

  assertNfcEquals(convert("Ἅιδῃ", "greek", "beta-code"), "*(/aidh|");
  assertNfcEquals(convert("*(/aidh|", "beta-code", "greek"), "Ἅιδῃ");
  assertNfcEquals(convert("Ἅιδῃ", "greek", "transliteration"), "Háidȩ̄");
  // The diphthong keeps its marks on the second element.
  assertNfcEquals(convert("Αἴδης", "greek", "transliteration"), "Aídēs");
  assertNfcEquals(convert("Aídēs", "transliteration", "greek"), "Αἴδης");
  assertNfcEquals(convert("αἱ", "greek", "transliteration"), "hai");
  assertNfcEquals(convert("hai", "transliteration", "greek"), "αἱ");
});

Deno.test("does not infer breathings on internal vowel groups", () => {
  assertNfcEquals(convert("kau", "transliteration", "greek"), "καυ");
  assertNfcEquals(convert("καὑ", "greek", "transliteration"), "kahu");
  assertNfcEquals(convert("kahu", "transliteration", "greek"), "καὑ");
});

Deno.test("iota subscript prevents grouping with a following vowel", () => {
  assertNfcEquals(
    encode([
      grapheme("alpha", false, ["rough", "iota-subscript"]),
      grapheme("upsilon"),
    ], "greek"),
    "ᾁυ",
  );
});

Deno.test("uses final sigma before Unicode separators and punctuation", () => {
  const boundaries = [
    " ",
    "\u00A0",
    "\u202F",
    "\u2028",
    "\u2029",
    "«",
    "”",
    "‐",
    "–",
    "—",
    "'",
    "’",
    "·",
    "·",
    ";",
    ";",
    "\u200B",
  ];

  for (const boundary of boundaries) {
    const canonicalBoundary = boundary === "'" ? "’" : boundary;
    assertNfcEquals(
      convert(`ασ${boundary}α`, "greek", "greek"),
      `ας${canonicalBoundary}α`,
    );
  }
});

Deno.test("ignores combining marks and join controls at word boundaries", () => {
  for (const transparent of ["\u0323", "\u200C", "\u200D", "\u2060"]) {
    assertNfcEquals(
      convert(`ασ${transparent}α`, "greek", "greek"),
      `ασ${transparent}α`,
    );
    assertNfcEquals(
      convert(`ασ${transparent}`, "greek", "greek"),
      `ας${transparent}`,
    );
  }
});

Deno.test("shares transparent boundaries with medial beta", () => {
  assertNfcEquals(
    convert("α\u200Dβ", "greek", "greek", {
      orthography: { medialBeta: "symbol" },
    }),
    "α\u200Dϐ",
  );
});

Deno.test("converts additional Greek letters in every format", () => {
  assertNfcEquals(
    convert("ϝ ϳ ϛ ϟ ϙ ϡ", "greek", "beta-code"),
    "v j #2 #1 #3 #5",
  );
  assertNfcEquals(
    convert("v j #2 #1 #3 #5", "beta-code", "greek"),
    "ϝ ϳ ϛ ϟ ϙ ϡ",
  );
  assertNfcEquals(
    convert("Ϝ Ϳ Ϛ Ϟ Ϙ Ϡ", "greek", "beta-code"),
    "*v *j *#2 *#1 *#3 *#5",
  );
  assertNfcEquals(
    convert("w j c̄ q ḳ s̄", "transliteration", "greek"),
    "ϝ ϳ ϛ ϟ ϙ ϡ",
  );
  assertNfcEquals(
    convert("ϝ ϳ ϛ ϟ ϙ ϡ", "greek", "transliteration"),
    "w j c̄ q ḳ s̄",
  );
});

Deno.test("preserves Greek alphabetic numeral notation", () => {
  const greek = "αʹ ͵α ϛʹ ϟʹ ϡʹ σʹ";
  const betaCode = "a# #22a #2# #1# #5# s#";
  const transliteration = "aʹ ͵a c̄ʹ qʹ s̄ʹ sʹ";

  assertNfcEquals(convert(greek, "greek", "beta-code"), betaCode);
  assertNfcEquals(convert(betaCode, "beta-code", "greek"), greek);
  assertNfcEquals(
    convert(greek, "greek", "transliteration"),
    transliteration,
  );
  assertNfcEquals(
    convert(transliteration, "transliteration", "greek"),
    greek,
  );
  assertNfcEquals(
    convert("αβʹ", "greek", "greek", {
      orthography: { medialBeta: "symbol" },
    }),
    "αβʹ",
  );
});

Deno.test("quantity marks do not infer an initial smooth breathing", () => {
  assertNfcEquals(
    convert("ā ĭ ī ŭ ū", "transliteration", "greek"),
    "ᾱ ῐ ῑ ῠ ῡ",
  );
  assertNfcEquals(
    convert("ᾱ ῐ ῑ ῠ ῡ", "greek", "transliteration"),
    "ā ĭ ī ŭ ū",
  );
  assertNfcEquals(
    convert("ā", "transliteration", "beta-code"),
    "a&",
  );
  assertNfcEquals(
    convert("hā", "transliteration", "greek"),
    "ἁ̄",
  );
});

Deno.test(
  "distinguishes internal coronis from initial smooth breathing",
  () => {
    assertNfcEquals(convert("κἀγώ", "greek", "beta-code"), "ka)gw/");
    assertNfcEquals(convert("ka)gw/", "beta-code", "greek"), "κἀγώ");
    assertNfcEquals(
      convert("a)nqrwpos", "beta-code", "greek"),
      "ἀνθρωπος",
    );
  },
);

Deno.test("preserves crasis while transliteration remains lossy", () => {
  assertNfcEquals(convert("τοὔνομα", "greek", "beta-code"), "tou)/noma");
  assertNfcEquals(convert("tou)/noma", "beta-code", "greek"), "τοὔνομα");
  assertNfcEquals(convert("τοὔνομα", "greek", "transliteration"), "toúnoma");
  assertNfcEquals(convert("toúnoma", "transliteration", "greek"), "τούνομα");
});

Deno.test("contracts labials and velars before sigma in Greek output", () => {
  assertNfcEquals(
    convert("πσ βσ φσ κσ γσ χσ", "greek", "greek"),
    "ψ ψ ψ ξ ξ ξ",
  );
  assertNfcEquals(
    convert("ΠΣ ΒΣ Φσ ΚΣ ΓΣ Χσ", "greek", "greek"),
    "Ψ Ψ Ψ Ξ Ξ Ξ",
  );
  assertNfcEquals(convert("πΣ βΣ κΣ γΣ", "greek", "greek"), "πΣ βΣ κΣ γΣ");
  assertNfcEquals(
    convert("ps bs fs ks gs xs", "beta-code", "greek"),
    "ψ ψ ψ ξ ξ ξ",
  );
  assertNfcEquals(greekToBetaCode("πσ"), "ps");
});

Deno.test("assimilates dentals before sigma only on demand", () => {
  const assimilate = {
    orthography: { dentalSigma: "assimilate" },
  } as const;

  assertNfcEquals(convert("τσ δσ θσ", "greek", "greek"), "τς δς θς");
  assertNfcEquals(
    convert("ατσα αδσα αθσα", "greek", "greek", assimilate),
    "ασα ασα ασα",
  );
  assertNfcEquals(
    convert("τσ δσ θσ", "greek", "greek", assimilate),
    "ς ς ς",
  );
  assertNfcEquals(
    convert("ΤΣ ΔΣ ΘΣ", "greek", "greek", assimilate),
    "Σ Σ Σ",
  );
  assertNfcEquals(
    convert("ατσα αδσα αθσα", "greek", "greek", {
      orthography: { dentalSigma: "assimilate", sigma: "lunate" },
    }),
    "αϲα αϲα αϲα",
  );
  assertNfcEquals(
    convert("atsa adsa aqsa", "beta-code", "greek", assimilate),
    "ασα ασα ασα",
  );
  assertNfcEquals(
    convert("atsa adsa athsa", "transliteration", "greek", assimilate),
    "ἀσα ἀσα ἀσα",
  );
  assertNfcEquals(convert("τσ δσ θσ", "greek", "beta-code"), "ts ds qs");
  assertNfcEquals(
    convert("τσ δσ θσ", "greek", "transliteration"),
    "ts ds ths",
  );
});

Deno.test("does not contract separated, marked, or numeric pairs", () => {
  const assimilate = {
    orthography: { dentalSigma: "assimilate" },
  } as const;
  assertNfcEquals(convert("π σ κ σ", "greek", "greek"), "π ς κ ς");
  assertNfcEquals(convert("τσʹ", "greek", "greek", assimilate), "τσʹ");
  assertNfcEquals(
    convert("τσʹ", "greek", "greek", {
      orthography: { numerals: "decimal" },
    }),
    "500",
  );
  assertNfcEquals(
    encode(
      [grapheme("beta"), grapheme("sigma", false, ["acute"])],
      "greek",
    ),
    "βς́",
  );
});
