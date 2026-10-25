import { assertEquals } from "@std/assert";
import { GREEK_MARKS } from "../src/alphabet.ts";
import { encode, parse } from "../src/document.ts";
import type { Format, Grapheme } from "../src/model.ts";
import { convert, convertDetailed } from "../src/mod.ts";
import {
  SHARED_TOKEN_LIMIT,
  sharedTokenCount,
} from "../src/parsers/shared_tokens.ts";

/**
 * `convert()` and the other functions that read text for themselves share
 * equal tokens (src/parsers/shared_tokens.ts); `parse()` does not. These tests
 * check that the two paths agree, that a caller's document stays its own, and
 * that the cache stays bounded.
 */

Deno.test("parse() returns tokens of its own, which the caller may modify", () => {
  for (
    const [text, format] of [
      ["ἀνὰ ἀνὰ", "greek"],
      ["a)na\\ a)na\\", "beta-code"],
    ] as const
  ) {
    const before = convert(text, format, "transliteration");
    const document = parse(text, format);
    assertEquals(Object.isFrozen(document[0]), false);
    assertEquals(document[0] === document[4], false);

    (document[0] as Grapheme).uppercase = true;

    assertEquals((document[4] as Grapheme).uppercase, false);
    assertEquals((parse(text, format)[0] as Grapheme).uppercase, false);
    assertEquals(convert(text, format, "transliteration"), before);
  }
});

Deno.test("a crasis read for conversion does not change other occurrences", () => {
  // The coronis is classified after reading. The ὔ of οὔ keeps its smooth
  // breathing, the ὔ of τοὔνομα becomes a coronis, and both are one shared
  // token when converted: changing it in place would change οὔ too.
  const text = "οὔ τοὔνομα οὔ";
  const options = { orthography: { coronis: "apostrophe" as const } };
  assertEquals(
    convert(text, "greek", "transliteration", options),
    "oú toú’noma oú",
  );
  assertEquals(
    convert(text, "greek", "transliteration", options),
    encode(parse(text, "greek"), "transliteration", options),
  );
});

/**
 * More distinct graphemes than the cache holds: ten letters, each with every
 * combination of the nine Greek marks (5,120), separated by spaces.
 */
function everyMarkCombination(): string {
  const marks = new Map<string, string>();
  for (const [mark, diacritic] of GREEK_MARKS) {
    if (!marks.has(diacritic)) marks.set(diacritic, mark);
  }
  const chars = [...marks.values()];
  const words: string[] = [];
  for (const letter of "αεηιουωρκσ") {
    for (let mask = 0; mask < 1 << chars.length; mask++) {
      words.push(
        letter + chars.filter((_, bit) => (mask & 1 << bit) !== 0).join(""),
      );
    }
  }
  return words.join(" ");
}

Deno.test("conversions past the cache limit equal encode(parse()), and the cache stays bounded", () => {
  const greek = everyMarkCombination();
  const sources: Record<"greek" | "beta-code", string> = {
    greek,
    "beta-code": convert(greek, "greek", "beta-code"),
  };
  const formats: readonly Format[] = ["greek", "beta-code", "transliteration"];

  for (
    const options of [
      {},
      { preset: "ala-lc-ancient" as const },
      { removeDiacritics: true },
    ]
  ) {
    for (const from of ["greek", "beta-code"] as const) {
      for (const to of formats) {
        const expected = encode(
          parse(sources[from], from, options),
          to,
          options,
        );
        assertEquals(convert(sources[from], from, to, options), expected);
        assertEquals(
          convertDetailed(sources[from], from, to, options).output,
          expected,
        );
      }
    }
  }

  assertEquals(sharedTokenCount(), SHARED_TOKEN_LIMIT);
});
