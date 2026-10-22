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
