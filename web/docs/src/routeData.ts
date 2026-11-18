import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
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
   * Every page of the next release's documentation says so, and leads to
   * the same page in the released documentation.
   */
  const released = otherVersionHref(context.url.pathname);
  if (VERSIONS.channel === "next" && released !== null) {
    route.entry.data.banner = {
      content: `This is the documentation of the next release, built from
        the main branch. <a href="${released}">Read the documentation of
        ${VERSIONS.release}</a>, the latest release.`,
    };
  }
});
