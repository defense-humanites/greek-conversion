import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { convert, convertDetailed, createConverter } from "../npm/esm/mod.js";
import { encode, parse, validateDocument } from "../npm/esm/document.js";
import * as core from "../npm/esm/core.js";
import { betaCodeReader } from "../npm/esm/formats/beta_code.js";
import {
  greekFormat,
  greekReader,
  greekWriter,
} from "../npm/esm/formats/greek.js";
import { alaLcModern } from "../npm/esm/prepared_presets.js";
import { transliterationWriter } from "../npm/esm/formats/transliteration.js";
import { checkPositionsUnicode } from "./positions_unicode_check.mjs";

const packageJson = JSON.parse(
  await readFile(new URL("../npm/package.json", import.meta.url), "utf8"),
);
assert.equal(packageJson.name, "@humanities/greek-conversion");
assert.equal(packageJson.license, "MIT");

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

const document = parse("a)/nqrwpos", "beta-code");
assert.deepEqual(validateDocument(document), []);
assert.equal(encode(document, "greek"), "ἄνθρωπος");

// The entry points that take readers, writers and prepared options, as the
// package's exports map them.
for (
  const subpath of [
    "core",
    "greek",
    "beta-code",
    "transliteration",
    "presets",
  ]
) {
  assert.ok(packageJson.exports[`./${subpath}`], subpath);
}
assert.equal(
  core.convert("a)/nqrwpos", betaCodeReader, greekWriter),
  "ἄνθρωπος",
);
assert.equal(
  core.convert("Βίος Μπάλα", greekReader, transliterationWriter, alaLcModern),
  "Vios Bala",
);
assert.equal(
  core.convertDetailed(
    "ἄνθρωπος",
    greekFormat,
    greekFormat,
    core.prepareOptions({ greek: { accentuation: "monotonic" } }),
  ).lossy,
  true,
);

// Positions under this runtime's Unicode version, through the built package.
assert.deepEqual(checkPositionsUnicode(convertDetailed), []);

console.log("npm ESM smoke test passed");
