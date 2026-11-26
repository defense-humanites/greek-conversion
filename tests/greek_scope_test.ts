import { test } from "node:test";
import {
  assert,
  assertEquals,
  assertNfcEquals,
  assertThrows,
} from "./assertions.ts";
import {
  type ConversionOptions,
  convert,
  convertDetailed,
  createConverter,
  FORMATS,
  OptionError,
  prepareOptions,
} from "../src/mod.ts";
import * as core from "../src/core.ts";
import { greekFormat, greekReader } from "../src/formats/greek.ts";
import {
  transliterationFormat,
  transliterationWriter,
} from "../src/formats/transliteration.ts";

const GREEK_SCOPE = { text: { scope: "greek" } } as const;

/** The options, with the conversion of the Greek passages only. */
function scoped(options: ConversionOptions): ConversionOptions {
  return { ...options, text: { ...options.text, scope: "greek" } };
}

test("converts the Greek passages of a text and copies the rest", () => {
  const cases: [string, string][] = [
    // The punctuation that Greek shares with French or English is copied,
    // glued to a Greek word or not.
    ["Voir λόγος ; cf. ψυχή.", "Voir lógos ; cf. psychḗ."],
    ["see λόγος; also ‘λόγος’, l’ἀνήρ", "see lógos; also ‘lógos’, l’anḗr"],
    ["ça va ? λόγος ·", "ça va ? lógos ·"],
    // A middle dot between the elements of a word, as the Bailly writes it.
    ["λογο·τέχνης", "logo·téchnēs"],
    // The signs that only Greek uses are converted, by their code points:
    // the question mark, the ano teleia, and the koronis.
    ["εἰς Πειραιᾶ;", "eis Peiraiã?"],
    ["λόγος· ἔστι", "lógos; ésti"],
    ["ἀπ᾽ αὐτοῦ", "ap’ autoũ"],
    // The rules see the text around a passage: before a period, a capital
    // is an initial.
    ["Θ. Δημητρίου, p. 3", "Th. Dēmētríou, p. 3"],
    // Nothing but the passages is normalized.
    ["é : ὁ", "é : ho"],
    ["no Greek; at all?", "no Greek; at all?"],
    ["", ""],
  ];
  for (const [input, output] of cases) {
    const converted = convert(input, "greek", "transliteration", GREEK_SCOPE);
    assertEquals(converted, output, input);
  }
});

test("the keraia of a numeral goes with its passage", () => {
  // Normalization makes the Greek keraia U+02B9, which follows the letters
  // of the numeral; the lower keraia is Greek.
  assertEquals(
    convert("αʹ et ͵α", "greek", "beta-code", GREEK_SCOPE),
    "a# et #22a",
  );
  assertEquals(
    convert("αʹ et ͵α", "greek", "transliteration", {
      text: { scope: "greek", numerals: "decimal" },
    }),
    "1 et 1000",
  );
  // Elsewhere, U+02B9 is a letter of another language.
  assertEquals(
    convert("Gorʹkiĭ", "greek", "beta-code", GREEK_SCOPE),
    "Gorʹkiĭ",
  );
});

test("the options apply to the Greek passages only", () => {
  assertEquals(
    convert("Théâtre  décomposé é :  ὁ  λόγος", "greek", "greek", {
      greek: { composition: "decomposed" },
      text: { scope: "greek", whitespace: "collapse", letterCase: "uppercase" },
    }),
    "Théâtre  décomposé é :  Ο  ΛΟΓΟΣ",
  );
  // The Greek question mark and ano teleia, not the French signs.
  assertEquals(
    convert("Πειραιᾶ; et ; λόγος· et ·", "greek", "greek", {
      greek: { questionMark: "greek", anoTeleia: "greek", acute: "tonos" },
      text: { scope: "greek" },
    }),
    "Πειραιᾶ; et ; λόγος· et ·",
  );
  // Beta Code writes Latin letters in its own case; they are copied.
  assertEquals(
    convert("ὁ Watson", "greek", "beta-code", GREEK_SCOPE),
    "o( Watson",
  );
});

test("a text without the punctuation that Greek shares converts as a whole", () => {
  const texts = [
    "Θουκυδίδης Ἀθηναῖος ξυνέγραψε τὸν πόλεμον, ιβʹ ἔτη. τῷ ᾨδῇ",
    "ΘΕΟΣ Θ καὶ ΛΟΓΟΣ\nὉ δὲ 12 ἄνθρωπος",
    "Η Ελληνική ιστορία, οι Έλληνες",
    "ϐίϐλος ϗ ϑεός ͵ασʹ",
  ];
  const optionSets: ConversionOptions[] = [
    {},
    { preset: "ala-lc-ancient" },
    { preset: "iso-843-type-2" },
    { preset: "tlg-core" },
    { greek: { accentuation: "monotonic" } },
    { text: { letterCase: "title" } },
    { text: { numerals: "decimal" } },
    { greek: { composition: "decomposed", acute: "oxia" } },
  ];
  for (const text of texts) {
    for (const options of optionSets) {
      for (const to of FORMATS) {
        assertEquals(
          convert(text, "greek", to, scoped(options)),
          convert(text, "greek", to, options),
          `${text} → ${to} ${JSON.stringify(options)}`,
        );
      }
    }
  }
});

test("convertDetailed() reports the Greek passages and copies the rest", () => {
  const input = "Voir ϐίϐλος ; cf. « ἀπ’ αὐτοῦ » (Θ.)";
  for (const to of FORMATS) {
    const result = convertDetailed(input, "greek", to, GREEK_SCOPE);
    assertEquals(result.output, convert(input, "greek", to, GREEK_SCOPE));
    // The text copied keeps its spans' text; the losses are the passages'.
    for (const span of result.spans) {
      const read = input.slice(span.inputStart, span.inputEnd);
      if (!/[Ͱ-Ͽἀ-῿]/u.test(read)) {
        assertEquals(
          result.output.slice(span.outputStart, span.outputEnd),
          read,
          `${to}: ${read}`,
        );
      }
    }
    for (const loss of result.losses) {
      assert(
        /[Ͱ-Ͽἀ-῿]/u.test(input[loss.offset]),
        `${to}: ${loss.code} at ${loss.offset}`,
      );
    }
  }
  const transliterated = convertDetailed(
    input,
    "greek",
    "transliteration",
    GREEK_SCOPE,
  );
  assertEquals(
    transliterated.losses.map((loss) => loss.code),
    ["removed-glyph-variant", "removed-glyph-variant"],
  );
});

test("the core entry point converts the Greek passages", () => {
  const options = prepareOptions({ preset: "ala-lc-ancient", ...GREEK_SCOPE });
  const input = "Θ. Δημητρίου ; λόγος";
  assertEquals(
    core.convert(input, greekReader, transliterationWriter, options),
    convert(input, "greek", "transliteration", options),
  );
  assertEquals(
    core.convert(input, greekReader, transliterationWriter, options),
    "Th. Dēmētriou ; logos",
  );
  assertEquals(
    core.convertDetailed(input, greekFormat, transliterationFormat, options)
      .output,
    "Th. Dēmētriou ; logos",
  );
  assertEquals(
    core.reencode(input, greekFormat, options),
    "Θ. Δημητριου ; λογος",
  );
  // The question mark is copied, where a conversion of the whole text
  // would read it as Greek.
  assertEquals(
    core.reencode(
      "τί? τί;",
      greekFormat,
      prepareOptions({ text: { scope: "greek", letterCase: "uppercase" } }),
    ),
    "ΤΙ? ΤΙ;",
  );
});

test("the Greek passages are read from Greek only, and not by a converter", () => {
  for (const from of ["beta-code", "transliteration"] as const) {
    const error = assertThrows(
      () => convert("lo/gos", from, "greek", GREEK_SCOPE),
      OptionError,
    );
    assertEquals(error.path, "text.scope");
    assertEquals(error.received, "greek");
    assertThrows(
      () => convertDetailed("lo/gos", from, "greek", GREEK_SCOPE),
      OptionError,
    );
  }
  const converter = createConverter({ exclude: ["alpha"] });
  const error = assertThrows(
    () => converter.convert("λόγος", "greek", "transliteration", GREEK_SCOPE),
    OptionError,
  );
  assertEquals(error.path, "text.scope");
  assertNfcEquals(convert("λόγος", "greek", "transliteration"), "lógos");
});
