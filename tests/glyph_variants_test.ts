import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import {
  type ConversionOptions,
  convert,
  convertDetailed,
  type Format,
  type GlyphVariant,
  reencode,
} from "../src/mod.ts";
import {
  applyGreekOrthography,
  encode,
  grapheme,
  parse,
  validateDocument,
} from "../src/document.ts";

/** The losses of a conversion, as `code:glyphVariant@index`. */
function glyphLosses(
  input: string,
  from: Format,
  to: Format,
  options?: ConversionOptions,
): string[] {
  return convertDetailed(input, from, to, options).losses.map((loss) =>
    `${loss.code}${
      loss.glyphVariant === undefined ? "" : `:${loss.glyphVariant}`
    }@${loss.index}`
  );
}

const SYMBOLS = "ϐίος ϑεός ϕῶς ϖ ϰ ϱ ϵ ϒ ϓ ϔ ϴ";

test("Greek output keeps every letter form by default, without loss", () => {
  const forms = `${SYMBOLS} ϲῶμα ϹΩΜΑ λόγοσ ςόσ`;
  assertNfcEquals(convert(forms, "greek", "greek"), forms);
  assertEquals(glyphLosses(forms, "greek", "greek"), []);
  assertEquals(
    parse("ϐϑϕϖϰϱϵϒϴ", "greek").map((token) =>
      token.kind === "grapheme" ? token.glyphVariant : undefined
    ),
    [
      "beta-symbol",
      "theta-symbol",
      "phi-symbol",
      "pi-symbol",
      "kappa-symbol",
      "rho-symbol",
      "lunate-epsilon",
      "upsilon-hook",
      "capital-theta-symbol",
    ],
  );
});

test("each letter-form option folds its own forms, without loss", () => {
  const forms = "ϐίος ϑεός ϲῶμα λόγοσ";
  for (
    const [greek, expected] of [
      [{ medialBeta: "standard" }, "βίος ϑεός ϲῶμα λόγοσ"],
      [{ symbolForms: "standard" }, "ϐίος θεός ϲῶμα λόγοσ"],
      [{ sigma: "standard" }, "ϐίος ϑεός σῶμα λόγοσ"],
      [{ finalSigma: "contextual" }, "ϐίος ϑεός ϲῶμα λόγος"],
      [{ finalSigma: "medial" }, "ϐίοσ ϑεόσ ϲῶμα λόγοσ"],
    ] as const
  ) {
    assertNfcEquals(convert(forms, "greek", "greek", { greek }), expected);
    assertEquals(glyphLosses(forms, "greek", "greek", { greek }), []);
  }
});

test("the rc.8 options give the rc.8 output", () => {
  assertNfcEquals(
    reencode("ϐίος ϑεός ϲῶμα λόγοσ ϴ", "greek", {
      greek: {
        sigma: "standard",
        finalSigma: "contextual",
        medialBeta: "standard",
        symbolForms: "standard",
      },
    }),
    "βίος θεός σῶμα λόγος Θ",
  );
});

test("medialBeta: symbol writes ϐ by position, whatever the source", () => {
  const symbol = { greek: { medialBeta: "symbol" } } as const;
  assertNfcEquals(
    convert("βίος ἅβα ϐίος ἅϐα", "greek", "greek", symbol),
    "βίος ἅϐα βίος ἅϐα",
  );
  assertEquals(glyphLosses("βίος ἅβα ϐίος", "greek", "greek", symbol), []);
  // A text set this way gives no loss in transliteration: the options write
  // the ϐ again from the text read back.
  assertNfcEquals(
    convert("βίος ἅϐα", "greek", "transliteration", symbol),
    "bíos hába",
  );
  assertEquals(
    glyphLosses("βίος ἅϐα", "greek", "transliteration", symbol),
    [],
  );
  assertNfcEquals(
    convert("hába", "transliteration", "greek", symbol),
    "ἅϐα",
  );
  // A capital and a numeral keep β.
  assertNfcEquals(convert("ΑΒΑ βʹ", "greek", "greek", symbol), "ΑΒΑ βʹ");
});

test("a form the target cannot write is lost, and named", () => {
  assertNfcEquals(
    convert(SYMBOLS, "greek", "transliteration"),
    "bíos theós phō̃s p k r e Y Ý Ÿ TH",
  );
  assertEquals(
    glyphLosses("ϐίος ϑεός ϲῶμα λόγοσ ϴ", "greek", "transliteration"),
    [
      "removed-glyph-variant:beta-symbol@0",
      "removed-glyph-variant:theta-symbol@5",
      "removed-glyph-variant:lunate-sigma@10",
      "removed-glyph-variant:medial-sigma@19",
      "removed-glyph-variant:capital-theta-symbol@21",
    ],
  );
  // Beta Code writes the lunate sigma.
  assertEquals(convert("ϐίος ϲῶμα", "greek", "beta-code"), "bi/os s3w=ma");
  assertEquals(glyphLosses("ϐίος ϲῶμα", "greek", "beta-code"), [
    "removed-glyph-variant:beta-symbol@0",
  ]);
  // So does transliteration, under lunateSigma: "c".
  assertEquals(
    glyphLosses("ϲῶμα", "greek", "transliteration", {
      transliteration: { lunateSigma: "c" },
    }),
    [],
  );
  // A loss names its message as before.
  assertEquals(
    convertDetailed("ϐ", "greek", "transliteration").losses,
    [{
      code: "removed-glyph-variant",
      index: 0,
      offset: 0,
      length: 1,
      glyphVariant: "beta-symbol",
      message:
        "The target representation does not retain the source glyph variant.",
    }],
  );
});

test("a fold the options ask for is not a loss in any target", () => {
  const fold = {
    greek: {
      sigma: "standard",
      medialBeta: "standard",
      symbolForms: "standard",
    },
  } as const;
  for (const target of ["beta-code", "transliteration"] as const) {
    assertEquals(glyphLosses("ϐίος ϑεός ϲῶμα", "greek", target, fold), []);
  }
});

test("a lossless conversion converts back to the same canonical text", () => {
  for (
    const options of [
      {},
      { greek: { medialBeta: "symbol" } },
      { greek: { symbolForms: "standard", medialBeta: "standard" } },
      { transliteration: { lunateSigma: "c" } },
    ] as ConversionOptions[]
  ) {
    for (const target of ["beta-code", "transliteration"] as const) {
      for (const input of ["ἅϐα", "ϑεός", "ϲῶμαϲ", "λόγοσ", "βίος", "Ϲ"]) {
        const result = convertDetailed(input, "greek", target, options);
        if (result.lossy) continue;
        assertNfcEquals(
          convert(result.output, target, "greek", options),
          reencode(input, "greek", options),
          `${input} → ${target}`,
        );
      }
    }
  }
});

test("a form that exists in one case is lost when the case changes", () => {
  const upper = { text: { letterCase: "uppercase" } } as const;
  const lower = { text: { letterCase: "lowercase" } } as const;
  assertNfcEquals(convert("ϑ ϐ ϲ", "greek", "greek", upper), "Θ Β Ϲ");
  assertEquals(glyphLosses("ϑ ϐ ϲ", "greek", "greek", upper), [
    "changed-case@0",
    "removed-glyph-variant:theta-symbol@0",
    "changed-case@2",
    "removed-glyph-variant:beta-symbol@2",
    "changed-case@4",
  ]);
  assertNfcEquals(convert("ϴ ϒ Ϲ", "greek", "greek", lower), "θ υ ϲ");
  assertEquals(glyphLosses("ϴ ϒ", "greek", "greek", lower), [
    "changed-case@0",
    "removed-glyph-variant:capital-theta-symbol@0",
    "changed-case@2",
    "removed-glyph-variant:upsilon-hook@2",
  ]);
  // A form the options write by position is compared in the source's case:
  // the capital beta had none.
  assertEquals(
    glyphLosses("ΑΒΑ", "greek", "greek", {
      greek: { medialBeta: "symbol" },
      ...lower,
    }),
    ["changed-case@0", "changed-case@1", "changed-case@2"],
  );
  // The document drops the variant with the case it belonged to.
  const [theta] = applyGreekOrthography(parse("ϑ", "greek"), upper);
  assertEquals(
    theta.kind === "grapheme" ? [theta.uppercase, theta.glyphVariant] : [],
    [true, undefined],
  );
});

test("a numeral keeps a lunate sigma the source notes", () => {
  assertNfcEquals(convert("ϲʹ ͵ϲ σʹ", "greek", "greek"), "ϲʹ ͵ϲ σʹ");
  assertEquals(convert("ϲʹ σʹ", "greek", "beta-code"), "s3# s#");
  assertNfcEquals(convert("s3# s#", "beta-code", "greek"), "ϲʹ σʹ");
  assertEquals(glyphLosses("ϲʹ", "greek", "beta-code"), []);
  // The style of "lunate" leaves numerals standard, and "standard" folds.
  for (const sigma of ["lunate", "standard"] as const) {
    assertNfcEquals(
      convert("ϲʹ σʹ", "greek", "greek", { greek: { sigma } }),
      "σʹ σʹ",
    );
    assertEquals(glyphLosses("ϲʹ", "greek", "greek", { greek: { sigma } }), []);
  }
});

test("Beta Code s3 and the BnF c give a lunate sigma", () => {
  assertNfcEquals(convert("s3w=ma", "beta-code", "greek"), "ϲῶμα");
  assertNfcEquals(
    convert("cōma", "transliteration", "greek", { preset: "bnf-core" }),
    "ϲωμα",
  );
  assertEquals(convert("s3w=ma", "beta-code", "beta-code"), "s3w=ma");
});

test("a lunate sigma the source does not have is reported when it reads back otherwise", () => {
  const options = {
    transliteration: { lunateSigma: "c" },
    greek: { sigma: "lunate" },
  } as const;
  assertNfcEquals(convert("sōma", "transliteration", "greek", options), "ϲωμα");
  assertEquals(
    convertDetailed("sōma", "transliteration", "greek", options).losses
      .map(({ code, glyphVariant }) => [code, glyphVariant]),
    [["removed-glyph-variant", undefined]],
  );
  // Without lunateSigma: "c", the lunate sigma reads back as s.
  assertEquals(
    glyphLosses("sōma", "transliteration", "greek", {
      greek: { sigma: "lunate" },
    }),
    [],
  );
});

test("a restyle compares the forms with the source options", () => {
  // Folding is part of the target style, which the source style does not
  // write: converting back with the options swapped cannot restore ϐ.
  assertEquals(
    glyphLosses("ϐίος", "greek", "greek", {
      greek: { medialBeta: "standard" },
      source: {},
    }),
    ["removed-glyph-variant:beta-symbol@0"],
  );
});

test("a symbol form fits its letter and its case", () => {
  const diagnostics = validateDocument([
    grapheme("theta", true, [], "theta-symbol"),
    grapheme("theta", false, [], "capital-theta-symbol"),
    grapheme("beta", false, [], "phi-symbol"),
    grapheme("upsilon", false, [], "upsilon-hook"),
    grapheme("theta", false, [], "theta-symbol"),
    grapheme("sigma", true, [], "lunate-sigma"),
  ]);
  assertEquals(
    diagnostics.map(({ code, index }) => [code, index]),
    [
      ["invalid-glyph-variant", 0],
      ["invalid-glyph-variant", 1],
      ["invalid-glyph-variant", 2],
      ["invalid-glyph-variant", 3],
    ],
  );
  // A case policy and Greek output accept an unknown variant, which only
  // validation reports.
  assertNfcEquals(
    encode([grapheme("theta", false, [], "unknown" as GlyphVariant)], "greek", {
      text: { letterCase: "uppercase" },
    }),
    "Θ",
  );
  // Greek output writes neither a form of another letter nor of the other
  // case.
  assertNfcEquals(
    encode([
      grapheme("theta", true, [], "theta-symbol"),
      grapheme("beta", false, [], "phi-symbol"),
      grapheme("pi", false, [], "theta-symbol"),
    ], "greek"),
    "Θβπ",
  );
});
