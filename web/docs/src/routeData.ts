import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

/**
 * The home page is a splash page, which Starlight draws without the sidebar,
 * and so, on a phone, without the menu that holds it. It keeps the sidebar,
 * so that the menu opens there as on every other page; on a wider screen,
 * `theme.css` hides it again, and the page keeps its full width.
 */
export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  if (route.entry.data.template === "splash") route.hasSidebar = true;
});
