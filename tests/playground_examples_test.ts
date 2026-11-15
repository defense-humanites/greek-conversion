import { test } from "node:test";
import { assertEquals } from "./assertions.ts";
import { convert, FORMATS, listPresetMetadata } from "../src/mod.ts";
import { parse, validateDocument } from "../src/document.ts";
import {
  exampleFrom,
  exampleOptions,
  EXAMPLES,
  INVALID_MARKS,
} from "../web/examples.ts";

test("every playground example gives the output its note describes", () => {
  for (const [preset, examples] of Object.entries(EXAMPLES)) {
    for (const example of examples) {
      const options = exampleOptions(example, preset as "");
      assertEquals(
        convert(example.text, example.from, example.to, options),
        example.output,
        `${preset || "library defaults"}: ${example.title}`,
      );
    }
  }
});

test("every standard has examples", () => {
  for (const { id } of listPresetMetadata()) {
    assertEquals(EXAMPLES[id].length > 0, true, id);
  }
});

test("every example of invalid marks gives the diagnostics it names", () => {
  for (const example of INVALID_MARKS) {
    assertEquals(
      validateDocument(parse(example.text, example.from)).map(({ code }) =>
        code
      ),
      [...example.codes],
      example.title,
    );
  }
});

test("an example written in the chosen source format gives the same output", () => {
  for (const [preset, examples] of Object.entries(EXAMPLES)) {
    for (const example of examples) {
      for (const from of FORMATS) {
        const written = exampleFrom(example, from, preset as "");
        if (!written) continue;
        const options = exampleOptions(example, preset as "");
        assertEquals(
          convert(written.text, from, example.to, options),
          example.output,
          `${preset || "library defaults"}: ${example.title} from ${from}`,
        );
      }
    }
  }
});

test("a Greek example of a transliteration standard is offered from Beta Code", () => {
  for (const [preset, examples] of Object.entries(EXAMPLES)) {
    for (const example of examples) {
      if (example.from !== "greek" || example.to !== "transliteration") {
        continue;
      }
      assertEquals(
        exampleFrom(example, "beta-code", preset as "") !== undefined,
        true,
        `${preset || "library defaults"}: ${example.title}`,
      );
    }
  }
});

test("an example from Beta Code keeps the marks the standard drops", () => {
  const [, angel] = EXAMPLES["ala-lc-ancient"];
  assertEquals(
    exampleFrom(angel!, "beta-code", "ala-lc-ancient")?.text,
    "a)/ggelos",
  );
});

test("an example is not offered from its target format", () => {
  const [thucydides] = EXAMPLES["ala-lc-ancient"];
  assertEquals(
    exampleFrom(thucydides!, "transliteration", "ala-lc-ancient"),
    undefined,
  );
});

test("an example whose note names its source is offered from it only", () => {
  for (const example of EXAMPLES[""].filter(({ sourceBound }) => sourceBound)) {
    for (const from of FORMATS) {
      assertEquals(
        exampleFrom(example, from, "") !== undefined,
        from === example.from,
        `${example.title} from ${from}`,
      );
    }
  }
});

test("a restyle example needs its source style", () => {
  for (const [preset, examples] of Object.entries(EXAMPLES)) {
    for (const example of examples.filter(({ sourceStyle }) => sourceStyle)) {
      const { source: _, ...options } = exampleOptions(example, preset as "")!;
      assertEquals(
        convert(example.text, example.from, example.to, options) !==
          example.output,
        true,
        `${preset || "library defaults"}: ${example.title}`,
      );
    }
  }
});
