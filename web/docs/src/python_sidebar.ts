/**
 * The sidebar of the Python documentation (`/python/…`), which
 * `routeData.ts` gives its pages in place of the TypeScript one, in the
 * order of the TypeScript sidebar: the pages that have a Python version
 * (`documentations.ts`), and those written for Python. A page is listed
 * under its own title, as in the TypeScript sidebar.
 */
import { languageOf } from "./documentations.ts";

/** A page: its title and its path from the site's root. */
type Page = readonly [string, string];

/** A group of pages, or of pages and a collapsed group of them. */
interface Group {
  label: string;
  collapsed?: boolean;
  items: readonly (Page | Group)[];
}

export const PYTHON_SIDEBAR: readonly Group[] = [
  {
    label: "Start here",
    items: [
      ["Getting started", "/python/guide/getting-started/"],
      ["How it works", "/python/guide/how-it-works/"],
      ["Glossary", "/python/guide/glossary/"],
      ["How the package works", "/python/package/"],
    ],
  },
  {
    label: "Your Greek",
    items: [
      ["Ancient Greek", "/python/guide/ancient-greek/"],
      ["Byzantine and Medieval Greek", "/python/guide/byzantine-greek/"],
      ["Modern Greek", "/python/guide/modern-greek/"],
    ],
  },
  {
    label: "Standards and presets",
    items: [
      ["Choosing a preset", "/python/guide/presets/"],
      ["Preset reference", "/python/reference/presets/"],
      {
        label: "Conformance",
        collapsed: true,
        items: [
          [
            "Preset behavior audit",
            "/python/reference/preset-behavior-audit/",
          ],
          [
            "Preset character repertoire audit",
            "/python/reference/preset-repertoire-audit/",
          ],
          [
            "ALA-LC conformance corpus",
            "/python/reference/ala-lc-conformance-corpus/",
          ],
          [
            "BnF, ISO 843, and BGN/PCGN conformance corpus",
            "/python/reference/preset-conformance-corpus/",
          ],
        ],
      },
    ],
  },
  {
    label: "Information loss",
    items: [
      [
        "What formats and options lose",
        "/python/guide/format-and-option-losses/",
      ],
      ["Knowing what a conversion loses", "/python/guide/losses/"],
    ],
  },
  {
    label: "Recipes",
    items: [
      [
        "Diacritics and Unicode output",
        "/python/guide/recipes/diacritics-and-unicode/",
      ],
      [
        "Transliteration and Beta Code",
        "/python/guide/recipes/transliteration-and-beta-code/",
      ],
      ["Letters and text", "/python/guide/recipes/letters-and-text/"],
    ],
  },
  {
    label: "Going further",
    items: [["Converters, options, and errors", "/python/guide/converters/"]],
  },
  {
    label: "Reference",
    items: [
      ["Guarantees and limits", "/python/reference/guarantees/"],
      ["Conversion options", "/python/reference/options/"],
      ["Greek output", "/python/reference/greek-unicode/"],
      [
        "Punctuation and numerals",
        "/python/reference/punctuation-and-numerals/",
      ],
      ["Information-loss contract", "/python/reference/information-loss/"],
      [
        "Conversion-analysis contract",
        "/python/reference/conversion-analysis/",
      ],
      [
        "Character extensions and repertoires",
        "/python/reference/character-extensions/",
      ],
      ["Stability policy", "/python/reference/stability/"],
      ["API reference", "/python/reference/api/"],
    ],
  },
];

/** The pages of the sidebar, in its order, collapsed groups included. */
export function pythonPages(groups: readonly Group[] = PYTHON_SIDEBAR): Page[] {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => isPage(item) ? [item] : pythonPages([item]))
  );
}

function isPage(item: Page | Group): item is Page {
  return Array.isArray(item);
}

interface GroupEntry {
  type: "group";
  label: string;
  collapsed: boolean;
  badge: undefined;
  entries: (Link | GroupEntry)[];
}

interface Link {
  type: "link";
  label: string;
  href: string;
  isCurrent: boolean;
  badge: undefined;
  attrs: Record<string, never>;
}

/** Whether a page is one of the Python documentation. */
export function isPythonPage(pathname: string, base: string): boolean {
  return pathname.startsWith(`${base}/`) &&
    languageOf(pathname.slice(base.length)) === "python";
}

/**
 * The sidebar of a Python page, as Starlight's route data holds it, and the
 * links to the previous and next pages of the Python guide.
 */
export function pythonNavigation(pathname: string, base: string) {
  const links: Link[] = [];
  const entry = (item: Page | Group): Link | GroupEntry => {
    if (!isPage(item)) {
      return {
        type: "group",
        label: item.label,
        collapsed: item.collapsed ?? false,
        badge: undefined,
        entries: item.items.map(entry),
      };
    }
    const [label, path] = item;
    const link: Link = {
      type: "link",
      label,
      href: `${base}${path}`,
      isCurrent: pathname === `${base}${path}`,
      badge: undefined,
      attrs: {},
    };
    links.push(link);
    return link;
  };
  const sidebar = PYTHON_SIDEBAR.map(entry);
  const index = links.findIndex((link) => link.isCurrent);
  return {
    sidebar,
    pagination: {
      prev: index > 0 ? links[index - 1] : undefined,
      next: index >= 0 && index < links.length - 1
        ? links[index + 1]
        : undefined,
    },
  };
}
