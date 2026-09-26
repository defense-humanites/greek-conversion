import { assertEquals } from "@std/assert";
import {
  type Diacritic,
  grapheme,
  type Letter,
  literal,
  parse,
  validateDocument,
  type ValidationCode,
} from "../src/document.ts";
import { EQUIVALENCES, FORMATS, valueFor } from "./fixtures.ts";

interface InvalidCase {
  letter: Letter;
  diacritics: readonly Diacritic[];
  codes: readonly ValidationCode[];
}

const INVALID_CASES = [
  {
    letter: "alpha",
    diacritics: ["acute", "grave"],
    codes: ["conflicting-accents"],
  },
  {
    letter: "alpha",
    diacritics: ["smooth", "rough"],
    codes: ["conflicting-breathings"],
  },
  {
    letter: "alpha",
    diacritics: ["coronis"],
    codes: ["invalid-coronis"],
  },
  {
    letter: "alpha",
    diacritics: ["coronis", "rough"],
    codes: ["conflicting-coronis-breathing", "invalid-coronis"],
  },
  {
    letter: "alpha",
    diacritics: ["macron", "breve"],
    codes: ["conflicting-quantities"],
  },
  {
    letter: "beta",
    diacritics: ["acute"],
    codes: ["invalid-accent"],
  },
  {
    letter: "beta",
    diacritics: ["rough"],
    codes: ["invalid-breathing"],
  },
  {
    letter: "epsilon",
    diacritics: ["circumflex"],
    codes: ["invalid-circumflex"],
  },
  {
    letter: "alpha",
    diacritics: ["diaeresis"],
    codes: ["invalid-diaeresis"],
  },
  {
    letter: "iota",
    diacritics: ["smooth", "diaeresis"],
    codes: ["incompatible-diaeresis-breathing"],
  },
  {
    letter: "iota",
    diacritics: ["iota-subscript"],
    codes: ["invalid-iota-subscript"],
  },
  {
    letter: "eta",
    diacritics: ["breve"],
    codes: ["invalid-quantity"],
  },
] as const satisfies readonly InvalidCase[];

Deno.test("canonical fixtures produce no validation diagnostics", () => {
  for (const equivalence of EQUIVALENCES) {
    for (const format of FORMATS) {
      assertEquals(
        validateDocument(parse(valueFor(equivalence, format), format)),
        [],
      );
    }
  }

  assertEquals(validateDocument(parse("κἀγώ", "greek")), []);
  assertEquals(validateDocument(parse("η̄ ω̄", "greek")), []);
  assertEquals(validateDocument(parse("ka)gw/", "beta-code")), []);
});

Deno.test("invalid graphemes produce structured diagnostics", async (t) => {
  for (const invalid of INVALID_CASES) {
    await t.step(`${invalid.letter}: ${invalid.codes.join(", ")}`, () => {
      const diagnostics = validateDocument([
        literal("prefix"),
        grapheme(invalid.letter, false, invalid.diacritics),
      ]);

      assertEquals(diagnostics.map(({ code }) => code), [...invalid.codes]);
      assertEquals(
        diagnostics.map(({ index }) => index),
        invalid.codes.map(() => 1),
      );
      assertEquals(
        diagnostics.every(({ message }) => message.length > 0),
        true,
      );
    });
  }
});

Deno.test("validation is pure", () => {
  const document = [grapheme("alpha", false, ["acute", "grave"])];
  const before = new Set(document[0].diacritics);

  validateDocument(document);

  assertEquals(document[0].diacritics, before);
});

Deno.test("validation catches invalid manually modified document values", () => {
  const letter = grapheme("alpha");
  letter.letter = "unknown" as Letter;
  const mark = grapheme("alpha");
  mark.diacritics.add("unknown" as Diacritic);
  const variant = grapheme("beta", false, [], "lunate-sigma");
  const capitalFinal = grapheme("sigma", true, [], "final-sigma");
  const diagnostics = validateDocument([letter, mark, variant, capitalFinal]);

  assertEquals(
    diagnostics.map(({ code, index }) => [code, index]),
    [
      ["invalid-letter", 0],
      ["invalid-diacritic", 1],
      ["invalid-glyph-variant", 2],
      ["invalid-glyph-variant", 3],
    ],
  );
});
