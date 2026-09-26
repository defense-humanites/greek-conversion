import { assertEquals } from "@std/assert";
import {
  applyGreekOrthography,
  encode,
  grapheme,
  parse,
  validateDocument,
} from "../src/document.ts";
import { assertNfcEquals } from "./assertions.ts";

Deno.test("parsed documents and constructed graphemes own their diacritic sets", () => {
  const first = parse("ἄ", "greek");
  const second = parse("ἄ", "greek");
  assertEquals(first === second, false);
  if (first[0].kind !== "grapheme" || second[0].kind !== "grapheme") {
    throw new Error("Expected parsed graphemes");
  }
  first[0].diacritics.delete("acute");
  assertEquals(second[0].diacritics.has("acute"), true);

  const marks = new Set(["acute"] as const);
  const token = grapheme("alpha", false, marks);
  marks.clear();
  assertEquals(token.diacritics.has("acute"), true);
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
  edited[0].diacritics.delete("acute");

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
