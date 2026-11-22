import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "./assertions.ts";
import { THUCYDIDES_1_1_10 } from "../bench/thucydides.ts";
import { EQUIVALENCES } from "./fixtures.ts";
import * as core from "../src/core.ts";
import * as betaCode from "../src/formats/beta_code.ts";
import * as greek from "../src/formats/greek.ts";
import * as transliteration from "../src/formats/transliteration.ts";
import * as presets from "../src/prepared_presets.ts";
import * as main from "../src/mod.ts";
import {
  type ConversionOptions,
  createConverter,
  type Format,
  FORMATS,
  listPresetMetadata,
  OptionError,
  type Preset,
} from "../src/mod.ts";
import { readerHooks, writerHooks } from "../src/codec.ts";
import { parse } from "../src/document.ts";
import { preparedProfiles } from "../src/prepared.ts";
import { resolveConversionProfiles } from "../src/presets.ts";
import { exampleOptions, EXAMPLES } from "../web/playground/examples.ts";

const FORMAT_VALUES = {
  greek: greek.greekFormat,
  "beta-code": betaCode.betaCodeFormat,
  transliteration: transliteration.transliterationFormat,
} as const;
const READERS = {
  greek: greek.greekReader,
  "beta-code": betaCode.betaCodeReader,
  transliteration: transliteration.transliterationReader,
} as const;
const WRITERS = {
  greek: greek.greekWriter,
  "beta-code": betaCode.betaCodeWriter,
  transliteration: transliteration.transliterationWriter,
} as const;

/** The export of `./presets` for a preset: its identifier in camel case. */
function presetExport(preset: Preset): core.PreparedOptions {
  const name = preset.replace(/-([a-z0-9])/g, (_, next) => next.toUpperCase());
  return (presets as unknown as Record<string, core.PreparedOptions>)[name];
}

const SAMPLES = [
  THUCYDIDES_1_1_10,
  EQUIVALENCES.map((equivalence) => equivalence.greek).join(" "),
  "ϗ νῦν ϗ ἀεὶ ϗ εἰς τοὺς αἰῶνας τῶν αἰώνων· ἐν τῷ ὀνόματι τοῦ κ̅υ̅ ι̅υ̅ χ̅υ̅",
  "ἔτους ͵ϛφιϛʹ, ἰνδικτιῶνος ιεʹ· ἐϛὶ ϲοφὸϲ ϐίϐλοϲ ϑεός Θεσσαλονίκη ῥῆτορ",
  "῾Ρωμαῖοι, «ΟΥ̓ΚΟΥ͂Ν» — ἀΐδιος; 1 ξʹ ʹ ἄ\u0301 abc 漢字 \u200C",
];

/** Options as the main entry point takes them, and their prepared form. */
const OPTION_SETS: readonly {
  name: string;
  options: ConversionOptions | undefined;
  prepared: core.PreparedOptions | undefined;
}[] = [
  { name: "defaults", options: undefined, prepared: undefined },
  ...listPresetMetadata().map(({ id }) => ({
    name: id,
    options: { preset: id },
    prepared: presetExport(id),
  })),
  ...([
    { preset: "iso-843-type-2", source: { preset: "ala-lc-modern" } },
    { greek: { stigma: "ligature", kaiAccent: "modern" } },
    { greek: { accentuation: "monotonic", composition: "decomposed" } },
    { text: { numerals: "decimal", whitespace: "collapse" } },
    { diacritics: { all: "remove" }, transliteration: { eta: "i" } },
    { preset: "bnf-core", greek: { ligatures: "standard" }, source: {} },
  ] satisfies ConversionOptions[]).map((options) => ({
    name: JSON.stringify(options),
    options,
    prepared: core.prepareOptions(options),
  })),
];

test("the core functions convert as the main entry point", () => {
  for (const { name, options, prepared } of OPTION_SETS) {
    for (const from of FORMATS) {
      for (const sample of SAMPLES) {
        const input = main.convert(sample, "greek", from);
        for (const to of FORMATS) {
          const label = `${name}: ${from} → ${to}: ${sample.slice(0, 20)}`;
          assertEquals(
            core.convert(input, READERS[from], WRITERS[to], prepared),
            main.convert(input, from, to, options),
            label,
          );
          assertEquals(
            core.convertDetailed(
              input,
              FORMAT_VALUES[from],
              FORMAT_VALUES[to],
              prepared,
            ),
            main.convertDetailed(input, from, to, options),
            label,
          );
        }
        assertEquals(
          core.reencode(input, FORMAT_VALUES[from], prepared),
          main.reencode(input, from, options),
          `${name}: ${from}: ${sample.slice(0, 20)}`,
        );
      }
    }
  }
});

test("the core functions give the playground examples' outputs", () => {
  for (const [preset, examples] of Object.entries(EXAMPLES)) {
    for (const example of examples) {
      const options = exampleOptions(example, preset as Preset | "");
      assertEquals(
        core.convert(
          example.text,
          READERS[example.from],
          WRITERS[example.to],
          core.prepareOptions(options),
        ),
        example.output,
        `${preset || "library defaults"}: ${example.title}`,
      );
    }
  }
});

test("each preset is exported as its options, prepared", () => {
  const names: string[] = [];
  for (const { id } of listPresetMetadata()) {
    const prepared = presetExport(id);
    assert(prepared !== undefined, `${id} is exported`);
    assertEquals(
      preparedProfiles(prepared),
      resolveConversionProfiles({ preset: id }),
      id,
    );
    names.push(id.replace(/-([a-z0-9])/g, (_, next) => next.toUpperCase()));
  }
  assertEquals(Object.keys(presets).sort(), names.sort());
});

/** The key of the one property of prepared options (`prepared_mark.ts`). */
const PREPARED = Symbol.for("@humanities/greek-conversion/prepared");

test("readers, writers and prepared options show nothing", () => {
  const handles: unknown[] = [
    ...Object.values(READERS),
    ...Object.values(WRITERS),
    ...Object.values(FORMAT_VALUES),
  ];
  const prepared: unknown[] = [
    ...Object.values(presets),
    core.prepareOptions({ preset: "perseus" }),
  ];
  for (const value of handles) {
    assertEquals(Reflect.ownKeys(value as object), []);
  }
  // Prepared options show the preset they are, as a mark that spreading
  // copies; their options are private.
  for (const [index, value] of prepared.entries()) {
    assertEquals(Reflect.ownKeys(value as object), [PREPARED]);
    assertEquals(
      (value as Record<symbol, unknown>)[PREPARED],
      index < listPresetMetadata().length
        ? listPresetMetadata()[index].id
        : null,
    );
  }
  for (const value of [...handles, ...prepared]) {
    assertEquals(JSON.stringify(value), "{}");
    // Frozen, a value is not wrapped in a Proxy by reactive state (Vue).
    assert(Object.isFrozen(value));
  }
});

test("the hooks and the profiles behind the values are frozen", () => {
  for (const format of FORMATS) {
    const reading = readerHooks(READERS[format])!;
    const writing = writerHooks(WRITERS[format])!;
    assert(Object.isFrozen(reading), format);
    assert(Object.isFrozen(writing), format);
    // The joined value holds the same hooks.
    assert(readerHooks(FORMAT_VALUES[format]) === reading, format);
    assert(writerHooks(FORMAT_VALUES[format]) === writing, format);
  }
  for (
    const prepared of [
      ...Object.values(presets),
      core.prepareOptions({ preset: "perseus", source: {} }),
    ]
  ) {
    const profiles = preparedProfiles(prepared)!;
    assert(Object.isFrozen(profiles));
    for (const profile of [profiles.reading, profiles.writing]) {
      assert(Object.isFrozen(profile));
      for (const group of Object.values(profile)) {
        assert(Object.isFrozen(group));
      }
    }
  }
});

test("readers, writers and prepared options lead to nothing by their constructor", () => {
  const values: unknown[] = [
    greek.greekReader,
    greek.greekWriter,
    greek.greekFormat,
    presets.iso843Type2,
    core.prepareOptions({ preset: "perseus" }),
  ];
  for (const value of values) {
    const constructor = (value as object).constructor as unknown as {
      new (...values: unknown[]): unknown;
    };
    // No static member reads the private fields, and none can be added.
    assertEquals(Reflect.ownKeys(constructor).sort(), [
      "length",
      "name",
      "prototype",
    ]);
    assert(Object.isFrozen(constructor));
    assert(Object.isFrozen(constructor.prototype));
    // A value is not made from outside, even with the hooks of another.
    for (
      const values of [
        [],
        [Symbol(), { format: "greek", read: () => [] }, undefined],
        [Symbol(), { reading: {}, writing: {} }],
      ]
    ) {
      assertThrows(() => new constructor(...values), TypeError);
    }
  }
  assertEquals(
    core.convert(
      "Βάσος",
      READERS.greek,
      WRITERS.transliteration,
      presets.iso843Type2,
    ),
    "Vásos",
  );
});

test("prepared options are those prepared, whatever happens to the object", () => {
  const options = { transliteration: { eta: "i" as "e" | "i" } };
  const prepared = core.prepareOptions(options);
  const expected = main.convert("ἦθος", "greek", "transliteration", options);
  options.transliteration.eta = "e";
  assertEquals(
    core.convert("ἦθος", READERS.greek, WRITERS.transliteration, prepared),
    expected,
  );
  assert(expected.startsWith("ī"), expected);
});

test("prepareOptions validates as the main entry point", () => {
  assertEquals(core.OptionError, OptionError);
  assertThrows(
    () => core.prepareOptions({ preset: "sbl-academic" as Preset }),
    OptionError,
  );
  assertThrows(
    () => core.prepareOptions({ transliteration: { eta: "η" as "e" } }),
    OptionError,
  );
  assertThrows(
    () =>
      core.prepareOptions({ source: { transliteration: { phi: "p" as "f" } } }),
    OptionError,
  );
  assertThrows(() => core.prepareOptions(null as never), TypeError);
});

test("the core functions name what to import for a value they do not take", () => {
  const text = "λόγος";
  const writer = WRITERS.transliteration;
  assertThrows(
    // @ts-expect-error: the core functions take readers, not format names.
    () => core.convert(text, "greek", writer),
    TypeError,
    'Expected a reader as `from`, received "greek": import readers and writers from "@humanities/greek-conversion/greek"',
  );
  assertThrows(
    // @ts-expect-error: a writer is not a reader.
    () => core.convert(text, greek.greekWriter, writer),
    TypeError,
    "Expected a reader as `from`, received a writer",
  );
  assertThrows(
    // @ts-expect-error: an object of the same shape is not a reader.
    () => core.convert(text, {}, writer),
    TypeError,
    "Expected a reader as `from`",
  );
  assertThrows(
    // @ts-expect-error: a reader is not a writer.
    () => core.convert(text, greek.greekReader, greek.greekReader),
    TypeError,
    "Expected a writer as `to`",
  );
  assertThrows(
    // @ts-expect-error: convertDetailed() reads back what it writes.
    () => core.convertDetailed(text, greek.greekReader, FORMAT_VALUES.greek),
    TypeError,
    "Expected the reader and writer of a format as `from`, received a reader",
  );
  assertThrows(
    // @ts-expect-error: convertDetailed() reads back what it writes.
    () => core.convertDetailed(text, FORMAT_VALUES.greek, writer),
    TypeError,
    "Expected the reader and writer of a format as `to`",
  );
  assertThrows(
    // @ts-expect-error: reencode() reads and writes one format.
    () => core.reencode(text, greek.greekWriter),
    TypeError,
    "Expected the reader and writer of a format as `format`",
  );
  assertThrows(
    // @ts-expect-error: the core functions take prepared options only.
    () => core.convert(text, greek.greekReader, writer, { preset: "perseus" }),
    TypeError,
    'Expected prepared options, received an object: import a preset from "@humanities/greek-conversion/presets", or prepare options with prepareOptions()',
  );
  assertThrows(
    // @ts-expect-error: the input is a string.
    () => core.convert(42, greek.greekReader, writer),
    TypeError,
  );
});

test("the main entry point refuses readers, writers and prepared options", () => {
  assertThrows(
    () =>
      main.convert("λόγος", greek.greekReader as unknown as Format, "greek"),
    RangeError,
    'Unknown format: [object Object]; readers and writers go to "@humanities/greek-conversion/core"',
  );
  for (
    const options of [
      presets.sblGeneral,
      { source: presets.sblGeneral },
    ] as unknown as ConversionOptions[]
  ) {
    assertThrows(
      () => main.convert("λόγος", "greek", "transliteration", options),
      TypeError,
      'options, received prepared options, which only the functions of "@humanities/greek-conversion/core" take: name the preset instead, as in { preset: "sbl-general" }.',
    );
    assertThrows(
      () => parse("λόγος", "greek", options),
      TypeError,
      "received prepared options",
    );
    assertThrows(
      () => createConverter().convert("λόγος", "greek", "greek", options),
      TypeError,
      "received prepared options",
    );
  }
});

test("prepared options spread into options are refused, with what to write", () => {
  const spread = {
    ...presets.sblGeneral,
    transliteration: { chi: "kh" },
  } as ConversionOptions;
  for (
    const prepare of [
      (options: ConversionOptions) => core.prepareOptions(options),
      (options: ConversionOptions) =>
        main.convert("χάος", "greek", "transliteration", options),
    ]
  ) {
    assertThrows(
      () => prepare(spread),
      TypeError,
      'Expected conversion options, received a copy of prepared options, which holds none of them: name the preset instead, as in { preset: "sbl-general" }.',
    );
    assertThrows(
      () =>
        prepare({ source: { ...presets.iso843Type2 } } as ConversionOptions),
      TypeError,
      'Expected source options, received a copy of prepared options, which holds none of them: name the preset instead, as in { preset: "iso-843-type-2" }.',
    );
    assertThrows(
      () =>
        prepare(
          { ...core.prepareOptions({ greek: {} }) } as ConversionOptions,
        ),
      TypeError,
      "received a copy of prepared options, which holds none of them: give the options that were prepared instead.",
    );
    assertThrows(
      () =>
        prepare(
          {
            source: { transliteration: presets.iso843Type2 },
          } as unknown as ConversionOptions,
        ),
      TypeError,
      'Expected source.transliteration options, received prepared options, which only the functions of "@humanities/greek-conversion/core" take: name the preset instead, as in { preset: "iso-843-type-2" }.',
    );
  }
  assertThrows(
    () => core.prepareOptions(presets.iso843Type2 as ConversionOptions),
    TypeError,
    'Expected conversion options, received prepared options, which only the functions of "@humanities/greek-conversion/core" take: name the preset instead, as in { preset: "iso-843-type-2" }.',
  );
  // The configuration of a converter, and the options of a bound one.
  for (
    const configuration of [
      presets.sblGeneral,
      { ...presets.sblGeneral, outOfScopeBehavior: "reject" },
    ]
  ) {
    assertThrows(
      () => createConverter(configuration as never),
      TypeError,
      "Expected the converter configuration, received ",
    );
  }
  assertThrows(
    () =>
      createConverter({ preset: "perseus" }).convert(
        "χάος",
        "greek",
        "transliteration",
        presets.iso843Type2 as ConversionOptions,
      ),
    TypeError,
    'Expected conversion options, received prepared options, which only the functions of "@humanities/greek-conversion/core" take:',
  );
  // A preset object given for its name.
  assertThrows(
    () =>
      main.convert("χάος", "greek", "transliteration", {
        preset: presets.sblGeneral as unknown as Preset,
      }),
    OptionError,
    'Unknown conversion preset: prepared options, which are not its name: name it instead, as in { preset: "sbl-general" }',
  );
  // What the error says to write converts with the preset and the change.
  assertEquals(
    core.convert(
      "χάος",
      READERS.greek,
      WRITERS.transliteration,
      core.prepareOptions({
        preset: "sbl-general",
        transliteration: { chi: "kh" },
      }),
    ),
    "khaos",
  );
  assertThrows(
    () =>
      core.convert(
        "χάος",
        READERS.greek,
        WRITERS.transliteration,
        // @ts-expect-error: a copy is not prepared options.
        { ...presets.sblGeneral },
      ),
    TypeError,
    "Expected prepared options, received a copy of prepared options:",
  );
});

test("a format's reader, writer and both are distinct values", () => {
  for (const format of FORMATS) {
    const both = FORMAT_VALUES[format];
    assert(both !== (READERS[format] as unknown));
    assert(both !== (WRITERS[format] as unknown));
    // Either half can stand for its role.
    assertEquals(
      core.convert("λόγος", READERS.greek, WRITERS[format]),
      core.convert("λόγος", FORMAT_VALUES.greek, both),
    );
  }
});
