import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import {
  type ConversionOptions,
  convert,
  convertDetailed,
  createConverter,
  type Format,
} from "../src/mod.ts";
import {
  applyGreekOrthography,
  encode,
  grapheme,
  literal,
  parse,
} from "../src/document.ts";

const noAlpha = createConverter({ exclude: ["alpha"] });
const noSigma = createConverter({ exclude: ["sigma"] });

test("a letter kept in another format reads back as a letter of its word", () => {
  // A converter writes a letter out of its scope in its source format; the
  // reader of the target keeps it as text, as a letter of its word, so the
  // rules around it decide again what they decided (#173).
  const cases: [
    typeof noAlpha,
    string,
    Format,
    ConversionOptions,
    string,
  ][] = [
    // Final sigma: a letter follows `s`.
    [noAlpha, "σα", "beta-code", {}, "sα"],
    [noAlpha, "σα", "transliteration", {}, "sα"],
    // Letter case: `s` begins no word.
    [noAlpha, "ας", "beta-code", { text: { letterCase: "title" } }, "Αs"],
    // Monotonic accentuation: a word whose syllables it cannot count.
    [
      noAlpha,
      "έα",
      "beta-code",
      { greek: { accentuation: "monotonic" } },
      "e/α",
    ],
    // The case of the word around a kept capital.
    [noSigma, "ΣἙ", "transliteration", {}, "ΣHE"],
    // Numerals: `*e#` is no numeral alone.
    [noSigma, "ΔΣΈʹ", "beta-code", { preset: "ala-lc-modern" }, "*dΣ*e#"],
  ];
  for (const [converter, source, target, options, written] of cases) {
    const detailed = converter.convertDetailed(
      source,
      "greek",
      target,
      options,
    );
    assertNfcEquals(detailed.output, written);
    assertEquals(
      converter.convert(detailed.output, target, target, options),
      detailed.output,
    );
    if (!detailed.lossy) {
      assertEquals(
        converter.convert(detailed.output, target, "greek", options),
        converter.convert(source, "greek", "greek", options),
      );
    }
  }
});

test("a letter that a reader keeps as text is a letter of its word", () => {
  // A Latin letter among Greek ones, as a digitized text has (`K` for `Κ`).
  assertNfcEquals(
    convert("Kαζάρμα", "greek", "greek", { text: { letterCase: "title" } }),
    "Kαζάρμα",
  );
  // A letter that transliteration does not read: a sigma before it is
  // medial, and monotonic accentuation keeps the accent of its word.
  assertNfcEquals(convert("sc", "transliteration", "greek"), "σc");
  assertNfcEquals(
    convert("ùc", "transliteration", "greek", {
      greek: { accentuation: "monotonic" },
    }),
    "ύc",
  );
  // The transliteration reader infers no breathing after such a letter, and
  // under ISO 843 reads the apostrophe after it as one.
  for (
    const [latin, greek, options] of [
      ["co", "cο", {}],
      ["c’a", "c’α", { preset: "iso-843-type-1" }],
    ] as const
  ) {
    const read = convertDetailed(latin, "transliteration", "greek", options);
    assertNfcEquals(read.output, greek);
    assertEquals(read.lossy, false);
    assertEquals(
      convert(read.output, "greek", "transliteration", options),
      latin,
    );
  }
  // A letter of a third script, which no converter keeps, joins no word.
  assertNfcEquals(
    convert("在Ἀθῆναι", "greek", "greek", { text: { letterCase: "title" } }),
    "在Ἀθῆναι",
  );
  assertNfcEquals(convert("λόγος是", "greek", "beta-code"), "lo/gos是");
  assertNfcEquals(
    convert("logos漢字", "transliteration", "greek"),
    "λογος漢字",
  );
});

test("a vowel with both breathings reads back with both under ISO 843", () => {
  // The writer writes `h’` before it, which no Greek word has.
  const iso = { preset: "iso-843-type-1" } as const;
  const written = convert("Ὁ̓Υ", "greek", "transliteration", iso);
  assertEquals(written, "H’OY");
  const preserve = { ...iso, greek: { capitalMarks: "preserve" } } as const;
  assertNfcEquals(
    convert(written, "transliteration", "greek", preserve),
    convert("Ὁ̓Υ", "greek", "greek", preserve),
  );
});

test("a vowel group with both breathings reads back with them on its second vowel", () => {
  // The writer writes `h’` before the whole vowel group, as it writes `h`.
  for (const preset of ["iso-843-type-1", "iso-843-type-2"] as const) {
    const options = { preset, greek: { capitalMarks: "preserve" } } as const;
    for (const word of ["οὑ̓", "εὑ̓́", "αἱ̓", "Οὑ̓"]) {
      const written = convertDetailed(
        word,
        "greek",
        "transliteration",
        options,
      );
      assertEquals(
        convert(written.output, "transliteration", "transliteration", options),
        written.output,
      );
      // ISO 843 type 2 writes the upsilon of `ευ` as `f`, which loses it.
      if (preset === "iso-843-type-2" && word === "εὑ̓́") continue;
      assertEquals(written.lossy, false);
      assertNfcEquals(
        convert(written.output, "transliteration", "greek", options),
        convert(word, "greek", "greek", options),
      );
    }
  }
});

test("a literal that writes a letter is a letter of its word, however made", () => {
  // The rules read the text of a literal, not where the literal came from:
  // a copy, a document built by hand, or a literal whose value a caller
  // changed reads as a parsed one would.
  const parsed = parse("sc", "transliteration");
  assertEquals(encode(parsed, "greek"), "σc");
  assertEquals(encode(parsed.map((token) => ({ ...token })), "greek"), "σc");
  assertEquals(encode([grapheme("sigma", false), literal("c")], "greek"), "σc");
  const changed = parse("sc", "transliteration");
  (changed[1] as { value: string }).value = " ";
  assertEquals(encode(changed, "greek"), "ς ");
  const title = { text: { letterCase: "title" } } as const;
  const word = parse("Kαζάρμα", "greek");
  assertNfcEquals(encode(word, "greek", title), "Kαζάρμα");
  assertNfcEquals(
    encode(applyGreekOrthography(word, {}), "greek", title),
    "Kαζάρμα",
  );
});

test("transliteration starts no word after a letter that a reader keeps as text", () => {
  // The writer finds where a word starts from the tokens before, as
  // isWordInitial() does: a literal that writes a letter is a letter of
  // its word, as a kept letter is, and a vowel after it starts no word.
  const iso = { preset: "iso-843-type-2" } as const;
  const title = { ...iso, text: { letterCase: "title" } } as const;
  for (
    const [converter, latin, options] of [
      [undefined, "co̔᾽i", iso],
      [noAlpha, "ao̔᾽i", iso],
      [noAlpha, "aho᾽i", iso],
      [undefined, "CE̓", title],
      [undefined, "Ce̓", title],
    ] as const
  ) {
    const convert_ = converter?.convert.bind(converter) ?? convert;
    const detailed = converter?.convertDetailed.bind(converter) ??
      convertDetailed;
    // Beta Code reads every Latin letter as its own.
    for (const target of ["greek", "transliteration"] as const) {
      const result = detailed(latin, "transliteration", target, options);
      assertEquals(
        convert_(result.output, target, target, options),
        result.output,
        `${latin} → ${target}`,
      );
      if (!result.lossy) {
        assertEquals(
          convert_(result.output, target, "transliteration", options),
          convert_(latin, "transliteration", "transliteration", options),
          `${latin} → ${target} and back`,
        );
      }
    }
  }
  assertNfcEquals(
    noAlpha.convert("aὀἱ", "greek", "transliteration", iso),
    "ao’hi",
  );
  assertNfcEquals(
    convert("CE̓", "transliteration", "transliteration", title),
    "Ce",
  );
});
