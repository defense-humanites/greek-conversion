/**
 * Throughput baseline for the main conversion paths. Run with
 * `deno task bench`; compare against a previous run before releasing a
 * change to the parsers or encoders.
 *
 * The input is a real passage of about 10,500 characters, Thucydides
 * 1.1–1.10 (see `thucydides.ts` for its source and license). Until
 * 1.0.0-rc.3 it was one sentence of 1.1.2 repeated to the same length, which
 * gave timings about 10 to 30 % lower: its 19 words fill every cache at once.
 * Compare runs made on the same input only.
 */
import { convert, convertDetailed, createConverter } from "../src/mod.ts";
import { THUCYDIDES_1_1_10 } from "./thucydides.ts";

const GREEK = THUCYDIDES_1_1_10;
const BETA = convert(GREEK, "greek", "beta-code");
const LATIN = convert(GREEK, "greek", "transliteration");
const tlg = createConverter({ preset: "tlg-core" });

Deno.bench(
  "greek → transliteration",
  { group: "convert", baseline: true },
  () => {
    convert(GREEK, "greek", "transliteration");
  },
);
Deno.bench("greek → beta-code", { group: "convert" }, () => {
  convert(GREEK, "greek", "beta-code");
});
Deno.bench("beta-code → greek", { group: "convert" }, () => {
  convert(BETA, "beta-code", "greek");
});
Deno.bench("transliteration → greek", { group: "convert" }, () => {
  convert(LATIN, "transliteration", "greek");
});
Deno.bench("greek → transliteration, detailed", { group: "detailed" }, () => {
  convertDetailed(GREEK, "greek", "transliteration");
});
Deno.bench("greek → beta-code, bound tlg-core converter", {
  group: "converter",
}, () => {
  tlg.convert(GREEK, "greek", "beta-code");
});
