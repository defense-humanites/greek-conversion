import assert from "node:assert/strict";
import { checkPositionsUnicode } from "./positions_unicode_check.mjs";

/**
 * A few conversions through each entry point, and positions under the
 * runtime's Unicode version, which the test suite run under Node 24 does not
 * see. Run by `npm_smoke.mjs` on the npm build, and by `source_smoke.mjs` on
 * the sources that JSR publishes.
 *
 * @param {typeof import("../src/mod.ts")} main
 * @param {typeof import("../src/document.ts")} document
 */
export function runSmokeChecks(main, document) {
  const { convert, convertDetailed, createConverter } = main;
  const { encode, parse, validateDocument } = document;

  assert.equal(convert("a)/nqrwpos", "beta-code", "greek"), "ἄνθρωπος");
  assert.equal(
    convert("Βίος Μπάλα", "greek", "transliteration", {
      preset: "ala-lc-modern",
    }),
    "Vios Bala",
  );

  const detailed = convertDetailed("ἄνθρωπος", "greek", "greek", {
    greek: { accentuation: "monotonic" },
  });
  assert.equal(detailed.lossy, true);

  const restricted = createConverter({ exclude: ["stigma"] });
  assert.equal(
    restricted.convert("αϛβ", "greek", "transliteration"),
    "aϛb",
  );

  const parsed = parse("a)/nqrwpos", "beta-code");
  assert.deepEqual(validateDocument(parsed), []);
  assert.equal(encode(parsed, "greek"), "ἄνθρωπος");

  assert.deepEqual(checkPositionsUnicode(convertDetailed), []);
}
