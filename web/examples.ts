import type { ConversionOptions, Format, Preset } from "../src/mod.ts";

/**
 * A complete scenario: loading one sets the text, formats, and settings.
 * `note` says in a few words what the example shows; `output` is what the
 * conversion returns, checked by `tests/playground_examples_test.ts`, so
 * that a note never describes a result the library does not give.
 */
export interface Example {
  /** Shown instead of the text and its result, for a long text. */
  label?: string;
  text: string;
  from: Format;
  to: Format;
  options?: ConversionOptions;
  note: string;
  output: string;
}

const THUCYDIDES =
  "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων, ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων.";

const greek = (
  text: string,
  output: string,
  note: string,
  to: Format = "transliteration",
): Example => ({ text, from: "greek", to, note, output });

/**
 * The examples offered with each standard, and without one (`""`): each
 * shows a rule of that standard, drawn from its conformance corpus where
 * there is one (`docs/ala-lc-conformance-corpus.md`,
 * `docs/preset-conformance-corpus.md`).
 */
export const EXAMPLES: Readonly<Record<Preset | "", readonly Example[]>> = {
  "": [
    {
      label: "Thucydides 1.1",
      ...greek(
        THUCYDIDES,
        "Héllēsin egéneto kaì mérei tinì tō̃n barbárōn, hōs dè eipeĩn kaì epì pleĩston anthrṓpōn.",
        "Every accent and breathing kept",
      ),
    },
    {
      label: "Iliad 1.1",
      text: "*mh=nin a)/eide qea\\ *phlhi+a/dew *)axilh=os",
      from: "beta-code",
      to: "greek",
      note: "Beta Code to Greek",
      output: "Μῆνιν ἄειδε θεὰ Πηληϊάδεω Ἀχιλῆος",
    },
    {
      label: "Plato, Apology 17a",
      text: "Hóti mèn humeĩs, ō̃ ándres Athēnaĩoi",
      from: "transliteration",
      to: "greek",
      note: "Transliteration back to Greek",
      output: "Ὅτι μὲν ὑμεῖς, ὦ ἄνδρες Ἀθηναῖοι",
    },
    {
      label: "Monotonic Greek",
      text: "Ποῦ εἶσαι; Ἢ ἐδῶ ἢ ἐκεῖ, καὶ ὄχι ἀλλοῦ.",
      from: "greek",
      to: "greek",
      options: { greek: { accentuation: "monotonic" } },
      note: "Polytonic to monotonic",
      output: "Πού είσαι; Ή εδώ ή εκεί, και όχι αλλού.",
    },
    {
      text: "lo/gos",
      from: "beta-code",
      to: "greek",
      note: "Final sigma is chosen for you",
      output: "λόγος",
    },
    greek("ϝάναξ", "wánax", "Digamma becomes w"),
  ],
  "ala-lc-ancient": [
    {
      label: "Thucydides 1.1",
      ...greek(
        THUCYDIDES,
        "Hellēsin egeneto kai merei tini tōn barbarōn, hōs de eipein kai epi pleiston anthrōpōn.",
        "Accents and breathings go, macrons stay",
      ),
    },
    greek("ἄγγελος", "angelos", "γγ becomes ng"),
    greek("ῥήτωρ", "rhētōr", "Rough breathing on rho; η and ω take a macron"),
    greek("Ὅμηρος", "Homēros", "A breathing on a capital becomes H"),
    greek("ϝάναξ", "wanax", "Digamma becomes w"),
  ],
  "ala-lc-modern": [
    {
      label: "Zorba the Greek",
      ...greek(
        "Βίος και πολιτεία του Αλέξη Ζορμπά",
        "Vios kai politeia tou Alexē Zormpa",
        "β becomes v; accents go",
      ),
    },
    greek("μπάλα", "bala", "Initial μπ becomes b"),
    greek("ντομάτα", "d̲omata", "Initial ντ becomes d̲"),
    greek("Ῥόδος", "Rhodos", "Rh only where the breathing is written"),
  ],
  "bnf-core": [
    {
      label: "Numerals and archaic letters",
      ...greek(
        "αʹ ιβʹ ͵αωκγʹ ϛʹ ϟʹ ϡʹ ϝάναξ",
        "á ib́ ,aōkǵ c̄́ q́ s̄́ wánax",
        "Keraia, stigma, koppa, sampi, digamma",
      ),
    },
    greek("Θάλασσα", "Thálassa", "θ becomes th; accents kept"),
    greek("Χαρά", "Chará", "χ becomes ch"),
    greek("ψυχή", "psychḗ", "ψ becomes ps, η becomes ē"),
  ],
  "iso-843-type-1": [
    greek("βηφ", "vīf", "The ISO main forms of β, η, φ"),
    greek("τοῦ", "toû", "Perispomeni as a circumflex"),
    greek("ΘΑΛΑΣΣΑ", "THALASSA", "Capitals stay capitals"),
  ],
  "iso-843-type-2": [
    greek("Εύβοια", "Évvoia", "ευ becomes ev before a voiced sound"),
    greek("δεῦρο", "dêvro", "The accent moves to the vowel before v"),
    greek("ΕΥΡΩΠΗ", "EVROPI", "η and ω become i and o"),
  ],
  perseus: [
    greek("ἄνθρωπος", "a)/nqrwpos", "Lowercase Beta Code", "beta-code"),
    greek(
      "Ἀθηναῖοι",
      "*)aqhnai=oi",
      "Capitals: an asterisk, then the marks",
      "beta-code",
    ),
    greek("ᾠδή", "w)|dh/", "Iota subscript as a vertical bar", "beta-code"),
  ],
  "sbl-academic": [
    greek("ῥήτωρ", "rhḗtōr", "Accents kept; η and ω take a macron"),
    greek("υἱός", "huiós", "A breathing on a diphthong comes first"),
    greek("Ἰησοῦς", "Iēsoũs", "Circumflex as a tilde"),
  ],
  "sbl-general": [
    greek("ῥήτωρ", "rhētōr", "No accents; macrons stay"),
    greek("ψυχή", "psychē", "ψ becomes ps, χ becomes ch"),
    greek("Ἰησοῦς", "Iēsous", "Only the letters and their length"),
  ],
  "tlg-core": [
    {
      label: "Thucydides 1.1",
      ...greek(
        THUCYDIDES,
        "*(/ELLHSIN E)GE/NETO KAI\\ ME/REI TINI\\ TW=N BARBA/RWN, W(S DE\\ EI)PEI=N KAI\\ E)PI\\ PLEI=STON A)NQRW/PWN.",
        "A whole sentence, every mark kept",
        "beta-code",
      ),
    },
    greek(
      "ἄνθρωπος",
      "A)/NQRWPOS",
      "Breathings and accents follow the letter",
      "beta-code",
    ),
    greek(
      "Ῥόδος",
      "*(RO/DOS",
      "Capitals: an asterisk, then the marks",
      "beta-code",
    ),
    greek("ᾠδή", "W)|DH/", "Iota subscript as a vertical bar", "beta-code"),
  ],
};
