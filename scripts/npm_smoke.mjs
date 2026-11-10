import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as main from "../npm/esm/mod.js";
import * as document from "../npm/esm/document.js";
import { runSmokeChecks } from "./smoke_checks.mjs";

const packageJson = JSON.parse(
  await readFile(new URL("../npm/package.json", import.meta.url), "utf8"),
);
assert.equal(packageJson.name, "@humanities/greek-conversion");
assert.equal(packageJson.license, "MIT");

runSmokeChecks(main, document);

console.log("npm ESM smoke test passed");
