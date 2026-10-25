/**
 * Returns the character that starts at `index`, as `Array.from()` would split
 * it: a surrogate pair is one character, a lone surrogate is one too.
 */
export function codePointAt(text: string, index: number): string {
  const unit = text.charCodeAt(index);
  if (unit >= 0xd800 && unit <= 0xdbff && index + 1 < text.length) {
    const next = text.charCodeAt(index + 1);
    if (next >= 0xdc00 && next <= 0xdfff) return text.slice(index, index + 2);
  }
  return text[index];
}

/**
 * Builds a table of values indexed by code unit, for the units from `start`
 * to `start + size - 1`.
 *
 * A key that is not one code unit in that range throws at load time: written
 * into a typed array, it would otherwise land out of bounds and be ignored
 * without a word, and the character would never be recognized.
 */
export function codeUnitTable(
  start: number,
  size: number,
  entries: Iterable<readonly [string, number]>,
): Uint16Array {
  const table = new Uint16Array(size);
  for (const [char, value] of entries) {
    const index = char.charCodeAt(0) - start;
    if (char.length !== 1 || index < 0 || index >= size) {
      throw new RangeError(
        `${JSON.stringify(char)} is outside the table U+${hex(start)}–U+${
          hex(start + size - 1)
        }`,
      );
    }
    table[index] = value;
  }
  return table;
}

const hex = (unit: number) => unit.toString(16).toUpperCase().padStart(4, "0");
