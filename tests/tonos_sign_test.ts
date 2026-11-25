import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed, reencode } from "../src/mod.ts";
import { applyGreekOrthography, encode, parse } from "../src/document.ts";

// The Greek keyboard has no keraia: it types the spacing tonos U+0384 for
// one (`Β΄ Παγκόσμιος`), and older encodings typed it before a capital for
// its tonos (`΄Ελληνας`).

const ALA_LC = { preset: "ala-lc-modern" } as const;

test("a spacing tonos after the letters of a numeral is its keraia", () => {
  for (
    const [greek, betaCode, number] of [
      ["Β΄ Παγκόσμιος", "*b# *pagko/smios", "2 Pankosmios"],
      ["Γ΄ Λυκείου", "*g# *lukei/ou", "3 Lykeiou"],
      ["Κωνσταντίνος ΙΑ΄", "*kwnstanti/nos *i*a#", "Kōnstantinos 11"],
      ["α΄ έκδοση", "a# e/kdosh", "1 ekdosē"],
      ["του ΙΘ΄ αιώνα", "tou *i*q# aiw/na", "tou 19 aiōna"],
      ["͵αϠ΄", "#22a*#5#", "1900"],
    ]
  ) {
    // Greek output writes it as typed, and nothing is lost.
    const greekResult = convertDetailed(greek, "greek", "greek");
    assertEquals(greekResult.output, greek);
    assertEquals(greekResult.lossy, false);
    assertEquals(convert(greek, "greek", "beta-code"), betaCode);
    assertEquals(convert(greek, "greek", "transliteration", ALA_LC), number);
    // The other formats write their keraia, which reads back as U+0374: the
    // sign typed is lost.
    const losses = convertDetailed(greek, "greek", "beta-code").losses;
    assertEquals(
      losses.map(({ code, offset }) => [code, offset]),
      [["unrepresented-literal", greek.indexOf("\u0384")]],
    );
    // It reads as the keraia U+0374 does, which Greek output keeps too.
    const keraia = greek.replace("΄", "ʹ");
    assertEquals(
      convert(greek, "greek", "beta-code"),
      convert(keraia, "greek", "beta-code"),
    );
    assertEquals(reencode(keraia, "greek"), keraia.normalize());
  }
  // A final sigma before it is the units of a numeral, a stigma.
  assertEquals(convert("ις΄", "greek", "transliteration", ALA_LC), "16");
  // The document holds the keraia, whose spelling Greek output keeps, from
  // the view of the Greek orthography too.
  const document = parse("Β΄", "greek");
  assertEquals(document[1], { kind: "literal", value: "\u02B9" });
  assertEquals(encode(applyGreekOrthography(document), "greek"), "Β΄");
});

test("a spacing tonos for an apostrophe stays a sign", () => {
  for (
    const text of [
      "σ΄ αγαπώ",
      "θ΄ ακούσω",
      "μ΄ αρέσει",
      "κι΄ εγώ",
      "απ΄ όλα",
      "γι΄ αυτό",
      // Whatever the case of the letters, or their marks, which the options
      // of a conversion may change: a capital alone before a word with a
      // vowel stays the sign (`Θ΄ αιώνας`, the ninth century).
      "Σ΄ αγαπώ",
      "ΣΑΣ ΕΙΠΑ: ΣΑΣ ΚΙ΄ ΕΓΩ",
      "του Θ΄ αιώνα",
    ]
  ) {
    assertEquals(reencode(text, "greek"), text);
    assertEquals(
      convert(text, "greek", "transliteration", ALA_LC).includes("΄"),
      true,
      text,
    );
  }
  // Before a consonant, it is the keraia.
  assertEquals(
    convert("σ΄ το σπίτι", "greek", "transliteration", ALA_LC),
    "200 to spiti",
  );
});

test("a spacing tonos before a capital vowel is the capital's", () => {
  for (
    const [spaced, joined] of [
      ["΄Ελληνας", "Έλληνας"],
      ["Ο ΄Ελληνας", "Ο Έλληνας"],
      ["«΄Αρτα»", "«Άρτα»"],
    ]
  ) {
    assertNfcEquals(reencode(spaced, "greek"), joined);
    const result = convertDetailed(spaced, "greek", "transliteration", {
      preset: "iso-843-type-1",
    });
    assertEquals(
      result.output,
      convert(joined, "greek", "transliteration", { preset: "iso-843-type-1" }),
    );
    assertEquals(result.lossy, false);
  }
  // Every format reads it so.
  assertNfcEquals(
    convert("΄Ellīnas", "transliteration", "greek", {
      preset: "iso-843-type-1",
    }),
    "Έλληνας",
  );
  assertNfcEquals(convert("΄*ellhnas", "beta-code", "greek"), "Έλληνας");
  // A breathing and the accent are one capital's (`΄Ἀ`, as `῎Α`); a rho
  // takes no accent, and a capital with another accent no second one, so
  // that the sign stays apart, as it reads back.
  assertNfcEquals(reencode("΄Ἀνθρωπος", "greek"), "Ἄνθρωπος");
  assertEquals(reencode("΄Ρόδος", "greek"), "΄Ρόδος");
  assertNfcEquals(reencode("΄Ὰ", "greek"), "΄\u200CᾺ");
});
