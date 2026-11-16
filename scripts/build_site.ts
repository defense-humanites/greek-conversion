/**
 * Builds the static playground into `_site/playground/` from this checkout's
 * public library entry points. `web/playground/tsconfig.json` type-checks it
 * beforehand, in `npm run site:build` and in `npm run check`.
 *
 * The design tokens and fonts shared with the documentation site are in
 * `web/shared/`: `tokens.css` is put before the playground's stylesheet, and
 * the fonts are served in `fonts/`, next to it, where its URLs point.
 *
 * Run with `npm run site:build`.
 */
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = new URL("../", import.meta.url);
const PLAYGROUND = new URL("web/playground/", ROOT);
const SHARED = new URL("web/shared/", ROOT);
// The documentation site (`web/docs/`) is built into `_site/` itself, with
// the playground under it, as GitHub Pages serves them.
const SITE = new URL("_site/playground/", ROOT);

await mkdir(new URL("fonts/", SITE), { recursive: true });
await mkdir(new URL("assets/", SITE), { recursive: true });
await cp(new URL("index.html", PLAYGROUND), new URL("index.html", SITE));
const styles = await Promise.all([
  readFile(new URL("tokens.css", SHARED), "utf8"),
  readFile(new URL("styles.css", PLAYGROUND), "utf8"),
]);
await writeFile(new URL("styles.css", SITE), styles.join("\n"));
// The typefaces, served from the site itself (`web/shared/fonts/README.md`).
for (
  const name of [
    "bricolage-grotesque.woff2",
    "literata-gc-light.woff2",
    "noto-serif-greek-symbols.woff2",
  ]
) {
  await cp(new URL(`fonts/${name}`, SHARED), new URL(`fonts/${name}`, SITE));
}
// The symbol and favicon, from the project's marks (`docs/assets/`).
for (
  const name of [
    "greek-conversion-symbol-clair.svg",
    "greek-conversion-symbol-sombre.svg",
    "greek-conversion-favicon.svg",
  ]
) {
  await cp(
    new URL(`docs/assets/${name}`, ROOT),
    new URL(`assets/${name}`, SITE),
  );
}

await build({
  entryPoints: [fileURLToPath(new URL("app.ts", PLAYGROUND))],
  outfile: fileURLToPath(new URL("app.js", SITE)),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  logLevel: "warning",
});
