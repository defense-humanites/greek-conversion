/** Builds the static playground from this checkout's public library entry point. */
await Deno.mkdir("_site", { recursive: true });

for (const name of ["index.html", "styles.css"]) {
  await Deno.copyFile(`web/${name}`, `_site/${name}`);
}

const build = new Deno.Command(Deno.execPath(), {
  args: [
    "bundle",
    "--config",
    "web/deno.json",
    "--platform=browser",
    "--minify",
    "--check",
    "-o",
    "_site/app.js",
    "web/app.ts",
  ],
  stdout: "inherit",
  stderr: "inherit",
});

const { success } = await build.output();
if (!success) Deno.exit(1);
