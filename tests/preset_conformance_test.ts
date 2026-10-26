import { assertEquals } from "@std/assert";
import { convert, convertDetailed, createConverter } from "../src/mod.ts";
import { parse } from "../src/document.ts";
import { assertNfcEquals } from "./assertions.ts";

// Expected spellings come from the cited tables and examples, not from the
// engine. See docs/preset-conformance-corpus.md for scope and pending cases.
const CASES = [
  {
    preset: "bnf-core",
    rule: "§ 2.3, example 6: uppercase two-letter romanization",
    greek: "Θάλασσα Χαρά Ψάρι",
    latin: "Thálassa Chará Psári",
    lossy: false,
  },
  {
    preset: "bnf-core",
    rule: "§ 2.1: ancient-Greek variant letters",
    greek: "βηφ",
    latin: "bēph",
    lossy: false,
  },
  {
    preset: "bnf-core",
    rule: "§ 3: exceptional vowel pairs",
    greek: "αυ ευ ου",
    latin: "au eu ou",
    lossy: false,
  },
  {
    preset: "bnf-core",
    rule: "§ 4.3.5: rough breathing on an initial vowel pair",
    greek: "εὑρετήρια",
    latin: "heuretḗria",
    lossy: false,
  },
  {
    preset: "bnf-core",
    rule: "§ 4.2: coronis retains a Greek sign",
    greek: "κἀγώ",
    latin: "ka᾽gṓ",
    lossy: false,
  },
  {
    preset: "bnf-core",
    rule: "§ 4.3: smooth breathing and circumflex",
    greek: "ἄ ὦ",
    latin: "a̓́ ō̓̂",
    lossy: false,
  },
  {
    preset: "bnf-core",
    rule: "§ 4.3: explicit quantity marks are omitted",
    greek: "ᾱ ᾰ",
    latin: "a a",
    lossy: true,
  },
  {
    preset: "bnf-core",
    rule: "§ 4.1.1: keraiai become comma and acute",
    greek: "͵αʹ",
    latin: ",á",
    lossy: true,
  },
  {
    preset: "bnf-core",
    rule: "§ 4.3.6: the Greek printed hyphen remains U+2010",
    greek: "α‐β",
    latin: "a‐b",
    lossy: false,
  },
  {
    preset: "bnf-core",
    rule: "§ 7.2: marked archaic numerals have prescribed letter case",
    greek: "Ϛʹ Ϟʹ Ϡʹ ͵Ϛ ͵Ϡ",
    latin: "c̄́ Q́ s̄́ ,c̄ ,s̄",
    lossy: true,
  },
  {
    preset: "iso-843-type-1",
    rule: "Table 1: beta, eta, and phi",
    greek: "βηφ",
    latin: "vīf",
    lossy: false,
  },
  {
    preset: "iso-843-type-1",
    rule: "Table 1, note 1: exceptional vowel pairs",
    greek: "αυ ευ ου",
    latin: "au eu ou",
    lossy: false,
  },
  {
    preset: "iso-843-type-1",
    rule: "Table 3: smooth breathing is an apostrophe",
    greek: "ἄ",
    latin: "’á",
    lossy: true,
  },
  {
    preset: "iso-843-type-1",
    rule: "Table 3: perispomeni becomes a circumflex",
    greek: "τοῦ ᾠδῇ",
    latin: "toû ’ō̧dī̧̂",
    lossy: true,
  },
  {
    preset: "iso-843-type-1",
    rule: "Table 3: initial rough rho",
    greek: "ῥ",
    latin: "rh",
    lossy: false,
  },
  {
    preset: "iso-843-type-1",
    rule: "Table 3: question mark and ano teleia stay distinct",
    greek: ";·",
    latin: "?;",
    lossy: false,
  },
  {
    preset: "iso-843-type-1",
    rule: "Table 3: iota subscript becomes cedilla",
    greek: "ᾳ",
    latin: "a̧",
    lossy: false,
  },
  {
    preset: "iso-843-type-1",
    rule: "Table 4: digamma and yot",
    greek: "ϝ ϳ",
    latin: "w j",
    lossy: false,
  },
  {
    preset: "iso-843-type-1",
    rule: "Table 3: enotikon uses the same Latin glyph as the hyphen",
    greek: "α‿β α‐β",
    latin: "a-v a-v",
    lossy: true,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 2, lines 5–7, notes 3, 4, 9: αυ is av, af, or ay",
    greek: "αυγό αυτός άυλος αϋπνία",
    latin: "avgó aftós áylos aÿpnía",
    lossy: true,
  },
  {
    preset: "iso-843-type-2",
    rule:
      "Table 2, lines 19–21, notes 3, 4: ευ is ev or ef, ef at the end of a word",
    greek: "Ευρώπη ευχαριστώ ευ",
    latin: "Evrópi efcharistó ef",
    lossy: true,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 2, lines 24–25: ηυ is iv or if",
    greek: "ηύρα ηυ",
    latin: "ívra if",
    lossy: true,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 2, note 10: the accent of αυ, ευ, ηυ moves to the vowel",
    greek: "Εύβοια δεῦρο αὐτός",
    latin: "Évvoia dêvro ’aftós",
    lossy: true,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 2, lines 41–42, note 9: ου is ou, oy after an accented vowel",
    greek: "ούτε όυ πράου",
    latin: "oúte óy práou",
    lossy: false,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 2, lines 10–13: γγ, γξ, γχ are nasal, γκ is gk",
    greek: "άγγελος άγκυρα Σφίγξ έγχορδος",
    latin: "ángelos ágkyra Sfínx énchordos",
    lossy: false,
  },
  {
    preset: "iso-843-type-2",
    rule:
      "Table 2, lines 32–33, notes 5–7: μπ is b at either end of a word, mp inside",
    greek: "μπαμπάς κλαμπ λόμπι",
    latin: "bampás klab lómpi",
    lossy: false,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 2, line 35: ντ is nt",
    greek: "ντομάτα",
    latin: "ntomáta",
    lossy: false,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 2, lines 23 and 52: η is i, ω is o",
    greek: "ημέρα ώρα",
    latin: "iméra óra",
    lossy: true,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 1, note 11, with Table 2: capitals",
    greek: "ΕΥΡΩΠΗ ΘΑΛΑΣΣΑ ΜΠΑΜΠΑΣ",
    latin: "EVROPI THALASSA BAMPAS",
    lossy: true,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 3: perispomeni, ypogegrammeni, psili, daseia",
    greek: "τοῦ ᾠδῇ ῥῆμα",
    latin: "toû ’o̧dî̧ rhîma",
    lossy: true,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 2, line 48: υι is yi",
    greek: "υιός",
    latin: "yiós",
    lossy: false,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 3: question mark and ano teleia",
    greek: ";·",
    latin: "?;",
    lossy: false,
  },
  {
    preset: "iso-843-type-2",
    rule: "Table 4: digamma and yot",
    greek: "ϝ ϳ",
    latin: "w j",
    lossy: false,
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

Deno.test("BnF unmarked uppercase archaic letters retain their case", () => {
  assertNfcEquals(
    convert("Ϛ Ϡ", "greek", "transliteration", { preset: "bnf-core" }),
    "C̄ S̄",
  );
});

Deno.test("enotikon transliteration only affects Latin output", () => {
  const options = { preset: "iso-843-type-1" } as const;
  assertNfcEquals(convert("‿", "greek", "greek", options), "‿");
  assertNfcEquals(convert("‿", "greek", "beta-code", options), "‿");
  assertNfcEquals(convert("-", "transliteration", "greek", options), "‐");
  assertEquals(
    convertDetailed("‿", "greek", "transliteration", options).losses.map(
      (loss) => loss.code,
    ),
    ["unrepresented-literal"],
  );
});

Deno.test("BnF chi digram wins over standalone lunate sigma", () => {
  const letters = parse("ch c c̄", "transliteration", { preset: "bnf-core" })
    .filter((token) => token.kind === "grapheme")
    .map((token) => token.letter);
  assertEquals(letters, ["chi", "sigma", "stigma"]);
  assertNfcEquals(
    convert("Chará", "transliteration", "greek", { preset: "bnf-core" }),
    "Χαρά",
  );
  assertNfcEquals(
    convert("c̄", "transliteration", "greek", { preset: "bnf-core" }),
    "ϛ",
  );
});

Deno.test("ISO undefined archaic mappings are rejected by a bound converter", () => {
  const converter = createConverter({
    preset: "iso-843-type-1",
    outOfScopeBehavior: "reject",
  });
  let diagnostics: readonly { code: string; character: string }[] = [];
  try {
    converter.convert("ϛϟϙϡ", "greek", "transliteration");
  } catch (error) {
    diagnostics = (error as { diagnostics: typeof diagnostics }).diagnostics;
  }
  assertEquals(diagnostics.map(({ code, character }) => [code, character]), [
    ["undefined-preset-mapping", "stigma"],
    ["undefined-preset-mapping", "koppa"],
    ["unresolved-preset-mapping", "archaic-koppa"],
    ["undefined-preset-mapping", "sampi"],
  ]);
});
