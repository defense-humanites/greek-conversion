import {
  type ConversionOptions,
  DEFAULT_CONVERSION_OPTIONS,
  type DiacriticOptions,
  type Preset,
  type ResolvedConversionOptions,
} from "./options.ts";

/** Partial option fields contributed by one registered preset. */
export type PresetOptions = Omit<ConversionOptions, "preset">;

/** Implementation status of a preset relative to its cited references. */
export type PresetCoverage = "complete" | "partial" | "adapted" | "planned";

/** Treatment of recognized content outside a preset's cited scope. */
export type OutOfScopeBehavior =
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
  outOfScopeBehavior: OutOfScopeBehavior;
  /** Normative or explanatory sources used to define the preset. */
  references: readonly PresetReference[];
  /** Known deviations, unsupported rules, and interpretation cautions. */
  limitations: readonly string[];
}

interface PresetDefinition {
  metadata: PresetMetadata;
  options: PresetOptions;
}

const OMIT_NON_ROUGH_DIACRITICS = {
  accents: "remove",
  smoothBreathing: "remove",
  roughBreathing: "preserve",
  coronis: "remove",
  diaeresis: "remove",
  iotaSubscript: "remove",
  quantity: "remove",
} as const satisfies DiacriticOptions;

const PRESET_DEFINITIONS = {
  "ala-lc-ancient": {
    metadata: {
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
        url: "https://www.loc.gov/catdir/cpso/romanization/greek.pdf",
      }],
      limitations: [
        "Missing rough breathings are not inferred from lexical knowledge or capitalization.",
        "Iota adscript cannot be distinguished mechanically from an ordinary iota.",
        "Omitted diaeresis is recoverable only in the deterministic contextual y/u cases implemented by the parser.",
        "Stigma, modern koppa, and sampi are documented only as marked numerals; their unmarked engine defaults are outside the ALA-LC table.",
        "Yot is not part of the cited ALA-LC inventory.",
      ],
    },
    options: {
      diacritics: OMIT_NON_ROUGH_DIACRITICS,
      orthography: {
        numerals: "decimal",
        upsilon: "y-with-diphthong-u",
      },
    },
  },
  "ala-lc-modern": {
    metadata: {
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
        "Iota adscript cannot be distinguished mechanically from an ordinary iota.",
        "Only the documented contextual mu-pi, nu-tau, and gamma-kappa rules are implemented.",
        "Digamma, stigma, both koppa forms, and sampi are documented only as marked numerals; their unmarked engine defaults are outside the ALA-LC table.",
        "Yot is not part of the cited ALA-LC inventory.",
      ],
    },
    options: {
      diacritics: OMIT_NON_ROUGH_DIACRITICS,
      orthography: {
        beta: "v",
        modernDigraphs: "ala-lc",
        numerals: "decimal",
        upsilon: "y-with-diphthong-u",
      },
    },
  },
  "bnf-core": {
    metadata: {
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
        "The BnF au, eu, and ou exceptions cannot be expressed exactly by the engine's uniform upsilon policies.",
        "BnF-specific keraia transliteration, Cypriot syndyazomeno, and the Iliad/Odyssey numeral exception are not implemented.",
        "Iota adscript cannot be distinguished mechanically from an ordinary iota.",
        "The BnF circumflex scalar and omission of explicit macron and breve marks are not independently selectable.",
        "Both documented koppa forms collapse to q in BnF transliteration and therefore cannot be distinguished on reverse conversion.",
      ],
    },
    options: {
      orthography: {
        archaicKoppa: "q",
        coronis: "greek",
        lunateSigma: "c",
        upsilon: "y",
      },
      unicode: {
        questionMark: "greek",
      },
    },
  },
  "iso-843-type-1": {
    metadata: {
      id: "iso-843-type-1",
      name: "ISO 843:1997 — Type 1",
      authority: "International Organization for Standardization",
      description:
        "Type 1 transliteration of Greek characters into Latin characters.",
      scope: ["Ancient Greek", "Modern Greek"],
      coverage: "partial",
      outOfScopeBehavior: "engine-default",
      references: [{
        title: "ISO 843:1997",
        url:
          "https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf",
      }],
      limitations: [
        "The preset implements the mechanically expressible Type 1 letter choices, not every contextual provision of the standard.",
        "ISO 843 names stigma, koppa, and sampi in its Greek repertoire but does not assign them Type 1 conversions; engine defaults for those letters are not ISO-defined output.",
      ],
    },
    options: {
      orthography: {
        beta: "v",
        coronis: "apostrophe",
        eta: "ī",
        nasalGamma: "literal",
        phi: "f",
        upsilon: "y",
      },
    },
  },
  "perseus": {
    metadata: {
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
    options: {
      orthography: {
        betaCodeCase: "lowercase",
      },
    },
  },
  "sbl-academic": {
    metadata: {
      id: "sbl-academic",
      name: "SBL — Academic style",
      authority: "Society of Biblical Literature",
      description:
        "Academic transliteration retaining the engine's scientific diacritics.",
      scope: ["Ancient Greek", "Biblical studies"],
      coverage: "adapted",
      outOfScopeBehavior: "engine-default",
      references: [{
        title: "The SBL Handbook of Style, second edition",
        url: "https://archive.org/details/sblhandbookofsty0000unse_g7i4/",
      }],
      limitations: [
        "The SBL handbook defines one general-purpose Greek transliteration style; this academic profile is an engine adaptation and not a separate official SBL table.",
        "The cited Greek table does not provide conversions for the engine's additional archaic letters.",
      ],
    },
    options: {
      orthography: {
        upsilon: "y-with-diphthong-u",
      },
    },
  },
  "sbl-general": {
    metadata: {
      id: "sbl-general",
      name: "SBL — General-purpose style",
      authority: "Society of Biblical Literature",
      description:
        "Readable transliteration omitting most scholarly diacritics while retaining rough breathing and diaeresis.",
      scope: ["Ancient Greek", "Biblical studies", "General readers"],
      coverage: "adapted",
      outOfScopeBehavior: "engine-default",
      references: [{
        title: "The SBL Handbook of Style, second edition",
        url: "https://archive.org/details/sblhandbookofsty0000unse_g7i4/",
      }],
      limitations: [
        "The SBL handbook defines one general-purpose Greek transliteration style; the academic/general preset pair should not be read as two official SBL tables.",
        "The cited Greek table does not provide conversions for the engine's additional archaic letters.",
      ],
    },
    options: {
      diacritics: {
        accents: "remove",
        smoothBreathing: "remove",
        roughBreathing: "preserve",
        coronis: "remove",
        diaeresis: "preserve",
        iotaSubscript: "remove",
        quantity: "remove",
      },
      orthography: {
        upsilon: "y-with-diphthong-u",
      },
    },
  },
  "tlg-core": {
    metadata: {
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
    options: {
      orthography: {
        betaCodeCase: "uppercase",
        yotBetaCode: "#401",
      },
    },
  },
} as const satisfies Record<Preset, PresetDefinition>;

/** Returns detached metadata for every bundled preset. */
export function listPresetMetadata(): readonly PresetMetadata[] {
  return Object.values(PRESET_DEFINITIONS).map(({ metadata }) =>
    cloneMetadata(metadata)
  );
}

/**
 * Returns detached descriptive metadata for one bundled preset.
 *
 * @throws {RangeError} If the identifier is not registered at runtime.
 */
export function getPresetMetadata(preset: Preset): PresetMetadata {
  return cloneMetadata(registeredDefinition(preset).metadata);
}

/**
 * Returns a detached copy of one bundled preset configuration.
 *
 * @throws {RangeError} If the identifier is not registered at runtime.
 */
export function getPresetOptions(preset: Preset): PresetOptions {
  return mergeConversionOptions({}, registeredPreset(preset));
}

/**
 * Merges one preset with custom options and removes the preset marker.
 *
 * Custom fields override corresponding preset fields while unrelated preset
 * fields remain active. The returned object is detached from the registry.
 *
 * @throws {RangeError} If `options.preset` is not registered at runtime.
 */
export function resolveConversionOptions(
  options: ConversionOptions = {},
): ResolvedConversionOptions {
  const { preset, ...custom } = options;
  const base = preset === undefined ? {} : registeredPreset(preset);
  const merged = mergeConversionOptions(base, custom);

  return {
    orthography: {
      ...DEFAULT_CONVERSION_OPTIONS.orthography,
      ...merged.orthography,
    },
    unicode: {
      ...DEFAULT_CONVERSION_OPTIONS.unicode,
      ...merged.unicode,
    },
    diacritics: {
      ...DEFAULT_CONVERSION_OPTIONS.diacritics,
      ...merged.diacritics,
    },
    removeDiacritics: merged.removeDiacritics ??
      DEFAULT_CONVERSION_OPTIONS.removeDiacritics,
  };
}

function registeredPreset(preset: Preset): PresetOptions {
  return registeredDefinition(preset).options;
}

function registeredDefinition(preset: Preset): PresetDefinition {
  if (!Object.hasOwn(PRESET_DEFINITIONS, preset)) {
    throw new RangeError(`Unknown conversion preset: ${preset}`);
  }
  return PRESET_DEFINITIONS[preset];
}

function cloneMetadata(metadata: PresetMetadata): PresetMetadata {
  return {
    ...metadata,
    scope: [...metadata.scope],
    references: metadata.references.map((reference) => ({ ...reference })),
    limitations: [...metadata.limitations],
  };
}

function mergeConversionOptions(
  base: PresetOptions,
  overrides: PresetOptions,
): PresetOptions {
  const merged: PresetOptions = {};

  assignDefined(merged, base);
  assignDefined(merged, overrides);
  merged.orthography = mergeGroup(base.orthography, overrides.orthography);
  merged.unicode = mergeGroup(base.unicode, overrides.unicode);
  merged.diacritics = mergeGroup(base.diacritics, overrides.diacritics);

  if (merged.orthography === undefined) delete merged.orthography;
  if (merged.unicode === undefined) delete merged.unicode;
  if (merged.diacritics === undefined) delete merged.diacritics;

  return merged;
}

function assignDefined(
  target: PresetOptions,
  source: PresetOptions,
): void {
  if (source.removeDiacritics !== undefined) {
    target.removeDiacritics = source.removeDiacritics;
  }
}

function mergeGroup<T extends object>(
  base: T | undefined,
  overrides: T | undefined,
): T | undefined {
  if (base === undefined && overrides === undefined) return undefined;

  const definedOverrides = overrides === undefined ? {} : Object.fromEntries(
    Object.entries(overrides).filter(([, value]) => value !== undefined),
  );
  return { ...base, ...definedOverrides } as T;
}
