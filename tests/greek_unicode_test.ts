import { assertEquals } from "@std/assert";
import { convert } from "../src/mod.ts";
import { applyGreekOrthography, parse } from "../src/document.ts";

const POLYTONIC = { greek: { accentuation: "polytonic" } } as const;
const MONOTONIC = { greek: { accentuation: "monotonic" } } as const;

Deno.test("uses the accentuation system to select tonos or oxia", () => {
  // Polysyllables, because monotonic monosyllables carry no accent.
  assertEquals(convert("άβα ΐβα", "greek", "greek", POLYTONIC), "άβα ΐβα");
  assertEquals(convert("άβα ΐβα", "greek", "greek", MONOTONIC), "άβα ΐβα");

  assertEquals(
    convert("άβα ΐβα", "greek", "greek", {
      ...POLYTONIC,
      greek: { acute: "tonos" },
    }),
    "άβα ΐβα",
  );
  assertEquals(
    convert("άβα ΐβα", "greek", "greek", {
      ...MONOTONIC,
      greek: { acute: "oxia" },
    }),
    "άβα ΐβα",
  );
});

Deno.test("keeps polytonic combinations without a tonos alternative", () => {
  assertEquals(
    convert("ἄ ᾴ", "greek", "greek", {
      greek: { acute: "tonos" },
    }),
    "ἄ ᾴ",
  );
});

Deno.test("converts polytonic marks to the mechanical monotonic profile", () => {
  const source = "Ἄνθρωπὸς ᾆ ῑ ἄϋλος κἀγώ πολύῤῥιζος";

  assertEquals(
    convert(source, "greek", "greek", MONOTONIC),
    "Άνθρωπός α ι άϋλος καγώ πολύρριζος",
  );
});

Deno.test("applies Greek accentuation only to Greek output", () => {
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

Deno.test("monotonic monosyllables carry no accent except ή, πού, and πώς", () => {
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

Deno.test("monotonic rendering does not create blocked contractions", () => {
  assertEquals(
    convert("βσ̓ κσ̓", "greek", "greek", MONOTONIC),
    "βς κς",
  );
});

Deno.test("decomposed output uses combining acute regardless of its form", () => {
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

Deno.test("forces canonically unstable Greek punctuation on demand", () => {
  const formatted = convert("\u03AC;\u00B7", "greek", "greek", {
    greek: { acute: "oxia", questionMark: "greek", anoTeleia: "greek" },
  });

  assertEquals(formatted, "\u1F71\u037E\u0387");
  assertEquals(formatted === formatted.normalize("NFC"), false);
});

Deno.test("the Unicode preferences keep the canonical scalars on demand", () => {
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

Deno.test("Greek orthography is immutable", () => {
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
