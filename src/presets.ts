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
import { hasPreparedMark, PREPARED } from "./prepared_mark.ts";
import { type PreparedOptions, preparedProfiles } from "./prepared.ts";
import { sealProfile } from "./profile_cache.ts";

/** Partial option fields contributed by one registered preset. */
export type PresetOptions = Omit<ConversionOptions, "preset" | "source">;

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

const PRESET_OPTIONS = {
  "ala-lc-ancient": {
    diacritics: OMIT_NON_ROUGH_DIACRITICS,
    transliteration: {
      upsilon: "y-with-diphthong-u",
    },
    text: {
      numerals: "decimal",
    },
  },
  "ala-lc-modern": {
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
  "bnf-core": {
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
  "iso-843-type-1": {
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
  "iso-843-type-2": {
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
  "perseus": {
    betaCode: {
      case: "lowercase",
    },
  },
  "sbl-general": {
    diacritics: {
      all: "remove",
      roughBreathing: "preserve",
    },
    transliteration: {
      upsilon: "y-with-diphthong-u",
    },
  },
  "tlg-core": {
    betaCode: {
      case: "uppercase",
      yot: "#401",
    },
  },
} as const satisfies Record<Preset, PresetOptions>;

/**
 * Returns a detached copy of one bundled preset configuration.
 *
 * A preset written with `diacritics.all` is returned with the shorthand
 * expanded into the eight classes, as `resolveConversionOptions()` reads it.
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
 * then checked for the two incompatible pairs of values: `longVowels:
 * "circumflex"` with `circumflexAccent: "circumflex"`, which would write the
 * length mark of eta and omega and the circumflex accent alike, and
 * `longVowels: "grave-circumflex"` without `diacritics.accents: "remove"`,
 * which would write the length mark of eta as the grave accent of epsilon. A
 * preset value counts, so `{ preset: "bnf-core", transliteration: {
 * longVowels: "circumflex" } }` is rejected too. The `source` profile is checked and
 * resolved as well, on its own, and left out of the result, which holds the
 * options that write the output. Prepared options give a copy of the options
 * they write with.
 *
 * @throws {OptionError} If `options.preset` is not registered at runtime, if
 * an option key or value is unknown, or if two values are incompatible. An
 * `OptionError` is a `RangeError`.
 * @throws {TypeError} If `options` or an option group has the wrong type.
 */
export function resolveConversionOptions(
  options: ConversionOptions | PreparedOptions = {},
): ResolvedConversionOptions {
  const prepared = preparedProfiles(options);
  return prepared === undefined
    ? resolveConversionProfiles(options as ConversionOptions).writing
    : copyProfile(prepared.writing);
}

/** A copy of resolved options that the caller may change. */
function copyProfile(
  profile: ResolvedConversionOptions,
): ResolvedConversionOptions {
  return {
    transliteration: { ...profile.transliteration },
    greek: { ...profile.greek },
    betaCode: { ...profile.betaCode },
    text: { ...profile.text },
    diacritics: { ...profile.diacritics },
  };
}

/**
 * The two profiles of a conversion: the options that write its output, and
 * those that read its input. The input is read with `options.source`,
 * resolved on its own, when it is given, and otherwise with the options that
 * write the output, which are then the same object. Both are validated.
 *
 * @throws {OptionError} As {@link resolveConversionOptions}, with the path of
 * an option of `source` starting with `source.`.
 * @throws {TypeError} If `options`, `source`, or an option group has the
 * wrong type.
 */
export function resolveConversionProfiles(
  options: ConversionOptions = {},
): { reading: ResolvedConversionOptions; writing: ResolvedConversionOptions } {
  validateConversionOptions(options, "");
  const writing = resolveProfile(options, "");
  const reading = options.source === undefined
    ? writing
    : resolveProfile(options.source, "source.");
  return { reading, writing };
}

/** The two profiles of a conversion. */
type Profiles = ReturnType<typeof resolveConversionProfiles>;

/**
 * The profiles of the options that conversions take most often, resolved
 * once: none, `{}`, `{ preset }`, and either with `source: {}` or
 * `source: { preset }`, by the key that `simpleOptionsKey()` gives. At most
 * one entry for each registered preset or none, read and written: options
 * that fail are never kept.
 */
const SIMPLE_PROFILES = new Map<string, Profiles>();

/**
 * The profiles of a conversion, as {@link resolveConversionProfiles}, for
 * the conversions of the library. The options of the forms that
 * `SIMPLE_PROFILES` holds are resolved once and shared, frozen; any other
 * is resolved at each call. `resolveConversionOptions()` and
 * `prepareOptions()` do not use it: the options they return are their own.
 *
 * Internal: not exported by an entry point.
 */
export function conversionProfiles(
  options: ConversionOptions | PreparedOptions = {},
): Profiles {
  // Prepared options hold their profiles, resolved once.
  const prepared = preparedProfiles(options);
  if (prepared !== undefined) return prepared;
  const key = simpleOptionsKey(options, true);
  if (key === undefined) {
    return resolveConversionProfiles(options as ConversionOptions);
  }
  let profiles = SIMPLE_PROFILES.get(key);
  if (profiles === undefined) {
    // Resolved from the key, not from the caller's object, which could
    // answer otherwise when read again: what is kept is what the key says.
    const { reading, writing } = resolveConversionProfiles(optionsOfKey(key));
    profiles = Object.freeze({
      reading: sealProfile(reading),
      writing: sealProfile(writing),
    });
    SIMPLE_PROFILES.set(key, profiles);
  }
  return profiles;
}

/**
 * A key for options of the forms that `SIMPLE_PROFILES` holds: a plain
 * object whose own properties are enumerable, with string keys, `preset`, a
 * registered name, and, where `withSource` allows it, `source`, an object of
 * the same form without a `source`. The key is the name, or `""` without a
 * preset, followed, with a `source`, by a space and the key of the source.
 * Registered names hold no space, and the empty name is none of them, so
 * that a key stands for one form of options only ({@link optionsOfKey}).
 * Each property is read once: an accessor, or a proxy, that answers
 * otherwise the next time has no effect on the key, and the profiles are
 * resolved from the key. `undefined` for options of any other form, which
 * are resolved at each call: a property that is not enumerable, which
 * `Object.keys()` would not list, a name that is not registered, a symbol
 * key (the copy of prepared options that spreading makes holds the symbol of
 * their mark, which validation refuses).
 */
function simpleOptionsKey(
  options: unknown,
  withSource: boolean,
): string | undefined {
  if (typeof options !== "object" || options === null) return undefined;
  const prototype = Object.getPrototypeOf(options);
  if (
    prototype !== Object.prototype && prototype !== null ||
    Object.getOwnPropertySymbols(options).length > 0
  ) return undefined;
  let preset = "";
  let source: string | undefined;
  for (const key of Object.getOwnPropertyNames(options)) {
    if (!Object.prototype.propertyIsEnumerable.call(options, key)) {
      return undefined;
    }
    const value: unknown = (options as Record<string, unknown>)[key];
    if (
      key === "preset" && typeof value === "string" &&
      Object.hasOwn(PRESET_OPTIONS, value)
    ) {
      preset = value;
    } else if (key === "source" && withSource) {
      source = simpleOptionsKey(value, false);
      if (source === undefined) return undefined;
    } else {
      return undefined;
    }
  }
  return source === undefined ? preset : `${preset} ${source}`;
}

/** The options that a key of {@link simpleOptionsKey} stands for. */
function optionsOfKey(key: string): ConversionOptions {
  const [preset, source] = key.split(" ");
  const options: ConversionOptions = preset === ""
    ? {}
    : { preset: preset as Preset };
  if (source === undefined) return options;
  return {
    ...options,
    source: source === "" ? {} : { preset: source as Preset },
  };
}

/** Resolves validated options, whose errors name their paths after `prefix`. */
function resolveProfile(
  options: ConversionOptions,
  prefix: string,
): ResolvedConversionOptions {
  const { preset, source: _source, ...custom } = options;
  const base = preset === undefined ? {} : registeredPreset(preset, prefix);
  const merged = mergeConversionOptions(base, custom);
  assertCompatibleOptions(merged, preset, custom, prefix);

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
 * Rejects `longVowels: "grave-circumflex"` unless accents are removed: `ὲ`
 * would be written `è`, which reads back as `η`. The message of the first
 * names the preset when one of its two values comes from it.
 */
function assertCompatibleOptions(
  merged: ExpandedOptions,
  preset: Preset | undefined,
  custom: PresetOptions,
  prefix: string,
): void {
  const transliteration = merged.transliteration;
  if (
    transliteration?.longVowels === "grave-circumflex" &&
    merged.diacritics?.accents !== "remove"
  ) {
    throw new OptionError(
      `${prefix}transliteration.longVowels "grave-circumflex" requires ` +
        `${prefix}diacritics.accents "remove": the length mark of eta ` +
        "would be written as the grave accent of epsilon.",
      {
        path: `${prefix}diacritics.accents`,
        received: merged.diacritics?.accents ?? "preserve",
        accepted: ["remove"],
      },
    );
  }
  if (
    transliteration?.longVowels !== "circumflex" ||
    transliteration.circumflexAccent !== "circumflex"
  ) return;
  const fromPreset = preset !== undefined &&
    (custom.transliteration?.longVowels !== "circumflex" ||
      custom.transliteration?.circumflexAccent !== "circumflex");
  throw new OptionError(
    `${prefix}transliteration.longVowels "circumflex" cannot be combined ` +
      `with ${prefix}transliteration.circumflexAccent "circumflex"` +
      (fromPreset ? ` (set by preset "${preset}")` : "") +
      ": the length mark and the accent would be written alike.",
    {
      path: `${prefix}transliteration.longVowels`,
      received: "circumflex",
      // `"grave-circumflex"` marks omega with the circumflex too.
      accepted: CONVERSION_OPTION_VALUES.transliteration.longVowels.filter((
        value,
      ) => value !== "circumflex" && value !== "grave-circumflex"),
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

/** The eight diacritic classes, in the order of the defaults. */
const DIACRITIC_CLASSES: readonly string[] = Object.keys(
  DEFAULT_CONVERSION_OPTIONS.diacritics,
);

/** Each preset's options with `diacritics.all` expanded, filled on first use. */
const EXPANDED_PRESETS = new Map<Preset, ExpandedOptions>();

/**
 * Presets removed before 1.0.0, with what to do instead, named in the error
 * for them.
 */
const REMOVED_PRESETS: Readonly<Record<string, string>> = {
  "sbl-academic":
    "the SBL Handbook defines no academic style for Greek; the defaults write what it wrote, so omit the preset",
};

/** Values renamed before 1.0.0, named in the error for the old value. */
const RENAMED_VALUES: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "transliteration.eta": { "e-macron": "e", "i-macron": "i" },
};

function registeredPreset(preset: Preset, prefix = ""): ExpandedOptions {
  const known = EXPANDED_PRESETS.get(preset);
  if (known !== undefined) return known;
  const expanded = mergeConversionOptions(
    {},
    registeredOptions(preset, prefix),
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
/** The keys of a profile, which `source` is. */
const PROFILE_KEYS: readonly string[] = ["preset", ...OPTION_GROUPS];
const TOP_LEVEL_KEYS: readonly string[] = [...PROFILE_KEYS, "source"];

/** The groups of `1.0.0-rc.5`, whose keys the error for them names. */
const REPLACED_GROUPS: ReadonlySet<string> = new Set([
  "orthography",
  "unicode",
]);

/**
 * Validates the options of a conversion (`prefix` empty), or its `source`
 * profile (`prefix` `"source."`), which cannot have a `source` of its own.
 */
function validateConversionOptions(options: unknown, prefix: string): void {
  if (
    options === null || typeof options !== "object" || Array.isArray(options)
  ) {
    throw new TypeError(
      `Expected ${
        prefix === "" ? "conversion" : prefix.slice(0, -1)
      } options to be an object, received ${typeName(options)}.`,
    );
  }
  // Prepared options, and the copies that spreading makes of them, hold no
  // key: they would read as no option at all (see `prepared_mark.ts`).
  if (hasPreparedMark(options)) {
    throw preparedOptionsError(
      options,
      `${prefix === "" ? "conversion" : prefix.slice(0, -1)} options`,
    );
  }
  const keys = prefix === "" ? TOP_LEVEL_KEYS : PROFILE_KEYS;
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue;
    if (keys.includes(key)) continue;
    if (
      REPLACED_GROUPS.has(key) && value !== null && typeof value === "object"
    ) {
      // The error is about the first key of the old group, which is what the
      // caller has to move: a key the group had is named with its new path.
      const inner = Object.keys(value as object);
      const first =
        inner.find((name) => Object.hasOwn(REPLACED_KEYS, `${key}.${name}`)) ??
          inner[0];
      throw unknownKey(first === undefined ? key : `${key}.${first}`, prefix);
    }
    throw unknownKey(key, prefix);
  }
  for (const group of OPTION_GROUPS) {
    const value = (options as Record<string, unknown>)[group];
    if (value === undefined) continue;
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError(
        `Expected ${prefix}${group} options to be an object, received ${
          typeName(value)
        }.`,
      );
    }
    if (hasPreparedMark(value)) {
      throw preparedOptionsError(value, `${prefix}${group} options`);
    }
    const table = CONVERSION_OPTION_VALUES[group] as Record<
      string,
      readonly string[]
    >;
    for (const [key, choice] of Object.entries(value)) {
      if (choice === undefined) continue;
      const accepted = Object.hasOwn(table, key) ? table[key] : undefined;
      if (accepted === undefined) {
        throw new OptionError(
          `Unknown conversion option: ${prefix}${group}.${key}`,
          {
            path: `${prefix}${group}.${key}`,
            received: undefined,
            accepted: Object.keys(table),
          },
        );
      }
      if (!accepted.includes(choice as string)) {
        const renames = RENAMED_VALUES[`${group}.${key}`];
        const renamed = typeof choice === "string" && renames !== undefined &&
            Object.hasOwn(renames, choice)
          ? renames[choice]
          : undefined;
        throw new OptionError(
          `Invalid value for ${prefix}${group}.${key}: ${
            JSON.stringify(choice)
          }; expected one of ${
            accepted.map((v) => JSON.stringify(v)).join(", ")
          }.${
            renamed === undefined
              ? ""
              : ` ${JSON.stringify(choice)} is now ${JSON.stringify(renamed)}.`
          }`,
          {
            path: `${prefix}${group}.${key}`,
            received: choice,
            accepted,
            ...(renamed === undefined ? {} : { replacement: renamed }),
          },
        );
      }
    }
  }
  const source = (options as ConversionOptions).source;
  if (prefix === "" && source !== undefined) {
    validateConversionOptions(source, "source.");
  }
}

/**
 * The error for prepared options, or a copy of them, given where `expected`
 * is: its `source`, a group, or the options or the configuration of a
 * converter (`refusal` says why these do not take them). It says what to
 * write instead: the name of the preset, which the mark holds, or the
 * options that were prepared.
 *
 * Internal: `converter.ts` refuses them too.
 */
export function preparedOptionsError(
  options: object,
  expected: string,
  refusal = "which stand for all the options of a conversion",
): TypeError {
  const preset = (options as { [PREPARED]?: unknown })[PREPARED];
  const instead = typeof preset === "string"
    ? `name the preset instead, as in { preset: ${JSON.stringify(preset)} }`
    : "give the options that were prepared instead";
  return new TypeError(
    Object.getPrototypeOf(options) === Object.prototype
      ? `Expected ${expected}, received a copy of prepared options, ` +
        `which holds none of them: ${instead}.`
      : `Expected ${expected}, received prepared options, ${refusal}: ` +
        `${instead}.`,
  );
}

function typeName(value: unknown): string {
  return value === null
    ? "null"
    : Array.isArray(value)
    ? "array"
    : typeof value;
}

/**
 * The error for a key outside the option groups: a top-level key, or a key
 * of a group that `1.0.0-rc.5` had. A key the earlier release knew is named
 * with its current path.
 */
function unknownKey(key: string, prefix: string): OptionError {
  const replaced = Object.hasOwn(REPLACED_KEYS, key)
    ? REPLACED_KEYS[key]
    : undefined;
  const path = prefix + key;
  // The keys of rc.5 were never accepted in `source`, which is newer: they
  // have no replacement there (docs/stability.md).
  const replacement = prefix === "" ? replaced : undefined;
  return new OptionError(
    `Unknown conversion option: ${path}${
      replacement === undefined ? "" : ` (${path} is now ${replacement})`
    }`,
    {
      path,
      received: undefined,
      accepted: prefix === "" ? TOP_LEVEL_KEYS : PROFILE_KEYS,
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

/**
 * The options of a bundled preset, or an `OptionError` that names the preset
 * if it was removed.
 *
 * Internal: not exported by the package entry points.
 */
export function registeredOptions(
  preset: Preset,
  prefix = "",
): PresetOptions {
  if (!Object.hasOwn(PRESET_OPTIONS, preset)) {
    const removed = Object.hasOwn(REMOVED_PRESETS, preset)
      ? REMOVED_PRESETS[preset]
      : undefined;
    // A preset imported from `./presets`, given for its name.
    const named = typeof preset === "object" && preset !== null &&
        hasPreparedMark(preset)
      ? (preset as { [PREPARED]?: unknown })[PREPARED]
      : undefined;
    throw new OptionError(
      `Unknown conversion preset${
        prefix === "" ? "" : ` for ${prefix}preset`
      }: ${
        named === undefined
          ? preset
          : `prepared options, which are not its name${
            typeof named === "string"
              ? `: name it instead, as in { preset: ${JSON.stringify(named)} }`
              : ""
          }`
      }${removed === undefined ? "" : ` (removed: ${removed})`}`,
      {
        path: `${prefix}preset`,
        received: preset,
        accepted: Object.keys(PRESET_OPTIONS),
      },
    );
  }
  return PRESET_OPTIONS[preset];
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
