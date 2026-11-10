/**
 * Runs the smoke checks on the TypeScript sources, as JSR serves them, under
 * the runtime that runs this script: `deno run scripts/source_smoke.mjs` in
 * the CI, for the Deno users of the JSR package.
 */
import * as main from "../src/mod.ts";
import * as document from "../src/document.ts";
import { runSmokeChecks } from "./smoke_checks.mjs";

runSmokeChecks(main, document);

console.log("source smoke test passed");
