/**
 * Checks a release tag against the package version and writes the version
 * and npm dist-tag to the GitHub Actions step outputs. The other metadata
 * are checked by `scripts/check_metadata.ts`.
 *
 * Run with `node scripts/release_metadata.ts <tag>` in the publish workflow.
 */
import { appendFile, readFile } from "node:fs/promises";

const { version } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

const tag = process.argv[2];
const expectedTag = `v${version}`;
if (tag !== expectedTag) {
  throw new Error(`Release tag ${tag} does not match ${expectedTag}.`);
}

const prerelease = version.split("-", 2)[1];
const npmTag = prerelease === undefined
  ? "latest"
  : prerelease.startsWith("beta")
  ? "beta"
  : "next";

const outputPath = process.env.GITHUB_OUTPUT;
if (outputPath === undefined) {
  throw new Error("GITHUB_OUTPUT is not available.");
}

await appendFile(outputPath, `version=${version}\nnpm_tag=${npmTag}\n`);
