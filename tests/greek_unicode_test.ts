import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import { convert } from "../src/mod.ts";
import { applyGreekOrthography, parse } from "../src/document.ts";

const POLYTONIC = { greek: { accentuation: "polytonic" } } as const;
const MONOTONIC = { greek: { accentuation: "monotonic" } } as const;

test("writes oxia in output with a polytonic mark and tonos in output without one", () => {
  const tonos = "\u{3AC}βα \u{390}βα";
  const oxia = "\u{1F71}βα \u{1FD3}βα";

  // No polytonic mark: tonos, as monotonic text is written, from either
  // scalar of the source.
  assertEquals(convert(tonos, "greek", "greek"), tonos);
  assertEquals(convert(oxia, "greek", "greek"), tonos);
  assertEquals(convert(tonos, "greek", "greek", POLYTONIC), tonos);
  // Polysyllables, because monotonic monosyllables carry no accent.
  assertEquals(convert(oxia, "greek", "greek", MONOTONIC), tonos);

  // Any polytonic mark in the output: oxia, for every acute of the output.
  for (
    const marked of [
      "\u{1F41}", // rough breathing
      "\u{1F00}", // smooth breathing, or coronis
      "\u{1F70}", // grave
      "\u{1FB6}", // circumflex
      "\u{1FB3}", // iota subscript
      "\u{1FB1}", // macron
      "\u{1FB0}", // breve
      "\u{1FE5}", // rough breathing on rho
      "\u{3B5}\u{304}", // a quantity mark with no composed letter
    ]
  ) {
    assertEquals(
      convert(`${tonos} ${marked}`, "greek", "greek"),
      `${oxia} ${marked}`,
      marked,
    );
  }
  // The same marks on a letter of another script, or on their own, are not
  // polytonic Greek.
  for (const other of ["a\u{323}\u{300}", "e\u{313}", "\u{300}", "\u{E0}"]) {
    assertEquals(
      convert(`${other} ${tonos}`, "greek", "greek"),
      `${other.normalize("NFC")} ${tonos}`,
      other,
    );
  }
  assertEquals(
    convert("a)/ba o(", "beta-code", "greek"),
    "\u{1F04}βα \u{1F41}",
  );
  assertEquals(
    convert("lógos", "transliteration", "greek"),
    "λ\u{3CC}γος",
  );
  assertEquals(
    convert("ho lógos", "transliteration", "greek"),
    "\u{1F41} λ\u{1F79}γος",
  );

  // An explicit value decides, whatever the output carries.
  assertEquals(
    convert(`${oxia} \u{1F41}`, "greek", "greek", {
      greek: { acute: "tonos" },
    }),
    `${tonos} \u{1F41}`,
  );
  assertEquals(
    convert(tonos, "greek", "greek", { greek: { acute: "oxia" } }),
    oxia,
  );
  assertEquals(
    convert(tonos, "greek", "greek", {
      ...MONOTONIC,
      greek: { ...MONOTONIC.greek, acute: "oxia" },
    }),
    oxia,
  );
});

test("the form of the acute follows the output, so that it is stable", () => {
  // The marks an option removes no longer count: the output has none.
  const options = { diacritics: { smoothBreathing: "remove" } } as const;
  const once = convert(
    "\u{1F04}νθρωπος καλ\u{1F79}ς",
    "greek",
    "greek",
    options,
  );
  assertEquals(once, "\u{3AC}νθρωπος καλ\u{3CC}ς");
  assertEquals(convert(once, "greek", "greek", options), once);

  // The choice is made for the whole output of one conversion.
  const text = "\u{1F41} λ\u{1F79}γος";
  assertEquals(convert(text, "greek", "greek"), text);
  assertEquals(
    text.split(" ").map((word) => convert(word, "greek", "greek")).join(" "),
    "\u{1F41} λ\u{3CC}γος",
  );
  const pinned = { greek: { acute: "oxia" } } as const;
  assertEquals(
    text.split(" ").map((word) => convert(word, "greek", "greek", pinned))
      .join(" "),
    text,
  );

  // Monotonic text converts back to itself, scalar for scalar.
  const modern =
    "Η Αθ\u{3AE}να ε\u{3AF}ναι η πρωτε\u{3CD}ουσα\u{B7} Μα\u{390}ου, Τα\u{3B0}γετος;";
  assertEquals(convert(modern, "greek", "greek"), modern);
  assertEquals(
    convert(convert(modern, "greek", "beta-code"), "beta-code", "greek"),
    modern,
  );
  const iso = { preset: "iso-843-type-1" } as const;
  assertEquals(
    convert(
      convert(modern, "greek", "transliteration", iso),
      "transliteration",
      "greek",
      iso,
    ),
    modern,
  );
});

test("keeps polytonic combinations without a tonos alternative", () => {
  assertEquals(
    convert("ἄ ᾴ", "greek", "greek", {
      greek: { acute: "tonos" },
    }),
    "ἄ ᾴ",
  );
});

test("converts polytonic marks to the mechanical monotonic profile", () => {
  const source = "Ἄνθρωπὸς ᾆ ῑ ἄϋλος κἀγώ πολύῤῥιζος";

  assertEquals(
    convert(source, "greek", "greek", MONOTONIC),
    "Άνθρωπός α ι άϋλος καγώ πολύρριζος",
  );
});

test("applies Greek accentuation only to Greek output", () => {
  const source = "ἄ ᾆ ῑ";

  assertEquals(
    convert(source, "greek", "beta-code", MONOTONIC),
    "a)/ a)=| i%26",
  );
  assertEquals(
    convert(source, "greek", "transliteration", MONOTONIC),
    "á ã̧ ī",
  );
});

test("monotonic monosyllables carry no accent except ή, πού, and πώς", () => {
  assertEquals(
    convert(
      "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν",
      "greek",
      "greek",
      MONOTONIC,
    ),
    "Έλλησιν εγένετο και μέρει τινί των βαρβάρων, ως δε ειπείν",
  );
  // Disjunctive ή keeps its accent; the article, ἦ, and ἥ do not.
  assertEquals(
    convert("ἡ γῆ, ἦ, ἥ, ἤ, ἢ, Ἢ", "greek", "greek", MONOTONIC),
    "η γη, η, η, ή, ή, Ή",
  );
  // Interrogative ποῦ and πῶς keep theirs; relative and indefinite forms do not.
  assertEquals(
    convert("Ποῦ; Πῶς; ποὺ πὼς που πως", "greek", "greek", MONOTONIC),
    "Πού; Πώς; που πως που πως",
  );
  // Crasis, elision, and accents on enclisis follow the same syllable count.
  assertEquals(
    convert("κἂν δ’ ἐκεῖνος, ἄνθρωπός τις", "greek", "greek", MONOTONIC),
    "καν δ’ εκείνος, άνθρωπός τις",
  );
  // An accent on the first of two vowels marks hiatus: two syllables.
  assertEquals(
    convert("ἄυλος αἳ οἷς", "greek", "greek", MONOTONIC),
    "άυλος αι οις",
  );
  // Monotonic input is already canonical.
  const monotonic = "Πού είσαι; Ή εδώ ή εκεί, και όχι αλλού.";
  assertEquals(convert(monotonic, "greek", "greek", MONOTONIC), monotonic);
  // Numerals are not words.
  assertEquals(convert("αʹ ιβʹ", "greek", "greek", MONOTONIC), "αʹ ιβʹ");
});

test("monotonic rendering does not create blocked contractions", () => {
  assertEquals(
    convert("βσ̓ κσ̓", "greek", "greek", {
      ...MONOTONIC,
      greek: { ...MONOTONIC.greek, finalSigma: "contextual" },
    }),
    "βς κς",
  );
});

test("decomposed output uses combining acute regardless of its form", () => {
  const tonos = convert("ά ΐ ἄ", "greek", "greek", {
    greek: { composition: "decomposed", acute: "tonos" },
  });
  const oxia = convert("ά ΐ ἄ", "greek", "greek", {
    greek: { composition: "decomposed", acute: "oxia" },
  });

  assertEquals(tonos, "α\u0301 ι\u0308\u0301 α\u0313\u0301");
  assertEquals(oxia, tonos);
  assertEquals(tonos, tonos.normalize("NFD"));
});

test("forces canonically unstable Greek punctuation on demand", () => {
  const formatted = convert("\u03AC;\u00B7", "greek", "greek", {
    greek: { acute: "oxia", questionMark: "greek", anoTeleia: "greek" },
  });

  assertEquals(formatted, "\u1F71\u037E\u0387");
  assertEquals(formatted === formatted.normalize("NFC"), false);
});

test("the Unicode preferences keep the canonical scalars on demand", () => {
  assertEquals(
    convert("\u03AC;\u00B7", "greek", "greek", {
      greek: {
        acute: "tonos",
        questionMark: "semicolon",
        anoTeleia: "middle-dot",
      },
    }),
    "\u03AC;\u00B7",
  );
});

test("Greek orthography is immutable", () => {
  const source = parse("ἄρα", "greek");
  const transformed = applyGreekOrthography(source, MONOTONIC);

  assertEquals(source[0].kind === "grapheme" && [...source[0].diacritics], [
    "smooth",
    "acute",
  ]);
  assertEquals(
    transformed[0].kind === "grapheme" && [...transformed[0].diacritics],
    ["acute"],
  );
  assertEquals(transformed === source, false);
  assertEquals(applyGreekOrthography(source) === source, false);
});
