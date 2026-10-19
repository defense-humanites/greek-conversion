import { assertEquals } from "@std/assert";
import {
  type ConversionOptions,
  convert,
  convertDetailed,
  type Format,
  FORMATS,
  listPresetMetadata,
  type Preset,
} from "../src/mod.ts";
import { parse, validateDocument } from "../src/document.ts";
import { assertNfcEquals } from "./assertions.ts";

/**
 * Property checks of the documented guarantees over a deterministic corpus of
 * difficult forms, for every preset and every format pair:
 *
 * 1. canonical output is idempotent;
 * 2. the parsed output is a valid document, except at the boundaries listed
 *    in {@link KNOWN_BOUNDARIES}, which must then also be reported as loss;
 * 3. a conversion reported as lossless converts back to the same canonical
 *    source.
 *
 * The corpus deliberately contains hiatus and iota-adscript forms, initial
 * diaeresis, explicit quantity marks, archaic letters and numerals, lunate
 * and medial variants, monotonic and uncial text, and Greek punctuation.
 */
const WORDS = [
  "ἄνθρωπος",
  "ᾨδὴ",
  "Ἅιδῃ",
  "Ἀίδης",
  "ἀίδηλος",
  "ἄυλος",
  "ἀυτμή",
  "Αἴδης",
  "τοὔνομα",
  "κἀγώ",
  "ἀλλ’",
  "ἐγώ",
  "ῥήτωρ",
  "Ῥόδος",
  "Πύρρος",
  "ἀΐδιος",
  "Ἀΐδης",
  "υἱός",
  "εὐ",
  "αὐτός",
  "οὗτος",
  "ΛΟΓΟΣ",
  "Λόγος",
  "ϲῶμα",
  "ϐίος",
  "ἄγγελος",
  "Σφίγξ",
  "ἐγχέω",
  "αʹ",
  "ιβʹ",
  "͵αωκγʹ",
  "ϛʹ",
  "ϟʹ",
  "ϡʹ",
  "ϝάναξ",
  "τί;",
  "ὅτι·",
  "Ἑλλάς",
  "Ἦ",
  "ᾗ",
  "ᾅδης",
  "ἁγίᾳ",
  "ὦ",
  "ὧν",
  "ἤ",
  "ἢ",
  "ἦν",
  "ῑ̔",
  "ᾱ̓",
  "ᾱ́",
  "ῑ́",
  "ῠ́",
  "Ϊ",
  "ϋ",
  "ῢ",
  "ΰ",
  "ΐ",
  "ῗ",
  "ῧ",
  "ῤ",
  "ῥ",
  "ἐξ",
  "ἐκ",
  "ὑπό",
  "Ὕδρα",
  "Ὠκεανός",
  "Ὦ",
  "ᾍδης",
  "ᾈ",
  "ᾨ",
  "ΑΙΔΗΣ",
  "Αἴγυπτος",
  "Μπάλα",
  "Ντόρα",
  "Γκρέκο",
  "Τζον",
  "τσάι",
  "ευχαριστώ",
  "Νίκος",
  "μπαμπάς",
  "άνθρωπος",
  "Άγιος",
  "ϊδιος",
  "Ϊδιος",
  "ΐδιος",
  "προϊόν",
  "ἀϋπνία",
] as const;

const SEPARATORS = [" ", " ", ", ", "\n", " · "] as const;
const SAMPLES = 240;

/**
 * Documented limits where text produced by a lossy conversion does not read
 * back as a valid document. The conversion that produced the text must have
 * reported the loss.
 */
const KNOWN_BOUNDARIES: readonly {
  preset: Preset;
  format: Format;
  code: string;
  reason: string;
}[] = [
  {
    preset: "bnf-core",
    format: "transliteration",
    code: "invalid-accent",
    reason:
      "BnF renders the right keraia as an acute, which lands on a consonant or numeral letter when the Latin text is read back (docs/preset-behavior-audit.md).",
  },
];

function* samples(): Generator<string> {
  let seed = 2026;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const pick = <T>(items: readonly T[]) =>
    items[Math.floor(random() * items.length)];

  for (const word of WORDS) yield word;
  for (let i = 0; i < SAMPLES; i++) {
    const count = 1 + Math.floor(random() * 3);
    yield Array.from({ length: count }, () => pick(WORDS)).join(
      pick(SEPARATORS),
    );
  }
}

const CONFIGURATIONS: readonly { label: string; options: ConversionOptions }[] =
  [
    { label: "default", options: {} },
    ...listPresetMetadata().map(({ id }) => ({
      label: id,
      options: { preset: id } as ConversionOptions,
    })),
  ];

Deno.test("every word of the corpus is a valid Greek document", () => {
  for (const word of WORDS) {
    assertEquals(
      validateDocument(parse(word, "greek")).map((d) => d.code),
      [],
      word,
    );
  }
});

Deno.test("canonical output is idempotent for every configuration and format pair", () => {
  for (const { label, options } of CONFIGURATIONS) {
    for (const sample of samples()) {
      for (const from of FORMATS) {
        const source = convert(sample, "greek", from, options);
        for (const to of FORMATS) {
          const once = convert(source, from, to, options);
          const twice = convert(once, to, to, options);
          assertEquals(
            twice,
            once,
            `${label}: ${from} → ${to} of ${JSON.stringify(source)}`,
          );
        }
      }
    }
  }
});

Deno.test("reparsed output is a valid document outside the documented boundaries", () => {
  // Returns whether the produced text reads back as a valid document, or as
  // a documented boundary that the producing conversion reported as lossy.
  const check = (
    label: string,
    options: ConversionOptions,
    from: Format,
    to: Format,
    input: string,
    produced: { output: string; lossy: boolean },
  ): boolean => {
    const codes = validateDocument(parse(produced.output, to, options))
      .map((d) => d.code);
    if (codes.length === 0) return true;
    const boundary = KNOWN_BOUNDARIES.find((b) =>
      b.preset === options.preset && b.format === to &&
      codes.every((code) => code === b.code)
    );
    const where = `${label}: ${from} → ${to} of ${
      JSON.stringify(input)
    } gives ${JSON.stringify(produced.output)} with ${codes.join(", ")}`;
    assertEquals(boundary !== undefined, true, where);
    assertEquals(produced.lossy, true, `${where} (unreported)`);
    return false;
  };

  for (const { label, options } of CONFIGURATIONS) {
    for (const sample of samples()) {
      for (const from of FORMATS) {
        const produced = convertDetailed(sample, "greek", from, options);
        // A source at a boundary is itself invalid; stop there.
        if (!check(label, options, "greek", from, sample, produced)) continue;
        const source = produced.output;
        for (const to of FORMATS) {
          check(
            label,
            options,
            from,
            to,
            source,
            convertDetailed(source, from, to, options),
          );
        }
      }
    }
  }
});

Deno.test("a conversion reported as lossless converts back to the same canonical source", () => {
  for (const { label, options } of CONFIGURATIONS) {
    for (const sample of samples()) {
      for (const from of FORMATS) {
        const source = convert(sample, "greek", from, options);
        for (const to of FORMATS) {
          const result = convertDetailed(source, from, to, options);
          if (result.lossy) continue;
          const back = convert(result.output, to, from, options);
          assertNfcEquals(
            back,
            source,
            `${label}: ${from} → ${to} → ${from} of ${JSON.stringify(source)}`,
          );
        }
      }
    }
  }
});
