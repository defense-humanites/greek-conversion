/**
 * Greek-locale case mapping, memoized per string.
 *
 * `toLocaleLowerCase("el")` and `toLocaleUpperCase("el")` go through the
 * locale machinery on every call. The engine maps the same few dozen
 * characters over and over, so caching the results removes that cost
 * without changing them.
 */
const LOWER = new Map<string, string>();
const UPPER = new Map<string, string>();

/** Lowercases one character or short string with Greek rules. */
export function greekLower(value: string): string {
  let lower = LOWER.get(value);
  if (lower === undefined) {
    lower = value.toLocaleLowerCase("el");
    LOWER.set(value, lower);
  }
  return lower;
}

/** Uppercases one character or short string with Greek rules. */
export function greekUpper(value: string): string {
  let upper = UPPER.get(value);
  if (upper === undefined) {
    upper = value.toLocaleUpperCase("el");
    UPPER.set(value, upper);
  }
  return upper;
}
