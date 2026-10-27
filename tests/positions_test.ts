import { assert, assertEquals } from "@std/assert";
import {
  CONVERSION_OPTION_VALUES,
  type ConversionOptions,
  type ConversionResult,
  convert,
  convertDetailed,
  type Format,
  listPresetMetadata,
} from "../src/mod.ts";
import { parseDetailed, type TokenSpan } from "../src/document.ts";
import { EQUIVALENCES, FORMATS, LOSSY_CONVERSIONS } from "./fixtures.ts";

/**
 * Positions are offsets in UTF-16 code units in the input as supplied and in
 * the output as returned. The reference cases below are checked by hand; the
 * invariants are checked across presets, formats and the options that change
 * the token count on every fixture and on a set of edge cases.
 */

/** `convertDetailed()` with the input kept for slicing. */
function detailed(
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions = {},
): ConversionResult & { input: string } {
  return { ...convertDetailed(input, from, to, options), input };
}

/** The input and output text of each token, in order. */
function pieces(result: ReturnType<typeof detailed>): [string, string][] {
  return result.spans!.map((span) => [
    result.input.slice(span.inputStart, span.inputEnd),
    result.output.slice(span.outputStart, span.outputEnd),
  ]);
}

Deno.test("spans give each token's input and output text", () => {
  assertEquals(pieces(detailed("ἄνθρωπος", "greek", "beta-code")), [
    ["ἄ", "a)/"],
    ["ν", "n"],
    ["θ", "q"],
    ["ρ", "r"],
    ["ω", "w"],
    ["π", "p"],
    ["ο", "o"],
    ["ς", "s"],
  ]);
  assertEquals(pieces(detailed("a)/nqrwpos", "beta-code", "greek")), [
    ["a)/", "ἄ"],
    ["n", "ν"],
    ["q", "θ"],
    ["r", "ρ"],
    ["w", "ω"],
    ["p", "π"],
    ["o", "ο"],
    ["s", "ς"],
  ]);
  assertEquals(pieces(detailed("ánthrōpos", "transliteration", "greek")), [
    ["á", "ἄ"],
    ["n", "ν"],
    ["th", "θ"],
    ["r", "ρ"],
    ["ō", "ω"],
    ["p", "π"],
    ["o", "ο"],
    ["s", "ς"],
  ]);
});

Deno.test("spans are in the input as supplied, composed or decomposed", () => {
  const composed = detailed("ἄν", "greek", "beta-code");
  const decomposed = detailed("ἄν", "greek", "beta-code");

  assertEquals(composed.spans![0], {
    inputStart: 0,
    inputEnd: 1,
    outputStart: 0,
    outputEnd: 3,
  });
  assertEquals(decomposed.spans![0], {
    inputStart: 0,
    inputEnd: 3,
    outputStart: 0,
    outputEnd: 3,
  });
  assertEquals(pieces(decomposed), [["ἄ", "a)/"], ["ν", "n"]]);

  const nfd = detailed("a)/n", "beta-code", "greek", {
    unicode: { composition: "decomposed" },
  });
  assertEquals(nfd.output, "ἄν");
  assertEquals(pieces(nfd), [["a)/", "ἄ"], ["n", "ν"]]);
});

Deno.test("spans count UTF-16 code units", () => {
  const result = detailed("ἀ\u{1018A}β", "greek", "beta-code");

  assertEquals(result.output, "a)\u{1018A}b");
  assertEquals(result.spans, [
    { inputStart: 0, inputEnd: 1, outputStart: 0, outputEnd: 2 },
    { inputStart: 1, inputEnd: 3, outputStart: 2, outputEnd: 4 },
    { inputStart: 3, inputEnd: 4, outputStart: 4, outputEnd: 5 },
  ]);
});

Deno.test("a rough breathing's h belongs to its vowel", () => {
  assertEquals(pieces(detailed("hodós", "transliteration", "greek")), [
    ["ho", "ὁ"],
    ["d", "δ"],
    ["ó", "ό"],
    ["s", "ς"],
  ]);
  assertEquals(pieces(detailed("Ἑλλάς", "greek", "transliteration")), [
    ["Ἑ", "He"],
    ["λ", "l"],
    ["λ", "l"],
    ["ά", "á"],
    ["ς", "s"],
  ]);
  assertEquals(pieces(detailed("ῥ", "greek", "transliteration")), [
    ["ῥ", "rh"],
  ]);
});

Deno.test("the letters of a modern digraph share its character", () => {
  const read = detailed("boukáli", "transliteration", "greek", {
    preset: "iso-843-type-2",
  });
  assertEquals(read.output, "μπουκάλι");
  assertEquals(pieces(read).slice(0, 3), [
    ["b", "μ"],
    ["b", "π"],
    ["o", "ο"],
  ]);

  const written = detailed("μπουκάλι", "greek", "transliteration", {
    preset: "iso-843-type-2",
  });
  assertEquals(written.output, "boukáli");
  assertEquals(pieces(written).slice(0, 3), [
    ["μ", "b"],
    ["π", "b"],
    ["ο", "o"],
  ]);
});

Deno.test("the tokens of a Greek numeral share its decimal number", () => {
  const result = detailed("ιβʹ ἔτος", "greek", "transliteration", {
    orthography: { numerals: "decimal" },
  });

  assertEquals(result.output, "12 étos");
  assertEquals(pieces(result).slice(0, 4), [
    ["ι", "12"],
    ["β", "12"],
    ["ʹ", "12"],
    [" ", " "],
  ]);
  assertEquals(result.losses.map(({ offset, length }) => [offset, length]), [
    [0, 1],
    [1, 1],
    [2, 1],
  ]);
});

Deno.test("collapsed whitespace shares its space or has an empty span", () => {
  const result = detailed("  λόγος   καὶ  ", "greek", "greek", {
    orthography: { whitespace: "collapse" },
  });

  assertEquals(result.output, "λόγος καὶ");
  const spans = result.spans!;
  // Leading whitespace: nothing in the output, at the output's start.
  assertEquals(spans[0], {
    inputStart: 0,
    inputEnd: 1,
    outputStart: 0,
    outputEnd: 0,
  });
  assertEquals(spans[1].outputStart, 0);
  assertEquals(spans[1].outputEnd, 0);
  // The run between the words: the one space written for it.
  for (const index of [7, 8, 9]) {
    assertEquals(spans[index].outputStart, 5, `token ${index}`);
    assertEquals(spans[index].outputEnd, 6, `token ${index}`);
  }
  // Trailing whitespace: nothing, at the output's end.
  assertEquals(spans[13].outputStart, 9);
  assertEquals(spans[14].outputEnd, 9);
});

Deno.test("an assimilated dental shares the sigma it became", () => {
  const result = detailed("ατσα", "greek", "greek", {
    orthography: { dentalSigma: "assimilate" },
  });

  assertEquals(result.output, "ασα");
  assertEquals(pieces(result), [
    ["α", "α"],
    ["τ", "σ"],
    ["σ", "σ"],
    ["α", "α"],
  ]);
  assertEquals(result.spans![1].outputStart, result.spans![2].outputStart);
});

Deno.test("losses carry the offset and length of their token", () => {
  const result = detailed("Ἄβ", "greek", "greek", {
    diacritics: { accents: "remove" },
    orthography: { letterCase: "lowercase" },
  });

  for (const loss of result.losses) {
    assertEquals(loss.offset, 0);
    assertEquals(loss.length, 1);
    assertEquals(
      result.input.slice(loss.offset, loss.offset! + loss.length!),
      "Ἄ",
    );
  }
});

Deno.test("parseDetailed gives the input span of each token", () => {
  const { document, spans } = parseDetailed("ἄνθρωπος", "greek");

  assertEquals(document.length, 8);
  assertEquals(
    spans,
    [0, 1, 2, 3, 4, 5, 6, 7].map((start) => ({
      start,
      end: start + 1,
    })),
  );

  const decomposed = parseDetailed("ἄν", "greek");
  assertEquals(decomposed.spans, [{ start: 0, end: 3 }, { start: 3, end: 4 }]);

  const digraph = parseDetailed("boukáli", "transliteration", {
    preset: "iso-843-type-2",
  });
  assertEquals(digraph.spans.slice(0, 3), [
    { start: 0, end: 1 },
    { start: 0, end: 1 },
    { start: 1, end: 2 },
  ]);
});

Deno.test("literals read from one character share its span", () => {
  // A Hangul syllable decomposes into three jamo, each a literal.
  const { document, spans } = parseDetailed("한 α", "greek");

  assertEquals(document.length, 5);
  assertEquals(spans, [
    { start: 0, end: 1 },
    { start: 0, end: 1 },
    { start: 0, end: 1 },
    { start: 1, end: 2 },
    { start: 2, end: 3 },
  ]);
});

/**
 * The invariants: one span per token; input spans in order, covering the
 * input, each either following the previous one or equal to it; output spans
 * in order of start, covering the output, each following the previous one,
 * equal to it, empty, or inside it (a stray combining mark the output joins
 * to the previous token's last character); losses at their token's span.
 */
function checkInvariants(
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions,
): void {
  const where = `${JSON.stringify(input)} ${from} → ${to} ${
    JSON.stringify(options)
  }`;
  const { document, spans: read } = parseDetailed(input, from, options);
  const result = convertDetailed(input, from, to, options);
  const spans = result.spans!;

  assertEquals(read.length, document.length, where);
  assertEquals(spans.length, document.length, where);
  assertEquals(result.output, convert(input, from, to, options), where);

  let previous: TokenSpan = { start: 0, end: 0 };
  for (const [index, span] of read.entries()) {
    const here = `${where}, token ${index}`;
    assert(span.start < span.end, `${here}: empty input span`);
    assert(
      span.start === previous.end ||
        span.start === previous.start && span.end === previous.end,
      `${here}: input span ${JSON.stringify(span)} after ${
        JSON.stringify(previous)
      }`,
    );
    assertEquals(spans[index].inputStart, span.start, here);
    assertEquals(spans[index].inputEnd, span.end, here);
    previous = span;
  }
  assertEquals(previous.end, input.length, `${where}: input not covered`);

  let last: TokenSpan = { start: 0, end: 0 };
  let covered = 0;
  for (const [index, span] of spans.entries()) {
    const here = `${where}, token ${index}`;
    const start = span.outputStart;
    const end = span.outputEnd;
    assert(start <= end, `${here}: reversed output span`);
    assert(end <= result.output.length, `${here}: output span out of range`);
    assert(start >= last.start, `${here}: output span goes back`);
    const inside = start >= last.start && end <= last.end;
    assert(
      start >= last.end || inside,
      `${here}: output span [${start}, ${end}) overlaps [${last.start}, ${last.end})`,
    );
    if (end > start) {
      assert(start === covered || inside, `${here}: gap before ${start}`);
      covered = Math.max(covered, end);
      last = { start, end };
    } else {
      assert(start >= covered || inside, `${here}: empty span behind`);
    }
  }
  assertEquals(covered, result.output.length, `${where}: output not covered`);

  for (const loss of result.losses) {
    const span = read[loss.index];
    assertEquals(loss.offset, span.start, `${where}: loss offset`);
    assertEquals(loss.length, span.end - span.start, `${where}: loss length`);
  }
}

const EDGE_CASES = [
  "",
  " ",
  "  α  ",
  "ἄ",
  "ά",
  "ά",
  "ᾳ",
  "ΐ",
  "한",
  "한글 λόγος",
  "áb",
  "ȩ̄̃",
  "ᾠδή",
  "ῥ",
  "ιβʹ",
  "͵βκδʹ",
  "στʹ",
  "ΑΓΓΕΛΟΣ",
  "μπουκάλι",
  "ντομάτα",
  "mpoukali",
  "d̲omáta",
  "boukáli",
  "Εύβοια",
  "εῦ",
  "hodós",
  "HODÓS",
  "ἁυτός",
  "ἀυτμή",
  "\u{1018A}",
  "*)/anqrwpos",
  "A)/NQRWPOS",
  "*s3",
  "#1#2#3#5 #22 #401",
  "a*",
  "*",
  "*)",
  "a)/́",
  "a͜b",
  "α᾽",
  "x᾽",
  "λόγος\n\nκαὶ\t",
  "́",
  "́α",
  "\uD800",
  "\uDC00",
  "😀",
  "é",
  "ĉ",
  "ḳ",
  "c̄̂",
  "Ω",
  "K",
  "r(h rrh Rh",
  "ϐ ϲ ς σ",
  "πρὸς Σίμωνα",
];

const OPTION_SETS: ConversionOptions[] = [
  {},
  ...listPresetMetadata().map(({ id }) => ({ preset: id })),
  { removeDiacritics: true },
  { orthography: { whitespace: "collapse" } },
  { orthography: { numerals: "decimal" } },
  { orthography: { whitespace: "collapse", numerals: "decimal" } },
  { orthography: { dentalSigma: "assimilate" } },
  { orthography: { letterCase: "uppercase" } },
  {
    orthography: { muPi: "b-initial", nuTau: "d-underline-initial", beta: "v" },
  },
  { orthography: { upsilon: "y-with-ou-v-f", longVowels: "omit" } },
  { orthography: { keraia: "bnf", smoothBreathing: "apostrophe" } },
  { orthography: { accentuation: "monotonic" }, unicode: { acute: "oxia" } },
  { unicode: { composition: "decomposed" } },
  {
    preset: "iso-843-type-2",
    orthography: { whitespace: "collapse", numerals: "decimal" },
  },
];

Deno.test("span invariants hold across fixtures, formats and options", () => {
  const inputs = new Set<string>(EDGE_CASES);
  for (const equivalence of EQUIVALENCES) {
    inputs.add(equivalence.greek);
    inputs.add(equivalence.betaCode);
    inputs.add(equivalence.transliteration);
  }
  for (const conversion of LOSSY_CONVERSIONS) {
    inputs.add(conversion.source);
    inputs.add(conversion.intermediate);
  }

  for (const input of inputs) {
    for (const from of FORMATS) {
      for (const options of OPTION_SETS) {
        for (const to of FORMATS) {
          checkInvariants(input, from, to, options);
        }
      }
    }
  }
});

Deno.test("span invariants hold for every value of every option", () => {
  const inputs = [
    "Θουκυδίδης Ἀθηναῖος ξυνέγραψε τὸν πόλεμον, ιβʹ ἔτη· μπα ντο γκ;",
    "*qoukudi/dhs *)aqhnai=os cune/graye to\\n po/lemon, ib# e)/th: mpa nto gk;",
    "Thoukydídēs Athēnaĩos xynégrapse tòn pólemon, 12 étē; mpa nto gk?",
  ] as const;

  for (
    const [group, keys] of [
      ["orthography", CONVERSION_OPTION_VALUES.orthography],
      ["unicode", CONVERSION_OPTION_VALUES.unicode],
    ] as const
  ) {
    for (const [key, values] of Object.entries(keys)) {
      for (const value of values as readonly string[]) {
        const options = { [group]: { [key]: value } } as ConversionOptions;
        for (const [index, from] of FORMATS.entries()) {
          for (const to of FORMATS) {
            checkInvariants(inputs[index], from, to, options);
          }
        }
      }
    }
  }
});
