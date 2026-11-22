/**
 * The inputs of the comparison with the previous release
 * (`differential_test.ts`): a long text, the difficult forms and phrases
 * made of them, the equivalences, the playground's examples, Byzantine
 * lines, raw Beta Code and transliteration, and strings drawn at random from
 * the signs of each format, which no one writes but which the readers must
 * read as before. `scripts/differential_changes.ts` lists those whose
 * conversions changed, for `MEANT`.
 */
import * as reference from "greek-conversion-previous";
import { THUCYDIDES_1_1_10 } from "../bench/thucydides.ts";
import type { Format } from "../src/mod.ts";
import { EXAMPLES } from "../web/playground/examples.ts";
import { DIFFICULT_WORDS, RAW_SOURCES } from "./difficult_forms.ts";
import { DIFFERENTIAL_FORMATS, pick, seeded } from "./differential.ts";
import { EQUIVALENCES, valueFor } from "./fixtures.ts";

/** Byzantine lines, with signs for several letters, numerals and overlines. */
export const BYZANTINE = [
  "ϗ νῦν ϗ ἀεὶ ϗ εἰς τοὺς αἰῶνας τῶν αἰώνων· ἐν τῷ ὀνόματι τοῦ κ̅υ̅ ι̅υ̅ χ̅υ̅",
  "ἔτους ͵ϛφιϛʹ, ἰνδικτιῶνος ιεʹ· ἐϛὶ ϲοφὸϲ ϐίϐλοϲ ϑεός Θεσσαλονίκη ῥῆτορ",
  "῾Ρωμαῖοι, «ΟΥ̓ΚΟΥ͂Ν» — ἀΐδιος; 1 ξʹ ʹ ἄ́ abc 漢字 ‌",
  // Marks the readers do not know, after a letter with marks: Leiden's dot
  // below, a dot above, an enclosing circle.
  "ἀ̣ν ἀ̇ν ὑ⃝ ἄ\u0350 ạ̓n",
  // The ligature of καί with a breathing: a coronis to check for the readers.
  "ϗ̓ τοῦ ϗ̓γώ",
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
    // Spaces that are not U+0020, and marks the readers do not know.
    ["\u00A0", "\u2009", "\u0307", "\u0323", "\u20DD"],
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
  const separators = [" ", " ", ", ", "\n", " · ", "\u00A0", "\u2009"];
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
export function differentialInputs(): Record<Format, string[]> {
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

/** The configurations of `createConverter()` compared. */
export const CONVERTER_CONFIGURATIONS: readonly {
  label: string;
  configuration: object;
}[] = [
  { label: "iso-843-type-1", configuration: { preset: "iso-843-type-1" } },
  {
    label: "sbl-general, reject",
    configuration: { preset: "sbl-general", outOfScopeBehavior: "reject" },
  },
  { label: "ala-lc-ancient", configuration: { preset: "ala-lc-ancient" } },
];

/** The inputs that converters convert, written in `from`. */
export function converterInputs(from: Format): string[] {
  return from === "greek"
    ? [...DIFFICULT_WORDS, ...BYZANTINE]
    : RAW_SOURCES.filter((source) => source.format === from).map((source) =>
      source.text
    );
}
