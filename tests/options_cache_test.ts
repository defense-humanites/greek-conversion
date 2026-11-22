import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "./assertions.ts";
import {
  type ConversionOptions,
  convert,
  createConverter,
  listPresetMetadata,
  OptionError,
  type Preset,
  resolveConversionOptions,
} from "../src/mod.ts";
import { conversionProfiles } from "../src/presets.ts";
import { sblGeneral } from "../src/prepared_presets.ts";

/**
 * The profiles of the options that conversions take most often are resolved
 * once and shared (`conversionProfiles()` in `src/presets.ts`): what is
 * shared must be frozen, the same for options of the same form, never
 * returned to a caller who may change it, and never stand for options that
 * would have failed.
 */

test("options read otherwise a second time leave the shared profiles alone", () => {
  // First in this file: no profiles are shared yet, and the options below
  // would be the first to be resolved for their key.
  const text = "χάος ἀνήρ";
  const convertWith = (options?: unknown) =>
    convert(text, "greek", "transliteration", options as ConversionOptions);
  // A preset that is not enumerable, which Object.keys() does not list.
  convertWith(Object.defineProperty({}, "preset", { value: "iso-843-type-2" }));
  assertEquals(convertWith(), "cháos anḗr");
  assertEquals(convertWith({}), "cháos anḗr");
  // An accessor, and a proxy, that answer otherwise at each read.
  let reads = 0;
  const preset = () => reads++ % 2 === 0 ? "iso-843-type-2" : "sbl-general";
  convertWith({
    get preset() {
      return preset();
    },
  });
  convertWith(
    new Proxy(
      { preset: "perseus" },
      {
        get: (target, key) =>
          key === "preset" ? preset() : Reflect.get(target, key),
      },
    ),
  );
  convertWith(
    new Proxy(
      { preset: "perseus", source: {} },
      {
        get: (target, key) =>
          key === "source" ? { preset: preset() } : Reflect.get(target, key),
      },
    ),
  );
  assertEquals(convertWith({ preset: "iso-843-type-2" }), "cháos ’anír");
  assertEquals(convertWith({ preset: "sbl-general" }), "chaos anēr");
  // Options with another key are resolved at each call, from the preset.
  assertEquals(
    convertWith({ preset: "perseus" }),
    convertWith({ preset: "perseus", text: {} }),
  );
  assertEquals(
    convertWith({ preset: "perseus", source: {} }),
    convertWith({ preset: "perseus", source: {}, text: {} }),
  );
});

test("simple options are resolved once, and shared frozen", () => {
  for (
    const [first, second] of [
      [undefined, {}],
      [{ preset: "perseus" }, { preset: "perseus" }],
      [
        { preset: "iso-843-type-2", source: { preset: "ala-lc-modern" } },
        { source: { preset: "ala-lc-modern" }, preset: "iso-843-type-2" },
      ],
      [{ source: {} }, { source: {} }],
    ] as [ConversionOptions | undefined, ConversionOptions][]
  ) {
    const profiles = conversionProfiles(first);
    assert(profiles === conversionProfiles(second), JSON.stringify(second));
    assert(Object.isFrozen(profiles));
    for (const profile of [profiles.reading, profiles.writing]) {
      assert(Object.isFrozen(profile));
      for (const group of Object.values(profile)) {
        assert(Object.isFrozen(group));
      }
    }
  }
});

test("other options are resolved at each call", () => {
  for (
    const options of [
      { greek: { finalSigma: "medial" } },
      { preset: "perseus", text: { numerals: "decimal" } },
      { preset: "perseus", source: { preset: "sbl-general", greek: {} } },
    ] as ConversionOptions[]
  ) {
    assert(conversionProfiles(options) !== conversionProfiles(options));
  }
});

test("resolveConversionOptions() returns options of its own", () => {
  conversionProfiles({ preset: "perseus" });
  const resolved = resolveConversionOptions({ preset: "perseus" });
  assert(!Object.isFrozen(resolved) && !Object.isFrozen(resolved.greek));
  assert(resolved !== resolveConversionOptions({ preset: "perseus" }));
  resolved.greek.finalSigma = "medial";
  assertEquals(
    convert("λόγος", "greek", "greek", { preset: "perseus" }),
    "λόγος",
  );
});

test("options that fail are refused, whatever was resolved before", () => {
  const valid = { preset: "perseus", source: { preset: "sbl-general" } };
  convert("λόγος", "greek", "transliteration", valid as ConversionOptions);
  for (
    const invalid of [
      { preset: "perseus", source: { preset: "sbl-general", source: {} } },
      { preset: "perseus", source: { preset: "sbl-academic" } },
      { preset: "no-such-preset" },
      { preset: "" },
      { preset: "", source: {} },
      { preset: "perseus", source: undefined, extra: 1 },
    ]
  ) {
    for (let attempt = 0; attempt < 2; attempt++) {
      assertThrows(
        () =>
          convert(
            "λόγος",
            "greek",
            "transliteration",
            invalid as unknown as ConversionOptions,
          ),
        Error,
        undefined,
        JSON.stringify(invalid),
      );
    }
  }
  // The copy of prepared options has the symbol of their mark.
  convert("λόγος", "greek", "transliteration", {});
  assertThrows(
    () =>
      convert(
        "λόγος",
        "greek",
        "transliteration",
        { ...sblGeneral } as ConversionOptions,
      ),
    TypeError,
    "a copy of prepared options",
  );
  assertThrows(
    () =>
      convert("λόγος", "greek", "greek", { preset: 1 as unknown as Preset }),
    OptionError,
  );
});

test("only registered names are keys, read one way only", () => {
  for (const { id } of listPresetMetadata()) assert(!id.includes(" "), id);
  // Names that would read as the key of other options.
  for (
    const [valid, invalid] of [
      [{ preset: "sbl-general", source: {} }, { preset: "sbl-general " }],
      [
        { preset: "ala-lc-modern", source: { preset: "tlg-core" } },
        { preset: "ala-lc-modern tlg-core" },
      ],
      [{ source: { preset: "perseus" } }, { preset: " perseus" }],
      [{ preset: "perseus", source: {} }, { preset: "perseus " }],
      [{}, { preset: "" }],
    ]
  ) {
    convert("λόγος", "greek", "transliteration", valid as ConversionOptions);
    assertThrows(
      () =>
        convert(
          "λόγος",
          "greek",
          "transliteration",
          invalid as ConversionOptions,
        ),
      OptionError,
      undefined,
      JSON.stringify(invalid),
    );
  }
});

test("a converter bound to a preset converts as the preset", () => {
  const converter = createConverter({ preset: "sbl-general" });
  for (let attempt = 0; attempt < 2; attempt++) {
    assertEquals(
      converter.convert("χάος", "greek", "transliteration"),
      convert("χάος", "greek", "transliteration", { preset: "sbl-general" }),
    );
  }
});
