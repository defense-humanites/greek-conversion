import { assertEquals } from "@std/assert";
import { suggestOptions } from "../web/options_suggestions.ts";

Deno.test("suggests nested option keys and valid values in partial JSON", () => {
  const key = '{"orthography": {"accent';
  assertEquals(suggestOptions(key, key.length).map(({ label }) => label), [
    "accentuation",
  ]);

  const value = '{"orthography": {"accentuation": "m';
  assertEquals(suggestOptions(value, value.length).map(({ label }) => label), [
    "monotonic",
  ]);

  const boolean = '{"removeDiacritics": t';
  assertEquals(suggestOptions(boolean, boolean.length)[0].replacement, "true");
});

Deno.test("a suggestion replaces only the active token", () => {
  const json = '{"orthography": {"accentuation": "mon", "sigma": "lunate"}}';
  const caret = json.indexOf("mon") + 3;
  const [suggestion] = suggestOptions(json, caret);
  const completed = json.slice(0, suggestion.start) + suggestion.replacement +
    json.slice(suggestion.end);
  assertEquals(JSON.parse(completed), {
    orthography: { accentuation: "monotonic", sigma: "lunate" },
  });

  const beginning = "{";
  const [group] = suggestOptions(beginning, 1);
  assertEquals(group.label, "orthography");
  assertEquals(group.cursor, group.start + group.replacement.length - 1);
});
