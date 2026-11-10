/**
 * Runs the benches: `npm run bench`, or `npm run bench -- <pattern>` for the
 * benches whose name matches a regular expression.
 *
 * @module
 */
import { runBenches } from "./harness.ts";
import "./conversion_bench.ts";
import "./short_calls_bench.ts";

const pattern = process.argv[2];
await runBenches(pattern === undefined ? undefined : new RegExp(pattern));
