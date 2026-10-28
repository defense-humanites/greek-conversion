import { assertEquals } from "@std/assert";
import { convert, type Format } from "../src/mod.ts";
import { assertNfcEquals } from "./assertions.ts";
import { EQUIVALENCES, FORMATS } from "./fixtures.ts";

Deno.test("canonical and decomposed Greek input convert identically", () => {
  for (const { greek } of EQUIVALENCES) {
    for (const target of FORMATS) {
      assertNfcEquals(
        convert(greek.normalize("NFC"), "greek", target),
        convert(greek.normalize("NFD"), "greek", target),
      );
    }
  }
});

Deno.test("canonicalizes adversarial combining-mark order and duplicates", () => {
  const adversarial = "α\u0301\u0314 α\u0314\u0314\u0301\u0301";

  assertNfcEquals(convert(adversarial, "greek", "greek"), "ἅ ἅ");
  assertNfcEquals(
    convert(adversarial, "greek", "beta-code"),
    "a(/ a(/",
  );
  assertNfcEquals(
    convert(adversarial, "greek", "transliteration"),
    "há há",
  );
});

Deno.test("preserves non-BMP and unrecognized Unicode literals", () => {
  const literals = "😀 𝄞 𐀀 \u2066§\u2069";

  for (const source of FORMATS) {
    for (const target of FORMATS) {
      assertEquals(convert(literals, source, target), literals);
    }
  }
});

Deno.test("keeps unrecognized combining marks literal", () => {
  const rareMark = "\u1AB0";

  for (const format of FORMATS) {
    assertNfcEquals(
      convert(`λ${rareMark}λ`, "greek", format),
      format === "greek" ? `λ${rareMark}λ` : `l${rareMark}l`,
    );
  }
});

Deno.test("handles transparent controls at final-sigma boundaries", () => {
  const transparent = ["\u0323", "\u200C", "\u200D", "\u2060", "\uFEFF"];

  for (const suffix of transparent) {
    assertNfcEquals(convert(`ασ${suffix}`, "greek", "greek"), `ας${suffix}`);
    assertNfcEquals(
      convert(`ασ${suffix}α`, "greek", "greek"),
      `ασ${suffix}α`,
    );
  }
});

Deno.test("every output respects its Unicode composition policy", () => {
  const source = "Ἄϊδα—κἀγώ· ϳ ϙ ϡʹ 😀";

  for (const format of FORMATS as readonly Format[]) {
    const output = convert(source, "greek", format);
    if (format !== "greek") assertEquals(output, output.normalize("NFC"));
    assertEquals(
      convert(output.normalize("NFD"), format, format),
      output,
    );
  }

  const tonos = convert(source, "greek", "greek", {
    greek: { acute: "tonos" },
  });
  assertEquals(tonos, tonos.normalize("NFC"));

  const decomposed = convert(source, "greek", "greek", {
    greek: { composition: "decomposed" },
  });
  assertEquals(decomposed, decomposed.normalize("NFD"));
});
