import { assertEquals } from "@std/assert";
import { ALPHABET } from "../src/alphabet.ts";
import type { Format } from "../src/mod.ts";
import {
  type Document,
  encode,
  type Grapheme,
  grapheme,
  type Letter,
  literal,
  parse,
} from "../src/document.ts";
import { applyOrthography } from "../src/orthography.ts";

const FORMATS = ["greek", "beta-code", "transliteration"] as const;
const CASES = [false, true] as const;
const LETTERS = Object.keys(ALPHABET) as Letter[];

const DIACRITIC_CASES: readonly Grapheme[] = [
  grapheme("alpha", false, ["acute"]),
  grapheme("alpha", false, ["grave"]),
  grapheme("alpha", false, ["circumflex"]),
  grapheme("alpha", false, ["rough"]),
  grapheme("rho", false, ["rough"]),
  grapheme("iota", false, ["diaeresis"]),
  grapheme("alpha", false, ["iota-subscript"]),
  grapheme("alpha", false, ["macron"]),
  grapheme("iota", false, ["breve"]),
];

const COMBINATION_CASES: readonly Grapheme[] = [
  grapheme("alpha", false, ["rough", "acute"]),
  grapheme("iota", false, ["diaeresis", "acute"]),
  grapheme("omega", false, ["circumflex", "iota-subscript"]),
  grapheme("upsilon", false, ["rough", "diaeresis", "acute"]),
];

const SMOOTH_CASES: readonly Grapheme[] = [
  grapheme("alpha", false, ["smooth"]),
  grapheme("alpha", false, ["smooth", "acute"]),
  grapheme("rho", false, ["smooth"]),
];

function framed(token: Grapheme): Document {
  return [grapheme("lambda"), token, grapheme("lambda")];
}

function wordInitial(token: Grapheme): Document {
  return [token, grapheme("lambda")];
}

function withCase(token: Grapheme, uppercase: boolean): Grapheme {
  return { ...token, uppercase, diacritics: new Set(token.diacritics) };
}

function assertRoundTrip(document: Document, format: Format): void {
  const encoded = encode(document, format);

  if (format !== "greek") {
    assertEquals(
      encoded,
      encoded.normalize("NFC"),
      `${format} output must be NFC`,
    );
  }
  assertEquals(
    parse(encoded, format).map((token) => {
      if (
        token.kind !== "grapheme" ||
        token.glyphVariant !== "medial-sigma" &&
          token.glyphVariant !== "final-sigma"
      ) return token;
      const semantic = { ...token };
      delete semantic.glyphVariant;
      return semantic;
    }),
    document,
  );
}

Deno.test("every letter and case survives every format", () => {
  for (const letter of LETTERS) {
    for (const uppercase of CASES) {
      for (const format of FORMATS) {
        assertRoundTrip(framed(grapheme(letter, uppercase)), format);
      }
    }
  }
});

Deno.test("valid diacritics and combinations survive every format", () => {
  for (const token of [...DIACRITIC_CASES, ...COMBINATION_CASES]) {
    for (const uppercase of CASES) {
      for (const format of FORMATS) {
        assertRoundTrip(framed(withCase(token, uppercase)), format);
      }
    }
  }
});

Deno.test("explicit smooth breathings survive Greek and Beta Code", () => {
  for (const token of SMOOTH_CASES) {
    for (const uppercase of CASES) {
      for (const format of ["greek", "beta-code"] as const) {
        assertRoundTrip(wordInitial(withCase(token, uppercase)), format);
      }
    }
  }
});

Deno.test("orthographic transformations are immutable", () => {
  const source: Document = [
    literal("["),
    grapheme("rho"),
    grapheme("rho"),
    literal("]"),
  ];
  const transformed = applyOrthography(source, {
    orthography: { doubleRho: "smooth-rough" },
  });

  assertEquals(source[1], grapheme("rho"));
  assertEquals(source[2], grapheme("rho"));
  assertEquals(transformed[1], grapheme("rho", false, ["smooth"]));
  assertEquals(transformed[2], grapheme("rho", false, ["rough"]));
  assertEquals(transformed === source, false);
  assertEquals(applyOrthography(source) === source, true);
});
