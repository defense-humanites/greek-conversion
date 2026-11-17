// @ts-check
import { unified } from "@astrojs/markdown-remark";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightTypeDoc, { typeDocSidebarGroup } from "starlight-typedoc";

const SITE = "https://defense-humanites.github.io";
const BASE = "/greek-conversion";
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
  base: BASE,
  trailingSlash: "always",
  // Fetch a page as soon as its link is hovered or touched: with the view
  // transition declared in theme.css, moving between pages then feels like an
  // application's.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  markdown: {
    processor: unified({ rehypePlugins: [prefixBase(), markExternal(), markGreek()] }),
  },
  vite: { server: { fs: { allow: ["../.."] } } },
  integrations: [
    starlight({
      title: "greek conversion",
      description:
        "Bidirectional conversion between Greek, Beta Code, and transliteration, with standards-based presets and information-loss diagnostics.",
      favicon: "/favicon.svg",
      // English is the root locale, at the site's root. A translation is a
      // folder of the same pages (`fr/`) and one more entry here.
      locales: { root: { label: "English", lang: "en" } },
      editLink: { baseUrl: `${REPOSITORY}/edit/main/web/docs/` },
      customCss: ["../shared/tokens.css", "./src/styles/theme.css"],
      components: {
        EditLink: "./src/components/EditLink.astro",
        Footer: "./src/components/Footer.astro",
        Hero: "./src/components/Hero.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
        SocialIcons: "./src/components/SocialIcons.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
      head: [{ tag: "script", content: PLAYGROUND_REDIRECT }],
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
      sidebar: [
        {
          label: "Start here",
          items: [
            "guide/getting-started",
            "guide/how-it-works",
            "guide/presets",
          ],
        },
        {
          label: "Recipes",
          items: [{ autogenerate: { directory: "guide/recipes" } }],
        },
        {
          label: "Going further",
          items: [
            "guide/losses",
            "guide/custom-characters",
            "guide/options-and-errors",
            "guide/canonical-document",
          ],
        },
        {
          label: "Reference",
          items: [
            "reference/guarantees",
            "reference/stability",
            "reference/presets",
            "reference/information-loss",
            "reference/conversion-analysis",
            "reference/greek-unicode",
            "reference/character-extensions",
            "reference/document-api",
            "reference/validation",
          ],
        },
        {
          label: "Standards and conformance",
          collapsed: true,
          items: [
            "reference/preset-repertoire-audit",
            "reference/preset-behavior-audit",
            "reference/preset-conformance-corpus",
            "reference/ala-lc-conformance-corpus",
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
