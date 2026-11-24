import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import { convert, convertDetailed, reencode } from "../src/mod.ts";

// ISO 843 writes the smooth breathing as an apostrophe before the vowel group
// of a word (Table 3), and the coronis as an apostrophe after its vowel,
// inside the word: both presets read them back.
const TYPE_1 = { preset: "iso-843-type-1" } as const;
const TYPE_2 = { preset: "iso-843-type-2" } as const;

test("reads the apostrophe of the smooth breathing back", () => {
  for (
    const [latin, greek] of [
      ["Hī ’Athī́na ’eînai hī prōteúousa", "Ἡ Ἀθήνα εἶναι ἡ πρωτεύουσα"],
      // The breathing goes to the second vowel of a diphthong, as the `h`
      // of the rough one does.
      ["’Aischýlos", "Αἰσχύλος"],
      ["’ATHĪNA ’EÎNAI", "ἈΘΗΝΑ ΕἾΝΑΙ"],
      // An elision ends its word: the apostrophe after it is the next word's
      // breathing.
      ["’ap’ ’autoû", "ἀπ’ αὐτοῦ"],
      // Before a consonant, it marks a prodelision, and stays.
      ["’ō̂ ’gathé", "ὦ ’γαθέ"],
      // Inside quotation marks.
      ["‘’Egṓ’", "‘Ἐγώ’"],
    ] as const
  ) {
    assertNfcEquals(convert(latin, "transliteration", "greek", TYPE_1), greek);
  }
  // Only the apostrophe the writer writes: an ASCII one, or U+02BC, is an
  // apostrophe, as an opening quotation mark typed in ASCII is.
  for (const apostrophe of ["'", "ʼ"]) {
    assertNfcEquals(
      convert(`${apostrophe}Athī́na`, "transliteration", "greek", TYPE_1),
      "’Αθήνα",
    );
  }
});

test("a `y` after the apostrophe keeps its hiatus", () => {
  // As `h` does (`haytmī́` is ἁυτμή), the apostrophe precedes the group, and
  // the breathing it reads stays on the first vowel that `y` parts from the
  // next: no diaeresis is written.
  const result = convertDetailed("ἀυτμή", "greek", "transliteration", TYPE_1);
  assertNfcEquals(result.output, "’aytmī́");
  assertEquals(result.lossy, false);
  assertNfcEquals(
    convert("’aytmī́", "transliteration", "greek", TYPE_1),
    "ἀυτμή",
  );
});

test("a spacing breathing sign keeps the breathings after it in place", () => {
  // The sign joins the capital after it, which moves the tokens read after:
  // the breathings of the apostrophe and of a `y` follow their vowels.
  for (
    const [latin, greek] of [
      ["῾O ’Aischýlos", "Ὁ Αἰσχύλος"],
      ["῾O ῾O ’a ai", "Ὁ Ὁ ἀ αι"],
    ] as const
  ) {
    assertNfcEquals(convert(latin, "transliteration", "greek", TYPE_1), greek);
  }
  assertNfcEquals(
    convert("῾O aytmḗ", "transliteration", "greek"),
    "Ὁ ἀυτμή",
  );
});

test("reads the apostrophe of the coronis back", () => {
  for (
    const greek of ["κἀγώ", "τοὔνομα", "ταὐτό", "τὠυτὸ", "τἀγαθά"]
  ) {
    const result = convertDetailed(greek, "greek", "transliteration", TYPE_1);
    assertEquals(result.lossy, false, greek);
    assertNfcEquals(
      convert(result.output, "transliteration", "greek", TYPE_1),
      greek,
    );
  }
  assertNfcEquals(convert("κἀγώ", "greek", "transliteration", TYPE_1), "ka’gṓ");
  // A vowel group bears one breathing or coronis, the coronis of a crasis
  // follows a consonant, and the `h` of a rough breathing is no letter that
  // follows a coronis: the apostrophe is one.
  for (
    const [latin, greek] of [
      ["’ai’n", "αἰ’ν"],
      ["a’n", "α’ν"],
      ["«a’n»", "«α’ν»"],
      ["ka’ha", "κα’ἁ"],
    ] as const
  ) {
    assertNfcEquals(convert(latin, "transliteration", "greek", TYPE_1), greek);
  }
  assertEquals(convert("κα’ἁ", "greek", "transliteration", TYPE_1), "ka’ha");
  // Before an archaic letter as well.
  for (const options of [TYPE_1, TYPE_2]) {
    const stigma = convertDetailed("κἀϛ", "greek", "transliteration", options);
    assertNfcEquals(stigma.output, "ka’c̄");
    assertEquals(stigma.lossy, false);
  }
  // At the end of a word, an apostrophe after a vowel is a closing quotation
  // mark as well: it stays one, and the coronis is reported lost.
  const final = convertDetailed("χὠ", "greek", "transliteration", TYPE_1);
  assertEquals(final.output, "chō’");
  assertEquals(
    final.losses.map((loss) => [loss.code, loss.diacritic]),
    [["removed-diacritic", "coronis"]],
  );
});

test("converts polytonic Greek back and forth under ISO 843 Type 1", () => {
  const thucydides = "Θουκυδίδης Ἀθηναῖος ξυνέγραψε τὸν πόλεμον τῶν " +
    "Πελοποννησίων καὶ Ἀθηναίων, ὡς ἐπολέμησαν πρὸς ἀλλήλους, ἀρξάμενος " +
    "εὐθὺς καθισταμένου";
  const result = convertDetailed(
    thucydides,
    "greek",
    "transliteration",
    TYPE_1,
  );
  assertEquals(result.lossy, false);
  assertNfcEquals(
    convert(result.output, "transliteration", "greek", TYPE_1),
    thucydides,
  );
});

test("writes an apostrophe of the source apart from the marks", () => {
  // Where the apostrophe would read back as a smooth breathing or a coronis,
  // the writer writes U+02BC, which reads back as the apostrophe it is.
  for (
    const [greek, latin] of [
      ["’Αθήνα", "ʼAthī́na"],
      ["τοῦ’τον", "toûʼton"],
      ["σε’Χ", "seʼCH"],
      // After the apostrophe of a coronis, which reads back as one.
      ["κἀ’γώ", "ka’ʼgṓ"],
      // One apostrophe before another, which would read back as a breathing.
      ["κα’’α", "kaʼʼa"],
    ] as const
  ) {
    const result = convertDetailed(greek, "greek", "transliteration", TYPE_1);
    assertNfcEquals(result.output, latin);
    assertEquals(result.lossy, false, greek);
    assertEquals(
      convert(result.output, "transliteration", "transliteration", TYPE_1),
      result.output,
    );
  }
  // An elision is written as it is: the apostrophe follows a consonant.
  assertNfcEquals(
    convert("ἀλλ’ ἐγώ", "greek", "transliteration", TYPE_1),
    "’all’ ’egṓ",
  );
});

test("each option reads the apostrophe of its own mark", () => {
  const smooth = {
    transliteration: { smoothBreathing: "apostrophe" },
  } as const;
  const coronis = { transliteration: { coronis: "apostrophe" } } as const;
  assertNfcEquals(
    convert("’Athḗna ka’gṓ", "transliteration", "greek", smooth),
    "Ἀθήνα κα’γώ",
  );
  assertNfcEquals(
    convert("Athḗna ka’gṓ", "transliteration", "greek", coronis),
    "Ἀθήνα κἀγώ",
  );
  // Under the coronis alone, the smooth breathing is inferred at the start of
  // a word: the apostrophe after it is a prodelision.
  for (const greek of ["κἀγώ", "ὦ’γαθέ"]) {
    const latin = convert(greek, "greek", "transliteration", coronis);
    assertNfcEquals(
      convert(latin, "transliteration", "greek", coronis),
      greek,
    );
  }
  // Where `v` and `f` read back as an upsilon, the coronis follows them.
  const vf = {
    transliteration: { upsilon: "y-with-ou-v-f", coronis: "apostrophe" },
  } as const;
  const crasis = convertDetailed(
    "ταὐτά ταυ’τα",
    "greek",
    "transliteration",
    vf,
  );
  assertEquals(crasis.lossy, false);
  assertNfcEquals(
    convert(crasis.output, "transliteration", "greek", vf),
    "ταὐτά ταυ’τα",
  );
});

test("keeps conversions through ISO 843 idempotent", () => {
  // Strings found by random testing: what the writer writes as an apostrophe
  // must read back as what it wrote.
  for (const options of [TYPE_1, TYPE_2]) {
    for (
      const greek of [
        "ἠὈ’σὸὨ",
        "Ὡὐ’‘",
        "υ ’ἉιῊΙͅ",
        "χβεῪ’πφ’α",
        "τού’μπαλιν",
        "‘͵ΑΥ̓«",
        "Ὠὕξ",
        "’ἰͅΥ",
        "νι’ϛͅ",
        "υϙ̓ͅΗ’υ",
        "Ὁ̓Υ",
        "ὠυ",
        "͵ὠΎ",
        "ὠυπϞʹ",
        "ῃύ’ΰ Ὀϛͅοιῃύ’ΰ",
        "τᾧῖʼΧ",
        "ᾐ’ὠ̈υ",
        "πἁὀΈβ",
        "ϛᾑωιἤγ",
        "ϛὠυʹ",
      ]
    ) {
      const latin = convert(greek, "greek", "transliteration", options);
      assertEquals(
        convert(latin, "transliteration", "transliteration", options),
        latin,
        greek,
      );
    }
    for (
      const latin of [
        "o’Hifva",
        "’ŌY’ps",
        "e’hy’ch",
        "ka’ha",
        "’ai᾽u",
        "1’ō᾽h",
      ]
    ) {
      const greek = convert(latin, "transliteration", "greek", options);
      assertEquals(convert(greek, "greek", "greek", options), greek, latin);
      const once = convert(
        latin,
        "transliteration",
        "transliteration",
        options,
      );
      assertEquals(
        convert(once, "transliteration", "transliteration", options),
        once,
        latin,
      );
    }
  }
});

test("an apostrophe read as a mark joins the span of its vowel", () => {
  const input = "’Athī́na ka’gṓ";
  const result = convertDetailed(input, "transliteration", "greek", TYPE_1);
  assertNfcEquals(result.output, "Ἀθήνα κἀγώ");
  // `’A` gives `Ἀ`.
  assertEquals(
    [result.spans[0].inputStart, result.spans[0].inputEnd],
    [0, 2],
  );
  // The apostrophe of the coronis shares the span of the alpha.
  const coronis = input.lastIndexOf("’");
  const span = result.spans.find((candidate) =>
    candidate.inputStart <= coronis && coronis < candidate.inputEnd
  )!;
  assertEquals(input.slice(span.inputStart, span.inputEnd), "a’");
  assertEquals(
    result.output.slice(span.outputStart, span.outputEnd).normalize("NFC"),
    "ἀ",
  );
});

test("re-encodes a polytonic ISO 843 transliteration as monotonic", () => {
  assertNfcEquals(
    reencode("Hi ’Athína ’eînai hi protévousa", "transliteration", {
      ...TYPE_2,
      greek: { accentuation: "monotonic" },
    }),
    "I Athína eínai i protévousa",
  );
});
