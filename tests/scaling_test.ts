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
 * from both so that machine noise cannot make the test flaky.
 */
const PASSAGE =
  "κίνησις γὰρ αὕτη δὴ μεγίστη τοῖς Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων. ἀυτμή ἄυλος ϛʹ Μπάλα ϲῶμα. ";
// Large enough for the small input to take well over the 0.05 ms floor of
// fastest() now that the readers run at under 0.05 ms per 1,000 characters.
const SMALL = PASSAGE.repeat(60);
const LARGE = PASSAGE.repeat(480);
const MAX_RATIO = 25;

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
    format: "greek",
    target: "greek",
    options: { orthography: { accentuation: "monotonic" } },
  },
];

Deno.test("conversion cost grows linearly with the input", () => {
  for (const { format, target, options } of CASES) {
    const small = convert(SMALL, "greek", format, options);
    const large = convert(LARGE, "greek", format, options);
    for (
      const [label, run] of [
        ["parse", (text: string) => parse(text, format, options)],
        [
          "convertDetailed",
          (text: string) => convertDetailed(text, format, target, options),
        ],
      ] as const
    ) {
      const ratio = fastest(() => run(large)) / fastest(() => run(small));
      assertEquals(
        ratio < MAX_RATIO,
        true,
        `${label} ${format} → ${target} ${
          JSON.stringify(options)
        }: an 8× longer input took ${ratio.toFixed(1)}× as long`,
      );
    }
  }
});
