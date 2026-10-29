import { assertEquals, assertExists } from "@std/assert";
import { suggestOptions } from "../web/options_suggestions.ts";

Deno.test("suggests nested option keys and valid values in partial JSON", () => {
  const key = '{"greek": {"accent';
  assertEquals(suggestOptions(key, key.length).map(({ label }) => label), [
    "accentuation",
  ]);

  const value = '{"greek": {"accentuation": "m';
  assertEquals(suggestOptions(value, value.length).map(({ label }) => label), [
    "monotonic",
  ]);

  const all = '{"diacritics": {"a';
  assertEquals(suggestOptions(all, all.length).map(({ label }) => label), [
    "all",
    "accents",
  ]);
});

Deno.test("a suggestion replaces only the active token", () => {
  const json = '{"greek": {"accentuation": "mon", "sigma": "lunate"}}';
  const caret = json.indexOf("mon") + 3;
  const [suggestion] = suggestOptions(json, caret);
  const completed = json.slice(0, suggestion.start) + suggestion.replacement +
    json.slice(suggestion.end);
  assertEquals(JSON.parse(completed), {
    greek: { accentuation: "monotonic", sigma: "lunate" },
  });

  const beginning = "{";
  const group = suggestOptions(beginning, 1).find(({ label }) =>
    label === "greek"
  )!;
  assertEquals(group.replacement, '"greek": {}}');
  assertEquals(group.cursor, group.start + group.replacement.length - 2);

  const withGroup = beginning.slice(0, group.start) + group.replacement;
  const withKey = withGroup.slice(0, group.cursor) + '"accentuation": ' +
    withGroup.slice(group.cursor);
  const valueSuggestions = suggestOptions(
    withKey,
    group.cursor + '"accentuation": '.length,
  );
  const monotonic = valueSuggestions.find(({ label }) => label === "monotonic");
  assertExists(monotonic);
  assertEquals(
    JSON.parse(
      withKey.slice(0, monotonic.start) + monotonic.replacement +
        withKey.slice(monotonic.end),
    ),
    { greek: { accentuation: "monotonic" } },
  );

  const unfinishedKey = '{"greek": {"acc}';
  const [accentuation] = suggestOptions(
    unfinishedKey,
    unfinishedKey.indexOf("}"),
  );
  assertEquals(
    unfinishedKey.slice(0, accentuation.start) + accentuation.replacement +
      unfinishedKey.slice(accentuation.end),
    '{"greek": {"accentuation": }',
  );
});
