import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import { convert, convertDetailed, type Preset } from "../src/mod.ts";
import {
  EQUIVALENCES,
  FORMATS,
  LOSSY_CONVERSIONS,
  valueFor,
} from "./fixtures.ts";

test("canonical equivalences are reported as lossless", () => {
  for (const equivalence of EQUIVALENCES) {
    for (const from of FORMATS) {
      for (const to of FORMATS) {
        const input = valueFor(equivalence, from);
        const result = convertDetailed(input, from, to);

        assertEquals(result.output, convert(input, from, to));
        assertEquals(result.lossy, false, `${from} → ${to}: ${input}`);
        assertEquals(result.losses, []);
      }
    }
  }
});

test("every documented lossy conversion is detected", async (t) => {
  for (const conversion of LOSSY_CONVERSIONS) {
    await t.test(conversion.name, () => {
      const options = "options" in conversion ? conversion.options : undefined;
      const result = convertDetailed(
        conversion.source,
        conversion.sourceFormat,
        conversion.intermediateFormat,
        options,
      );

      assertEquals(result.lossy, true);
      assertEquals(result.losses.length > 0, true);
      assertEquals(
        result.output,
        convert(
          conversion.source,
          conversion.sourceFormat,
          conversion.intermediateFormat,
          options,
        ),
      );
    });
  }
});

test("reports each removed diacritic at its source token", () => {
  const result = convertDetailed("[ἄ]", "greek", "greek", {
    diacritics: { all: "remove" },
  });

  assertEquals(result.output, "[α]");
  assertEquals(result.lossy, true);
  assertEquals(result.losses, [
    {
      code: "removed-diacritic",
      index: 1,
      offset: 1,
      length: 1,
      diacritic: "smooth",
      message:
        "The target representation does not retain the smooth breathing.",
    },
    {
      code: "removed-diacritic",
      index: 1,
      offset: 1,
      length: 1,
      diacritic: "acute",
      message: "The target representation does not retain the acute accent.",
    },
  ]);
});

test("reports a replaced letter at its own token", () => {
  // ISO 843 type 2 writes omega as o. The unmarked ω must not be matched with
  // the ῶ two tokens later, which would move the loss onto γ and ῶ.
  const options = { preset: "iso-843-type-2" } as const;
  const located = (input: string) =>
    convertDetailed(input, "greek", "transliteration", options).losses.map((
      { code, offset, length },
    ) => [code, input.slice(offset, offset + length)]);
  assertEquals(located("παιδαγωγῶν"), [["unrepresented-grapheme", "ω"]]);
  // In a longer text, the loss stays on its line.
  assertEquals(located("παύουσι\nπαιδαγωγῶν"), [
    ["unrepresented-grapheme", "ύ"],
    ["unrepresented-grapheme", "ω"],
  ]);
});

test("pairs source and target tokens by their place in the output", () => {
  const located = (input: string, preset: Preset) =>
    convertDetailed(input, "greek", "transliteration", { preset }).losses.map((
      { code, offset, length, diacritic },
    ) => [code, input.slice(offset, offset + length), diacritic ?? ""]);
  // The apostrophe written for the smooth breathing reads back as a literal
  // before the vowel: the vowel lost its breathing, not its letter.
  assertEquals(located("ἄλφα", "iso-843-type-1"), [
    ["removed-diacritic", "ἄ", "smooth"],
  ]);
  // ν before γ reads back as a nasal gamma; the next vowel only lost its
  // grave accent, and χ is kept.
  assertEquals(located("ἐνγὺς", "ala-lc-ancient"), [
    ["removed-diacritic", "ἐ", "smooth"],
    ["unrepresented-grapheme", "ν", ""],
    ["removed-diacritic", "ὺ", "grave"],
  ]);
  assertEquals(located("θρασυσπλάνχνως", "sbl-academic"), [
    ["unrepresented-grapheme", "ν", ""],
  ]);
  // The same losses at the same places, alone or within a text.
  const text = ["ὅρκῳ", "ἔμ’", "δευόμενον", "κἤτι", "ἐτίθεον"];
  for (const preset of ["iso-843-type-1", "iso-843-type-2"] as const) {
    const together = located(text.join("\n"), preset);
    const alone = text.flatMap((word) => located(word, preset));
    assertEquals(together, alone);
  }
});

test("reports only selectively removed diacritics", () => {
  const result = convertDetailed("ἄ ἅ", "greek", "greek", {
    diacritics: { accents: "remove" },
  });

  assertEquals(result.output, "ἀ ἁ");
  assertEquals(result.lossy, true);
  assertEquals(
    result.losses.map(({ code, index, diacritic }) => ({
      code,
      index,
      diacritic,
    })),
    [
      { code: "removed-diacritic", index: 0, diacritic: "acute" },
      { code: "removed-diacritic", index: 2, diacritic: "acute" },
    ],
  );
});

test("reports case changes separately from removed diacritics", () => {
  const result = convertDetailed("Ἄβ", "greek", "greek", {
    diacritics: { accents: "remove" },
    text: { letterCase: "lowercase" },
  });

  assertEquals(result.output, "ἀβ");
  assertEquals(result.lossy, true);
  assertEquals(result.losses, [
    {
      code: "changed-case",
      index: 0,
      offset: 0,
      length: 1,
      message: "The target representation does not retain letter case.",
    },
    {
      code: "removed-diacritic",
      index: 0,
      offset: 0,
      length: 1,
      diacritic: "acute",
      message: "The target representation does not retain the acute accent.",
    },
  ]);
});

test("canonical Unicode variants are not information loss", () => {
  const oxia = convertDetailed("ά;·", "greek", "greek", {
    greek: { acute: "oxia", questionMark: "greek", anoTeleia: "greek" },
  });
  const decomposed = convertDetailed("ἄ", "greek", "greek", {
    greek: { composition: "decomposed" },
  });

  assertEquals(oxia.lossy, false);
  assertEquals(decomposed.lossy, false);
});

test("removed lunate provenance is independent from lossy case folding", () => {
  const variants = convertDetailed("ϐίος ϲῶμα", "greek", "greek", {
    greek: { finalSigma: "medial", medialBeta: "standard", sigma: "standard" },
  });
  const lowercase = convertDetailed("ΒΊΟΣ", "greek", "greek", {
    greek: { finalSigma: "medial" },
    text: { letterCase: "lowercase" },
  });

  assertEquals(variants.output, "βίοσ σῶμα");
  assertEquals(variants.lossy, true);
  assertEquals(variants.losses, [{
    code: "removed-glyph-variant",
    index: 5,
    offset: 5,
    length: 1,
    message:
      "The target representation does not retain the source glyph variant.",
  }]);
  assertEquals(lowercase.output, "βίοσ");
  assertEquals(lowercase.lossy, true);
  assertEquals(lowercase.losses.map(({ code }) => code), [
    "changed-case",
    "changed-case",
    "changed-case",
    "changed-case",
  ]);
});

test("preserves lunate provenance and ignores deterministic styling", () => {
  const preserved = convertDetailed("σϲ ϹΣ", "greek", "transliteration", {
    transliteration: { lunateSigma: "c" },
  });
  const styled = convertDetailed("σος", "greek", "greek", {
    greek: { sigma: "lunate" },
  });

  assertEquals(preserved.output, "sc CS");
  assertEquals(preserved.lossy, false);
  assertEquals(preserved.losses, []);
  assertEquals(styled.output, "ϲοϲ");
  assertEquals(styled.lossy, false);
  assertEquals(styled.losses, []);
});

test("tracks lunate provenance through all three formats", () => {
  const greek = convertDetailed("ϲ", "greek", "greek", {
    greek: { sigma: "preserve" },
  });
  const beta = convertDetailed("S3", "beta-code", "beta-code");
  const transliteration = convertDetailed(
    "c",
    "transliteration",
    "transliteration",
    { transliteration: { lunateSigma: "c" } },
  );

  const span = { inputStart: 0, inputEnd: 1, outputStart: 0, outputEnd: 1 };
  assertEquals(greek, { output: "ϲ", lossy: false, losses: [], spans: [span] });
  assertEquals(beta.output, "s");
  assertEquals(beta.losses.map(({ code }) => code), [
    "removed-glyph-variant",
  ]);
  assertEquals(transliteration, {
    output: "c",
    lossy: false,
    losses: [],
    spans: [span],
  });
});

test("Greek coronis scalar retains semantic provenance", () => {
  const result = convertDetailed(
    "κἀγώ",
    "greek",
    "transliteration",
    { transliteration: { coronis: "greek" } },
  );

  assertEquals(result.output, "ka\u1FBDgṓ");
  assertEquals(result.lossy, false);
  assertEquals(result.losses, []);
});

test("deterministic added marks are not information loss", () => {
  const result = convertDetailed(
    "πολύρριζος",
    "greek",
    "greek",
    { greek: { doubleRho: "smooth-rough" } },
  );

  assertEquals(result.output, "πολύῤῥιζος");
  assertEquals(result.lossy, false);
  assertEquals(result.losses, []);
});

test("selected transliteration variants retain recoverable letters", () => {
  const result = convertDetailed(
    "βηξφχυ ρρ μπ",
    "greek",
    "transliteration",
    {
      transliteration: {
        beta: "v",
        chi: "kh",
        eta: "i",
        muPi: "b-initial",
        nuTau: "d-initial",
        phi: "f",
        rho: "systematic",
        upsilon: "y",
        xi: "ks",
      },
    },
  );

  assertEquals(result.output, "vīksfkhy rrh b");
  assertEquals(result.lossy, false);
  assertEquals(result.losses, []);
});

test("ALA-LC modern digraph spellings retain recoverable letters", () => {
  const result = convertDetailed(
    "μπ β ντ δ γκ αγκά αγκ",
    "greek",
    "transliteration",
    {
      transliteration: {
        beta: "v",
        muPi: "b-initial",
        nasalGamma: "nasal-medial-kappa",
        nuTau: "d-underline-initial",
      },
    },
  );

  assertEquals(result.output, "b v d̲ d gk anká agk");
  // The letters are recoverable; only the unmarked initial vowels of this
  // monotonic input acquire a smooth breathing on the way back.
  assertEquals(
    result.losses.map(({ code, index }) => ({ code, index })),
    [
      { code: "inferred-breathing", index: 13 },
      { code: "inferred-breathing", index: 18 },
    ],
  );
});

test("reports the smooth breathing inferred on unmarked Greek", () => {
  // The index is that of the vowel which acquires the breathing: the second
  // element of an initial diphthong (ΑΙ), otherwise the initial vowel.
  for (
    const [greek, index] of [
      ["άνθρωπος", 0],
      ["Αθήνα", 0],
      ["ΑΙΔΗΣ", 1],
    ] as const
  ) {
    const result = convertDetailed(greek, "greek", "transliteration");
    assertEquals(result.lossy, true);
    assertEquals(
      result.losses.map(({ code, index, diacritic }) => ({
        code,
        index,
        diacritic,
      })),
      [{ code: "inferred-breathing", index, diacritic: "smooth" }],
    );
  }

  // Under an orthography without smooth breathings nothing is inferred, so
  // the same monotonic text converts back and forth without loss.
  for (
    const options of [
      { greek: { accentuation: "monotonic" } },
      { diacritics: { smoothBreathing: "remove" } },
      { diacritics: { all: "remove" } },
    ] as const
  ) {
    const result = convertDetailed(
      "άνθρωπος",
      "greek",
      "transliteration",
      options,
    );
    assertEquals(
      result.losses.map(({ code }) => code).includes("inferred-breathing"),
      false,
    );
    assertEquals(
      convert(result.output, "transliteration", "greek", options),
      convert("άνθρωπος", "greek", "greek", options),
    );
  }

  // A polytonic source still reads back with its breathing, without a report.
  assertEquals(
    convertDetailed("ἄνθρωπος", "greek", "transliteration").losses,
    [],
  );
  // Quantity-marked initial vowels stay breathing-neutral.
  assertEquals(
    convertDetailed("ᾱ", "greek", "transliteration").losses,
    [],
  );
});

test("reports destructive orthography policies from their actual input", () => {
  const whitespace = convertDetailed("  α\tβ  ", "greek", "greek", {
    text: { whitespace: "collapse" },
  });
  const modernNt = convertDetailed("ντο", "greek", "transliteration", {
    transliteration: { muPi: "b-initial", nuTau: "d-initial" },
  });
  const systematicRoughRho = convertDetailed(
    "ῥ",
    "greek",
    "transliteration",
    { transliteration: { rho: "systematic" } },
  );

  assertEquals(whitespace.output, "α β");
  assertEquals(whitespace.lossy, true);
  assertEquals(modernNt.output, "do");
  assertEquals(modernNt.lossy, true);
  assertEquals(systematicRoughRho.output, "rh");
  assertEquals(systematicRoughRho.lossy, true);
});

test("preserved unknown literals remain lossless", () => {
  const result = convertDetailed("😀 𝄞 𐀀", "greek", "transliteration");

  assertEquals(result.output, "😀 𝄞 𐀀");
  assertEquals(result.lossy, false);
});
