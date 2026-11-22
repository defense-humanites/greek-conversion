import { test } from "node:test";
import * as reference from "greek-conversion-previous";
import { THUCYDIDES_1_1_10 } from "../bench/thucydides.ts";
import type { Format } from "../src/mod.ts";
import { EXAMPLES } from "../web/playground/examples.ts";
import { DIFFICULT_WORDS, RAW_SOURCES } from "./difficult_forms.ts";
import {
  compareConversions,
  compareConverters,
  describeDifference,
  type Difference,
  DIFFERENTIAL_FORMATS,
  optionSets,
  pick,
  seeded,
} from "./differential.ts";
import { EQUIVALENCES, valueFor } from "./fixtures.ts";

/**
 * This tree against the previous release, published on npm (see
 * `differential.ts`), over the inputs of the repository: a long text, the
 * difficult forms and phrases made of them, the equivalences, the
 * playground's examples, Byzantine lines, raw Beta Code and
 * transliteration, and strings drawn at random from the signs of each
 * format, which no one writes but which the readers must read as before.
 */

/** Byzantine lines, with signs for several letters, numerals and overlines. */
const BYZANTINE = [
  "ϗ νῦν ϗ ἀεὶ ϗ εἰς τοὺς αἰῶνας τῶν αἰώνων· ἐν τῷ ὀνόματι τοῦ κ̅υ̅ ι̅υ̅ χ̅υ̅",
  "ἔτους ͵ϛφιϛʹ, ἰνδικτιῶνος ιεʹ· ἐϛὶ ϲοφὸϲ ϐίϐλοϲ ϑεός Θεσσαλονίκη ῥῆτορ",
  "῾Ρωμαῖοι, «ΟΥ̓ΚΟΥ͂Ν» — ἀΐδιος; 1 ξʹ ʹ ἄ́ abc 漢字 ‌",
];

/** The signs that random strings are drawn from, by format. */
const SIGNS: Readonly<Record<Format, readonly (readonly string[])[]>> = {
  greek: [
    [..."αβγδεζηθικλμνξοπρστυφχψωςϲϳ"],
    [..."ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"],
    [..."ϝϛϟϙϡϗȣϜϚϞϘϠϐϑϕϰϱϵ"],
    [..."̓̔́̀͂̈̄̆̅ͅ"],
    [..."ἄὅᾶῷΐϊἙὙῤῥάέήίόύώ᾽᾿῾΅῍῎"],
    [..."  ,.;·;·;«»—'’ʹ͵ʼʹ͵()[]"],
    [..."0123456789a漢‌\n"],
  ],
  "beta-code": [
    [..."abgdezhqiklmncoprstufxywvj"],
    [..."**))((//\\\\==++||''"],
    [..."#%0123456789"],
    [...'<>[]{}  ,.;:-_$&@^"'],
  ],
  transliteration: [
    [..."abgdezēthiklmnxoprstuyōhcfvw"],
    [..."ABGDEZĒTHIKLMNXOPRSTUYŌ"],
    [..."āēīōūăĭŭáéíóúàèìòùâêîôûǖǘüï"],
    [..."́̀͂̃̈̄̆̓̔̅ͅ"],
    [..."῾᾿ʹ’'-·;.,  ()0123456789"],
  ],
};

/** `count` strings drawn from the signs of `format`, the same every run. */
function randomStrings(format: Format, count: number, seed: number): string[] {
  const draw = seeded(seed);
  return Array.from({ length: count }, () => {
    let text = "";
    for (let length = 1 + Math.floor(draw() * 14); length > 0; length--) {
      text += pick(draw, pick(draw, SIGNS[format]));
    }
    return text;
  });
}

/** Phrases of difficult words, joined as text joins them. */
function phrases(count: number): string[] {
  const draw = seeded(2026);
  const separators = [" ", " ", ", ", "\n", " · "];
  return Array.from(
    { length: count },
    () =>
      Array.from(
        { length: 1 + Math.floor(draw() * 3) },
        () => pick(draw, DIFFICULT_WORDS),
      ).join(pick(draw, separators)),
  );
}

/** The inputs written in each format. */
function inputs(): Record<Format, string[]> {
  const greek = [
    THUCYDIDES_1_1_10,
    ...DIFFICULT_WORDS,
    ...phrases(120),
    ...BYZANTINE,
  ];
  const result = {} as Record<Format, string[]>;
  for (const format of DIFFERENTIAL_FORMATS) {
    result[format] = [
      ...(format === "greek" ? greek : [
        // The Greek inputs as the reference writes them by default.
        ...[THUCYDIDES_1_1_10, ...phrases(120), ...BYZANTINE].map((text) =>
          reference.convert(text, "greek", format)
        ),
        ...RAW_SOURCES.filter((source) => source.format === format).map(
          (source) => source.text,
        ),
      ]),
      EQUIVALENCES.map((equivalence) => valueFor(equivalence, format)).join(
        " ",
      ),
      ...Object.values(EXAMPLES).flat().filter((example) =>
        example.from === format
      ).map((example) => example.text),
      ...randomStrings(format, 150, 2026 + format.length),
    ];
  }
  return result;
}

function report(differences: Difference[]): string {
  return [
    `${differences.length} differences with the previous release:`,
    ...differences.slice(0, 10).map(describeDifference),
    "A change that is meant goes in MEANT (tests/differential.ts).",
  ].join("\n");
}

const SETS = optionSets();
const INPUTS = inputs();

for (const from of DIFFERENTIAL_FORMATS) {
  test(`conversions from ${from} are those of the previous release`, () => {
    const { compared, differences } = compareConversions(
      INPUTS[from],
      from,
      SETS,
    );
    if (differences.length > 0) throw new Error(report(differences));
    if (compared < 10_000) throw new Error(`only ${compared} compared`);
  });
}

test("converters convert as those of the previous release", () => {
  const configurations = [
    { label: "iso-843-type-1", configuration: { preset: "iso-843-type-1" } },
    {
      label: "sbl-general, reject",
      configuration: { preset: "sbl-general", outOfScopeBehavior: "reject" },
    },
    { label: "ala-lc-ancient", configuration: { preset: "ala-lc-ancient" } },
  ];
  const differences: Difference[] = [];
  for (const from of DIFFERENTIAL_FORMATS) {
    const sources = from === "greek"
      ? [...DIFFICULT_WORDS, ...BYZANTINE]
      : RAW_SOURCES.filter((source) => source.format === from).map(
        (source) => source.text,
      );
    differences.push(
      ...compareConverters(sources, from, configurations).differences,
    );
  }
  if (differences.length > 0) throw new Error(report(differences));
});
