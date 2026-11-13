import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import { convert, listPresetMetadata } from "../src/mod.ts";
import { EXAMPLES } from "../web/examples.ts";

test("every playground example gives the output its note describes", () => {
  for (const [preset, examples] of Object.entries(EXAMPLES)) {
    for (const example of examples) {
      const options = {
        ...example.options,
        ...(preset ? { preset } : {}),
      } as Parameters<typeof convert>[3];
      assertEquals(
        convert(example.text, example.from, example.to, options),
        example.output,
        `${preset || "no standard"}: ${example.title}`,
      );
    }
  }
});

test("every standard has examples", () => {
  for (const { id } of listPresetMetadata()) {
    assertEquals(EXAMPLES[id].length > 0, true, id);
  }
});
