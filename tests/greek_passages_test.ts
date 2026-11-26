import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "./assertions.ts";
import {
  type ConversionOptions,
  convert,
  convertGreekPassages,
  convertGreekPassagesDetailed,
  FORMATS,
  OptionError,
  prepareOptions,
} from "../src/mod.ts";
import * as core from "../src/core.ts";
import { betaCodeFormat } from "../src/formats/beta_code.ts";
import { greekFormat, greekWriter } from "../src/formats/greek.ts";
import {
  transliterationFormat,
  transliterationWriter,
} from "../src/formats/transliteration.ts";

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
    ["εἰς Πειραιᾶ\u037E", "eis Peiraiã?"],
    ["λόγος\u0387 ἔστι", "lógos; ésti"],
    ["ἀπ᾽ αὐτοῦ", "ap’ autoũ"],
    // The rules see the text around a passage: before a period, a capital
    // is an initial.
    ["Θ. Δημητρίου, p. 3", "Th. Dēmētríou, p. 3"],
    // Nothing but the passages is normalized.
    ["é : ὁ", "é : ho"],
    ["no Greek; at all?", "no Greek; at all?"],
    ["", ""],
  ];
  for (const [input, output] of cases) {
    assertEquals(convertGreekPassages(input, "transliteration"), output, input);
  }
});

test("the keraia of a numeral goes with its passage", () => {
  // Normalization makes the Greek keraia U+02B9, which follows the letters
  // of the numeral; the lower keraia is Greek.
  assertEquals(convertGreekPassages("αʹ et ͵α", "beta-code"), "a# et #22a");
  assertEquals(
    convertGreekPassages("αʹ et ͵α", "transliteration", {
      text: { numerals: "decimal" },
    }),
    "1 et 1000",
  );
  // Elsewhere, U+02B9 is a letter of another language.
  assertEquals(convertGreekPassages("Gorʹkiĭ", "beta-code"), "Gorʹkiĭ");
});

test("the options apply to the Greek passages only", () => {
  // Whitespace is outside the passages, and copied as it is.
  assertEquals(
    convertGreekPassages("Théâtre  décomposé é :  ὁ  λόγος", "greek", {
      greek: { composition: "decomposed" },
      text: { whitespace: "collapse", letterCase: "uppercase" },
    }),
    "Théâtre  décomposé é :  Ο  ΛΟΓΟΣ",
  );
  // The Greek question mark and ano teleia, not the French signs.
  assertEquals(
    convertGreekPassages("Πειραιᾶ\u037E et ; λόγος\u0387 et ·", "greek", {
      greek: { questionMark: "greek", anoTeleia: "greek", acute: "tonos" },
    }),
    "Πειραιᾶ\u037E et ; λόγος\u0387 et ·",
  );
  // Beta Code writes Latin letters in its own case; they are copied.
  assertEquals(convertGreekPassages("ὁ Watson", "beta-code"), "o( Watson");
  // Into Greek, the passages are normalized, and the rest is copied: the
  // question mark of the text around is not read as Greek.
  assertEquals(
    convertGreekPassages("τί? τί;", "greek", {
      text: { letterCase: "uppercase" },
    }),
    "ΤΙ? ΤΙ;",
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
          convertGreekPassages(text, to, options),
          convert(text, "greek", to, options),
          `${text} → ${to} ${JSON.stringify(options)}`,
        );
      }
    }
  }
});

test("the detailed conversion reports the Greek passages and copies the rest", () => {
  const input = "Voir ϐίϐλος ; cf. « ἀπ’ αὐτοῦ » (Θ.)";
  for (const to of FORMATS) {
    const result = convertGreekPassagesDetailed(input, to);
    assertEquals(result.output, convertGreekPassages(input, to));
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
  assertEquals(
    convertGreekPassagesDetailed(input, "transliteration").losses.map((loss) =>
      loss.code
    ),
    ["removed-glyph-variant", "removed-glyph-variant"],
  );
});

test("the core entry point converts the Greek passages", () => {
  const options = prepareOptions({ preset: "ala-lc-ancient" });
  const input = "Θ. Δημητρίου ; λόγος";
  assertEquals(
    core.convertGreekPassages(input, transliterationWriter, options),
    convertGreekPassages(input, "transliteration", options),
  );
  assertEquals(
    core.convertGreekPassages(input, transliterationWriter, options),
    "Th. Dēmētriou ; logos",
  );
  assertEquals(
    core.convertGreekPassagesDetailed(input, transliterationFormat, options)
      .output,
    "Th. Dēmētriou ; logos",
  );
  assertEquals(
    core.convertGreekPassages(input, greekWriter, options),
    "Θ. Δημητριου ; λογος",
  );
  assertEquals(
    core.convertGreekPassagesDetailed("voir ϐίϐλος ;", betaCodeFormat).losses
      .map((loss) => loss.code),
    ["removed-glyph-variant", "removed-glyph-variant"],
  );
  // The functions of the core entry point take a writer, or a format whole,
  // and prepared options, as the others do.
  assertThrows(
    () =>
      core.convertGreekPassages(
        input,
        greekFormat,
        { preset: "perseus" } as never,
      ),
    TypeError,
  );
  assertThrows(
    () =>
      core.convertGreekPassagesDetailed(input, transliterationWriter as never),
    TypeError,
  );
});

test("a conversion of the whole text converts it whole", () => {
  // The other functions convert the whole text: the question mark of the
  // text around is read as Greek.
  assertEquals(
    convert("see λόγος; also", "greek", "transliteration"),
    "see lógos? also",
  );
  // There is no option for the passages.
  const error = assertThrows(
    () =>
      convert("λόγος", "greek", "transliteration", {
        text: { scope: "greek" },
      } as ConversionOptions),
    OptionError,
  );
  assertEquals(error.path, "text.scope");
});
