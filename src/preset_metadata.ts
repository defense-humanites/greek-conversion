/**
 * The descriptive metadata of the bundled presets: name, authority, scope,
 * coverage, references, and limitations. It is kept apart from their
 * options, so that a conversion, which needs only the options, does not
 * bundle it.
 *
 * @module
 */
import type { Preset } from "./options.ts";
import { registeredOptions } from "./presets.ts";

/** Implementation status of a preset relative to its cited references. */
export type PresetCoverage = "complete" | "partial" | "adapted" | "planned";

/** Treatment of recognized content outside a preset's cited scope. */
export type PresetOutOfScopeBehavior =
  | "engine-default"
  | "preserve"
  | "reject";

/** One normative or explanatory source associated with a preset. */
export interface PresetReference {
  /** Human-readable source title. */
  title: string;
  /** Stable source location when one is publicly available. */
  url: string;
}

/** Descriptive information about one bundled conversion preset. */
export interface PresetMetadata {
  /** Stable identifier accepted by {@link ConversionOptions.preset}. */
  id: Preset;
  /** Human-readable preset name. */
  name: string;
  /** Institution or organization responsible for the cited convention. */
  authority: string;
  /** Concise account of the preset's purpose. */
  description: string;
  /** Historical or linguistic domains to which the reference applies. */
  scope: readonly string[];
  /** Relationship between this implementation and the cited reference. */
  coverage: PresetCoverage;
  /** Treatment of recognized content outside the cited reference's scope. */
  outOfScopeBehavior: PresetOutOfScopeBehavior;
  /** Normative or explanatory sources used to define the preset. */
  references: readonly PresetReference[];
  /** Known deviations, unsupported rules, and interpretation cautions. */
  limitations: readonly string[];
}

const PRESET_METADATA = {
  "ala-lc-ancient": {
    id: "ala-lc-ancient",
    name: "ALA-LC — Ancient and Medieval Greek",
    authority: "American Library Association and Library of Congress",
    description:
      "Romanization profile for Ancient and Medieval Greek before 1454.",
    scope: ["Ancient Greek", "Medieval Greek before 1454"],
    coverage: "partial",
    outOfScopeBehavior: "engine-default",
    references: [{
      title: "ALA-LC Romanization Tables: Greek (Ancient and Medieval)",
      url: "https://www.loc.gov/catdir/cpso/romanization/greeka.pdf",
    }],
    limitations: [
      "Missing rough breathings are not inferred from lexical knowledge or capitalization.",
      "An iota adscript written after a marked capital (Ἅιδῃ) is kept as a letter rather than omitted as the table prescribes.",
      "Omitted diaeresis is recoverable only in the deterministic contextual y/u cases implemented by the parser.",
      "Stigma, modern koppa, and sampi are documented only as marked numerals; their unmarked engine defaults are outside the ALA-LC table.",
      "Yot is not part of the cited ALA-LC inventory.",
    ],
  },
  "ala-lc-modern": {
    id: "ala-lc-modern",
    name: "ALA-LC — Modern Greek",
    authority: "American Library Association and Library of Congress",
    description: "Romanization profile for Modern Greek after 1453.",
    scope: ["Modern Greek after 1453"],
    coverage: "partial",
    outOfScopeBehavior: "engine-default",
    references: [{
      title: "ALA-LC Romanization Tables: Greek (Modern)",
      url: "https://www.loc.gov/catdir/cpso/romanization/greekm.pdf",
    }],
    limitations: [
      "Missing rough breathings are not inferred from lexical knowledge or capitalization.",
      "An iota adscript written after a marked capital (Ἅιδῃ) is kept as a letter rather than omitted as the table prescribes.",
      "Only the documented contextual mu-pi, nu-tau, and gamma-kappa rules are implemented.",
      "Digamma, stigma, both koppa forms, and sampi are documented only as marked numerals; their unmarked engine defaults are outside the ALA-LC table.",
      "Yot is not part of the cited ALA-LC inventory.",
    ],
  },
  "bnf-core": {
    id: "bnf-core",
    name: "BnF — Ancient Greek core",
    authority: "Bibliothèque nationale de France",
    description:
      "Core mechanically expressible profile for the BnF adaptation of ISO 843 for Ancient Greek.",
    scope: ["Ancient Greek", "French library cataloguing"],
    coverage: "partial",
    outOfScopeBehavior: "engine-default",
    references: [{
      title: "Translittération du grec — Kitcat BnF",
      url:
        "https://kitcat.bnf.fr/consignes-catalogage/translitteration-du-grec",
    }],
    limitations: [
      "Context-dependent access-point variants such as kappa → c and chi → kh are not selected automatically.",
      "BnF keraiai are rendered as a comma and acute in transliteration. The acute reads back as the keraia after a consonant, and the comma before c̄ or s̄, but after a vowel the acute reads back as an accent; with the accents removed, the right keraia is written ʹ.",
      "Upper Cypriot syndyazomeno shares U+0306 with the ordinary breve and cannot be distinguished mechanically; lower syndyazomeno is not interpreted as a semantic mark.",
      "The Iliad/Odyssey numeral exception is not selected without the relevant cataloguing context.",
      "An iota adscript written after a marked capital (Ἅιδῃ) is kept as a letter rather than omitted as the table prescribes.",
      "The BnF circumflex and smooth breathing marks and omission of explicit quantity marks apply only to transliteration; missing breathings are never inferred from Greek source text.",
      "Both documented koppa forms collapse to q in BnF transliteration and therefore cannot be distinguished on reverse conversion.",
    ],
  },
  "iso-843-type-1": {
    id: "iso-843-type-1",
    name: "ISO 843:1997 — Type 1 (transliteration)",
    authority: "International Organization for Standardization",
    description:
      "Type 1 transliteration of Greek characters into Latin characters, also that of ELOT 743, the Greek national standard, since its 2001 edition.",
    scope: ["Ancient Greek", "Modern Greek"],
    coverage: "partial",
    outOfScopeBehavior: "engine-default",
    references: [{
      title: "ISO 843:1997",
      url:
        "https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf",
    }],
    limitations: [
      "The preset implements mechanically expressible Type 1 mappings, not every contextual provision of the standard.",
      "An apostrophe for initial smooth breathing can also represent punctuation; reverse parsing does not infer it as a distinct breathing mark.",
      "Note 2 reads a Latin s followed by a hyphen as medial sigma, for a word divided at the end of a line; the parser treats a hyphen as a word boundary and reads final sigma there.",
      "ISO 843 names stigma, koppa, and sampi in its Greek repertoire but does not assign them Type 1 conversions; bound converters preserve or reject them for transliteration, while ordinary preset use retains engine defaults.",
      "The standard's single named koppa cannot be identified unambiguously with the engine's separate archaic-koppa entry; bound transliteration reports this unresolved mapping.",
    ],
  },
  "iso-843-type-2": {
    id: "iso-843-type-2",
    name: "ISO 843:1997 — Type 2 (transcription)",
    authority: "International Organization for Standardization",
    description:
      "Type 2 transcription of Greek characters into Latin characters, favouring pronunciation over reversibility: the transcription of ELOT 743, the Greek national standard, for identity documents, road signs, and maps, which the United Nations and BGN/PCGN adopted for geographical names.",
    scope: ["Modern Greek", "Ancient Greek"],
    coverage: "partial",
    outOfScopeBehavior: "engine-default",
    references: [
      {
        title: "ISO 843:1997",
        url:
          "https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf",
      },
      {
        title:
          "BGN/PCGN, Romanization of Greek: ELOT 743 System, 1996 Agreement",
        url:
          "https://assets.publishing.service.gov.uk/media/5ab4df04e5274a1aa2d41460/ROMANIZATION_OF_GREEK.pdf",
      },
      {
        title:
          "UNGEGN, Report on the Current Status of United Nations Romanization Systems for Geographical Names: Greek",
        url:
          "https://unstats.un.org/unsd/ungegn/working_groups/wg5/documents/wgrr4greek.pdf",
      },
    ],
    limitations: [
      "A transcription is not reversible by design: the v and f of αυ, ευ, ηυ read back as beta and phi, i and o as iota and omicron, and b at the edge of a word as μπ; convertDetailed() reports these losses. An o without marks before a y without diaeresis reads back as omega: Table 2 does not list ωυ, which note 8 writes letter by letter, while ου is written ou, or oy with an accent or a diaeresis (note 9).",
      "Reading back is designed for the preset's own output: an e with a circumflex is read as εῦ before v or f, where Type 2 writes it, and otherwise as epsilon with a circumflex, which validateDocument() rejects.",
      "Notes 3 and 4 list the letters of the modern alphabet; before an archaic letter, the upsilon of αυ, ευ, ηυ follows that letter's sound (f before stigma, koppa, sampi; v before digamma and yot), and any non-letter after it counts as the end of the word.",
      "An apostrophe for initial smooth breathing can also represent punctuation; reverse parsing does not infer it as a distinct breathing mark.",
      "Note 2 reads a Latin s followed by a hyphen as medial sigma, for a word divided at the end of a line; the parser treats a hyphen as a word boundary and reads final sigma there.",
      "ISO 843 names stigma, koppa, and sampi in its Greek repertoire but does not assign them Type 2 conversions; bound converters preserve or reject them for transliteration, while ordinary preset use retains engine defaults.",
      "The standard's single named koppa cannot be identified unambiguously with the engine's separate archaic-koppa entry; bound transliteration reports this unresolved mapping.",
    ],
  },
  "perseus": {
    id: "perseus",
    name: "Perseus Beta Code — Core subset",
    authority: "Perseus Digital Library",
    description:
      "Lowercase-ASCII subset of TLG Beta Code used by the Perseus Digital Library project.",
    scope: ["Polytonic Greek", "Perseus and Morpheus interchange"],
    coverage: "complete",
    outOfScopeBehavior: "engine-default",
    references: [
      {
        title: "The Care and Feeding of Morpheus",
        url:
          "https://github.com/PerseusDL/morpheus/blob/master/doc/morpheus.html",
      },
      {
        title: "Perseids Tools Beta Code JSON mappings",
        url: "https://github.com/perseids-tools/beta-code-json",
      },
      {
        title: "TLG Beta Code Quick Reference Guide",
        url: "https://stephanus.tlg.uci.edu/encoding/quickbeta.pdf",
      },
    ],
    limitations: [
      "The Perseus subset covers letters, accents, breathings, diaeresis, and iota subscript; TLG markup escapes are outside its scope.",
      "The cited Perseids mapping contains the standard alphabet and lunate sigma, but none of the engine's six additional letter entries (digamma, yot, stigma, either koppa, or sampi).",
    ],
  },
  "sbl-general": {
    id: "sbl-general",
    name: "SBL — General-purpose style",
    authority: "Society of Biblical Literature",
    description:
      "The Greek transliteration of the SBL Handbook: η and ω with a macron, h for the rough breathing, and no accent, iota subscript, or diaeresis.",
    scope: ["Ancient Greek", "Biblical studies", "General readers"],
    coverage: "complete",
    outOfScopeBehavior: "engine-default",
    references: [{
      title: "The SBL Handbook of Style, second edition, §5.3 (Greek)",
      url: "https://archive.org/details/sblhandbookofsty0000unse_g7i4/",
    }],
    limitations: [
      "The Handbook gives one style for Greek, the general-purpose one: for academic readers, it asks for Greek characters.",
      "The Handbook makes no provision for the digamma or the other archaic letters, and asks for Greek characters where they matter: a converter bound to the preset keeps them in Greek, while convert() writes the engine's spellings.",
    ],
  },
  "tlg-core": {
    id: "tlg-core",
    name: "TLG Beta Code — Core subset",
    authority: "Thesaurus Linguae Graecae",
    description:
      "Canonical Beta Code together with the TLG characters implemented by the engine.",
    scope: ["Polytonic Greek", "Beta Code interchange"],
    coverage: "partial",
    outOfScopeBehavior: "engine-default",
    references: [{
      title: "TLG Beta Code Quick Reference Guide",
      url: "https://stephanus.tlg.uci.edu/encoding/quickbeta.pdf",
    }],
    limitations: [
      "The TLG character inventory contains more than one thousand assignments; only the Greek alphabet and the documented additional characters and punctuation are implemented.",
    ],
  },
} as const satisfies Record<Preset, PresetMetadata>;

/** Returns detached metadata for every bundled preset. */
export function listPresetMetadata(): readonly PresetMetadata[] {
  return Object.values(PRESET_METADATA).map((metadata) =>
    cloneMetadata(metadata)
  );
}

/**
 * Returns detached descriptive metadata for one bundled preset.
 *
 * @throws {RangeError} If the identifier is not registered at runtime.
 */
export function getPresetMetadata(preset: Preset): PresetMetadata {
  registeredOptions(preset);
  return cloneMetadata(PRESET_METADATA[preset]);
}

function cloneMetadata(metadata: PresetMetadata): PresetMetadata {
  return {
    ...metadata,
    scope: [...metadata.scope],
    references: metadata.references.map((reference) => ({ ...reference })),
    limitations: [...metadata.limitations],
  };
}
