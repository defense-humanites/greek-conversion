import { assertEquals, assertExists } from "@std/assert";
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
  assertEquals(group.replacement, '"orthography": {}}');
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
    { orthography: { accentuation: "monotonic" } },
  );

  const unfinishedKey = '{"orthography": {"acc}';
  const [accentuation] = suggestOptions(
    unfinishedKey,
    unfinishedKey.indexOf("}"),
  );
  assertEquals(
    unfinishedKey.slice(0, accentuation.start) + accentuation.replacement +
      unfinishedKey.slice(accentuation.end),
    '{"orthography": {"accentuation": }',
  );
});
