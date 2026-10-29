/**
 * Per-call baseline: the same paths as `conversion_bench.ts`, on one clause
 * of Thucydides (about 75 characters) instead of 10,000 characters. Run with
 * `deno task bench`, on `main` and on the branch, on the same machine, before
 * merging a change to the readers or encoders.
 *
 * Long texts amortize per-call costs, and `tests/scaling_test.ts` compares
 * ratios, not levels: neither sees a fixed cost added to every call. Short
 * calls do. They caught, too late, a V8 deoptimization loop that made short
 * transliteration parses 1.5 times slower while long texts got faster.
 *
 * `parse()` is measured on its own because `convert()` adds a fixed cost per
 * call (options, encoder, loss check) that hides changes in the readers.
 * `convertDetailed()` and `parseDetailed()` are measured too, on the clause
 * and on one word: positions add a cost per call that `convert()` does not
 * pay. Kept in typed arrays, as they first were while 1.0.0-rc.6 was being
 * written, they made it several times the conversion of a word. Compare with
 * the previous release.
 * To look for deoptimizations behind a slower result, count them on both
 * versions; a few are normal while V8 warms up (17 on `main` for this
 * bench), a loop shows as hundreds (207 for the regression above):
 *
 * ```sh
 * deno bench --v8-flags=--trace-deopt --filter "parse transliteration" \
 *   bench/short_calls_bench.ts | grep -c "deoptimizing"
 * ```
 *
 * @module
 */
import { convert, convertDetailed } from "../src/mod.ts";
import { parse, parseDetailed } from "../src/document.ts";
import { THUCYDIDES_1_1_10 } from "./thucydides.ts";

// "Θουκυδίδης Ἀθηναῖος ξυνέγραψε τὸν πόλεμον τῶν Πελοποννησίων καὶ Ἀθηναίων,"
const GREEK = THUCYDIDES_1_1_10.slice(0, THUCYDIDES_1_1_10.indexOf(",") + 1);
const BETA = convert(GREEK, "greek", "beta-code");
const LATIN = convert(GREEK, "greek", "transliteration");

Deno.bench("parse greek", { group: "short parse", baseline: true }, () => {
  parse(GREEK, "greek");
});
Deno.bench("parse beta-code", { group: "short parse" }, () => {
  parse(BETA, "beta-code");
});
Deno.bench("parse transliteration", { group: "short parse" }, () => {
  parse(LATIN, "transliteration");
});

Deno.bench(
  "greek → transliteration",
  { group: "short convert", baseline: true },
  () => {
    convert(GREEK, "greek", "transliteration");
  },
);
Deno.bench("greek → beta-code", { group: "short convert" }, () => {
  convert(GREEK, "greek", "beta-code");
});
Deno.bench("beta-code → greek", { group: "short convert" }, () => {
  convert(BETA, "beta-code", "greek");
});
Deno.bench("transliteration → greek", { group: "short convert" }, () => {
  convert(LATIN, "transliteration", "greek");
});

Deno.bench(
  "detailed greek → transliteration",
  { group: "short detailed", baseline: true },
  () => {
    convertDetailed(GREEK, "greek", "transliteration");
  },
);
Deno.bench("detailed greek → beta-code", { group: "short detailed" }, () => {
  convertDetailed(GREEK, "greek", "beta-code");
});
Deno.bench("detailed beta-code → greek", { group: "short detailed" }, () => {
  convertDetailed(BETA, "beta-code", "greek");
});
Deno.bench(
  "detailed transliteration → greek",
  { group: "short detailed" },
  () => {
    convertDetailed(LATIN, "transliteration", "greek");
  },
);
Deno.bench(
  "detailed one word, greek → transliteration",
  { group: "short detailed" },
  () => {
    convertDetailed("ἄνθρωπος", "greek", "transliteration");
  },
);
Deno.bench("parseDetailed greek", { group: "short detailed" }, () => {
  parseDetailed(GREEK, "greek");
});
