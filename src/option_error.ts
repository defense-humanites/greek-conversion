/**
 * The error of an option, in a module of its own, so that a bundle that
 * throws it without validating options keeps none of their tables.
 *
 * Internal: the entry points export the class.
 */

/**
 * Error raised for an option that cannot be resolved: an unknown key or
 * preset, a value outside the accepted ones, or two values that cannot be
 * combined. A `RangeError`, with the option named by `path` and what was
 * received, what is accepted, and the replacement of a key or value that a
 * release candidate of `1.0.0` knew, when there is one. The message is for
 * humans.
 */
export class OptionError extends RangeError {
  /** Dotted path of the option, such as `"transliteration.eta"` or `"preset"`; for a key of a converter's configuration, such as `"exclude"` or `"aliases[0].spellings"`. */
  readonly path: string;
  /** The value received, or undefined for an unknown key. */
  readonly received: unknown;
  /**
   * The accepted values of the option, or the accepted keys of its group.
   * For two values that cannot be combined, the values accepted next to the
   * other one.
   */
  readonly accepted: readonly string[];
  /**
   * The current path of a removed key, or the current spelling of a renamed
   * value, for the names of the release candidates of `1.0.0`: a migration
   * aid, which a minor release after `1.0.0` may stop giving
   * (docs/stability.md). A property of the error only when there is one:
   * declared without a field, which would set it to `undefined` on every
   * error.
   */
  declare readonly replacement?: string;

  /** Creates the error with its message and the details of the option. */
  constructor(
    message: string,
    details: {
      path: string;
      received: unknown;
      accepted: readonly string[];
      replacement?: string;
    },
  ) {
    super(message);
    this.name = "OptionError";
    this.path = details.path;
    this.received = details.received;
    this.accepted = Object.freeze([...details.accepted]);
    if (details.replacement !== undefined) {
      this.replacement = details.replacement;
    }
  }
}
