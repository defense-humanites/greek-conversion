import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { isPythonPage, pythonNavigation } from "./python_sidebar.ts";
import { otherVersionHref, VERSIONS } from "./versions.ts";

/**
 * The Python package's social card, which the pages under `/python/` give
 * as their sharing image in place of the TypeScript library's
 * (`astro.config.mjs`); `scripts/check_metadata.ts` checks its text
 * alternative against the card.
 */
const PYTHON_CARD = {
  image: "social-python.png",
  alt:
    "greek conversion: convert Ancient, Byzantine, and Modern Greek to and from Beta Code or Latin script, with atomic options composed into standards-based presets, and information-loss diagnostics. For Python: pip install greek-conversion.",
};

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  /*
   * The home page is a splash page, which Starlight draws without the
   * sidebar, and so, on a phone, without the menu that holds it. It keeps
   * the sidebar, so that the menu opens there as on every other page; on a
   * wider screen, `theme.css` hides it again, and the page keeps its full
   * width.
   */
  if (route.entry.data.template === "splash") route.hasSidebar = true;
  /*
   * The Python documentation (`/python/…`) has a sidebar of its own, and
   * its pages lead from one to the next in its order.
   */
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (isPythonPage(context.url.pathname, base)) {
    const { sidebar, pagination } = pythonNavigation(
      context.url.pathname,
      base,
    );
    route.sidebar = sidebar;
    route.pagination = pagination;
    for (const { attrs } of route.head) {
      const name = attrs?.property ?? attrs?.name;
      if (name === "og:image" || name === "twitter:image") {
        attrs!.content = String(attrs!.content).replace(
          /social\.png$/,
          PYTHON_CARD.image,
        );
      } else if (name === "og:image:alt") attrs!.content = PYTHON_CARD.alt;
    }
  }
  /*
   * A home page's title is its own: the tab reads "greek conversion", not
   * Starlight's "greek conversion | greek conversion", or "greek
   * conversion for Python".
   */
  if (route.entry.data.template === "splash") {
    const title = route.head.find((entry) => entry.tag === "title");
    if (title) title.content = route.entry.data.title;
  }
  /*
   * Every page of the next release's documentation says so, and leads to
   * the same page in the released documentation.
   */
  const released = otherVersionHref(context.url.pathname);
  if (
    VERSIONS.channel === "next" && released !== null &&
    VERSIONS.release !== null
  ) {
    route.entry.data.banner = {
      content: `This is the documentation of the next release, built from
        the main branch. <a href="${released}">Read the documentation of
        the latest release</a>, ${VERSIONS.release}.`,
    };
  }
});
