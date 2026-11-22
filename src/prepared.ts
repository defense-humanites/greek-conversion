/**
 * Prepared options: options checked and resolved once, for the functions of
 * the `./core` entry point, which take no other.
 *
 * Internal: the entry points export the type, `prepareOptions()` and the
 * presets made with it.
 */
import type { ResolvedConversionOptions } from "./options.ts";
import { PREPARED } from "./prepared_mark.ts";

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

/** What the library passes to prepare options: `new` from outside throws. */
const MADE = Symbol();

/** The profiles of prepared options, or `undefined` for any other value. */
export let preparedProfiles: (value: unknown) => Profiles | undefined;

/**
 * The runtime class of prepared options, which the type above, declared
 * only, describes from outside. Nothing reaches the profiles but this
 * module, as for readers and writers (see `codec.ts`): the options cannot be
 * read or changed once prepared, and an object built by hand is not
 * prepared. Frozen, prepared options are also kept as they are by the state
 * of reactive frameworks, which wrap other objects in a `Proxy` that has no
 * private field.
 */
class Prepared {
  readonly #profiles: Profiles;
  /**
   * The preset prepared, or `null`: the mark that a copy made by spreading
   * keeps, which the validation of options refuses (see
   * `prepared_mark.ts`).
   */
  readonly [PREPARED]: string | null;

  constructor(made: symbol, profiles: Profiles, preset: string | null) {
    if (made !== MADE) {
      throw new TypeError("Illegal constructor");
    }
    this.#profiles = profiles;
    this[PREPARED] = preset;
    Object.freeze(this);
  }

  // Assigns the function that reads the private field, from inside the
  // class, as in `codec.ts`.
  // oxlint-disable-next-line no-unused-private-class-members
  static #accessor = (() => {
    preparedProfiles = (value) =>
      typeof value === "object" && value !== null && #profiles in value
        ? value.#profiles
        : undefined;
  })();
}
Object.freeze(Prepared.prototype);
Object.freeze(Prepared);

/**
 * Prepared options that write with `writing` and read with `reading`: the
 * options of the preset `preset`, or of other options (`null`). The objects
 * are frozen, not copied: the caller passes objects that nothing else holds.
 */
export function makePrepared(
  writing: ResolvedConversionOptions,
  reading: ResolvedConversionOptions,
  preset: string | null,
): PreparedOptions {
  for (const profile of [writing, reading]) {
    for (const group of Object.values(profile)) Object.freeze(group);
    Object.freeze(profile);
  }
  return new Prepared(
    MADE,
    Object.freeze({ reading, writing }),
    preset,
  ) as unknown as PreparedOptions;
}
