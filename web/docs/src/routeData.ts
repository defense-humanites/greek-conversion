import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { isPythonPage, pythonNavigation } from "./python_sidebar.ts";
import { otherVersionHref, VERSIONS } from "./versions.ts";

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
   * its pages lead from one to the next in its order. It is "greek
   * conversion for Python", as its home says under the logo: in the tab
   * ("Performance | greek conversion for Python"), and as the site's name
   * where a link to the page is shared.
   */
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (isPythonPage(context.url.pathname, base)) {
    const { sidebar, pagination } = pythonNavigation(
      context.url.pathname,
      base,
    );
    route.sidebar = sidebar;
    route.pagination = pagination;
    const name = `${route.siteTitle} for Python`;
    for (const entry of route.head) {
      if (entry.tag === "title" && typeof entry.content === "string") {
        entry.content = entry.content.replace(
          ` | ${route.siteTitle}`,
          ` | ${name}`,
        );
      }
      if (entry.tag === "meta" && entry.attrs?.property === "og:site_name") {
        entry.attrs.content = name;
      }
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
