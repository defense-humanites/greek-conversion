/**
 * The versions of the documentation the site serves, from the build's
 * settings (`astro.config.mjs`): `channel` is the version of this build,
 * `release` the version at the root, `nextBase` the base of `/next/` when it
 * is deployed.
 */
declare const __DOCS_VERSIONS__: {
  channel: "release" | "next";
  release: string;
  releaseBase: string;
  nextBase: string | null;
};

export const VERSIONS = __DOCS_VERSIONS__;

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
