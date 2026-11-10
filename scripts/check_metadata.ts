/**
 * Checks that the package metadata agree: the name and version in
 * `package.json` (npm), `jsr.json` (JSR), and `package-lock.json`, the
 * version in `CITATION.cff`, and the entry points that JSR publishes.
 *
 * Run with `node scripts/check_metadata.ts`.
 */
import { readFile } from "node:fs/promises";

const read = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const npm = JSON.parse(await read("package.json"));
const jsr = JSON.parse(await read("jsr.json"));
const lock = JSON.parse(await read("package-lock.json"));
const citation = await read("CITATION.cff");
const citedVersion = citation.match(/^version:\s*(\S+)\s*$/m)?.[1];

const problems: string[] = [];
const expect = (what: string, actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    problems.push(
      `${what} is ${JSON.stringify(actual)}, expected ${
        JSON.stringify(expected)
      }`,
    );
  }
};

expect("the jsr.json name", jsr.name, npm.name);
expect("the jsr.json version", jsr.version, npm.version);
expect("the jsr.json license", jsr.license, npm.license);
expect("the package-lock.json version", lock.version, npm.version);
expect("the CITATION.cff version", citedVersion, npm.version);
expect("the JSR entry points", jsr.exports, {
  ".": "./src/mod.ts",
  "./document": "./src/document.ts",
});

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Package metadata agree on ${npm.name}@${npm.version}.`);
