import { convert, reencode } from "../src/mod.ts";
import { assertNfcEquals } from "./assertions.ts";

Deno.test("ignores ASCII case when parsing Beta Code letters", () => {
  for (const input of ["a)/nqrwpos", "A)/NQRWPOS", "a)/NqRwPoS"]) {
    assertNfcEquals(convert(input, "beta-code", "greek"), "ἄνθρωπος");
    assertNfcEquals(
      convert(input, "beta-code", "transliteration"),
      "ánthrōpos",
    );
  }
});

Deno.test("uses only the asterisk as the Beta Code uppercase marker", () => {
  assertNfcEquals(convert("a A", "beta-code", "greek"), "α α");
  assertNfcEquals(convert("*a *A", "beta-code", "greek"), "Α Α");
});

Deno.test("places and orders Beta Code diacritics canonically", () => {
  assertNfcEquals(convert("w|=(", "beta-code", "greek"), "ᾧ");
  assertNfcEquals(reencode("w|=(", "beta-code"), "w(=|");
  assertNfcEquals(convert("*(=W|", "beta-code", "greek"), "ᾯ");
  assertNfcEquals(reencode("*(=W|", "beta-code"), "*(=w|");
});

Deno.test("separates semantic case from Beta Code ASCII case", () => {
  assertNfcEquals(
    convert("Ἄνθρωπος", "greek", "beta-code", { preset: "perseus" }),
    "*)/anqrwpos",
  );
  assertNfcEquals(
    convert("Ἄνθρωπος", "greek", "beta-code", { preset: "tlg-core" }),
    "*)/ANQRWPOS",
  );
});

Deno.test("recognizes TLG yot and selects its canonical output", () => {
  assertNfcEquals(convert("#401", "beta-code", "greek"), "ϳ");
  assertNfcEquals(convert("ϳ", "greek", "beta-code"), "j");
  assertNfcEquals(
    convert("ϳ", "greek", "beta-code", { preset: "tlg-core" }),
    "#401",
  );
  assertNfcEquals(
    reencode("j #401", "beta-code", { preset: "tlg-core" }),
    "#401 #401",
  );
});
