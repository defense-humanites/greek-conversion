/**
 * Checks that the package metadata agree: the name and version in
 * `package.json` (npm), `jsr.json` (JSR), and `package-lock.json`, the
 * version in `CITATION.cff`, and the entry points that JSR publishes.
 *
 * It also checks that the project is described by one sentence, the
 * `description` of `package.json`: the documentation of the main module
 * repeats it; the README's tagline, the home page of the site, its
 * description, and the abstract of `CITATION.cff`, which may be read first or
 * alone, repeat it after "A TypeScript library that converts". The social
 * card, which must hold its text on three lines, gives a shorter form of it
 * and says in its foot that the package is a TypeScript library; its text
 * alternative, in the site and the playground, reads the card in order. The
 * card itself, an image, is checked by eye. `context7.json`, which tells
 * Context7 what to index for coding agents, starts with the sentence too.
 * The Python package (`python/`) repeats it as the description of its
 * `pyproject.toml` and in the documentation of its module, and its README's
 * tagline, after "A Python library that converts", and its home page, under
 * "for Python", after "A library that converts".
 *
 * It checks, last, that the site has one address, the `homepage` of
 * `package.json`: the one it is built for, and the one every file that
 * cites it gives.
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
  "./core": "./src/core.ts",
  "./greek": "./src/formats/greek.ts",
  "./beta-code": "./src/formats/beta_code.ts",
  "./transliteration": "./src/formats/transliteration.ts",
  "./presets": "./src/prepared_presets.ts",
});

/**
 * Text as read: tags and Astro's explicit spaces (`{" "}`), non-breaking
 * spaces and hyphens, line breaks.
 */
const plain = (text: string | undefined) =>
  text?.replace(/<[^>]*>|\{" "\}/g, " ").replace(/&nbsp;|\u00a0/g, " ")
    .replace(/\u2011/g, "-").replace(/\s+/g, " ").trim();
const sentence: string = npm.description;
const library = sentence.replace(
  /^Convert /,
  "A TypeScript library that converts ",
);
const readme = await read("README.md");
const hero = await read("web/docs/src/components/HomeHero.astro");
const main = await read("src/mod.ts");
const site = await read("web/docs/astro.config.mjs");
const home = await read("web/docs/src/content/docs/index.mdx");
expect(
  "the README's tagline",
  plain(readme.match(/<b>([^<]*)<\/b>/)?.[1]),
  library,
);
// The hero opens the homes of both documentations, each with its subject.
const heroDescription = hero.match(/<p class="description">([\s\S]*?)<\/p>/)
  ?.[1];
const subject = /\{python \? "([^"]+)" : "([^"]+)"\}/;
expect(
  "the description of the home page",
  plain(heroDescription?.replace(subject, "$2")),
  library,
);
// The Python home says "for Python" under its logo, and "A library" after.
expect(
  "the description of the Python home page",
  plain(heroDescription?.replace(subject, "$1")),
  sentence.replace(/^Convert /, "A library that converts "),
);
expect(
  "the documentation of src/mod.ts",
  plain(main.match(/^\/\*\*\n((?: \* .*\n)+)/)?.[1].replace(/^ \* /gm, "")),
  sentence,
);
expect(
  "the description of the site",
  plain(site.match(/description:\s*"([^"]*)"/)?.[1]),
  library,
);
expect(
  "the description of the site's home page",
  plain(home.match(/^description: (.*)$/m)?.[1]),
  library,
);
/** The text of `docs/assets/greek-conversion-social-clair.png`. */
const CARD =
  "Convert Ancient, Byzantine, and Modern Greek to and from Beta Code or Latin script, with atomic options composed into standards-based presets, and information-loss diagnostics.";
/** Its foot: the package, and what and where it is. */
const FOOT = "@humanities/greek-conversion, TypeScript library on npm and JSR.";
const card = "greek conversion: " + CARD[0].toLowerCase() + CARD.slice(1) +
  " " + FOOT;
/** The foot of `docs/assets/greek-conversion-social-python-clair.png`, the
 * Python package's card, which has the same description. */
const PYTHON_FOOT = "greek-conversion, Python library on PyPI.";
const playground = await read("web/playground/index.html");
expect(
  "the text alternative of the site's social card",
  plain(site.match(/"og:image:alt",\s*"([^"]*)"/)?.[1]),
  card,
);
expect(
  "the text alternative of the playground's social card",
  plain(
    playground.match(/property="og:image:alt"\s+content="([^"]*)"/)?.[1],
  ),
  card,
);
expect(
  "the text alternative of the Python documentation's social card",
  plain(
    (await read("web/docs/src/routeData.ts")).match(/\balt:\s*"([^"]*)"/)
      ?.[1],
  ),
  card.replace(FOOT, PYTHON_FOOT),
);
expect(
  "the description of context7.json, the index that coding agents query",
  JSON.parse(await read("context7.json")).description.slice(
    0,
    sentence.length,
  ),
  sentence,
);
expect(
  "the description of python/pyproject.toml",
  (await read("python/pyproject.toml")).match(/^description = "([^"]*)"$/m)
    ?.[1],
  sentence,
);
expect(
  "the documentation of the Python module",
  plain(
    (await read("python/src/greek_conversion/__init__.py")).match(
      /^"""([\s\S]*?)\n\n/,
    )?.[1],
  ),
  sentence,
);
expect(
  "the tagline of the Python package's README",
  plain((await read("python/README.md")).match(/<b>([^<]*)<\/b>/)?.[1]),
  sentence.replace(/^Convert /, "A Python library that converts "),
);
expect(
  "the first sentence of the CITATION.cff abstract",
  plain(citation.match(/^abstract: >-\n((?: {2}.*\n)+)/m)?.[1])
    ?.slice(0, library.length),
  library,
);

/*
 * The site has one address, the `homepage` of `package.json`: the site is
 * built for it, `CITATION.cff` and the playground's sharing metadata give
 * it, and the README and the migration guide, which are read away from the
 * site, link to nowhere else in it.
 */
const address: string = npm.homepage;
expect(
  "the address the site is built for",
  (site.match(/^const SITE = "([^"]*)";$/m)?.[1] ?? "") +
    (site.match(/^const ROOT_BASE = "([^"]*)";$/m)?.[1] ?? "") + "/",
  address,
);
expect(
  "the CITATION.cff url",
  citation.match(/^url: "([^"]*)"$/m)?.[1],
  address,
);
expect(
  "the playground's og:url",
  playground.match(/property="og:url"\s+content="([^"]*)"/)?.[1],
  `${address}playground/`,
);
expect(
  "the playground's og:image",
  playground.match(/property="og:image"\s+content="([^"]*)"/)?.[1],
  `${address}social.png`,
);
const migration = await read("MIGRATION.md");
/** The site under an earlier address, or any GitHub Pages address. */
const ELSEWHERE = /https?:\/\/[\w.-]*\.github\.io[^\s)"<]*/g;
for (
  const [name, text] of [
    ["README.md", readme],
    ["MIGRATION.md", migration],
    ["CITATION.cff", citation],
    ["web/playground/index.html", playground],
    ["web/docs/astro.config.mjs", site],
  ]
) {
  for (const [link] of text.matchAll(ELSEWHERE)) {
    problems.push(`${name} links to ${link}: the site is at ${address}`);
  }
}
expect(
  "the README's link to the documentation",
  readme.includes(`<a href="${address}"><b>Documentation</b></a>`),
  true,
);

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Package metadata agree on ${npm.name}@${npm.version}.`);
