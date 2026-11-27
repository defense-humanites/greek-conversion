import { test } from "node:test";
import { assertEquals, assertThrows } from "./assertions.ts";
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

/** The end of the message for a preset that nothing resembles. */
const PRESETS =
  'expected one of "ala-lc-ancient", "ala-lc-modern", "bnf-ancient", "iso-843-type-1", "iso-843-type-2", "perseus", "sbl-general", "tlg-core".';

test("rejects an unknown format with a RangeError", () => {
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
    assertEquals(
      error.message,
      'Unknown format: latin; expected one of "greek", "beta-code", "transliteration".',
    );
  }
  assertEquals([...FORMATS], ["greek", "beta-code", "transliteration"]);
});

test("rejects non-string input with a TypeError", () => {
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

test("rejects unknown option keys instead of ignoring them", () => {
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

test("option errors are OptionErrors that locate the option", () => {
  const unknownKey = assertThrows(
    () => resolveConversionOptions({ text: { foo: "bar" } } as never),
    OptionError,
  );
  assertEquals(unknownKey instanceof RangeError, true);
  assertEquals(unknownKey.name, "OptionError");
  assertEquals(unknownKey.path, "text.foo");
  assertEquals(unknownKey.received, undefined);
  assertEquals(unknownKey.accepted, [
    "letterCase",
    "whitespace",
    "numerals",
  ]);
  assertEquals(unknownKey.replacement, undefined);

  const badValue = assertThrows(
    () => resolveConversionOptions({ greek: { sigma: "nope" } } as never),
    OptionError,
  );
  assertEquals(badValue.path, "greek.sigma");
  assertEquals(badValue.received, "nope");
  assertEquals(badValue.accepted, ["preserve", "standard", "lunate"]);

  const badPreset = assertThrows(
    () => convert("α", "greek", "beta-code", { preset: "nope" } as never),
    OptionError,
  );
  assertEquals(badPreset.path, "preset");
  assertEquals(badPreset.received, "nope");
  assertEquals(badPreset.accepted.includes("sbl-general"), true);
  // A preset removed before 1.0.0 says what to do instead; nothing replaces
  // it, since the defaults write what it wrote.
  const removed = assertThrows(
    () =>
      convert(
        "α",
        "greek",
        "transliteration",
        { preset: "sbl-academic" } as never,
      ),
    OptionError,
  );
  assertEquals(removed.path, "preset");
  assertEquals(removed.replacement, undefined);
  assertEquals(
    removed.message.startsWith(
      "Unknown conversion preset: sbl-academic (removed: the SBL Handbook defines no academic style for Greek",
    ),
    true,
  );
  assertEquals(
    convert("α", "greek", "transliteration", { preset: "sbl-general" }),
    "a",
  );
  // A preset renamed before 1.0.0 names its new name, as a source preset.
  const renamed = assertThrows(
    () =>
      convert(
        "α",
        "greek",
        "transliteration",
        { preset: "bnf-core" } as never,
      ),
    OptionError,
  );
  assertEquals(renamed.path, "preset");
  assertEquals(renamed.received, "bnf-core");
  assertEquals(renamed.replacement, "bnf-ancient");
  assertEquals(
    renamed.message,
    "Unknown conversion preset: bnf-core (bnf-core is now bnf-ancient)",
  );
  const renamedSource = assertThrows(
    () =>
      convert(
        "α",
        "greek",
        "transliteration",
        { source: { preset: "bnf-core" } } as never,
      ),
    OptionError,
  );
  assertEquals(renamedSource.path, "source.preset");
  assertEquals(renamedSource.replacement, "bnf-ancient");

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

test("the grave of eta requires transliteration without accents", () => {
  // `ὲ` would be written `è`, the eta of `"grave-circumflex"`.
  const graveEta = { longVowels: "grave-circumflex" } as const;
  const error = assertThrows(
    () => resolveConversionOptions({ transliteration: graveEta }),
    OptionError,
  );
  assertEquals(error.path, "diacritics.accents");
  assertEquals(error.received, "preserve");
  assertEquals(error.accepted, ["remove"]);
  assertEquals(
    error.message,
    'transliteration.longVowels "grave-circumflex" requires ' +
      'diacritics.accents "remove": the length mark of eta would be written ' +
      "as the grave accent of epsilon.",
  );
  assertEquals(
    assertThrows(
      () =>
        convert("ὕλη", "greek", "transliteration", {
          source: { transliteration: graveEta },
        }),
      OptionError,
    ).path,
    "source.diacritics.accents",
  );
  // Removed accents, by their class or with every diacritic, a preset's
  // included.
  for (
    const options of [
      { transliteration: graveEta, diacritics: { accents: "remove" } },
      { transliteration: graveEta, diacritics: { all: "remove" } },
      { preset: "sbl-general", transliteration: graveEta },
    ] as const
  ) {
    assertEquals(
      resolveConversionOptions(options).transliteration.longVowels,
      "grave-circumflex",
    );
  }
});

test("the options of source are checked, with paths that start with source.", () => {
  const cases: Array<[unknown, string, unknown]> = [
    [{ source: { source: {} } }, "source.source", undefined],
    [{ source: { foo: 1 } }, "source.foo", undefined],
    [
      { source: { transliteration: { phi: "x" } } },
      "source.transliteration.phi",
      "x",
    ],
    [{ source: { preset: "nope" } }, "source.preset", "nope"],
    [
      {
        source: {
          transliteration: {
            longVowels: "circumflex",
            circumflexAccent: "circumflex",
          },
        },
      },
      "source.transliteration.longVowels",
      "circumflex",
    ],
  ];
  for (const [options, path, received] of cases) {
    const error = assertThrows(
      () => convert("α", "greek", "greek", options as never),
      OptionError,
    );
    assertEquals(error.path, path);
    assertEquals(error.received, received);
  }
  // A source has the keys of a conversion, without a source of its own.
  assertEquals(
    assertThrows(
      () => resolveConversionOptions({ source: { foo: 1 } } as never),
      OptionError,
    ).accepted.includes("source"),
    false,
  );
  const replaced = assertThrows(
    () =>
      resolveConversionOptions(
        { source: { orthography: { betaCodeCase: "uppercase" } } } as never,
      ),
    OptionError,
  );
  // The keys of rc.5 were never accepted in source: no replacement there.
  assertEquals(replaced.path, "source.orthography.betaCodeCase");
  assertEquals("replacement" in replaced, false);
  assertEquals(
    "replacement" in assertThrows(
      () =>
        resolveConversionOptions(
          { source: { orthography: { modernDigraphs: true } } } as never,
        ),
      OptionError,
    ),
    false,
  );
  assertEquals(
    assertThrows(
      () => resolveConversionOptions({ source: { preset: "nope" } } as never),
      OptionError,
    ).message,
    `Unknown conversion preset for source.preset: nope; ${PRESETS}`,
  );
  for (const source of ["sbl-general", null, []]) {
    assertThrows(
      () => resolveConversionOptions({ source } as never),
      TypeError,
    );
  }
  assertEquals(
    resolveConversionOptions({ source: undefined }),
    DEFAULT_CONVERSION_OPTIONS,
  );
  assertThrows(
    () => resolveConversionOptions({ source: { text: "lowercase" } } as never),
    TypeError,
  );
  // The resolved options are those that write the output.
  assertEquals(
    resolveConversionOptions({ source: { preset: "ala-lc-modern" } }),
    DEFAULT_CONVERSION_OPTIONS,
  );
});

test("an OptionError has a replacement only when there is one", () => {
  // docs/stability.md: `replacement` is set only for keys and values that a
  // release candidate accepted, so `"replacement" in error` tells them apart.
  const unknown = assertThrows(
    () => resolveConversionOptions({ unknownKey: 1 } as never),
    OptionError,
  );
  assertEquals(Object.hasOwn(unknown, "replacement"), false);
  assertEquals("replacement" in unknown, false);

  const moved = assertThrows(
    () => resolveConversionOptions({ orthography: { eta: "i" } } as never),
    OptionError,
  );
  assertEquals(Object.hasOwn(moved, "replacement"), true);
  assertEquals(moved.replacement, "transliteration.eta");
});

test("names the current path of the options of 1.0.0-rc.5", () => {
  // `path` is the key `replacement` replaces: for an old group, its first key.
  const cases: [Record<string, unknown>, string, string][] = [
    [{ orthography: { eta: "i" } }, "orthography.eta", "transliteration.eta"],
    [{ orthography: { sigma: "lunate" } }, "orthography.sigma", "greek.sigma"],
    [
      { orthography: { numerals: "decimal" } },
      "orthography.numerals",
      "text.numerals",
    ],
    [
      { orthography: { betaCodeCase: "uppercase" } },
      "orthography.betaCodeCase",
      "betaCode.case",
    ],
    [
      { orthography: { betaCodeYot: "#401" } },
      "orthography.betaCodeYot",
      "betaCode.yot",
    ],
    [
      { orthography: { modernDigraphs: "ala-lc" } },
      "orthography.modernDigraphs",
      "transliteration.muPi, transliteration.nuTau, and transliteration.nasalGamma",
    ],
    [{ unicode: { acute: "oxia" } }, "unicode.acute", "greek.acute"],
    [{ removeDiacritics: true }, "removeDiacritics", "diacritics.all"],
  ];
  for (const [options, path, replacement] of cases) {
    const error = assertThrows(
      () => resolveConversionOptions(options as never),
      OptionError,
    );
    assertEquals(error.path, path, JSON.stringify(options));
    assertEquals(error.received, undefined, JSON.stringify(options));
    assertEquals(error.replacement, replacement, JSON.stringify(options));
    assertEquals(error.message.includes(replacement), true, error.message);
  }
  assertEquals(
    assertThrows(
      () => resolveConversionOptions({ orthography: { eta: "i" } } as never),
      OptionError,
    ).message,
    "Unknown conversion option: orthography.eta (orthography.eta is now transliteration.eta)",
  );
  // A key of an old group that no release had is named without replacement,
  // like the group itself when it is empty; a key the group never had is not
  // given one either.
  for (
    const [options, path] of [
      [
        { orthography: { quantityTransliteration: "omit" } },
        "orthography.quantityTransliteration",
      ],
      [{ orthography: {} }, "orthography"],
      [{ orthography: "x" }, "orthography"],
      [
        { orthography: { composition: "decomposed" } },
        "orthography.composition",
      ],
      [{ unicode: { eta: "i" } }, "unicode.eta"],
    ] as const
  ) {
    const error = assertThrows(
      () => resolveConversionOptions(options as never),
      OptionError,
    );
    assertEquals(error.path, path, JSON.stringify(options));
    assertEquals(error.replacement, undefined, JSON.stringify(options));
    assertEquals(error.message, `Unknown conversion option: ${path}`);
  }
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

test("rejects a circumflex for both length and accent", () => {
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
      createConverter({ preset: "bnf-ancient" }).convert(
        "ῆ",
        "greek",
        "transliteration",
        { transliteration: { longVowels: "circumflex" } },
      ),
    RangeError,
  );
  // A preset value counts as much as a custom one.
  for (const preset of ["bnf-ancient", "iso-843-type-1"] as const) {
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
  // The preset is named only when one of the two values comes from it.
  assertEquals(
    assertThrows(
      () =>
        resolveConversionOptions({
          preset: "perseus",
          transliteration: {
            longVowels: "circumflex",
            circumflexAccent: "circumflex",
          },
        }),
      OptionError,
    ).message.includes("set by preset"),
    false,
  );
  // Either circumflex alone is accepted.
  resolveConversionOptions({ transliteration: { longVowels: "circumflex" } });
  resolveConversionOptions({
    preset: "bnf-ancient",
    transliteration: { longVowels: "circumflex", circumflexAccent: "tilde" },
  });
});

test("rejects invalid option values instead of applying defaults", () => {
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

test("rejects options of the wrong type with a TypeError", () => {
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

test("treats an undefined option field as absent", () => {
  assertEquals(
    resolveConversionOptions({
      transliteration: { eta: undefined },
      greek: undefined,
      diacritics: { all: undefined },
    }),
    DEFAULT_CONVERSION_OPTIONS,
  );
});

test("the option value table matches the defaults", () => {
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

test("an unknown name spelled otherwise is named as it is written", () => {
  for (
    const [options, message] of [
      [
        { transliteration: { long_vowels: "omit" } },
        "Unknown conversion option: transliteration.long_vowels; did you mean transliteration.longVowels?",
      ],
      [
        { greek: { eta: "i" } },
        "Unknown conversion option: greek.eta; did you mean transliteration.eta?",
      ],
      [
        { letterCase: "lowercase" },
        "Unknown conversion option: letterCase; did you mean text.letterCase?",
      ],
      [
        { beta_code: { case: "uppercase" } },
        "Unknown conversion option: beta_code; did you mean betaCode?",
      ],
      [
        { source: { diacritics: { rough_breathing: "preserve" } } },
        "Unknown conversion option: source.diacritics.rough_breathing; did you mean source.diacritics.roughBreathing?",
      ],
      [
        { preset: "ISO-843-type-2" },
        'Unknown conversion preset: ISO-843-type-2; did you mean "iso-843-type-2"?',
      ],
      [{ preset: "iso843" }, `Unknown conversion preset: iso843; ${PRESETS}`],
    ] as const
  ) {
    const error = assertThrows(
      () => resolveConversionOptions(options as never),
      OptionError,
    );
    assertEquals(error.message, message);
    assertEquals(error.replacement, undefined);
  }
  // A key that two groups have is not guessed.
  assertEquals(
    assertThrows(
      () => resolveConversionOptions({ iotaSubscript: "adscript" } as never),
      OptionError,
    ).message,
    "Unknown conversion option: iotaSubscript",
  );
  assertEquals(
    assertThrows(
      () => convert("λόγος", "greek", "beta_code" as never),
      RangeError,
    ).message,
    'Unknown format: beta_code; did you mean "beta-code"?',
  );
});
