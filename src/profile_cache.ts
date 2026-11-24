/**
 * Values derived from a profile, kept from one conversion to the next.
 *
 * A writer computes from its profile what does not depend on the text: the
 * marks it keeps, the strings of a set of marks. For a word, that is a large
 * part of the conversion. The profiles that the library resolves once and
 * shares (`conversionProfiles()`) or that prepared options hold
 * (`makePrepared()`) are frozen whole, and sealed here: what is derived
 * from one of them is computed once and kept for as long as the profile
 * lives. Any other options are derived again at each call, since an object
 * that is not frozen whole may answer otherwise the next time, unless the
 * value depends on a key read from the options (`perKey()`): then it is
 * kept by key as well.
 *
 * Internal: not exported by an entry point.
 */
import type {
  ConversionOptions,
  ResolvedConversionOptions,
} from "./options.ts";

/** The profiles frozen whole by the library. */
const SEALED = new WeakSet<object>();

/**
 * Freezes `profile` and its groups, and seals it: values derived from it may
 * be kept. The caller passes an object that nothing else holds.
 */
export function sealProfile(
  profile: ResolvedConversionOptions,
): ResolvedConversionOptions {
  for (const group of Object.values(profile)) Object.freeze(group);
  SEALED.add(Object.freeze(profile));
  return profile;
}

/**
 * A function that derives a value from options with `compute`, once for each
 * sealed profile, and at each call for other options. `compute` reads
 * nothing but the options; what it returns is shared by every conversion
 * with the profile, and must not be changed by them, but for a cache that
 * they fill with values derived from the profile alone.
 */
export function perProfile<T>(
  compute: (options: ConversionOptions) => T,
): (options: ConversionOptions) => T {
  const values = new WeakMap<object, T>();
  return (options) => {
    if (!SEALED.has(options)) return compute(options);
    let value = values.get(options);
    if (value === undefined) {
      value = compute(options);
      values.set(options, value);
    }
    return value;
  };
}

/**
 * A function like {@link perProfile}, for a value that depends only on a key
 * that `keyOf` reads from the options: the value is also kept for each key,
 * so that options that are not sealed, resolved anew at each conversion,
 * find the value derived for the same key by an earlier one, and sealed
 * profiles with the same key share it. `keyOf` must cover every option the
 * value depends on: what `build` reads, and, for a cache that callers fill,
 * what they read to fill it (`latinMarkStrings()`, in `encode.ts`). It must
 * give few keys: they are kept for as long as the process runs.
 */
export function perKey<T>(
  keyOf: (options: ConversionOptions) => string,
  build: (options: ConversionOptions) => T,
): (options: ConversionOptions) => T {
  const byKey = new Map<string, T>();
  return perProfile((options) => {
    const key = keyOf(options);
    let value = byKey.get(key);
    if (value === undefined) {
      value = build(options);
      byKey.set(key, value);
    }
    return value;
  });
}
