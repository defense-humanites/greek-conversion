import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed, reencode } from "../src/mod.ts";
import { applyGreekOrthography, encode, parse } from "../src/document.ts";

const OMIT = { greek: { capitalMarks: "omit" } } as const;
const UPPERCASE = {
  text: { letterCase: "uppercase" },
  greek: { capitalMarks: "omit" },
} as const;

test("words in capitals take no accent by default, but on request", () => {
  const uppercase = { text: { letterCase: "uppercase" } } as const;
  assertNfcEquals(
    reencode("Μάιος, Ἀθῆναι", "greek", uppercase),
    "ΜΑΪΟΣ, ΑΘΗΝΑΙ",
  );
  assertNfcEquals(
    reencode("Μάιος, Ἀθῆναι", "greek", {
      ...uppercase,
      greek: { capitalMarks: "preserve" },
    }),
    "ΜΆΙΟΣ, ἈΘΗ͂ΝΑΙ",
  );
  assertNfcEquals(convert("*MA/IOS", "beta-code", "greek"), "Μάιος");
  assertNfcEquals(convert("*M*A/*I*O*S", "beta-code", "greek"), "ΜΑΪΟΣ");
});

test("words in capitals take no accent or breathing", () => {
  for (
    const [text, capitals, icu] of [
      // The usage of Greek, as `toLocaleUpperCase("el")` writes it.
      [
        "Μάιος, νεράιδα, Αθήνα ή Πάτρα;",
        "ΜΑΪΟΣ, ΝΕΡΑΪΔΑ, ΑΘΗΝΑ Ή ΠΑΤΡΑ;",
        true,
      ],
      ["Ἀθῆναι, Ἅιδης, ὁ λόγος, κἀγώ", "ΑΘΗΝΑΙ, ΑΪΔΗΣ, Ο ΛΟΓΟΣ, ΚΑΓΩ", true],
      // The disjunctive ή keeps its accent, which the article has not.
      ["ἢ ἐδῶ ἢ ἐκεῖ, ἡ γῆ", "Ή ΕΔΩ Ή ΕΚΕΙ, Η ΓΗ", true],
      // A diaeresis stays, and none is written where a diphthong was not
      // parted, nor after a vowel that ends one (`εύι`, where ICU writes
      // `ΕΥΪ`).
      ["προϋπόθεση, ἄυλος, εύι, ᾱ̓́", "ΠΡΟΫΠΟΘΕΣΗ, ΑΫΛΟΣ, ΕΥΙ, Α", false],
    ] as const
  ) {
    const output = reencode(text, "greek", UPPERCASE);
    assertNfcEquals(output, capitals);
    assertEquals(reencode(output, "greek", UPPERCASE), output);
    if (icu) {
      assertEquals(
        reencode(text.toLocaleUpperCase("el"), "greek", OMIT),
        output.normalize(),
      );
    }
  }
});

test("only words in capitals lose their marks", () => {
  // A capital that begins a word in small letters keeps its marks; a word
  // of one letter takes the case of the words around it.
  assertNfcEquals(
    reencode("ΜΆΙΟΣ καὶ Ἕλληνες, Ὁ λόγος, Ο ΛΌΓΟΣ, ΤΟ Ά ΤΟ", "greek", OMIT),
    "ΜΑΪΟΣ καὶ Ἕλληνες, Ὁ λόγος, Ο ΛΟΓΟΣ, ΤΟ Α ΤΟ",
  );
  // Letters of another script are of the word, as they read back.
  assertNfcEquals(
    reencode("ΜΆΙΟΣabc ΜΆΙΟΣABC", "greek", OMIT),
    "ΜΆΙΟΣabc ΜΑΪΟΣABC",
  );
  // Beta Code and transliteration write the marks on capitals.
  assertEquals(convert("ΜΆΙΟΣ", "greek", "beta-code", OMIT), "*m*/a*i*o*s");
  assertNfcEquals(
    convert("ΑΘΉΝΑ", "greek", "transliteration", {
      ...OMIT,
      preset: "iso-843-type-2",
    }),
    "ATHÍNA",
  );
});

test("the iota subscript of capitals follows iotaSubscript", () => {
  assertNfcEquals(reencode("ᾠδῇ", "greek", UPPERCASE), "ῼΔῌ");
  assertEquals(
    reencode("ᾠδῇ", "greek", {
      ...UPPERCASE,
      greek: { capitalMarks: "omit", iotaSubscript: "capital-adscript" },
    }),
    "ΩΙΔΗΙ",
  );
});

test("the marks of capitals removed and written are reported", () => {
  const result = convertDetailed("Μάιος", "greek", "greek", UPPERCASE);
  assertEquals(result.output, "ΜΑΪΟΣ");
  assertEquals(
    result.losses.map(({ code, diacritic }) => [code, diacritic]),
    [
      ["changed-case", undefined],
      ["removed-diacritic", "acute"],
      ["changed-case", undefined],
      ["added-diacritic", "diaeresis"],
      ["changed-case", undefined],
      ["changed-case", undefined],
    ],
  );
  // A numeral in capitals is read once their marks are removed.
  assertEquals(
    reencode("Ἰβʹ ἀγαθοί", "greek", {
      ...UPPERCASE,
      text: { letterCase: "uppercase", numerals: "decimal" },
    }),
    "12 ΑΓΑΘΟΙ",
  );
  // The view of the Greek orthography writes them so.
  assertNfcEquals(
    encode(applyGreekOrthography(parse("ΜΆΙΟΣ", "greek"), OMIT), "greek"),
    "ΜΑΪΟΣ",
  );
});
