import { assertEquals } from "@std/assert";
import { suggestInventory } from "../web/inventory_suggestions.ts";

function labels(json: string): string[] {
  return suggestInventory(json, json.length).map(({ label }) => label);
}

Deno.test("inventory suggestions follow nested objects and arrays", () => {
  assertEquals(labels("{"), ["aliases", "characters", "repertoire", "exclude"]);
  assertEquals(labels('{"aliases": ['), ["New alias"]);
  assertEquals(labels('{"aliases": [{"for'), ["format"]);
  assertEquals(labels('{"aliases": [{"format": "b'), ["beta-code"]);
  assertEquals(labels('{"aliases": [{"letter": "the'), ["theta"]);
  assertEquals(labels('{"exclude": ["st'), ["stigma"]);
  assertEquals(labels('{"characters": [{"forms": {"greek": {"low'), [
    "lowercase",
  ]);
  assertEquals(labels('{"characters": [{"override": t'), ["true"]);
  assertEquals(labels('{"characters": [{"id": "s'), []);
});

Deno.test("inventory completion preserves delimiters and custom IDs", () => {
  const beginning = "{";
  const exclude = suggestInventory(beginning, 1).find(({ label }) =>
    label === "exclude"
  );
  if (!exclude) throw new Error("Missing exclude suggestion");
  const withArray = beginning.slice(0, exclude.start) + exclude.replacement;
  assertEquals(withArray, '{"exclude": []}');
  const partialArray = withArray.slice(0, exclude.cursor) + '"st' +
    withArray.slice(exclude.cursor);
  const value = suggestInventory(partialArray, exclude.cursor + 3).find(
    ({ label }) => label === "stigma",
  );
  if (!value) throw new Error("Missing stigma suggestion");
  const completed = partialArray.slice(0, value.start) + value.replacement +
    partialArray.slice(value.end);
  assertEquals(JSON.parse(completed), { exclude: ["stigma"] });

  const partial = '{"characters": [{"id": "san"}], "exclude": ["sa"]}';
  const caret = partial.lastIndexOf("sa") + 2;
  const san = suggestInventory(partial, caret).find(({ label }) =>
    label === "san"
  );
  if (!san) throw new Error("Missing custom character suggestion");
  assertEquals(
    JSON.parse(
      partial.slice(0, san.start) + san.replacement + partial.slice(san.end),
    ),
    { characters: [{ id: "san" }], exclude: ["san"] },
  );
});
