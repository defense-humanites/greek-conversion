import { assertEquals, assertThrows } from "@std/assert";
import {
  CONVERSION_OPTION_VALUES,
  convert,
  convertDetailed,
  createConverter,
  DEFAULT_CONVERSION_OPTIONS,
  FORMATS,
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
          orthography: { etaa: "ī" } as never,
        }),
      RangeError,
    ).message,
    "Unknown conversion option: orthography.etaa",
  );
});

Deno.test("names the options that replaced modernDigraphs", () => {
  assertEquals(
    assertThrows(
      () =>
        resolveConversionOptions({
          orthography: { modernDigraphs: "ala-lc" } as never,
        }),
      RangeError,
    ).message,
    "Unknown conversion option: orthography.modernDigraphs (replaced by orthography.muPi, orthography.nuTau, and orthography.nasalGamma).",
  );
});

Deno.test("rejects a circumflex for both length and accent", () => {
  // ῆ would be written ê̂ and read back as η without its accent.
  const both = {
    orthography: { longVowels: "circumflex", circumflexAccent: "circumflex" },
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
        { orthography: { longVowels: "circumflex" } },
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
            orthography: { longVowels: "circumflex" },
          }),
        RangeError,
      ).message,
      'orthography.longVowels "circumflex" cannot be combined with ' +
        `orthography.circumflexAccent "circumflex" (set by preset "${preset}"): ` +
        "the length mark and the accent would be written alike.",
    );
  }
  // Either circumflex alone is accepted.
  resolveConversionOptions({ orthography: { longVowels: "circumflex" } });
  resolveConversionOptions({
    preset: "bnf-core",
    orthography: { longVowels: "circumflex", circumflexAccent: "tilde" },
  });
});

Deno.test("rejects invalid option values instead of applying defaults", () => {
  assertEquals(
    assertThrows(
      () =>
        convert("ἄνθρωπος", "greek", "transliteration", {
          orthography: { eta: "ē" as never },
        }),
      RangeError,
    ).message,
    'Invalid value for orthography.eta: "ē"; expected one of "e", "i".',
  );
  // A value renamed before 1.0.0 names its replacement.
  assertEquals(
    assertThrows(
      () =>
        resolveConversionOptions({
          orthography: { eta: "i-macron" as never },
        }),
      RangeError,
    ).message,
    'Invalid value for orthography.eta: "i-macron"; expected one of "e", "i". "i-macron" is now "i".',
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
        { unicode: { acute: "sharp" } } as never,
      ),
    RangeError,
  );
});

Deno.test("rejects options of the wrong type with a TypeError", () => {
  assertThrows(() => resolveConversionOptions([] as never), TypeError);
  assertThrows(() => resolveConversionOptions(null as never), TypeError);
  assertThrows(
    () => resolveConversionOptions({ orthography: "lowercase" } as never),
    TypeError,
  );
  assertThrows(
    () => resolveConversionOptions({ removeDiacritics: "yes" } as never),
    TypeError,
  );
});

Deno.test("treats an undefined option field as absent", () => {
  assertEquals(
    resolveConversionOptions({
      orthography: { eta: undefined },
      unicode: undefined,
      removeDiacritics: undefined,
    }),
    DEFAULT_CONVERSION_OPTIONS,
  );
});

Deno.test("the option value table matches the defaults", () => {
  for (const group of ["orthography", "unicode", "diacritics"] as const) {
    const defaults = DEFAULT_CONVERSION_OPTIONS[group] as Record<
      string,
      string
    >;
    const table = CONVERSION_OPTION_VALUES[group] as Record<
      string,
      readonly string[]
    >;
    assertEquals(Object.keys(table).sort(), Object.keys(defaults).sort());
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
