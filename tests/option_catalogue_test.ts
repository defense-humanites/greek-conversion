import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import { CONVERSION_OPTION_VALUES } from "../src/mod.ts";
import type { Format } from "../src/mod.ts";
import { OPTION_RELEVANCE } from "../web/playground/option_relevance.ts";
import { changedSpans, firstChange } from "../web/playground/option_probe.ts";
import {
  actsOn,
  findEntry,
  isAmbiguous,
  knownOptions,
  matchEntries,
  OPTION_ENTRIES,
  sameOptions,
  settingsOf,
  standardValue,
  withSetting,
} from "../web/playground/option_catalogue.ts";

test("offers every option of the library, with a name for people", () => {
  const count = Object.values(CONVERSION_OPTION_VALUES)
    .reduce((total, table) => total + Object.keys(table).length, 0);
  assertEquals(OPTION_ENTRIES.length, count);
  assertEquals(
    findEntry("transliteration", "longVowels")?.label,
    "Long vowels",
  );
  assertEquals(findEntry("diacritics", "all")?.label, "All diacritics");
  assertEquals(
    isAmbiguous(findEntry("diacritics", "smoothBreathing")!),
    true,
  );
  assertEquals(isAmbiguous(findEntry("transliteration", "upsilon")!), false);
});

test("offers the options that act on a conversion", () => {
  const acts = (group: string, key: string, from: Format, to: Format) =>
    actsOn(findEntry(group, key)!, from, to);
  assertEquals(
    acts("transliteration", "upsilon", "greek", "transliteration"),
    true,
  );
  assertEquals(acts("transliteration", "upsilon", "greek", "beta-code"), false);
  assertEquals(acts("greek", "doubleRho", "greek", "beta-code"), true);
  assertEquals(acts("greek", "composition", "greek", "beta-code"), false);
  assertEquals(acts("greek", "composition", "greek", "greek"), true);
  // Monotonic accentuation is spelled in every format.
  assertEquals(acts("greek", "accentuation", "greek", "beta-code"), true);
  assertEquals(
    acts("greek", "accentuation", "greek", "transliteration"),
    true,
  );
  assertEquals(acts("betaCode", "case", "greek", "beta-code"), true);
  assertEquals(acts("betaCode", "case", "greek", "greek"), false);
  assertEquals(acts("text", "letterCase", "beta-code", "greek"), true);
  // Options read as they write: a Latin spelling they replace is no
  // longer read, so restyling cannot change it.
  assertEquals(
    acts("transliteration", "phi", "transliteration", "transliteration"),
    false,
  );
});

test("has a relevance entry for every option", () => {
  for (const entry of OPTION_ENTRIES) {
    assertEquals(
      Array.isArray(OPTION_RELEVANCE[`${entry.group}.${entry.key}`]),
      true,
    );
  }
});

test("sets, removes, and compares options", () => {
  let options = withSetting({}, "transliteration", "upsilon", "u");
  options = withSetting(options, "greek", "accentuation", "monotonic");
  assertEquals(settingsOf(options), [
    { group: "transliteration", key: "upsilon", value: "u" },
    { group: "greek", key: "accentuation", value: "monotonic" },
  ]);
  assertEquals(
    sameOptions(options, {
      greek: { accentuation: "monotonic" },
      transliteration: { upsilon: "u" },
    }),
    true,
  );
  options = withSetting(options, "greek", "accentuation", undefined);
  assertEquals(options, { transliteration: { upsilon: "u" } });
});

test("keeps only known options from a shared link", () => {
  assertEquals(
    knownOptions({
      transliteration: { upsilon: "u", eta: "nope", unknown: "x" },
      preset: "tlg-core",
      other: 1,
    }),
    { transliteration: { upsilon: "u" } },
  );
  assertEquals(knownOptions("text"), {});
});

test("gives the standard's value of an option", () => {
  assertEquals(
    standardValue("", "transliteration", "upsilon"),
    "y-with-diphthong-u",
  );
  assertEquals(
    standardValue("iso-843-type-2", "transliteration", "upsilon"),
    "y-with-ou-v-f",
  );
  assertEquals(standardValue("", "diacritics", "all"), undefined);
});

test("finds options by name, key, or group", () => {
  const labels = (query: string) =>
    matchEntries(OPTION_ENTRIES, query).map(({ label }) => label);
  assertEquals(labels("ups"), ["Upsilon"]);
  assertEquals(labels("eta").slice(0, 2), ["Eta", "Beta"]);
  assertEquals(labels("longV"), ["Long vowels"]);
  assertEquals(labels("beta code"), ["Beta Code case", "Yot"]);
});

test("finds the first changed word, without its punctuation", () => {
  assertEquals(
    firstChange("ὑπὲρ φίλος.", "hypèr phílos.", "hypèr fílos."),
    { word: "φίλος", before: "phílos", after: "fílos" },
  );
  assertEquals(firstChange("τί;", "tí?", "tí;"), {
    word: "τί;",
    before: "tí?",
    after: "tí;",
  });
  assertEquals(firstChange("α β", "a b", "a b"), undefined);
  assertEquals(firstChange("α β", "a b", "a b c"), undefined);
});

test("finds the changed words of an output", () => {
  assertEquals(changedSpans("hyper phílos", "huper phílos"), [
    { start: 0, end: 5 },
  ]);
  assertEquals(changedSpans("a b", "a  b c"), [{ start: 2, end: 6 }]);
  assertEquals(changedSpans("same", "same"), []);
});
