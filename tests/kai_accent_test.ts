import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed, reencode } from "../src/mod.ts";
import type { KaiAccent } from "../src/mod.ts";

const latin = (text: string, kaiAccent: KaiAccent) =>
  convert(text, "greek", "transliteration", { greek: { kaiAccent } });

const letters = (text: string, kaiAccent: KaiAccent) =>
  reencode(text, "greek", { greek: { kaiAccent, ligatures: "standard" } });

test("writes no accent on the καί of ϗ by default", () => {
  assertNfcEquals(latin("ϗ τοῦ ϗ τινες ϗ,", "none"), "kai toũ kai tines kai,");
  assertNfcEquals(
    convert("ϗ τοῦ", "greek", "transliteration"),
    "kai toũ",
  );
});

test("writes the grave everywhere under the Byzantine convention", () => {
  assertNfcEquals(
    letters("ϗ τοῦ ϗ τινες ϗ, Ϗ ὁ ϗ", "byzantine"),
    "καὶ τοῦ καὶ τινες καὶ, Καὶ ὁ καὶ",
  );
});

test("follows modern editions under the modern convention", () => {
  for (
    const [text, expected] of [
      // A word with an accent, a proclitic, ἔστι, and τίς take the grave.
      ["ϗ τοῦ", "καὶ τοῦ"],
      ["ϗ ὁ", "καὶ ὁ"],
      ["ϗ ἔστι", "καὶ ἔστι"],
      ["ϗ τίς", "καὶ τίς"],
      // So does the article οἱ, though Homer's pronoun οἱ is enclitic.
      ["ϗ οἱ", "καὶ οἱ"],
      // An enclitic without accent, or elided, takes the acute.
      ["ϗ τινες", "καί τινες"],
      ["ϗ ἐστι", "καί ἐστι"],
      ["ϗ πῃ", "καί πῃ"],
      ["ϗ κως", "καί κως"],
      ["ϗ μ’ εἶδε", "καί μ’ εἶδε"],
      ["ϗ σ’ εἶδε", "καί σ’ εἶδε"],
      ["ϗ ῥ’ ἔβη", "καί ῥ’ ἔβη"],
      // Another elided word takes the grave, τιν’ among them.
      ["ϗ δ’ ἔβη", "καὶ δ’ ἔβη"],
      ["ϗ τιν’ εἶδε", "καὶ τιν’ εἶδε"],
      // A pause and the end of the text take the acute.
      ["ϗ, τοῦ", "καί, τοῦ"],
      ["ϗ· τοῦ", "καί· τοῦ"],
      ["τοῦ ϗ", "τοῦ καί"],
      // A line break, a bracket, a dash, and a numeral are no pause.
      ["ϗ\nτοῦ", "καὶ\nτοῦ"],
      ["ϗ [τοῦ]", "καὶ [τοῦ]"],
      ["ϗ — τοῦ", "καὶ — τοῦ"],
      ["ϗ ιβʹ τοῦ", "καὶ ιβʹ τοῦ"],
      ["ϗ ϗ τοῦ", "καὶ καὶ τοῦ"],
    ]
  ) {
    // A circumflex marks the text as accented in the polytonic way.
    assertNfcEquals(
      letters(`τοῦ ${text}`, "modern"),
      `τοῦ ${expected}`,
      text,
    );
  }
  assertNfcEquals(
    latin("ϗ τινες ϗ τοῦ ϗ", "modern"),
    "kaí tines kaì toũ kaí",
  );
});

test("accents καί only where ϗ is written as letters", () => {
  const modern = { greek: { kaiAccent: "modern" } } as const;
  // Greek and Beta Code write the sign unless ligatures are written as
  // letters.
  assertNfcEquals(reencode("ϗ τοῦ", "greek", modern), "ϗ τοῦ");
  assertEquals(convert("ϗ τοῦ", "greek", "beta-code", modern), "#1532 tou=");
  assertEquals(
    convert("ϗ τινες ϗ τοῦ", "greek", "beta-code", {
      greek: { kaiAccent: "modern", ligatures: "standard" },
    }),
    "kai/ tines kai\\ tou=",
  );
  // From Beta Code, as from Greek.
  assertNfcEquals(
    convert("#1532 tou=", "beta-code", "transliteration", modern),
    "kaì toũ",
  );
  // The letters καί, spelled out in the source, keep the accent they have.
  assertNfcEquals(latin("και τοῦ", "modern"), "kai toũ");
});

test("keeps the accent of ϗ and writes none where the text has none", () => {
  // An accent written on the sign.
  assertNfcEquals(letters("ϗ́ τοῦ", "modern"), "καί τοῦ");
  // Capitals, which have no accents.
  assertNfcEquals(letters("ΤΟΥ ϗ ΤΗΣ τοῦ", "byzantine"), "ΤΟΥ καὶ ΤΗΣ τοῦ");
  assertNfcEquals(letters("ϏΤΟΥ τοῦ", "byzantine"), "ΚΑΙΤΟΥ τοῦ");
  // A text with no grave and no circumflex, which may be monotonic.
  assertNfcEquals(letters("ϗ λόγος", "modern"), "και λόγος");
  // Monotonic output has no accent on a word of one syllable.
  assertNfcEquals(
    reencode("ϗ τοῦ", "greek", {
      greek: {
        kaiAccent: "modern",
        ligatures: "standard",
        accentuation: "monotonic",
      },
    }),
    "και του",
  );
});

test("reports each accent written as an added diacritic", () => {
  const result = convertDetailed("ϗ τοῦ", "greek", "transliteration", {
    greek: { kaiAccent: "byzantine" },
  });
  assertNfcEquals(result.output, "kaì toũ");
  assertEquals(
    result.losses.map(({ code, offset, length, diacritic, glyphVariant }) => [
      code,
      offset,
      length,
      diacritic ?? glyphVariant,
    ]),
    [
      ["removed-glyph-variant", 0, 1, "kai-symbol"],
      ["added-diacritic", 0, 1, "grave"],
    ],
  );
  // The output reads back with its accent, and converts again alike.
  assertNfcEquals(
    convert("kaì toũ", "transliteration", "transliteration", {
      greek: { kaiAccent: "byzantine" },
    }),
    "kaì toũ",
  );
});
