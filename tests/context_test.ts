import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed } from "../src/mod.ts";
import { encode, parse, validateDocument } from "../src/document.ts";
import { grapheme } from "../src/model.ts";

/** The position decides the shape of every sigma. */
const CONTEXTUAL = { greek: { finalSigma: "contextual" } } as const;

test("preserves case when transliterating nasal gamma", () => {
  assertNfcEquals(
    convert("ΓΓ ΓΚ ΓΞ ΓΧ", "greek", "transliteration"),
    "NG NK NX NCH",
  );
  for (const latin of ["NG NK NX NCH", "NG NK NX NCh"]) {
    assertNfcEquals(
      convert(latin, "transliteration", "greek"),
      "ΓΓ ΓΚ ΓΞ ΓΧ",
    );
  }
});

test("makes nasal-gamma transliteration optional", () => {
  const literal = { transliteration: { nasalGamma: "literal" } } as const;

  assertNfcEquals(
    convert("γγ γκ γξ γχ", "greek", "transliteration", literal),
    "gg gk gx gch",
  );
  assertNfcEquals(
    convert("ΓΓ ΓΚ ΓΞ ΓΧ", "greek", "transliteration", literal),
    "GG GK GX GCH",
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

const ASPIRATE = { greek: { elidedStop: "aspirate" } } as const;

test("keeps an elided final mute before a rough breathing as written", () => {
  // Ionic prose and many editions write the smooth mute (Herodotus).
  for (const text of ["ἀπ’ οὗ", "κατ’ ἑωυτούς", "μετ’ ἡμέρην", "ἐπ’ ᾧ"]) {
    const result = convertDetailed(text, "greek", "greek");
    assertNfcEquals(result.output, text);
    assertEquals(result.lossy, false, text);
  }
  // An aspirate the source writes stays too.
  assertNfcEquals(convert("ἀφ’ οὗ", "greek", "greek"), "ἀφ’ οὗ");
  assertNfcEquals(
    convert("ap’ hēmō̃n", "transliteration", "greek"),
    "ἀπ’ ἡμῶν",
  );
  assertNfcEquals(convert("a)p' ou(=", "beta-code", "greek"), "ἀπ’ οὗ");

  // The consonant converts back from every format without loss.
  for (const to of ["beta-code", "transliteration"] as const) {
    const there = convertDetailed("ἀπ’ οὗ", "greek", to);
    assertEquals(there.lossy, false, to);
    assertNfcEquals(convert(there.output, to, "greek"), "ἀπ’ οὗ");
  }
});

test("aspirates an elided final mute before a rough breathing on demand", () => {
  assertNfcEquals(
    convert("ap’ hēmō̃n", "transliteration", "greek", ASPIRATE),
    "ἀφ’ ἡμῶν",
  );
  assertNfcEquals(
    convert("t’ hḗde", "transliteration", "greek", ASPIRATE),
    "θ’ ἥδε",
  );
  assertNfcEquals(
    convert("dek’ hén", "transliteration", "greek", ASPIRATE),
    "δεχ’ ἕν",
  );
  assertNfcEquals(
    convert("ἀπ’ οὗ κατ’ ἡμέραν", "greek", "greek", ASPIRATE),
    "ἀφ’ οὗ καθ’ ἡμέραν",
  );

  // The consonant replaced is reported, and the output is stable.
  const result = convertDetailed("ἀπ’ οὗ", "greek", "greek", ASPIRATE);
  assertEquals(result.losses.map(({ code, offset }) => [code, offset]), [
    ["unrepresented-grapheme", 1],
  ]);
  assertNfcEquals(
    convert(result.output, "greek", "greek", ASPIRATE),
    result.output,
  );

  // Only Greek output writes it.
  assertNfcEquals(
    convert("ἀπ’ οὗ", "greek", "beta-code", ASPIRATE),
    "a)p' ou(=",
  );
  assertNfcEquals(
    convert("ἀπ’ οὗ", "greek", "transliteration", ASPIRATE),
    "ap’ hoũ",
  );
});

test("recognizes common Unicode elision marks", () => {
  for (const mark of ["'", "\u02BC", "\u1FBD", "\u2019"]) {
    assertNfcEquals(
      convert(`ap${mark} hēmō̃n`, "transliteration", "greek", ASPIRATE),
      "ἀφ’ ἡμῶν",
    );
  }
});

test("does not aspirate outside the elision context", () => {
  assertNfcEquals(
    convert("ap’ emoũ", "transliteration", "greek", ASPIRATE),
    "ἀπ’ ἐμοῦ",
  );
  assertNfcEquals(
    convert("ap hēmō̃n", "transliteration", "greek", ASPIRATE),
    "ἀπ ἡμῶν",
  );
  assertNfcEquals(
    convert("ap’ hēmō̃n", "transliteration", "beta-code", ASPIRATE),
    "a)p' h(mw=n",
  );
});

test("places initial breathings on the diphthong target", () => {
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

test("diaeresis prevents an initial diphthong", () => {
  assertNfcEquals(
    convert("huḯdion", "transliteration", "greek"),
    "ὑΐδιον",
  );
  assertNfcEquals(
    convert("hyḯdion", "transliteration", "greek"),
    "ὑΐδιον",
  );
  assertNfcEquals(
    convert("ὑΐδιον", "greek", "transliteration"),
    "hyḯdion",
  );
});

test("handles rare omega-upsilon as an initial diphthong", () => {
  assertNfcEquals(
    convert("hōu", "transliteration", "greek"),
    "ωὑ",
  );
  assertNfcEquals(
    convert("ωὑ", "greek", "transliteration"),
    "hōu",
  );
});

test("marks on the first vowel of a pair signal hiatus and are kept", () => {
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

  // An accent on the first vowel survives transliteration, and so does a
  // breathing before an upsilon: the default spelling writes `y` for a
  // hiatus (`aytmḗ`). A hiatus before an iota signalled only by a breathing
  // does not survive, because the breathing is reread on the diphthong.
  // That displacement is reported, and the breathing itself is not reported
  // as removed.
  for (const word of ["Ἅιδῃ", "ἄυλος", "ἀυτμή"]) {
    const result = convertDetailed(word, "greek", "transliteration");
    assertEquals(result.lossy, false);
    assertNfcEquals(convert(result.output, "transliteration", "greek"), word);
  }
  for (const word of ["Ἀίδης", "ἀίδηλος"]) {
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
  const inPlace = { transliteration: { smoothBreathing: "greek" } } as const;
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

test("does not infer breathings on internal vowel groups", () => {
  assertNfcEquals(convert("kau", "transliteration", "greek"), "καυ");
});

/** Greek output that writes the marks of words in capitals. */
const PRESERVE_CAPITALS = { greek: { capitalMarks: "preserve" } } as const;

test("writes an internal rough breathing before its diphthong", () => {
  // "The h precedes the romanized vowel or diphthong" (ALA-LC), inside a
  // word as at its start: χοἱ like οἱ (issue #44).
  for (
    const [greek, latin] of [
      ["χοὗτος", "chhoũtos"],
      ["χοἱ", "chhoi"],
      ["Χοἱ", "Chhoi"],
      ["ΧΟἹ", "CHHOI"],
      ["καὑ", "khau"],
    ]
  ) {
    assertNfcEquals(convert(greek, "greek", "transliteration"), latin);
    // Greek writes no breathing in capitals, unless asked to.
    assertNfcEquals(
      convert(latin, "transliteration", "greek", PRESERVE_CAPITALS),
      greek,
    );
  }
  for (const preset of ["ala-lc-ancient", "ala-lc-modern"] as const) {
    assertNfcEquals(
      convert("χοὗτος", "greek", "transliteration", { preset }),
      "chhoutos",
    );
    // Not a hiatus χὁυ, which would give chhoytos.
    assertNfcEquals(
      convert("chhoutos", "transliteration", "greek", { preset }),
      "χοὑτος",
    );
  }
  // The breathing goes to the first diphthong only: the υ of ου does not
  // pass it on to an ι after it, which ALA-LC and SBL write without the
  // diaeresis of οὑϊ.
  for (const preset of ["ala-lc-ancient", "sbl-general"] as const) {
    for (const greek of ["Οὑϊ", "χοὑϊ"]) {
      const latin = convert(greek, "greek", "transliteration", { preset });
      assertNfcEquals(
        convert(latin, "transliteration", "greek", { preset }),
        greek.replace("ϊ", "ι"),
      );
      assertNfcEquals(
        convert(latin, "transliteration", "transliteration", { preset }),
        latin,
      );
    }
  }
  // A marked hiatus is not a diphthong: the h stays before the second vowel.
  assertNfcEquals(convert("χάἱ", "greek", "transliteration"), "cháhi");
  assertNfcEquals(convert("cháhi", "transliteration", "greek"), "χάἱ");
  // An h before an unmarked pair goes to the diphthong, as ἁι → hai → αἱ at
  // the start of a word; an accent on the first vowel keeps the hiatus.
  const unmarked = convertDetailed("μἁιδης", "greek", "transliteration");
  assertNfcEquals(unmarked.output, "mhaidēs");
  assertEquals(unmarked.losses.map((loss) => loss.code), [
    "displaced-diacritic",
  ]);
  assertNfcEquals(convert("mhaidēs", "transliteration", "greek"), "μαἱδης");
  assertNfcEquals(convert("μἅιδης", "greek", "transliteration"), "mháidēs");
  assertNfcEquals(convert("mháidēs", "transliteration", "greek"), "μἅιδης");
});

test("iota subscript prevents grouping with a following vowel", () => {
  assertNfcEquals(
    encode([
      grapheme("alpha", false, ["rough", "iota-subscript"]),
      grapheme("upsilon"),
    ], "greek"),
    "ᾁυ",
  );
});

test("uses final sigma before Unicode separators and punctuation", () => {
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
    "·",
    "·",
    ";",
    ";",
    "\u200B",
  ];

  // An apostrophe stands for an elided vowel and does not end the word: see
  // "keeps a sigma before an elision apostrophe medial". The position decides
  // the shape under finalSigma: "contextual", and for a sigma whose shape
  // the source does not note.
  for (const boundary of boundaries) {
    assertNfcEquals(
      convert(`ασ${boundary}α`, "greek", "greek", CONTEXTUAL),
      `ας${boundary}α`,
    );
    assertNfcEquals(
      convert(`as${boundary}a`, "beta-code", "greek"),
      `ας${boundary}α`,
    );
  }
});

test("ignores combining marks and join controls at word boundaries", () => {
  for (const transparent of ["\u0323", "\u200C", "\u200D", "\u2060"]) {
    assertNfcEquals(
      convert(`ας${transparent}α`, "greek", "greek", CONTEXTUAL),
      `ασ${transparent}α`,
    );
    assertNfcEquals(
      convert(`ασ${transparent}`, "greek", "greek", CONTEXTUAL),
      `ας${transparent}`,
    );
  }
});

test("infers no breathing after a mark inside a word", () => {
  for (
    const transparent of ["̣", "⃝", "‌", "‍", "⁠"]
  ) {
    for (
      const [latin, greek] of [
        [`ka${transparent}e`, `κα${transparent}ε`],
        [`s${transparent}a`, `σ${transparent}α`],
        // The mark parts the vowels, as the writer parts them (`y`): the
        // first takes the breathing of the word, and the second none.
        [`a${transparent}ytos`, `ἀ${transparent}υτος`],
        [`ka${transparent}hoi`, `κα${transparent}οἱ`],
      ]
    ) {
      assertNfcEquals(convert(latin, "transliteration", "greek"), greek);
      assertNfcEquals(convert(greek, "greek", "transliteration"), latin);
    }
  }
  // The dot of an uncertain letter, in an edition.
  const uncertain = convertDetailed("κα̣ὶ ἐ̣γένετο", "greek", "transliteration");
  assertEquals(uncertain.output.normalize(), "kạì ẹgéneto");
  assertEquals(uncertain.lossy, false);
  // A coronis after the mark is the vowel's only mark.
  const coronis = { transliteration: { coronis: "apostrophe" } } as const;
  const crasis = convert("kạe’ga", "transliteration", "greek", coronis);
  assertNfcEquals(crasis, "κα̣ἐγα");
  assertNfcEquals(
    convert(crasis, "greek", "transliteration", coronis),
    "kạe’ga",
  );
});

test("shares transparent boundaries with medial beta", () => {
  assertNfcEquals(
    convert("α\u200Dβ", "greek", "greek", {
      greek: { medialBeta: "symbol" },
    }),
    "α\u200Dϐ",
  );
});

test("converts additional Greek letters in every format", () => {
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

test("preserves Greek alphabetic numeral notation", () => {
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
      greek: { medialBeta: "symbol" },
    }),
    "αβʹ",
  );
});

test("quantity marks do not infer an initial smooth breathing", () => {
  assertNfcEquals(
    convert("ā ĭ ī ŭ ū", "transliteration", "greek"),
    "ᾱ ῐ ῑ ῠ ῡ",
  );
  assertNfcEquals(
    convert("ᾱ ῐ ῑ ῠ ῡ", "greek", "transliteration"),
    "ā ĭ ī y̆ ȳ",
  );
  assertNfcEquals(
    convert("ā ĭ ī y̆ ȳ", "transliteration", "greek"),
    "ᾱ ῐ ῑ ῠ ῡ",
  );
  assertNfcEquals(
    convert("ā", "transliteration", "beta-code"),
    "a%26",
  );
  assertNfcEquals(
    convert("hā", "transliteration", "greek"),
    "ᾱ̔",
  );
});

test(
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

test("preserves crasis while transliteration remains lossy", () => {
  assertNfcEquals(convert("τοὔνομα", "greek", "beta-code"), "tou)/noma");
  assertNfcEquals(convert("tou)/noma", "beta-code", "greek"), "τοὔνομα");
  assertNfcEquals(convert("τοὔνομα", "greek", "transliteration"), "toúnoma");
  assertNfcEquals(convert("toúnoma", "transliteration", "greek"), "τούνομα");
});

test("keeps a labial or velar before sigma as written", () => {
  // Greek writes these pairs where a prefix meets a stem (ἔκστασις, ἐκσῴζω);
  // ψ and ξ are read from their own spellings, never contracted.
  assertNfcEquals(
    convert("πσ βσ φσ κσ γσ χσ", "greek", "greek", CONTEXTUAL),
    "πς βς φς κς γς χς",
  );
  assertNfcEquals(convert("ἔκστασις", "greek", "greek"), "ἔκστασις");
  assertNfcEquals(convert("ἐκσῴζω", "greek", "greek"), "ἐκσῴζω");
  assertNfcEquals(convert("e)/kstasis", "beta-code", "greek"), "ἔκστασις");
  assertNfcEquals(
    convert("ékstasis", "transliteration", "greek"),
    "ἔκστασις",
  );
  assertNfcEquals(convert("ps ks", "beta-code", "greek"), "πς κς");
  assertNfcEquals(convert("y c", "beta-code", "greek"), "ψ ξ");
  assertNfcEquals(
    convert("psychḗ xénos", "transliteration", "greek"),
    "ψυχή ξένος",
  );
  assertNfcEquals(
    convert("ks", "transliteration", "greek", {
      transliteration: { xi: "ks" },
    }),
    "ξ",
  );
  assertEquals(
    convertDetailed("ἔκστασις", "greek", "greek").lossy,
    false,
  );
  assertNfcEquals(convert("ἔκστασις", "greek", "beta-code"), "e)/kstasis");
});

test("assimilates dentals before sigma only on demand", () => {
  const assimilate = {
    greek: { dentalSigma: "assimilate" },
  } as const;

  assertNfcEquals(
    convert("τσ δσ θσ", "greek", "greek", CONTEXTUAL),
    "τς δς θς",
  );
  assertNfcEquals(
    convert("ατσα αδσα αθσα", "greek", "greek", assimilate),
    "ασα ασα ασα",
  );
  assertNfcEquals(
    convert("τσ δσ θσ", "greek", "greek", assimilate),
    "σ σ σ",
  );
  assertNfcEquals(
    convert("τσ δσ θσ", "greek", "greek", {
      greek: { dentalSigma: "assimilate", finalSigma: "contextual" },
    }),
    "ς ς ς",
  );
  assertNfcEquals(
    convert("ΤΣ ΔΣ ΘΣ", "greek", "greek", assimilate),
    "Σ Σ Σ",
  );
  assertNfcEquals(
    convert("ατσα αδσα αθσα", "greek", "greek", {
      greek: { dentalSigma: "assimilate", sigma: "lunate" },
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
  // Beta Code keeps the medial sigma the source notes at the end of a word.
  assertNfcEquals(convert("τσ δσ θσ", "greek", "beta-code"), "ts1 ds1 qs1");
  assertNfcEquals(
    convert("τσ δσ θσ", "greek", "transliteration"),
    "ts ds ths",
  );
});

test("does not contract separated, marked, or numeric pairs", () => {
  const assimilate = {
    greek: { dentalSigma: "assimilate" },
  } as const;
  assertNfcEquals(
    convert("π σ κ σ", "greek", "greek", CONTEXTUAL),
    "π ς κ ς",
  );
  assertNfcEquals(convert("τσʹ", "greek", "greek", assimilate), "τσʹ");
  assertNfcEquals(
    convert("τσʹ", "greek", "greek", {
      text: { numerals: "decimal" },
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

test("does not infer a breathing on an initial vowel with diaeresis", () => {
  for (
    const [latin, greek] of [
      ["ḯdios", "ΐδιος"],
      ["ïdios", "ϊδιος"],
      ["Ïdios", "Ϊδιος"],
      ["ü", "ϋ"],
      ["ǘdōr", "ΰδωρ"],
    ] as const
  ) {
    const parsed = parse(latin, "transliteration");
    assertEquals(validateDocument(parsed), []);
    assertNfcEquals(convert(latin, "transliteration", "greek"), greek);
    assertNfcEquals(
      convert(
        convert(greek, "greek", "transliteration"),
        "transliteration",
        "greek",
      ),
      greek,
    );
  }
  // A breathing still reaches a vowel group whose diaeresis sits elsewhere.
  assertNfcEquals(convert("aḯdios", "transliteration", "greek"), "ἀΐδιος");
});
