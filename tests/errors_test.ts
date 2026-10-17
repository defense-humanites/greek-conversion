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

Deno.test("rejects invalid option values instead of applying defaults", () => {
  assertEquals(
    assertThrows(
      () =>
        convert("ἄνθρωπος", "greek", "transliteration", {
          orthography: { eta: "e" as never },
        }),
      RangeError,
    ).message,
    'Invalid value for orthography.eta: "e"; expected one of "ē", "ī".',
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
  }
  assertEquals(Object.isFrozen(CONVERSION_OPTION_VALUES), true);
});
