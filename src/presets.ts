import {
  CONVERSION_OPTION_VALUES,
  type ConversionOptions,
  DEFAULT_CONVERSION_OPTIONS,
  type DiacriticClassOptions,
  type DiacriticOptions,
  OptionError,
  type Preset,
  type ResolvedConversionOptions,
} from "./options.ts";
import { isGreekNumeralContext } from "./context.ts";
import type { Document, Format, Letter } from "./model.ts";

/** Partial option fields contributed by one registered preset. */
export type PresetOptions = Omit<ConversionOptions, "preset">;

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

interface PresetDefinition {
  metadata: PresetMetadata;
  options: PresetOptions;
}

const ADDITIONAL_LETTERS = new Set<Letter>([
  "digamma",
  "yot",
  "stigma",
  "koppa",
  "archaic-koppa",
  "sampi",
]);

const ALA_LC_NUMERAL_ONLY = new Set<Letter>([
  "digamma",
  "stigma",
  "koppa",
  "archaic-koppa",
  "sampi",
]);

const OMIT_NON_ROUGH_DIACRITICS = {
  all: "remove",
  roughBreathing: "preserve",
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
    options: {
      diacritics: OMIT_NON_ROUGH_DIACRITICS,
      transliteration: {
        upsilon: "y-with-diphthong-u",
      },
      text: {
        numerals: "decimal",
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
        "An iota adscript written after a marked capital (Ἅιδῃ) is kept as a letter rather than omitted as the table prescribes.",
        "Only the documented contextual mu-pi, nu-tau, and gamma-kappa rules are implemented.",
        "Digamma, stigma, both koppa forms, and sampi are documented only as marked numerals; their unmarked engine defaults are outside the ALA-LC table.",
        "Yot is not part of the cited ALA-LC inventory.",
      ],
    },
    options: {
      diacritics: OMIT_NON_ROUGH_DIACRITICS,
      transliteration: {
        beta: "v",
        muPi: "b-initial",
        nasalGamma: "nasal-medial-kappa",
        nuTau: "d-underline-initial",
        upsilon: "y-with-diphthong-u",
      },
      text: {
        numerals: "decimal",
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
        "BnF keraiai are rendered as a comma and acute in transliteration, but reverse conversion cannot always distinguish the resulting accent from a letter accent.",
        "Upper Cypriot syndyazomeno shares U+0306 with the ordinary breve and cannot be distinguished mechanically; lower syndyazomeno is not interpreted as a semantic mark.",
        "The Iliad/Odyssey numeral exception is not selected without the relevant cataloguing context.",
        "An iota adscript written after a marked capital (Ἅιδῃ) is kept as a letter rather than omitted as the table prescribes.",
        "The BnF circumflex and smooth breathing marks and omission of explicit quantity marks apply only to transliteration; missing breathings are never inferred from Greek source text.",
        "Both documented koppa forms collapse to q in BnF transliteration and therefore cannot be distinguished on reverse conversion.",
      ],
    },
    options: {
      transliteration: {
        archaicKoppa: "q",
        coronis: "greek",
        circumflexAccent: "circumflex",
        hyphen: "typographic",
        keraia: "bnf",
        lunateSigma: "c",
        quantity: "omit",
        smoothBreathing: "greek",
        upsilon: "y-with-au-eu-ou",
      },
      greek: {
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
        "The preset implements mechanically expressible Type 1 mappings, not every contextual provision of the standard.",
        "An apostrophe for initial smooth breathing can also represent punctuation; reverse parsing does not infer it as a distinct breathing mark.",
        "Note 2 reads a Latin s followed by a hyphen as medial sigma, for a word divided at the end of a line; the parser treats a hyphen as a word boundary and reads final sigma there.",
        "ISO 843 names stigma, koppa, and sampi in its Greek repertoire but does not assign them Type 1 conversions; bound converters preserve or reject them for transliteration, while ordinary preset use retains engine defaults.",
        "The standard's single named koppa cannot be identified unambiguously with the engine's separate archaic-koppa entry; bound transliteration reports this unresolved mapping.",
      ],
    },
    options: {
      transliteration: {
        beta: "v",
        circumflexAccent: "circumflex",
        coronis: "apostrophe",
        enotikon: "hyphen",
        eta: "i",
        nasalGamma: "literal",
        phi: "f",
        smoothBreathing: "apostrophe",
        upsilon: "y-with-au-eu-ou",
      },
    },
  },
  "iso-843-type-2": {
    metadata: {
      id: "iso-843-type-2",
      name: "ISO 843:1997 — Type 2",
      authority: "International Organization for Standardization",
      description:
        "Type 2 transcription of Greek characters into Latin characters, favouring pronunciation over reversibility (identity documents, road signs, maps).",
      scope: ["Modern Greek", "Ancient Greek"],
      coverage: "partial",
      outOfScopeBehavior: "engine-default",
      references: [{
        title: "ISO 843:1997",
        url:
          "https://cdn.standards.iteh.ai/samples/5215/ebfdc4425f834833a5fe07c44f2dca79/ISO-843-1997.pdf",
      }],
      limitations: [
        "A transcription is not reversible by design: the v and f of αυ, ευ, ηυ read back as beta and phi, i and o as iota and omicron, and b at the edge of a word as μπ; convertDetailed() reports these losses.",
        "Reading back is designed for the preset's own output: an e with a circumflex is read as εῦ before v or f, where Type 2 writes it, and otherwise as epsilon with a circumflex, which validateDocument() rejects.",
        "Notes 3 and 4 list the letters of the modern alphabet; before an archaic letter, the upsilon of αυ, ευ, ηυ follows that letter's sound (f before stigma, koppa, sampi; v before digamma and yot), and any non-letter after it counts as the end of the word.",
        "An apostrophe for initial smooth breathing can also represent punctuation; reverse parsing does not infer it as a distinct breathing mark.",
        "Note 2 reads a Latin s followed by a hyphen as medial sigma, for a word divided at the end of a line; the parser treats a hyphen as a word boundary and reads final sigma there.",
        "ISO 843 names stigma, koppa, and sampi in its Greek repertoire but does not assign them Type 2 conversions; bound converters preserve or reject them for transliteration, while ordinary preset use retains engine defaults.",
        "The standard's single named koppa cannot be identified unambiguously with the engine's separate archaic-koppa entry; bound transliteration reports this unresolved mapping.",
      ],
    },
    options: {
      transliteration: {
        beta: "v",
        circumflexAccent: "circumflex",
        coronis: "apostrophe",
        enotikon: "hyphen",
        eta: "i",
        longVowels: "omit",
        muPi: "b-initial-final",
        nasalGamma: "nasal-except-kappa",
        phi: "f",
        smoothBreathing: "apostrophe",
        upsilon: "y-with-ou-v-f",
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
      betaCode: {
        case: "lowercase",
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
      transliteration: {
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
        all: "remove",
        roughBreathing: "preserve",
        diaeresis: "preserve",
      },
      transliteration: {
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
      betaCode: {
        case: "uppercase",
        yot: "#401",
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
 * A preset written with `diacritics.all` is returned with the shorthand
 * expanded into the seven classes, as `resolveConversionOptions()` reads it.
 *
 * @throws {RangeError} If the identifier is not registered at runtime.
 */
export function getPresetOptions(preset: Preset): PresetOptions {
  return mergeConversionOptions(registeredPreset(preset), {});
}

/**
 * Merges one preset with custom options and removes the preset marker.
 *
 * Custom fields override corresponding preset fields while unrelated preset
 * fields remain active. The returned object is detached from the registry.
 *
 * Options are validated strictly: an unknown option key, an unknown option
 * value, or a value of the wrong type is rejected rather than ignored, so a
 * misspelled policy cannot silently fall back to the engine default. A field
 * set to `undefined` is treated as absent. `diacritics.all` is expanded where
 * it is written, in the preset or in the custom options, into the classes
 * not named alongside it, before the two are merged. The merged options are
 * then checked for the one incompatible pair of values: `longVowels:
 * "circumflex"` with `circumflexAccent: "circumflex"`, which would write the
 * length mark of eta and omega and the circumflex accent alike. A preset
 * value counts, so `{ preset: "bnf-core", transliteration: { longVowels:
 * "circumflex" } }` is rejected too.
 *
 * @throws {OptionError} If `options.preset` is not registered at runtime, if
 * an option key or value is unknown, or if two values are incompatible. An
 * `OptionError` is a `RangeError`.
 * @throws {TypeError} If `options` or an option group has the wrong type.
 */
export function resolveConversionOptions(
  options: ConversionOptions = {},
): ResolvedConversionOptions {
  validateConversionOptions(options);
  const { preset, ...custom } = options;
  const base = preset === undefined ? {} : registeredPreset(preset);
  const merged = mergeConversionOptions(base, custom);
  assertCompatibleOptions(merged, preset, custom);

  return {
    transliteration: {
      ...DEFAULT_CONVERSION_OPTIONS.transliteration,
      ...merged.transliteration,
    },
    greek: {
      ...DEFAULT_CONVERSION_OPTIONS.greek,
      ...merged.greek,
    },
    betaCode: {
      ...DEFAULT_CONVERSION_OPTIONS.betaCode,
      ...merged.betaCode,
    },
    text: {
      ...DEFAULT_CONVERSION_OPTIONS.text,
      ...merged.text,
    },
    diacritics: {
      ...DEFAULT_CONVERSION_OPTIONS.diacritics,
      ...merged.diacritics,
    },
  };
}

/**
 * Rejects `longVowels: "circumflex"` with `circumflexAccent: "circumflex"`:
 * `ῆ` would be written `ê̂`, which reads back as `η` without its accent.
 * The message names the preset when one of the two values comes from it.
 */
function assertCompatibleOptions(
  merged: ExpandedOptions,
  preset: Preset | undefined,
  custom: PresetOptions,
): void {
  const transliteration = merged.transliteration;
  if (
    transliteration?.longVowels !== "circumflex" ||
    transliteration.circumflexAccent !== "circumflex"
  ) return;
  const fromPreset = preset !== undefined &&
    (custom.transliteration?.longVowels !== "circumflex" ||
      custom.transliteration?.circumflexAccent !== "circumflex");
  throw new OptionError(
    'transliteration.longVowels "circumflex" cannot be combined with ' +
      'transliteration.circumflexAccent "circumflex"' +
      (fromPreset ? ` (set by preset "${preset}")` : "") +
      ": the length mark and the accent would be written alike.",
    {
      path: "transliteration.longVowels",
      received: "circumflex",
      accepted: CONVERSION_OPTION_VALUES.transliteration.longVowels.filter((
        value,
      ) => value !== "circumflex"),
    },
  );
}

/** The current path of each option `1.0.0-rc.5` knew under another key. */
const REPLACED_KEYS: Readonly<Record<string, string>> = {
  removeDiacritics: "diacritics.all",
  "orthography.modernDigraphs":
    "transliteration.muPi, transliteration.nuTau, and transliteration.nasalGamma",
  "orthography.betaCodeCase": "betaCode.case",
  "orthography.betaCodeYot": "betaCode.yot",
  ...Object.fromEntries(
    Object.keys(CONVERSION_OPTION_VALUES.transliteration).map((
      key,
    ) => [`orthography.${key}`, `transliteration.${key}`]),
  ),
  ...Object.fromEntries(
    [
      "sigma",
      "finalSigma",
      "medialBeta",
      "doubleRho",
      "dentalSigma",
      "accentuation",
    ].map((key) => [`orthography.${key}`, `greek.${key}`]),
  ),
  ...Object.fromEntries(
    Object.keys(CONVERSION_OPTION_VALUES.text).map((
      key,
    ) => [`orthography.${key}`, `text.${key}`]),
  ),
  ...Object.fromEntries(
    ["composition", "acute", "questionMark", "anoTeleia"].map((
      key,
    ) => [`unicode.${key}`, `greek.${key}`]),
  ),
};

/** Options whose `diacritics.all` has been expanded into the classes. */
type ExpandedOptions = Omit<PresetOptions, "diacritics"> & {
  diacritics?: DiacriticClassOptions;
};

/** The seven diacritic classes, in the order of the defaults. */
const DIACRITIC_CLASSES: readonly string[] = Object.keys(
  DEFAULT_CONVERSION_OPTIONS.diacritics,
);

/** Each preset's options with `diacritics.all` expanded, filled on first use. */
const EXPANDED_PRESETS = new Map<Preset, ExpandedOptions>();

/** Values renamed before 1.0.0, named in the error for the old value. */
const RENAMED_VALUES: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "transliteration.eta": { "e-macron": "e", "i-macron": "i" },
};

function registeredPreset(preset: Preset): ExpandedOptions {
  const known = EXPANDED_PRESETS.get(preset);
  if (known !== undefined) return known;
  const expanded = mergeConversionOptions(
    {},
    registeredDefinition(preset).options,
  );
  EXPANDED_PRESETS.set(preset, expanded);
  return expanded;
}

const OPTION_GROUPS = [
  "transliteration",
  "greek",
  "betaCode",
  "text",
  "diacritics",
] as const;
const TOP_LEVEL_KEYS: readonly string[] = ["preset", ...OPTION_GROUPS];

/** The groups of `1.0.0-rc.5`, whose keys the error for them names. */
const REPLACED_GROUPS: ReadonlySet<string> = new Set([
  "orthography",
  "unicode",
]);

function validateConversionOptions(options: unknown): void {
  if (
    options === null || typeof options !== "object" || Array.isArray(options)
  ) {
    throw new TypeError(
      `Expected conversion options to be an object, received ${
        options === null
          ? "null"
          : Array.isArray(options)
          ? "array"
          : typeof options
      }.`,
    );
  }
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue;
    if (TOP_LEVEL_KEYS.includes(key)) continue;
    if (
      REPLACED_GROUPS.has(key) && value !== null && typeof value === "object"
    ) {
      // The error is about the first key of the old group, which is what the
      // caller has to move: a key the group had is named with its new path.
      const inner = Object.keys(value as object);
      const first = inner.find((name) =>
        Object.hasOwn(REPLACED_KEYS, `${key}.${name}`)
      ) ?? inner[0];
      throw unknownKey(first === undefined ? key : `${key}.${first}`);
    }
    throw unknownKey(key);
  }
  for (const group of OPTION_GROUPS) {
    const value = (options as Record<string, unknown>)[group];
    if (value === undefined) continue;
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(
        `Expected ${group} options to be an object, received ${
          value === null
            ? "null"
            : Array.isArray(value)
            ? "array"
            : typeof value
        }.`,
      );
    }
    const table = CONVERSION_OPTION_VALUES[group] as Record<
      string,
      readonly string[]
    >;
    for (const [key, choice] of Object.entries(value)) {
      if (choice === undefined) continue;
      const accepted = Object.hasOwn(table, key) ? table[key] : undefined;
      if (accepted === undefined) {
        throw new OptionError(`Unknown conversion option: ${group}.${key}`, {
          path: `${group}.${key}`,
          received: undefined,
          accepted: Object.keys(table),
        });
      }
      if (!accepted.includes(choice as string)) {
        const renames = RENAMED_VALUES[`${group}.${key}`];
        const renamed = typeof choice === "string" && renames !== undefined &&
            Object.hasOwn(renames, choice)
          ? renames[choice]
          : undefined;
        throw new OptionError(
          `Invalid value for ${group}.${key}: ${
            JSON.stringify(choice)
          }; expected one of ${
            accepted.map((v) => JSON.stringify(v)).join(", ")
          }.${
            renamed === undefined
              ? ""
              : ` ${JSON.stringify(choice)} is now ${JSON.stringify(renamed)}.`
          }`,
          {
            path: `${group}.${key}`,
            received: choice,
            accepted,
            ...(renamed === undefined ? {} : { replacement: renamed }),
          },
        );
      }
    }
  }
}

/**
 * The error for a key outside the option groups: a top-level key, or a key
 * of a group that `1.0.0-rc.5` had. A key the earlier release knew is named
 * with its current path.
 */
function unknownKey(path: string): OptionError {
  const replacement = Object.hasOwn(REPLACED_KEYS, path)
    ? REPLACED_KEYS[path]
    : undefined;
  return new OptionError(
    `Unknown conversion option: ${path}${
      replacement === undefined ? "" : ` (${path} is now ${replacement})`
    }`,
    {
      path,
      received: undefined,
      accepted: TOP_LEVEL_KEYS,
      ...(replacement === undefined ? {} : { replacement }),
    },
  );
}

/**
 * Expands `diacritics.all` into the classes not named alongside it, so that
 * the shorthand applies at the level where it is written. A class set to
 * `undefined` is absent: it does not cancel the shorthand.
 */
function expandDiacritics(
  diacritics: DiacriticOptions | undefined,
): DiacriticClassOptions | undefined {
  if (diacritics === undefined) return undefined;
  const all = diacritics.all;
  // Without the shorthand, the classes are the group itself; the merge
  // copies them and leaves out `all` with the other undefined fields.
  if (all === undefined) return diacritics;
  const classes = diacritics as Record<string, unknown>;
  const expanded: Record<string, unknown> = {};
  for (const key of DIACRITIC_CLASSES) {
    const value = classes[key];
    expanded[key] = value === undefined ? all : value;
  }
  return expanded as DiacriticClassOptions;
}

/** Returns whether one character occurrence is inside a bound preset's scope. */
export function isCharacterInPresetScope(
  preset: Preset,
  character: string,
  document: Document,
  index: number,
): boolean {
  if (!ADDITIONAL_LETTERS.has(character as Letter)) return true;

  const letter = character as Letter;
  switch (preset) {
    case "ala-lc-ancient":
      if (letter === "digamma" || letter === "archaic-koppa") return true;
      return ALA_LC_NUMERAL_ONLY.has(letter) &&
        isGreekNumeralContext(document, index);
    case "ala-lc-modern":
      return ALA_LC_NUMERAL_ONLY.has(letter) &&
        isGreekNumeralContext(document, index);
    case "perseus":
    case "sbl-academic":
    case "sbl-general":
      return false;
    case "bnf-core":
    case "iso-843-type-1":
    case "iso-843-type-2":
    case "tlg-core":
      return true;
  }
}

/** A recognized ISO source character without an established Type 1 or 2 mapping. */
export function presetMappingIssue(
  preset: Preset,
  character: Letter,
  document: Document,
  index: number,
  target: Format,
  options: ResolvedConversionOptions,
): "undefined-preset-mapping" | "unresolved-preset-mapping" | undefined {
  if (
    (preset !== "iso-843-type-1" && preset !== "iso-843-type-2") ||
    target !== "transliteration"
  ) {
    return undefined;
  }
  // ISO's separate numeral table permits decimal indexing when requested.
  if (
    options.text.numerals === "decimal" &&
    isGreekNumeralContext(document, index)
  ) return undefined;

  if (character === "archaic-koppa") return "unresolved-preset-mapping";
  if (
    character === "stigma" || character === "koppa" || character === "sampi"
  ) return "undefined-preset-mapping";
  return undefined;
}

function registeredDefinition(preset: Preset): PresetDefinition {
  if (!Object.hasOwn(PRESET_DEFINITIONS, preset)) {
    throw new OptionError(`Unknown conversion preset: ${preset}`, {
      path: "preset",
      received: preset,
      accepted: Object.keys(PRESET_DEFINITIONS),
    });
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

/**
 * Merges two levels of options group by group, into new objects. The base
 * (a preset) is already expanded; `diacritics.all` of the overrides is
 * expanded at its own level first, so that the shorthand of one level
 * overrides the classes of the other.
 */
function mergeConversionOptions(
  base: ExpandedOptions,
  overrides: PresetOptions,
): ExpandedOptions {
  const merged: ExpandedOptions = {};
  const transliteration = mergeGroup(
    base.transliteration,
    overrides.transliteration,
  );
  if (transliteration !== undefined) merged.transliteration = transliteration;
  const greek = mergeGroup(base.greek, overrides.greek);
  if (greek !== undefined) merged.greek = greek;
  const betaCode = mergeGroup(base.betaCode, overrides.betaCode);
  if (betaCode !== undefined) merged.betaCode = betaCode;
  const text = mergeGroup(base.text, overrides.text);
  if (text !== undefined) merged.text = text;
  const diacritics = mergeGroup(
    base.diacritics,
    expandDiacritics(overrides.diacritics),
  );
  if (diacritics !== undefined) merged.diacritics = diacritics;
  return merged;
}

/** A copy of the base with the defined fields of the overrides on top. */
function mergeGroup<T extends object>(
  base: T | undefined,
  overrides: T | undefined,
): T | undefined {
  if (base === undefined && overrides === undefined) return undefined;

  const merged: Record<string, unknown> = { ...base };
  if (overrides !== undefined) {
    for (const key of Object.keys(overrides)) {
      const value = (overrides as Record<string, unknown>)[key];
      if (value !== undefined) merged[key] = value;
    }
  }
  return merged as T;
}
