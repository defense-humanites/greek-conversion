// @ts-check
/**
 * A TypeDoc plugin for the API reference: the two modules take the names
 * they are imported by, instead of their file names (`mod`, `document`).
 */
import { Converter, ReflectionKind } from "typedoc";

const NAMES = {
  mod: "@humanities/greek-conversion",
  document: "@humanities/greek-conversion/document",
};

/** @param {import("typedoc").Application} app */
export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (context) => {
    for (const module of context.project.getReflectionsByKind(ReflectionKind.Module)) {
      const name = NAMES[/** @type {keyof typeof NAMES} */ (module.name)];
      if (name !== undefined) module.name = name;
    }
  });
}
