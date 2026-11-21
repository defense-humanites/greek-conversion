/**
 * Prepared options: options checked and resolved once, for the functions of
 * the `./core` entry point, which take no other.
 *
 * Internal: the entry points export the type, `prepareOptions()` and the
 * presets made with it.
 */
import type { ResolvedConversionOptions } from "./options.ts";

/**
 * Conversion options already checked and resolved, for the functions of the
 * `./core` entry point: a preset imported from `./presets`, or what
 * `prepareOptions()` returns. The type has no member to use, and an object
 * of another shape is not one: the core functions do not validate options,
 * so that a bundle that does not prepare any leaves the validation out.
 */
export declare class PreparedOptions {
  // The brand that makes the type nominal, declared only.
  // oxlint-disable-next-line no-unused-private-class-members
  #prepared: true;
  /** Prepared options are imported from `./presets` or prepared, not made. */
  private constructor();
}

/** The two profiles of a conversion: what reads the input, what writes. */
export interface Profiles {
  readonly reading: ResolvedConversionOptions;
  readonly writing: ResolvedConversionOptions;
}

/**
 * The runtime class of prepared options, which the type above, declared
 * only, describes from outside. Its fields are private: the options cannot
 * be read or changed once prepared, and an object built by hand is not
 * prepared.
 */
class Prepared {
  readonly #profiles: Profiles;

  constructor(profiles: Profiles) {
    this.#profiles = profiles;
  }

  static profilesOf(value: unknown): Profiles | undefined {
    return typeof value === "object" && value !== null && #profiles in value
      ? value.#profiles
      : undefined;
  }
}

/**
 * Prepared options that write with `writing` and read with `reading`, by
 * default the same options. The objects are kept as they are: the caller
 * passes objects that nothing else holds.
 */
export function makePrepared(
  writing: ResolvedConversionOptions,
  reading: ResolvedConversionOptions = writing,
): PreparedOptions {
  return new Prepared({ reading, writing }) as unknown as PreparedOptions;
}

/** The profiles of prepared options, or `undefined` for any other value. */
export function preparedProfiles(value: unknown): Profiles | undefined {
  return Prepared.profilesOf(value);
}
