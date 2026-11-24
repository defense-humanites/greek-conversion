import {
  type ConversionOptions,
  convert,
  type Format,
  type Preset,
  type SourceOptions,
} from "../../src/mod.ts";
import type { ValidationCode } from "../../src/document.ts";

/**
 * A complete scenario: loading one sets the text, formats, and settings.
 * `title` says what the text is (a passage of a work or a kind of content),
 * `note` what the example shows, both in a few words; `output` is what the
 * conversion returns, checked by `tests/playground_examples_test.ts`, so
 * that a note never describes a result the library does not give.
 */
export interface Example {
  title: string;
  note: string;
  text: string;
  from: Format;
  to: Format;
  options?: ConversionOptions;
  output: string;
  /** The note names the source format: the example is offered in it only. */
  sourceBound?: boolean;
  /**
   * How the transliteration in the source is written, when not as the
   * output writes it: the library's defaults, or a standard.
   */
  sourceStyle?: SourceStyle;
}

/**
 * How a transliteration in the source is written: `""` as the output writes
 * it (no `source` option), `"defaults"` in the library's default style
 * (`source: {}`), or following a standard.
 */
export type SourceStyle = "" | "defaults" | Preset;

/** The `source` option for a style, or `undefined` to read as the output. */
export function sourceOf(style: SourceStyle): SourceOptions | undefined {
  if (style === "") return undefined;
  return style === "defaults" ? {} : { preset: style };
}

/** The options of an example's conversion under a standard. */
export function exampleOptions(
  example: Example,
  preset: Preset | "",
): ConversionOptions {
  const source = sourceOf(example.sourceStyle ?? "");
  return {
    ...example.options,
    ...(preset ? { preset } : {}),
    ...(source ? { source } : {}),
  } as ConversionOptions;
}

const THUCYDIDES =
  "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων.";

const DOXOLOGY = "ϗ νῦν ϗ ἀεὶ ϗ εἰς τοὺς αἰῶνας τῶν αἰώνων";
const NOMINA_SACRA = "ἐν τῷ ὀνόματι τοῦ κ̅υ̅ ι̅υ̅ χ̅υ̅";
const BYZANTINE_DATE = "ἔτους ͵ϛφιϛʹ, ἰνδικτιῶνος ιεʹ";

const greek = (
  title: string,
  note: string,
  text: string,
  output: string,
  to: Format = "transliteration",
): Example => ({ title, note, text, from: "greek", to, output });

/**
 * The examples offered with each standard, and without one (`""`): each
 * shows a rule of that standard, drawn from its conformance corpus where
 * there is one (`docs/ala-lc-conformance-corpus.md`,
 * `docs/preset-conformance-corpus.md`).
 */
export const EXAMPLES: Readonly<Record<Preset | "", readonly Example[]>> = {
  "": [
    greek(
      "Thucydides 1.1",
      "Opening of the History, every accent and breathing kept",
      THUCYDIDES,
      "Héllēsin egéneto kaì mérei tinì tō̃n barbárōn, hōs dè eipeĩn kaì epì pleĩston anthrṓpōn.",
    ),
    {
      title: "Iliad 1.1",
      note: "The first line, from Beta Code to Greek",
      text: "*mh=nin a)/eide qea\\ *phlhi+a/dew *)axilh=os",
      from: "beta-code",
      to: "greek",
      output: "Μῆνιν ἄειδε θεὰ Πηληϊάδεω Ἀχιλῆος",
      sourceBound: true,
    },
    {
      title: "Plato, Apology 17a",
      note: "The opening words, from transliteration back to Greek",
      text: "Hóti mèn humeĩs, ō̃ ándres Athēnaĩoi",
      from: "transliteration",
      to: "greek",
      output: "Ὅτι μὲν ὑμεῖς, ὦ ἄνδρες Ἀθηναῖοι",
      sourceBound: true,
    },
    {
      title: "Modern Greek phrase",
      note: "Polytonic accents reduced to monotonic",
      text: "Ποῦ εἶσαι; Ἢ ἐδῶ ἢ ἐκεῖ, καὶ ὄχι ἀλλοῦ.",
      from: "greek",
      to: "greek",
      options: { greek: { accentuation: "monotonic" } },
      output: "Πού είσαι; Ή εδώ ή εκεί, και όχι αλλού.",
    },
    {
      title: "Single word",
      note: "From Beta Code, with the final sigma chosen for you",
      text: "lo/gos",
      from: "beta-code",
      to: "greek",
      output: "λόγος",
      sourceBound: true,
    },
    greek("Archaic letter", "Digamma, written w", "ϝάναξ", "wánax"),
    greek(
      "Letter forms",
      "Lunate sigma kept as s3; Beta Code has no ϐ or ϑ",
      "ϲῶμα ϐίος ϑεός",
      "s3w=ma bi/os qeo/s",
      "beta-code",
    ),
    {
      title: "Uncial style",
      note: "Capitals, lunate sigma, iota on the line, no other mark",
      text: "τῷ λόγῳ ἐστὶν ἀγαθός",
      from: "greek",
      to: "greek",
      options: {
        text: { letterCase: "uppercase" },
        diacritics: { all: "remove", iotaSubscript: "preserve" },
        greek: { sigma: "lunate", iotaSubscript: "adscript" },
      },
      output: "ΤΩΙ ΛΟΓΩΙ ΕϹΤΙΝ ΑΓΑΘΟϹ",
    },
    {
      title: "Doxology",
      note: "The καί symbol ϗ written out, with the grave of the manuscripts",
      text: DOXOLOGY,
      from: "greek",
      to: "transliteration",
      options: { greek: { kaiAccent: "byzantine" } },
      output: "kaì nỹn kaì aeì kaì eis toùs aiō̃nas tō̃n aiṓnōn",
    },
    {
      title: "Mark 12.32",
      note: "ϗ, ȣ, and the stigma of στ written as letters",
      text: "ϗ ȣ̓κ ἔϛιν ἄλλος πλὴν αὐτȣ͂",
      from: "greek",
      to: "greek",
      options: {
        greek: {
          ligatures: "standard",
          stigma: "ligature",
          kaiAccent: "byzantine",
        },
      },
      output: "καὶ οὐκ ἔστιν ἄλλος πλὴν αὐτοῦ",
    },
    greek(
      "Nomina sacra",
      "Overlined contractions, as the TLG writes them",
      NOMINA_SACRA,
      "e)n tw=| o)no/mati tou= <ku> <iu> <xu>",
      "beta-code",
    ),
    {
      title: "Byzantine date",
      note: "Year of the world and indiction, as numbers",
      text: BYZANTINE_DATE,
      from: "greek",
      to: "transliteration",
      options: { text: { numerals: "decimal" } },
      output: "étous 6516, indiktiō̃nos 15",
    },
    greek(
      "Imperial title",
      "A breathing printed before the capital, as older editions do",
      "βασιλεὺς ῾Ρωμαίων",
      "basileùs Rhōmaíōn",
    ),
    {
      title: "Elision",
      note: "Before the apostrophe, σ stays medial",
      text: "e)/xous' e)gw/",
      from: "beta-code",
      to: "greek",
      output: "ἔχουσ’ ἐγώ",
    },
    {
      title: "Restyle a word",
      note: "Read in the default style, ph is written f",
      text: "phílos",
      from: "transliteration",
      to: "transliteration",
      options: { transliteration: { phi: "f" } },
      sourceStyle: "defaults",
      output: "fílos",
    },
    greek(
      "Word with a diphthong",
      "A breathing on a diphthong comes first: hui",
      "υἱός",
      "huiós",
    ),
    greek(
      "Proper name",
      "The circumflex written as a tilde",
      "Ἰησοῦς",
      "Iēsoũs",
    ),
  ],
  "ala-lc-ancient": [
    greek(
      "Thucydides 1.1",
      "Accents and breathings dropped, long vowels marked",
      THUCYDIDES,
      "Hellēsin egeneto kai merei tini tōn barbarōn, hōs de eipein kai epi pleiston anthrōpōn.",
    ),
    greek("Word with double gamma", "γγ is romanized ng", "ἄγγελος", "angelos"),
    greek(
      "Word with initial rho",
      "Rough breathing on rho gives rh; η and ω take a macron",
      "ῥήτωρ",
      "rhētōr",
    ),
    greek(
      "Proper name",
      "A breathing on a capital becomes H",
      "Ὅμηρος",
      "Homēros",
    ),
    greek("Archaic letter", "Digamma is romanized w", "ϝάναξ", "wanax"),
    greek(
      "Byzantine date",
      "Numerals romanized as numbers",
      BYZANTINE_DATE,
      "etous 6516, indiktiōnos 15",
    ),
    {
      title: "Byzantine names",
      note: "Length marks left out, as the Oxford Dictionary of Byzantium does",
      text: "Ἀλέξιος Κομνηνός, Νικήτας Χωνιάτης",
      from: "greek",
      to: "transliteration",
      options: { transliteration: { longVowels: "omit" } },
      output: "Alexios Komnenos, Niketas Choniates",
    },
  ],
  "ala-lc-modern": [
    greek(
      "Book title",
      "Zorba the Greek: β becomes v, accents dropped",
      "Βίος και πολιτεία του Αλέξη Ζορμπά",
      "Vios kai politeia tou Alexē Zormpa",
    ),
    greek(
      "Word with initial μπ",
      "μπ at the start is romanized b",
      "μπάλα",
      "bala",
    ),
    greek(
      "Word with initial ντ",
      "ντ at the start is romanized d̲",
      "ντομάτα",
      "d̲omata",
    ),
    greek(
      "Place name",
      "Rh only where the breathing is written",
      "Ῥόδος",
      "Rhodos",
    ),
    {
      title: "Restyle from the default style",
      note: "Read as the library writes it by default, b becomes v",
      text: "tōn barbarōn",
      from: "transliteration",
      to: "transliteration",
      sourceStyle: "defaults",
      output: "tōn varvarōn",
    },
  ],
  "bnf-core": [
    greek(
      "Numerals and archaic letters",
      "Keraia, stigma, koppa, sampi, and digamma",
      "αʹ ιβʹ ͵αωκγʹ ϛʹ ϟʹ ϡʹ ϝάναξ",
      "á ib́ ,aōkǵ c̄́ q́ s̄́ wánax",
    ),
    greek(
      "Word with theta",
      "θ becomes th; accents kept",
      "Θάλασσα",
      "Thálassa",
    ),
    greek("Word with chi", "χ becomes ch", "Χαρά", "Chará"),
    greek(
      "Word with psi and eta",
      "ψ becomes ps, η becomes ē",
      "ψυχή",
      "psychḗ",
    ),
    greek(
      "Name with lunate sigmas",
      "The lunate sigma written c, which reads back",
      "Χριϲτόϲ",
      "Chrictóc",
    ),
  ],
  "iso-843-type-1": [
    greek(
      "Letters β, η, φ",
      "Romanized v, ī, f: the ISO main forms",
      "βηφ",
      "vīf",
    ),
    greek(
      "Article with a circumflex",
      "Perispomeni written as a circumflex",
      "τοῦ",
      "toû",
    ),
    greek("Word in capitals", "Capitals stay capitals", "ΘΑΛΑΣΣΑ", "THALASSA"),
  ],
  "iso-843-type-2": [
    greek(
      "Place name",
      "ευ before a voiced sound becomes ev",
      "Εύβοια",
      "Évvoia",
    ),
    greek(
      "Word with ευ and a circumflex",
      "The accent moves to the vowel before v",
      "δεῦρο",
      "dêvro",
    ),
    greek("Word in capitals", "η and ω become i and o", "ΕΥΡΩΠΗ", "EVROPI"),
  ],
  perseus: [
    greek(
      "Common noun",
      "Lowercase Beta Code, breathing and accent after the letter",
      "ἄνθρωπος",
      "a)/nqrwpos",
      "beta-code",
    ),
    greek(
      "Proper name",
      "A capital: an asterisk, then its marks",
      "Ἀθηναῖοι",
      "*)aqhnai=oi",
      "beta-code",
    ),
    greek(
      "Word with iota subscript",
      "The subscript written as a vertical bar",
      "ᾠδή",
      "w)|dh/",
      "beta-code",
    ),
  ],
  "sbl-general": [
    greek(
      "Word with initial rho",
      "No accent; η and ω keep their macron",
      "ῥήτωρ",
      "rhētōr",
    ),
    greek("Common noun", "ψ becomes ps, χ becomes ch", "ψυχή", "psychē"),
    greek(
      "Proper name",
      "Only the letters and vowel length",
      "Ἰησοῦς",
      "Iēsous",
    ),
  ],
  "tlg-core": [
    greek(
      "Thucydides 1.1",
      "The opening of the History, every mark kept",
      THUCYDIDES,
      "*(/ELLHSIN E)GE/NETO KAI\\ ME/REI TINI\\ TW=N BARBA/RWN, W(S DE\\ EI)PEI=N KAI\\ E)PI\\ PLEI=STON A)NQRW/PWN.",
      "beta-code",
    ),
    greek(
      "Common noun",
      "Breathings and accents follow the letter",
      "ἄνθρωπος",
      "A)/NQRWPOS",
      "beta-code",
    ),
    greek(
      "Place name",
      "A capital: an asterisk, then its marks",
      "Ῥόδος",
      "*(RO/DOS",
      "beta-code",
    ),
    greek(
      "Word with iota subscript",
      "The subscript written as a vertical bar",
      "ᾠδή",
      "W)|DH/",
      "beta-code",
    ),
    greek(
      "Word with a medial sigma at its end",
      "The shape kept with the TLG code s1",
      "λόγοσ",
      "LO/GOS1",
      "beta-code",
    ),
    greek(
      "Nomina sacra",
      "The overline written between < and >",
      NOMINA_SACRA,
      "E)N TW=| O)NO/MATI TOU= <KU> <IU> <XU>",
      "beta-code",
    ),
    greek(
      "Doxology",
      "The καί symbol ϗ written with its TLG code",
      DOXOLOGY,
      "#1532 NU=N #1532 A)EI\\ #1532 EI)S TOU\\S AI)W=NAS TW=N AI)W/NWN",
      "beta-code",
    ),
  ],
};

/**
 * The example written in another source format, or `undefined` when it
 * cannot be: when that format is the example's target, when its note names
 * its own source format, or when the text,
 * written in that format, no longer gives under the standard the output the
 * note describes.
 */
export function exampleFrom(
  example: Example,
  from: Format,
  preset: Preset | "",
): Example | undefined {
  if (from === example.from) return example;
  if (from === example.to || example.sourceBound || example.sourceStyle) {
    return undefined;
  }
  const options = exampleOptions(example, preset);
  try {
    // Written with the library defaults, the text keeps every mark that the
    // standard may drop: the conversion shows it doing so.
    const text = convert(example.text, example.from, from);
    if (convert(text, from, example.to, options) !== example.output) {
      return undefined;
    }
    return { ...example, text, from };
  } catch {
    return undefined;
  }
}

/**
 * A text with marks the reader keeps but Greek does not allow, which
 * `validateDocument()` reports: `codes` lists them in order, checked by
 * `tests/playground_examples_test.ts`. Such marks are hard to type in Greek,
 * where they take combining characters.
 */
export interface MarksExample {
  title: string;
  note: string;
  text: string;
  from: Format;
  codes: readonly ValidationCode[];
}

const MARKS_NOTE =
  "A circumflex on a short vowel, an accent on a consonant, two accents, a diaeresis with a breathing";

/** One text per format with marks Greek does not allow. */
export const INVALID_MARKS: readonly MarksExample[] = [
  {
    title: "Invalid marks in Greek",
    note: `${MARKS_NOTE}, an iota subscript under epsilon`,
    text: "λε\u0342γε β\u0301ίβλος ὰ\u0301μα ἐνε\u0345 ϊ\u0313ον",
    from: "greek",
    codes: [
      "invalid-circumflex",
      "invalid-accent",
      "conflicting-accents",
      "invalid-iota-subscript",
      "incompatible-diaeresis-breathing",
    ],
  },
  {
    title: "Invalid marks in Beta Code",
    note: `${MARKS_NOTE}, an iota subscript under epsilon`,
    text: "le=ge b/ibloj a\\/ma e)ne| i+)on",
    from: "beta-code",
    codes: [
      "invalid-circumflex",
      "invalid-accent",
      "conflicting-accents",
      "invalid-iota-subscript",
      "incompatible-diaeresis-breathing",
    ],
  },
  {
    title: "Invalid marks in transliteration",
    note: MARKS_NOTE,
    text: "le\u0303ge b\u0301íblos a\u0301\u0300ma i\u0308\u0313on",
    from: "transliteration",
    codes: [
      "invalid-circumflex",
      "invalid-accent",
      "conflicting-accents",
      "incompatible-diaeresis-breathing",
    ],
  },
];
