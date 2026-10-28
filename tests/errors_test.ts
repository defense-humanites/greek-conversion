import { assertEquals, assertThrows } from "@std/assert";
import {
  CONVERSION_OPTION_VALUES,
  convert,
  convertDetailed,
  createConverter,
  DEFAULT_CONVERSION_OPTIONS,
  FORMATS,
  OptionError,
  resolveConversionOptions,
} from "../src/mod.ts";
import { encode, parse } from "../src/document.ts";

Deno.test("rejects an unknown format with a RangeError", () => {
  const unknown = "latin" as never;
  for (
    const run of [
      () => convert("ἄνθρωπος", "greek", unknown),
      () => convert("abc", unknown, "greek"),
      () => convertDetailed("ἄνθρωπος", unknown, "greek"),
      () => parse("abc", unknown),
      () => encode([], unknown),
      () => createConverter().convert("ἄνθρωπος", "greek", unknown),
      () => createConverter().convertDetailed("ἄνθρωπος", unknown, "greek"),
    ]
  ) {
    const error = assertThrows(run, RangeError);
    assertEquals(error.message, "Unknown format: latin");
  }
  assertEquals([...FORMATS], ["greek", "beta-code", "transliteration"]);
});

Deno.test("rejects non-string input with a TypeError", () => {
  for (
    const [input, received] of [
      [null, "null"],
      [undefined, "undefined"],
      [123, "number"],
      [["α"], "object"],
    ] as const
  ) {
    const error = assertThrows(
      () => convert(input as never, "greek", "beta-code"),
      TypeError,
    );
    assertEquals(
      error.message,
      `Expected a string to convert, received ${received}.`,
    );
  }
  assertThrows(() => parse(null as never, "greek"), TypeError);
  assertThrows(
    () => createConverter().convert(1 as never, "greek", "beta-code"),
    TypeError,
  );
});

Deno.test("rejects unknown option keys instead of ignoring them", () => {
  assertEquals(
    assertThrows(
      () => resolveConversionOptions({ foo: true } as never),
      RangeError,
    ).message,
    "Unknown conversion option: foo",
  );
  assertEquals(
    assertThrows(
      () =>
        convert("ἄνθρωπος", "greek", "transliteration", {
          transliteration: { etaa: "ī" } as never,
        }),
      RangeError,
    ).message,
    "Unknown conversion option: transliteration.etaa",
  );
});

Deno.test("option errors are OptionErrors that locate the option", () => {
  const unknownKey = assertThrows(
    () => resolveConversionOptions({ text: { foo: "bar" } } as never),
    OptionError,
  );
  assertEquals(unknownKey instanceof RangeError, true);
  assertEquals(unknownKey.name, "OptionError");
  assertEquals(unknownKey.path, "text.foo");
  assertEquals(unknownKey.received, undefined);
  assertEquals(unknownKey.accepted, ["letterCase", "whitespace", "numerals"]);
  assertEquals(unknownKey.replacement, undefined);

  const badValue = assertThrows(
    () => resolveConversionOptions({ greek: { sigma: "nope" } } as never),
    OptionError,
  );
  assertEquals(badValue.path, "greek.sigma");
  assertEquals(badValue.received, "nope");
  assertEquals(badValue.accepted, ["standard", "lunate", "preserve"]);

  const badPreset = assertThrows(
    () => convert("α", "greek", "beta-code", { preset: "nope" } as never),
    OptionError,
  );
  assertEquals(badPreset.path, "preset");
  assertEquals(badPreset.received, "nope");
  assertEquals(badPreset.accepted.includes("sbl-academic"), true);

  const incompatible = assertThrows(
    () =>
      resolveConversionOptions({
        transliteration: {
          longVowels: "circumflex",
          circumflexAccent: "circumflex",
        },
      }),
    OptionError,
  );
  assertEquals(incompatible.path, "transliteration.longVowels");
  assertEquals(incompatible.received, "circumflex");
  assertEquals(incompatible.accepted, ["macron", "omit"]);
  assertEquals(Object.isFrozen(incompatible.accepted), true);
});

Deno.test("names the current path of the options of 1.0.0-rc.5", () => {
  const cases: [Record<string, unknown>, string, string][] = [
    [{ orthography: { eta: "i" } }, "orthography", "transliteration.eta"],
    [{ orthography: { sigma: "lunate" } }, "orthography", "greek.sigma"],
    [{ orthography: { numerals: "decimal" } }, "orthography", "text.numerals"],
    [
      { orthography: { betaCodeCase: "uppercase" } },
      "orthography",
      "betaCode.case",
    ],
    [{ orthography: { betaCodeYot: "#401" } }, "orthography", "betaCode.yot"],
    [
      { orthography: { modernDigraphs: "ala-lc" } },
      "orthography",
      "transliteration.muPi, transliteration.nuTau, and transliteration.nasalGamma",
    ],
    [{ unicode: { acute: "oxia" } }, "unicode", "greek.acute"],
    [{ removeDiacritics: true }, "removeDiacritics", "diacritics.all"],
  ];
  for (const [options, path, replacement] of cases) {
    const error = assertThrows(
      () => resolveConversionOptions(options as never),
      OptionError,
    );
    assertEquals(error.path, path, JSON.stringify(options));
    assertEquals(error.replacement, replacement, JSON.stringify(options));
    assertEquals(error.message.includes(replacement), true, error.message);
  }
  assertEquals(
    assertThrows(
      () => resolveConversionOptions({ orthography: { eta: "i" } } as never),
      OptionError,
    ).message,
    "Unknown conversion option: orthography (orthography.eta is now transliteration.eta)",
  );
  // A value renamed before 1.0.0 names its replacement too.
  assertEquals(
    assertThrows(
      () =>
        resolveConversionOptions({
          transliteration: { eta: "i-macron" as never },
        }),
      OptionError,
    ).replacement,
    "i",
  );
});

Deno.test("rejects a circumflex for both length and accent", () => {
  // ῆ would be written ê̂ and read back as η without its accent.
  const both = {
    transliteration: {
      longVowels: "circumflex",
      circumflexAccent: "circumflex",
    },
  } as const;
  assertThrows(() => resolveConversionOptions(both), RangeError);
  assertThrows(
    () => convert("ῆ", "greek", "transliteration", both),
    RangeError,
  );
  assertThrows(
    () =>
      createConverter({ preset: "bnf-core" }).convert(
        "ῆ",
        "greek",
        "transliteration",
        { transliteration: { longVowels: "circumflex" } },
      ),
    RangeError,
  );
  // A preset value counts as much as a custom one.
  for (const preset of ["bnf-core", "iso-843-type-1"] as const) {
    assertEquals(
      assertThrows(
        () =>
          resolveConversionOptions({
            preset,
            transliteration: { longVowels: "circumflex" },
          }),
        RangeError,
      ).message,
      'transliteration.longVowels "circumflex" cannot be combined with ' +
        `transliteration.circumflexAccent "circumflex" (set by preset "${preset}"): ` +
        "the length mark and the accent would be written alike.",
    );
  }
  // Either circumflex alone is accepted.
  resolveConversionOptions({ transliteration: { longVowels: "circumflex" } });
  resolveConversionOptions({
    preset: "bnf-core",
    transliteration: { longVowels: "circumflex", circumflexAccent: "tilde" },
  });
});

Deno.test("rejects invalid option values instead of applying defaults", () => {
  assertEquals(
    assertThrows(
      () =>
        convert("ἄνθρωπος", "greek", "transliteration", {
          transliteration: { eta: "ē" as never },
        }),
      RangeError,
    ).message,
    'Invalid value for transliteration.eta: "ē"; expected one of "e", "i".',
  );
  // A value renamed before 1.0.0 names its replacement.
  assertEquals(
    assertThrows(
      () =>
        resolveConversionOptions({
          transliteration: { eta: "i-macron" as never },
        }),
      RangeError,
    ).message,
    'Invalid value for transliteration.eta: "i-macron"; expected one of "e", "i". "i-macron" is now "i".',
  );
  assertThrows(
    () =>
      resolveConversionOptions({ diacritics: { accents: "drop" } } as never),
    RangeError,
  );
  assertThrows(
    () =>
      createConverter({ preset: "perseus" }).convert(
        "ἄνθρωπος",
        "greek",
        "beta-code",
        { greek: { acute: "sharp" } } as never,
      ),
    RangeError,
  );
});

Deno.test("rejects options of the wrong type with a TypeError", () => {
  assertThrows(() => resolveConversionOptions([] as never), TypeError);
  assertThrows(() => resolveConversionOptions(null as never), TypeError);
  assertThrows(
    () => resolveConversionOptions({ text: "lowercase" } as never),
    TypeError,
  );
  assertThrows(
    () => resolveConversionOptions({ diacritics: ["remove"] } as never),
    TypeError,
  );
});

Deno.test("treats an undefined option field as absent", () => {
  assertEquals(
    resolveConversionOptions({
      transliteration: { eta: undefined },
      greek: undefined,
      diacritics: { all: undefined },
    }),
    DEFAULT_CONVERSION_OPTIONS,
  );
});

Deno.test("the option value table matches the defaults", () => {
  for (
    const group of [
      "transliteration",
      "greek",
      "betaCode",
      "text",
      "diacritics",
    ] as const
  ) {
    const defaults = DEFAULT_CONVERSION_OPTIONS[group] as Record<
      string,
      string
    >;
    const table = CONVERSION_OPTION_VALUES[group] as Record<
      string,
      readonly string[]
    >;
    // `diacritics.all` is a shorthand with no default of its own.
    assertEquals(
      Object.keys(table).filter((key) => key !== "all").sort(),
      Object.keys(defaults).sort(),
    );
    for (const [key, value] of Object.entries(defaults)) {
      assertEquals(
        table[key].includes(value),
        true,
        `${group}.${key} default ${value} is an accepted value`,
      );
    }
    assertEquals(Object.isFrozen(table), true);
    for (const values of Object.values(table)) {
      for (const value of values) {
        // Every value must be typeable on any keyboard.
        assertEquals(/^[\x20-\x7E]+$/.test(value), true, value);
      }
    }
  }
  assertEquals(Object.isFrozen(CONVERSION_OPTION_VALUES), true);
});
