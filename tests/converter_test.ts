import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import {
  CharacterScopeError,
  type ConversionOptions,
  convert,
  convertDetailed,
  createConverter,
  type Format,
  OptionError,
} from "../src/mod.ts";

const FORMATS: readonly Format[] = ["greek", "beta-code", "transliteration"];

const SAN = {
  id: "san",
  forms: {
    greek: { lowercase: "ϻ", uppercase: "Ϻ" },
    "beta-code": { lowercase: "#9", uppercase: "*#9" },
    transliteration: { lowercase: "š", uppercase: "Š" },
  },
  override: true,
} as const;

test("the default converter preserves the functional contract", () => {
  const converter = createConverter();
  const cases = [
    ["ἄνθρωπος", "greek", "beta-code"],
    ["a)/nqrwpos", "beta-code", "transliteration"],
    ["ánthrōpos", "transliteration", "greek"],
  ] as const;

  for (const [input, from, to] of cases) {
    assertEquals(
      converter.convert(input, from, to),
      convert(input, from, to),
    );
  }
});

test("bound presets apply their options and audited scope", () => {
  const perseus = createConverter({ preset: "perseus" });
  const perseusResult = perseus.convertDetailed(
    "Ἄνθρωπος ϝ",
    "greek",
    "beta-code",
  );
  assertEquals(perseusResult.output, "*)/anqrwpos ϝ");
  assertEquals(
    perseusResult.diagnostics.map(({ character }) => character),
    ["digamma"],
  );

  const modernAlaLc = createConverter({ preset: "ala-lc-modern" });
  const alaResult = modernAlaLc.convertDetailed(
    "ϛ ϛʹ ϳ",
    "greek",
    "transliteration",
  );
  assertEquals(alaResult.output, "ϛ 6 ϳ");
  assertEquals(
    alaResult.diagnostics.map(({ character }) => character),
    ["stigma", "yot"],
  );
});

test("rejects all out-of-scope source characters with structured diagnostics", () => {
  const converter = createConverter({
    preset: "perseus",
    outOfScopeBehavior: "reject",
  });

  for (const detailed of [false, true]) {
    let error: unknown;
    try {
      if (detailed) {
        converter.convertDetailed("αϝϳ", "greek", "beta-code");
      } else {
        converter.convert("αϝϳ", "greek", "beta-code");
      }
    } catch (caught) {
      error = caught;
    }

    assertEquals(error instanceof CharacterScopeError, true);
    const rejected = error as CharacterScopeError;
    assertEquals(rejected.name, "CharacterScopeError");
    assertEquals(
      rejected.message,
      "Conversion rejected: 2 out-of-scope characters.",
    );
    assertEquals(
      rejected.diagnostics.map(({ code, index, character, message }) => ({
        code,
        index,
        character,
        message,
      })),
      [
        {
          code: "out-of-scope-character",
          index: 1,
          character: "digamma",
          message:
            "Character digamma is outside this converter's repertoire and was rejected.",
        },
        {
          code: "out-of-scope-character",
          index: 2,
          character: "yot",
          message:
            "Character yot is outside this converter's repertoire and was rejected.",
        },
      ],
    );
    assertEquals(Object.isFrozen(rejected.diagnostics), true);
    assertEquals(Object.isFrozen(rejected.diagnostics[0]), true);
  }

  assertEquals(converter.convert("α☃", "greek", "beta-code"), "a☃");
});

test("strict ALA-LC accepts marked numerals but rejects unmarked letters", () => {
  const converter = createConverter({
    preset: "ala-lc-modern",
    outOfScopeBehavior: "reject",
  });

  assertEquals(converter.convert("ϛʹ", "greek", "transliteration"), "6");

  let error: unknown;
  try {
    converter.convert("ϛ ϛʹ", "greek", "transliteration");
  } catch (caught) {
    error = caught;
  }
  assertEquals(error instanceof CharacterScopeError, true);
  assertEquals(
    (error as CharacterScopeError).diagnostics.map(({ index, character }) => [
      index,
      character,
    ]),
    [[0, "stigma"]],
  );
});

test("strict repertoire exclusions cover custom and Beta Code forms", () => {
  const converter = createConverter({
    preset: "perseus",
    characters: [SAN],
    exclude: ["san"],
    outOfScopeBehavior: "reject",
  });

  let error: unknown;
  try {
    converter.convert("ϻϝ", "greek", "beta-code");
  } catch (caught) {
    error = caught;
  }
  assertEquals(error instanceof CharacterScopeError, true);
  assertEquals(
    (error as CharacterScopeError).diagnostics.map(({ character }) =>
      character
    ),
    ["san", "digamma"],
  );

  const beta = createConverter({
    exclude: ["stigma"],
    outOfScopeBehavior: "reject",
  });
  try {
    beta.convert("a#2b", "beta-code", "greek");
    error = undefined;
  } catch (caught) {
    error = caught;
  }
  assertEquals(error instanceof CharacterScopeError, true);
  assertEquals((error as CharacterScopeError).diagnostics[0].index, 1);
  assertEquals(beta.convert("ab", "beta-code", "greek"), "αβ");
});

test("checks the keys of a configuration, as options are checked", () => {
  const unknown = (configuration: unknown): OptionError => {
    try {
      createConverter(configuration as never);
    } catch (error) {
      if (error instanceof OptionError) return error;
      throw error;
    }
    throw new Error("The configuration was accepted.");
  };
  const forms = { ...SAN.forms };

  const top = unknown({ exlude: ["stigma"] });
  assertEquals(top.message, "Unknown converter option: exlude");
  assertEquals(top instanceof RangeError, true);
  assertEquals(top.path, "exlude");
  assertEquals(top.received, undefined);
  assertEquals(top.accepted, [
    "preset",
    "outOfScopeBehavior",
    "aliases",
    "characters",
    "repertoire",
    "exclude",
  ]);
  // Conversion options are given on each call, not bound.
  assertEquals(unknown({ options: {} }).path, "options");

  const alias = unknown({
    aliases: [
      { letter: "theta", format: "transliteration", spellings: ["þ"] },
      { letter: "theta", format: "transliteration", spelings: ["ð"] },
    ],
  });
  assertEquals(alias.path, "aliases[1].spelings");
  assertEquals(alias.accepted, [
    "letter",
    "format",
    "spellings",
    "uppercase",
    "override",
  ]);
  assertEquals(
    unknown({ characters: [{ ...SAN, overide: true }] }).path,
    "characters[0].overide",
  );
  const format = unknown({
    characters: [{ id: "san", forms: { ...forms, betacode: forms.greek } }],
  });
  assertEquals(format.path, "characters[0].forms.betacode");
  assertEquals(format.accepted, ["greek", "beta-code", "transliteration"]);
  assertEquals(
    unknown({
      characters: [{
        id: "san",
        forms: { ...forms, greek: { lowercase: "ϻ", upper: "Ϻ" } },
      }],
    }).path,
    "characters[0].forms.greek.upper",
  );

  // A key left undefined is no key, as in conversion options.
  createConverter({ exclude: undefined, exlude: undefined } as never);
  createConverter({ characters: [SAN], exclude: ["san"] });
});

test("says which part of a configuration has the wrong type", () => {
  const message = (configuration: unknown): string => {
    try {
      createConverter(configuration as never);
    } catch (error) {
      if (error instanceof TypeError) return error.message;
      throw error;
    }
    throw new Error("The configuration was accepted.");
  };

  assertEquals(
    message(null),
    "Expected the converter configuration to be an object, received null.",
  );
  assertEquals(
    message({ exclude: "stigma" }),
    "Expected exclude to be an array, received string.",
  );
  assertEquals(
    message({ aliases: ["þ"] }),
    "Expected aliases[0] to be an object, received string.",
  );
  assertEquals(
    message({ characters: [{ id: "san", forms: { greek: SAN.forms.greek } }] }),
    "Expected characters[0].forms.beta-code to be an object, received undefined.",
  );
  const alias = {
    letter: "theta",
    format: "transliteration",
    spellings: ["þ"],
  };
  assertEquals(
    message({ aliases: [{ ...alias, spellings: "þ" }] }),
    "Expected aliases[0].spellings to be an array, received string.",
  );
  assertEquals(
    message({ aliases: [{ ...alias, spellings: ["þ", 5] }] }),
    "Expected aliases[0].spellings[1] to be a string, received number.",
  );
  assertEquals(
    message({ aliases: [{ ...alias, uppercase: "yes" }] }),
    "Expected aliases[0].uppercase to be a boolean, received string.",
  );
  assertEquals(
    message({ aliases: [{ ...alias, override: 1 }] }),
    "Expected aliases[0].override to be a boolean, received number.",
  );
  assertEquals(
    message({ characters: [{ ...SAN, id: 5 }] }),
    "Expected characters[0].id to be a string, received number.",
  );
  assertEquals(
    message({ characters: [{ ...SAN, override: "yes" }] }),
    "Expected characters[0].override to be a boolean, received string.",
  );
  assertEquals(
    message({
      characters: [{
        ...SAN,
        forms: { ...SAN.forms, greek: { lowercase: "ϻ", uppercase: null } },
      }],
    }),
    "Expected characters[0].forms.greek.uppercase to be a string, received null.",
  );
});

test("checks the values of a configuration from a known set, as options are checked", () => {
  const invalid = (configuration: unknown): OptionError => {
    try {
      createConverter(configuration as never);
    } catch (error) {
      if (error instanceof OptionError) return error;
      throw error;
    }
    throw new Error("The configuration was accepted.");
  };

  const behavior = invalid({ outOfScopeBehavior: "rejct" });
  assertEquals(behavior instanceof RangeError, true);
  assertEquals(
    behavior.message,
    'Invalid value for outOfScopeBehavior: "rejct"; expected one of "preserve", "reject".',
  );
  assertEquals(behavior.path, "outOfScopeBehavior");
  assertEquals(behavior.received, "rejct");
  assertEquals(behavior.accepted, ["preserve", "reject"]);
  assertEquals(invalid({ outOfScopeBehavior: 5 }).received, 5);

  const excluded = invalid({ exclude: ["stigma", "stigam"] });
  assertEquals(
    excluded.message,
    'Unknown character identifier in exclude[1]: "stigam".',
  );
  assertEquals(excluded.path, "exclude[1]");
  assertEquals(excluded.received, "stigam");
  assertEquals(excluded.accepted.includes("stigma"), true);
  // A custom character is an identifier of its converter.
  const repertoire = invalid({ characters: [SAN], repertoire: ["alpha", 5] });
  assertEquals(repertoire.path, "repertoire[1]");
  assertEquals(repertoire.accepted.includes("san"), true);

  const letter = invalid({
    aliases: [{
      letter: "thetta",
      format: "transliteration",
      spellings: ["þ"],
    }],
  });
  assertEquals(
    letter.message,
    'Unknown letter in aliases[0].letter: "thetta".',
  );
  assertEquals(letter.path, "aliases[0].letter");
  assertEquals(letter.accepted.includes("theta"), true);
  assertEquals(letter.accepted.includes("san"), false);
});

test("bound preset scopes match the audited additional-letter matrix", () => {
  const source = "αϝϳϛϟϙϡ";
  const cases = [
    ["ala-lc-ancient", ["yot", "stigma", "koppa", "sampi"]],
    [
      "ala-lc-modern",
      ["digamma", "yot", "stigma", "koppa", "archaic-koppa", "sampi"],
    ],
    ["bnf-ancient", []],
    ["iso-843-type-1", []],
    ["iso-843-type-2", []],
    [
      "perseus",
      ["digamma", "yot", "stigma", "koppa", "archaic-koppa", "sampi"],
    ],
    [
      "sbl-general",
      ["digamma", "yot", "stigma", "koppa", "archaic-koppa", "sampi"],
    ],
    ["tlg-core", []],
  ] as const;

  for (const [preset, expected] of cases) {
    const result = createConverter({ preset }).convertDetailed(
      source,
      "greek",
      "greek",
    );
    assertEquals(
      result.diagnostics.map(({ character }) => character),
      [...expected],
      preset,
    );
  }
});

test("a converter bound to bnf-ancient or tlg-core converts as convert() does", () => {
  // Their scopes hold every character and they report no mapping, so that
  // the converter reads the source as convert() does, without checking its
  // letters.
  const greek = "ϝϳϛϟϙϡ ϜϚϞϘϠ ϛʹ ϟʹ ͵ϡ λόγος";
  for (const preset of ["bnf-ancient", "tlg-core"] as const) {
    const converter = createConverter({ preset });
    for (const from of FORMATS) {
      const input = from === "greek"
        ? greek
        : convert(greek, "greek", from, { preset });
      for (const to of FORMATS) {
        const bound = converter.convertDetailed(input, from, to);
        const unbound = convertDetailed(input, from, to, { preset });
        assertEquals(bound.diagnostics, [], `${preset}: ${from} → ${to}`);
        assertEquals(
          { output: bound.output, lossy: bound.lossy, losses: bound.losses },
          {
            output: unbound.output,
            lossy: unbound.lossy,
            losses: unbound.losses,
          },
          `${preset}: ${from} → ${to}`,
        );
      }
    }
  }
});

for (const preset of ["iso-843-type-1", "iso-843-type-2"] as const) {
  test(`${preset} preserves in-scope characters without defined letter mappings`, () => {
    const converter = createConverter({ preset });
    const result = converter.convertDetailed(
      "ϝϳϛϟϙϡ",
      "greek",
      "transliteration",
    );

    assertEquals(result.output, "wjϛϟϙϡ");
    assertEquals(result.lossy, false);
    assertEquals(
      result.diagnostics.map(({ code, index, character }) => [
        code,
        index,
        character,
      ]),
      [
        ["undefined-preset-mapping", 2, "stigma"],
        ["undefined-preset-mapping", 3, "koppa"],
        ["unresolved-preset-mapping", 4, "archaic-koppa"],
        ["undefined-preset-mapping", 5, "sampi"],
      ],
    );

    // The preset alone retains its documented engine-default behavior.
    assertEquals(
      convert("ϛ", "greek", "transliteration", { preset }),
      "c̄",
    );
    assertEquals(converter.convert("ϛ", "greek", "greek"), "ϛ");
    assertEquals(converter.convert("ϛ", "greek", "beta-code"), "#2");
    assertEquals(
      converter.convert("ϛʹ", "greek", "transliteration", {
        text: { numerals: "decimal" },
      }),
      "6",
    );
  });
}

test("strict ISO Type 1 rejects missing mappings separately from exclusions", () => {
  const converter = createConverter({
    preset: "iso-843-type-1",
    exclude: ["digamma"],
    outOfScopeBehavior: "reject",
  });

  for (const detailed of [false, true]) {
    let error: unknown;
    try {
      if (detailed) {
        converter.convertDetailed("ϝϛϙ", "greek", "transliteration");
      } else {
        converter.convert("ϝϛϙ", "greek", "transliteration");
      }
    } catch (caught) {
      error = caught;
    }
    assertEquals(error instanceof CharacterScopeError, true);
    assertEquals(
      (error as CharacterScopeError).diagnostics.map(({ code, index }) => [
        code,
        index,
      ]),
      [
        ["out-of-scope-character", 0],
        ["undefined-preset-mapping", 1],
        ["unresolved-preset-mapping", 2],
      ],
    );
    assertEquals(
      (error as CharacterScopeError).message,
      "Conversion rejected: 3 unsupported characters.",
    );
  }
  assertEquals(
    createConverter({
      preset: "iso-843-type-1",
      outOfScopeBehavior: "reject",
    }).convert("ϝϳ", "greek", "transliteration"),
    "wj",
  );
});

test("strict repertoire rejection does not promise lossless conversion", () => {
  const bnf = createConverter({
    preset: "bnf-ancient",
    outOfScopeBehavior: "reject",
  });
  const markedNumeral = bnf.convertDetailed(
    "αʹ",
    "greek",
    "transliteration",
  );
  assertEquals(markedNumeral.output, "á");
  assertEquals(markedNumeral.diagnostics, []);
  assertEquals(markedNumeral.lossy, true);
  assertEquals(markedNumeral.losses.length > 0, true);
});

test("bound preset options remain overridable but not replaceable", () => {
  const converter = createConverter({ preset: "bnf-ancient" });

  assertEquals(converter.convert("ϙ", "greek", "transliteration"), "q");
  assertEquals(
    converter.convert("ϙ", "greek", "transliteration", {
      transliteration: { archaicKoppa: "k-dot-below" },
    }),
    "ḳ",
  );

  let message = "";
  try {
    converter.convert("α", "greek", "transliteration", {
      preset: "perseus",
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assertEquals(
    message,
    "Converter is bound to preset bnf-ancient; received perseus.",
  );
});

test("custom characters remain explicit preset extensions", () => {
  const converter = createConverter({ preset: "perseus", characters: [SAN] });
  const result = converter.convertDetailed("ϻϝ", "greek", "beta-code");

  assertEquals(result.output, "#9ϝ");
  assertEquals(
    result.diagnostics.map(({ character }) => character),
    ["digamma"],
  );
});

test("aliases receive the semantics of their built-in letter", () => {
  const converter = createConverter({
    aliases: [{
      letter: "theta",
      format: "transliteration",
      spellings: ["þ"],
    }],
  });

  assertEquals(
    converter.convert("þeos", "transliteration", "greek"),
    "θεος",
  );
  assertEquals(
    converter.convert("þeos", "transliteration", "beta-code"),
    "qeos",
  );
});

test("custom characters map directly without acquiring Greek rules", () => {
  const converter = createConverter({ characters: [SAN] });

  assertEquals(converter.convert("ϻ", "greek", "beta-code"), "#9");
  assertEquals(
    converter.convert("*#9", "beta-code", "transliteration"),
    "Š",
  );
  assertEquals(converter.convert("š", "transliteration", "greek"), "ϻ");
  assertEquals(
    converter.convert("ϻ", "greek", "transliteration"),
    "š",
  );

  const detailed = converter.convertDetailed(
    "Ϻϻ",
    "greek",
    "transliteration",
  );
  assertEquals(detailed.output, "Šš");
  assertEquals(detailed.lossy, false);
  assertEquals(detailed.losses, []);
  assertEquals(detailed.diagnostics, []);
});

test("custom Beta Code spellings ignore ASCII case", () => {
  const converter = createConverter({
    characters: [{
      id: "custom",
      forms: {
        greek: { lowercase: "ꙗ", uppercase: "Ꙗ" },
        "beta-code": { lowercase: "x9", uppercase: "*x9" },
        transliteration: { lowercase: "x̣", uppercase: "X̣" },
      },
      override: true,
    }],
  });

  assertEquals(converter.convert("X9", "beta-code", "greek"), "ꙗ");
  assertEquals(converter.convert("*X9", "beta-code", "greek"), "Ꙗ");
});

test("character exclusions preserve source-format spelling", () => {
  const converter = createConverter({ exclude: ["stigma"] });

  assertEquals(
    converter.convert("αϛβ", "greek", "transliteration"),
    "aϛb",
  );
  assertEquals(
    converter.convert("a#2b", "beta-code", "greek"),
    "α#2β",
  );
  // The code of the stigma is text in Greek, which Beta Code writes as such
  // (`a%1012b`): the conversion does not convert back, and says so.
  assertEquals(
    converter.convertDetailed("a#2b", "beta-code", "greek").losses.map((
      { code, index },
    ) => [code, index]),
    [["unrepresented-literal", 1]],
  );

  const detailed = converter.convertDetailed(
    "ἀϛβ",
    "greek",
    "transliteration",
  );
  assertEquals(detailed.lossy, false);
  assertEquals(detailed.diagnostics, [{
    code: "out-of-scope-character",
    index: 1,
    offset: 1,
    length: 1,
    character: "stigma",
    message:
      "Character stigma is outside this converter's repertoire and was preserved literally.",
  }]);
});

test("an excluded letter keeps its spelling in its word", () => {
  const sigma = createConverter({ exclude: ["sigma"] });

  // Written alone, the medial sigma of σῶμα became final (#68).
  assertNfcEquals(sigma.convert("λόγος σῶμα", "greek", "greek"), "λόγος σῶμα");
  assertNfcEquals(
    sigma.convert("λόγος σῶμα", "greek", "transliteration"),
    "lógoς σō̃ma",
  );
  assertNfcEquals(
    sigma.convert("λόγος σῶμα", "greek", "beta-code"),
    "lo/goς σw=ma",
  );
  assertNfcEquals(sigma.convert("λόγοϲ ϲῶμα", "greek", "greek"), "λόγοϲ ϲῶμα");
  const spans = sigma.convertDetailed("λόγος σῶμα", "greek", "transliteration")
    .spans.slice(4, 8).map(({ inputStart, outputStart, outputEnd }) => [
      inputStart,
      outputStart,
      outputEnd,
    ]);
  assertEquals(spans, [[4, 4, 5], [5, 5, 6], [6, 6, 7], [7, 7, 9]]);

  // A Beta Code mark is part of the letter, not a parenthesis to escape.
  assertNfcEquals(
    createConverter({ exclude: ["epsilon"] }).convert(
      "w(s e)pole/mhsan",
      "beta-code",
      "beta-code",
    ),
    "w(s e)pole/mhsan",
  );

  // A sigma whose shape the source does not note, lowercased, takes the
  // shape of its place in the whole source, beyond its word.
  for (const letterCase of ["lowercase", "title"] as const) {
    for (
      const text of ["‘Ο ΛΟΓΟΣ’ ΚΑΙ", "‘ΛΟΓΟΣ’ ΕΓΩ", "ΕΧΟΥΣ’ ΕΓΩ", "ΛΟΓΟΣ ΚΑΙ"]
    ) {
      const options = { text: { letterCase } };
      assertNfcEquals(
        sigma.convert(text, "greek", "greek", options),
        convert(text, "greek", "greek", options),
        `${letterCase}: ${text}`,
      );
    }
  }

  // Beta Code is written in its canonical spelling: the betaCode options only
  // say how the converted text is written, and no reader needs them.
  assertNfcEquals(
    sigma.convert("lo/gos", "beta-code", "greek", {
      betaCode: { case: "uppercase" },
    }),
    "λόγοs",
  );
  assertNfcEquals(
    createConverter({ preset: "tlg-core", exclude: ["sigma"] }).convert(
      "LO/GOS",
      "beta-code",
      "greek",
    ),
    "λόγοs",
  );
  assertNfcEquals(
    createConverter({ exclude: ["yot"] }).convert("ja", "beta-code", "greek", {
      betaCode: { yot: "#401" },
    }),
    "jα",
  );
});

test("an excluded letter that does not convert back is reported lost", () => {
  // A kept letter is written as its source spells it: the case and marks
  // that the source format notes with characters of its own read back as
  // those characters.
  const alpha = createConverter({ exclude: ["alpha"] });
  const iso = createConverter({ preset: "iso-843-type-1", exclude: ["alpha"] });
  const decimal = { text: { numerals: "decimal" } } as const;
  const cases = [
    [alpha, "a)", "beta-code", "greek", {}, true],
    [alpha, "*a", "beta-code", "greek", {}, true],
    [alpha, "a/", "beta-code", "transliteration", {}, true],
    [iso, "1’a", "transliteration", "greek", {}, true],
    [iso, "1’a", "transliteration", "beta-code", {}, true],
    // Combining marks read back, and Greek letters in Beta Code.
    [alpha, "ā", "transliteration", "greek", {}, false],
    [alpha, "ἀ", "greek", "beta-code", {}, false],
    [alpha, "ᾆω", "greek", "transliteration", decimal, false],
    // A letter whose marks the target reads apart, which makes a numeral of
    // the letters after it.
    [alpha, "ᾆωʹ", "greek", "transliteration", decimal, true],
  ] as const;
  for (const [converter, input, from, to, options, lossy] of cases) {
    const label = `${input}: ${from} → ${to}`;
    const result = converter.convertDetailed(input, from, to, options);
    assertEquals(result.lossy, lossy, label);
    if (lossy) {
      const kept = result.diagnostics[0].index;
      assertEquals(
        result.losses.some(({ code, index }) =>
          code === "unrepresented-literal" && index === kept
        ),
        true,
        label,
      );
    } else {
      assertEquals(
        converter.convert(result.output, to, from, options),
        converter.convert(input, from, from, options),
        label,
      );
    }
  }
});

test("an excluded letter of a transliteration is copied from the source", () => {
  const copy = (
    letter: string,
    input: string,
    configuration: { preset?: "bnf-ancient" | "ala-lc-modern" } = {},
  ) =>
    createConverter({ ...configuration, exclude: [letter] }).convert(
      input,
      "transliteration",
      "greek",
    );

  // Marks that the transliteration options leave out stay: bnf-ancient omits
  // the quantity, and the defaults the coronis and the smooth breathing.
  assertNfcEquals(copy("alpha", "pā́n", { preset: "bnf-ancient" }), "πā́ν");
  assertNfcEquals(copy("alpha", "ka᾽gṓ"), "κa᾽γώ");
  assertNfcEquals(copy("omicron", "o̓"), "o̓");
  // The spelling its neighbours give it stays.
  assertNfcEquals(copy("gamma", "ángelos"), "ἄngελος");
  assertNfcEquals(copy("upsilon", "autós"), "αuτός");
  // The h of a rough diphthong, written before both vowels, goes with the
  // vowel that has the breathing, in its case.
  assertNfcEquals(copy("iota", "hoi"), "οhi");
  assertNfcEquals(copy("omicron", "hoi"), "oἱ");
  assertNfcEquals(copy("omicron", "Hoi"), "Oἱ");
  assertNfcEquals(copy("iota", "HOI"), "ΟHI");
  assertNfcEquals(copy("upsilon", "heurískō"), "εhuρίσκω");
  assertNfcEquals(copy("alpha", "ta̓hi"), "τa̓ἱ");
  assertNfcEquals(copy("iota", "ta̓hi"), "τἀhi");
  // A letter whose spelling it shares with a neighbour is written alone.
  assertNfcEquals(copy("pi", "bála", { preset: "ala-lc-modern" }), "μpαλα");
  assertNfcEquals(
    createConverter({ preset: "ala-lc-modern", exclude: ["mu"] }).convert(
      "bála",
      "transliteration",
      "greek",
      { text: { letterCase: "title" } },
    ),
    "Mπαλα",
  );
});

test("the options of the converted text do not reach an excluded letter", () => {
  const omega = createConverter({ exclude: ["omega"] });
  const cases: Array<[ConversionOptions, Format, string]> = [
    [{ diacritics: { all: "remove" } }, "transliteration", "tῷ"],
    [{ diacritics: { iotaSubscript: "remove" } }, "beta-code", "tῷ"],
    [{ greek: { accentuation: "monotonic" } }, "greek", "τῷ"],
    [{ greek: { iotaSubscript: "adscript" } }, "beta-code", "tῷ"],
    [{ greek: { iotaSubscript: "adscript" } }, "transliteration", "tῷ"],
    [{ greek: { composition: "decomposed" } }, "transliteration", "tῷ"],
    [{ preset: "sbl-general" }, "transliteration", "tῷ"],
  ];
  for (const [options, to, expected] of cases) {
    assertNfcEquals(omega.convert("τῷ", "greek", to, options), expected);
  }

  const detailed = omega.convertDetailed("τῷ", "greek", "greek", {
    diacritics: { all: "remove" },
  });
  assertNfcEquals(detailed.output, "τῷ");
  assertEquals(detailed.lossy, false);
  assertEquals(detailed.diagnostics.length, 1);
  // Read back as a letter and its marks, the kept letter is retained.
  for (const options of [{}, { diacritics: { all: "remove" } }] as const) {
    const result = omega.convertDetailed(
      "τῷ",
      "greek",
      "transliteration",
      options,
    );
    assertNfcEquals(result.output, "tῷ");
    assertEquals(result.lossy, false);
  }
  assertEquals(
    omega.convertDetailed("τῷ", "greek", "transliteration", {
      text: { letterCase: "uppercase" },
    }).losses.map(({ code }) => code),
    ["changed-case"],
  );

  // The Unicode form of Greek output applies to the whole output.
  const alpha = createConverter({ exclude: ["alpha"] });
  assertEquals(
    alpha.convert("βά", "greek", "greek", { greek: { acute: "tonos" } }),
    "β\u03AC",
  );
  assertEquals(
    alpha.convert("βά", "greek", "greek", { greek: { acute: "oxia" } }),
    "β\u1F71",
  );
  assertEquals(
    alpha.convert("βά", "greek", "greek", {
      greek: { composition: "decomposed" },
    }),
    "β\u03B1\u0301",
  );
});

test("the transformations of the whole text reach an excluded letter", () => {
  const sigma = createConverter({ exclude: ["sigma"] });
  const title = { text: { letterCase: "title" } } as const;

  assertNfcEquals(
    sigma.convert("σῶμα λόγος", "greek", "greek", title),
    "Σῶμα Λόγος",
  );
  assertNfcEquals(
    sigma.convert("λόγος σῶμα", "greek", "transliteration", title),
    "Lógoς Σō̃ma",
  );
  assertNfcEquals(
    sigma.convert("lo/gos sw=ma", "beta-code", "greek", title),
    "Λόγοs *sῶμα",
  );
  assertNfcEquals(
    sigma.convert("λόγος σῶμα", "greek", "greek", {
      text: { letterCase: "uppercase" },
    }),
    "ΛΟΓΟΣ ΣΩΜΑ",
  );
  const omega = createConverter({ exclude: ["omega"] });
  assertNfcEquals(
    omega.convert("τῷ λόγῳ", "greek", "transliteration", title),
    "Tῷ Lógῳ",
  );
  assertNfcEquals(
    omega.convert("Τῼ͂", "greek", "transliteration", {
      text: { letterCase: "lowercase" },
    }),
    "tῷ",
  );
  assertNfcEquals(
    createConverter({ preset: "perseus" }).convert("ϝάναξ", "greek", "greek", {
      text: { letterCase: "title" },
    }),
    "Ϝάναξ",
  );
  assertNfcEquals(
    createConverter({ preset: "iso-843-type-1" }).convert(
      "ϛ λόγος",
      "greek",
      "transliteration",
      { text: { letterCase: "uppercase" } },
    ),
    "Ϛ LÓGOS",
  );
  // A transliteration copied from the source takes the case of its letter.
  assertNfcEquals(
    sigma.convert("lógos sō̃ma", "transliteration", "greek", title),
    "Λόγοs Sῶμα",
  );
  assertNfcEquals(
    sigma.convert("lógos sō̃ma", "transliteration", "greek", {
      text: { letterCase: "uppercase" },
    }),
    "ΛΟΓΟS SΩΜΑ",
  );
  const theta = createConverter({ exclude: ["theta"] });
  assertNfcEquals(
    theta.convert("Thoukydídēs", "transliteration", "greek", {
      text: { letterCase: "lowercase" },
    }),
    "thουκυδίδης",
  );
  assertNfcEquals(
    theta.convert("Thoukydídēs", "transliteration", "greek", {
      text: { letterCase: "uppercase" },
    }),
    "THΟΥΚΥΔΙΔΗΣ",
  );
  assertNfcEquals(
    sigma.convert(" λόγος \n\t σῶμα ", "greek", "greek", {
      text: { whitespace: "collapse" },
    }),
    "λόγος σῶμα",
  );

  // A numeral is written as one number, its excluded letters included.
  const stigma = createConverter({ exclude: ["stigma"] });
  const decimal = { text: { numerals: "decimal" } } as const;
  assertNfcEquals(
    stigma.convert("ϛʹ ιϛʹ ΙϚʹ αϛ", "greek", "transliteration", decimal),
    "6 16 16 aϛ",
  );
  const detailed = stigma.convertDetailed(
    "ιϛʹ",
    "greek",
    "transliteration",
    decimal,
  );
  assertNfcEquals(detailed.output, "16");
  assertEquals(
    detailed.diagnostics.map(({ index, character, message }) => [
      index,
      character,
      message,
    ]),
    [[
      1,
      "stigma",
      "Character stigma is outside this converter's repertoire and was written in a decimal numeral.",
    ]],
  );
  // Its spans and losses are those of the same conversion without exclusion.
  const plain = createConverter().convertDetailed(
    "ιϛʹ α",
    "greek",
    "transliteration",
    decimal,
  );
  const excluded = stigma.convertDetailed(
    "ιϛʹ α",
    "greek",
    "transliteration",
    decimal,
  );
  assertEquals(excluded.spans, plain.spans);
  assertEquals(excluded.losses, plain.losses);
  let error: unknown;
  try {
    createConverter({ exclude: ["stigma"], outOfScopeBehavior: "reject" })
      .convert("ϛʹ", "greek", "transliteration", decimal);
  } catch (caught) {
    error = caught;
  }
  assertEquals(error instanceof CharacterScopeError, true);
});

test("the letters around an excluded letter keep their place in its word", () => {
  const omicron = createConverter({ exclude: ["omicron"] });

  // A literal ended the word: σο gave ςο, and title case capitalized every
  // letter after the omicron.
  assertNfcEquals(
    omicron.convert("σο λόγος οἱ", "greek", "greek"),
    "σο λόγος οἱ",
  );
  assertNfcEquals(
    omicron.convert("λόγος", "greek", "greek", {
      text: { letterCase: "title" },
    }),
    "Λόγος",
  );
  assertNfcEquals(
    omicron.convert("λόγος οἱ", "greek", "transliteration", {
      text: { letterCase: "title" },
    }),
    "Lόgοs Οhi",
  );

  // A capital next to a kept capital is among capitals.
  assertNfcEquals(
    createConverter({ exclude: ["epsilon"] }).convert(
      "ΘΕΟΣ",
      "greek",
      "transliteration",
    ),
    "THΕOS",
  );
  assertNfcEquals(
    createConverter({ exclude: ["tau"] }).convert("Τῌ", "greek", "greek", {
      greek: { iotaSubscript: "capital-adscript" },
    }),
    "ΤΗΙ",
  );

  // A numeral cannot start inside a word.
  const alpha = createConverter({ exclude: ["alpha"] });
  assertNfcEquals(
    alpha.convert("αιʹ ͵α", "greek", "transliteration", {
      text: { numerals: "decimal" },
    }),
    "αiʹ 1000",
  );
  // The syllables of a word with an excluded letter cannot be counted: under
  // monotonic accentuation, it keeps its accent.
  assertNfcEquals(
    alpha.convert("καὶ θεοῦ", "greek", "greek", {
      greek: { accentuation: "monotonic" },
    }),
    "καί θεού",
  );
});

test("excluding a letter leaves Greek and Beta Code written again unchanged", () => {
  const text = "Θουκυδίδης Ἀθηναῖος ξυνέγραψε τὸν πόλεμον, ὡς ἐπολέμησαν " +
    "ῥᾳδίως ἔχουσ’ ἐγώ ‘λόγος’ ϲῶμαϲ ιϛʹ ΙΣΤʹ ͵αστʹ";
  const letters = [
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "zeta",
    "eta",
    "theta",
    "iota",
    "kappa",
    "lambda",
    "mu",
    "nu",
    "xi",
    "omicron",
    "pi",
    "rho",
    "sigma",
    "tau",
    "upsilon",
    "phi",
    "chi",
    "psi",
    "omega",
    "stigma",
  ];
  for (const format of ["greek", "beta-code"] as const) {
    const source = convert(text, "greek", format);
    for (
      const letterCase of [
        "preserve",
        "title",
        "uppercase",
        "lowercase",
      ] as const
    ) {
      for (const numerals of ["alphabetic", "decimal"] as const) {
        const options = { text: { letterCase, numerals } };
        const expected = convert(source, format, format, options);
        for (const letter of letters) {
          assertEquals(
            createConverter({ exclude: [letter] }).convert(
              source,
              format,
              format,
              options,
            ),
            expected,
            `${format}, ${letterCase}, ${numerals}, without ${letter}`,
          );
        }
      }
    }
  }
});

test("allow-lists apply to built-in and custom characters", () => {
  const converter = createConverter({
    characters: [SAN],
    repertoire: ["alpha", "beta"],
  });

  assertEquals(
    converter.convert("αϻγβ", "greek", "transliteration"),
    "aϻγb",
  );
  assertEquals(
    converter.convertDetailed("αϻγβ", "greek", "transliteration")
      .diagnostics.map(({ character }) => character),
    ["san", "gamma"],
  );
});

test("converter construction rejects ambiguous registries", () => {
  let message = "";
  try {
    createConverter({
      characters: [{
        id: "conflicting-a",
        forms: {
          greek: { lowercase: "ꙗ" },
          "beta-code": { lowercase: "~9" },
          transliteration: { lowercase: "a" },
        },
      }],
    });
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assertEquals(
    message,
    "transliteration spelling a already has a meaning; set override to true to replace it.",
  );
});

test("custom characters may be spelled outside the BMP", () => {
  // The readers must keep a surrogate pair as one literal, as Array.from()
  // does; otherwise this spelling would seem to have a meaning and require
  // override, and its sentinel would not be found again after parsing.
  const zero = "\u{1018A}"; // GREEK ZERO SIGN
  const converter = createConverter({
    characters: [{
      id: "zero",
      forms: {
        greek: { lowercase: zero },
        "beta-code": { lowercase: zero },
        transliteration: { lowercase: zero },
      },
    }],
  });

  for (
    const [source, from, to, output] of [
      [`${zero} ἄνθρωπος`, "greek", "transliteration", `${zero} ánthrōpos`],
      [`${zero} ἄνθρωπος`, "greek", "beta-code", `${zero} a)/nqrwpos`],
      [`${zero} a)/nqrwpos`, "beta-code", "greek", `${zero} ἄνθρωπος`],
      [`${zero} ánthrōpos`, "transliteration", "greek", `${zero} ἄνθρωπος`],
    ] as const
  ) {
    assertEquals(
      converter.convert(source, from, to).normalize("NFC"),
      output.normalize("NFC"),
    );
  }
});

test("spellings that a reader folds onto a letter already have a meaning", () => {
  // The Beta Code reader does not normalize and lowercases the Kelvin sign
  // to `k`, kappa; the Greek reader's NFD turns the ohm sign into omega.
  const neutral = "";
  const messageFor = (format: "greek" | "beta-code", spelling: string) => {
    try {
      createConverter({
        characters: [{
          id: "custom",
          forms: {
            greek: { lowercase: format === "greek" ? spelling : neutral },
            "beta-code": {
              lowercase: format === "beta-code" ? spelling : neutral,
            },
            transliteration: { lowercase: neutral },
          },
        }],
      });
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
    return "accepted";
  };

  assertEquals(
    messageFor("beta-code", "K"),
    "beta-code spelling K already has a meaning; set override to true to replace it.",
  );
  assertEquals(
    messageFor("greek", "Ω"),
    "greek spelling Ω already has a meaning; set override to true to replace it.",
  );
});

test("converter configuration is copied before use", () => {
  const forms = {
    greek: { lowercase: "ϻ", uppercase: "Ϻ" },
    "beta-code": { lowercase: "#9", uppercase: "*#9" },
    transliteration: { lowercase: "š", uppercase: "Š" },
  };
  const converter = createConverter({
    characters: [{ id: "san", forms, override: true }],
  });
  forms.transliteration.lowercase = "changed";

  assertEquals(converter.convert("ϻ", "greek", "transliteration"), "š");
});

test("a letter kept from a sign for several letters is written alone", () => {
  // Each letter of `ϗ`, `ȣ`, or a stigma read as `στ` is written alone, not
  // as the whole sign.
  assertNfcEquals(
    createConverter({ exclude: ["kappa"] }).convert(
      "ϗ τοῦ",
      "greek",
      "beta-code",
    ),
    "κai tou=",
  );
  assertNfcEquals(
    createConverter({ exclude: ["iota"] }).convert(
      "ϗ́ τοῦ",
      "greek",
      "transliteration",
    ),
    "kaί toũ",
  );
  assertNfcEquals(
    createConverter({ exclude: ["iota"] }).convert(
      "#1532/",
      "beta-code",
      "transliteration",
    ),
    "kai/",
  );
  assertNfcEquals(
    createConverter({ exclude: ["upsilon"] }).convert(
      "ȣ̓κ",
      "greek",
      "transliteration",
    ),
    "oὐk",
  );
  assertNfcEquals(
    createConverter({ exclude: ["tau"] }).convert(
      "ἐϛὶ",
      "greek",
      "transliteration",
      { greek: { stigma: "ligature" } },
    ),
    "esτì",
  );
});

test("a letter kept from an overlined run of Beta Code keeps its overline", () => {
  // The `<` and `>` of the run belong to its first and last letters: a
  // letter kept alone is written in a run of its own.
  const iso = createConverter({ preset: "iso-843-type-1" });
  assertNfcEquals(
    iso.convert("<i#2>", "beta-code", "transliteration"),
    "i̅<#2>",
  );
  assertNfcEquals(
    iso.convert("<#2i>", "beta-code", "transliteration"),
    "<#2>i̅",
  );
  const stigma = createConverter({ exclude: ["stigma"] });
  assertEquals(
    stigma.convert("<a#2b>", "beta-code", "beta-code"),
    "<a><#2><b>",
  );
  // What it writes reads as the source does.
  assertEquals(
    stigma.convert("<a><#2><b>", "beta-code", "greek"),
    stigma.convert("<a#2b>", "beta-code", "greek"),
  );
});

test("a mark the reader does not know stays once after a kept letter", () => {
  // Unicode writes it in one cluster with the marks of the letter, whose
  // span in Greek it shared: the kept letter took it, and the literal of the
  // mark followed, so that each conversion doubled it.
  const noAlpha = createConverter({ exclude: ["alpha"] });
  for (
    const [target, expected] of [
      ["greek", "ἅ̇ιδης"],
      ["beta-code", "ἅ̇idhs"],
      ["transliteration", "ἅ̇idēs"],
    ] as const
  ) {
    assertNfcEquals(noAlpha.convert("ἅ̇ιδης", "greek", target), expected);
  }
  const dots = (text: string) =>
    text.normalize("NFD").split("\u0307").length - 1;
  for (
    const [text, options] of [
      ["ἀ̇́ ᾅ̇", {}],
      ["Ἅ̇ιδης", { text: { letterCase: "uppercase" } }],
      ["ἅ̇ιδης", { text: { letterCase: "title" } }],
      ["Ἅ̇ιδης", { text: { letterCase: "lowercase" } }],
    ] as const
  ) {
    const output = noAlpha.convert(text, "greek", "greek", options);
    assertEquals(dots(output), dots(text));
    assertEquals(noAlpha.convert(output, "greek", "greek", options), output);
  }
  // Nothing is reported lost.
  assertEquals(
    noAlpha.convertDetailed("ἅ̇ιδης", "greek", "greek").lossy,
    false,
  );
});

test("a spacing breathing stays apart from a kept capital", () => {
  // A capital kept out of scope is a literal, whose letter no rule reads:
  // the writer keeps a sign before it apart, as before a capital that could
  // take it, so that the sign does not join it when read again: a spacing
  // breathing, or the spacing tonos `΄`.
  const zwnj = "\u200C";
  const noAlpha = createConverter({ exclude: ["alpha"] });
  const upper = { text: { letterCase: "uppercase" } } as const;
  for (
    const [text, format] of [
      ["῾ά λόγος", "greek"],
      ["΄ά λόγος", "greek"],
      ["%31a/ lo/gos", "beta-code"],
      ["῾á lógos", "transliteration"],
    ] as const
  ) {
    const output = noAlpha.convert(text, format, format, upper);
    assertEquals(output.includes(zwnj), true);
    assertEquals(noAlpha.convert(output, format, format, upper), output);
  }
  assertNfcEquals(
    createConverter({ exclude: ["rho"] }).convert(
      "῾ρόδος",
      "greek",
      "greek",
      upper,
    ),
    `῾${zwnj}ΡΟΔΟΣ`,
  );
});
