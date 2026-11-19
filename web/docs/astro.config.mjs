// @ts-check
import { unified } from "@astrojs/markdown-remark";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";

/**
 * The site's own domain, which it holds alone: it is served from the
 * domain's root, wherever it is hosted. The addresses that cite it
 * (`package.json`, `CITATION.cff`, the README, the playground) are kept in
 * agreement by `scripts/check_metadata.ts`.
 */
const SITE = "https://greek-conversion.humanites.fr";
/**
 * The site serves two versions of the documentation from 1.0.0
 * (`.github/workflows/pages.yml`): at its root, that of the latest stable
 * release; under `/next/`, that of `main`, for the next release, release
 * candidates included. A build says which it is with `DOCS_CHANNEL`
 * (`release`, the default, or `next`) and gives the version at the root
 * with `DOCS_RELEASE`; a release build sets `DOCS_NEXT=1` when `/next/` is
 * deployed beside it. Before 1.0.0, `main` is served at the root alone,
 * without a version.
 *
 * `ROOT_BASE` is the path of the site's root on its domain: none, as the
 * domain is its own.
 */
const ROOT_BASE = "";
const CHANNEL = process.env.DOCS_CHANNEL === "next" ? "next" : "release";
const BASE = CHANNEL === "next" ? `${ROOT_BASE}/next` : ROOT_BASE;
const RELEASE = process.env.DOCS_RELEASE || null;
const VERSIONS = {
  channel: CHANNEL,
  release: RELEASE,
  releaseBase: ROOT_BASE,
  nextBase: CHANNEL === "next" || process.env.DOCS_NEXT === "1"
    ? `${ROOT_BASE}/next`
    : null,
};
/** The social card (1280 × 640), copied by `scripts/sync_reference.ts`. */
const SHARING_IMAGE = [
  ["og:image", `${SITE}${BASE}/social.png`],
  ["og:image:width", "1280"],
  ["og:image:height", "640"],
  [
    "og:image:alt",
    "greek conversion: convert Ancient and Modern Greek to and from Beta Code or Latin script, with standards-based presets and information-loss diagnostics.",
  ],
].map(([property, content]) => ({ tag: "meta", attrs: { property, content } }))
  .concat({
    tag: "meta",
    attrs: { name: "twitter:image", content: `${SITE}${BASE}/social.png` },
  });
const REPOSITORY = "https://github.com/defense-humanites/greek-conversion";

/**
 * Pages link to one another by their path from the site's root
 * (`/reference/presets/`), as their files are laid out; the site is served
 * under `BASE`, which this adds.
 */
function prefixBase() {
  /** @param {any} node */
  const visit = (node) => {
    if (node.type === "element" && node.tagName === "a") {
      const href = node.properties?.href;
      if (
        typeof href === "string" && href.startsWith("/") &&
        !href.startsWith("//") && !href.startsWith(`${BASE}/`)
      ) {
        node.properties.href = `${BASE}${href}`;
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  return () => visit;
}

/**
 * Marks Greek in inline code as such: code made only of the letters, marks,
 * spaces, and punctuation of a text, with a Greek letter among them, such as
 * `ἄνθρωπος`, takes the language `grc`, as the playground's Greek fields do,
 * for screen readers and for the font's Greek forms. It stays in the
 * monospace face, as all code does.
 */
function markGreek() {
  const TEXT = /^[\p{L}\p{M}\s’ʼ'ʹ͵·;.,:?!-]+$/u;
  const GREEK = /[\u0370-\u03ff\u1f00-\u1fff]/;
  /** @param {any} node @param {any} parent */
  const visit = (node, parent) => {
    if (
      node.type === "element" && node.tagName === "code" &&
      parent?.tagName !== "pre"
    ) {
      const text = (node.children ?? []).map((/** @type {any} */ child) =>
        child.type === "text" ? child.value : "\u0000"
      ).join("");
      if (TEXT.test(text) && GREEK.test(text)) node.properties.lang = "grc";
      return;
    }
    for (const child of node.children ?? []) visit(child, node);
  };
  return () => (/** @type {any} */ tree) => visit(tree, undefined);
}

/**
 * Inline code in a table breaks only between its words: each run of
 * non-space characters, such as a key (`iotaSubscript:`) or a value
 * (`"capital-adscript"`), stays on one line (`.code-word`), so that a long
 * pair of key and value wraps at its space rather than widening its column,
 * and never inside an identifier or at a hyphen. The text, and what is
 * copied, are unchanged.
 */
function breakTableCode() {
  /** @param {any} code */
  const split = (code) => {
    code.children = (code.children ?? []).flatMap((/** @type {any} */ child) =>
      child.type !== "text" ? [child] : child.value.split(/(\s+)/).filter(
        (/** @type {string} */ part) => part !== "",
      ).map((/** @type {string} */ part) =>
        /^\s+$/.test(part) ? { type: "text", value: part } : {
          type: "element",
          tagName: "span",
          properties: { className: ["code-word"] },
          children: [{ type: "text", value: part }],
        }
      )
    );
  };
  /** @param {any} node @param {any} parent @param {boolean} inTable */
  const visit = (node, parent, inTable) => {
    if (node.type !== "element" && node.type !== "root") return;
    if (inTable && node.tagName === "code" && parent?.tagName !== "pre") {
      split(node);
      return;
    }
    const table = inTable || node.tagName === "table";
    for (const child of node.children ?? []) visit(child, node, table);
  };
  return () => (/** @type {any} */ tree) => visit(tree, undefined, false);
}

/**
 * Links that leave the documentation open in a new tab and say so, as the
 * header's do: links to other sites, and to the playground, a tool of its
 * own. The last word and the mark stay on one line (`.external-tail`), and
 * screen readers hear "opens in a new tab". Runs after `prefixBase`.
 */
function markExternal() {
  /** @param {string} href */
  const leaves = (href) =>
    /^https?:\/\//.test(href) || href.startsWith(`${BASE}/playground/`);
  /** @param {string} tagName @param {string[]} className @param {any[]} children */
  const span = (tagName, className, children) => ({
    type: "element",
    tagName,
    properties: { className },
    children,
  });
  /** @param {any} node */
  const visit = (node) => {
    if (node.type === "element" && node.tagName === "a") {
      const href = node.properties?.href;
      if (typeof href === "string" && leaves(href)) {
        node.properties.target = "_blank";
        node.properties.rel = ["noopener"];
        const children = node.children ?? [];
        const mark = span("span", ["external-mark"], []);
        mark.properties.ariaHidden = "true";
        const last = children.at(-1);
        let tail;
        if (last?.type === "text") {
          const start = last.value.search(/\S+\s*$/);
          const word = start >= 0 ? last.value.slice(start).trimEnd() : "";
          last.value = start >= 0 ? last.value.slice(0, start) : last.value;
          tail = span("span", ["external-tail"], [
            { type: "text", value: word },
            mark,
          ]);
          if (last.value === "") children.pop();
        } else {
          tail = span("span", ["external-tail"], [
            ...(last ? [children.pop()] : []),
            mark,
          ]);
        }
        node.children = [
          ...children,
          tail,
          span("span", ["sr-only"], [
            { type: "text", value: " (opens in a new tab)" },
          ]),
        ];
      }
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  return () => visit;
}

/**
 * The playground used to be served at the site's root, and its shared links
 * carry their state in the fragment (`#from=greek&to=…`), which never reaches
 * the server. Such a link now opens the home page: send it on to the
 * playground, fragment included.
 */
const PLAYGROUND_REDIRECT = `
if (location.pathname === "${BASE}/" && location.hash.includes("=")) {
  location.replace("${BASE}/playground/" + location.hash);
}`;

/**
 * Below 360px, the page no longer narrows: a phone that narrow lays it out
 * 360px wide and scales it to its screen, as the playground does
 * (`web/playground/index.html`). The width is the screen's in its current
 * orientation, which iOS does not swap in `screen.width`.
 */
const MIN_WIDTH = `
(() => {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) return;
  const fit = () => {
    const { width, height } = screen;
    const landscape = matchMedia("(orientation: landscape)").matches;
    const across = landscape ? Math.max(width, height) : Math.min(width, height);
    viewport.content = across < 360
      ? "width=360"
      : "width=device-width, initial-scale=1";
  };
  fit();
  addEventListener("orientationchange", fit);
})();`;

/**
 * A sidebar link that leaves the documentation: it opens in a new tab, and
 * says so to screen readers; theme.css draws the mark.
 * @param {string} label @param {string} link
 */
function external(label, link) {
  return {
    label,
    link,
    attrs: {
      target: "_blank",
      rel: "noopener",
      "aria-label": `${label} (opens in a new tab)`,
    },
  };
}

export default defineConfig({
  site: SITE,
  base: BASE || "/",
  trailingSlash: "always",
  // Fetch a page as soon as its link is hovered or touched: with the view
  // transition declared in theme.css, moving between pages then feels like an
  // application's.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  markdown: {
    processor: unified({
      rehypePlugins: [
        prefixBase(),
        markExternal(),
        markGreek(),
        breakTableCode(),
      ],
    }),
  },
  vite: {
    server: { fs: { allow: ["../.."] } },
    // The versions served, for the header's selector and the banner of
    // `/next/` (`src/versions.ts`).
    define: { __DOCS_VERSIONS__: JSON.stringify(VERSIONS) },
  },
  integrations: [
    starlight({
      title: "greek conversion",
      description:
        "A TypeScript library that converts Ancient and Modern Greek between Greek script, Beta Code, and Latin script, with standards-based presets and information-loss diagnostics.",
      favicon: "/favicon.svg",
      // English is the root locale, at the site's root. A translation is a
      // folder of the same pages (`fr/`) and one more entry here.
      locales: { root: { label: "English", lang: "en" } },
      editLink: { baseUrl: `${REPOSITORY}/edit/main/web/docs/` },
      customCss: [
        "../shared/tokens.css",
        "../shared/icons.css",
        "./src/styles/theme.css",
      ],
      components: {
        EditLink: "./src/components/EditLink.astro",
        Pagination: "./src/components/Pagination.astro",
        PageFrame: "./src/components/PageFrame.astro",
        PageSidebar: "./src/components/PageSidebar.astro",
        TwoColumnContent: "./src/components/TwoColumnContent.astro",
        Footer: "./src/components/Footer.astro",
        Hero: "./src/components/Hero.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
        SocialIcons: "./src/components/SocialIcons.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
      head: [
        { tag: "script", content: PLAYGROUND_REDIRECT },
        { tag: "script", content: MIN_WIDTH },
        // The sharing image: the design system's social card, which
        // Starlight's `summary_large_image` card announces.
        ...SHARING_IMAGE,
        // The next release's documentation is not for search engines: they
        // index the released one, at the root.
        ...(CHANNEL === "next"
          ? [{ tag: "meta", attrs: { name: "robots", content: "noindex" } }]
          : []),
      ],
      routeMiddleware: "./src/routeData.ts",
      plugins: [
        starlightTypeDoc({
          entryPoints: ["../../src/mod.ts", "../../src/document.ts"],
          tsconfig: "../../tsconfig.build.json",
          output: "api",
          sidebar: { label: "API", collapsed: true },
          typeDoc: {
            excludePrivate: true,
            excludeInternal: true,
            readme: "./api-readme.md",
            plugin: ["./typedoc-plugin.mjs"],
          },
        }),
      ],
      // The reader comes with a Greek (ancient, Byzantine, or modern), looks
      // for the convention that applies to it, and asks what a conversion
      // loses: the groups after "Start here" answer in that order. The guide
      // introduces; the Reference group holds the documents of docs/, the
      // preset reference apart, beside the guide to presets. A page is listed
      // under its own title, so that the menu and the page agree: to rename
      // an entry, rename the page.
      sidebar: [
        {
          label: "Start here",
          items: [
            "guide/getting-started",
            "guide/how-it-works",
            "guide/glossary",
          ],
        },
        {
          label: "Your Greek",
          items: [
            "guide/ancient-greek",
            "guide/byzantine-greek",
            "guide/modern-greek",
          ],
        },
        {
          label: "Standards and presets",
          items: [
            "guide/presets",
            "reference/presets",
            {
              label: "Conformance",
              collapsed: true,
              items: [
                "reference/preset-behavior-audit",
                "reference/preset-repertoire-audit",
                "reference/ala-lc-conformance-corpus",
                "reference/preset-conformance-corpus",
              ],
            },
          ],
        },
        {
          label: "Information loss",
          items: ["guide/format-and-option-losses", "guide/losses"],
        },
        {
          label: "Recipes",
          items: [{ autogenerate: { directory: "guide/recipes" } }],
        },
        {
          label: "Going further",
          items: [
            "guide/converters",
            "guide/document",
          ],
        },
        {
          label: "Reference",
          items: [
            "reference/guarantees",
            "reference/options",
            "reference/greek-unicode",
            "reference/punctuation-and-numerals",
            "reference/information-loss",
            "reference/conversion-analysis",
            "reference/character-extensions",
            "reference/document-api",
            "reference/validation",
            "reference/stability",
          ],
        },
        typeDocSidebarGroup,
        {
          label: "Project",
          collapsed: true,
          items: [
            external("Changelog", `${REPOSITORY}/blob/main/CHANGELOG.md`),
            external("Migration guide", `${REPOSITORY}/blob/main/MIGRATION.md`),
            external("Contributing", `${REPOSITORY}/blob/main/CONTRIBUTING.md`),
          ],
        },
      ],
    }),
  ],
});
