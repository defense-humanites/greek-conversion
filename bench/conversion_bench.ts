/**
 * Throughput baseline for the main conversion paths. Run with
 * `deno task bench`; compare against a previous run before releasing a
 * change to the parsers or encoders.
 */
import { convert, convertDetailed, createConverter } from "../src/mod.ts";

// Thucydides 1.1.2, repeated to about 10 000 characters.
const PASSAGE =
  "κίνησις γὰρ αὕτη δὴ μεγίστη τοῖς Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων. ";
const GREEK = PASSAGE.repeat(Math.ceil(10_000 / PASSAGE.length));
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
