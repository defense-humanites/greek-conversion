import { test } from "node:test";
import { assertEquals, assertNfcEquals } from "./assertions.ts";
import {
  CONVERSION_OPTION_VALUES,
  type ConversionOptions,
  convert,
  convertDetailed,
  createConverter,
  reencode,
} from "../src/mod.ts";
import {
  applyGreekOrthography,
  encode,
  parse,
  parseDetailed,
} from "../src/document.ts";

// A text whose default transliteration reads back as itself: no coronis and
// no lunate sigma, which the default style does not note.
const GREEK = "Θουκυδίδης Ἀθηναῖος ξυνέγραψε τὸν πόλεμον τῶν Πελοποννησίων " +
  "καὶ Ἀθηναίων, ὡς ἐπολέμησαν πρὸς ἀλλήλους· ἄγγελος ἄνθρωπος φίλος " +
  "ἀνάγκη υἱός ῥήτωρ ἐγγύς μπάλα αὐτός εὐθύς οὐ χρόνος ψυχή ἦλθε τῷ";

const PRESETS = [
  "ala-lc-ancient",
  "ala-lc-modern",
  "bnf-core",
  "iso-843-type-1",
  "iso-843-type-2",
  "perseus",
  "sbl-general",
  "tlg-core",
] as const;

/** Every transliteration option value, alone, and every preset. */
function profiles(): Array<[string, ConversionOptions]> {
  const all: Array<[string, ConversionOptions]> = [];
  for (
    const [key, values] of Object.entries(
      CONVERSION_OPTION_VALUES.transliteration,
    )
  ) {
    for (const value of values) {
      all.push([`${key}: ${value}`, { transliteration: { [key]: value } }]);
    }
  }
  for (const preset of PRESETS) all.push([`preset ${preset}`, { preset }]);
  return all;
}

test("source restyles a transliteration that its options would read otherwise", () => {
  // The options describe the input as well, unless source does (#70): under
  // phi: "f", ph is pi and a rough breathing, and under ALA-LC Modern, b is
  // μπ.
  const cases: Array<[string, ConversionOptions, string, string]> = [
    ["phílos", { transliteration: { phi: "f" } }, "phílos", "fílos"],
    [
      "ángelos",
      { transliteration: { nasalGamma: "literal" } },
      "ángelos",
      "ággelos",
    ],
    [
      "ánthrōpos",
      { transliteration: { smoothBreathing: "apostrophe" } },
      "ánthrōpos",
      "’ánthrōpos",
    ],
    [
      "ánthrōpos",
      { transliteration: { smoothBreathing: "greek" } },
      "ánthrōpos",
      "a̓́nthrōpos",
    ],
    [
      "tōn barbarōn",
      { preset: "ala-lc-modern" },
      "tōn barmparōn",
      "tōn varvarōn",
    ],
  ];
  for (const [input, options, alone, restyled] of cases) {
    const label = JSON.stringify(options);
    assertNfcEquals(reencode(input, "transliteration", options), alone, label);
    assertNfcEquals(
      reencode(input, "transliteration", { ...options, source: {} }),
      restyled,
      label,
    );
    assertNfcEquals(
      reencode(input, "transliteration", {
        ...options,
        source: {},
      }),
      restyled,
      label,
    );
  }
});

test("a text in the default style is restyled into every style", () => {
  const source = convert(GREEK, "greek", "transliteration");
  for (const [label, options] of profiles()) {
    const expected = convert(GREEK, "greek", "transliteration", options);
    assertNfcEquals(
      reencode(source, "transliteration", { ...options, source: {} }),
      expected,
      label,
    );
    // Without source, a text in its own style is normalized as itself.
    assertNfcEquals(
      reencode(expected, "transliteration", options),
      expected,
      label,
    );
  }
});

test("source reads the input of a conversion between formats", () => {
  // Without source, smoothBreathing: "apostrophe" says that the input writes
  // its smooth breathings, so none is inferred.
  const apostrophe = {
    transliteration: { smoothBreathing: "apostrophe" },
  } as const;
  assertNfcEquals(
    convert("ánthrōpos", "transliteration", "greek", apostrophe),
    "άνθρωπος",
  );
  assertNfcEquals(
    convert("ánthrōpos", "transliteration", "greek", {
      ...apostrophe,
      source: {},
    }),
    "ἄνθρωπος",
  );
  // ISO 843 writes eta ī, and its monotonic reading infers no breathing.
  assertNfcEquals(
    convert("Athīnaíos", "transliteration", "beta-code", {
      source: { preset: "iso-843-type-1" },
    }),
    "*aqhnai/os",
  );
  // The document API reads with source too, and writes without it.
  const letters = (document: ReturnType<typeof parse>) =>
    document.map((token) =>
      token.kind === "grapheme" ? token.letter : token.value
    );
  const phi = { source: { transliteration: { phi: "f" } } } as const;
  assertEquals(letters(parse("fílos", "transliteration", phi)), [
    "phi",
    "iota",
    "lambda",
    "omicron",
    "sigma",
  ]);
  const detailed = parseDetailed("fílos", "transliteration", phi);
  assertEquals(letters(detailed.document), [
    "phi",
    "iota",
    "lambda",
    "omicron",
    "sigma",
  ]);
  assertEquals(detailed.spans[0], { start: 0, end: 1 });
  const document = parse("ἄνθρωπος", "greek");
  const modern = { source: { preset: "ala-lc-modern" } } as const;
  assertEquals(
    encode(document, "transliteration", modern),
    encode(document, "transliteration"),
  );
  assertEquals(
    applyGreekOrthography(document, modern),
    applyGreekOrthography(document),
  );
});

test("a lossless restyle converts back with source and the other options swapped", () => {
  const source = convert(GREEK, "greek", "transliteration");
  const canonical = reencode(source, "transliteration");
  let lossless = 0;
  for (const [label, options] of profiles()) {
    const restyle = convertDetailed(
      source,
      "transliteration",
      "transliteration",
      { ...options, source: {} },
    );
    if (restyle.lossy) continue;
    lossless++;
    assertNfcEquals(
      reencode(restyle.output, "transliteration", { source: options }),
      canonical,
      label,
    );
  }
  // Most profiles keep everything this text notes.
  assertEquals(lossless > 40, true);
});

test("source changes nothing in reading Greek and Beta Code", () => {
  const source = { preset: "ala-lc-modern" } as const;
  assertNfcEquals(
    reencode("λόγος", "greek", { greek: { finalSigma: "medial" }, source }),
    "λόγοσ",
  );
  assertNfcEquals(
    reencode("lo/gos", "beta-code", { preset: "tlg-core", source }),
    "LO/GOS",
  );
});

test("convertDetailed reports what a restyle loses", () => {
  const restyle = convertDetailed(
    "tōn barbarōn",
    "transliteration",
    "transliteration",
    { preset: "ala-lc-modern", source: {} },
  );
  assertNfcEquals(restyle.output, "tōn varvarōn");
  assertEquals(restyle.lossy, false);
  assertEquals(restyle.spans.length, 12);

  // ISO 843 Type 2 writes eta, iota and upsilon alike.
  const transcription = convertDetailed(
    "hēmeĩs",
    "transliteration",
    "transliteration",
    { preset: "iso-843-type-2", source: {} },
  );
  assertEquals(transcription.lossy, true);
  assertEquals(
    reencode("hēmeĩs", "transliteration", {
      preset: "iso-843-type-2",
      source: {},
    }),
    transcription.output,
  );
});

test("a converter reads the input as source describes it", () => {
  // The bound preset writes the output; source may name another one.
  const modern = createConverter({ preset: "ala-lc-modern" });
  assertNfcEquals(
    modern.convert("tōn barbarōn", "transliteration", "transliteration", {
      source: {},
    }),
    "tōn varvarōn",
  );
  assertNfcEquals(
    modern.convert("tōn varvarōn", "transliteration", "transliteration"),
    "tōn varvarōn",
  );
  // source is resolved on its own: {} is the default style, not the preset.
  assertNfcEquals(
    modern.convert("tōn barbarōn", "transliteration", "transliteration", {
      source: {},
    }),
    "tōn varvarōn",
  );
  // An alias of the source format is read as source writes its letter.
  const alias = createConverter({
    aliases: [{ letter: "phi", format: "transliteration", spellings: ["ƒ"] }],
  });
  assertNfcEquals(
    alias.convert("ƒílos", "transliteration", "greek", {
      transliteration: { phi: "f" },
      source: {},
    }),
    "φίλος",
  );
  assertNfcEquals(
    alias.convertDetailed("ƒílos", "transliteration", "greek", {
      transliteration: { phi: "f" },
      source: {},
    }).output,
    "φίλος",
  );
  // A letter kept out of scope is copied from the input as it was read.
  const noPhi = createConverter({ exclude: ["phi"] });
  const options = { transliteration: { phi: "f" }, source: {} } as const;
  assertNfcEquals(
    noPhi.convert("phílos", "transliteration", "transliteration", options),
    "phílos",
  );
  const detailed = noPhi.convertDetailed(
    "phílos",
    "transliteration",
    "transliteration",
    options,
  );
  assertEquals(
    detailed.diagnostics.map(({ character, offset, length }) => [
      character,
      offset,
      length,
    ]),
    [["phi", 0, 2]],
  );
  // The output's style reads the kept `ph` as pi and a rough breathing, which
  // it puts on the iota: the output does not read back as its source.
  assertEquals(detailed.lossy, true);
  assertEquals(
    detailed.losses.map(({ code, index }) => [code, index]),
    [["unrepresented-literal", 0], ["unrepresented-grapheme", 1]],
  );
});
