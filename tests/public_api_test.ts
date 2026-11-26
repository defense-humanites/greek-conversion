import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import * as coreApi from "../src/core.ts";
import * as documentApi from "../src/document.ts";
import * as betaCodeApi from "../src/formats/beta_code.ts";
import * as greekApi from "../src/formats/greek.ts";
import * as transliterationApi from "../src/formats/transliteration.ts";
import * as mainApi from "../src/mod.ts";
import * as presetsApi from "../src/prepared_presets.ts";

test("the main runtime API stays deliberately small", () => {
  assertEquals(Object.keys(mainApi).sort(), [
    "CONVERSION_OPTION_VALUES",
    "CharacterScopeError",
    "DEFAULT_CONVERSION_OPTIONS",
    "FORMATS",
    "OptionError",
    "convert",
    "convertDetailed",
    "convertGreekPassages",
    "convertGreekPassagesDetailed",
    "createConverter",
    "getPresetMetadata",
    "getPresetOptions",
    "listPresetMetadata",
    "prepareOptions",
    "reencode",
    "resolveConversionOptions",
  ]);
});

test("canonical-document runtime helpers stay in the advanced entry point", () => {
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

test("the core entry point holds the conversions that take readers and writers", () => {
  assertEquals(Object.keys(coreApi).sort(), [
    "OptionError",
    "convert",
    "convertDetailed",
    "convertGreekPassages",
    "convertGreekPassagesDetailed",
    "prepareOptions",
    "reencode",
  ]);
});

test("each format's entry point holds its reader, its writer, and both", () => {
  assertEquals(Object.keys(greekApi).sort(), [
    "greekFormat",
    "greekReader",
    "greekWriter",
  ]);
  assertEquals(Object.keys(betaCodeApi).sort(), [
    "betaCodeFormat",
    "betaCodeReader",
    "betaCodeWriter",
  ]);
  assertEquals(Object.keys(transliterationApi).sort(), [
    "transliterationFormat",
    "transliterationReader",
    "transliterationWriter",
  ]);
});

test("the presets entry point holds one prepared preset per preset", () => {
  assertEquals(Object.keys(presetsApi).sort(), [
    "alaLcAncient",
    "alaLcModern",
    "bnfAncient",
    "iso843Type1",
    "iso843Type2",
    "perseus",
    "sblGeneral",
    "tlgCore",
  ]);
});
