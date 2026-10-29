import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  CharacterScopeError,
  CONVERSION_OPTION_VALUES,
  type ConversionOptions,
  type ConversionResult,
  convert,
  convertDetailed,
  type Converter,
  createConverter,
  type Format,
  listPresetMetadata,
} from "../src/mod.ts";
import { parse, parseDetailed, type TokenSpan } from "../src/document.ts";
import {
  continuesSegment,
  segmentMap,
  segmentMapByGroups,
} from "../src/parsers/positions.ts";
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
    greek: { composition: "decomposed" },
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
    text: { numerals: "decimal" },
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
    text: { whitespace: "collapse" },
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
    greek: { dentalSigma: "assimilate" },
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
    text: { letterCase: "lowercase" },
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

Deno.test("segments are closed under normalization for every code point", () => {
  // A segment is a character and the code points that continue it. The
  // positions pair each segment of a text with one segment of its
  // normalization, which holds when no code point decomposes into, composes
  // across, or reorders across a segment boundary. Checked against the
  // Unicode version of the runtime: an engine that adds a letter composing
  // with the one before it fails here before positions drift.
  const segments = (text: string) => {
    let count = 0;
    for (const char of text) {
      if (count === 0 || !continuesSegment(char.codePointAt(0)!)) count++;
    }
    return count;
  };
  const failures: string[] = [];
  for (let codePoint = 0; codePoint <= 0x10FFFF; codePoint++) {
    if (codePoint >= 0xD800 && codePoint <= 0xDFFF) continue;
    const char = String.fromCodePoint(codePoint);
    const nfd = char.normalize("NFD");
    const name = `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
    if (segments("a" + nfd) !== segments("a" + char)) {
      failures.push(`${name} decomposes across a segment boundary`);
    }
    if (
      nfd !== char && char.normalize("NFC") === char &&
      [...nfd].slice(1).some((part) => !continuesSegment(part.codePointAt(0)!))
    ) {
      failures.push(`${name} composes across a segment boundary`);
    }
    // U+0334 has combining class 1 and U+0345 class 240: a character with
    // another class than 0 changes places with one of them.
    if (
      nfd === char && !continuesSegment(codePoint) &&
      (("a" + char + "\u{334}").normalize("NFD") !== "a" + char + "\u{334}" ||
        ("a\u{345}" + char).normalize("NFD") !== "a\u{345}" + char)
    ) {
      failures.push(`${name} reorders across a segment boundary`);
    }
  }
  assertEquals(failures.slice(0, 10), []);
});

Deno.test("spans after letters that composition joins across characters", () => {
  // Hangul jamo, a Kaithi letter with nukta, a Kirat Rai vowel sign: the
  // output composes what the reader read as several literals. Greek output
  // writes the acute as oxia by default.
  for (const prefix of ["한", "\u{1109A}", "\u{11099}\u{110BA}", "\u{16D68}"]) {
    assertEquals(
      pieces(detailed(`${prefix} λ\u{3CC}γος`, "greek", "greek")).slice(-5),
      [["λ", "λ"], ["\u{3CC}", "\u{1F79}"], ["γ", "γ"], ["ο", "ο"], ["ς", "ς"]],
      prefix,
    );
    assertEquals(
      pieces(detailed(`${prefix} λ\u{3CC}γος`, "greek", "transliteration"))
        .slice(-5),
      [["λ", "l"], ["\u{3CC}", "\u{F3}"], ["γ", "g"], ["ο", "o"], ["ς", "s"]],
      prefix,
    );
  }
  // Read as two literals, written as the one character they compose.
  assertEquals(pieces(detailed("\u{11099}\u{110BA}", "greek", "greek")), [
    ["\u{11099}", "\u{1109A}"],
    ["\u{110BA}", "\u{1109A}"],
  ]);
  // An astral combining mark is reordered with the marks around it.
  assertEquals(parseDetailed("a\u{1E000}\u{323}", "greek").spans, [
    { start: 0, end: 4 },
    { start: 0, end: 4 },
    { start: 0, end: 4 },
  ]);
});

Deno.test("a character that normalization leaves unchanged keeps its own span", () => {
  // Changed alone, without moving: the ohm sign read as an omega, an oxia
  // written as a tonos and back.
  assertEquals(parseDetailed("\u{2126}\u{332}", "greek").spans, [
    { start: 0, end: 1 },
    { start: 1, end: 2 },
  ]);
  assertEquals(pieces(detailed("\u{1F71}\u{332}", "beta-code", "greek")), [
    ["\u{1F71}", "\u{1F71}"],
    ["\u{332}", "\u{332}"],
  ]);

  assertEquals(parseDetailed("e\u{332}", "greek").spans, [
    { start: 0, end: 1 },
    { start: 1, end: 2 },
  ]);
  // The same, after a character the reader decomposes.
  assertEquals(parseDetailed("ἄe\u{332}", "greek").spans, [
    { start: 0, end: 1 },
    { start: 1, end: 2 },
    { start: 2, end: 3 },
  ]);
  // In the output, a stray mark that is not composed has its own span.
  assertEquals(pieces(detailed("Ο\u{332}b", "greek", "greek")), [
    ["Ο", "Ο"],
    ["\u{332}", "\u{332}"],
    ["b", "b"],
  ]);
  assertEquals(
    pieces(detailed("ὀʹ", "greek", "transliteration", { preset: "bnf-core" })),
    [["ὀ", "o\u{313}"], ["ʹ", "\u{301}"]],
  );
});

Deno.test("a character split between two tokens is inside the first one's span", () => {
  // The h of ph and the dot below of a precomposed ḥ, kept as a literal.
  assertEquals(parseDetailed("p\u{1E25}", "transliteration").spans, [
    { start: 0, end: 2 },
    { start: 1, end: 2 },
  ]);
  // Decomposed, the dot is a character of its own.
  assertEquals(parseDetailed("ph\u{323}", "transliteration").spans, [
    { start: 0, end: 2 },
    { start: 2, end: 3 },
  ]);
});

Deno.test("a letter that composition joins to the one before shares its group", () => {
  // The Kirat Rai vowel sign AI decomposes into two signs E, which continue
  // the character before them: the x shares the range of the group that
  // normalization changed.
  assertEquals(parseDetailed("x\u{16D68}", "greek").spans, [
    { start: 0, end: 3 },
    { start: 0, end: 3 },
    { start: 0, end: 3 },
  ]);
  // Already decomposed, the group is unchanged and each unit keeps its own.
  assertEquals(parseDetailed("x\u{16D67}\u{16D67}", "greek").spans, [
    { start: 0, end: 1 },
    { start: 1, end: 3 },
    { start: 3, end: 5 },
  ]);
  // A Hangul vowel jamo after a precomposed letter.
  assertEquals(parseDetailed("\u{3AC}\u{1161}", "greek").spans, [
    { start: 0, end: 2 },
    { start: 0, end: 2 },
  ]);
});

Deno.test("a stray mark after a substituted Greek sign keeps its own span", () => {
  // The Greek question mark and ano teleia are substituted after
  // normalization, one code unit for one.
  for (
    const [input, sign, options] of [
      [";\u{332}", "\u{37E}", { greek: { questionMark: "greek" } }],
      ["\u{B7}\u{332}", "\u{387}", { greek: { anoTeleia: "greek" } }],
      ["\u{B7}\u{332}", "\u{387}", {
        greek: { anoTeleia: "greek", composition: "decomposed" },
      }],
    ] as const
  ) {
    const result = detailed(input, "greek", "greek", options);
    assertEquals(result.output, sign + "\u{332}");
    assertEquals(pieces(result), [[input[0], sign], ["\u{332}", "\u{332}"]]);
  }
});

Deno.test("segment maps align every code point with its normalization", () => {
  // Every code point in two contexts, and those that normalization touches
  // or that continue a segment in more: each run of units mapped to one range
  // normalizes into exactly that range, the ranges tile the other text in
  // order, and a unit mapped alone maps to its counterpart. The fallback
  // alignment, which the walk never needs here, gives the same maps.
  const contexts = [
    (c: string) => "a" + c,
    (c: string) => c + "a",
    (c: string) => "a" + c + "\u{301}",
    (c: string) => "\u{E9}" + c + "\u{323}",
    (c: string) => "\u{1100}" + c,
    (c: string) => "\u{AC00}" + c,
    (c: string) => c + "\u{1161}\u{11AB}",
    (c: string) => "\u{16D63}" + c + "\u{16D67}",
    (c: string) => "\u{1F600}" + c + "\u{1F600}",
  ];
  const failures: string[] = [];
  const check = (
    from: string,
    to: string,
    original: "from" | "to",
    form: "NFC" | "NFD",
  ) => {
    const map = segmentMap(from, to, original, form);
    if (map === undefined) {
      if (from !== to) failures.push(`no map for ${JSON.stringify(from)}`);
      return;
    }
    const fallback = segmentMapByGroups(from, to, original, form);
    if (
      fallback.starts.join() !== map.starts.join() ||
      fallback.ends.join() !== map.ends.join()
    ) {
      failures.push(`fallback differs for ${JSON.stringify(from)} ${form}`);
    }
    let covered = 0;
    for (let k = 0; k < from.length;) {
      const start = map.starts[k];
      const end = map.ends[k];
      let j = k + 1;
      while (
        j < from.length && map.starts[j] === start && map.ends[j] === end
      ) j++;
      const a = from.slice(k, j);
      const b = to.slice(start, end);
      const same = original === "from"
        ? a.normalize(form) === b || a === b
        : a === b.normalize(form) || a === b;
      if (start !== covered || end <= start || !same) {
        failures.push(
          `${JSON.stringify(from)} → ${JSON.stringify(to)} ${form}: ` +
            `units ${k}–${j} at [${start}, ${end})`,
        );
        return;
      }
      covered = end;
      k = j;
    }
    if (covered !== to.length) failures.push(`${JSON.stringify(to)} uncovered`);
  };
  for (let codePoint = 0; codePoint <= 0x10FFFF; codePoint++) {
    if (codePoint >= 0xD800 && codePoint <= 0xDFFF) continue;
    const char = String.fromCodePoint(codePoint);
    const active = continuesSegment(codePoint) ||
      char.normalize("NFD") !== char || char.normalize("NFC") !== char;
    for (const context of active ? contexts : contexts.slice(0, 2)) {
      const text = context(char);
      for (const form of ["NFC", "NFD"] as const) {
        const normalized = text.normalize(form);
        // Reading: the reader's text is the normalization of the input.
        check(normalized, text, "to", form);
        // Writing: the output is the normalization of the assembled text.
        check(text, normalized, "from", form);
      }
    }
    if (failures.length >= 10) break;
  }
  assertEquals(failures, []);
});

Deno.test("the fallback alignment stays coarse but right when texts do not match", () => {
  // Not normalizations of each other: the rest of both texts is one group.
  assertEquals(segmentMapByGroups("ab", "xy", "from", "NFC"), {
    starts: [0, 0, 2],
    ends: [2, 2, 2],
  });
  // A composition across what would be two segments, aligned by groups.
  assertEquals(
    segmentMapByGroups("\u{1100}\u{1161}b", "\u{AC00}b", "from", "NFC"),
    {
      starts: [0, 0, 1, 2],
      ends: [1, 1, 2, 2],
    },
  );
});

Deno.test("a token's spans depend only on its groups, not on the text before", () => {
  // Prefixing a text with another and a space shifts the spans of its tokens
  // by what was prefixed, in the input and in the output, whenever the text
  // reads and writes the same after the prefix. A text that starts with a
  // code point continuing the character before it (a stray mark, a Hangul
  // vowel jamo) joins the group of the space, which the contract allows: it
  // is not compared.
  const prefixes: Record<Format, string[]> = {
    greek: [
      "ἄ",
      "한",
      "\u{1109A}",
      "\u{11099}\u{110BA}",
      "\u{16D68}",
      "a\u{1E000}\u{323}",
      "ΐ",
      "😀",
      "e\u{332}",
    ],
    "beta-code": ["a)/", "한", "\u{1109A}", "\u{16D68}"],
    transliteration: [
      "á",
      "한",
      "\u{1109A}",
      "\u{16D68}",
      "p\u{1E25}",
      "e\u{332}",
    ],
  };
  const texts: Record<Format, string[]> = {
    greek: [
      "e\u{332}",
      "Ο\u{332}b",
      "λ\u{3CC}γος",
      "\u{16D68} λ",
      "\u{16D67}\u{16D67} λ",
      "\u{301}α",
    ],
    "beta-code": [],
    transliteration: ["ph\u{323}", "p\u{1E25}", "e\u{332}"],
  };
  for (const equivalence of EQUIVALENCES) {
    texts.greek.push(equivalence.greek);
    texts["beta-code"].push(equivalence.betaCode);
    texts.transliteration.push(equivalence.transliteration);
  }
  // Diacritics are sets, which JSON.stringify() writes as {}.
  const serialize = (value: unknown) =>
    JSON.stringify(value, (_, v) => v instanceof Set ? [...v].sort() : v);

  let checked = 0;
  for (const from of FORMATS) {
    for (const to of FORMATS) {
      for (const prefix of prefixes[from]) {
        for (const text of texts[from]) {
          const head = `${prefix} `;
          const alone = convertDetailed(text, from, to);
          const joined = convertDetailed(head + text, from, to);
          const count = alone.spans.length;
          const comparable = !continuesSegment(text.codePointAt(0)!) &&
            joined.output.endsWith(alone.output) &&
            serialize(parse(head + text, from).slice(-count)) ===
              serialize(parse(text, from));
          if (!comparable) continue;
          checked++;
          const inShift = head.length;
          const outShift = joined.output.length - alone.output.length;
          assertEquals(
            joined.spans.slice(-count),
            alone.spans.map((span) => ({
              inputStart: span.inputStart + inShift,
              inputEnd: span.inputEnd + inShift,
              outputStart: span.outputStart + outShift,
              outputEnd: span.outputEnd + outShift,
            })),
            `${from} → ${to}: ${JSON.stringify(prefix)} before ${
              JSON.stringify(text)
            }`,
          );
        }
      }
    }
  }
  assert(checked > 1000, `only ${checked} texts compared`);
});

const SAN = {
  id: "san",
  forms: {
    greek: { lowercase: "ϻ", uppercase: "Ϻ" },
    "beta-code": { lowercase: "#711", uppercase: "*#711" },
    transliteration: { lowercase: "ś", uppercase: "Ś" },
  },
  override: true,
} as const;

const CUSTOM = createConverter({
  characters: [SAN],
  aliases: [
    { letter: "omega", format: "beta-code", spellings: ["v"], override: true },
    { letter: "theta", format: "transliteration", spellings: ["þ"] },
  ],
});

/** `Converter.convertDetailed()` with the input kept for slicing. */
function detailedBy(
  converter: Converter,
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions = {},
) {
  return { ...converter.convertDetailed(input, from, to, options), input };
}

Deno.test("a custom character's spellings are its token's spans", () => {
  assertEquals(pieces(detailedBy(CUSTOM, "ἀϻ Ϻ", "greek", "beta-code")), [
    ["ἀ", "a)"],
    ["ϻ", "#711"],
    [" ", " "],
    ["Ϻ", "*#711"],
  ]);
  assertEquals(
    pieces(detailedBy(CUSTOM, "a)#711 *#711", "beta-code", "greek")),
    [["a)", "ἀ"], ["#711", "ϻ"], [" ", " "], ["*#711", "Ϻ"]],
  );
  assertEquals(
    pieces(detailedBy(CUSTOM, "aś Ś", "transliteration", "beta-code")),
    [["a", "a)"], ["ś", "#711"], [" ", " "], ["Ś", "*#711"]],
  );
});

Deno.test("an alias spelling is its letter's span", () => {
  assertEquals(pieces(detailedBy(CUSTOM, "*va", "beta-code", "greek")), [
    ["*v", "Ω"],
    ["a", "α"],
  ]);
  assertEquals(
    pieces(detailedBy(CUSTOM, "þeós", "transliteration", "greek")),
    [["þ", "θ"], ["e", "ε"], ["ó", "ό"], ["s", "ς"]],
  );
});

Deno.test("the literals of a preserved out-of-scope character share its span", () => {
  const converter = createConverter({ characters: [SAN], exclude: ["san"] });
  const result = detailedBy(converter, "a#711b", "beta-code", "greek");

  assertEquals(result.output, "α#711β");
  assertEquals(pieces(result), [
    ["a", "α"],
    ["#711", "#"],
    ["#711", "7"],
    ["#711", "1"],
    ["#711", "1"],
    ["b", "β"],
  ]);
  assertEquals(
    result.diagnostics.map(({ index, offset, length }) => [
      index,
      offset,
      length,
    ]),
    [[1, 1, 4]],
  );

  // A diagnostic's index is in the prepared document, like the losses' and
  // the spans': after the four literals of #711, the digamma is token 6.
  const both = createConverter({
    characters: [SAN],
    exclude: ["san", "digamma"],
  });
  const two = detailedBy(both, "a#711 V", "beta-code", "greek");
  assertEquals(
    two.diagnostics.map(({ index, character }) => [index, character]),
    [[1, "san"], [6, "digamma"]],
  );
  assertEquals(pieces(two)[6], ["V", "v"]);
});

Deno.test("scope diagnostics locate the character, in results and errors", () => {
  const preserving = createConverter({ exclude: ["digamma"] });
  const result = preserving.convertDetailed("αϝ β", "greek", "transliteration");
  assertEquals(
    result.diagnostics.map((
      { code, offset, length },
    ) => [code, offset, length]),
    [["out-of-scope-character", 1, 1]],
  );

  const rejecting = createConverter({
    exclude: ["digamma"],
    outOfScopeBehavior: "reject",
  });
  const error = assertThrows(
    () => rejecting.convert("αϝ β", "greek", "transliteration"),
    CharacterScopeError,
  );
  assertEquals(error.diagnostics[0].offset, 1);
  assertEquals(error.diagnostics[0].length, 1);
});

Deno.test("converter spans are in the input as supplied", () => {
  // The converter lowercases Beta Code and decomposes the other formats
  // before matching its spellings; positions are still those of the input.
  assertEquals(pieces(detailedBy(CUSTOM, "A)#711B", "beta-code", "greek")), [
    ["A)", "ἀ"],
    ["#711", "ϻ"],
    ["B", "β"],
  ]);
  assertEquals(pieces(detailedBy(CUSTOM, "ἄϻ", "greek", "transliteration")), [
    ["ἄ", "á"],
    ["ϻ", "ś"],
  ]);
  assertEquals(
    pieces(detailedBy(CUSTOM, "α\u0313\u0301ϻ", "greek", "transliteration")),
    [["α\u0313\u0301", "á"], ["ϻ", "ś"]],
  );
});

/**
 * The invariants: one span per token; spans in order, their starts and their
 * ends never decreasing; input spans covering the input, each starting where
 * the previous one ends or lying inside it and ending with it (tokens sharing
 * a span, or a token read from part of a character the previous token also
 * draws on); output spans covering the output, each starting where the
 * previous non-empty one ends, lying inside it and ending with it (tokens
 * written as one, a stray combining mark the output joins to the previous
 * token's last character), or empty; losses at their token's span.
 */
function checkSpans(
  where: string,
  input: string,
  result: ConversionResult,
): void {
  const { spans, output } = result;

  let previous: TokenSpan = { start: 0, end: 0 };
  for (const [index, span] of spans.entries()) {
    const here = `${where}, token ${index}`;
    const read = { start: span.inputStart, end: span.inputEnd };
    assert(read.start < read.end, `${here}: empty input span`);
    const follows = read.start === previous.end;
    const inside = read.start >= previous.start && read.end === previous.end;
    assert(
      follows || inside,
      `${here}: input span ${JSON.stringify(read)} after ${
        JSON.stringify(previous)
      }`,
    );
    previous = read;
  }
  assertEquals(previous.end, input.length, `${where}: input not covered`);

  let last: TokenSpan = { start: 0, end: 0 };
  let before: TokenSpan = { start: 0, end: 0 };
  for (const [index, span] of spans.entries()) {
    const here = `${where}, token ${index}`;
    const start = span.outputStart;
    const end = span.outputEnd;
    assert(start <= end, `${here}: reversed output span`);
    assert(end <= output.length, `${here}: output span out of range`);
    assert(
      start >= before.start && end >= before.end,
      `${here}: output span [${start}, ${end}) goes back from [${before.start}, ${before.end})`,
    );
    if (end > start) {
      const follows = start === last.end;
      const inside = start >= last.start && end === last.end;
      assert(
        follows || inside,
        `${here}: output span [${start}, ${end}) after [${last.start}, ${last.end})`,
      );
      last = { start, end };
    }
    before = { start, end };
  }
  assertEquals(last.end, output.length, `${where}: output not covered`);

  for (const loss of result.losses) {
    const span = spans[loss.index];
    assertEquals(loss.offset, span.inputStart, `${where}: loss offset`);
    assertEquals(
      loss.length,
      span.inputEnd - span.inputStart,
      `${where}: loss length`,
    );
  }
}

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

  assertEquals(read.length, document.length, where);
  assertEquals(result.spans.length, document.length, where);
  assertEquals(result.output, convert(input, from, to, options), where);
  for (const [index, span] of read.entries()) {
    assertEquals(result.spans[index].inputStart, span.start, where);
    assertEquals(result.spans[index].inputEnd, span.end, where);
  }
  checkSpans(where, input, result);
}

function checkConverterInvariants(
  converter: Converter,
  input: string,
  from: Format,
  to: Format,
  options: ConversionOptions = {},
): void {
  const where = `converter ${JSON.stringify(input)} ${from} → ${to} ${
    JSON.stringify(options)
  }`;
  const result = converter.convertDetailed(input, from, to, options);

  assertEquals(result.output, converter.convert(input, from, to, options));
  checkSpans(where, input, result);
  for (const diagnostic of result.diagnostics) {
    const { offset, length } = diagnostic;
    assert(
      length > 0 && offset + length <= input.length,
      `${where}: diagnostic`,
    );
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
  "p\u{1E25}",
  "ph\u{323}",
  "ἄph\u{323}»",
  "e\u{332}",
  "ἄe\u{332}",
  "Ο\u{332}b",
  "한 λόγος",
  "\u{1109A} λόγος",
  "\u{11099}\u{110BA} λόγος",
  "\u{16D68} λόγος",
  "a\u{1E000}\u{323} λ",
];

const OPTION_SETS: ConversionOptions[] = [
  {},
  ...listPresetMetadata().map(({ id }) => ({ preset: id })),
  { diacritics: { all: "remove" } },
  { text: { whitespace: "collapse" } },
  { text: { numerals: "decimal" } },
  { text: { whitespace: "collapse", numerals: "decimal" } },
  { greek: { dentalSigma: "assimilate" } },
  { text: { letterCase: "uppercase" } },
  {
    transliteration: {
      muPi: "b-initial",
      nuTau: "d-underline-initial",
      beta: "v",
    },
  },
  { transliteration: { upsilon: "y-with-ou-v-f", longVowels: "omit" } },
  { transliteration: { keraia: "bnf", smoothBreathing: "apostrophe" } },
  { greek: { accentuation: "monotonic", acute: "oxia" } },
  { greek: { composition: "decomposed" } },
  {
    preset: "iso-843-type-2",
    text: { whitespace: "collapse", numerals: "decimal" },
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

Deno.test("span invariants hold for bound converters", () => {
  const converters = [
    createConverter(),
    CUSTOM,
    createConverter({ characters: [SAN], exclude: ["san", "digamma"] }),
    createConverter({ preset: "iso-843-type-2" }),
    createConverter({ preset: "bnf-core", exclude: ["stigma"] }),
  ];
  const inputs = [
    ...EDGE_CASES,
    "ἀϻ Ϻ ϝ ϛ",
    "a)#711 *#711 v *v #2",
    "aś Ś þ",
    "Θουκυδίδης Ἀθηναῖος ξυνέγραψε, ιβʹ ἔτη·",
  ];
  const optionSets: ConversionOptions[] = [
    {},
    { text: { whitespace: "collapse", numerals: "decimal" } },
    { betaCode: { case: "uppercase" } },
    { greek: { composition: "decomposed" } },
  ];

  for (const converter of converters) {
    for (const input of inputs) {
      for (const from of FORMATS) {
        for (const to of FORMATS) {
          for (const options of optionSets) {
            try {
              checkConverterInvariants(converter, input, from, to, options);
            } catch (error) {
              // A bound preset rejects options it does not accept.
              if (!(error instanceof RangeError)) throw error;
            }
          }
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
      ["transliteration", CONVERSION_OPTION_VALUES.transliteration],
      ["greek", CONVERSION_OPTION_VALUES.greek],
      ["betaCode", CONVERSION_OPTION_VALUES.betaCode],
      ["text", CONVERSION_OPTION_VALUES.text],
      ["diacritics", CONVERSION_OPTION_VALUES.diacritics],
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
