import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import { CONVERSION_OPTION_VALUES } from "../src/mod.ts";
import type { Format } from "../src/mod.ts";
import { OPTION_RELEVANCE } from "../web/option_relevance.ts";
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
} from "../web/option_catalogue.ts";

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
  assertEquals(acts("greek", "accentuation", "greek", "beta-code"), false);
  assertEquals(acts("greek", "accentuation", "greek", "greek"), true);
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
  assertEquals(labels("longV"), ["Long vowels"]);
  assertEquals(labels("beta code"), ["Beta Code case", "Yot"]);
});
