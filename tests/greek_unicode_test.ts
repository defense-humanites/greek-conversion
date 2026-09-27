import { assertEquals } from "@std/assert";
import {
  convert,
  formatGreekUnicode,
  toUnicodeCodePoints,
} from "../src/mod.ts";
import { applyGreekOrthography, parse } from "../src/document.ts";

const POLYTONIC = { orthography: { accentuation: "polytonic" } } as const;
const MONOTONIC = { orthography: { accentuation: "monotonic" } } as const;

Deno.test("uses the accentuation system to select tonos or oxia", () => {
  assertEquals(convert("ά ΐ", "greek", "greek", POLYTONIC), "ά ΐ");
  assertEquals(convert("ά ΐ", "greek", "greek", MONOTONIC), "ά ΐ");

  assertEquals(
    convert("ά ΐ", "greek", "greek", {
      ...POLYTONIC,
      unicode: { acute: "tonos" },
    }),
    "ά ΐ",
  );
  assertEquals(
    convert("ά ΐ", "greek", "greek", {
      ...MONOTONIC,
      unicode: { acute: "oxia" },
    }),
    "ά ΐ",
  );
});

Deno.test("keeps polytonic combinations without a tonos alternative", () => {
  assertEquals(
    convert("ἄ ᾴ", "greek", "greek", {
      unicode: { acute: "tonos" },
    }),
    "ἄ ᾴ",
  );
});

Deno.test("converts polytonic marks to the mechanical monotonic profile", () => {
  const source = "Ἄνθρωπὸς ᾆ ῑ ἄϋλος κἀγώ πολύῤῥιζος";

  assertEquals(
    convert(source, "greek", "greek", MONOTONIC),
    "Άνθρωπός ά ι άϋλος καγώ πολύρριζος",
  );
});

Deno.test("applies Greek accentuation only to Greek output", () => {
  const source = "ἄ ᾆ ῑ";

  assertEquals(
    convert(source, "greek", "beta-code", MONOTONIC),
    "a)/ a)=| i&",
  );
  assertEquals(
    convert(source, "greek", "transliteration", MONOTONIC),
    "á ã̧ ī",
  );
});

Deno.test("monotonic rendering does not create blocked contractions", () => {
  assertEquals(
    convert("βσ̓ κσ̓", "greek", "greek", MONOTONIC),
    "βς κς",
  );
});

Deno.test("decomposed output uses combining acute regardless of its form", () => {
  const tonos = convert("ά ΐ ἄ", "greek", "greek", {
    unicode: { composition: "decomposed", acute: "tonos" },
  });
  const oxia = convert("ά ΐ ἄ", "greek", "greek", {
    unicode: { composition: "decomposed", acute: "oxia" },
  });

  assertEquals(tonos, "α\u0301 ι\u0308\u0301 α\u0313\u0301");
  assertEquals(oxia, tonos);
  assertEquals(tonos, tonos.normalize("NFD"));
});

Deno.test("forces canonically unstable Greek punctuation on demand", () => {
  const formatted = formatGreekUnicode("ά;·", {
    acute: "oxia",
    questionMark: "greek",
    anoTeleia: "greek",
  });

  assertEquals(formatted, "ά\u037E\u0387");
  assertEquals(toUnicodeCodePoints(formatted), ["U+1F71", "U+037E", "U+0387"]);
  assertEquals(formatted === formatted.normalize("NFC"), false);
});

Deno.test("formatGreekUnicode shares the Greek encoder policy", () => {
  const unicode = {
    acute: "tonos",
    questionMark: "semicolon",
    anoTeleia: "middle-dot",
  } as const;

  assertEquals(
    formatGreekUnicode("ά;·", unicode),
    convert("ά;·", "greek", "greek", { unicode }),
  );
  assertEquals(formatGreekUnicode("ά;·", unicode), "ά;·");
});

Deno.test("Greek orthography is immutable", () => {
  const source = parse("ἄ", "greek");
  const transformed = applyGreekOrthography(source, MONOTONIC);

  assertEquals(source[0].kind === "grapheme" && [...source[0].diacritics], [
    "smooth",
    "acute",
  ]);
  assertEquals(
    transformed[0].kind === "grapheme" && [...transformed[0].diacritics],
    ["acute"],
  );
  assertEquals(transformed === source, false);
  assertEquals(applyGreekOrthography(source) === source, false);
});

Deno.test("reports Unicode scalar values instead of UTF-16 code units", () => {
  assertEquals(toUnicodeCodePoints("A😀ϳ"), ["U+0041", "U+1F600", "U+03F3"]);
});
