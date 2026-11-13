import {
  CONVERSION_OPTION_VALUES,
  resolveConversionOptions,
} from "../src/mod.ts";
import type { ConversionOptions, Format, Preset } from "../src/mod.ts";

/** A field of `ConversionOptions` that holds options. */
export type OptionGroup = Exclude<keyof ConversionOptions, "preset">;

/** One conversion option, as the playground offers it. */
export interface OptionEntry {
  group: OptionGroup;
  key: string;
  /** A name for people: "Long vowels", not `longVowels`. */
  label: string;
  values: readonly string[];
}

/** One option set to one value. */
export interface OptionSetting {
  group: OptionGroup;
  key: string;
  value: string;
}

export const GROUP_NAMES: Readonly<Record<OptionGroup, string>> = {
  transliteration: "Transliteration",
  greek: "Greek",
  betaCode: "Beta Code",
  text: "Text",
  diacritics: "Diacritics",
};

/** Names that the key alone does not give well. */
const LABELS: Readonly<Record<string, string>> = {
  "transliteration.muPi": "Mu pi",
  "transliteration.nuTau": "Nu tau",
  "greek.questionMark": "Question mark",
  "greek.anoTeleia": "Ano teleia",
  "betaCode.case": "Beta Code case",
  "diacritics.all": "All diacritics",
};

/** `longVowels` gives "Long vowels". */
function humanize(key: string): string {
  const words = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Every option, in the order of the library's table. */
export const OPTION_ENTRIES: readonly OptionEntry[] = Object.entries(
  CONVERSION_OPTION_VALUES,
).flatMap(([group, table]) =>
  Object.entries(table as Record<string, readonly string[]>).map((
    [key, values],
  ) => ({
    group: group as OptionGroup,
    key,
    label: LABELS[`${group}.${key}`] ?? humanize(key),
    values,
  }))
);

/** Whether another group has an option of the same name. */
export function isAmbiguous(entry: OptionEntry): boolean {
  return OPTION_ENTRIES.some((other) =>
    other.label === entry.label && other.group !== entry.group
  );
}

export function findEntry(
  group: string,
  key: string,
): OptionEntry | undefined {
  return OPTION_ENTRIES.find((entry) =>
    entry.group === group && entry.key === key
  );
}

/**
 * The groups that act on a conversion: the transliteration options where
 * transliteration is read or written, the Greek options where Greek is
 * written, directly or through Beta Code, the Beta Code options where Beta
 * Code is written; the text and the diacritics in every case.
 */
export function relevantGroups(
  from: Format,
  to: Format,
): ReadonlySet<OptionGroup> {
  const groups = new Set<OptionGroup>(["text", "diacritics"]);
  if (from === "transliteration" || to === "transliteration") {
    groups.add("transliteration");
  }
  if (to === "greek" || to === "beta-code") groups.add("greek");
  if (to === "beta-code") groups.add("betaCode");
  return groups;
}

/** The options set in `options`, in the order of `OPTION_ENTRIES`. */
export function settingsOf(options: ConversionOptions): OptionSetting[] {
  return OPTION_ENTRIES.flatMap(({ group, key }) => {
    const value = (options[group] as Record<string, unknown> | undefined)
      ?.[key];
    return typeof value === "string" ? [{ group, key, value }] : [];
  });
}

/** `options` with one option set, or removed when `value` is undefined. */
export function withSetting(
  options: ConversionOptions,
  group: OptionGroup,
  key: string,
  value: string | undefined,
): ConversionOptions {
  const fields = { ...(options[group] as Record<string, string> | undefined) };
  if (value === undefined) delete fields[key];
  else fields[key] = value;
  const next: ConversionOptions = { ...options };
  if (Object.keys(fields).length) {
    (next as Record<string, unknown>)[group] = fields;
  } else {
    delete next[group];
  }
  return next;
}

/** Keeps the known options of a parsed value and drops anything else. */
export function knownOptions(value: unknown): ConversionOptions {
  let options: ConversionOptions = {};
  if (typeof value !== "object" || value === null) return options;
  for (const { group, key, values } of OPTION_ENTRIES) {
    const field = (value as Record<string, unknown>)[group];
    const setting = typeof field === "object" && field !== null
      ? (field as Record<string, unknown>)[key]
      : undefined;
    if (typeof setting === "string" && values.includes(setting)) {
      options = withSetting(options, group, key, setting);
    }
  }
  return options;
}

/** Whether two sets of options set the same values. */
export function sameOptions(
  a: ConversionOptions,
  b: ConversionOptions,
): boolean {
  const key = (options: ConversionOptions) =>
    JSON.stringify(settingsOf(options));
  return key(a) === key(b);
}

/**
 * The value a standard, or the library's defaults, gives an option, when
 * the resolved options carry it; `diacritics.all` is only an input.
 */
export function standardValue(
  preset: Preset | "",
  group: OptionGroup,
  key: string,
): string | undefined {
  const resolved = resolveConversionOptions(preset ? { preset } : {});
  const value = (resolved[group] as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

/** Entries whose label, key, or group contains `query`, ignoring case. */
export function matchEntries(
  entries: readonly OptionEntry[],
  query: string,
): OptionEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...entries];
  return entries.filter(({ group, key, label }) =>
    [label, key, GROUP_NAMES[group]].some((text) =>
      text.toLowerCase().includes(needle)
    )
  );
}
