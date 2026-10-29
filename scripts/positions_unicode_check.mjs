/**
 * Checks, through the public API alone, that positions do not drift under the
 * Unicode version of the runtime: Node and browsers have their own, which the
 * Deno test suite (tests/positions_test.ts checks every code point there)
 * does not see. A character that normalization changes, written before a
 * Greek word, must shift the spans of the word by its own length and change
 * nothing else; a letter that composes with the one before it and that the
 * library does not know would shift them wrongly, as Hangul jamo did.
 *
 * Run by scripts/npm_smoke.mjs on the npm build, under each Node version of
 * the CI.
 *
 * @param {typeof import("../src/mod.ts").convertDetailed} convertDetailed
 * @returns {string[]} the first failures, empty when none
 */
export function checkPositionsUnicode(convertDetailed) {
  const tail = " \u{3BB}\u{3CC}\u{3B3}\u{3BF}\u{3C2}"; // " λόγος", with a tonos
  const formats = ["greek", "transliteration"];
  const reference = Object.fromEntries(
    formats.map((to) => [to, convertDetailed(tail, "greek", to)]),
  );
  const failures = [];
  const check = (prefix) => {
    for (const to of formats) {
      const alone = reference[to];
      const joined = convertDetailed(prefix + tail, "greek", to);
      const count = alone.spans.length;
      const outShift = joined.output.length - alone.output.length;
      const spans = joined.spans.slice(-count);
      const shifted = joined.output.endsWith(alone.output) &&
        spans.every((span, index) => {
          const expected = alone.spans[index];
          return span.inputStart === expected.inputStart + prefix.length &&
            span.inputEnd === expected.inputEnd + prefix.length &&
            span.outputStart === expected.outputStart + outShift &&
            span.outputEnd === expected.outputEnd + outShift;
        });
      if (!shifted && failures.length < 10) {
        const codes = Array.from(
          prefix,
          (char) => char.codePointAt(0).toString(16).toUpperCase(),
        );
        failures.push(`U+${codes.join(" U+")} before a Greek word, to ${to}`);
      }
    }
  };
  const mark = /^\p{M}$/u;
  for (let codePoint = 0; codePoint <= 0x10FFFF; codePoint++) {
    if (codePoint >= 0xD800 && codePoint <= 0xDFFF) continue;
    const char = String.fromCodePoint(codePoint);
    const decomposed = char.normalize("NFD");
    if (decomposed !== char) {
      // Read decomposed, written composed again; and the reverse.
      check(char);
      check(decomposed);
    } else if (mark.test(char)) {
      // A mark, reordered with another of another class.
      check("a" + char + "\u{323}");
    }
    if (failures.length >= 10) break;
  }
  return failures;
}
