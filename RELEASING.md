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

## Prerelease checklist

1. Update the version in `deno.json` and replace `Unreleased` in
   `CHANGELOG.md` with the release date.
2. Run `deno task check`, `deno task test`, `deno task publish:check`, and
   `deno task npm:check`.
3. Verify the generated npm archive, especially its ESM exports, declarations,
   license, README, migration guide, and documentation directory.
4. Merge the exact release commit and wait for CI to succeed.
5. Create a draft GitHub release whose tag exactly matches the version with
   a `v` prefix, for example `v1.0.0-beta.8`. Keep GitHub's prerelease flag
   unchecked while the beta series is featured as the current release.
6. Confirm both trusted-publisher configurations and explicitly set
   `PUBLISH_ENABLED` to `true` only when publication is authorized.
7. Publish the GitHub release. The workflow publishes JSR first and npm second;
   npm prereleases use the `beta` distribution tag and the scoped package is
   explicitly published with public access.
8. Verify both registry pages, provenance, documentation, and installation
   commands, then reset `PUBLISH_ENABLED` to `false` if releases should require
   a fresh manual authorization.

## Partial publication

Registry publication is not atomic and published versions are immutable. If
JSR succeeds and npm fails, do not change the version or republish JSR: correct
the npm configuration or build and rerun the workflow for the same GitHub
release. JSR will recognize the already-published version, while npm can finish
the coordinated release.

Do not reuse a version after either registry has accepted it. If package
contents must change, prepare the next prerelease version instead.
