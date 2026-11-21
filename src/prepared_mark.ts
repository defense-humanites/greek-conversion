/**
 * The mark of prepared options: the key of the one property they show, which
 * holds the name of the preset they are, or `null`.
 *
 * Spreading prepared options into an object copies the mark and nothing of
 * the options, which are private: `{ ...sblGeneral, transliteration }`
 * holds `transliteration` alone, and would convert with the defaults. The
 * validation of options refuses an object that has the mark, and says what
 * to write instead (see `presets.ts`). The key is registered with
 * `Symbol.for()`, so that a copy of the library also recognizes the prepared
 * options of another.
 *
 * Internal: in a module of its own, so that the main entry point, which
 * refuses prepared options, does not bring their class into a bundle.
 */
export const PREPARED: unique symbol = /* @__PURE__ */ Symbol.for(
  "@humanities/greek-conversion/prepared",
);

/** Whether a value has the mark of prepared options. */
export function hasPreparedMark(value: object): boolean {
  return Object.hasOwn(value, PREPARED);
}
