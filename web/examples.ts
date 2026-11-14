import type { ConversionOptions, Format, Preset } from "../src/mod.ts";

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
}

const THUCYDIDES =
  "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων.";

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
    },
    {
      title: "Plato, Apology 17a",
      note: "The opening words, from transliteration back to Greek",
      text: "Hóti mèn humeĩs, ō̃ ándres Athēnaĩoi",
      from: "transliteration",
      to: "greek",
      output: "Ὅτι μὲν ὑμεῖς, ὦ ἄνδρες Ἀθηναῖοι",
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
      output: "λόγος",
    },
    greek("Archaic letter", "Digamma, written w", "ϝάναξ", "wánax"),
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
  "sbl-academic": [
    greek(
      "Word with initial rho",
      "Accents kept; η and ω take a macron",
      "ῥήτωρ",
      "rhḗtōr",
    ),
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
  "sbl-general": [
    greek(
      "Word with initial rho",
      "No accents; long vowels keep their macron",
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
  ],
};
