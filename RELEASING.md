# Releasing greek-conversion

Publication is deliberately disabled between releases. Creating a GitHub
release cannot publish anything until the repository variable described below
is explicitly enabled.

## One-time registry and repository setup

For the canonical `defense-humanites/greek-conversion` repository:

1. Create `@humanities/greek-conversion` on JSR and link it to the canonical
   GitHub repository and `.github/workflows/publish.yml`.
2. Configure npm trusted publishing for `@humanities/greek-conversion`
   package with repository `defense-humanites/greek-conversion`, workflow
   `publish.yml`, and environment `release`.
3. Create the protected GitHub environment `release`, restrict deployment to
   the intended tags, and add required reviewers.
4. Keep the repository variable `PUBLISH_ENABLED` absent or set to `false`
   until the first publication is explicitly approved.

Both registries use the same package name and version:

| Registry | Package |
| --- | --- |
| JSR | `@humanities/greek-conversion` |
| npm | `@humanities/greek-conversion` |

## Release checklist

1. Update the version in `deno.json` and `CITATION.cff`, and replace
   `Unreleased` in `CHANGELOG.md` with the release date. The publish workflow
   refuses a release whose tag or citation version differs from `deno.json`.
2. Run `deno task check`, `deno task test`, `deno task publish:check`, and
   `deno task npm:check`.
3. Verify the generated npm archive, especially its ESM exports, declarations,
   license, README, migration guide, and documentation directory. This file is
   deliberately excluded from both packages.
4. Merge the exact release commit and wait for CI to succeed.
5. Create a draft GitHub release whose tag exactly matches the version with
   a `v` prefix, for example `v1.0.0`. Publish it as a GitHub release. The npm
   dist-tag is `latest` for a stable version, `beta` for a beta, and `next`
   for any other pre-release such as a release candidate. Earlier
   betas were intentionally published without GitHub's prerelease flag.
6. Confirm both trusted-publisher configurations and explicitly set
   `PUBLISH_ENABLED` to `true` only when publication is authorized.
7. Publish the GitHub release. The workflow publishes JSR first and npm second;
   the scoped npm package is explicitly published with public access.
8. Verify both registry pages, provenance, documentation, and installation
   commands, then reset `PUBLISH_ENABLED` to `false` if releases should require
   a fresh manual authorization.

## A slow JSR step

After `Publishing @humanities/greek-conversion@<version> ...`, `deno publish`
waits for JSR to process the version, with no time limit. This usually takes
seconds, but `1.0.0-rc.1` took about 12 minutes on 2026-10-19 while other
packages published normally. Wait at least 30 minutes before cancelling, and
check the version page (`https://jsr.io/@humanities/greek-conversion@<version>`)
first: once it exists, JSR has accepted the version and the workflow will
continue with npm. Cancelling while JSR processes leaves nothing published on
either registry, and rerunning the same release is safe.

## Partial publication

Registry publication is not atomic and published versions are immutable. If
JSR succeeds and npm fails, do not change the version or republish JSR: correct
the npm configuration or build and rerun the workflow for the same GitHub
release. JSR will recognize the already-published version, while npm can finish
the coordinated release.

Do not reuse a version after either registry has accepted it. If package
contents must change, prepare a new version instead.
