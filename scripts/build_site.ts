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

await mkdir(SITE, { recursive: true });
for (const name of ["index.html", "styles.css"]) {
  await cp(new URL(`web/${name}`, ROOT), new URL(name, SITE));
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
