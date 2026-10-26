import { assertEquals } from "@std/assert";
import {
  type ConversionOptions,
  convert,
  convertDetailed,
  type Format,
} from "../src/mod.ts";
import { parse } from "../src/document.ts";

/**
 * Guards against superlinear conversion cost.
 *
 * Each path is timed on two inputs, the second eight times longer. Linear
 * code takes about eight times as long; the quadratic transliteration parser
 * fixed before 1.0 took about sixty times as long. The threshold sits far
 * from both.
 *
 * Noise still crosses it now and then on a loaded machine (a collection or a
 * recompilation during the long input's runs): about one run of this test in
 * forty under load, once in CI. A ratio over the threshold is therefore
 * measured again, up to three times, and the lowest one is kept: noise does
 * not repeat three times in a row, a superlinear cost does (a deliberately
 * quadratic path measures about 64 on every attempt).
 */
const PASSAGE =
  "κίνησις γὰρ αὕτη δὴ μεγίστη τοῖς Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων. ἀυτμή ἄυλος ϛʹ Μπάλα ϲῶμα. ";
// Repetitions of a passage: long enough for the small input to take well over
// the 0.05 ms floor of fastest(), even with fast readers.
const SMALL = 60;
const LARGE = 480;
const MAX_RATIO = 25;
const ATTEMPTS = 3;

/**
 * A passage for searches that run ahead in the text. Until 1.0.0-rc.2,
 * reading transliteration under `eta: "i-macron"` (now `"i"`) looked for the
 * next macron anywhere in the rest of the text at every `i`. In PASSAGE, transliterated
 * under ISO 843, a macron follows within a word or two, so the search stopped
 * early and the ratio stayed near 9. This passage has no eta, no omega and no
 * long vowel, hence no macron at all: on 1.0.0-rc.1 its ratio was 36 to 55.
 */
const IOTA_PASSAGE =
  "φιλία καὶ πίστις τινὶ ἐν τοῖς ἄλλοις, ὅτι δίκαιον καὶ καλόν ἐστι πιστεύειν. ";

function fastest(run: () => unknown): number {
  run();
  let best = Infinity;
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    run();
    best = Math.min(best, performance.now() - start);
  }
  return Math.max(best, 0.05);
}

const CASES: readonly {
  format: Format;
  target: Format;
  options: ConversionOptions;
  passage?: string;
}[] = [
  { format: "greek", target: "transliteration", options: {} },
  { format: "beta-code", target: "greek", options: {} },
  { format: "transliteration", target: "greek", options: {} },
  {
    format: "transliteration",
    target: "greek",
    options: { preset: "iso-843-type-1" },
  },
  {
    format: "transliteration",
    target: "greek",
    options: { preset: "iso-843-type-1" },
    passage: IOTA_PASSAGE,
  },
  {
    format: "greek",
    target: "greek",
    options: { orthography: { accentuation: "monotonic" } },
  },
];

Deno.test("conversion cost grows linearly with the input", () => {
  for (const { format, target, options, passage = PASSAGE } of CASES) {
    const small = convert(passage.repeat(SMALL), "greek", format, options);
    const large = convert(passage.repeat(LARGE), "greek", format, options);
    for (
      const [label, run] of [
        ["parse", (text: string) => parse(text, format, options)],
        [
          "convertDetailed",
          (text: string) => convertDetailed(text, format, target, options),
        ],
      ] as const
    ) {
      let ratio = Infinity;
      for (
        let attempt = 0;
        attempt < ATTEMPTS && ratio >= MAX_RATIO;
        attempt++
      ) {
        ratio = Math.min(
          ratio,
          fastest(() => run(large)) / fastest(() => run(small)),
        );
      }
      assertEquals(
        ratio < MAX_RATIO,
        true,
        `${label} ${format} → ${target} ${JSON.stringify(options)}${
          passage === PASSAGE ? "" : " (iota passage)"
        }: an 8× longer input took ${ratio.toFixed(1)}× as long`,
      );
    }
  }
});
