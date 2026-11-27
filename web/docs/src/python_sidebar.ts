/**
 * The sidebar of the Python documentation (`/python/…`), which
 * `routeData.ts` gives its pages in place of the TypeScript one: its own
 * entry point, in the order of the guide. The pages that describe the
 * library rather than its use, the reference above all, are those of the
 * TypeScript documentation, and hold for Python as they are written. A
 * page is listed under its own title, as in the TypeScript sidebar.
 */

/** A group of pages: a title and a path from the site's root, by page. */
interface Group {
  label: string;
  items: readonly (readonly [string, string])[];
}

export const PYTHON_SIDEBAR: readonly Group[] = [
  {
    label: "Start here",
    items: [
      ["Getting started in Python", "/python/"],
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
      ["Preset reference", "/reference/presets/"],
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
      ["Letters and text", "/python/guide/recipes/letters-and-text/"],
      [
        "Transliteration and Beta Code",
        "/python/guide/recipes/transliteration-and-beta-code/",
      ],
    ],
  },
  {
    label: "Going further",
    items: [["Converters, options, and errors", "/python/guide/converters/"]],
  },
  {
    label: "Reference",
    items: [
      ["API reference", "/python/reference/api/"],
      ["Conversion options", "/python/reference/options/"],
      ["Guarantees and limits", "/reference/guarantees/"],
      ["Information-loss contract", "/reference/information-loss/"],
      ["Greek output", "/reference/greek-unicode/"],
    ],
  },
  {
    label: "TypeScript",
    items: [["The TypeScript documentation", "/guide/getting-started/"]],
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
  return pathname === `${base}/python/` ||
    pathname.startsWith(`${base}/python/`);
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
