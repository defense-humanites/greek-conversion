import { assertEquals } from "@std/assert";
import { convert, createConverter } from "../src/mod.ts";

const SAN = {
  id: "san",
  forms: {
    greek: { lowercase: "ϻ", uppercase: "Ϻ" },
    "beta-code": { lowercase: "#9", uppercase: "*#9" },
    transliteration: { lowercase: "š", uppercase: "Š" },
  },
  override: true,
} as const;

Deno.test("the default converter preserves the functional contract", () => {
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

Deno.test("bound presets apply their options and audited scope", () => {
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

Deno.test("bound preset scopes match the audited additional-letter matrix", () => {
  const source = "αϝϳϛϟϙϡ";
  const cases = [
    ["ala-lc-ancient", ["yot", "stigma", "koppa", "sampi"]],
    [
      "ala-lc-modern",
      ["digamma", "yot", "stigma", "koppa", "archaic-koppa", "sampi"],
    ],
    ["bnf-core", []],
    ["iso-843-type-1", []],
    [
      "perseus",
      ["digamma", "yot", "stigma", "koppa", "archaic-koppa", "sampi"],
    ],
    [
      "sbl-academic",
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

Deno.test("bound preset options remain overridable but not replaceable", () => {
  const converter = createConverter({ preset: "bnf-core" });

  assertEquals(converter.convert("ϙ", "greek", "transliteration"), "q");
  assertEquals(
    converter.convert("ϙ", "greek", "transliteration", {
      orthography: { archaicKoppa: "k-dot-below" },
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
    "Converter is bound to preset bnf-core; received perseus.",
  );
});

Deno.test("custom characters remain explicit preset extensions", () => {
  const converter = createConverter({ preset: "perseus", characters: [SAN] });
  const result = converter.convertDetailed("ϻϝ", "greek", "beta-code");

  assertEquals(result.output, "#9ϝ");
  assertEquals(
    result.diagnostics.map(({ character }) => character),
    ["digamma"],
  );
});

Deno.test("aliases receive the semantics of their built-in letter", () => {
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

Deno.test("custom characters map directly without acquiring Greek rules", () => {
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

Deno.test("custom Beta Code spellings ignore ASCII case", () => {
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

Deno.test("character exclusions preserve source-format spelling", () => {
  const converter = createConverter({ exclude: ["stigma"] });

  assertEquals(
    converter.convert("αϛβ", "greek", "transliteration"),
    "aϛb",
  );
  assertEquals(
    converter.convert("a#2b", "beta-code", "greek"),
    "α#2β",
  );
  assertEquals(
    converter.convertDetailed("a#2b", "beta-code", "greek").lossy,
    false,
  );

  const detailed = converter.convertDetailed(
    "αϛβ",
    "greek",
    "transliteration",
  );
  assertEquals(detailed.lossy, false);
  assertEquals(detailed.diagnostics, [{
    code: "out-of-scope-character",
    index: 1,
    character: "stigma",
    message:
      "Character stigma is outside this converter's repertoire and was preserved literally.",
  }]);
});

Deno.test("allow-lists apply to built-in and custom characters", () => {
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

Deno.test("converter construction rejects ambiguous registries", () => {
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

Deno.test("converter configuration is copied before use", () => {
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
