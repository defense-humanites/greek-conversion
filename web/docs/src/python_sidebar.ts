/**
 * The sidebar of the Python documentation (`/python/…`), which
 * `routeData.ts` gives its pages in place of the TypeScript one, in the
 * order of the TypeScript sidebar: the pages that have a Python version
 * (`documentations.ts`), and those written for Python. A page is listed
 * under its own title, as in the TypeScript sidebar.
 */
import { languageOf } from "./documentations.ts";

/** A group of pages: a title and a path from the site's root, by page. */
interface Group {
  label: string;
  items: readonly (readonly [string, string])[];
}

export const PYTHON_SIDEBAR: readonly Group[] = [
  {
    label: "Start here",
    items: [
      ["Getting started", "/python/guide/getting-started/"],
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
      ["Information-loss contract", "/python/reference/information-loss/"],
      ["API reference", "/python/reference/api/"],
    ],
  },
];

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
  const sidebar = PYTHON_SIDEBAR.map((group) => ({
    type: "group" as const,
    label: group.label,
    collapsed: false,
    badge: undefined,
    entries: group.items.map(([label, path]): Link => {
      const link: Link = {
        type: "link",
        label,
        href: `${base}${path}`,
        isCurrent: pathname === `${base}${path}`,
        badge: undefined,
        attrs: {},
      };
      if (path.startsWith("/python/")) links.push(link);
      return link;
    }),
  }));
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
