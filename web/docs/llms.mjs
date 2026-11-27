// @ts-check
/**
 * The documentation for AI agents, written after each build beside the
 * pages, after the llms.txt convention (https://llmstxt.org/):
 *
 * - `llms.txt`, an index: the site's description, the essentials of the
 *   README (installation and main functions), then every page of the
 *   sidebar, in its order, with its description, the pages of the Python
 *   package's documentation, in the order of their own sidebar, and the
 *   collapsed groups (conformance, API, project) under "Optional";
 * - `<page>/index.md`, each page in Markdown, from its source, with its title
 *   and description, and links to other pages as links to their Markdown.
 *
 * A file of the whole documentation (`llms-full.txt`, a common convention
 * outside the specification) is left out: at some 300 kB, it would fill the
 * context of an agent that the index and the pages serve better.
 *
 * Everything is derived from the pages, the sidebar, and the README, and is
 * written again at each build: nothing here needs updating by hand, and a
 * new page is listed where the sidebar puts it.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT = new URL("./src/content/docs/", import.meta.url);
const README = new URL("../../README.md", import.meta.url);
/** The README's sections that an agent needs before any page. */
const ESSENTIALS = ["Installation", "Main functions"];

/**
 * @typedef {{ path: string, title: string, description: string, body: string }} Page
 * @typedef {{ title: string, url: string, note: string }} Entry
 */

/**
 * @param {{
 *   site: string,
 *   base: string,
 *   title: string,
 *   sidebar: any[],
 *   apiGroup: unknown,
 *   python: readonly { items: readonly (readonly [string, string])[] }[],
 * }} options
 * @returns {import("astro").AstroIntegration}
 */
export default function llmsTxt(options) {
  return {
    name: "llms-txt",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const pages = await readPages();
        const root = `${options.site}${options.base}`;
        /** @param {string} path */
        const markdownUrl = (path) => `${root}${path}index.md`;
        /** @param {string} text */
        const rewrite = (text) =>
          text.replace(/\]\((\/[^)\s]*)\)/g, (link, target) => {
            if (target.startsWith("//")) return link;
            const [path, fragment] = target.split("#");
            const suffix = fragment === undefined ? "" : `#${fragment}`;
            // The playground is an application, without Markdown.
            if (!pages.has(path)) return `](${root}${target})`;
            return `](${markdownUrl(path)}${suffix})`;
          });

        for (const page of pages.values()) {
          const file = new URL(`.${page.path}index.md`, dir);
          await mkdir(new URL(".", file), { recursive: true });
          await writeFile(file, render(page, rewrite));
        }

        let listed = 0;
        const sections = [];
        /** @type {Entry[]} */
        const optional = [];
        for (const group of options.sidebar) {
          /** @type {Entry[]} */
          const entries = [];
          // TypeDoc fills the API's group: its overviews are listed below.
          const items = group === options.apiGroup ? [] : group.items ?? [];
          for (const item of items) {
            collect(item, entries, optional, pages, markdownUrl, "");
          }
          if (group === options.apiGroup || group.collapsed) {
            optional.push(...entries.map((entry) => labelled(entry, group)));
            if (group === options.apiGroup) {
              optional.push(...apiEntries(pages, markdownUrl));
            }
          } else if (entries.length > 0) {
            sections.push(`## ${group.label}\n\n${list(entries)}`);
            listed += entries.length;
          }
        }
        // The Python documentation: its pages, in their sidebar's order.
        const python = options.python.flatMap((group) => group.items)
          .filter(([, path]) => path.startsWith("/python/"))
          .map(([, path]) => {
            const page = pages.get(path);
            if (page === undefined) throw new Error(`llms.txt: no page ${path}`);
            return entry(page, markdownUrl, "");
          });
        if (python.length > 0) {
          sections.push(`## Python\n\n${list(python)}`);
          listed += python.length;
        }
        if (optional.length > 0) {
          sections.push(`## Optional\n\n${list(optional)}`);
        }

        const head = [
          `# ${options.title}`,
          ...(await essentials()).map(rewrite),
          `Every page of this site is also in Markdown: add \`index.md\` to its address, as the links below do.`,
        ].join("\n\n");
        await writeFile(
          new URL("llms.txt", dir),
          `${head}\n\n${sections.join("\n\n")}\n`,
        );
        logger.info(
          `llms.txt (${listed} pages, ${optional.length} optional), and ${pages.size} pages in Markdown.`,
        );
      },
    },
  };
}

/**
 * Adds the entries of a sidebar item: a page, a group, an autogenerated
 * directory, or a link to another site. A collapsed group is optional.
 *
 * @param {any} item
 * @param {Entry[]} entries
 * @param {Entry[]} optional
 * @param {Map<string, Page>} pages
 * @param {(path: string) => string} markdownUrl
 * @param {string} prefix
 */
function collect(item, entries, optional, pages, markdownUrl, prefix) {
  if (typeof item === "string") {
    const page = pages.get(`/${item}/`);
    if (page === undefined) throw new Error(`llms.txt: no page ${item}`);
    entries.push(entry(page, markdownUrl, prefix));
  } else if (item.autogenerate) {
    const directory = `/${item.autogenerate.directory}/`;
    const found = [...pages.values()].filter((page) =>
      page.path.startsWith(directory)
    );
    for (const page of found) entries.push(entry(page, markdownUrl, prefix));
  } else if (item.items) {
    const target = item.collapsed ? optional : entries;
    const label = item.collapsed ? `${item.label}: ` : prefix;
    for (const child of item.items) {
      collect(child, target, optional, pages, markdownUrl, label);
    }
  } else if (item.link) {
    // A file of the repository, in Markdown rather than in GitHub's page.
    const url = String(item.link).replace(
      /^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\//,
      "https://raw.githubusercontent.com/$1/",
    );
    entries.push({ title: `${prefix}${item.label}`, url, note: "" });
  }
}

/**
 * The overview of the API and of each entry point, generated by TypeDoc.
 *
 * @param {Map<string, Page>} pages
 * @param {(path: string) => string} markdownUrl
 * @returns {Entry[]}
 */
function apiEntries(pages, markdownUrl) {
  const modules = [...pages.values()].filter((page) =>
    /^\/api\/humanities\/greek-conversion\/([\w-]+\/)?readme\/$/.test(
      page.path,
    )
  ).sort((a, b) => a.title.length - b.title.length);
  const overview = pages.get("/api/readme/");
  return [
    ...(overview === undefined ? [] : [{ ...overview, title: "entry points" }]),
    ...modules,
  ].map((page) => ({
    title: `API: ${page.title}`,
    url: markdownUrl(page.path),
    note: page.description,
  }));
}

/**
 * @param {Page} page
 * @param {(path: string) => string} markdownUrl
 * @param {string} prefix
 * @returns {Entry}
 */
function entry(page, markdownUrl, prefix) {
  return {
    title: `${prefix}${page.title}`,
    url: markdownUrl(page.path),
    note: page.description,
  };
}

/** @param {Entry} entry @param {any} group @returns {Entry} */
function labelled(entry, group) {
  return entry.title.includes(": ")
    ? entry
    : { ...entry, title: `${group.label}: ${entry.title}` };
}

/** @param {Entry[]} entries */
function list(entries) {
  return entries.map(({ title, url, note }) =>
    `- [${title}](${url})${note === "" ? "" : `: ${note}`}`
  ).join("\n");
}

/**
 * A page in Markdown: its title, its description, and its text.
 *
 * @param {Page} page
 * @param {(text: string) => string} rewrite
 */
function render(page, rewrite) {
  return [
    `# ${page.title}`,
    ...(page.description === "" ? [] : [`> ${page.description}`]),
    rewrite(page.body),
  ].join("\n\n").trimEnd() + "\n";
}

/**
 * The README's tagline, as a quotation, and its essential sections,
 * without their headings, which llms.txt keeps for its lists of files: each
 * starts with its name, in bold.
 */
async function essentials() {
  const text = await readFile(README, "utf8");
  // The tagline, which `scripts/check_metadata.ts` keeps in agreement with
  // the description of the package and of the site.
  const tagline = text.match(/<b>([^<]*)<\/b>/)?.[1].replace(/\s+/g, " ");
  const sections = ESSENTIALS.flatMap((name) => {
    const start = text.indexOf(`\n## ${name}\n`);
    if (start < 0) return [];
    const rest = text.slice(start + name.length + 5);
    const end = rest.search(/\n## /);
    const body = (end < 0 ? rest : rest.slice(0, end)).trim()
      .replace(/^### (.+)$/gm, "**$1**");
    return [`**${name}**\n\n${body}`];
  });
  return [`> ${tagline?.trim()}`, ...sections];
}

/**
 * The pages of the site, by their path from its root (`/guide/presets/`):
 * the guide, the reference synced from `docs/`, and the API, as Astro names
 * them. The home page and the page for a missing address are left out.
 *
 * @returns {Promise<Map<string, Page>>}
 */
async function readPages() {
  const root = fileURLToPath(CONTENT);
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((file) => file.isFile() && file.name.endsWith(".md"))
    .map((file) => relative(root, join(file.parentPath, file.name)))
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file !== "404.md");
  /** @type {(Page & { order: number })[]} */
  const pages = [];
  for (const file of files) {
    const text = await readFile(join(root, file), "utf8");
    const match = text.match(/^---\n([\s\S]*?)\n---\n/);
    const front = match === null ? "" : match[1];
    const body = (match === null ? text : text.slice(match[0].length))
      // Comments of the source, such as the marks of a generated part.
      .replace(/^<!--.*-->\n\n?/gm, "")
      // The spans that style the examples of the option reference
      // (`βαρβάρων → barbárōn`): their text is enough.
      .replace(/<\/?span[^>]*>/g, "")
      .trim();
    const slug = file.replace(/\.md$/, "").split("/").map((segment) =>
      segment.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "")
        .replace(/ /g, "-")
    ).join("/").replace(/(^|\/)index$/, "");
    pages.push({
      path: slug === "" ? "/" : `/${slug}/`,
      title: field(front, "title") ?? dirname(file),
      description: field(front, "description") ?? firstSentence(body),
      body,
      order: Number(front.match(/^\s+order:\s*(\d+)/m)?.[1] ?? Infinity),
    });
  }
  pages.sort((a, b) =>
    a.order - b.order || a.path.localeCompare(b.path, "en")
  );
  return new Map(
    pages.map(({ path, title, description, body }) => [
      path,
      { path, title, description, body },
    ]),
  );
}

/**
 * A field of the front matter, quoted as JSON or bare.
 *
 * @param {string} front
 * @param {string} name
 */
function field(front, name) {
  const value = front.match(new RegExp(`^${name}:\\s*(.+)$`, "m"))?.[1];
  if (value === undefined) return undefined;
  return value.startsWith('"') ? JSON.parse(value) : value.trim();
}

/**
 * The first sentence of a page's first paragraph, without its links, for a
 * page that has no description, as the reference documents of `docs/`.
 *
 * @param {string} body
 */
function firstSentence(body) {
  const paragraph = body.split(/\n\n/).find((block) =>
    /^[\p{L}`*_[]/u.test(block) && !block.startsWith("Defined in:")
  );
  if (paragraph === undefined) return "";
  const text = paragraph.replace(/\s+/g, " ").replace(
    /\[([^\]]+)\]\([^)]+\)/g,
    "$1",
  );
  // A sentence that announces a list ends the description.
  return (text.match(/^.+?[.:](?=\s|$)/)?.[0] ?? text).replace(/:$/, ".");
}
