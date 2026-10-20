import { assertEquals, assertThrows } from "@std/assert";
import {
  applyGreekOrthography,
  type Diacritic,
  encode,
  grapheme,
  parse,
  validateDocument,
} from "../src/document.ts";
import { assertNfcEquals } from "./assertions.ts";

Deno.test("parsed and constructed graphemes share read-only diacritic sets", () => {
  const first = parse("ἄ", "greek");
  const second = parse("ἄ", "greek");
  assertEquals(first === second, false);
  if (first[0].kind !== "grapheme" || second[0].kind !== "grapheme") {
    throw new Error("Expected parsed graphemes");
  }
  // One set per combination of marks, whatever the source.
  assertEquals(first[0].diacritics === second[0].diacritics, true);
  assertEquals(first[0].diacritics, new Set(["smooth", "acute"]));

  const shared = first[0].diacritics as Set<Diacritic>;
  assertThrows(() => shared.delete("acute"), TypeError);
  assertThrows(() => shared.add("rough"), TypeError);
  assertThrows(() => shared.clear(), TypeError);
  assertEquals(second[0].diacritics.has("acute"), true);

  // Replacing a token's set leaves the other graphemes unchanged.
  first[0].diacritics = new Set(["smooth"]);
  assertEquals(second[0].diacritics.has("acute"), true);

  // Shared sets iterate in canonical order, whatever the source order.
  const ordered = grapheme("alpha", false, [
    "iota-subscript",
    "acute",
    "smooth",
  ]);
  assertEquals([...ordered.diacritics], ["smooth", "acute", "iota-subscript"]);

  const marks = new Set(["acute"] as const);
  const token = grapheme("alpha", false, marks);
  marks.clear();
  assertEquals(token.diacritics.has("acute"), true);
  assertEquals(token.diacritics === marks, false);
});

Deno.test("encoding and validation leave an edited document unchanged", () => {
  const original = parse("ἄνθρωπος", "greek");
  const edited = original.map((token) =>
    token.kind === "grapheme"
      ? { ...token, diacritics: new Set(token.diacritics) }
      : { ...token }
  );
  if (edited[0].kind !== "grapheme") {
    throw new Error("Expected initial vowel");
  }
  edited[0].diacritics = new Set(
    [...edited[0].diacritics].filter((mark) => mark !== "acute"),
  );

  const before = edited.map((token) =>
    token.kind === "grapheme"
      ? { ...token, diacritics: new Set(token.diacritics) }
      : { ...token }
  );
  assertEquals(validateDocument(edited), []);
  assertNfcEquals(encode(edited, "greek"), "ἀνθρωπος");
  assertEquals(edited, before);
  assertNfcEquals(encode(original, "greek"), "ἄνθρωπος");
});

Deno.test("document parsing and encoding share transliteration options", () => {
  const options = { preset: "bnf-core" } as const;
  const document = parse("Chará", "transliteration", options);
  assertNfcEquals(encode(document, "greek", options), "Χαρά");
});

Deno.test("the public Greek orthography helper resolves preset options", () => {
  const original = parse("αʹ", "greek");
  const transformed = applyGreekOrthography(original, {
    preset: "ala-lc-modern",
  });
  assertEquals(transformed, [{ kind: "literal", value: "1" }]);
  assertNfcEquals(encode(original, "greek"), "αʹ");
});

Deno.test("a Greek orthographic view does not replace the reusable source", () => {
  const source = parse("ἄρα", "greek");
  const monotonic = applyGreekOrthography(source, {
    orthography: { accentuation: "monotonic" },
  });

  assertNfcEquals(encode(monotonic, "greek"), "άρα");
  assertNfcEquals(encode(monotonic, "beta-code"), "a/ra");
  assertNfcEquals(encode(source, "beta-code"), "a)/ra");
});

Deno.test("Greek orthographic views own all tokens", () => {
  const source = parse("ἄβ!", "greek");
  const views = [
    applyGreekOrthography(source),
    applyGreekOrthography(source, {
      orthography: { accentuation: "monotonic" },
    }),
  ];

  for (const view of views) {
    assertEquals(view === source, false);
    for (let index = 0; index < source.length; index++) {
      assertEquals(view[index] === source[index], false);
    }

    const second = view[1];
    const punctuation = view[2];
    if (second.kind !== "grapheme" || punctuation.kind !== "literal") {
      throw new Error("Expected a grapheme and literal");
    }
    second.letter = "gamma";
    second.diacritics = new Set([...second.diacritics, "rough"]);
    punctuation.value = "?";
    assertNfcEquals(encode(source, "greek"), "ἄβ!");
  }
});

Deno.test("preset Greek views remain valid across source formats", () => {
  const presets = [
    "ala-lc-ancient",
    "ala-lc-modern",
    "bnf-core",
    "iso-843-type-1",
    "perseus",
    "sbl-academic",
    "sbl-general",
    "tlg-core",
  ] as const;
  const sources = [
    ["greek", "Ἄνθρωπος ῥόδος ϲ ϛʹ · αʹ"],
    ["beta-code", "*)/ANQRWPOS R(O/DOS S #2 A#"],
    ["transliteration", "Anthrōpos rhodos"],
  ] as const;

  for (const preset of presets) {
    for (const [format, input] of sources) {
      const options = { preset };
      const source = parse(input, format, options);
      const view = applyGreekOrthography(source, options);

      assertEquals(validateDocument(source), []);
      assertEquals(validateDocument(view), []);
      assertEquals(
        encode(view, "greek", options),
        encode(source, "greek", options),
      );
    }
  }
});
