import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed, reencode } from "../src/mod.ts";
import { parse } from "../src/document.ts";

test("reads the overline of abbreviations and numerals as a mark", () => {
  for (
    const [text, format] of [
      ["θ̅ς̅", "greek"],
      ["th̅s̅", "transliteration"],
      ["<qs>", "beta-code"],
    ] as const
  ) {
    assertEquals(
      parse(text, format).map((token) =>
        token.kind === "grapheme" && token.diacritics.has("overline")
      ),
      [true, true],
      text,
    );
  }
  for (
    const [greek, beta, latin] of [
      ["θ̅ς̅ κ̅ς̅", "<qs> <ks>", "th̅s̅ k̅s̅"],
      ["Χ̅Σ̅", "<*x*s>", "CH̅S̅"],
      ["ἀ̅ν̅ο̅ς̅", "<a)nos>", "a̅n̅o̅s̅"],
      ["ϗ̅", "<#1532>", "kai̅"],
    ]
  ) {
    const result = convertDetailed(greek, "greek", "beta-code");
    assertEquals(result.output, beta);
    assertEquals(result.lossy, false, greek);
    assertNfcEquals(convert(beta, "beta-code", "greek"), greek);
    assertNfcEquals(convert(greek, "greek", "transliteration"), latin);
  }
  // Each letter's span takes the `<` or `>` next to it.
  const { spans } = convertDetailed("<qs>", "beta-code", "greek");
  assertEquals(spans.map((span) => [span.inputStart, span.inputEnd]), [
    [0, 2],
    [2, 4],
  ]);
});

test("reads `<` and `>` as an overline only around letters", () => {
  // With a digit, they are codes of other mark-up, kept as text; with
  // whitespace between them, signs.
  for (const beta of ["<1abc>1", "a < b > c"]) {
    assertEquals(
      parse(beta, "beta-code").some((token) =>
        token.kind === "grapheme" && token.diacritics.has("overline")
      ),
      false,
      beta,
    );
  }
  assertNfcEquals(reencode("<1abc>1", "beta-code"), "<1abc>1");
  // The signs themselves are written with their TLG codes.
  assertEquals(convert("α < β > γ", "greek", "beta-code"), "a #18 b #15 g");
  // A `>` before a digit would be another code: the overline is lost there.
  const before = convertDetailed("θ̅5", "greek", "beta-code");
  assertEquals(before.output, "q5");
  assertEquals(before.lossy, true);
});

test("keeps or removes the overline as diacritics.overline says", () => {
  assertNfcEquals(
    convert("θ̅ς̅", "greek", "greek", { greek: { accentuation: "monotonic" } }),
    "θ̅ς̅",
  );
  const removed = convertDetailed("θ̅ς̅", "greek", "greek", {
    diacritics: { overline: "remove" },
  });
  assertNfcEquals(removed.output, "θς");
  assertEquals(
    removed.losses.map((loss) => [loss.code, loss.diacritic]),
    [["removed-diacritic", "overline"], ["removed-diacritic", "overline"]],
  );
  // A preset that removes every mark removes it too.
  assertNfcEquals(
    convert("θ̅ς̅", "greek", "transliteration", { preset: "ala-lc-ancient" }),
    "ths",
  );
});
