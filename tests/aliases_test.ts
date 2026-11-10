import { test } from "node:test";
import { assertNfcEquals } from "./assertions.ts";
import { convert } from "../src/mod.ts";
import { ACCEPTED_ALIASES } from "./fixtures.ts";

test("accepted aliases converge to canonical transliteration", () => {
  for (const { format, input, transliteration } of ACCEPTED_ALIASES) {
    assertNfcEquals(
      convert(input, format, "transliteration"),
      transliteration,
    );
  }
});
