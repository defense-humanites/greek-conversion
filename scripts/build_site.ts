/**
 * Builds the static playground into `_site/` from this checkout's public
 * library entry points. `web/tsconfig.json` type-checks it beforehand, in
 * `npm run site:build` and in `npm run check`.
 *
 * Run with `npm run site:build`.
 */
import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = new URL("../", import.meta.url);
const SITE = new URL("_site/", ROOT);

await mkdir(new URL("fonts/", SITE), { recursive: true });
await mkdir(new URL("assets/", SITE), { recursive: true });
for (const name of ["index.html", "styles.css"]) {
  await cp(new URL(`web/${name}`, ROOT), new URL(name, SITE));
}
// The typefaces, served from the site itself (`web/fonts/README.md`).
for (
  const name of [
    "bricolage-grotesque.woff2",
    "literata-gc-regular.woff2",
    "noto-serif-greek-symbols.woff2",
  ]
) {
  await cp(new URL(`web/fonts/${name}`, ROOT), new URL(`fonts/${name}`, SITE));
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
  entryPoints: [fileURLToPath(new URL("web/app.ts", ROOT))],
  outfile: fileURLToPath(new URL("app.js", SITE)),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  logLevel: "warning",
});
