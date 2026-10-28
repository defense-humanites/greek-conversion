import { assertEquals } from "@std/assert";
import * as documentApi from "../src/document.ts";
import * as mainApi from "../src/mod.ts";

Deno.test("the main runtime API stays deliberately small", () => {
  assertEquals(Object.keys(mainApi).sort(), [
    "CONVERSION_OPTION_VALUES",
    "CharacterScopeError",
    "DEFAULT_CONVERSION_OPTIONS",
    "FORMATS",
    "OptionError",
    "convert",
    "convertDetailed",
    "createConverter",
    "getPresetMetadata",
    "getPresetOptions",
    "listPresetMetadata",
    "reencode",
    "resolveConversionOptions",
  ]);
});

Deno.test("canonical-document runtime helpers stay in the advanced entry point", () => {
  assertEquals(Object.keys(documentApi).sort(), [
    "applyGreekOrthography",
    "encode",
    "grapheme",
    "literal",
    "parse",
    "parseDetailed",
    "validateDocument",
  ]);
});
