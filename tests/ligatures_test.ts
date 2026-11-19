import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed, reencode } from "../src/mod.ts";
import { parse } from "../src/document.ts";

const lettersOf = (text: string, format = "greek" as const) =>
  parse(text, format).map((token) =>
    token.kind === "grapheme"
      ? `${token.uppercase ? "^" : ""}${token.letter}${
        token.glyphVariant === undefined ? "" : `:${token.glyphVariant}`
      }`
      : token.value
  );

test("reads ϗ as και and ȣ as ου, noting the sign on the first letter", () => {
  assertEquals(lettersOf("ϗ"), ["kappa:kai-symbol", "alpha", "iota"]);
  assertEquals(lettersOf("Ϗ"), ["^kappa:kai-symbol", "alpha", "iota"]);
  assertEquals(lettersOf("ȣ"), ["omicron:ou-ligature", "upsilon"]);
  // A capital sign begins a word, or is set in capitals before a capital.
  assertEquals(lettersOf("Ȣτ"), ["^omicron:ou-ligature", "upsilon", "tau"]);
  assertEquals(lettersOf("ȢΤ"), [
    "^omicron:ou-ligature",
    "^upsilon",
    "^tau",
  ]);
  // Beta Code: the TLG codes of ϗ, Ϗ, and Ȣ.
  assertEquals(lettersOf("#1532 #1531 #1521", "beta-code" as never), [
    "kappa:kai-symbol",
    "alpha",
    "iota",
    " ",
    "^kappa:kai-symbol",
    "alpha",
    "iota",
    " ",
    "^omicron:ou-ligature",
    "upsilon",
  ]);
  // The marks after a sign are its last letter's; no accent is supplied.
  assertNfcEquals(convert("ϗ ϗ́ ȣ̓κ", "greek", "transliteration"), "kai kaí ouk");
  // The letters share the sign's span.
  const { spans } = convertDetailed("αϗ", "greek", "transliteration");
  assertEquals(spans.map((span) => [span.inputStart, span.inputEnd]), [
    [0, 1],
    [1, 2],
    [1, 2],
    [1, 2],
  ]);
});

test("writes ϗ and ȣ again where the source has them", () => {
  const text = "ἐγὼ ϗ σύ, Ϗ ὁ ἀκȣ́ων Ȣ\u0314\u0342τος";
  assertNfcEquals(reencode(text, "greek"), text);
  assertNfcEquals(
    reencode(text, "greek", { greek: { ligatures: "standard" } }),
    "ἐγὼ και σύ, Και ὁ ἀκούων Οὗτος",
  );
  // Beta Code has codes for ϗ, Ϗ, and Ȣ, but not ȣ.
  const beta = convertDetailed(text, "greek", "beta-code");
  assertEquals(
    beta.output,
    "e)gw\\ #1532 su/, #1531 o( a)kou/wn #1521(=tos",
  );
  assertEquals(
    beta.losses.map((loss) => [loss.code, loss.glyphVariant]),
    [["removed-glyph-variant", "ou-ligature"]],
  );
  assertNfcEquals(
    convert(beta.output, "beta-code", "greek"),
    text.replace("ȣ́", "ού"),
  );
  // Transliteration writes the letters, and reports each of the four signs.
  const latin = convertDetailed(text, "greek", "transliteration");
  assertNfcEquals(latin.output, "egṑ kai sý, Kai ho akoúōn Hoũtos");
  assertEquals(
    latin.losses.filter((loss) => loss.code === "removed-glyph-variant")
      .length,
    4,
  );
  // No sign is written where the source has the letters.
  assertNfcEquals(reencode("και οὐκ", "greek"), "και οὐκ");
});

test("reads a stigma between two letters as στ on request", () => {
  const ligature = { greek: { stigma: "ligature" } } as const;
  const text = "ἐϛὶ ιϛʹ ιϛ ϛʹ";
  assertNfcEquals(
    convert(text, "greek", "transliteration"),
    "ec̄ì ic̄ʹ ic̄ c̄ʹ",
  );
  // Only between two letters: a numeral stays one.
  assertNfcEquals(
    convert(text, "greek", "transliteration", ligature),
    "estì ic̄ʹ ic̄ c̄ʹ",
  );
  assertEquals(lettersOf("ἐϛὶ").length, 3);
  assertNfcEquals(reencode(text, "greek", ligature), text);
  assertNfcEquals(
    reencode(text, "greek", {
      greek: { stigma: "ligature", ligatures: "standard" },
    }),
    "ἐστὶ ιϛʹ ιϛ ϛʹ",
  );
  // In every format, so that a stigma read from Beta Code or
  // transliteration is read again alike.
  assertNfcEquals(
    convert("e)#2i\\", "beta-code", "transliteration", ligature),
    "estì",
  );
  assertNfcEquals(
    convert("ec̄ì", "transliteration", "greek", {
      greek: { stigma: "ligature", ligatures: "standard" },
    }),
    "ἐστὶ",
  );
  // `στ` is never written `ϛ` where the source has the letters.
  assertNfcEquals(reencode("ἐστὶ", "greek", ligature), "ἐστὶ");
});
