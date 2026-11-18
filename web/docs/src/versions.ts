/**
 * The versions of the documentation the site serves, from the build's
 * settings (`astro.config.mjs`): `channel` is the version of this build,
 * `release` the latest stable release, served at the root (none before
 * 1.0.0), `nextBase` the base of `/next/` when it is deployed.
 */
declare const __DOCS_VERSIONS__: {
  channel: "release" | "next";
  release: string | null;
  releaseBase: string;
  nextBase: string | null;
};

export const VERSIONS = __DOCS_VERSIONS__;

/**
 * The documentation of a release covers its whole major series, whose minor
 * versions only add to it (the stability policy): 1.4.2 is "1.x".
 */
export function series(version: string): string {
  return `${version.split(".")[0]}.x`;
}

/** The same page in the other version: its path below the current base. */
export function otherVersionHref(pathname: string): string | null {
  const { channel, releaseBase, nextBase } = VERSIONS;
  if (nextBase === null) return null;
  const [from, to] = channel === "next"
    ? [nextBase, releaseBase]
    : [releaseBase, nextBase];
  const rest = pathname.startsWith(`${from}/`)
    ? pathname.slice(from.length)
    : "/";
  return `${to}${rest}`;
}
