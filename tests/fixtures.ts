import type { ConversionOptions, Format } from "../src/mod.ts";

export interface Equivalence {
  greek: string;
  betaCode: string;
  transliteration: string;
}

export const EQUIVALENCES = [
  { greek: "ἄνθρωπος", betaCode: "a)/nqrwpos", transliteration: "ánthrōpos" },
  { greek: "Ἄϊδα", betaCode: "*)/ai+da", transliteration: "Áïda" },
  { greek: "Ῥόδος", betaCode: "*(ro/dos", transliteration: "Rhódos" },
  { greek: "αἴσθησις", betaCode: "ai)/sqhsis", transliteration: "aísthēsis" },
  { greek: "αἵρεσις", betaCode: "ai(/resis", transliteration: "haíresis" },
  { greek: "εὕρηκα", betaCode: "eu(/rhka", transliteration: "heúrēka" },
  { greek: "οὗτος", betaCode: "ou(=tos", transliteration: "hoũtos" },
  { greek: "ἄϋλος", betaCode: "a)/u+los", transliteration: "áÿlos" },
  { greek: "ὑΐδιον", betaCode: "u(i+/dion", transliteration: "hyḯdion" },
  {
    greek: "πολύρριζος",
    betaCode: "polu/rrizos",
    transliteration: "polýrrhizos",
  },
  { greek: "ῥήτωρ", betaCode: "r(h/twr", transliteration: "rhḗtōr" },
  { greek: "ἄγγελος", betaCode: "a)/ggelos", transliteration: "ángelos" },
  { greek: "ἀγκών", betaCode: "a)gkw/n", transliteration: "ankṓn" },
  { greek: "σάλπιγξ", betaCode: "sa/lpigc", transliteration: "sálpinx" },
  { greek: "ἔλεγχος", betaCode: "e)/legxos", transliteration: "élenchos" },
  { greek: "ποιῇ", betaCode: "poih=|", transliteration: "poiȩ̄̃" },
  { greek: "ΠΟΙῌ͂", betaCode: "*p*o*i*=h|", transliteration: "POIȨ̄̃" },
  { greek: "Αἶα", betaCode: "*ai)=a", transliteration: "Aĩa" },
  { greek: "Ἠώς", betaCode: "*)hw/s", transliteration: "Ēṓs" },
  {
    greek: "ἀφ’, ἀλλ’.",
    betaCode: "a)f', a)ll'.",
    transliteration: "aph’, all’.",
  },
  {
    greek: "Φίληβος ἢ Περὶ ἡδονῆς",
    betaCode: "*fi/lhbos h)\\ *peri\\ h(donh=s",
    transliteration: "Phílēbos ḕ Perì hēdonē̃s",
  },
  {
    greek: "Ἕλλησιν ἐγένετο καὶ μέρει τινὶ τῶν βαρβάρων,",
    betaCode: "*(/ellhsin e)ge/neto kai\\ me/rei tini\\ tw=n barba/rwn,",
    transliteration: "Héllēsin egéneto kaì mérei tinì tō̃n barbárōn,",
  },
  {
    greek: "ὡς δὲ εἰπεῖν καὶ ἐπὶ πλεῖστον ἀνθρώπων.",
    betaCode: "w(s de\\ ei)pei=n kai\\ e)pi\\ plei=ston a)nqrw/pwn.",
    transliteration: "hōs dè eipeĩn kaì epì pleĩston anthrṓpōn.",
  },
  // Homer, Iliad 1.1.
  {
    greek: "Μῆνιν ἄειδε, θεά, Πηληϊάδεω Ἀχιλῆος",
    betaCode: "*mh=nin a)/eide, qea/, *phlhi+a/dew *)axilh=os",
    transliteration: "Mē̃nin áeide, theá, Pēlēïádeō Achilē̃os",
  },
  // Plato, Apology 17a.
  {
    greek:
      "Ὅτι μὲν ὑμεῖς, ὦ ἄνδρες Ἀθηναῖοι, πεπόνθατε ὑπὸ τῶν ἐμῶν κατηγόρων, οὐκ οἶδα·",
    betaCode:
      "*(/oti me\\n u(mei=s, w)= a)/ndres *)aqhnai=oi, pepo/nqate u(po\\ tw=n e)mw=n kathgo/rwn, ou)k oi)=da:",
    transliteration:
      "Hóti mèn hymeĩs, ō̃ ándres Athēnaĩoi, pepónthate hypò tō̃n emō̃n katēgórōn, ouk oĩda;",
  },
  // John 1:1.
  {
    greek: "Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν.",
    betaCode:
      "*)en a)rxh=| h)=n o( lo/gos, kai\\ o( lo/gos h)=n pro\\s to\\n qeo/n.",
    transliteration: "En archȩ̄̃ ē̃n ho lógos, kaì ho lógos ē̃n pròs tòn theón.",
  },
  // Sappho, fragment 31.1.
  {
    greek: "Φαίνεταί μοι κῆνος ἴσος θέοισιν",
    betaCode: "*fai/netai/ moi kh=nos i)/sos qe/oisin",
    transliteration: "Phaínetaí moi kē̃nos ísos théoisin",
  },
] as const satisfies readonly Equivalence[];

export const ACCEPTED_ALIASES = [
  { format: "greek", input: "βάρϐαρος", transliteration: "bárbaros" },
  { format: "greek", input: "ϲοϲ", transliteration: "sos" },
  { format: "beta-code", input: "S3oS3", transliteration: "sos" },
  { format: "greek", input: "πολύῤῥιζος", transliteration: "polýrrhizos" },
  {
    format: "beta-code",
    input: "polu/r)r(izos",
    transliteration: "polýrrhizos",
  },
] as const satisfies readonly {
  format: Format;
  input: string;
  transliteration: string;
}[];

export interface LossyConversion {
  name: string;
  sourceFormat: Format;
  intermediateFormat: Format;
  source: string;
  intermediate: string;
  canonicalRoundTrip: string;
  options?: ConversionOptions;
}

const DENTAL_SIGMA_ASSIMILATION = {
  greek: { dentalSigma: "assimilate" },
} as const satisfies ConversionOptions;

const DECIMAL_NUMERALS = {
  text: { numerals: "decimal" },
} as const satisfies ConversionOptions;

const VISIBLE_CORONIS = {
  transliteration: { coronis: "apostrophe" },
} as const satisfies ConversionOptions;

const MONOTONIC_GREEK = {
  greek: { accentuation: "monotonic" },
} as const satisfies ConversionOptions;

export const LOSSY_CONVERSIONS = [
  {
    name: "marked Greek double rho becomes canonical unmarked Greek",
    sourceFormat: "greek",
    intermediateFormat: "transliteration",
    source: "πολύῤῥιζος",
    intermediate: "polýrrhizos",
    canonicalRoundTrip: "πολύρριζος",
  },
  {
    name: "marked Beta Code double rho becomes canonical unmarked Beta Code",
    sourceFormat: "beta-code",
    intermediateFormat: "transliteration",
    source: "polu/r)r(izos",
    intermediate: "polýrrhizos",
    canonicalRoundTrip: "polu/rrizos",
  },
  {
    name: "medial coronis is not represented in transliteration",
    sourceFormat: "greek",
    intermediateFormat: "transliteration",
    source: "κἀγώ",
    intermediate: "kagṓ",
    canonicalRoundTrip: "καγώ",
  },
  {
    name:
      "crasis is preserved but its coronis is not represented in transliteration",
    sourceFormat: "greek",
    intermediateFormat: "transliteration",
    source: "τοὔνομα",
    intermediate: "toúnoma",
    canonicalRoundTrip: "τούνομα",
  },
  {
    name: "a visible transliterated coronis is display-only punctuation",
    sourceFormat: "greek",
    intermediateFormat: "transliteration",
    source: "κἀγώ",
    intermediate: "ka’gṓ",
    canonicalRoundTrip: "κα’γώ",
    options: VISIBLE_CORONIS,
  },
  {
    name:
      "a smooth breathing on a quantity-marked vowel is not represented in transliteration",
    sourceFormat: "greek",
    intermediateFormat: "transliteration",
    source: "ἀ̄",
    intermediate: "ā",
    canonicalRoundTrip: "ᾱ",
  },
  {
    name: "nu before a velar converges to canonical nasal gamma",
    sourceFormat: "greek",
    intermediateFormat: "transliteration",
    source: "νγ",
    intermediate: "ng",
    canonicalRoundTrip: "γγ",
  },
  {
    name: "tau-sigma loses the dental through canonical Greek",
    sourceFormat: "beta-code",
    intermediateFormat: "greek",
    source: "ats a",
    intermediate: "ας α",
    canonicalRoundTrip: "as a",
    options: DENTAL_SIGMA_ASSIMILATION,
  },
  {
    name: "delta-sigma loses the dental through canonical Greek",
    sourceFormat: "beta-code",
    intermediateFormat: "greek",
    source: "ads a",
    intermediate: "ας α",
    canonicalRoundTrip: "as a",
    options: DENTAL_SIGMA_ASSIMILATION,
  },
  {
    name: "theta-sigma loses the dental through canonical Greek",
    sourceFormat: "beta-code",
    intermediateFormat: "greek",
    source: "aqs a",
    intermediate: "ας α",
    canonicalRoundTrip: "as a",
    options: DENTAL_SIGMA_ASSIMILATION,
  },
  {
    name: "an elided smooth mute is aspirated before a rough breathing",
    sourceFormat: "transliteration",
    intermediateFormat: "greek",
    source: "ap’ hēmō̃n",
    intermediate: "ἀφ’ ἡμῶν",
    canonicalRoundTrip: "aph’ hēmō̃n",
  },
  {
    name: "diacritic removal cannot reconstruct accents or breathings",
    sourceFormat: "greek",
    intermediateFormat: "transliteration",
    source: "ἄνθρωπος",
    intermediate: "anthrōpos",
    canonicalRoundTrip: "ἀνθρωπος",
    options: { diacritics: { all: "remove" } },
  },
  {
    name: "decimal numerals cannot reconstruct alphabetic notation",
    sourceFormat: "greek",
    intermediateFormat: "beta-code",
    source: "͵βκγʹ",
    intermediate: "2023",
    canonicalRoundTrip: "2023",
    options: DECIMAL_NUMERALS,
  },
  {
    name: "monotonic Greek cannot reconstruct polytonic marks",
    sourceFormat: "greek",
    intermediateFormat: "greek",
    source: "ἄρα ἀλλὰ πᾶσα ᾠδῇ ῑτέα ϊδέα καὶ",
    intermediate: "άρα αλλά πάσα ωδή ιτέα ϊδέα και",
    canonicalRoundTrip: "άρα αλλά πάσα ωδή ιτέα ϊδέα και",
    options: MONOTONIC_GREEK,
  },
] as const satisfies readonly LossyConversion[];

export const SMOOTH_ROUGH_DOUBLE_RHO = {
  greek: { doubleRho: "smooth-rough" },
} as const satisfies ConversionOptions;

export const MEDIAL_BETA_SYMBOL = {
  greek: { medialBeta: "symbol" },
} as const satisfies ConversionOptions;

export const FORMATS = ["greek", "beta-code", "transliteration"] as const;

export function valueFor(equivalence: Equivalence, format: Format): string {
  switch (format) {
    case "greek":
      return equivalence.greek;
    case "beta-code":
      return equivalence.betaCode;
    case "transliteration":
      return equivalence.transliteration;
  }
}
