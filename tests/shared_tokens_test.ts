import { assertEquals } from "@std/assert";
import { GREEK_MARKS } from "../src/alphabet.ts";
import { encode, parse } from "../src/document.ts";
import type { Format, Grapheme } from "../src/model.ts";
import { parseResolved } from "../src/conversion.ts";
import { convert, convertDetailed } from "../src/mod.ts";
import {
  resetSharedTokens,
  SHARED_GRAPHEME_LIMIT,
  SHARED_LITERAL_LIMIT,
  sharedTokenCounts,
} from "../src/parsers/shared_tokens.ts";
import { resolveConversionOptions } from "../src/presets.ts";

/**
 * `convert()` and the other functions that read text for themselves share
 * equal tokens (src/parsers/shared_tokens.ts); `parse()` does not. These tests
 * check that the two paths agree, that a caller's document stays its own, and
 * that the cache stays bounded. `deno test` gives each file its own module
 * state, so the cache is empty when this file starts; the tests that fill it
 * empty it again, so that the next test of this file starts from scratch.
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
  const options = { transliteration: { coronis: "apostrophe" as const } };
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
  resetSharedTokens();
  try {
    conversionsPastTheLimit();
  } finally {
    resetSharedTokens();
  }
});

function conversionsPastTheLimit(): void {
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
      { diacritics: { all: "remove" as const } },
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

  assertEquals(sharedTokenCounts().graphemes, SHARED_GRAPHEME_LIMIT);
}

Deno.test("non-Greek text cannot use up the room of Greek tokens in the cache", () => {
  resetSharedTokens();
  try {
    // 5,000 distinct CJK characters: one literal each, more than the cache
    // holds, as a server converting arbitrary text could receive.
    const foreign = Array.from(
      { length: 5000 },
      (_, index) => String.fromCodePoint(0x4E00 + index),
    ).join("");
    convert(foreign, "greek", "transliteration");
    assertEquals(sharedTokenCounts().literals, SHARED_LITERAL_LIMIT);

    // Every grapheme and literal of a Greek text read afterwards is still
    // shared: one object per distinct token.
    const greek = "Θουκυδίδης Ἀθηναῖος ξυνέγραψε τὸν πόλεμον, ὡς ἐπολέμησαν· " +
      "ἀρξάμενος εὐθὺς καθισταμένου (καὶ ἐλπίσας) — 1.1.";
    const keys = new Set(
      parse(greek, "greek").map((token) =>
        token.kind === "grapheme"
          ? JSON.stringify([
            token.letter,
            token.uppercase,
            [...token.diacritics].sort(),
            token.glyphVariant ?? null,
          ])
          : token.value
      ),
    );
    const shared = parseResolved(
      greek,
      "greek",
      resolveConversionOptions({}),
      true,
    );
    assertEquals(new Set(shared).size, keys.size);
    assertEquals(
      convert(greek, "greek", "transliteration"),
      encode(parse(greek, "greek"), "transliteration"),
    );
  } finally {
    resetSharedTokens();
  }
});
